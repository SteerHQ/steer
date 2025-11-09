# Server Setup Guide

## API Server Configuration

API сервер теперь полностью публичный. Клиенты не передают API ключи - все запросы обрабатываются через сервер.

### Backend Setup

1. Создайте файл `apps/api/.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

2. Запустите сервер:
```bash
cd apps/api
npm install
npm run dev
```

### Client Setup

Клиент больше не требует настройки API ключа. Просто запустите приложение:

```bash
cd apps/desktop
npm install
npm run tauri dev
```

## API Endpoints

Все endpoints публичные и не требуют авторизации:

- `POST /api/transcribe` - Транскрипция аудио (binary WAV data)
- `POST /api/generate` - Генерация ответа (JSON)

## Security Note

⚠️ Этот сервер предназначен для локального использования. Не разворачивайте его публично без дополнительной защиты!
