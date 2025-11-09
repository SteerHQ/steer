# Опциональный Streaming режим

## Что сделано

Добавлена возможность переключения между streaming и non-streaming режимами генерации ответов.

## Использование

### API Endpoint

**URL:** `POST /api/generate`

**Query параметры:**
- `?stream=true` - streaming режим (по умолчанию)
- `?stream=false` - non-streaming режим

### Примеры

#### Streaming режим (по умолчанию)

```typescript
const response = await fetch('http://localhost:3000/api/generate?stream=true', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: "Что такое React?",
    mode: "interview"
  })
});

// Response: Server-Sent Events stream
const reader = response.body?.getReader();
// ... обработка stream
```

**Ответ:**
```
data: {"chunk":"React"}

data: {"chunk":" - это"}

data: {"chunk":" JavaScript библиотека"}

data: [DONE]
```

---

#### Non-streaming режим

```typescript
const response = await fetch('http://localhost:3000/api/generate?stream=false', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transcript: "Что такое React?",
    mode: "interview"
  })
});

const data = await response.json();
console.log(data.response); // Полный ответ
```

**Ответ:**
```json
{
  "success": true,
  "response": "React - это JavaScript библиотека для создания пользовательских интерфейсов...",
  "mode": "interview",
  "streaming": false
}
```

---

## Frontend (Desktop App)

### Переключение через UI

Добавлена кнопка **"⚡ Stream ВКЛ/ВЫКЛ"** в интерфейсе.

**Состояния:**
- ✅ **Stream ВКЛ** (зеленая) - ответ появляется постепенно
- ⚪ **Stream ВЫКЛ** (серая) - ответ появляется целиком

**Как переключить:**
1. Нажмите кнопку "⚡ Stream ВКЛ/ВЫКЛ"
2. Приложение перезагрузится
3. Новый режим будет активен

### Хранение настройки

Настройка сохраняется в `localStorage`:
```typescript
localStorage.getItem("streaming_enabled") // "true" или "false"
```

### Программное использование

```typescript
// Проверка режима
const streamingEnabled = localStorage.getItem("streaming_enabled") !== "false";

// Генерация с выбранным режимом
const response = await interviewService.generateResponseStream(
  { transcript, mode, context },
  (partialResponse) => {
    // Callback для обновления UI
    updateChat(partialResponse);
  },
  streamingEnabled // true = streaming, false = non-streaming
);
```

---

## Сравнение режимов

### Streaming режим (по умолчанию)

**Преимущества:**
- ✅ Мгновенная обратная связь (0.5 сек)
- ✅ Видно что система работает
- ✅ Лучший UX
- ✅ Естественно (как человек отвечает)

**Недостатки:**
- ⚠️ Сложнее обработка на клиенте
- ⚠️ Нельзя отменить генерацию

**Когда использовать:**
- Интерактивные диалоги
- Длинные ответы
- Когда важна скорость восприятия

---

### Non-streaming режим

**Преимущества:**
- ✅ Проще обработка (обычный JSON)
- ✅ Можно кэшировать полный ответ
- ✅ Легче логировать

**Недостатки:**
- ⚠️ Ждем полный ответ (3-5 сек)
- ⚠️ Нет обратной связи во время генерации

**Когда использовать:**
- Короткие ответы
- Batch обработка
- Когда нужен полный ответ сразу

---

## Технические детали

### API Implementation

```typescript
// apps/api/src/routes/generate.ts

generate.post('/', async (c) => {
  // Проверяем query параметр
  const streamParam = c.req.query('stream');
  const useStreaming = streamParam !== 'false'; // true by default

  if (!useStreaming) {
    // Non-streaming: возвращаем JSON
    const response = await openaiService.generateResponse(...);
    return c.json({ success: true, response, streaming: false });
  }

  // Streaming: возвращаем SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiService.generateResponseStream(...)) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ chunk })}\n\n`));
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    },
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
});
```

### Frontend Implementation

```typescript
// apps/desktop/src/services/interview-service.ts

async generateResponseStream(
  options: GenerateOptions,
  onChunk: (chunk: string) => void,
  useStreaming: boolean = true
): Promise<string> {
  const url = `http://localhost:3000/api/generate?stream=${useStreaming}`;
  const response = await fetch(url, { method: 'POST', body: ... });

  if (!useStreaming) {
    // Non-streaming: просто парсим JSON
    const data = await response.json();
    onChunk(data.response);
    return data.response;
  }

  // Streaming: читаем stream
  const reader = response.body?.getReader();
  let fullResponse = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Парсим SSE chunks
    const chunk = decoder.decode(value);
    // ... обработка
    fullResponse += parsedChunk;
    onChunk(fullResponse);
  }
  
  return fullResponse;
}
```

---

## Измененные файлы

### Backend
- `apps/api/src/routes/generate.ts` - добавлен query параметр `stream`
- `apps/api/src/index.ts` - загрузка .env из корня проекта

### Frontend
- `apps/desktop/src/services/interview-service.ts` - параметр `useStreaming`
- `apps/desktop/src/App.tsx` - кнопка переключения, чтение из localStorage

---

## Загрузка .env из корня проекта

### Проблема
API не находил `OPENAI_API_KEY` из `.env` в корне проекта.

### Решение
Использован флаг `--env-file` в Bun для автоматической загрузки `.env` из корня:

```json
// apps/api/package.json

{
  "scripts": {
    "dev": "bun run --watch --env-file=../../.env src/index.ts",
    "start": "bun run --env-file=../../.env dist/index.js"
  }
}
```

**Преимущества:**
- ✅ Автоматическая загрузка (нет ручного кода)
- ✅ Работает в dev и production
- ✅ Поддержка Bun из коробки

### Проверка при запуске

```
📁 Environment variables loaded from project root
✅ OPENAI_API_KEY loaded: sk-proj...
🚀 Server running on http://localhost:3000
```

---

## Тестирование

### Проверка streaming режима

1. Убедитесь что кнопка "⚡ Stream ВКЛ" (зеленая)
2. Задайте вопрос
3. ✅ Ответ должен появляться постепенно

### Проверка non-streaming режима

1. Нажмите "⚡ Stream ВКЛ" → станет "📄 Stream ВЫКЛ"
2. Приложение перезагрузится
3. Задайте вопрос
4. ✅ Ответ должен появиться целиком

### Проверка .env

```bash
cd apps/api
bun run dev
```

**Ожидаемый вывод:**
```
📁 Loading .env from: /path/to/project/.env
✅ Loaded .env from project root
✅ OPENAI_API_KEY loaded: sk-proj...
🚀 Server running on http://localhost:3000
```

---

## Рекомендации

### Когда использовать streaming

✅ **Используйте streaming (по умолчанию):**
- Интервью режим
- Длинные ответы (> 100 слов)
- Интерактивные диалоги
- Когда важна воспринимаемая скорость

### Когда использовать non-streaming

✅ **Используйте non-streaming:**
- Короткие ответы (< 50 слов)
- Batch обработка
- Когда нужен полный ответ для анализа
- Отладка и тестирование

---

## Заключение

Теперь система поддерживает оба режима:

✅ **Streaming** - мгновенная обратная связь (по умолчанию)  
✅ **Non-streaming** - полный ответ сразу (опционально)  
✅ **Переключение через UI** - одна кнопка  
✅ **Загрузка .env из корня** - правильная конфигурация

Пользователь может выбрать режим в зависимости от своих предпочтений!
