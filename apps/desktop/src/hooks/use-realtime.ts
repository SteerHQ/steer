import { useEffect, useRef, useCallback, useState } from "react";
import { RealtimeService, RealtimeStatus } from "../services/realtime-service";
import { useAppStore } from "../store/app-store";
import type { AssistantMode } from "@steer/types";

export interface UseRealtimeReturn {
  /** Текущий статус соединения */
  status: RealtimeStatus;
  /** Текущий транскрипт (накапливается по дельтам) */
  transcript: string;
  /** Текущий ответ модели (накапливается по дельтам) */
  response: string;
  /** Подключиться и начать слушать */
  connect: (mode?: AssistantMode) => void;
  /** Отключиться */
  disconnect: () => void;
  /** Поменять режим без переподключения */
  setMode: (mode: AssistantMode) => void;
}

/**
 * React-хук для работы с OpenAI Realtime API.
 *
 * Управляет жизненным циклом RealtimeService и синхронизирует
 * транскрипты/ответы с глобальным Zustand-стором.
 *
 * Пример:
 * ```tsx
 * const { status, transcript, response, connect, disconnect } = useRealtime();
 *
 * // Подключиться при монтировании компонента
 * useEffect(() => { connect('interview'); return () => disconnect(); }, []);
 * ```
 */
export function useRealtime(): UseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  const serviceRef = useRef<RealtimeService | null>(null);

  const {
    addMessage,
    setTranscript: storeSetTranscript,
    setResponse: storeSetResponse,
  } = useAppStore();

  // Инициализируем сервис один раз
  if (!serviceRef.current) {
    serviceRef.current = new RealtimeService();
  }

  // Синхронизируем коллбэки при каждом рендере (чтобы замыкания всегда свежие)
  useEffect(() => {
    serviceRef.current?.setCallbacks({
      onStatusChange: (s) => setStatus(s),

      onTranscriptDelta: (delta) => {
        setTranscript((prev) => prev + delta);
      },

      onTranscriptDone: (text) => {
        setTranscript(text);
        storeSetTranscript(text);
        // Добавляем в чат как сообщение пользователя
        if (text.trim()) {
          addMessage("user", text);
        }
      },

      onResponseDelta: (delta) => {
        setResponse((prev) => {
          const next = prev + delta;
          // Обновляем store в реальном времени для стриминга
          storeSetResponse(next);
          return next;
        });
      },

      onResponseDone: (text) => {
        setResponse(text);
        storeSetResponse(text);
        // Добавляем финальный ответ в чат
        if (text.trim()) {
          addMessage("assistant", text);
        }
        // Сбрасываем транскрипт готовясь к следующей реплике
        setTranscript("");
      },

      onSpeechStart: () => {
        // Сбрасываем накопленный текст перед новой репликой
        setTranscript("");
        setResponse("");
        storeSetResponse("");
      },

      onSpeechStop: () => {
        // VAD зафиксировал конец речи — ничего не делаем,
        // ждём onTranscriptDone и onResponseDone
      },

      onError: (msg) => {
        console.error("[useRealtime] Error:", msg);
        addMessage("system", `Ошибка Realtime: ${msg}`);
      },
    });
  });

  const connect = useCallback((mode: AssistantMode = "interview") => {
    setTranscript("");
    setResponse("");
    serviceRef.current?.connect(mode);
  }, []);

  const disconnect = useCallback(() => {
    serviceRef.current?.disconnect();
    setTranscript("");
    setResponse("");
  }, []);

  const setMode = useCallback((mode: AssistantMode) => {
    serviceRef.current?.setMode(mode);
  }, []);

  // Отключаемся при размонтировании
  useEffect(() => {
    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  return { status, transcript, response, connect, disconnect, setMode };
}
