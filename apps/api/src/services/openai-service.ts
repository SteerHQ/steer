import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { WhisperResponse } from "@steer/types";
import { OpenAIError } from "../middleware/error-handler";

export class OpenAIService {
  private readonly openai: ReturnType<typeof createOpenAI>;
  private readonly apiKey: string;
  private readonly whisperTimeout = 30000; // 30 seconds
  private readonly maxRetries = 2;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("OpenAI API key is required");
    }
    this.apiKey = apiKey;
    this.openai = createOpenAI({
      apiKey,
    });
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   * Requirements: 2.1, 2.2, 2.3, 2.5
   */
  async transcribeAudio(audioBlob: Blob): Promise<WhisperResponse> {
    return this.withRetry(async () => {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      formData.append("model", "whisper-1");
      formData.append("language", "ru");

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.whisperTimeout
      );

      try {
        const response = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: formData,
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as any;
          throw new OpenAIError(
            errorData.error?.message || `HTTP ${response.status}`,
            response.status,
            this.getErrorCode(response.status)
          );
        }

        const data = (await response.json()) as any;

        return {
          text: data.text,
          language: data.language || "ru",
          duration: data.duration || 0,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new OpenAIError("Request timeout", 408, "TIMEOUT");
        }
        throw error;
      }
    });
  }

  /**
   * Generate response using OpenAI GPT-4o API with Vercel AI SDK
   * Requirements: 3.1, 3.2, 3.5
   */
  async generateResponse(transcript: string): Promise<string> {
    return this.withRetry(async () => {
      try {
        const { text } = await generateText({
          model: this.openai("gpt-4o"),
          system: "Отвечай коротко, по-русски, давай технический ответ",
          prompt: transcript,
          maxRetries: 0, // We handle retries ourselves
          temperature: 0.7,
        });

        return text;
      } catch (error: any) {
        // Handle AI SDK errors
        if (error.statusCode) {
          throw new OpenAIError(
            error.message || "OpenAI API error",
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
