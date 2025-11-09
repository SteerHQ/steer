import { useRef, useCallback, useEffect } from "react";
import { AudioPipeline } from "../services/audio-pipeline";
import { useAppStore } from "../store";
import { createLogger } from "../utils/logger";

const logger = createLogger("AudioPipeline");

/**
 * Хук для управления аудио пайплайном
 */
export function useAudioPipeline(apiKey: string | null, enabled: boolean) {
  const pipelineRef = useRef<AudioPipeline | null>(null);
  const intervalRef = useRef<number | null>(null);

  const { isProcessing, setProcessing, setResponse, setError } = useAppStore();

  // Инициализация пайплайна
  useEffect(() => {
    if (apiKey && enabled) {
      pipelineRef.current = new AudioPipeline();
      logger.info("Audio pipeline initialized");
    } else {
      pipelineRef.current = null;
    }
  }, [apiKey, enabled]);

  // Обработка аудио
  const processAudio = useCallback(async () => {
    if (isProcessing || !pipelineRef.current) {
      return;
    }

    try {
      setProcessing(true);
      logger.debug("Starting audio processing");

      const response = await pipelineRef.current.processAudio();
      setResponse(response);
      setError(null);

      logger.info("Audio processed successfully");
    } catch (error) {
      logger.error("Audio processing failed", error as Error);

      if (error instanceof Error && !error.message.includes("No audio data")) {
        let errorCode = "PIPELINE_ERROR";

        if (error.message.includes("API key")) {
          errorCode = "API_ERROR";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorCode = "NETWORK_ERROR";
        } else if (error.message.includes("OpenAI")) {
          errorCode = "OPENAI_ERROR";
        }

        setError({
          error: error.message,
          code: errorCode,
          retryable: true,
        });
      }
    } finally {
      setProcessing(false);
    }
  }, [isProcessing, setProcessing, setResponse, setError]);

  // Запуск периодической обработки
  useEffect(() => {
    if (enabled && apiKey && !intervalRef.current) {
      intervalRef.current = window.setInterval(() => {
        processAudio();
      }, 5000);

      logger.info("Audio processing interval started");
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        logger.info("Audio processing interval stopped");
      }
    };
  }, [enabled, apiKey, processAudio]);

  return { processAudio };
}
