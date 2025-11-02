# Voice Assistant Overlay

Windows-утилита для захвата системного аудио, распознавания русской речи и предоставления кратких технических ответов через overlay-интерфейс.

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
