/**
 * Базовый класс для всех ошибок приложения
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибки аудио устройств
 */
export class AudioDeviceError extends AppError {
  constructor(message: string, retryable = true) {
    super(message, "AUDIO_DEVICE_ERROR", retryable);
  }
}

/**
 * Ошибки захвата аудио
 */
export class AudioCaptureError extends AppError {
  constructor(message: string, retryable = true) {
    super(message, "AUDIO_CAPTURE_ERROR", retryable);
  }
}

/**
 * Ошибки API
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public statusCode?: number,
    retryable = true,
  ) {
    super(message, "API_ERROR", retryable, { statusCode });
  }
}

/**
 * Ошибки OpenAI
 */
export class OpenAIError extends AppError {
  constructor(message: string, retryable = true) {
    super(message, "OPENAI_ERROR", retryable);
  }
}

/**
 * Ошибки сети
 */
export class NetworkError extends AppError {
  constructor(message: string, retryable = true) {
    super(message, "NETWORK_ERROR", retryable);
  }
}

/**
 * Ошибки конфигурации
 */
export class ConfigError extends AppError {
  constructor(message: string, retryable = false) {
    super(message, "CONFIG_ERROR", retryable);
  }
}

/**
 * Тип для сериализованной ошибки
 */
export interface SerializedError {
  error: string;
  code: string;
  retryable: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Преобразует ошибку в сериализованный формат
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      retryable: error.retryable,
      metadata: error.metadata,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: "UNKNOWN_ERROR",
      retryable: false,
    };
  }

  return {
    error: String(error),
    code: "UNKNOWN_ERROR",
    retryable: false,
  };
}
