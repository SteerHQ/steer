# Changelog

Все значимые изменения в проекте будут документированы в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект придерживается [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Добавлено

- CI/CD пайплайн с GitHub Actions для автоматической проверки кода
- Prettier для форматирования кода
- ESLint конфигурация для TypeScript и React
- Vitest для unit-тестирования
- Централизованная система обработки ошибок (`@steer/types/errors`)
- Структурированное логирование (`@steer/types/logger`)
- Кастомные React хуки:
  - `useDebounce` - для debounce значений
  - `useLocalStorage` - для работы с localStorage
  - `useAudioDevice` - для управления аудио устройством
  - `useAudioPipeline` - для управления аудио пайплайном
- Утилиты для оптимизации производительности (memoize, debounce, throttle)
- Тесты для store и middleware
- Скрипты для typecheck и lint во всех пакетах

### Изменено

- Улучшена типизация во всех пакетах
- Оптимизирована структура проекта
- Обновлены зависимости до последних версий

### Исправлено

- Улучшена обработка ошибок в аудио пайплайне
- Оптимизирована работа с localStorage

## [1.0.0] - 2024-11-02

### Добавлено

- Первоначальный релиз
- Tauri desktop приложение
- HonoJS backend API
- Интеграция с OpenAI (Whisper + GPT-4o)
- Захват системного аудио через VB-Cable
- Overlay интерфейс для отображения ответов
