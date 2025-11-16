export interface TranscriptionResponse {
  text: string;
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

// Legacy alias for backward compatibility
export type WhisperResponse = TranscriptionResponse;

export interface GPTResponse {
  message: string;
  tokensUsed: number;
  model: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
}

export interface GenerateRequest {
  transcript: string;
  mode?: 'general' | 'interview' | 'algorithm' | 'cheatsheet';
  sessionId?: string; // ID сессии для получения контекста из БД
  context?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface DetectQuestionResponse {
  success: boolean;
  isQuestion: boolean;
  transcript: string;
}

export interface SessionResponse {
  success: boolean;
  sessionId: string;
}

export interface ConversationHistoryResponse {
  success: boolean;
  history: Array<{
    id: number;
    question: string;
    answer: string | null;
    mode: string;
    createdAt: Date;
  }>;
}
