import { createGroq } from "@ai-sdk/groq";
import { generateText, streamText } from "ai";
import OpenAI from "openai";
import type { TranscriptionResponse } from "@steer/types";
import { OpenAIError } from "../middleware/error-handler";

// Groq model used for generation and question detection
const GROQ_GENERATION_MODEL = "openai/gpt-oss-20b";

export class OpenAIService {
  private readonly groq: ReturnType<typeof createGroq>;
  private readonly openaiClient: OpenAI;
  private readonly maxRetries = 2;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("OpenAI API key is required");
    }
    // Groq API key from env (used for generation/detection)
    // Prefer GROQ_API_KEY; if missing, fall back to GROQ_API_KEYS (taking the first key)
    const groqApiKey =
      process.env.GROQ_API_KEY?.trim() ||
      (process.env.GROQ_API_KEYS?.split(",")[0]?.trim() ?? "");
    this.groq = createGroq({
      apiKey: groqApiKey,
    });
    // OpenAI client is only used for transcription (gpt-4o-transcribe)
    this.openaiClient = new OpenAI({
      apiKey,
    });
  }

  /**
   * Transcribe audio using OpenAI gpt-4o-transcribe model
   * Requirements: 2.1, 2.2, 2.3, 2.5
   */
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResponse> {
    return this.withRetry(async () => {
      try {
        // Convert Blob to File for OpenAI client
        const file = new File([audioBlob], "audio.wav", { type: "audio/wav" });

        // Use OpenAI client for transcription
        // Note: gpt-4o-transcribe only supports 'json' or 'text' format, not 'verbose_json'
        const transcription = await this.openaiClient.audio.transcriptions.create({
          file: file,
          model: "gpt-4o-transcribe",
          language: "ru",
          response_format: "json",
        });

        return {
          text: transcription.text,
          language: "ru", // gpt-4o-transcribe doesn't return language field
          duration: 0, // gpt-4o-transcribe doesn't return duration field
        };
      } catch (error: any) {
        // Handle OpenAI client errors
        if (error?.status) {
          throw new OpenAIError(
            error.message || `OpenAI API error`,
            error.status,
            this.getErrorCode(error.status)
          );
        }
        throw new OpenAIError(
          error?.message || "Failed to transcribe audio",
          500,
          "TRANSCRIPTION_ERROR"
        );
      }
    });
  }

  /**
   * Detect if transcript contains a question that needs an answer
   * Uses Groq for fast, cheap classification
   */
  async detectQuestion(transcript: string): Promise<boolean> {
    return this.withRetry(async () => {
      try {
        const { text } = await generateText({
          model: this.groq(GROQ_GENERATION_MODEL),
          system: `Ты - детектор вопросов на техническом собеседовании.
Твоя задача: определить, является ли текст ВОПРОСОМ, на который нужно дать ответ.

ВОПРОС (отвечай "YES"):
- Прямые вопросы: "Что такое React?", "Расскажите о себе"
- Просьбы объяснить: "Объясните разницу между...", "Опишите процесс..."
- Задачи: "Напишите функцию...", "Как бы вы решили..."
- Вопросы с "как", "что", "почему", "когда", "где"

НЕ ВОПРОС (отвечай "NO"):
- Приветствия: "Привет", "Здравствуйте"
- Утверждения: "Хорошо", "Понятно", "Спасибо"
- Шум/мусор: неразборчивая речь, фоновые звуки
- Короткие фразы без смысла (меньше 3 слов)
- Технические артефакты: "[музыка]", "[шум]"

Отвечай ТОЛЬКО "YES" или "NO".`,
          prompt: `Текст: "${transcript}"`,
          maxRetries: 0,
        });

        return text.trim().toUpperCase() === 'YES';
      } catch (error: any) {
        console.error('Question detection error:', error);
        // В случае ошибки считаем что это вопрос (безопаснее)
        return true;
      }
    });
  }

  /**
   * Generate response using Groq via AI SDK
   * Requirements: 3.1, 3.2, 3.5
   */
  async generateResponse(
    transcript: string,
    mode: 'general' | 'interview' | 'algorithm' | 'cheatsheet' = 'general',
    context?: Array<{ question: string; answer: string }>
  ): Promise<string> {
    return this.withRetry(async () => {
      try {
        const systemPrompt = this.getSystemPrompt(mode);
        const enhancedPrompt = this.buildPrompt(transcript, mode, context);

        const { text } = await generateText({
          model: this.groq(GROQ_GENERATION_MODEL),
          system: systemPrompt,
          prompt: enhancedPrompt,
          maxRetries: 0, // We handle retries ourselves
        });

        return text;
      } catch (error: any) {
        if (error.statusCode) {
          throw new OpenAIError(
            error.message || "Groq API error",
            error.statusCode,
            this.getErrorCode(error.statusCode)
          );
        }
        throw new OpenAIError(
          error.message || "Failed to generate response",
          500,
          "GENERATION_ERROR"
        );
      }
    });
  }

  /**
   * Generate response with streaming via Groq
   * Returns an async generator that yields text chunks
   */
  async *generateResponseStream(
    transcript: string,
    mode: 'general' | 'interview' | 'algorithm' | 'cheatsheet' = 'general',
    context?: Array<{ question: string; answer: string }>
  ): AsyncGenerator<string, void, unknown> {
    const systemPrompt = this.getSystemPrompt(mode);
    const enhancedPrompt = this.buildPrompt(transcript, mode, context);

    const { textStream } = streamText({
      model: this.groq(GROQ_GENERATION_MODEL),
      system: systemPrompt,
      prompt: enhancedPrompt,
      maxRetries: 0,
    });

    for await (const chunk of textStream) {
      yield chunk;
    }
  }

  /**
   * Get system prompt based on mode
   */
  private getSystemPrompt(mode: string): string {
    switch (mode) {
      case 'interview':
        return `Ты - AI-ассистент, который помогает кандидату проходить техническое собеседование на позицию Software Engineer.

ВАЖНО: Генерируй ГОТОВЫЕ ОТВЕТЫ, которые кандидат может зачитать интервьюеру.

Требования к ответам:
- Ответ должен быть от первого лица ("Я использовал...", "В моем опыте...")
- Длина: 3-5 предложений (30-60 секунд речи)
- Структура: краткое определение → личный опыт → конкретный пример
- Звучать естественно, как живая речь (не как текст из учебника)
- Демонстрировать уверенность и экспертизу
- Включать технические термины, но объяснять их просто
- Отвечать ТОЛЬКО по-русски

Примеры хороших ответов:
Вопрос: "Что такое React hooks?"
Ответ: "React hooks - это функции, которые позволяют использовать состояние и другие возможности React без классов. Я активно использую их в своих проектах, особенно useState для локального состояния и useEffect для побочных эффектов. Например, в последнем проекте я использовал useContext для глобального состояния аутентификации, что значительно упростило код по сравнению с prop drilling."

Вопрос: "Расскажите о вашем опыте с TypeScript"
Ответ: "Я работаю с TypeScript уже более 3 лет и считаю его незаменимым для больших проектов. Он помогает отловить ошибки на этапе разработки и делает код более понятным благодаря типизации. В текущем проекте мы используем строгий режим TypeScript, и это сэкономило нам много времени на отладке, особенно при рефакторинге."`;


      case 'algorithm':
        return `Ты - эксперт по алгоритмам и структурам данных.
Твоя задача:
- Объяснить подход к решению задачи (1-2 предложения)
- Указать временную и пространственную сложность
- Назвать ключевую структуру данных или алгоритм
- Дать краткий псевдокод если нужно (максимум 5 строк)
- Отвечать ТОЛЬКО по-русски`;

      case 'cheatsheet':
        return `Ты - быстрая шпаргалка для разработчика.
Твоя задача:
- Дать максимально краткий ответ (1 предложение или список)
- Только факты, без объяснений
- Синтаксис, определения, формулы
- Отвечать ТОЛЬКО по-русски`;

      default:
        return "Отвечай коротко, по-русски, давай технический ответ";
    }
  }

  /**
   * Build enhanced prompt with context
   */
  private buildPrompt(
    transcript: string,
    mode: string,
    context?: Array<{ question: string; answer: string }>
  ): string {
    let prompt = transcript;

    if (context && context.length > 0 && mode === 'interview') {
      const recentContext = context.slice(-3); // Last 3 Q&A pairs
      const contextStr = recentContext
        .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
        .join('\n\n');
      
      prompt = `Контекст предыдущих вопросов:\n${contextStr}\n\nТекущий вопрос: ${transcript}`;
    }

    return prompt;
  }

  /**
   * Retry wrapper with exponential backoff
   * Requirements: 2.4, 3.4
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 0
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
          const delay = this.calculateBackoff(attempt);
          await this.sleep(delay);
          return this.withRetry(operation, attempt + 1);
        }
      }
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay
   * Attempt 0: 1 second
   * Attempt 1: 2 seconds
   */
  private calculateBackoff(attempt: number): number {
    return Math.pow(2, attempt) * 1000;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Map HTTP status codes to error codes
   */
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
