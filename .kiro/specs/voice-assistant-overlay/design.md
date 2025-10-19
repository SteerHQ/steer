# Design Document

## Overview

VoiceAssistant — это desktop-приложение для Windows, построенное на Tauri framework с React-TypeScript frontend и HonoJS backend. Архитектура разделена на три основных слоя: UI (React), Backend API (HonoJS), и Native Layer (Tauri Rust). Приложение захватывает системное аудио через VB-Cable, обрабатывает его в памяти, отправляет в OpenAI Whisper для транскрипции, получает ответ от GPT-4o и отображает результат в overlay-окне.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VoiceAssistant App                       │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (React + TypeScript)                              │
│  ├─ OverlayWindow Component                                 │
│  ├─ Settings Component                                      │
│  └─ Status Indicator Component                              │
├─────────────────────────────────────────────────────────────┤
│  Backend API Layer (HonoJS)                                 │
│  ├─ Audio Processing Service                               │
│  ├─ OpenAI Integration Service                             │
│  └─ Configuration Service                                   │
├─────────────────────────────────────────────────────────────┤
│  Native Layer (Tauri Rust)                                  │
│  ├─ Audio Capture Module (VB-Cable)                        │
│  ├─ Secure Storage Module                                  │
│  └─ Window Management Module                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   VB-Cable Device    OpenAI Whisper API    OpenAI GPT-4o API
```

### Technology Stack

- **Frontend**: React 18+ with TypeScript, Vite для сборки
- **Backend**: HonoJS (lightweight web framework)
- **Desktop Framework**: Tauri 1.5+
- **Package Manager**: Bun.js
- **Monorepo**: Turborepo
- **Audio Processing**: Web Audio API + Tauri audio plugins
- **Build**: MSI через tauri-bundler

### Monorepo Structure

```
voice-assistant-overlay/
├── apps/
│   ├── desktop/          # Tauri app
│   │   ├── src/
│   │   ├── src-tauri/    # Rust backend
│   │   └── package.json
│   └── api/              # HonoJS backend
│       ├── src/
│       └── package.json
├── packages/
│   ├── ui/               # Shared React components
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configs
├── turbo.json
├── package.json
└── bun.lockb
```

## Components and Interfaces

### 1. Audio Capture Module (Rust/Tauri)

**Responsibility**: Захват аудио с VB-Cable устройства

**Interface**:
```rust
// src-tauri/src/audio.rs
pub struct AudioCapture {
    device: Device,
    buffer: Arc<Mutex<Vec<u8>>>,
    sample_rate: u32,
}

impl AudioCapture {
    pub fn new(device_name: &str) -> Result<Self, AudioError>;
    pub fn start_capture(&mut self) -> Result<(), AudioError>;
    pub fn stop_capture(&mut self) -> Result<(), AudioError>;
    pub fn get_buffer(&self) -> Vec<u8>;
    pub fn clear_buffer(&mut self);
}

#[tauri::command]
async fn start_audio_capture() -> Result<String, String>;

#[tauri::command]
async fn get_audio_data() -> Result<Vec<u8>, String>;
```

**Dependencies**: 
- `cpal` crate для кроссплатформенного аудио
- `tokio` для async операций

**Key Design Decisions**:
- Использование `Arc<Mutex<Vec<u8>>>` для thread-safe доступа к буферу
- Буфер ограничен 10 секундами аудио (160KB при 16kHz mono)
- Автоматическая очистка буфера после извлечения данных

### 2. Audio Processing Service (HonoJS)

**Responsibility**: Обработка аудиоданных и конвертация в формат для Whisper API

**Interface**:
```typescript
// apps/api/src/services/audio-processor.ts
export class AudioProcessor {
  async processAudioBuffer(buffer: Uint8Array): Promise<Blob>;
  async convertToWav(buffer: Uint8Array): Promise<Blob>;
  validateAudioDuration(buffer: Uint8Array): boolean;
}

// apps/api/src/routes/audio.ts
app.post('/api/audio/process', async (c) => {
  const { buffer } = await c.req.json();
  // Process and return audio blob
});
```

**Key Design Decisions**:
- Конвертация PCM в WAV формат для совместимости с Whisper
- Валидация минимальной длительности (2 секунды)
- Использование Web Audio API для обработки в браузере

### 3. OpenAI Integration Service (HonoJS)

**Responsibility**: Взаимодействие с Whisper и GPT-4o APIs

**Interface**:
```typescript
// apps/api/src/services/openai-service.ts
export class OpenAIService {
  private apiKey: string;
  
  constructor(apiKey: string);
  
  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult>;
  async generateResponse(transcript: string): Promise<string>;
}

interface TranscriptionResult {
  text: string;
  language: string;
  duration: number;
}

// apps/api/src/routes/openai.ts
app.post('/api/transcribe', async (c) => {
  // Whisper API call
});

app.post('/api/generate', async (c) => {
  // GPT-4o API call
});
```

**API Configuration**:
- Whisper: `model: whisper-1`, `language: ru`
- GPT-4o: `model: gpt-4o`, `max_tokens: 150`, `temperature: 0.7`
- System prompt: "Отвечай коротко, по-русски, давай технический ответ"

**Error Handling**:
- Retry logic: максимум 2 попытки с exponential backoff (1s, 2s)
- Timeout: 30 секунд для Whisper, 15 секунд для GPT-4o

### 4. Overlay Window Component (React)

**Responsibility**: Отображение подсказок поверх всех окон

**Interface**:
```typescript
// packages/ui/src/components/OverlayWindow.tsx
interface OverlayWindowProps {
  message: string;
  visible: boolean;
  autoHideDuration?: number; // default: 10000ms
}

export const OverlayWindow: React.FC<OverlayWindowProps> = ({
  message,
  visible,
  autoHideDuration = 10000
}) => {
  // Component implementation
};
```

**Styling**:
```css
.overlay-window {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.85);
  color: #ffffff;
  padding: 16px 20px;
  border-radius: 8px;
  font-family: 'Segoe UI', sans-serif;
  font-size: 14px;
  max-width: 400px;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

**Tauri Window Configuration**:
```rust
// src-tauri/tauri.conf.json
{
  "tauri": {
    "windows": [{
      "label": "overlay",
      "alwaysOnTop": true,
      "decorations": false,
      "transparent": true,
      "skipTaskbar": true
    }]
  }
}
```

### 5. Configuration Service (HonoJS + Tauri)

**Responsibility**: Управление настройками и API ключами

**Interface**:
```typescript
// apps/api/src/services/config-service.ts
export class ConfigService {
  async getApiKey(): Promise<string | null>;
  async setApiKey(key: string): Promise<void>;
  async validateApiKey(key: string): Promise<boolean>;
}

// Tauri secure storage
#[tauri::command]
async fn store_api_key(key: String) -> Result<(), String>;

#[tauri::command]
async fn get_api_key() -> Result<String, String>;
```

**Storage Implementation**:
- Windows: использование Windows Credential Manager через `windows-rs` crate
- Encryption: AES-256-GCM для дополнительной защиты
- Fallback: зашифрованный файл в `%APPDATA%/VoiceAssistant/config.enc`

### 6. Settings Component (React)

**Responsibility**: UI для настройки приложения

**Interface**:
```typescript
// packages/ui/src/components/Settings.tsx
interface SettingsProps {
  onSave: (config: AppConfig) => void;
}

interface AppConfig {
  apiKey: string;
  audioDevice: string;
  overlayPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  autoHideDuration: number;
}

export const Settings: React.FC<SettingsProps>;
```

## Data Models

### Audio Data Flow

```typescript
// packages/types/src/audio.ts
export interface AudioBuffer {
  data: Uint8Array;
  sampleRate: number;
  channels: number;
  duration: number; // seconds
}

export interface AudioMetadata {
  format: 'pcm' | 'wav';
  bitDepth: 16;
  sampleRate: 16000 | 44100 | 48000;
}
```

### API Response Models

```typescript
// packages/types/src/api.ts
export interface WhisperResponse {
  text: string;
  language: string;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface GPTResponse {
  message: string;
  tokensUsed: number;
  model: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  retryable: boolean;
}
```

### Application State

```typescript
// apps/desktop/src/store/app-state.ts
export interface AppState {
  isCapturing: boolean;
  isProcessing: boolean;
  currentTranscript: string | null;
  currentResponse: string | null;
  overlayVisible: boolean;
  apiKeyConfigured: boolean;
  audioDeviceConnected: boolean;
  error: ErrorResponse | null;
}
```

## Error Handling

### Error Categories

1. **Audio Capture Errors**
   - VB-Cable not found → Display setup instructions
   - Audio device disconnected → Auto-retry every 5 seconds
   - Buffer overflow → Clear buffer and log warning

2. **API Errors**
   - Invalid API key → Prompt user to reconfigure
   - Rate limit exceeded → Display cooldown message
   - Network timeout → Retry with exponential backoff
   - Quota exceeded → Display billing message

3. **Processing Errors**
   - Audio too short → Ignore and continue capturing
   - Invalid audio format → Log error and skip
   - Transcription empty → Don't send to GPT-4o

### Error Handling Strategy

```typescript
// apps/api/src/middleware/error-handler.ts
export class ErrorHandler {
  static async handle(error: Error, context: Context): Promise<Response> {
    if (error instanceof OpenAIError) {
      return this.handleOpenAIError(error);
    }
    if (error instanceof AudioError) {
      return this.handleAudioError(error);
    }
    return this.handleGenericError(error);
  }
  
  private static handleOpenAIError(error: OpenAIError): Response {
    const retryable = error.status === 429 || error.status >= 500;
    return {
      error: error.message,
      code: error.code,
      retryable
    };
  }
}
```

### Logging Strategy

- **Development**: Console logs с полной информацией
- **Production**: Минимальное логирование в `%APPDATA%/VoiceAssistant/logs/`
- **No telemetry**: Логи остаются локально, не отправляются наружу
- **Log rotation**: Максимум 5 файлов по 10MB

## Testing Strategy

### Unit Tests

**Frontend (React)**:
- Component rendering tests с React Testing Library
- State management tests
- Hook tests для audio processing logic

**Backend (HonoJS)**:
- Service layer tests с mock OpenAI responses
- API endpoint tests
- Error handling tests

**Native (Rust)**:
- Audio capture module tests с mock devices
- Secure storage tests
- Window management tests

### Integration Tests

1. **Audio Pipeline Test**:
   - Mock VB-Cable → Capture → Process → Whisper API (mocked)
   - Verify buffer management and cleanup

2. **End-to-End Flow Test**:
   - Simulate audio input → Transcription → GPT response → Overlay display
   - Verify timing and auto-hide behavior

3. **API Integration Test**:
   - Real OpenAI API calls с test account
   - Verify request/response formats
   - Test error scenarios

### Manual Testing Checklist

- [ ] VB-Cable detection and connection
- [ ] Audio capture quality (16kHz, 16-bit)
- [ ] Whisper transcription accuracy (Russian)
- [ ] GPT-4o response quality and brevity
- [ ] Overlay positioning and visibility
- [ ] Auto-hide after 10 seconds
- [ ] API key configuration and encryption
- [ ] MSI installation on Windows 10/11
- [ ] Application size ≤ 20MB
- [ ] Memory usage during continuous operation
- [ ] No file creation (verify with Process Monitor)

## Build and Deployment

### Development Build

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build for production
bun run build
```

### Production Build (MSI)

```bash
# Build Tauri app with MSI bundler
cd apps/desktop
bun run tauri build --bundles msi

# Output: src-tauri/target/release/bundle/msi/VoiceAssistant_1.0.0_x64.msi
```

### MSI Configuration

```json
// apps/desktop/src-tauri/tauri.conf.json
{
  "tauri": {
    "bundle": {
      "identifier": "com.voiceassistant.app",
      "targets": ["msi"],
      "windows": {
        "wix": {
          "language": "ru-RU",
          "template": "wix/main.wxs"
        }
      }
    }
  }
}
```

### Size Optimization

- Rust: `strip = true`, `lto = true`, `opt-level = "z"`
- Frontend: Vite tree-shaking, code splitting
- Dependencies: Minimal external crates
- Target: ≤ 20MB final MSI size

## Security Considerations

1. **API Key Storage**: Windows Credential Manager + AES-256-GCM
2. **Memory Safety**: Rust для native layer предотвращает buffer overflows
3. **No Data Persistence**: Аудио только в RAM, автоматическая очистка
4. **HTTPS Only**: Все API calls через TLS 1.3
5. **No Telemetry**: Нет отправки данных кроме OpenAI API

## Performance Requirements

- **Audio Latency**: < 100ms от захвата до буфера
- **Transcription Time**: < 5 секунд для 10-секундного аудио
- **GPT Response Time**: < 3 секунды
- **Memory Usage**: < 150MB в idle, < 300MB при обработке
- **CPU Usage**: < 5% в idle, < 25% при обработке
- **Startup Time**: < 2 секунды до ready state
