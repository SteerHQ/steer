import type { Logger, LogLevel, LogEntry } from "@steer/types";

/**
 * Простая реализация логгера для desktop приложения
 */
class ConsoleLogger implements Logger {
  constructor(private context?: string) {}

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
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
      case "debug":
        console.debug(`${prefix} ${message}${metaStr}`);
        break;
      case "info":
        console.info(`${prefix} ${message}${metaStr}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}${metaStr}`);
        break;
      case "error":
        console.error(`${prefix} ${message}${metaStr}`, error);
        break;
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("info", message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("warn", message, metadata);
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): void {
    this.log("error", message, metadata, error);
  }
}

/**
 * Создает новый экземпляр логгера с контекстом
 */
export function createLogger(context?: string): Logger {
  return new ConsoleLogger(context);
}
