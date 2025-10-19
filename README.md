# Voice Assistant Overlay

Windows-утилита для захвата системного аудио, распознавания русской речи и предоставления кратких технических ответов через overlay-интерфейс.

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
