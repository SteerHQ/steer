import { invoke } from "@tauri-apps/api/core";
import type { AssistantMode } from "@steer/types";

const REALTIME_WS_URL = "ws://localhost:3000/api/realtime";

/** Системные промпты по режимам (копия логики из openai-service на API) */
const SYSTEM_PROMPTS: Record<AssistantMode, string> = {
  interview: `Ты - AI-ассистент, который помогает кандидату проходить техническое собеседование на позицию Software Engineer.
ВАЖНО: Генерируй ГОТОВЫЕ ОТВЕТЫ от первого лица (3-5 предложений, 30-60 секунд речи).
Структура: краткое определение → личный опыт → конкретный пример.
Отвечай ТОЛЬКО по-русски.`,

  algorithm: `Ты - эксперт по алгоритмам и структурам данных.
Объясни подход (1-2 предложения), укажи сложность O(), назови ключевую структуру данных.
Отвечай ТОЛЬКО по-русски.`,

  cheatsheet: `Ты - быстрая шпаргалка для разработчика. Давай максимально краткие ответы — только факты.
Отвечай ТОЛЬКО по-русски.`,

  general: `Отвечай коротко, по-русски, давай технический ответ на вопрос с собеседования.`,
};

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "responding"
  | "error";

export interface RealtimeCallbacks {
  onStatusChange?: (status: RealtimeStatus) => void;
  onTranscriptDelta?: (delta: string) => void;
  onTranscriptDone?: (text: string) => void;
  onResponseDelta?: (delta: string) => void;
  onResponseDone?: (text: string) => void;
  onSpeechStart?: () => void;
  onSpeechStop?: () => void;
  onError?: (message: string) => void;
}

/**
 * RealtimeService — клиент для OpenAI Realtime API через наш прокси.
 *
 * Принцип работы:
 *  1. Подключается к ws://localhost:3000/api/realtime (прокси держит API ключ)
 *  2. Настраивает сессию: VAD включён, только текстовая модальность ответа
 *     (транскрипцию голоса интервьюера делаем через audio_input)
 *  3. Стримит PCM16 аудио кусками по 100ms из Tauri
 *  4. OpenAI VAD сам определяет конец речи и триггерит response.create
 *  5. Коллбэки сообщают о дельтах транскрипта и ответа
 */
export class RealtimeService {
  private ws: WebSocket | null = null;
  private status: RealtimeStatus = "idle";
  private callbacks: RealtimeCallbacks = {};
  private mode: AssistantMode = "interview";
  private audioStreamInterval: ReturnType<typeof setInterval> | null = null;

  /** Накопленный транскрипт текущей реплики */
  private currentTranscript = "";
  /** Накопленный ответ модели */
  private currentResponse = "";

  // Интервал захвата аудио: 100ms → ~3200 байт PCM16 при 16kHz
  private readonly AUDIO_CHUNK_INTERVAL_MS = 100;

  constructor(callbacks: RealtimeCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /** Обновить коллбэки (например после re-render компонента) */
  setCallbacks(callbacks: RealtimeCallbacks) {
    this.callbacks = callbacks;
  }

  /** Текущий статус соединения */
  getStatus(): RealtimeStatus {
    return this.status;
  }

  /**
   * Подключиться к прокси и начать сессию.
   */
  connect(mode: AssistantMode = "interview") {
    if (this.ws) {
      this.disconnect();
    }

    this.mode = mode;
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(REALTIME_WS_URL);

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.initSession();
        this.startAudioStream();
      };

      this.ws.onmessage = (event) => {
        this.handleServerEvent(event.data as string);
      };

      this.ws.onerror = () => {
        this.setStatus("error");
        this.callbacks.onError?.("WebSocket connection error");
      };

      this.ws.onclose = (event) => {
        this.stopAudioStream();
        if (this.status !== "idle") {
          this.setStatus("idle");
        }
        console.log(`[RealtimeService] WS closed: ${event.code}`);
      };
    } catch (err) {
      this.setStatus("error");
      this.callbacks.onError?.(`Failed to connect: ${err}`);
    }
  }

  /**
   * Отключиться и остановить захват аудио.
   */
  disconnect() {
    this.stopAudioStream();
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.setStatus("idle");
  }

  /** Сменить режим на лету — обновляет инструкции сессии */
  setMode(mode: AssistantMode) {
    this.mode = mode;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.updateSessionInstructions(mode);
    }
  }

  // ---------------------------------------------------------------------------
  // Приватные методы
  // ---------------------------------------------------------------------------

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  /** Инициализация сессии OpenAI Realtime */
  private initSession() {
    this.send({
      type: "session.update",
      session: {
        modalities: ["text"], // только текстовые ответы (не TTS)
        instructions: SYSTEM_PROMPTS[this.mode],
        input_audio_format: "pcm16",
        // Rust ресемплирует до 16000 Hz — явно указываем OpenAI
        input_audio_sample_rate: 16000,
        input_audio_transcription: {
          model: "gpt-4o-transcribe",
          language: "ru",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,
        },
      },
    });
  }

  /** Обновить инструкции без разрыва соединения */
  private updateSessionInstructions(mode: AssistantMode) {
    this.send({
      type: "session.update",
      session: {
        instructions: SYSTEM_PROMPTS[mode],
      },
    });
  }

  /**
   * Запустить периодический захват PCM16 из Tauri и отправку в буфер.
   * Tauri команда `get_audio_chunk` должна возвращать number[] PCM16 байтов
   * за последний интервал времени.
   */
  private startAudioStream() {
    this.stopAudioStream();

    this.audioStreamInterval = setInterval(async () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.stopAudioStream();
        return;
      }

      try {
        // Tauri возвращает сырые PCM16 байты за последние ~100ms
        const chunk = await invoke<number[]>("get_audio_chunk");

        if (!chunk || chunk.length === 0) return;

        // Конвертируем в base64 для OpenAI
        const base64 = arrayToBase64(chunk);

        this.send({
          type: "input_audio_buffer.append",
          audio: base64,
        });
      } catch (err) {
        // Tauri команда может не существовать — не прерываем цикл
        console.warn("[RealtimeService] get_audio_chunk failed:", err);
      }
    }, this.AUDIO_CHUNK_INTERVAL_MS);
  }

  private stopAudioStream() {
    if (this.audioStreamInterval !== null) {
      clearInterval(this.audioStreamInterval);
      this.audioStreamInterval = null;
    }
  }

  /** Обработка входящих событий от OpenAI (через прокси) */
  private handleServerEvent(raw: string) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw);
    } catch {
      console.warn("[RealtimeService] Non-JSON message:", raw);
      return;
    }

    switch (event.type) {
      // Сессия создана
      case "session.created":
      case "session.updated":
        console.log("[RealtimeService] Session ready");
        break;

      // VAD: начало речи
      case "input_audio_buffer.speech_started":
        this.setStatus("listening");
        this.currentTranscript = "";
        this.currentResponse = "";
        this.callbacks.onSpeechStart?.();
        break;

      // VAD: конец речи
      case "input_audio_buffer.speech_stopped":
        this.callbacks.onSpeechStop?.();
        break;

      // Дельта транскрипта входящего аудио
      case "conversation.item.input_audio_transcription.delta": {
        const delta = (event.delta as string) ?? "";
        this.currentTranscript += delta;
        this.callbacks.onTranscriptDelta?.(delta);
        break;
      }

      // Финальный транскрипт
      case "conversation.item.input_audio_transcription.completed": {
        const transcript =
          (event.transcript as string) ?? this.currentTranscript;
        this.currentTranscript = transcript;
        this.callbacks.onTranscriptDone?.(transcript);
        break;
      }

      // Модель начала генерировать ответ
      case "response.created":
        this.setStatus("responding");
        this.currentResponse = "";
        break;

      // Дельта текстового ответа
      case "response.text.delta": {
        const delta = (event.delta as string) ?? "";
        this.currentResponse += delta;
        this.callbacks.onResponseDelta?.(delta);
        break;
      }

      // Ответ завершён
      case "response.text.done": {
        const text = (event.text as string) ?? this.currentResponse;
        this.currentResponse = text;
        this.callbacks.onResponseDone?.(text);
        this.setStatus("connected");
        break;
      }

      // Ответ на уровне response завершён (все modalities)
      case "response.done":
        if (this.status === "responding") {
          this.setStatus("connected");
        }
        break;

      // Ошибка от OpenAI
      case "error": {
        const err = event.error as { message?: string } | undefined;
        const msg = err?.message ?? "Unknown Realtime API error";
        console.error("[RealtimeService] Error event:", msg);
        this.callbacks.onError?.(msg);
        break;
      }

      default:
        break;
    }
  }

  private send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

/** Конвертация массива байтов в base64 строку */
function arrayToBase64(bytes: number[]): string {
  const uint8 = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}
