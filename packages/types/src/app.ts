import { ErrorResponse } from "./api";

export type AssistantMode =
  | "general"
  | "interview"
  | "algorithm"
  | "cheatsheet";

export interface AppState {
  isCapturing: boolean;
  isProcessing: boolean;
  currentTranscript: string | null;
  currentResponse: string | null;
  overlayVisible: boolean;
  apiKeyConfigured: boolean;
  audioDeviceConnected: boolean;
  error: ErrorResponse | null;
  mode: AssistantMode;
  interviewContext: InterviewContext | null;
  /** Сохранённые резюме пользователя (несколько профилей) */
  resumes: ResumeProfile[];
  /** ID активного резюме, которое подставляется в промпт */
  activeResumeId: string | null;
}

/**
 * Профиль резюме пользователя. Пользователь может хранить несколько
 * резюме (например под разные роли) и выбирать активное для собеседования.
 */
export interface ResumeProfile {
  /** Уникальный идентификатор */
  id: string;
  /** Название профиля, напр. "Senior Backend (Node.js)" */
  name: string;
  /** Текст резюме, который подставляется в системный промпт */
  content: string;
  /** Время последнего изменения (ms) */
  updatedAt: number;
}

export interface InterviewContext {
  questions: Array<{
    question: string;
    answer: string;
    timestamp: number;
  }>;
  startTime: number;
  topic?: string;
  jobDescription?: string;
}

export interface AppConfig {
  apiKey: string;
  audioDevice: string;
  overlayPosition: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  autoHideDuration: number;
  defaultMode: AssistantMode;
  interviewSettings: {
    saveHistory: boolean;
    maxHistoryItems: number;
    showConfidence: boolean;
  };
}
