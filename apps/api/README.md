# Steer API

HonoJS backend API для Voice Assistant приложения.

## Запуск

```bash
# Development mode с hot reload
bun run dev

# Production build
bun run build
bun run start
```

## Эндпоинты

### Health Check
- `GET /` - Проверка статуса API

### Audio Processing
- `POST /api/audio/process` - Обработка аудио буфера (будет реализовано в task 6.2)

### OpenAI Integration
- `POST /api/transcribe` - Транскрипция аудио через Whisper API (будет реализовано в task 7.4)
- `POST /api/generate` - Генерация ответа через GPT-4o API (будет реализовано в task 7.4)

## Middleware

- **CORS**: Настроен для локального взаимодействия с Tauri
- **Logger**: Логирование всех запросов
- **Error Handler**: Централизованная обработка ошибок

## Конфигурация

- Port: `3000` (по умолчанию, можно изменить через `PORT` env variable)
- CORS origins: `tauri://localhost`, `http://localhost:*`, `https://tauri.localhost`
