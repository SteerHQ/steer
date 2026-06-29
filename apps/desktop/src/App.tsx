import { useEffect, useState } from "react";
import { useAppStore } from "./store";
import { Settings } from "./components/settings";
import { StatusIndicator } from "./components/status-indicator";
import { ErrorDisplay } from "./components/error-display";
import { WindowControls } from "./components/window-controls";
import { Chat } from "./components/chat";
import { InterviewMode } from "./components/interview-mode";
import { ProfilePanel } from "./components/profile-panel";
import { VoiceSensitivity } from "./components/voice-sensitivity";
import { AppActions } from "./components/app-actions";
import { useAppInitialization } from "./hooks/use-app-initialization";
import { useAudioPipeline } from "./hooks/use-audio-pipeline";
import { useStealth } from "./hooks/use-stealth";
import type { AppConfig } from "@steer/types";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(
    () => localStorage.getItem("realtime_enabled") === "true",
  );

  const {
    isCapturing,
    isProcessing,
    apiKeyConfigured,
    audioDeviceConnected,
    error,
    messages,
    mode,
    interviewContext,
    profileDrawerOpen,
    setProfileDrawerOpen,
    setError,
    setMode,
    clearInterviewContext,
  } = useAppStore();

  const {
    deviceSampleRateRef,
    initializeApp,
    checkAudioDevice,
    startAudioCapture,
    handleSettingsSave,
  } = useAppInitialization({ config, setConfig, setShowSettings });

  const { currentAudioLevel, speechState, processAudioPipeline, initServices } =
    useAudioPipeline({ deviceSampleRateRef });

  const { stealthEnabled, toggleStealth } = useStealth();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Start audio capture when ready
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

  // Start audio processing pipeline
  useEffect(() => {
    if (!isCapturing) return;

    initServices();

    const intervalId = window.setInterval(() => {
      processAudioPipeline();
    }, 5000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapturing, processAudioPipeline, initServices]);

  const handleSettingsSaveWrapper = (newConfig: AppConfig) =>
    handleSettingsSave(newConfig, isCapturing);

  const handleSettingsCancel = () => {
    if (apiKeyConfigured) setShowSettings(false);
  };

  const handleErrorRetry = async () => {
    if (!error) return;
    setError(null);

    switch (error.code) {
      case "DEVICE_NOT_FOUND":
      case "CAPTURE_START_ERROR":
        await checkAudioDevice();
        // Re-read fresh state from store after the async check completes
        if (useAppStore.getState().audioDeviceConnected)
          await startAudioCapture();
        break;
      case "API_ERROR":
      case "OPENAI_ERROR":
        setShowSettings(true);
        break;
      case "PIPELINE_ERROR":
      case "NETWORK_ERROR":
        await processAudioPipeline();
        break;
      default:
        await initializeApp();
        break;
    }
  };

  const handleErrorDismiss = () => setError(null);

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

  if (showSettings) {
    return (
      <Settings
        initialConfig={config || undefined}
        onSave={handleSettingsSaveWrapper}
        onCancel={handleSettingsCancel}
      />
    );
  }

  return (
    <>
      <ProfilePanel
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
      />

      <div className="app-container">
      <WindowControls
        stealthEnabled={stealthEnabled}
        onToggleStealth={toggleStealth}
      />

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

      {mode === "interview" && (
        <div style={{ marginTop: "16px" }}>
          <VoiceSensitivity currentLevel={currentAudioLevel} />
        </div>
      )}

      <div style={{ marginTop: "12px" }}>
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

      <AppActions
        onOpenSettings={() => setShowSettings(true)}
        sampleRate={deviceSampleRateRef.current}
      />
      </div>
    </>
  );
}

export default App;
