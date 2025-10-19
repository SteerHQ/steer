import React from 'react';

export interface StatusIndicatorProps {
  status: 'capturing' | 'processing' | 'idle' | 'error';
  vbCableConnected: boolean;
  apiKeyConfigured: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = () => {
  // Component implementation will be added in task 9.3
  return null;
};
