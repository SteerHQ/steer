# Исправление дублирования сообщений в чате

## Проблема

Сообщения в чате дублировались - каждое сообщение появлялось дважды.

## Причина

Сообщения добавлялись в двух местах:

### 1. Дублирование вопроса пользователя

```typescript
// App.tsx
setTranscript(transcript);  // ❌ Добавляет сообщение
addMessage('user', transcript);  // ❌ Добавляет еще раз

// app-store.ts
setTranscript: (transcript) => {
  const userMessage = { type: "user", content: transcript };
  return {
    messages: [...state.messages, userMessage],  // ❌ Дублирование!
  };
}
```

### 2. Дублирование ответа ассистента

```typescript
// App.tsx (в callback streaming)
addMessage('assistant', partialResponse);  // ✅ Обновляет сообщение

// App.tsx (после завершения)
setResponse(response);  // ❌ Добавляет еще раз

// app-store.ts
setResponse: (response) => {
  const assistantMessage = { type: "assistant", content: response };
  return {
    messages: [...state.messages, assistantMessage],  // ❌ Дублирование!
  };
}
```

## Решение

### 1. Убрано добавление сообщения из `setTranscript`

**Было:**
```typescript
setTranscript: (transcript: string) =>
  set((state) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: transcript,
      timestamp: new Date(),
    };
    return {
      currentTranscript: transcript,
      messages: [...state.messages, userMessage],  // ❌ Дублирование
    };
  }),
```

**Стало:**
```typescript
setTranscript: (transcript: string) =>
  set((state) => ({
    currentTranscript: transcript,  // ✅ Только сохраняем transcript
  })),
```

---

### 2. Убрано добавление сообщения из `setResponse`

**Было:**
```typescript
setResponse: (response: string) =>
  set((state) => {
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      type: "assistant",
      content: response,
      timestamp: new Date(),
    };
    return {
      currentResponse: response,
      overlayVisible: true,
      messages: [...state.messages, assistantMessage],  // ❌ Дублирование
    };
  }),
```

**Стало:**
```typescript
setResponse: (response: string) =>
  set((state) => ({
    currentResponse: response,  // ✅ Только сохраняем response
  })),
```

---

### 3. Убран дублирующий вызов в App.tsx

**Было:**
```typescript
setTranscript(transcript);  // ❌ Добавляет сообщение
addMessage('user', transcript);  // ❌ Добавляет еще раз
```

**Стало:**
```typescript
addMessage('user', transcript);  // ✅ Добавляет один раз
```

---

## Логика добавления сообщений

Теперь сообщения добавляются **только через `addMessage`**:

### Вопрос пользователя

```typescript
// App.tsx
addMessage('user', transcript);  // ✅ Один раз
```

### Ответ ассистента (streaming)

```typescript
// App.tsx (callback)
const response = await generateResponseStream(
  options,
  (partialResponse) => {
    addMessage('assistant', partialResponse);  // ✅ Обновляет последнее сообщение
  }
);
```

### Системные сообщения

```typescript
// App.tsx
addMessage('system', 'Обнаружена речь (не вопрос)');  // ✅ Один раз
```

---

## Как работает `addMessage`

```typescript
addMessage: (type, content) => {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // Если последнее сообщение от assistant, обновляем его (streaming)
  if (lastMessage && lastMessage.type === type && type === 'assistant') {
    updatedMessages[updatedMessages.length - 1] = {
      ...lastMessage,
      content,  // ✅ Обновляем контент
    };
    return { messages: updatedMessages };
  }
  
  // Иначе добавляем новое сообщение
  const message = { id: `${type}-${Date.now()}`, type, content };
  return { messages: [...state.messages, message] };
}
```

**Особенности:**
- Для `assistant` - обновляет последнее сообщение (для streaming)
- Для `user` и `system` - всегда добавляет новое

---

## Результат

### До исправления

```
Чат:
├─ Пользователь: "Что такое React?"
├─ Пользователь: "Что такое React?"  ❌ Дубликат
├─ Бот: "React - это..."
└─ Бот: "React - это..."  ❌ Дубликат
```

### После исправления

```
Чат:
├─ Пользователь: "Что такое React?"  ✅ Один раз
└─ Бот: "React - это..."  ✅ Один раз (обновляется при streaming)
```

---

## Измененные файлы

- `apps/desktop/src/App.tsx` - убран дублирующий вызов `setTranscript`
- `apps/desktop/src/store/app-store.ts` - убрано добавление сообщений из `setTranscript` и `setResponse`

---

## Тестирование

### Проверка

1. Задайте вопрос
2. ✅ Вопрос должен появиться **один раз**
3. ✅ Ответ должен появиться **один раз** (обновляясь при streaming)

### Ожидаемое поведение

**Streaming режим:**
```
Пользователь: "Что такое React?"
Бот: "React"
Бот: "React - это"  (обновление)
Бот: "React - это JavaScript"  (обновление)
Бот: "React - это JavaScript библиотека..."  (обновление)
```

**Non-streaming режим:**
```
Пользователь: "Что такое React?"
Бот: "React - это JavaScript библиотека..."  (появляется сразу)
```

---

## Заключение

Исправлено дублирование сообщений:

✅ **Вопросы** - добавляются один раз через `addMessage`  
✅ **Ответы** - добавляются/обновляются один раз через `addMessage`  
✅ **Системные** - добавляются один раз через `addMessage`  
✅ **Streaming** - работает корректно (обновление последнего сообщения)

Теперь каждое сообщение появляется в чате ровно один раз!
