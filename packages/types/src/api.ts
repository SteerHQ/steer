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
  mode?: "general" | "interview" | "algorithm" | "cheatsheet";
  sessionId?: string; // ID сессии для получения контекста из БД
  context?: Array<{
    question: string;
    answer: string;
  }>;
  jobDescription?: string; // Описание вакансии для персонализации промпта
}

// --- Realtime API типы ---

export type RealtimeEventType =
  | "session.created"
  | "session.updated"
  | "input_audio_buffer.speech_started"
  | "input_audio_buffer.speech_stopped"
  | "input_audio_buffer.committed"
  | "conversation.item.created"
  | "response.created"
  | "response.text.delta"
  | "response.text.done"
  | "response.audio_transcript.delta"
  | "response.audio_transcript.done"
  | "response.done"
  | "error";

/** События, которые клиент (desktop) получает от нашего прокси */
export interface RealtimeServerEvent {
  type: RealtimeEventType;
  [key: string]: unknown;
}

/** Транскрипт из Realtime API */
export interface RealtimeTranscriptDelta {
  type: "response.audio_transcript.delta";
  delta: string;
  item_id: string;
  response_id: string;
}

/** Завершённый текстовый ответ из Realtime API */
export interface RealtimeTextDone {
  type: "response.text.done";
  text: string;
}

/** Статус речевой активности */
export interface RealtimeSpeechEvent {
  type:
    | "input_audio_buffer.speech_started"
    | "input_audio_buffer.speech_stopped";
  audio_start_ms?: number;
  audio_end_ms?: number;
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
