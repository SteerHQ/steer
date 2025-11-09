import { API_CONFIG } from "@steer/config";
import { ApiError, NetworkError } from "@steer/types";
import { createLogger } from "../utils/logger";

const logger = createLogger("ApiClient");

/**
 * Конфигурация для retry
 */
interface RetryConfig {
  attempts: number;
  delay: number;
  backoff?: boolean;
}

/**
 * Базовый API клиент с retry логикой
 */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryConfig: RetryConfig;

  constructor(
    baseUrl: string = API_CONFIG.BASE_URL,
    timeout: number = API_CONFIG.TIMEOUT,
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retryConfig = {
      attempts: API_CONFIG.RETRY_ATTEMPTS,
      delay: API_CONFIG.RETRY_DELAY,
      backoff: true,
    };
  }

  /**
   * Получить заголовки по умолчанию
   */
  private getDefaultHeaders(): HeadersInit {
    return {};
  }

  /**
   * Выполнить запрос с retry логикой
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.retryConfig, ...retryConfig };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < config.attempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(endpoint, options);

        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.status >= 500,
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `Request failed (attempt ${attempt + 1}/${config.attempts})`,
          {
            endpoint,
            error: lastError.message,
          },
        );

        // Не retry для client errors (4xx)
        if (
          error instanceof ApiError &&
          error.statusCode &&
          error.statusCode < 500
        ) {
          throw error;
        }

        // Ждем перед следующей попыткой
        if (attempt < config.attempts - 1) {
          const delay = config.backoff
            ? config.delay * Math.pow(2, attempt)
            : config.delay;
          await this.sleep(delay);
        }
      }
    }

    throw new NetworkError(
      `Request failed after ${config.attempts} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Fetch с таймаутом
   */
  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new NetworkError("Request timeout");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Вспомогательная функция для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET запрос
   */
  async get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
      headers: {
        ...this.getDefaultHeaders(),
        ...headers,
      },
    });
  }

  /**
   * POST запрос
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    headers?: HeadersInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getDefaultHeaders(),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
