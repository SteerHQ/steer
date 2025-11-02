import { LogLevel } from "@steer/types";
import type { Logger, LogEntry } from "@steer/types";

/**
 * Простая реализация логгера для desktop приложения
 */
class ConsoleLogger implements Logger {
  constructor(private context?: string) {}

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      metadata,
    };

    const prefix = this.context ? `[${this.context}]` : "";
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} ${message}${metaStr}`);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ${message}${metaStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ${message}${metaStr}`);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ${message}${metaStr}`, error);
        break;
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }
}

/**
 * Создает новый экземпляр логгера с контекстом
 */
export function createLogger(context?: string): Logger {
  return new ConsoleLogger(context);
}
