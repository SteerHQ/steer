import { create } from 'zustand';
import { AppState } from '@steer/types';
import { ErrorResponse } from '@steer/types';

export interface AppStore extends AppState {
  // Actions
  startCapture: () => void;
  stopCapture: () => void;
  setTranscript: (transcript: string) => void;
  setResponse: (response: string) => void;
  showOverlay: () => void;
  hideOverlay: () => void;
  setError: (error: ErrorResponse | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  setApiKeyConfigured: (configured: boolean) => void;
  setAudioDeviceConnected: (connected: boolean) => void;
  clearTranscriptAndResponse: () => void;
  reset: () => void;
}

const initialState: AppState = {
  isCapturing: false,
  isProcessing: false,
  currentTranscript: null,
  currentResponse: null,
  overlayVisible: false,
  apiKeyConfigured: false,
  audioDeviceConnected: false,
  error: null,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  // Start audio capture
  startCapture: () =>
    set((state) => ({
      isCapturing: true,
      error: null,
    })),

  // Stop audio capture
  stopCapture: () =>
    set((state) => ({
      isCapturing: false,
    })),

  // Set transcript from Whisper API
  setTranscript: (transcript: string) =>
    set((state) => ({
      currentTranscript: transcript,
    })),

  // Set response from GPT-4o API
  setResponse: (response: string) =>
    set((state) => ({
      currentResponse: response,
      overlayVisible: true,
    })),

  // Show overlay window
  showOverlay: () =>
    set((state) => ({
      overlayVisible: true,
    })),

  // Hide overlay window
  hideOverlay: () =>
    set((state) => ({
      overlayVisible: false,
    })),

  // Set error state
  setError: (error: ErrorResponse | null) =>
    set((state) => ({
      error,
      isProcessing: false,
      isCapturing: error ? false : state.isCapturing,
    })),

  // Set processing state
  setProcessing: (isProcessing: boolean) =>
    set((state) => ({
      isProcessing,
      error: isProcessing ? null : state.error,
    })),

  // Set API key configuration status
  setApiKeyConfigured: (configured: boolean) =>
    set((state) => ({
      apiKeyConfigured: configured,
    })),

  // Set audio device connection status
  setAudioDeviceConnected: (connected: boolean) =>
    set((state) => ({
      audioDeviceConnected: connected,
      error: connected ? null : state.error,
    })),

  // Clear transcript and response
  clearTranscriptAndResponse: () =>
    set((state) => ({
      currentTranscript: null,
      currentResponse: null,
    })),

  // Reset to initial state
  reset: () => set(initialState),
}));
