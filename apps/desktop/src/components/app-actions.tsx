import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store";

interface AppActionsProps {
  realtimeEnabled: boolean;
  realtimeStatus: string;
  onToggleRealtime: () => void;
  onOpenSettings: () => void;
  sampleRate?: number;
}

export function AppActions({
  realtimeEnabled,
  realtimeStatus,
  onToggleRealtime,
  onOpenSettings,
  sampleRate = 48000,
}: AppActionsProps) {
  const { isCapturing, messages, clearMessages, addMessage } = useAppStore();

  const analysisEnabled = localStorage.getItem("analysis_enabled") !== "false";
  const streamingEnabled = localStorage.getItem("streaming_enabled") !== "false";

  const handleToggleAnalysis = () => {
    localStorage.setItem("analysis_enabled", (!analysisEnabled).toString());
    window.location.reload();
  };

  const handleToggleStreaming = () => {
    localStorage.setItem("streaming_enabled", (!streamingEnabled).toString());
    window.location.reload();
  };

  const handleSaveAudio = async () => {
    try {
      const buffer = await invoke<number[]>("get_audio_data");
      if (buffer && buffer.length > 0) {
        const path = await invoke<string>("save_audio_debug", {
          buffer: Array.from(buffer),
          sampleRate,
        });
        addMessage("system", `Аудио сохранено в:\n${path}`);
      } else {
        addMessage("system", "Нет аудио данных для сохранения");
      }
    } catch (error) {
      addMessage("system", `Ошибка сохранения: ${error}`);
    }
  };

  return (
    <div className="app-actions">
      <button
        onClick={handleToggleAnalysis}
        className={`btn ${analysisEnabled ? "btn-success" : "btn-warning"}`}
        title={
          analysisEnabled
            ? "Анализ включен. Нажмите, чтобы отключить отправку в ChatGPT"
            : "Анализ отключен. Нажмите, чтобы включить отправку в ChatGPT"
        }
      >
        {analysisEnabled ? "🤖 Анализ ВКЛ" : "⏸️ Анализ ВЫКЛ"}
      </button>

      <button
        onClick={onToggleRealtime}
        className={`btn ${realtimeEnabled ? "btn-success" : "btn-secondary"}`}
        title={
          realtimeEnabled
            ? `Realtime API активен (${realtimeStatus}). Нажмите, чтобы вернуться в Batch-режим`
            : "Включить Realtime API — низкая задержка, встроенный VAD"
        }
      >
        {realtimeEnabled ? `⚡ Realtime (${realtimeStatus})` : "💤 Batch mode"}
      </button>

      <button
        onClick={handleSaveAudio}
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
        onClick={handleToggleStreaming}
        className={`btn ${streamingEnabled ? "btn-success" : "btn-secondary"}`}
        title={
          streamingEnabled
            ? "Streaming включен (ответ появляется постепенно)"
            : "Streaming выключен (ответ появляется целиком)"
        }
      >
        {streamingEnabled ? "⚡ Stream ВКЛ" : "📄 Stream ВЫКЛ"}
      </button>

      <button
        onClick={clearMessages}
        className="btn btn-secondary"
        disabled={messages.length === 0}
        title={messages.length === 0 ? "Нет сообщений для очистки" : "Очистить историю"}
      >
        🗑️ Очистить чат
      </button>

      <button onClick={onOpenSettings} className="btn btn-secondary">
        ⚙️ Настройки
      </button>
    </div>
  );
}
