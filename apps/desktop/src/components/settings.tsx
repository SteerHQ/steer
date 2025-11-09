import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig } from "@steer/types";
import { WindowControls } from "./window-controls";
import "./settings.css";

interface SettingsProps {
  initialConfig?: Partial<AppConfig>;
  onSave: (config: AppConfig) => void;
  onCancel?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  initialConfig,
  onSave,
  onCancel,
}) => {
  const [audioDevice, setAudioDevice] = useState(
    initialConfig?.audioDevice || "WASAPI Loopback"
  );
  const [overlayPosition, setOverlayPosition] = useState<
    AppConfig["overlayPosition"]
  >(initialConfig?.overlayPosition || "bottom-right");
  const [autoHideDuration, setAutoHideDuration] = useState(
    initialConfig?.autoHideDuration || 10000
  );
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  useEffect(() => {
    loadAudioDevices();
  }, []);

  const loadAudioDevices = async () => {
    try {
      setLoadingDevices(true);
      const devices = await invoke<string[]>("get_audio_devices");
      setAudioDevices(devices);
      console.log("Available audio devices:", devices);
    } catch (error) {
      console.error("Failed to load audio devices:", error);
      setAudioDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config: AppConfig = {
      apiKey: '', // Not needed anymore, server handles it
      audioDevice,
      overlayPosition,
      autoHideDuration,
      defaultMode: 'interview',
      interviewSettings: {
        saveHistory: true,
        maxHistoryItems: 10,
        showConfidence: false,
      },
    };

    onSave(config);
  };

  const isValid = true; // Always valid now

  return (
    <div className="settings-container">
      <WindowControls />
      <div className="settings-card">
        <h2 className="settings-title">Настройки</h2>

        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="audioDevice" className="form-label">
              Аудиоустройство
            </label>
            <select
              id="audioDevice"
              value={audioDevice}
              onChange={(e) => setAudioDevice(e.target.value)}
              className="form-select"
              disabled={loadingDevices}
            >
              {loadingDevices ? (
                <option value="">Загрузка устройств...</option>
              ) : audioDevices.length > 0 ? (
                audioDevices.map((device) => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))
              ) : (
                <option value="">Устройства не найдены</option>
              )}
            </select>
            <small className="form-hint">
              {audioDevices.length > 0
                ? `Найдено устройств: ${audioDevices.length}`
                : "Используется WASAPI Loopback для захвата системного аудио"}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="overlayPosition" className="form-label">
              Позиция overlay
            </label>
            <select
              id="overlayPosition"
              value={overlayPosition}
              onChange={(e) =>
                setOverlayPosition(
                  e.target.value as AppConfig["overlayPosition"]
                )
              }
              className="form-select"
            >
              <option value="bottom-right">Правый нижний угол</option>
              <option value="bottom-left">Левый нижний угол</option>
              <option value="top-right">Правый верхний угол</option>
              <option value="top-left">Левый верхний угол</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="autoHideDuration" className="form-label">
              Автоскрытие через (секунд)
            </label>
            <input
              id="autoHideDuration"
              type="number"
              min="3"
              max="60"
              step="1"
              value={autoHideDuration / 1000}
              onChange={(e) =>
                setAutoHideDuration(Number(e.target.value) * 1000)
              }
              className="form-input"
            />
            <small className="form-hint">
              Overlay будет автоматически скрываться через указанное время
            </small>
          </div>

          <div className="form-actions">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              disabled={!isValid}
              className="btn btn-primary"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
