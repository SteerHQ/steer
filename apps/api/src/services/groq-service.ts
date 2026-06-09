import Groq from "groq-sdk";
import type { TranscriptionResponse } from "@steer/types";
import { OpenAIError } from "../middleware/error-handler";

export class GroqService {
  private readonly groq: Groq;
  private readonly maxRetries = 2;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("Groq API key is required");
    }
    this.groq = new Groq({ apiKey });
  }

  /**
   * Транскрибировать аудио через Groq Whisper large-v3
   */
  async transcribeAudio(
    audioBlob: Blob,
    previousContext?: string,
  ): Promise<TranscriptionResponse> {
    return this.withRetry(async () => {
      try {
        const file = new File([audioBlob], "audio.wav", { type: "audio/wav" });

        const transcription = await this.groq.audio.transcriptions.create({
          file,
          model: "whisper-large-v3",
          language: "ru",
          prompt: previousContext, // сшивание смысла между чанками
          response_format: "json",
        });

        return {
          text: transcription.text,
          language: "ru",
          duration: 0,
        };
      } catch (error: any) {
        throw this.wrapError(error, "TRANSCRIPTION_ERROR");
      }
    });
  }

  /**
   * Определить, является ли текст вопросом (через быструю Llama 8B)
   */
  async detectQuestion(transcript: string): Promise<boolean> {
    try {
      const response = await this.groq.chat.completions.create({
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
    return this.withRetry(async () => {
      try {
        const response = await this.groq.chat.completions.create({
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
      } catch (error: any) {
        throw this.wrapError(error, "GENERATION_ERROR");
      }
    });
  }

  /**
   * Стриминг ответа — возвращает AsyncGenerator чанков текста
   */
  async *generateResponseStream(
    transcript: string,
    mode: "general" | "interview" | "algorithm" | "cheatsheet" = "general",
    context?: Array<{ question: string; answer: string }>,
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: this.getSystemPrompt(mode) },
        { role: "user", content: this.buildPrompt(transcript, mode, context) },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
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

  private async withRetry<T>(
    operation: () => Promise<T>,
    attempt = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof OpenAIError) {
        const shouldRetry =
          (error.status === 429 ||
            error.status >= 500 ||
            error.status === 408) &&
          attempt < this.maxRetries;

        if (shouldRetry) {
          await this.sleep(Math.pow(2, attempt) * 1000);
          return this.withRetry(operation, attempt + 1);
        }
      }
      throw error;
    }
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
