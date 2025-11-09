import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createLogger } from "../utils/logger";

const logger = createLogger("AudioDevice");

/**
 * Хук для управления аудио устройством
 */
export function useAudioDevice() {
  const [isConnected, setIsConnected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Проверка подключения устройства
  const checkDevice = useCallback(async () => {
    try {
      await invoke<boolean>("get_capture_status");
      setIsConnected(true);
      setError(null);
      logger.info("Audio device connected");
    } catch (err) {
      setIsConnected(false);
      const errorMsg = "Audio device not found";
      setError(errorMsg);
      logger.error("Audio device check failed", err as Error);
    }
  }, []);

  // Запуск захвата
  const startCapture = useCallback(async (deviceName: string = "WASAPI Loopback") => {
    try {
      logger.info("Starting audio capture", { deviceName });
      await invoke<string>("start_audio_capture", { deviceName });
      setIsCapturing(true);
      setIsConnected(true);
      setError(null);
      logger.info("Audio capture started successfully");
    } catch (err) {
      setIsCapturing(false);
      setIsConnected(false);
      const errorMsg =
        typeof err === "string" ? err : "Failed to start audio capture";
      setError(errorMsg);
      logger.error("Failed to start audio capture", err as Error);
      throw err;
    }
  }, []);

  // Остановка захвата
  const stopCapture = useCallback(async () => {
    try {
      logger.info("Stopping audio capture");
      await invoke<string>("stop_audio_capture");
      setIsCapturing(false);
      logger.info("Audio capture stopped");
    } catch (err) {
      logger.error("Failed to stop audio capture", err as Error);
      throw err;
    }
  }, []);

  // Проверка при монтировании
  useEffect(() => {
    checkDevice();
  }, [checkDevice]);

  return {
    isConnected,
    isCapturing,
    error,
    checkDevice,
    startCapture,
    stopCapture,
  };
}
