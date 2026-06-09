import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "./store";
import { Settings } from "./components/settings";
import { StatusIndicator } from "./components/status-indicator";
import { ErrorDisplay } from "./components/error-display";
import { WindowControls } from "./components/window-controls";
import { Chat } from "./components/chat";
import { InterviewMode } from "./components/interview-mode";
import { VoiceSensitivity } from "./components/voice-sensitivity";
import { AudioPipeline } from "./services/audio-pipeline";
import { InterviewService } from "./services/interview-service";
import { useRealtime } from "./hooks";
import type { AppConfig } from "@steer/types";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const interviewServiceRef = useRef<InterviewService | null>(null);
  const processingIntervalRef = useRef<number | null>(null);

  // Speech detection state
  const lastVoiceTimeRef = useRef<number>(0);
  const silenceStartTimeRef = useRef<number>(0);
  const isSpeechActiveRef = useRef<boolean>(false);
  const [speechState, setSpeechState] = useState<
    "idle" | "speaking" | "paused"
  >("idle");

  // Realtime mode: использует OpenAI Realtime API вместо batch pipeline
  const [realtimeEnabled, setRealtimeEnabled] = useState(
    () => localStorage.getItem("realtime_enabled") === "true"
  );
  const realtime = useRealtime();

  // Access state from the store
  const {
    isCapturing,
    isProcessing,
    apiKeyConfigured,
    audioDeviceConnected,
    error,
    messages,
    mode,
    interviewContext,
    setApiKeyConfigured,
    setAudioDeviceConnected,
    setError,
    startCapture,
    setProcessing,
    setTranscript,
    setResponse,
    clearMessages,
    setMode,
    addToInterviewContext,
    clearInterviewContext,
    getInterviewContext,
    addMessage,
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

  // Управление Realtime соединением в зависимости от режима и состояния захвата
  useEffect(() => {
    if (realtimeEnabled && isCapturing) {
      realtime.connect(mode);
    } else {
      realtime.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeEnabled, isCapturing, mode]);

  // Start audio processing pipeline when capturing
  useEffect(() => {
    if (isCapturing && !processingIntervalRef.current) {
      // Initialize audio pipeline
      audioPipelineRef.current = new AudioPipeline();
      interviewServiceRef.current = new InterviewService();

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
  }, [isCapturing]);

  /**
   * Initialize application
   * - Check audio device connection
   */
  const initializeApp = async () => {
    try {
      // Load config from localStorage
      const storedConfig = localStorage.getItem("app_config");

      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig) as AppConfig;
        setConfig(parsedConfig);
      }

      // API key is always configured (server-side)
      setApiKeyConfigured(true);

      // Check audio device connection
      await checkAudioDevice();
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
   * Check if audio device is available
   */
  const checkAudioDevice = async () => {
    try {
      // Try to get capture status from Tauri
      await invoke<boolean>("get_capture_status");
      setAudioDeviceConnected(true);
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

  /**
   * Start audio capture via Tauri command
   */
  const startAudioCapture = async () => {
    try {
      // Use the configured audio device from config
      const deviceName = config?.audioDevice || "WASAPI Loopback";
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

      // Save config to localStorage (no API key needed)
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
   * Process audio pipeline with interview mode support
   * Requirements: 1.5, 2.1, 2.3, 3.1, 3.3, 4.3
   */
  const processAudioPipeline = async () => {
    // Проверяем, включен ли анализ разговоров
    const analysisEnabled =
      localStorage.getItem("analysis_enabled") !== "false";

    // Skip if analysis is disabled OR realtime mode is active (handles its own pipeline)
    if (
      !analysisEnabled ||
      realtimeEnabled ||
      !audioPipelineRef.current ||
      !interviewServiceRef.current
    ) {
      return;
    }

    try {
      // Get audio buffer size to check if there's accumulated audio
      const bufferSize = await invoke<number>("get_buffer_size");

      if (bufferSize === 0) {
        // No audio accumulated yet
        setCurrentAudioLevel(0);
        return;
      }

      // Get current audio level without consuming the buffer
      const audioLevel = await invoke<number>("get_audio_level");
      setCurrentAudioLevel(audioLevel);

      // Get threshold from localStorage (configurable by user)
      const savedThreshold = localStorage.getItem("voice_threshold");
      const VOICE_THRESHOLD = savedThreshold
        ? parseFloat(savedThreshold)
        : 0.02;

      const now = Date.now();

      // Voice detected
      if (audioLevel >= VOICE_THRESHOLD) {
        lastVoiceTimeRef.current = now;

        if (!isSpeechActiveRef.current) {
          console.log("🎤 Speech started");
          isSpeechActiveRef.current = true;
          silenceStartTimeRef.current = 0;
          setSpeechState("speaking");
        }
        return; // Continue accumulating
      }

      // Silence detected
      if (isSpeechActiveRef.current) {
        // Start silence timer if not started
        if (silenceStartTimeRef.current === 0) {
          silenceStartTimeRef.current = now;
          console.log("🔇 Silence started, waiting...");
          setSpeechState("paused");
        }

        // Wait for 1.5 seconds of silence before processing (optimized)
        const SILENCE_DURATION = 1500; // 1.5 seconds (was 2 seconds)
        const silenceDuration = now - silenceStartTimeRef.current;

        if (silenceDuration < SILENCE_DURATION) {
          console.log(
            `⏳ Silence: ${silenceDuration}ms / ${SILENCE_DURATION}ms`
          );
          return; // Wait for more silence
        }

        // 2 seconds of silence passed, process the accumulated audio
        console.log("✅ Speech ended, waiting 500ms for post-roll...");
        isSpeechActiveRef.current = false;
        silenceStartTimeRef.current = 0;
        setSpeechState("idle");

        // Skip if already processing
        if (isProcessing) {
          console.log("⚠️ Already processing, skipping");
          return;
        }

        setProcessing(true);

        // Wait 500ms to capture the tail of speech (post-roll)
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("📥 Post-roll complete, getting audio data");
      } else {
        // No active speech, nothing to do
        setSpeechState("idle");
        return;
      }

      // Get accumulated audio data
      const audioBuffer = await invoke<number[]>("get_audio_data");

      if (!audioBuffer || audioBuffer.length === 0) {
        console.log("⚠️ No audio data after silence");
        return;
      }

      console.log(
        `📊 Processing ${audioBuffer.length} bytes of accumulated audio`
      );

      // Convert PCM to WAV format in memory (fast, no disk I/O)
      console.time("⚡ PCM to WAV conversion");
      const wavData = await invoke<number[]>("convert_pcm_to_wav", {
        buffer: audioBuffer,
        sampleRate: 48000,
      });
      console.timeEnd("⚡ PCM to WAV conversion");

      console.log("✅ WAV data ready:", wavData.length, "bytes");

      const audioData = new Uint8Array(wavData);

      // Transcribe audio
      const transcript =
        await interviewServiceRef.current.transcribeAudio(audioData);

      console.log("Transcript:", transcript);

      // Detect if this is a question that needs an answer
      const isQuestion =
        await interviewServiceRef.current.detectQuestion(transcript);

      console.log("Is question:", isQuestion);

      if (!isQuestion) {
        console.log("Not a question, skipping response generation");
        addMessage("system", `Обнаружена речь (не вопрос): "${transcript}"`);
        return;
      }

      // Add question to chat immediately
      addMessage("user", transcript);

      // Get context for interview mode
      const context = mode === "interview" ? getInterviewContext() : undefined;

      // Check if streaming is enabled (default: true)
      const streamingEnabled =
        localStorage.getItem("streaming_enabled") !== "false";

      // Generate response with optional streaming
      console.log(
        `⚡ Starting response generation (streaming: ${streamingEnabled})...`
      );
      console.time("⚡ Total response time");

      const response = await interviewServiceRef.current.generateResponseStream(
        {
          transcript,
          mode,
          context,
        },
        (partialResponse) => {
          // Update response in real-time as chunks arrive
          setResponse(partialResponse);
          // Update last message in chat (bot response)
          addMessage("assistant", partialResponse);
        },
        streamingEnabled // Pass streaming flag
      );

      console.timeEnd("⚡ Total response time");
      console.log(
        "✅ Response generation completed, final length:",
        response.length
      );

      // Set final response in store
      setResponse(response);

      // Add to interview context if in interview mode
      if (mode === "interview") {
        addToInterviewContext(transcript, response);
      }

      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error("Audio pipeline error:", error);

      // Ignore errors about empty/small audio data (expected when no audio is captured)
      if (
        error instanceof Error &&
        (error.message.includes("No audio data") ||
          error.message.includes("too small"))
      ) {
        return; // Skip silently
      }

      // Set error for other issues
      if (error instanceof Error) {
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

  // Show settings if requested
  if (showSettings) {
    return (
      <Settings
        initialConfig={config || undefined}
        onSave={handleSettingsSave}
        onCancel={handleSettingsCancel}
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
        <InterviewMode
          currentMode={mode}
          onModeChange={setMode}
          onClearHistory={clearInterviewContext}
          historyCount={interviewContext?.questions.length || 0}
        />
      </div>

      {/* Voice Sensitivity - показывается только в режиме интервью */}
      {mode === "interview" && (
        <div style={{ marginTop: "16px" }}>
          <VoiceSensitivity currentLevel={currentAudioLevel} />
        </div>
      )}

      <div style={{ marginTop: "12px" }}>
        {/* Speech state indicator */}
        {mode === "interview" && isCapturing && (
          <div
            style={{
              marginTop: "8px",
              textAlign: "center",
              fontSize: "12px",
              color:
                speechState === "speaking"
                  ? "#4CAF50"
                  : speechState === "paused"
                    ? "#FF9800"
                    : "#666",
            }}
          >
            {speechState === "speaking" && "🎤 Говорите..."}
            {speechState === "paused" && "⏸️ Пауза (ожидание завершения)"}
            {speechState === "idle" && "👂 Слушаю..."}
          </div>
        )}
      </div>

      <div style={{ flex: 1, marginTop: "20px", minHeight: 0 }}>
        <Chat messages={messages} isProcessing={isProcessing} />
      </div>

      <div className="app-actions">
        <button
          onClick={() => {
            const current =
              localStorage.getItem("analysis_enabled") !== "false";
            localStorage.setItem("analysis_enabled", (!current).toString());
            window.location.reload();
          }}
          className={`btn ${
            localStorage.getItem("analysis_enabled") !== "false"
              ? "btn-success"
              : "btn-warning"
          }`}
          title={
            localStorage.getItem("analysis_enabled") !== "false"
              ? "Анализ включен. Нажмите, чтобы отключить отправку в ChatGPT"
              : "Анализ отключен. Нажмите, чтобы включить отправку в ChatGPT"
          }
        >
          {localStorage.getItem("analysis_enabled") !== "false"
            ? "🤖 Анализ ВКЛ"
            : "⏸️ Анализ ВЫКЛ"}
        </button>
        {/* Кнопка переключения Realtime / Batch */}
        <button
          onClick={() => {
            const next = !realtimeEnabled;
            setRealtimeEnabled(next);
            localStorage.setItem("realtime_enabled", next.toString());
          }}
          className={`btn ${realtimeEnabled ? "btn-success" : "btn-secondary"}`}
          title={
            realtimeEnabled
              ? `Realtime API активен (${realtime.status}). Нажмите, чтобы вернуться в Batch-режим`
              : "Включить Realtime API — низкая задержка, встроенный VAD"
          }
        >
          {realtimeEnabled
            ? `⚡ Realtime (${realtime.status})`
            : "💤 Batch mode"}
        </button>
        <button
          onClick={async () => {
            try {
              const buffer = await invoke<number[]>("get_audio_data");
              if (buffer && buffer.length > 0) {
                const path = await invoke<string>("save_audio_debug", {
                  buffer: Array.from(buffer),
                  sampleRate: 48000,
                });
                addMessage("system", `Аудио сохранено в:\n${path}`);
              } else {
                addMessage("system", "Нет аудио данных для сохранения");
              }
            } catch (error) {
              addMessage("system", `Ошибка сохранения: ${error}`);
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
          onClick={() => {
            const current =
              localStorage.getItem("streaming_enabled") !== "false";
            localStorage.setItem("streaming_enabled", (!current).toString());
            window.location.reload();
          }}
          className={`btn ${
            localStorage.getItem("streaming_enabled") !== "false"
              ? "btn-success"
              : "btn-secondary"
          }`}
          title={
            localStorage.getItem("streaming_enabled") !== "false"
              ? "Streaming включен (ответ появляется постепенно)"
              : "Streaming выключен (ответ появляется целиком)"
          }
        >
          {localStorage.getItem("streaming_enabled") !== "false"
            ? "⚡ Stream ВКЛ"
            : "📄 Stream ВЫКЛ"}
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
