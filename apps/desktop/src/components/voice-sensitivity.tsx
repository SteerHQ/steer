import { useState, useEffect } from "react";
import "./voice-sensitivity.css";

interface VoiceSensitivityProps {
  currentLevel?: number;
}

export const VoiceSensitivity: React.FC<VoiceSensitivityProps> = ({
  currentLevel = 0,
}) => {
  const [threshold, setThreshold] = useState(() => {
    const saved = localStorage.getItem("voice_threshold");
    return saved ? parseFloat(saved) : 0.02;
  });

  useEffect(() => {
    localStorage.setItem("voice_threshold", threshold.toString());
  }, [threshold]);

  const getThresholdLabel = (value: number): string => {
    if (value < 0.01) return "Очень низкий (захватывает всё)";
    if (value < 0.02) return "Низкий (чувствительный)";
    if (value < 0.05) return "Средний (рекомендуется)";
    if (value < 0.1) return "Высокий (только громкая речь)";
    return "Очень высокий (только крики)";
  };

  const isVoiceDetected = currentLevel >= threshold;

  return (
    <div className="voice-sensitivity">
      <div className="sensitivity-header">
        <span className="sensitivity-label">🎚️ Чувствительность голоса</span>
        <span className={`voice-indicator ${isVoiceDetected ? "active" : ""}`}>
          {isVoiceDetected ? "🎤 Голос обнаружен" : "⏸️ Тишина"}
        </span>
      </div>

      <div className="sensitivity-controls">
        <input
          type="range"
          min="0.005"
          max="0.15"
          step="0.005"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="sensitivity-slider"
        />
        <div className="sensitivity-info">
          <span className="threshold-value">
            Порог: {(threshold * 100).toFixed(1)}%
          </span>
          <span className="threshold-label">
            {getThresholdLabel(threshold)}
          </span>
        </div>
      </div>

      <div className="level-meter">
        <div className="level-label">Текущий уровень:</div>
        <div className="level-bar-container">
          <div
            className={`level-bar ${isVoiceDetected ? "active" : ""}`}
            style={{ width: `${Math.min(currentLevel * 500, 100)}%` }}
          />
          <div
            className="threshold-marker"
            style={{ left: `${Math.min(threshold * 500, 100)}%` }}
          />
        </div>
        <div className="level-value">{(currentLevel * 100).toFixed(2)}%</div>
      </div>

      <div className="sensitivity-hint">
        💡 Если система не реагирует на вопросы - уменьшите порог.
        Если обрабатывает тишину - увеличьте порог.
      </div>
    </div>
  );
};
