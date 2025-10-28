import { create } from "zustand";
import { AppState } from "@steer/types";
import { ErrorResponse } from "@steer/types";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AppStore extends AppState {
  // Chat messages
  messages: ChatMessage[];

  // Actions
  startCapture: () => void;
  stopCapture: () => void;
  setTranscript: (transcript: string) => void;
  setResponse: (response: string) => void;
  addMessage: (type: "user" | "assistant", content: string) => void;
  clearMessages: () => void;
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
  messages: [],

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
    set((state) => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: "user",
        content: transcript,
        timestamp: new Date(),
      };
      return {
        currentTranscript: transcript,
        messages: [...state.messages, userMessage],
      };
    }),

  // Set response from GPT-4o API
  setResponse: (response: string) =>
    set((state) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: "assistant",
        content: response,
        timestamp: new Date(),
      };
      return {
        currentResponse: response,
        overlayVisible: true,
        messages: [...state.messages, assistantMessage],
      };
    }),

  // Add a message to chat
  addMessage: (type: "user" | "assistant", content: string) =>
    set((state) => {
      const message: ChatMessage = {
        id: `${type}-${Date.now()}`,
        type,
        content,
        timestamp: new Date(),
      };
      return {
        messages: [...state.messages, message],
      };
    }),

  // Clear all messages
  clearMessages: () =>
    set((state) => ({
      messages: [],
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
