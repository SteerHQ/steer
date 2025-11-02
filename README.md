# Voice Assistant Overlay

Windows-утилита для захвата системного аудио, распознавания русской речи и предоставления кратких технических ответов через overlay-интерфейс.

**🎯 Специально оптимизирован для помощи на технических собеседованиях!**

[![CI](https://github.com/yourusername/voice-assistant-overlay/workflows/CI/badge.svg)](https://github.com/yourusername/voice-assistant-overlay/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.9-orange.svg)](https://tauri.app/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Структура проекта

```
voice-assistant-overlay/
├── apps/
│   ├── desktop/          # Tauri desktop приложение
│   └── api/              # HonoJS backend API
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── ui/               # Shared React components
│   └── config/           # Shared configuration
├── turbo.json            # Turborepo configuration
└── package.json          # Root package.json
```

## Технологический стек

- **Frontend**: React 18+ с TypeScript
- **Backend**: HonoJS
- **Desktop Framework**: Tauri 1.5+
- **Package Manager**: Bun.js
- **Monorepo**: Turborepo

## Установка

```bash
# Установить зависимости
bun install
```

## Быстрый старт

### Использование режимов собеседования

1. **Запустите приложение** и настройте OpenAI API ключ
2. **Выберите режим** через выпадающее меню:
   - 🎯 **Собеседование** - для технических интервью с контекстом
   - 🧮 **Алгоритмы** - для coding challenges
   - 📝 **Шпаргалка** - для быстрых фактов
   - 💬 **Общий** - стандартный режим

3. **Задавайте вопросы** через микрофон
4. **Получайте краткие ответы** в overlay окне

Подробнее: [Документация по режимам](docs/interview-modes.md)

## Разработка

```bash
# Запустить все приложения в dev режиме
bun run dev

# Запустить только desktop приложение
cd apps/desktop
bun run tauri:dev
```

## Сборка

```bash
# Собрать все приложения
bun run build

# Собрать MSI installer
cd apps/desktop
bun run tauri:build
```

## Требования

- Windows 10 (1809+) или Windows 11
- VB-Cable (виртуальное аудиоустройство)
- OpenAI API ключ
- Bun.js 1.3.1+
- Rust (для сборки Tauri)

## Особенности

✨ **Современный стек технологий**

- Monorepo с Turborepo для эффективной сборки
- TypeScript для типобезопасности
- React 19 с хуками для UI
- Zustand для управления состоянием

🎯 **Режимы работы для собеседований**

- **Общий режим** - стандартные технические ответы
- **Режим собеседования** - краткие ответы с контекстом предыдущих вопросов
- **Режим алгоритмов** - помощь с алгоритмическими задачами, сложность O(n)
- **Режим шпаргалки** - быстрые факты и определения

💡 **Интеллектуальная помощь**

- Контекстная память в режиме собеседования (последние 10 вопросов)
- Адаптивные промпты для разных типов вопросов
- Краткие технические ответы (2-3 предложения)
- Поддержка русского языка

🔧 **Качество кода**

- ESLint и Prettier для единообразия кода
- Vitest для unit-тестирования
- CI/CD с GitHub Actions
- Строгая типизация TypeScript

⚡ **Производительность**

- Оптимизированная сборка с Vite
- Lazy loading компонентов
- Мемоизация и debounce
- Минимальный размер бандла

🛡️ **Надежность**

- Централизованная обработка ошибок
- Структурированное логирование
- Автоматические retry механизмы
- Graceful degradation
