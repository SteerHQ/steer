import './status-indicator.css';

type Status = 'capturing' | 'processing' | 'idle' | 'error';

interface StatusIndicatorProps {
  status: Status;
  audioDeviceConnected: boolean;
  apiKeyConfigured: boolean;
  errorMessage?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  audioDeviceConnected,
  apiKeyConfigured,
  errorMessage
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'capturing':
        return {
          icon: '🎤',
          text: 'Захват аудио...',
          className: 'status-capturing'
        };
      case 'processing':
        return {
          icon: '⚙️',
          text: 'Обработка...',
          className: 'status-processing'
        };
      case 'error':
        return {
          icon: '❌',
          text: errorMessage || 'Ошибка',
          className: 'status-error'
        };
      case 'idle':
      default:
        return {
          icon: '✓',
          text: 'Готов',
          className: 'status-idle'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="status-indicator">
      <div className={`status-main ${statusInfo.className}`}>
        <span className="status-icon">{statusInfo.icon}</span>
        <span className="status-text">{statusInfo.text}</span>
      </div>

      <div className="status-details">
        <div className={`status-item ${audioDeviceConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span className="status-label">
            {audioDeviceConnected ? 'VB-Cable подключен' : 'VB-Cable не найден'}
          </span>
        </div>

        <div className={`status-item ${apiKeyConfigured ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          <span className="status-label">
            {apiKeyConfigured ? 'API ключ настроен' : 'API ключ не настроен'}
          </span>
        </div>
      </div>
    </div>
  );
};
