import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "./store";
import { Settings } from "./components/settings";
import { OverlayWindow } from "./components/overlay-window";
import { StatusIndicator } from "./components/status-indicator";
import { ErrorDisplay } from "./components/error-display";
import { WindowControls } from "./components/window-controls";
import { Chat } from "./components/chat";
import { AudioVisualizer } from "./components/audio-visualizer";
import { AudioPipeline } from "./services/audio-pipeline";
import type { AppConfig } from "@steer/types";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const processingIntervalRef = useRef<number | null>(null);

  // Access state from the store
  const {
    isCapturing,
    isProcessing,
    currentResponse,
    overlayVisible,
    apiKeyConfigured,
    audioDeviceConnected,
    error,
    messages,
    setApiKeyConfigured,
    setAudioDeviceConnected,
    setError,
    startCapture,
    hideOverlay,
    setProcessing,
    setTranscript,
    setResponse,
    clearMessages,
  } = useAppStore();

  // Initialize application on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Start audio capture when API key is configured and device is connected
  useEffect(() => {
    if (
      apiKeyConfigured &&
      audioDeviceConnected &&
      !isCapturing &&
      !showSettings
    ) {
      startAudioCapture();
    }
  }, [apiKeyConfigured, audioDeviceConnected, showSettings]);

  // Start audio processing pipeline when capturing
  useEffect(() => {
    if (isCapturing && config?.apiKey && !processingIntervalRef.current) {
      // Initialize audio pipeline
      audioPipelineRef.current = new AudioPipeline(config.apiKey);

      // Poll for audio data every 5 seconds
      processingIntervalRef.current = window.setInterval(() => {
        processAudioPipeline();
      }, 5000);
    }

    // Cleanup on unmount or when capturing stops
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
      }
    };
  }, [isCapturing, config]);

  /**
   * Initialize application
   * - Check for API key in local storage
   * - Check audio device connection
   */
  const initializeApp = async () => {
    try {
      // Check if API key exists in localStorage
      const storedApiKey = localStorage.getItem("openai_api_key");
      const storedConfig = localStorage.getItem("app_config");

      if (storedApiKey && storedConfig) {
        const parsedConfig = JSON.parse(storedConfig) as AppConfig;
        setConfig(parsedConfig);
        setApiKeyConfigured(true);

        // Check audio device connection
        await checkAudioDevice();
      } else {
        // No API key configured, show settings
        setShowSettings(true);
      }
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setError({
        error: "Failed to initialize application",
        code: "INIT_ERROR",
        retryable: false,
      });
    }
  };

  /**
   * Check if VB-Cable audio device is available
   */
  const checkAudioDevice = async () => {
    try {
      // Try to get capture status from Tauri
      const status = await invoke<boolean>("get_capture_status");
      setAudioDeviceConnected(true);
    } catch (error) {
      console.error("Audio device check failed:", error);
      setAudioDeviceConnected(false);
      setError({
        error:
          "VB-Cable device not found. Please ensure VB-Cable is installed.",
        code: "DEVICE_NOT_FOUND",
        retryable: true,
      });
    }
  };

  /**
   * Start audio capture via Tauri command
   */
  const startAudioCapture = async () => {
    try {
      // Use the configured audio device from config
      const deviceName = config?.audioDevice || "VB-Cable";
      console.log("Starting audio capture with device:", deviceName);

      await invoke<string>("start_audio_capture", { deviceName });
      startCapture();
      setAudioDeviceConnected(true);
      console.log(
        "Audio capture started successfully with device:",
        deviceName
      );
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

  /**
   * Handle settings save
   */
  const handleSettingsSave = async (newConfig: AppConfig) => {
    try {
      const oldDeviceName = config?.audioDevice;
      const newDeviceName = newConfig.audioDevice;

      // Save API key and config to localStorage
      localStorage.setItem("openai_api_key", newConfig.apiKey);
      localStorage.setItem("app_config", JSON.stringify(newConfig));

      setConfig(newConfig);
      setApiKeyConfigured(true);
      setShowSettings(false);

      // If device changed and capture is active, restart with new device
      if (isCapturing && oldDeviceName !== newDeviceName) {
        console.log("Audio device changed, restarting capture...");
        try {
          await invoke<string>("stop_audio_capture");
          await invoke<string>("start_audio_capture", {
            deviceName: newDeviceName,
          });
          console.log("Capture restarted with new device:", newDeviceName);
        } catch (error) {
          console.error("Failed to restart capture with new device:", error);
        }
      }

      // Check audio device after configuration
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

  /**
   * Handle settings cancel
   */
  const handleSettingsCancel = () => {
    // Only allow cancel if API key is already configured
    if (apiKeyConfigured) {
      setShowSettings(false);
    }
  };

  /**
   * Process audio pipeline
   * Requirements: 1.5, 2.1, 2.3, 3.1, 3.3, 4.3
   */
  const processAudioPipeline = async () => {
    // Skip if already processing
    if (isProcessing || !audioPipelineRef.current) {
      return;
    }

    try {
      setProcessing(true);

      // Run the audio pipeline
      const response = await audioPipelineRef.current.processAudio();

      // Set transcript and response in store
      setResponse(response);

      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error("Audio pipeline error:", error);

      // Only set error if it's not about empty audio (which is expected)
      if (error instanceof Error && !error.message.includes("No audio data")) {
        // Determine error code based on error message
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
  };

  /**
   * Handle error retry
   * Requirements: 1.4, 2.4, 3.4
   */
  const handleErrorRetry = async () => {
    if (!error) return;

    // Clear error
    setError(null);

    // Retry based on error type
    switch (error.code) {
      case "DEVICE_NOT_FOUND":
      case "CAPTURE_START_ERROR":
        // Retry audio device check and capture
        await checkAudioDevice();
        if (audioDeviceConnected) {
          await startAudioCapture();
        }
        break;

      case "API_ERROR":
      case "OPENAI_ERROR":
        // Show settings to reconfigure API key
        setShowSettings(true);
        break;

      case "PIPELINE_ERROR":
      case "NETWORK_ERROR":
        // Retry audio processing
        await processAudioPipeline();
        break;

      default:
        // Generic retry - reinitialize app
        await initializeApp();
        break;
    }
  };

  /**
   * Handle error dismiss
   */
  const handleErrorDismiss = () => {
    setError(null);
  };

  /**
   * Get current status for StatusIndicator
   */
  const getCurrentStatus = ():
    | "capturing"
    | "processing"
    | "idle"
    | "error" => {
    if (error) return "error";
    if (isProcessing) return "processing";
    if (isCapturing) return "capturing";
    return "idle";
  };

  // Show settings if API key is not configured
  if (showSettings || !apiKeyConfigured) {
    return (
      <Settings
        initialConfig={config || undefined}
        onSave={handleSettingsSave}
        onCancel={apiKeyConfigured ? handleSettingsCancel : undefined}
      />
    );
  }

  return (
    <div className="app-container">
      <WindowControls />

      {/* Error Display - Requirements: 1.4, 2.4, 3.4 */}
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={error.retryable ? handleErrorRetry : undefined}
          onDismiss={handleErrorDismiss}
        />
      )}

      <StatusIndicator
        status={getCurrentStatus()}
        audioDeviceConnected={audioDeviceConnected}
        apiKeyConfigured={apiKeyConfigured}
        errorMessage={error?.error}
      />

      <div style={{ marginTop: "20px" }}>
        <AudioVisualizer isActive={isCapturing} />
      </div>

      <div style={{ flex: 1, marginTop: "20px", minHeight: 0 }}>
        <Chat messages={messages} isProcessing={isProcessing} />
      </div>

      <OverlayWindow
        message={
          currentResponse ||
          (error?.code === "OPENAI_ERROR" ? "Ошибка получения ответа" : "")
        }
        visible={overlayVisible || (error?.code === "OPENAI_ERROR" && !!error)}
        autoHideDuration={config?.autoHideDuration || 10000}
        onHide={hideOverlay}
        isError={error?.code === "OPENAI_ERROR"}
      />

      <div className="app-actions">
        <button
          onClick={async () => {
            try {
              const buffer = await invoke<number[]>("get_audio_data");
              if (buffer && buffer.length > 0) {
                const path = await invoke<string>("save_audio_debug", {
                  buffer: Array.from(buffer),
                  sampleRate: 48000,
                });
                alert(`Аудио сохранено в:\n${path}`);
              } else {
                alert("Нет аудио данных для сохранения");
              }
            } catch (error) {
              alert(`Ошибка сохранения: ${error}`);
            }
          }}
          className="btn btn-secondary"
          disabled={!isCapturing}
          title={
            !isCapturing
              ? "Сначала начните захват аудио"
              : "Сохранить текущее аудио в файл"
          }
        >
          💾 Сохранить аудио
        </button>
        <button
          onClick={clearMessages}
          className="btn btn-secondary"
          disabled={messages.length === 0}
          title={
            messages.length === 0
              ? "Нет сообщений для очистки"
              : "Очистить историю"
          }
        >
          🗑️ Очистить чат
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="btn btn-secondary"
        >
          ⚙️ Настройки
        </button>
      </div>
    </div>
  );
}

export default App;
