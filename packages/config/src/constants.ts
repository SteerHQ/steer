/**
 * Константы приложения
 */

export const APP_NAME = "Voice Assistant Overlay";
export const APP_VERSION = "1.0.0";

/**
 * API конфигурация
 */
export const API_CONFIG = {
  BASE_URL: "http://localhost:3000",
  TIMEOUT: 30000, // 30 секунд
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 секунда
} as const;

/**
 * Аудио конфигурация
 */
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 16000, // 16kHz для Whisper
  CHANNELS: 1, // Mono
  BUFFER_SIZE: 4096,
  PROCESSING_INTERVAL: 5000, // 5 секунд
  MIN_AUDIO_LENGTH: 1000, // Минимум 1 секунда аудио
} as const;

/**
 * UI конфигурация
 */
export const UI_CONFIG = {
  OVERLAY_AUTO_HIDE_DURATION: 10000, // 10 секунд
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 1000, // 1 секунда
  MAX_MESSAGE_LENGTH: 500,
} as const;

/**
 * Коды ошибок
 */
export const ERROR_CODES = {
  AUDIO_DEVICE_ERROR: "AUDIO_DEVICE_ERROR",
  AUDIO_CAPTURE_ERROR: "AUDIO_CAPTURE_ERROR",
  API_ERROR: "API_ERROR",
  OPENAI_ERROR: "OPENAI_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  CONFIG_ERROR: "CONFIG_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * Локальное хранилище ключи
 */
export const STORAGE_KEYS = {
  API_KEY: "openai_api_key",
  APP_CONFIG: "app_config",
  USER_PREFERENCES: "user_preferences",
} as const;
