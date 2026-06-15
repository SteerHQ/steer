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
