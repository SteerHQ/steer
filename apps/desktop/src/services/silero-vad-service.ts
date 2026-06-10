import { NonRealTimeVAD } from "@ricky0123/vad-web";
import * as ort from "onnxruntime-web";

// Указываем ORT, где искать WASM и .mjs файлы.
// vite-plugin-static-copy кладёт их в корень сервера/dist.
// В dev режиме Vite отдаёт статику из корня проекта через localhost:1420.
const wasmRoot =
  typeof window !== "undefined"
    ? `${window.location.origin}/`
    : "./";

ort.env.wasm.wasmPaths = wasmRoot;

export interface VADSpeechSegment {
  /** Float32Array аудио сегмент, 16000 Hz, от -1 до 1 */
  audio: Float32Array;
  /** Позиция начала сегмента в мс относительно начала обрабатываемого буфера */
  startMs: number;
  /** Позиция конца сегмента в мс */
  endMs: number;
}

export interface SileroVADOptions {
  /** Порог обнаружения речи (0–1, по умолчанию 0.5) */
  positiveSpeechThreshold?: number;
  /** Порог конца речи (0–1, по умолчанию 0.35) */
  negativeSpeechThreshold?: number;
  /** Минимальная длина сегмента речи в мс (по умолчанию 250) */
  minSpeechMs?: number;
  /** Паузы до конца речи в мс (по умолчанию 500) */
  redemptionMs?: number;
  /** Добавить паузу перед речью в мс (по умолчанию 30) */
  preSpeechPadMs?: number;
}

/**
 * SileroVADService — обёртка над NonRealTimeVAD из @ricky0123/vad-web.
 *
 * Принимает сырые PCM16 LE байты (mono, любой sample rate из Tauri)
 * и возвращает сегменты речи как Float32Array (16000 Hz).
 *
 * Используется в batch pipeline вместо грубого RMS-детектора.
 *
 * Пример:
 * ```ts
 * const vad = await SileroVADService.create();
 * const segments = await vad.processBuffer(pcm16Bytes, 48000);
 * for (const seg of segments) {
 *   console.log(`Речь: ${seg.startMs}ms – ${seg.endMs}ms`);
 * }
 * ```
 */
export class SileroVADService {
  private vad: NonRealTimeVAD;
  private options: Required<SileroVADOptions>;

  private constructor(
    vad: NonRealTimeVAD,
    options: Required<SileroVADOptions>,
  ) {
    this.vad = vad;
    this.options = options;
  }

  /**
   * Создать экземпляр (загружает ONNX модель один раз, ~200ms при первом вызове)
   */
  static async create(
    options: SileroVADOptions = {},
  ): Promise<SileroVADService> {
    const resolved: Required<SileroVADOptions> = {
      positiveSpeechThreshold: options.positiveSpeechThreshold ?? 0.5,
      negativeSpeechThreshold: options.negativeSpeechThreshold ?? 0.35,
      minSpeechMs: options.minSpeechMs ?? 250,
      redemptionMs: options.redemptionMs ?? 500,
      preSpeechPadMs: options.preSpeechPadMs ?? 30,
    };

    const vad = await NonRealTimeVAD.new({
      positiveSpeechThreshold: resolved.positiveSpeechThreshold,
      negativeSpeechThreshold: resolved.negativeSpeechThreshold,
      minSpeechMs: resolved.minSpeechMs,
      redemptionMs: resolved.redemptionMs,
      preSpeechPadMs: resolved.preSpeechPadMs,
    });

    return new SileroVADService(vad, resolved);
  }

  /**
   * Обработать буфер PCM16 LE и вернуть все найденные сегменты речи.
   *
   * @param pcm16Bytes - сырые байты PCM16 mono little-endian (из Tauri get_audio_data)
   * @param sourceSampleRate - sample rate источника (например 48000)
   * @returns массив сегментов речи
   */
  async processBuffer(
    pcm16Bytes: number[] | Uint8Array,
    sourceSampleRate: number,
  ): Promise<VADSpeechSegment[]> {
    // PCM16 LE → Float32Array нормализованный в [-1, 1]
    const float32 = pcm16ToFloat32(pcm16Bytes);

    const segments: VADSpeechSegment[] = [];

    for await (const { audio, start, end } of this.vad.run(
      float32,
      sourceSampleRate,
    )) {
      segments.push({ audio, startMs: start, endMs: end });
    }

    return segments;
  }

  /**
   * Проверить, содержит ли буфер хоть один сегмент речи.
   * Быстрее чем processBuffer — останавливается при первом найденном сегменте.
   *
   * @param pcm16Bytes - сырые байты PCM16 mono LE
   * @param sourceSampleRate - sample rate источника
   */
  async hasSpeech(
    pcm16Bytes: number[] | Uint8Array,
    sourceSampleRate: number,
  ): Promise<boolean> {
    const float32 = pcm16ToFloat32(pcm16Bytes);

    for await (const _ of this.vad.run(float32, sourceSampleRate)) {
      return true;
    }
    return false;
  }

  /**
   * Объединить все сегменты речи из буфера в один непрерывный Float32Array (16000 Hz).
   * Удобно когда нужно передать аудио на транскрипцию одним куском.
   */
  async extractSpeechAudio(
    pcm16Bytes: number[] | Uint8Array,
    sourceSampleRate: number,
  ): Promise<Float32Array | null> {
    const segments = await this.processBuffer(pcm16Bytes, sourceSampleRate);

    if (segments.length === 0) return null;

    // Склеиваем все сегменты
    const totalLength = segments.reduce((sum, s) => sum + s.audio.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const seg of segments) {
      merged.set(seg.audio, offset);
      offset += seg.audio.length;
    }
    return merged;
  }
}

// ─── Утилиты ────────────────────────────────────────────────────────────────

/**
 * Конвертировать PCM16 LE байты в Float32Array [-1, 1]
 */
function pcm16ToFloat32(pcm16Bytes: number[] | Uint8Array): Float32Array {
  const bytes =
    pcm16Bytes instanceof Uint8Array ? pcm16Bytes : new Uint8Array(pcm16Bytes);

  const sampleCount = Math.floor(bytes.length / 2);
  const float32 = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    const lo = bytes[i * 2];
    const hi = bytes[i * 2 + 1];
    // little-endian i16 → [-32768, 32767] → [-1, 1]
    const sample = (hi << 8) | lo;
    const signed = sample >= 32768 ? sample - 65536 : sample;
    float32[i] = signed / 32768.0;
  }

  return float32;
}

/**
 * Конвертировать Float32Array (16000 Hz) в WAV Blob для отправки на API транскрипции.
 * VAD возвращает 16kHz сегменты — сразу используем без ресемплинга.
 */
export function float32ToWavBlob(
  float32: Float32Array,
  sampleRate = 16000,
): Blob {
  const pcm16 = float32ToPcm16(float32);
  return pcm16ToWavBlob(pcm16, sampleRate);
}

function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    pcm[i] = Math.round(clamped * 32767);
  }
  return pcm;
}

function pcm16ToWavBlob(pcm16: Int16Array, sampleRate: number): Blob {
  const dataLength = pcm16.byteLength;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);

  // Copy PCM data
  new Int16Array(buffer, 44).set(pcm16);

  return new Blob([buffer], { type: "audio/wav" });
}
