import { useState } from 'react';
import type { AssistantMode } from '@steer/types';
import './interview-mode.css';

interface InterviewModeProps {
  currentMode: AssistantMode;
  onModeChange: (mode: AssistantMode) => void;
  onClearHistory: () => void;
  historyCount: number;
}

export function InterviewMode({
  currentMode,
  onModeChange,
  onClearHistory,
  historyCount,
}: InterviewModeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const modes: Array<{ value: AssistantMode; label: string; icon: string; description: string }> = [
    {
      value: 'general',
      label: 'Общий',
      icon: '💬',
      description: 'Обычный режим для любых вопросов',
    },
    {
      value: 'interview',
      label: 'Собеседование',
      icon: '🎯',
      description: 'Краткие технические ответы с контекстом',
    },
    {
      value: 'algorithm',
      label: 'Алгоритмы',
      icon: '🧮',
      description: 'Помощь с алгоритмическими задачами',
    },
    {
      value: 'cheatsheet',
      label: 'Шпаргалка',
      icon: '📝',
      description: 'Быстрые факты и определения',
    },
  ];

  const currentModeData = modes.find((m) => m.value === currentMode);

  return (
    <div className="interview-mode">
      <button
        className="mode-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Выбрать режим"
      >
        <span className="mode-icon">{currentModeData?.icon}</span>
        <span className="mode-label">{currentModeData?.label}</span>
        <span className="mode-arrow">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="mode-dropdown">
          {modes.map((mode) => (
            <button
              key={mode.value}
              className={`mode-option ${currentMode === mode.value ? 'active' : ''}`}
              onClick={() => {
                onModeChange(mode.value);
                setIsExpanded(false);
              }}
            >
              <span className="mode-icon">{mode.icon}</span>
              <div className="mode-info">
                <div className="mode-name">{mode.label}</div>
                <div className="mode-desc">{mode.description}</div>
              </div>
            </button>
          ))}

          {currentMode === 'interview' && historyCount > 0 && (
            <div className="mode-actions">
              <button
                className="clear-history-btn"
                onClick={() => {
                  onClearHistory();
                  setIsExpanded(false);
                }}
              >
                🗑️ Очистить историю ({historyCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
