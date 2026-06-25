import { create } from "zustand";
import {
  AppState,
  AssistantMode,
  InterviewContext,
  ResumeProfile,
  VacancyProfile,
} from "@steer/types";
import { ErrorResponse } from "@steer/types";

export interface ChatMessage {
  id: string;
  type: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// ─── Персист резюме в localStorage ────────────────────────────────────────────

const RESUMES_KEY = "resume_profiles";
const ACTIVE_RESUME_KEY = "active_resume_id";

function loadResumes(): ResumeProfile[] {
  try {
    const raw = localStorage.getItem(RESUMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is ResumeProfile =>
        r &&
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        typeof r.content === "string",
    );
  } catch {
    return [];
  }
}

function loadActiveResumeId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_RESUME_KEY) || null;
  } catch {
    return null;
  }
}

function persistResumes(resumes: ResumeProfile[]): void {
  try {
    localStorage.setItem(RESUMES_KEY, JSON.stringify(resumes));
  } catch {
    // ignore storage errors
  }
}

function persistActiveResumeId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_RESUME_KEY, id);
    else localStorage.removeItem(ACTIVE_RESUME_KEY);
  } catch {
    // ignore storage errors
  }
}

function generateId(): string {
  return `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Персист вакансий в localStorage ──────────────────────────────────────────

const VACANCIES_KEY = "vacancy_profiles";
const ACTIVE_VACANCY_KEY = "active_vacancy_id";

function loadVacancies(): VacancyProfile[] {
  try {
    const raw = localStorage.getItem(VACANCIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is VacancyProfile =>
        v &&
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        typeof v.content === "string",
    );
  } catch {
    return [];
  }
}

function loadActiveVacancyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_VACANCY_KEY) || null;
  } catch {
    return null;
  }
}

function persistVacancies(vacancies: VacancyProfile[]): void {
  try {
    localStorage.setItem(VACANCIES_KEY, JSON.stringify(vacancies));
  } catch {
    // ignore storage errors
  }
}

function persistActiveVacancyId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_VACANCY_KEY, id);
    else localStorage.removeItem(ACTIVE_VACANCY_KEY);
  } catch {
    // ignore storage errors
  }
}

function generateVacancyId(): string {
  return `vacancy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  // Resume (CV) management
  addResume: (name: string, content: string) => string;
  updateResume: (
    id: string,
    patch: { name?: string; content?: string },
  ) => void;
  deleteResume: (id: string) => void;
  setActiveResume: (id: string | null) => void;
  getActiveResume: () => ResumeProfile | undefined;
  getActiveResumeContent: () => string | undefined;

  // Vacancy (job description) management
  addVacancy: (name: string, content: string) => string;
  updateVacancy: (
    id: string,
    patch: { name?: string; content?: string },
  ) => void;
  deleteVacancy: (id: string) => void;
  setActiveVacancy: (id: string | null) => void;
  getActiveVacancy: () => VacancyProfile | undefined;
  getActiveVacancyContent: () => string | undefined;
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
  resumes: loadResumes(),
  activeResumeId: loadActiveResumeId(),
  vacancies: loadVacancies(),
  activeVacancyId: loadActiveVacancyId(),
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

  // Reset to initial state (preserves saved resumes)
  reset: () =>
    set((state) => ({
      ...initialState,
      resumes: state.resumes,
      activeResumeId: state.activeResumeId,
    })),

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
              jobDescription: state.interviewContext?.jobDescription,
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

  // Get job description (берётся из активной сохранённой вакансии)
  getJobDescription: (): string | undefined => {
    const state = useAppStore.getState() as AppStore;
    if (!state.activeVacancyId) return undefined;
    const vacancy = state.vacancies.find((v) => v.id === state.activeVacancyId);
    const content = vacancy?.content?.trim();
    return content ? content : undefined;
  },

  // ─── Управление резюме ──────────────────────────────────────────────────────

  // Создать новое резюме, сделать его активным и вернуть его id
  addResume: (name: string, content: string): string => {
    const id = generateId();
    set((state) => {
      const resume: ResumeProfile = {
        id,
        name: name.trim() || "Без названия",
        content,
        updatedAt: Date.now(),
      };
      const resumes = [...state.resumes, resume];
      persistResumes(resumes);
      persistActiveResumeId(id);
      return { resumes, activeResumeId: id };
    });
    return id;
  },

  // Обновить название и/или содержимое резюме
  updateResume: (id: string, patch: { name?: string; content?: string }) =>
    set((state) => {
      const resumes = state.resumes.map((r) =>
        r.id === id
          ? {
              ...r,
              ...(patch.name !== undefined
                ? { name: patch.name.trim() || "Без названия" }
                : {}),
              ...(patch.content !== undefined
                ? { content: patch.content }
                : {}),
              updatedAt: Date.now(),
            }
          : r,
      );
      persistResumes(resumes);
      return { resumes };
    }),

  // Удалить резюме; если оно было активным — сбросить активное
  deleteResume: (id: string) =>
    set((state) => {
      const resumes = state.resumes.filter((r) => r.id !== id);
      const activeResumeId =
        state.activeResumeId === id ? null : state.activeResumeId;
      persistResumes(resumes);
      if (activeResumeId !== state.activeResumeId) {
        persistActiveResumeId(activeResumeId);
      }
      return { resumes, activeResumeId };
    }),

  // Выбрать активное резюме (или сбросить выбор)
  setActiveResume: (id: string | null) =>
    set((state) => {
      const exists = id === null || state.resumes.some((r) => r.id === id);
      const activeResumeId = exists ? id : null;
      persistActiveResumeId(activeResumeId);
      return { activeResumeId };
    }),

  // Получить активный профиль резюме
  getActiveResume: (): ResumeProfile | undefined => {
    const state = useAppStore.getState() as AppStore;
    if (!state.activeResumeId) return undefined;
    return state.resumes.find((r) => r.id === state.activeResumeId);
  },

  // Получить текст активного резюме для подстановки в промпт
  getActiveResumeContent: (): string | undefined => {
    const state = useAppStore.getState() as AppStore;
    if (!state.activeResumeId) return undefined;
    const resume = state.resumes.find((r) => r.id === state.activeResumeId);
    const content = resume?.content?.trim();
    return content ? content : undefined;
  },

  // ─── Управление вакансиями ──────────────────────────────────────────────────

  // Создать новую вакансию, сделать её активной и вернуть её id
  addVacancy: (name: string, content: string): string => {
    const id = generateVacancyId();
    set((state) => {
      const vacancy: VacancyProfile = {
        id,
        name: name.trim() || "Без названия",
        content,
        updatedAt: Date.now(),
      };
      const vacancies = [...state.vacancies, vacancy];
      persistVacancies(vacancies);
      persistActiveVacancyId(id);
      return { vacancies, activeVacancyId: id };
    });
    return id;
  },

  // Обновить название и/или содержимое вакансии
  updateVacancy: (id: string, patch: { name?: string; content?: string }) =>
    set((state) => {
      const vacancies = state.vacancies.map((v) =>
        v.id === id
          ? {
              ...v,
              ...(patch.name !== undefined
                ? { name: patch.name.trim() || "Без названия" }
                : {}),
              ...(patch.content !== undefined
                ? { content: patch.content }
                : {}),
              updatedAt: Date.now(),
            }
          : v,
      );
      persistVacancies(vacancies);
      return { vacancies };
    }),

  // Удалить вакансию; если она была активной — сбросить активную
  deleteVacancy: (id: string) =>
    set((state) => {
      const vacancies = state.vacancies.filter((v) => v.id !== id);
      const activeVacancyId =
        state.activeVacancyId === id ? null : state.activeVacancyId;
      persistVacancies(vacancies);
      if (activeVacancyId !== state.activeVacancyId) {
        persistActiveVacancyId(activeVacancyId);
      }
      return { vacancies, activeVacancyId };
    }),

  // Выбрать активную вакансию (или сбросить выбор)
  setActiveVacancy: (id: string | null) =>
    set((state) => {
      const exists = id === null || state.vacancies.some((v) => v.id === id);
      const activeVacancyId = exists ? id : null;
      persistActiveVacancyId(activeVacancyId);
      return { activeVacancyId };
    }),

  // Получить активный профиль вакансии
  getActiveVacancy: (): VacancyProfile | undefined => {
    const state = useAppStore.getState() as AppStore;
    if (!state.activeVacancyId) return undefined;
    return state.vacancies.find((v) => v.id === state.activeVacancyId);
  },

  // Получить текст активной вакансии для подстановки в промпт
  getActiveVacancyContent: (): string | undefined => {
    const state = useAppStore.getState() as AppStore;
    if (!state.activeVacancyId) return undefined;
    const vacancy = state.vacancies.find((v) => v.id === state.activeVacancyId);
    const content = vacancy?.content?.trim();
    return content ? content : undefined;
  },
}));
