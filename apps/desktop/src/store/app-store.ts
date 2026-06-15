import { create } from "zustand";
import { AppState, AssistantMode, InterviewContext } from "@steer/types";
import { ErrorResponse } from "@steer/types";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system";
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
  addMessage: (type: "user" | "assistant" | "system", content: string) => void;
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
  setJobDescription: (jobDescription: string) => void;
  getJobDescription: () => string | undefined;
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
  mode: "general",
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

  // Set transcript from OpenAI transcription API (without adding to messages - handled by addMessage)
  setTranscript: (transcript: string) =>
    set((state) => ({
      currentTranscript: transcript,
    })),

  // Set response from GPT-4o API (without adding to messages - handled by addMessage)
  setResponse: (response: string) =>
    set((state) => ({
      currentResponse: response,
    })),

  // Add a message to chat (or update last message if same type)
  addMessage: (type: "user" | "assistant" | "system", content: string) =>
    set((state) => {
      const lastMessage = state.messages[state.messages.length - 1];

      // If last message is same type, update it (for streaming)
      if (lastMessage && lastMessage.type === type && type === "assistant") {
        const updatedMessages = [...state.messages];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content,
          timestamp: new Date(),
        };
        return {
          messages: updatedMessages,
        };
      }

      // Otherwise add new message
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
  // Only stop capture on critical errors (device errors), not pipeline errors
  setError: (error: ErrorResponse | null) =>
    set((state) => {
      const stopCapture = error
        ? error.code === "DEVICE_NOT_FOUND" ||
          error.code === "CAPTURE_START_ERROR"
        : false;
      return {
        error,
        isProcessing: false,
        isCapturing: stopCapture ? false : state.isCapturing,
      };
    }),

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
      if (mode !== "interview" && state.interviewContext) {
        return {
          mode,
          interviewContext: null,
        };
      }
      // Initialize interview context when switching to interview mode
      if (mode === "interview" && !state.interviewContext) {
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
      if (state.mode !== "interview") return state;

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
      interviewContext:
        state.mode === "interview"
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

    return state.interviewContext.questions.map(
      (q: { question: string; answer: string; timestamp: number }) => ({
        question: q.question,
        answer: q.answer,
      }),
    );
  },

  // Set job description for interview mode
  setJobDescription: (jobDescription: string) =>
    set((state) => {
      if (!state.interviewContext) return state;
      return {
        interviewContext: {
          ...state.interviewContext,
          jobDescription: jobDescription.trim() || undefined,
        },
      };
    }),

  // Get job description
  getJobDescription: (): string | undefined => {
    const state = useAppStore.getState() as AppStore;
    return state.interviewContext?.jobDescription;
  },
}));
