/**
 * Уровни логирования
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Интерфейс для записи лога
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Интерфейс логгера
 */
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void;
}
