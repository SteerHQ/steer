export interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

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
  context?: Array<{
    question: string;
    answer: string;
  }>;
}
