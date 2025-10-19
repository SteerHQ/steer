import React from 'react';
import { useAppStore } from './store';

function App() {
  // Access state from the store
  const { 
    isCapturing, 
    isProcessing, 
    apiKeyConfigured, 
    audioDeviceConnected 
  } = useAppStore();

  // Main application logic will be implemented in task 11
  return (
    <div>
      <h1>Voice Assistant Overlay</h1>
      <p>Application initialization in progress...</p>
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>State Management Ready:</p>
        <ul>
          <li>Capturing: {isCapturing ? 'Yes' : 'No'}</li>
          <li>Processing: {isProcessing ? 'Yes' : 'No'}</li>
          <li>API Key Configured: {apiKeyConfigured ? 'Yes' : 'No'}</li>
          <li>Audio Device Connected: {audioDeviceConnected ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
