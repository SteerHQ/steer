import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "./store";
import { Settings } from "./components/settings";
import { OverlayWindow } from "./components/overlay-window";
import { StatusIndicator } from "./components/status-indicator";
import { ErrorDisplay } from "./components/error-display";
import { WindowControls } from "./components/window-controls";
import { Chat } from "./components/chat";
import { AudioVisualizer } from "./components/audio-visualizer";
import { InterviewMode } from "./components/interview-mode";
import { PushToTalk } from "./components/push-to-talk";
import { VoiceSensitivity } from "./components/voice-sensitivity";
import { AudioPipeline } from "./services/audio-pipeline";
import { InterviewService } from "./services/interview-service";
import type { AppConfig } from "@steer/types";

/**
 * Calculate audio level (RMS) from PCM buffer
 * Returns value from 0.0 (silence) to 1.0 (max volume)
 */
function calculateAudioLevel(buffer: number[]): number {
  if (!buffer || buffer.length === 0) {
    return 0;
  }

  // PCM data is 16-bit signed integers (2 bytes per sample)
  const sampleCount = Math.floor(buffer.length / 2);
  let sum = 0;

  for (let i = 0; i < sampleCount; i++) {
    const idx = i * 2;
    if (idx + 1 < buffer.length) {
      // Convert bytes to i16 sample (little-endian)
      const sample = (buffer[idx] | (buffer[idx + 1] << 8));
      // Convert to signed 16-bit
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      // Normalize to -1.0 to 1.0
      const normalized = signedSample / 32768.0;
      sum += normalized * normalized;
    }
  }

  // Calculate RMS (Root Mean Square)
  const rms = Math.sqrt(sum / sampleCount);
  
  return rms;
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false);
  const [currentAudioLevel, setCurrentAudioLevel] = useState(0);
  const audioPipelineRef = useRef<AudioPipeline | null>(null);
  const interviewServiceRef = useRef<InterviewService | null>(null);
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
    mode,
    interviewContext,
    setApiKeyConfigured,
    setAudioDeviceConnected,
    setError,
    startCapture,
    hideOverlay,
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
        error:
          "Audio device not found. Please check audio settings.",
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
    const analysisEnabled = localStorage.getItem("analysis_enabled") !== "false";
    
    // Skip if candidate is speaking (answering the question)
    if (isCandidateSpeaking) {
      console.log("Candidate is speaking, skipping audio processing");
      return;
    }
    
    // Skip if already processing or analysis is disabled
    if (!analysisEnabled || isProcessing || !audioPipelineRef.current || !interviewServiceRef.current) {
      return;
    }

    try {
      setProcessing(true);

      // Get audio data from Tauri (PCM format)
      const audioBuffer = await invoke<number[]>("get_audio_data");
      
      if (!audioBuffer || audioBuffer.length === 0) {
        return; // No audio data, skip silently
      }

      // Check audio level to detect voice activity
      const audioLevel = calculateAudioLevel(audioBuffer);
      setCurrentAudioLevel(audioLevel);
      
      // Get threshold from localStorage (configurable by user)
      const savedThreshold = localStorage.getItem("voice_threshold");
      const VOICE_THRESHOLD = savedThreshold ? parseFloat(savedThreshold) : 0.02;
      
      console.log('Audio level:', (audioLevel * 100).toFixed(2) + '%, threshold:', (VOICE_THRESHOLD * 100).toFixed(2) + '%');
      
      if (audioLevel < VOICE_THRESHOLD) {
        console.log('Audio level too low (silence/noise), skipping processing');
        return; // Тишина или фоновый шум, не обрабатываем
      }

      // Convert PCM to WAV format using Tauri
      console.log('Converting PCM to WAV, size:', audioBuffer.length, 'bytes', 'level:', (audioLevel * 100).toFixed(2) + '%');
      const wavPath = await invoke<string>("save_audio_debug", {
        buffer: audioBuffer,
        sampleRate: 48000,
      });
      
      console.log('WAV file created at:', wavPath);
      
      // Read the WAV file back
      const wavData = await invoke<number[]>("read_wav_file", {
        path: wavPath,
      });
      
      console.log('Read WAV file:', wavData.length, 'bytes');
      
      // Verify WAV header
      if (wavData.length > 4) {
        const header = String.fromCharCode(wavData[0], wavData[1], wavData[2], wavData[3]);
        console.log('WAV header:', header === 'RIFF' ? '✓ Valid' : '✗ Invalid', header);
      }

      const audioData = new Uint8Array(wavData);

      // Transcribe audio
      const transcript = await interviewServiceRef.current.transcribeAudio(
        audioData
      );

      // Set transcript in store
      setTranscript(transcript);

      // Get context for interview mode
      const context = mode === 'interview' ? getInterviewContext() : undefined;

      // Generate response with mode and context
      const response = await interviewServiceRef.current.generateResponse({
        transcript,
        mode,
        context,
      });

      // Set response in store
      setResponse(response);

      // Add to interview context if in interview mode
      if (mode === 'interview') {
        addToInterviewContext(transcript, response);
      }

      // Clear any previous errors
      setError(null);
    } catch (error) {
      console.error("Audio pipeline error:", error);

      // Ignore errors about empty/small audio data (expected when no audio is captured)
      if (error instanceof Error && 
          (error.message.includes("No audio data") || 
           error.message.includes("too small"))) {
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
      {mode === 'interview' && (
        <div style={{ marginTop: "16px" }}>
          <VoiceSensitivity currentLevel={currentAudioLevel} />
        </div>
      )}

      {/* Speaking Toggle - показывается только в режиме интервью */}
      {mode === 'interview' && (
        <div style={{ marginTop: "16px" }}>
          <PushToTalk
            onSpeakingChange={setIsCandidateSpeaking}
            disabled={!isCapturing}
          />
        </div>
      )}

      <div style={{ marginTop: "12px" }}>
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
          onClick={() => {
            const current = localStorage.getItem("analysis_enabled") !== "false";
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
        <button
          onClick={async () => {
            try {
              const buffer = await invoke<number[]>("get_audio_data");
              if (buffer && buffer.length > 0) {
                const path = await invoke<string>("save_audio_debug", {
                  buffer: Array.from(buffer),
                  sampleRate: 48000,
                });
                addMessage('system', `Аудио сохранено в:\n${path}`);
              } else {
                addMessage('system', 'Нет аудио данных для сохранения');
              }
            } catch (error) {
              addMessage('system', `Ошибка сохранения: ${error}`);
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
