import React from 'react';
import type { ErrorResponse } from '@steer/types';
import './error-display.css';

interface ErrorDisplayProps {
  error: ErrorResponse;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
}) => {
  const getErrorIcon = () => {
    switch (error.code) {
      case 'DEVICE_NOT_FOUND':
        return '🎤';
      case 'API_ERROR':
      case 'OPENAI_ERROR':
        return '🔑';
      case 'NETWORK_ERROR':
        return '🌐';
      default:
        return '⚠️';
    }
  };

  const getErrorTitle = () => {
    switch (error.code) {
      case 'DEVICE_NOT_FOUND':
        return 'Аудиоустройство не найдено';
      case 'API_ERROR':
      case 'OPENAI_ERROR':
        return 'Ошибка API';
      case 'NETWORK_ERROR':
        return 'Ошибка сети';
      default:
        return 'Ошибка';
    }
  };

  return (
    <div className="error-display">
      <div className="error-icon">{getErrorIcon()}</div>
      <div className="error-content">
        <h3 className="error-title">{getErrorTitle()}</h3>
        <p className="error-message">{error.error}</p>
      </div>
      <div className="error-actions">
        {error.retryable && onRetry && (
          <button onClick={onRetry} className="btn btn-primary btn-sm">
            Повторить
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="btn btn-secondary btn-sm">
            Закрыть
          </button>
        )}
      </div>
    </div>
  );
};
