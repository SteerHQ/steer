# Requirements Document

## Introduction

Данная система представляет собой Windows-утилиту для захвата системного аудио, распознавания русской речи и предоставления кратких технических ответов через overlay-интерфейс. Утилита работает с VB-Cable для захвата голоса собеседника, использует OpenAI Whisper API для распознавания речи и GPT-4o для генерации ответов. Система обеспечивает конфиденциальность данных, не сохраняя аудиофайлы локально и не передавая данные третьим сторонам (кроме OpenAI API).

## Glossary

- **VoiceAssistant**: Основная система Windows-утилиты для захвата аудио и предоставления голосовых подсказок
- **VB-Cable**: Виртуальное аудиоустройство для захвата системного звука
- **WhisperAPI**: OpenAI Whisper API для распознавания речи
- **GPT4oAPI**: OpenAI GPT-4o API для генерации текстовых ответов
- **OverlayWindow**: Окно поверх всех приложений для отображения подсказок
- **AudioBuffer**: Буфер в оперативной памяти для временного хранения аудиоданных
- **MSIInstaller**: Установочный пакет Microsoft Installer для развертывания приложения

## Requirements

### Requirement 1

**User Story:** Как пользователь, я хочу захватывать системное аудио с VB-Cable, чтобы распознавать речь собеседника в реальном времени

#### Acceptance Criteria

1. WHEN пользователь запускает VoiceAssistant, THE VoiceAssistant SHALL инициализировать подключение к VB-Cable аудиоустройству
2. WHILE VB-Cable передаёт аудиопоток, THE VoiceAssistant SHALL захватывать аудиоданные в AudioBuffer в оперативной памяти
3. THE VoiceAssistant SHALL поддерживать аудиоформат 16-bit PCM с частотой дискретизации 16 kHz или выше
4. IF VB-Cable недоступен при запуске, THEN THE VoiceAssistant SHALL отобразить сообщение об ошибке пользователю
5. THE VoiceAssistant SHALL освобождать AudioBuffer после отправки данных в WhisperAPI без сохранения на диск

### Requirement 2

**User Story:** Как пользователь, я хочу распознавать русскую речь через Whisper API, чтобы получать текстовую транскрипцию голоса собеседника

#### Acceptance Criteria

1. WHEN AudioBuffer содержит аудиоданные длительностью не менее 2 секунд, THE VoiceAssistant SHALL отправить данные в WhisperAPI
2. THE VoiceAssistant SHALL указывать язык распознавания как русский (ru) в запросе к WhisperAPI
3. WHEN WhisperAPI возвращает транскрипцию, THE VoiceAssistant SHALL передать текст в модуль обработки GPT4oAPI
4. IF WhisperAPI возвращает ошибку, THEN THE VoiceAssistant SHALL повторить запрос максимум 2 раза с интервалом 1 секунда
5. THE VoiceAssistant SHALL отправлять аудиоданные в формате, поддерживаемом WhisperAPI (mp3, wav, или webm)

### Requirement 3

**User Story:** Как пользователь, я хочу получать краткие технические ответы от GPT-4o, чтобы быстро понимать суть информации без лишних деталей

#### Acceptance Criteria

1. WHEN VoiceAssistant получает транскрипцию от WhisperAPI, THE VoiceAssistant SHALL отправить запрос в GPT4oAPI с системной инструкцией "Отвечай коротко, по-русски, давай технический ответ"
2. THE VoiceAssistant SHALL ограничить максимальную длину ответа GPT4oAPI до 150 токенов
3. WHEN GPT4oAPI возвращает ответ, THE VoiceAssistant SHALL передать текст в OverlayWindow для отображения
4. IF GPT4oAPI возвращает ошибку, THEN THE VoiceAssistant SHALL отобразить сообщение "Ошибка получения ответа" в OverlayWindow
5. THE VoiceAssistant SHALL использовать модель gpt-4o для генерации ответов

### Requirement 4

**User Story:** Как пользователь, я хочу видеть подсказки поверх всех окон в правом нижнем углу, чтобы не переключаться между приложениями

#### Acceptance Criteria

1. THE OverlayWindow SHALL отображаться поверх всех активных окон с z-index приоритетом topmost
2. THE OverlayWindow SHALL позиционироваться в правом нижнем углу экрана с отступом 20 пикселей от краёв
3. WHEN GPT4oAPI возвращает ответ, THE OverlayWindow SHALL отобразить текст с прозрачным фоном и читаемым шрифтом
4. THE OverlayWindow SHALL автоматически скрывать текст через 10 секунд после отображения
5. THE OverlayWindow SHALL поддерживать отображение текста на русском языке с корректной кодировкой UTF-8

### Requirement 5

**User Story:** Как пользователь, я хочу, чтобы утилита не записывала файлы и не передавала данные третьим сторонам, чтобы обеспечить конфиденциальность моих разговоров

#### Acceptance Criteria

1. THE VoiceAssistant SHALL хранить аудиоданные только в AudioBuffer в оперативной памяти
2. THE VoiceAssistant SHALL удалять аудиоданные из AudioBuffer сразу после отправки в WhisperAPI
3. THE VoiceAssistant SHALL передавать данные только в OpenAI API (WhisperAPI и GPT4oAPI)
4. THE VoiceAssistant SHALL не создавать временные файлы на диске для хранения аудио или текстовых данных
5. THE VoiceAssistant SHALL не отправлять телеметрию, аналитику или логи на внешние серверы

### Requirement 6

**User Story:** Как пользователь, я хочу установить утилиту через стандартный MSI-инсталлятор, чтобы легко развернуть приложение на Windows 10/11

#### Acceptance Criteria

1. THE MSIInstaller SHALL создавать исполняемый файл размером не более 20 МБ
2. THE MSIInstaller SHALL поддерживать установку на Windows 10 версии 1809 и выше
3. THE MSIInstaller SHALL поддерживать установку на Windows 11 всех версий
4. WHEN пользователь запускает MSIInstaller, THE MSIInstaller SHALL установить VoiceAssistant в директорию Program Files
5. THE MSIInstaller SHALL создать ярлык в меню Пуск для запуска VoiceAssistant

### Requirement 7

**User Story:** Как пользователь, я хочу, чтобы утилита была построена на современном стеке технологий, чтобы обеспечить производительность и удобство разработки

#### Acceptance Criteria

1. THE VoiceAssistant SHALL использовать Tauri framework для создания desktop-приложения
2. THE VoiceAssistant SHALL использовать React с TypeScript для frontend-интерфейса
3. THE VoiceAssistant SHALL использовать HonoJS для backend API-слоя
4. THE VoiceAssistant SHALL использовать Turborepo для управления монорепозиторием
5. THE VoiceAssistant SHALL использовать Bun.js в качестве JavaScript runtime и package manager

### Requirement 8

**User Story:** Как пользователь, я хочу настраивать OpenAI API ключи, чтобы использовать свою учётную запись для доступа к сервисам

#### Acceptance Criteria

1. WHEN пользователь первый раз запускает VoiceAssistant, THE VoiceAssistant SHALL запросить OpenAI API ключ
2. THE VoiceAssistant SHALL хранить API ключ в зашифрованном виде в локальном хранилище Windows
3. THE VoiceAssistant SHALL предоставить интерфейс для изменения API ключа в настройках
4. IF API ключ невалиден, THEN THE VoiceAssistant SHALL отобразить сообщение об ошибке с инструкцией по получению ключа
5. THE VoiceAssistant SHALL использовать API ключ для аутентификации запросов к WhisperAPI и GPT4oAPI
