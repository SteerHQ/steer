import Groq from "groq-sdk";
import type { TranscriptionResponse } from "@steer/types";
import { OpenAIError } from "../middleware/error-handler";

const MODELS = {
  transcription: {
    primary: "whisper-large-v3",
    fallback: "whisper-large-v3-turbo",
  },
  detection: {
    primary: "llama-3.1-8b-instant",
    fallback: "llama3-8b-8192",
  },
  generation: {
    primary: "llama-3.3-70b-versatile",
    fallback: "compound-beta",
  },
} as const;

/**
 * Парсит строку ключей (через запятую) в массив.
 * Поддерживает как GROQ_API_KEYS (несколько), так и GROQ_API_KEY (один).
 */
export function parseGroqApiKeys(
  keysEnv?: string,
  fallbackKeyEnv?: string,
): string[] {
  const parseRaw = (raw: string) =>
    raw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

  const keys = parseRaw(keysEnv ?? "");
  if (keys.length > 0) return keys;

  return parseRaw(fallbackKeyEnv ?? "");
}

export class GroqService {
  private readonly clients: Groq[];
  /** Индекс текущего активного ключа */
  private currentKeyIndex = 0;
  /** Время (ms), до которого ключ считается заблокированным (rate-limit) */
  private readonly keyBlockedUntil: number[];

  constructor(apiKeys: string | string[]) {
    const keys = Array.isArray(apiKeys) ? apiKeys : [apiKeys];

    if (keys.length === 0) {
      throw new Error("At least one Groq API key is required");
    }

    keys.forEach((key, i) => {
      if (!key || key.trim() === "") {
        throw new Error(`Groq API key at index ${i} is empty`);
      }
    });

    this.clients = keys.map((key) => new Groq({ apiKey: key }));
    this.keyBlockedUntil = new Array(keys.length).fill(0);

    if (keys.length > 1) {
      console.log(`[GroqService] Initialized with ${keys.length} API keys`);
    }
  }

  // ─── Публичные методы ────────────────────────────────────────────────────────

  /**
   * Транскрибировать аудио через Groq Whisper large-v3
   */
  async transcribeAudio(
    audioBlob: Blob,
    previousContext?: string,
  ): Promise<TranscriptionResponse> {
    return this.withKeyRotation(async (client) => {
      const file = new File([audioBlob], "audio.wav", { type: "audio/wav" });

      const transcription = await this.withModelFallback(
        MODELS.transcription.primary,
        MODELS.transcription.fallback,
        (model) =>
          client.audio.transcriptions.create({
            file,
            model,
            language: "ru",
            prompt: previousContext,
            response_format: "json",
          }),
      );

      return {
        text: transcription.text,
        language: "ru",
        duration: 0,
      };
    }, "TRANSCRIPTION_ERROR");
  }

  /**
   * Определить, является ли текст вопросом (через быструю Llama 8B)
   */
  async detectQuestion(transcript: string): Promise<boolean> {
    try {
      return await this.withKeyRotation(async (client) => {
        const messages = [
          {
            role: "system" as const,
            content: `Ты - детектор вопросов на техническом собеседовании.
ВОПРОС (отвечай "YES"):
- Прямые вопросы: "Что такое React?", "Расскажите о себе"
- Просьбы объяснить: "Объясните разницу между...", "Опишите процесс..."
- Задачи: "Напишите функцию...", "Как бы вы решили..."
- Вопросы с "как", "что", "почему", "когда", "где"

НЕ ВОПРОС (отвечай "NO"):
- Приветствия, утверждения, шум, фразы < 3 слов

Отвечай ТОЛЬКО "YES" или "NO".`,
          },
          {
            role: "user" as const,
            content: `Текст: "${transcript}"`,
          },
        ];

        const response = await this.withModelFallback(
          MODELS.detection.primary,
          MODELS.detection.fallback,
          (model) =>
            client.chat.completions.create({
              model,
              messages,
              max_tokens: 5,
              temperature: 0,
            }),
        );

        const answer = response.choices[0]?.message?.content
          ?.trim()
          .toUpperCase();
        return answer === "YES";
      }, "DETECTION_ERROR");
    } catch (error) {
      console.error("Groq question detection error:", error);
      // При ошибке считаем вопросом — безопаснее
      return true;
    }
  }

  /**
   * Сгенерировать ответ без стриминга
   */
  async generateResponse(
    transcript: string,
    mode: "general" | "interview" | "algorithm" | "cheatsheet" = "general",
    context?: Array<{ question: string; answer: string }>,
    jobDescription?: string,
    resume?: string,
  ): Promise<string> {
    return this.withKeyRotation(async (client) => {
      const messages = [
        {
          role: "system" as const,
          content: this.getSystemPrompt(mode, jobDescription, resume),
        },
        {
          role: "user" as const,
          content: this.buildPrompt(transcript, mode, context),
        },
      ];

      const response = await this.withModelFallback(
        MODELS.generation.primary,
        MODELS.generation.fallback,
        (model) =>
          client.chat.completions.create({
            model,
            messages,
            stream: false,
          }),
      );

      return response.choices[0]?.message?.content ?? "";
    }, "GENERATION_ERROR");
  }

  /**
   * Стриминг ответа — возвращает AsyncGenerator чанков текста.
   * Ротация ключей здесь происходит при ошибке до начала стрима.
   */
  async *generateResponseStream(
    transcript: string,
    mode: "general" | "interview" | "algorithm" | "cheatsheet" = "general",
    context?: Array<{ question: string; answer: string }>,
    jobDescription?: string,
    resume?: string,
  ): AsyncGenerator<string, void, unknown> {
    const messages = [
      {
        role: "system" as const,
        content: this.getSystemPrompt(mode, jobDescription, resume),
      },
      {
        role: "user" as const,
        content: this.buildPrompt(transcript, mode, context),
      },
    ];

    const stream = await this.withKeyRotation(async (client) => {
      return this.withModelFallback(
        MODELS.generation.primary,
        MODELS.generation.fallback,
        (model) =>
          client.chat.completions.create({
            model,
            messages,
            stream: true,
          }),
      );
    }, "GENERATION_ERROR");

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  // ─── Fallback модели ─────────────────────────────────────────────────────────

  /**
   * Пробует выполнить операцию с primary моделью.
   * При ошибке сервера или недоступности модели повторяет с fallback моделью.
   */
  private async withModelFallback<T>(
    primary: string,
    fallback: string,
    fn: (model: string) => Promise<T>,
  ): Promise<T> {
    try {
      return await fn(primary);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      // Пробуем fallback только при ошибках сервера или недоступности модели
      const isRetriable =
        (status >= 500 && status <= 599) ||
        status === 404 ||
        status === 403 ||
        !status;

      if (!isRetriable) throw error;

      const detail =
        error?.error?.message ??
        error?.message ??
        JSON.stringify(error?.error ?? error);
      console.warn(
        `[GroqService] Model "${primary}" failed (${status ?? "network"}): ${detail}. Trying fallback "${fallback}"...`,
      );
      try {
        return await fn(fallback);
      } catch (fallbackError: any) {
        const fbStatus =
          fallbackError?.status ?? fallbackError?.response?.status;
        const fbDetail =
          fallbackError?.error?.message ??
          fallbackError?.message ??
          JSON.stringify(fallbackError?.error ?? fallbackError);
        console.error(
          `[GroqService] Fallback model "${fallback}" also failed (${fbStatus ?? "network"}): ${fbDetail}`,
        );
        throw fallbackError;
      }
    }
  }

  // ─── Ключевая логика ротации ─────────────────────────────────────────────────

  /**
   * Выполняет operation, перебирая ключи при ошибках rate-limit / сервера.
   * Если все ключи исчерпаны — бросает последнюю ошибку.
   */
  private async withKeyRotation<T>(
    operation: (client: Groq) => Promise<T>,
    fallbackCode: string,
  ): Promise<T> {
    const totalKeys = this.clients.length;
    let lastError: unknown;

    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const keyIndex = this.getNextAvailableKeyIndex();

      if (keyIndex === -1) {
        const waitMs = this.msUntilNextKeyAvailable();
        console.warn(
          `[GroqService] All keys rate-limited. Waiting ${waitMs}ms...`,
        );
        await this.sleep(waitMs);
        continue;
      }

      this.currentKeyIndex = keyIndex;
      const client = this.clients[keyIndex];

      try {
        return await operation(client);
      } catch (error: any) {
        lastError = error;
        const wrapped = this.wrapError(error, fallbackCode);

        if (this.isRateLimitError(wrapped)) {
          const blockMs = this.extractRetryAfter(error) ?? 60_000;
          this.keyBlockedUntil[keyIndex] = Date.now() + blockMs;
          console.warn(
            `[GroqService] Key #${keyIndex + 1} rate-limited. Blocked for ${blockMs}ms. Trying next key...`,
          );
          continue;
        }

        if (this.isServerError(wrapped) && totalKeys > 1) {
          console.warn(
            `[GroqService] Key #${keyIndex + 1} server error (${wrapped.status}). Trying next key...`,
          );
          this.keyBlockedUntil[keyIndex] = Date.now() + 10_000;
          continue;
        }

        throw wrapped;
      }
    }

    throw this.wrapError(lastError, fallbackCode);
  }

  /**
   * Возвращает индекс следующего незаблокированного ключа (round-robin).
   * Возвращает -1, если все ключи заблокированы.
   */
  private getNextAvailableKeyIndex(): number {
    const now = Date.now();
    const total = this.clients.length;

    for (let i = 0; i < total; i++) {
      const idx = (this.currentKeyIndex + i) % total;
      if (this.keyBlockedUntil[idx] <= now) {
        return idx;
      }
    }
    return -1;
  }

  /** Сколько миллисекунд до разблокировки первого ключа */
  private msUntilNextKeyAvailable(): number {
    const now = Date.now();
    const min = Math.min(...this.keyBlockedUntil);
    return Math.max(0, min - now);
  }

  private isRateLimitError(error: OpenAIError): boolean {
    return error.status === 429;
  }

  private isServerError(error: OpenAIError): boolean {
    return error.status >= 500 && error.status <= 599;
  }

  /** Пытается извлечь Retry-After из заголовков ответа Groq SDK */
  private extractRetryAfter(error: any): number | undefined {
    const retryAfter =
      error?.headers?.["retry-after"] ??
      error?.response?.headers?.["retry-after"];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    return undefined;
  }

  // ─── Вспомогательные методы ─────────────────────────────────────────────────

  private getSystemPrompt(
    mode: string,
    jobDescription?: string,
    resume?: string,
  ): string {
    const jobSection = jobDescription
      ? `\n\nВАКАНСИЯ/КОНТЕКСТ СОБЕСЕДОВАНИЯ:\n${jobDescription}\n\nОтвечай с учётом требований этой вакансии — акцентируй опыт и технологии, которые в ней упомянуты.`
      : "";

    const resumeText = resume?.trim();
    const resumeSection = resumeText
      ? `\n\nРЕЗЮМЕ КАНДИДАТА:\n${resumeText}\n\nОтвечай строго от лица этого кандидата, опирайся на опыт, проекты, технологии и факты из резюме. Не выдумывай опыт, которого нет в резюме. Если в резюме нет прямого ответа — отвечай обобщённо, но в рамках указанного стека и уровня.`
      : "";

    switch (mode) {
      case "interview":
        return `Ты — скрытый ассистент на IT-интервью. Генерируй ГОТОВЫЕ ОТВЕТЫ от первого лица, которые кандидат может зачитать.

Требования:
- От первого лица ("Я использовал...", "В моем опыте...")
- 3-5 предложений (30-60 секунд речи)
- Структура: краткое определение → личный опыт → конкретный пример
- Звучать как живая речь, не как учебник
- Отвечать ТОЛЬКО по-русски
- Пиши без приветствий и вводных слов${resumeSection}${jobSection}`;

      case "algorithm":
        return `Ты — эксперт по алгоритмам и структурам данных.
- Объясни подход (1-2 предложения)
- Укажи O(n) сложность
- Назови ключевую структуру/алгоритм
- Краткий псевдокод если нужно (≤5 строк)
- Отвечать ТОЛЬКО по-русски${jobSection}`;

      case "cheatsheet":
        return `Ты — быстрая шпаргалка для разработчика.
- Максимально кратко (1 предложение или список)
- Только факты, без объяснений
- Отвечать ТОЛЬКО по-русски${jobSection}`;

      default:
        return `Ты — скрытый ассистент на IT-интервью. Пиши строго по делу, без приветствий и вводных слов. Язык: Русский. Код пиши на английском. Будь максимально лаконичен, время критично.${resumeSection}${jobSection}`;
    }
  }

  private buildPrompt(
    transcript: string,
    mode: string,
    context?: Array<{ question: string; answer: string }>,
  ): string {
    if (context && context.length > 0 && mode === "interview") {
      const recentContext = context.slice(-3);
      const contextStr = recentContext
        .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
        .join("\n\n");
      return `Контекст предыдущих вопросов:\n${contextStr}\n\nТекущий вопрос: ${transcript}`;
    }
    return transcript;
  }

  private wrapError(error: any, fallbackCode: string): OpenAIError {
    if (error instanceof OpenAIError) return error;
    if (error?.status) {
      return new OpenAIError(
        error.message ?? "Groq API error",
        error.status,
        this.getErrorCode(error.status),
      );
    }
    return new OpenAIError(
      error?.message ?? "Groq API error",
      500,
      fallbackCode,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getErrorCode(status: number): string {
    switch (status) {
      case 401:
        return "INVALID_API_KEY";
      case 429:
        return "RATE_LIMIT_EXCEEDED";
      case 408:
        return "TIMEOUT";
      case 500:
      case 502:
      case 503:
        return "SERVER_ERROR";
      default:
        return "API_ERROR";
    }
  }
}
