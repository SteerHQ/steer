# Руководство по внесению вклада

Спасибо за интерес к проекту! Мы рады любому вкладу.

## Процесс разработки

1. **Fork репозитория**
2. **Создайте ветку** для вашей функции: `git checkout -b feature/amazing-feature`
3. **Внесите изменения** и убедитесь, что код проходит все проверки
4. **Commit изменения**: `git commit -m 'Add amazing feature'`
5. **Push в ветку**: `git push origin feature/amazing-feature`
6. **Создайте Pull Request**

## Стандарты кода

### TypeScript

- Используйте строгую типизацию
- Избегайте `any`, используйте `unknown` если тип неизвестен
- Документируйте публичные API с помощью JSDoc

### Форматирование

```bash
# Проверка форматирования
bun run format:check

# Автоматическое форматирование
bun run format
```

### Линтинг

```bash
# Проверка кода
bun run lint

# Проверка типов
bun run typecheck
```

### Тестирование

```bash
# Запуск тестов
bun run test

# Запуск тестов в watch режиме
cd apps/api
bun run test:watch
```

## Структура коммитов

Используйте [Conventional Commits](https://www.conventionalcommits.org/ru/):

- `feat:` - новая функциональность
- `fix:` - исправление бага
- `docs:` - изменения в документации
- `style:` - форматирование кода
- `refactor:` - рефакторинг кода
- `test:` - добавление тестов
- `chore:` - обновление зависимостей, конфигурации

Примеры:

```
feat: add audio device selection
fix: resolve memory leak in audio pipeline
docs: update installation guide
```

## Архитектура проекта

### Monorepo структура

```
├── apps/
│   ├── desktop/    # Tauri приложение
│   └── api/        # Backend API
└── packages/
    ├── types/      # Shared типы
    ├── ui/         # Shared компоненты
    └── config/     # Shared конфигурация
```

### Добавление новых зависимостей

```bash
# В корневой package.json (dev dependencies)
bun add -D <package>

# В конкретный пакет
cd apps/desktop
bun add <package>
```

## Тестирование

- Пишите unit-тесты для всех новых функций
- Покрытие кода должно быть не менее 70%
- Тесты должны быть изолированными и быстрыми

## Документация

- Обновляйте README.md при добавлении новых функций
- Документируйте сложные алгоритмы
- Добавляйте примеры использования

## Вопросы?

Создайте issue с меткой `question` или свяжитесь с мейнтейнерами.
