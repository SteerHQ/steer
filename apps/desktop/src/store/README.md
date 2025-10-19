# Application State Management

This directory contains the Zustand-based state management for the Voice Assistant application.

## Store Structure

The `useAppStore` hook provides access to the application state and actions.

### State Properties

- `isCapturing`: Boolean indicating if audio capture is active
- `isProcessing`: Boolean indicating if audio is being processed
- `currentTranscript`: Current transcript from Whisper API (or null)
- `currentResponse`: Current response from GPT-4o API (or null)
- `overlayVisible`: Boolean indicating if overlay window is visible
- `apiKeyConfigured`: Boolean indicating if OpenAI API key is configured
- `audioDeviceConnected`: Boolean indicating if VB-Cable is connected
- `error`: Current error state (or null)

### Actions

- `startCapture()`: Start audio capture
- `stopCapture()`: Stop audio capture
- `setTranscript(transcript: string)`: Set the current transcript
- `setResponse(response: string)`: Set the current response and show overlay
- `showOverlay()`: Show the overlay window
- `hideOverlay()`: Hide the overlay window
- `setError(error: ErrorResponse | null)`: Set error state
- `setProcessing(isProcessing: boolean)`: Set processing state
- `setApiKeyConfigured(configured: boolean)`: Set API key configuration status
- `setAudioDeviceConnected(connected: boolean)`: Set audio device connection status
- `clearTranscriptAndResponse()`: Clear transcript and response
- `reset()`: Reset to initial state

## Usage Example

```typescript
import { useAppStore } from './store';

function MyComponent() {
  // Access state
  const isCapturing = useAppStore((state) => state.isCapturing);
  const error = useAppStore((state) => state.error);
  
  // Access actions
  const startCapture = useAppStore((state) => state.startCapture);
  const setError = useAppStore((state) => state.setError);
  
  // Or access multiple values
  const { isProcessing, currentResponse, showOverlay } = useAppStore();
  
  return (
    <div>
      <button onClick={startCapture}>Start Capture</button>
      {error && <div>Error: {error.error}</div>}
    </div>
  );
}
```

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 1.1**: State management for audio capture (isCapturing, startCapture, stopCapture)
- **Requirement 2.3**: State management for transcription (currentTranscript, setTranscript)
- **Requirement 3.3**: State management for GPT response (currentResponse, setResponse)
- **Requirement 4.4**: State management for overlay visibility (overlayVisible, showOverlay, hideOverlay)
