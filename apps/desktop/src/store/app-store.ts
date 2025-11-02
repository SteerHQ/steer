import { create } from "zustand";
import { AppState, AssistantMode, InterviewContext } from "@steer/types";
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
  
  // Interview mode actions
  setMode: (mode: AssistantMode) => void;
  addToInterviewContext: (question: string, answer: string) => void;
  clearInterviewContext: () => void;
  getInterviewContext: () => Array<{ question: string; answer: string }>;
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
  mode: 'general',
  interviewContext: null,
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

  // Set assistant mode
  setMode: (mode: AssistantMode) =>
    set((state) => {
      // Clear interview context when switching away from interview mode
      if (mode !== 'interview' && state.interviewContext) {
        return {
          mode,
          interviewContext: null,
        };
      }
      // Initialize interview context when switching to interview mode
      if (mode === 'interview' && !state.interviewContext) {
        return {
          mode,
          interviewContext: {
            questions: [],
            startTime: Date.now(),
          },
        };
      }
      return { mode };
    }),

  // Add question-answer pair to interview context
  addToInterviewContext: (question: string, answer: string) =>
    set((state) => {
      if (state.mode !== 'interview') return state;

      const context = state.interviewContext || {
        questions: [],
        startTime: Date.now(),
      };

      const newQuestion = {
        question,
        answer,
        timestamp: Date.now(),
      };

      // Keep only last 10 Q&A pairs to avoid context overflow
      const questions = [...context.questions, newQuestion].slice(-10);

      return {
        interviewContext: {
          ...context,
          questions,
        },
      };
    }),

  // Clear interview context
  clearInterviewContext: () =>
    set((state) => ({
      interviewContext: state.mode === 'interview'
        ? {
            questions: [],
            startTime: Date.now(),
          }
        : null,
    })),

  // Get interview context for API calls
  getInterviewContext: (): Array<{ question: string; answer: string }> => {
    const state = useAppStore.getState() as AppStore;
    if (!state.interviewContext) return [];
    
    return state.interviewContext.questions.map((q: { question: string; answer: string; timestamp: number }) => ({
      question: q.question,
      answer: q.answer,
    }));
  },
}));
