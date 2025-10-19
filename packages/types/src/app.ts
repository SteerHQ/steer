import { ErrorResponse } from './api';

export interface AppState {
  isCapturing: boolean;
  isProcessing: boolean;
  currentTranscript: string | null;
  currentResponse: string | null;
  overlayVisible: boolean;
  apiKeyConfigured: boolean;
  audioDeviceConnected: boolean;
  error: ErrorResponse | null;
}

export interface AppConfig {
  apiKey: string;
  audioDevice: string;
  overlayPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoHideDuration: number;
}
