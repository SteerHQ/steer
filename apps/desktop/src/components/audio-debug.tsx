import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./audio-debug.css";

interface AudioDevice {
  name: string;
  type: "input" | "output" | "loopback";
}

export function AudioDebug() {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [bufferSize, setBufferSize] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisEnabled, setAnalysisEnabled] = useState(false);

  // Добавить лог
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-20));
  };

  // Загрузить список устройств
  const loadDevices = async () => {
    try {
      addLog("Загрузка списка аудио устройств...");
      const deviceList = await invoke<string[]>("get_audio_devices");
      setDevices(deviceList);
      addLog(`Найдено устройств: ${deviceList.length}`);
      setError(null);
    } catch (err) {
      const errorMsg = `Ошибка загрузки устройств: ${err}`;
      addLog(errorMsg);
      setError(errorMsg);
    }
  };

  // Запустить захват
  const startCapture = async () => {
    if (!selectedDevice) {
      setError("Выберите устройство");
      return;
    }

    try {
      addLog(`Запуск захвата с устройства: ${selectedDevice}`);

      // Очистить имя устройства от суффиксов
      const cleanDeviceName = selectedDevice
        .replace(" (Input)", "")
        .replace(" (Output)", "")
        .replace(" (Output/Loopback)", "")
        .trim();

      addLog(`Очищенное имя устройства: ${cleanDeviceName}`);

      await invoke("start_audio_capture", { deviceName: cleanDeviceName });
      setIsCapturing(true);
      addLog("Захват запущен успешно");
      setError(null);
    } catch (err) {
      const errorMsg = `Ошибка запуска захвата: ${err}`;
      addLog(errorMsg);
      setError(errorMsg);

      // Если устройство не найдено, показать доступные устройства
      if (String(err).includes("not found")) {
        addLog("Попробуйте выбрать другое устройство из списка");
        addLog("Доступные устройства:");
        devices.forEach((device) => {
          addLog(`  - ${device}`);
        });
      }
    }
  };

  // Остановить захват
  const stopCapture = async () => {
    try {
      addLog("Остановка захвата...");
      await invoke("stop_audio_capture");
      setIsCapturing(false);
      setAudioLevel(0);
      addLog("Захват остановлен");
      setError(null);
    } catch (err) {
      const errorMsg = `Ошибка остановки захвата: ${err}`;
      addLog(errorMsg);
      setError(errorMsg);
    }
  };

  // Получить данные из буфера
  const getBufferData = async () => {
    try {
      const buffer = await invoke<number[]>("get_audio_data");
      setBufferSize(buffer.length);
      addLog(
        `Размер буфера: ${buffer.length} байт (${(buffer.length / 1024).toFixed(2)} KB)`
      );

      if (buffer.length > 0) {
        addLog(`Первые 10 байт: [${buffer.slice(0, 10).join(", ")}]`);
      }

      return buffer;
    } catch (err) {
      addLog(`Ошибка получения буфера: ${err}`);
      return [];
    }
  };

  // Сохранить аудио для отладки
  const saveDebugAudio = async () => {
    try {
      addLog("Получение аудио данных...");
      const buffer = await getBufferData();

      if (buffer.length === 0) {
        addLog("Буфер пуст, нечего сохранять");
        return;
      }

      addLog("Сохранение аудио в WAV файл...");
      const path = await invoke<string>("save_audio_debug", {
        buffer,
        sampleRate: 48000,
      });

      addLog(`Аудио сохранено: ${path}`);
      setError(null);
    } catch (err) {
      const errorMsg = `Ошибка сохранения аудио: ${err}`;
      addLog(errorMsg);
      setError(errorMsg);
    }
  };

  // Мониторинг уровня аудио (БЕЗ очистки буфера)
  useEffect(() => {
    if (!isCapturing) return;

    const interval = setInterval(async () => {
      try {
        const level = await invoke<number>("get_audio_level");
        setAudioLevel(level);

        // Получаем размер буфера без очистки
        const status = await invoke<{ size: number }>("get_buffer_size");
        setBufferSize(status.size);
      } catch (err) {
        // Fallback: если команда не существует, используем старый метод
        try {
          const buffer = await invoke<number[]>("get_audio_data");
          setBufferSize(buffer.length);
        } catch {
          console.error("Ошибка мониторинга:", err);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isCapturing]);

  // Загрузить устройства при монтировании
  useEffect(() => {
    loadDevices();
  }, []);

  // Переключить анализ разговоров
  const toggleAnalysis = () => {
    const newState = !analysisEnabled;
    setAnalysisEnabled(newState);
    localStorage.setItem("analysis_enabled", newState.toString());
    addLog(
      newState
        ? "✅ Анализ разговоров ВКЛЮЧЕН (отправка в ChatGPT)"
        : "⏸️ Анализ разговоров ОТКЛЮЧЕН (только запись)"
    );
  };

  // Загрузить состояние анализа при монтировании
  useEffect(() => {
    const saved = localStorage.getItem("analysis_enabled");
    if (saved !== null) {
      setAnalysisEnabled(saved === "true");
    }
  }, []);

  return (
    <div className="audio-debug">
      <div className="debug-header">
        <h2>🔧 Отладка аудио записи</h2>

        <button
          onClick={toggleAnalysis}
          className={`analysis-toggle ${analysisEnabled ? "enabled" : "disabled"}`}
          title={
            analysisEnabled
              ? "Нажмите, чтобы отключить отправку в ChatGPT"
              : "Нажмите, чтобы включить отправку в ChatGPT"
          }
        >
          {analysisEnabled ? (
            <>
              <span className="toggle-icon">🤖</span>
              <span className="toggle-text">Анализ ВКЛЮЧЕН</span>
            </>
          ) : (
            <>
              <span className="toggle-icon">⏸️</span>
              <span className="toggle-text">Анализ ОТКЛЮЧЕН</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="debug-error">
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {!analysisEnabled && (
        <div className="debug-warning">
          <strong>⚠️ Режим тестирования:</strong> Аудио записывается, но НЕ
          отправляется в ChatGPT
        </div>
      )}

      {analysisEnabled && (
        <div className="debug-success">
          <strong>✅ Рабочий режим:</strong> Аудио записывается и анализируется
          через ChatGPT
        </div>
      )}

      <div className="debug-section">
        <h3>Устройства</h3>

        <div className="device-warning">
          ⚠️ <strong>ВАЖНО:</strong>
          <br />• Для захвата <strong>системного звука</strong> (музыка, видео)
          → <strong>(Output/Loopback)</strong>
          <br />• Для захвата <strong>с микрофона</strong> (ваш голос) →{" "}
          <strong>(Input)</strong>
        </div>

        <button onClick={loadDevices} className="debug-button">
          🔄 Обновить список
        </button>

        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="debug-select"
          disabled={isCapturing}
        >
          <option value="">Выберите устройство</option>
          {devices.map((device) => {
            const isLoopback = device.includes("(Output/Loopback)");
            const isInput = device.includes("(Input)") && !isLoopback;

            return (
              <option
                key={device}
                value={device}
                style={{
                  fontWeight: isLoopback ? "bold" : "normal",
                  color: isLoopback ? "#28a745" : isInput ? "#dc3545" : "#333",
                }}
              >
                {isLoopback ? "✅ " : isInput ? "❌ " : ""}
                {device}
              </option>
            );
          })}
        </select>

        <div className="debug-info">Найдено устройств: {devices.length}</div>

        {selectedDevice &&
          selectedDevice.includes("(Input)") &&
          !selectedDevice.includes("(Output/Loopback)") && (
            <div className="device-info-box">
              🎤 <strong>УСТРОЙСТВО ДЛЯ МИКРОФОНА</strong>
              <br />
              Это устройство захватывает звук, который{" "}
              <strong>записывается</strong> в VB Cable.
              <br />
              Используйте для записи голоса с микрофона.
            </div>
          )}

        {selectedDevice && selectedDevice.includes("(Output/Loopback)") && (
          <div className="device-success">
            🔊 <strong>УСТРОЙСТВО ДЛЯ СИСТЕМНОГО ЗВУКА</strong>
            <br />
            Это устройство захватывает звук, который{" "}
            <strong>воспроизводится</strong> из VB Cable.
            <br />
            Используйте для записи музыки, видео, разговоров.
          </div>
        )}
      </div>

      <div className="debug-section">
        <h3>Управление захватом</h3>
        <div className="debug-controls">
          {!isCapturing ? (
            <button
              onClick={startCapture}
              className="debug-button debug-button-start"
              disabled={!selectedDevice}
            >
              ▶️ Начать захват
            </button>
          ) : (
            <button
              onClick={stopCapture}
              className="debug-button debug-button-stop"
            >
              ⏹️ Остановить захват
            </button>
          )}

          <button
            onClick={getBufferData}
            className="debug-button"
            disabled={!isCapturing}
          >
            📊 Проверить буфер
          </button>

          <button
            onClick={saveDebugAudio}
            className="debug-button"
            disabled={!isCapturing}
          >
            💾 Сохранить WAV
          </button>
        </div>
      </div>

      <div className="debug-section">
        <h3>Статус</h3>
        <div className="debug-stats">
          <div className="stat-item">
            <span className="stat-label">Статус:</span>
            <span className={`stat-value ${isCapturing ? "active" : ""}`}>
              {isCapturing ? "🔴 Запись" : "⚪ Остановлено"}
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Размер буфера:</span>
            <span className="stat-value">
              {bufferSize} байт ({(bufferSize / 1024).toFixed(2)} KB)
            </span>
          </div>

          <div className="stat-item">
            <span className="stat-label">Уровень аудио:</span>
            <span className="stat-value">{(audioLevel * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="audio-level-bar">
          <div
            className="audio-level-fill"
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      </div>

      <div className="debug-section">
        <h3>Логи</h3>
        <div className="debug-logs">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="debug-section">
        <h3>Инструкции по тестированию</h3>
        <ol className="debug-instructions">
          <li>Выберите аудио устройство из списка (например, VB-Cable)</li>
          <li>Нажмите "Начать захват" для запуска записи</li>
          <li>Воспроизведите звук через выбранное устройство</li>
          <li>Наблюдайте за уровнем аудио и размером буфера</li>
          <li>Нажмите "Сохранить WAV" для сохранения записи</li>
          <li>
            Проверьте сохраненный файл в папке Документы/VoiceAssistant/debug
          </li>
          <li>Используйте analyze-audio.ps1 для анализа записи</li>
        </ol>
        <div className="debug-note">
          ℹ️ Режим тестирования: аудио НЕ отправляется в ChatGPT
        </div>
      </div>
    </div>
  );
}
