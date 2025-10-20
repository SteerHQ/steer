# Implementation Plan

- [x] 1. Инициализация monorepo структуры и базовой конфигурации

  - Создать Turborepo структуру с apps/ и packages/ директориями
  - Настроить Bun.js как package manager
  - Создать базовые package.json файлы для всех workspace packages
  - Настроить TypeScript конфигурацию для shared types
  - _Requirements: 7.4, 7.5_

- [x] 2. Настройка Tauri desktop приложения

  - Инициализировать Tauri проект в apps/desktop
  - Настроить tauri.conf.json с overlay window конфигурацией (alwaysOnTop, transparent, skipTaskbar)
  - Создать базовую Rust структуру в src-tauri/
  - Настроить Vite для React frontend
  - _Requirements: 7.1, 4.1_

- [x] 3. Реализация Audio Capture Module в Rust

- [x] 3.1 Создать audio capture модуль с cpal

  - Написать AudioCapture struct с методами new(), start_capture(), stop_capture()
  - Реализовать thread-safe buffer с Arc<Mutex<Vec<u8>>>
  - Добавить логику определения VB-Cable устройства по имени
  - Настроить audio stream с параметрами 16kHz, 16-bit PCM, mono

  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3.2 Создать Tauri commands для audio capture

  - Реализовать #[tauri::command] start_audio_capture()
  - Реализовать #[tauri::command] get_audio_data() для извлечения буфера
  - Реализовать #[tauri::command] stop_audio_capture()
  - Добавить error handling для случая отсутствия VB-Cable
  - _Requirements: 1.1, 1.4, 1.5_

- [ ] 4. Реализация Secure Storage для API ключей
- [ ] 4.1 Создать secure storage модуль в Rust

  - Интегрировать Windows Credential Manager через windows-rs crate
  - Реализовать AES-256-GCM шифрование для дополнительной защиты
  - Создать fallback механизм с зашифрованным файлом в %APPDATA%
  - _Requirements: 8.2_

- [ ] 4.2 Создать Tauri commands для работы с API ключами

  - Реализовать #[tauri::command] store_api_key(key: String)
  - Реализовать #[tauri::command] get_api_key()
  - Добавить валидацию формата API ключа
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 5. Настройка HonoJS backend API

  - Создать HonoJS приложение в apps/api
  - Настроить базовые routes: /api/audio/process, /api/transcribe, /api/generate
  - Создать middleware для error handling
  - Настроить CORS для локального взаимодействия с Tauri
  - _Requirements: 7.3_

- [x] 6. Реализация Audio Processing Service

- [x] 6.1 Создать AudioProcessor класс

  - Реализовать метод processAudioBuffer() для обработки Uint8Array
  - Реализовать метод convertToWav() для конвертации PCM в WAV формат
  - Добавить валидацию минимальной длительности аудио (2 секунды)
  - _Requirements: 2.1_

- [x] 6.2 Создать API endpoint для обработки аудио

  - Реализовать POST /api/audio/process endpoint
  - Добавить валидацию входных данных
  - Вернуть обработанный audio blob
  - _Requirements: 2.1_

- [x] 7. Реализация OpenAI Integration Service

- [x] 7.1 Создать OpenAIService класс

  - Реализовать конструктор с API key параметром
  - Настроить HTTP client для OpenAI API с timeout (30s для Whisper, 15s для GPT)
  - Добавить retry logic с exponential backoff (максимум 2 попытки)
  - _Requirements: 2.4, 3.4_

- [x] 7.2 Реализовать метод transcribeAudio()

  - Создать FormData с audio blob для Whisper API
  - Настроить параметры: model=whisper-1, language=ru
  - Обработать ответ и вернуть TranscriptionResult
  - Добавить error handling для API ошибок
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 7.3 Реализовать метод generateResponse()

  - Создать запрос к GPT-4o API с system prompt "Отвечай коротко, по-русски, давай технический ответ"
  - Настроить параметры: model=gpt-4o, max_tokens=150, temperature=0.7
  - Обработать ответ и вернуть текст
  - Добавить error handling
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 7.4 Создать API endpoints для OpenAI интеграции

  - Реализовать POST /api/transcribe endpoint
  - Реализовать POST /api/generate endpoint
  - Добавить валидацию API key в headers
  - _Requirements: 2.3, 3.3_

- [x] 8. Создание shared types package

  - Создать TypeScript interfaces в packages/types: AudioBuffer, AudioMetadata, WhisperResponse, GPTResponse, ErrorResponse, AppState, AppConfig
  - Экспортировать все types из index.ts
  - Настроить TypeScript path aliases для удобного импорта
  - _Requirements: 7.2_

- [x] 9. Реализация React UI components

- [x] 9.1 Создать OverlayWindow component

  - Реализовать React component с props: message, visible, autoHideDuration
  - Добавить useEffect hook для auto-hide через 10 секунд
  - Применить стили: position fixed, bottom-right, transparent background
  - Добавить поддержку UTF-8 для русского текста
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 9.2 Создать Settings component

  - Реализовать форму для ввода API ключа
  - Добавить dropdown для выбора audio device
  - Добавить настройки overlay position и auto-hide duration
  - Реализовать onSave callback для сохранения конфигурации
  - _Requirements: 8.1, 8.3_

- [x] 9.3 Создать StatusIndicator component

  - Отображать текущий статус: capturing, processing, idle, error
  - Показывать индикатор подключения к VB-Cable
  - Показывать индикатор настройки API key
  - _Requirements: 1.4, 8.4_

- [x] 10. Реализация application state management

  - Создать AppState interface и initial state
  - Настроить React Context или Zustand для state management
  - Реализовать actions для обновления state: startCapture, stopCapture, setTranscript, setResponse, showOverlay, hideOverlay
  - Добавить error state management
  - _Requirements: 1.1, 2.3, 3.3, 4.4_

- [x] 11. Интеграция всех компонентов в main application flow

- [x] 11.1 Создать главный App component

  - Инициализировать state management
  - Проверить наличие API key при запуске
  - Отобразить Settings если API key не настроен
  - Запустить audio capture если всё настроено
  - _Requirements: 8.1_

- [x] 11.2 Реализовать audio processing pipeline

  - При получении audio data из Tauri вызвать /api/audio/process
  - Отправить обработанное аудио в /api/transcribe
  - При получении транскрипции отправить в /api/generate
  - Отобразить ответ в OverlayWindow
  - Очистить audio buffer после обработки

  - _Requirements: 1.5, 2.1, 2.3, 3.1, 3.3, 4.3_

- [x] 11.3 Добавить error handling в UI

  - Отображать ошибки VB-Cable connection в StatusIndicator
  - Показывать API errors в OverlayWindow
  - Добавить retry UI для recoverable errors
  - _Requirements: 1.4, 2.4, 3.4_

- [x] 12. Настройка MSI installer

  - Настроить tauri.conf.json для MSI bundler
  - Создать WiX template для русской локализации
  - Настроить installer для установки в Program Files
  - Добавить создание ярлыка в меню Пуск
  - _Requirements: 6.4, 6.5_

- [x] 13. Оптимизация размера приложения

  - Настроить Rust build с strip=true, lto=true, opt-level="z"
  - Включить Vite tree-shaking и code splitting
  - Минимизировать external dependencies
  - Проверить финальный размер MSI ≤ 20MB
  - _Requirements: 6.1_

- [ ] 14. Реализация logging системы

  - Создать logger module в Rust для записи в %APPDATA%/VoiceAssistant/logs/
  - Настроить log rotation (максимум 5 файлов по 10MB)
  - Добавить минимальное логирование без telemetry
  - Убедиться что логи остаются локально
  - _Requirements: 5.5_

- [ ] 15. Финальная интеграция и проверка требований
  - Проверить что аудио хранится только в RAM и не записывается на диск
  - Проверить что данные отправляются только в OpenAI API
  - Проверить работу на Windows 10 (1809+) и Windows 11
  - Проверить overlay window positioning и auto-hide
  - Проверить шифрование API ключей
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.2, 6.3_
