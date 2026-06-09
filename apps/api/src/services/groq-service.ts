import Groq from "groq-sdk";
import type { TranscriptionResponse } from "@steer/types";
import { OpenAIError } from "../middleware/error-handler";

/**
 * Парсит строку ключей (через запятую) в массив.
 * Поддерживает как GROQ_API_KEYS (несколько), так и GROQ_API_KEY (один).
 */
export function parseGroqApiKeys(
  keysEnv?: string,
  fallbackKeyEnv?: string,
): string[] {
  // Prefer keysEnv only when it's non-empty; otherwise fall back to fallbackKeyEnv
  const raw =
    keysEnv?.trim().length ? keysEnv : (fallbackKeyEnv ?? "");
  const keys = raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  return keys;
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

      const transcription = await client.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        language: "ru",
        prompt: previousContext,
        response_format: "json",
      });

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
        const response = await client.chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
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
              role: "user",
              content: `Текст: "${transcript}"`,
            },
          ],
          max_tokens: 5,
          temperature: 0,
        });

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
  ): Promise<string> {
    return this.withKeyRotation(async (client) => {
      const response = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: this.getSystemPrompt(mode) },
          {
            role: "user",
            content: this.buildPrompt(transcript, mode, context),
          },
        ],
        stream: false,
      });

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
  ): AsyncGenerator<string, void, unknown> {
    // Wrap stream initialization in key-rotation retry so that 429/5xx errors
    // at stream creation are retried across available keys.
    const messages = [
      { role: "system" as const, content: this.getSystemPrompt(mode) },
      { role: "user" as const, content: this.buildPrompt(transcript, mode, context) },
    ];

    const stream = await this.withKeyRotation(async (client) => {
      return client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages,
        stream: true,
      });
    }, "GENERATION_ERROR");

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
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
        // Все ключи заблокированы — ждём минимальное время до разблокировки
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
          // Блокируем ключ на 60 секунд и переходим к следующему
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
          // Помечаем ключ как ненадёжный на 10 секунд
          this.keyBlockedUntil[keyIndex] = Date.now() + 10_000;
          continue;
        }

        // Не ретраябельная ошибка — бросаем сразу
        throw wrapped;
      }
    }

    // Все ключи не справились
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

  private getSystemPrompt(mode: string): string {
    switch (mode) {
      case "interview":
        return `Ты — скрытый ассистент на IT-интервью. Генерируй ГОТОВЫЕ ОТВЕТЫ от первого лица, которые кандидат может зачитать.

Требования:
- От первого лица ("Я использовал...", "В моем опыте...")
- 3-5 предложений (30-60 секунд речи)
- Структура: краткое определение → личный опыт → конкретный пример
- Звучать как живая речь, не как учебник
- Отвечать ТОЛЬКО по-русски
- Пиши без приветствий и вводных слов`;

      case "algorithm":
        return `Ты — эксперт по алгоритмам и структурам данных.
- Объясни подход (1-2 предложения)
- Укажи O(n) сложность
- Назови ключевую структуру/алгоритм
- Краткий псевдокод если нужно (≤5 строк)
- Отвечать ТОЛЬКО по-русски`;

      case "cheatsheet":
        return `Ты — быстрая шпаргалка для разработчика.
- Максимально кратко (1 предложение или список)
- Только факты, без объяснений
- Отвечать ТОЛЬКО по-русски`;

      default:
        return `Ты — скрытый ассистент на IT-интервью. Пиши строго по делу, без приветствий и вводных слов. Язык: Русский. Код пиши на английском. Будь максимально лаконичен, время критично.`;
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
