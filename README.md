# Voice Assistant Overlay

Windows-утилита для захвата системного аудио, распознавания русской речи и предоставления кратких технических ответов через overlay-интерфейс.

**🎯 Специально оптимизирован для помощи на технических собеседованиях!**

> **📢 ВАЖНОЕ ОБНОВЛЕНИЕ:** VB-Cable не работает? Используйте альтернативы!  
> → [Быстрое решение за 2 минуты](apps/desktop/AUDIO-QUICK-FIX.md)  
> → [Подробная информация](AUDIO-UPDATE-NOTICE.md)

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

### 1. Настройка аудио (ВАЖНО!)

**Если VB-Cable не работает:**

- ⚡ **Быстрое решение:** [AUDIO-QUICK-FIX.md](apps/desktop/AUDIO-QUICK-FIX.md) - решение за 2 минуты
- 📖 **Подробное сравнение:** [AUDIO-ALTERNATIVES.md](apps/desktop/AUDIO-ALTERNATIVES.md) - все варианты

**Рекомендуем:**
1. Попробуйте **Stereo Mix** (встроен в Windows, не требует установки)
2. Если нет Stereo Mix - установите **VoiceMeeter** (бесплатный и стабильный)

### 2. Использование режимов собеседования

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
- **Виртуальное аудиоустройство** (выберите одно):
  - Stereo Mix (встроен в Windows) - **РЕКОМЕНДУЕТСЯ**
  - VoiceMeeter (бесплатный) - для продвинутых настроек
  - VB-Cable - если уже установлен
  - 📖 [Подробное сравнение и инструкции](apps/desktop/AUDIO-ALTERNATIVES.md)
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


## 📚 Документация

Полный список всей документации проекта: **[DOCS-INDEX.md](DOCS-INDEX.md)**

### Быстрые ссылки

#### Настройка аудио
- [AUDIO-QUICK-FIX.md](apps/desktop/AUDIO-QUICK-FIX.md) - Решение за 2 минуты
- [AUDIO-ALTERNATIVES.md](apps/desktop/AUDIO-ALTERNATIVES.md) - Сравнение вариантов
- [AUDIO-CHEATSHEET.md](apps/desktop/AUDIO-CHEATSHEET.md) - Шпаргалка

#### Начало работы
- [LOCKEDIN-QUICKSTART.md](LOCKEDIN-QUICKSTART.md) - Быстрый старт
- [docs/quick-start-interview.md](docs/quick-start-interview.md) - Для собеседований
- [docs/interview-modes.md](docs/interview-modes.md) - Режимы работы

#### Отладка
- [apps/desktop/HOW-TO-DEBUG.md](apps/desktop/HOW-TO-DEBUG.md) - Пошаговая отладка
- [apps/desktop/README-DEBUG.md](apps/desktop/README-DEBUG.md) - Компонент отладки
- [docs/audio-debugging.md](docs/audio-debugging.md) - Техническая документация

#### Разработка
- [CONTRIBUTING.md](CONTRIBUTING.md) - Как внести вклад
- [LOCKEDIN-FEATURES.md](LOCKEDIN-FEATURES.md) - Roadmap
- [apps/desktop/CHEATSHEET.md](apps/desktop/CHEATSHEET.md) - Шпаргалка разработчика

## 🤝 Вклад в проект

Мы приветствуем вклад в проект! Пожалуйста, прочитайте [CONTRIBUTING.md](CONTRIBUTING.md) для получения информации о процессе разработки.

## 📝 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🔒 Безопасность

Если вы обнаружили уязвимость безопасности, пожалуйста, прочитайте [SECURITY.md](SECURITY.md) для информации о том, как сообщить об этом.

## 📧 Контакты

- GitHub Issues: [Создать issue](https://github.com/yourusername/voice-assistant-overlay/issues)
- Документация: [DOCS-INDEX.md](DOCS-INDEX.md)

---

**Сделано с ❤️ для разработчиков, готовящихся к собеседованиям**
