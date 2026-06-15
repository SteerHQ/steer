import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";
import type { AppConfig } from "@steer/types";

interface UseAppInitializationOptions {
  config: AppConfig | null;
  setConfig: (config: AppConfig) => void;
  setShowSettings: (show: boolean) => void;
}

export function useAppInitialization({
  config,
  setConfig,
  setShowSettings,
}: UseAppInitializationOptions) {
  const { setApiKeyConfigured, setAudioDeviceConnected, setError, startCapture } =
    useAppStore();

  const deviceSampleRateRef = useRef<number>(48000);

  const checkAudioDevice = async () => {
    try {
      const isAvailable = await invoke<boolean>("get_capture_status");
      if (isAvailable) {
        setAudioDeviceConnected(true);
      } else {
        setAudioDeviceConnected(false);
        setError({
          error: "Audio device not found. Please check audio settings.",
          code: "DEVICE_NOT_FOUND",
          retryable: true,
        });
      }
    } catch (error) {
      console.error("Audio device check failed:", error);
      setAudioDeviceConnected(false);
      setError({
        error: "Audio device not found. Please check audio settings.",
        code: "DEVICE_NOT_FOUND",
        retryable: true,
      });
    }
  };

  const startAudioCapture = async () => {
    try {
      const deviceName = config?.audioDevice || "WASAPI Loopback";
      console.log("Starting audio capture with device:", deviceName);

      await invoke<string>("start_audio_capture", { deviceName });
      startCapture();
      setAudioDeviceConnected(true);

      try {
        const sr = await invoke<number>("get_device_sample_rate");
        deviceSampleRateRef.current = sr;
        console.log("Device sample rate:", sr, "Hz");
      } catch {
        deviceSampleRateRef.current = 48000;
      }

      console.log("Audio capture started successfully with device:", deviceName);
    } catch (error) {
      console.error("Failed to start audio capture:", error);
      setAudioDeviceConnected(false);
      setError({
        error:
          typeof error === "string" ? error : "Failed to start audio capture",
        code: "CAPTURE_START_ERROR",
        retryable: true,
      });
    }
  };

  const initializeApp = async () => {
    try {
      const storedConfig = localStorage.getItem("app_config");
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig) as AppConfig;
        setConfig(parsedConfig);
      }

      setApiKeyConfigured(true);
      // Mark device as connected optimistically so the capture useEffect fires.
      // startAudioCapture will set it to false and surface an error if the device
      // is genuinely unavailable.
      setAudioDeviceConnected(true);
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setError({
        error: "Failed to initialize application",
        code: "INIT_ERROR",
        retryable: false,
      });
    }
  };

  const handleSettingsSave = async (newConfig: AppConfig, isCapturing: boolean) => {
    try {
      const oldDeviceName = config?.audioDevice;
      const newDeviceName = newConfig.audioDevice;

      localStorage.setItem("app_config", JSON.stringify(newConfig));
      setConfig(newConfig);
      setApiKeyConfigured(true);
      setShowSettings(false);

      if (isCapturing && oldDeviceName !== newDeviceName) {
        console.log("Audio device changed, restarting capture...");
        try {
          await invoke<string>("stop_audio_capture");
          await invoke<string>("start_audio_capture", { deviceName: newDeviceName });

          // Refresh sample rate for the new device
          try {
            const sr = await invoke<number>("get_device_sample_rate");
            deviceSampleRateRef.current = sr;
            console.log("New device sample rate:", sr, "Hz");
          } catch {
            deviceSampleRateRef.current = 48000;
          }

          console.log("Capture restarted with new device:", newDeviceName);
        } catch (error) {
          console.error("Failed to restart capture with new device:", error);
          // Update UI to reflect that capture is no longer running
          const { stopCapture } = useAppStore.getState();
          stopCapture();
          setAudioDeviceConnected(false);
          setError({
            error:
              typeof error === "string"
                ? error
                : "Failed to restart audio capture with new device",
            code: "CAPTURE_START_ERROR",
            retryable: true,
          });
        }
      }

      await checkAudioDevice();
    } catch (error) {
      console.error("Failed to save settings:", error);
      setError({
        error: "Failed to save settings",
        code: "SETTINGS_SAVE_ERROR",
        retryable: false,
      });
    }
  };

  return {
    deviceSampleRateRef,
    initializeApp,
    checkAudioDevice,
    startAudioCapture,
    handleSettingsSave,
  };
}
