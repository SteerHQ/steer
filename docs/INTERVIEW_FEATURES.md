# Функции для помощи при собеседовании

## Обзор

Voice Assistant Overlay теперь включает специализированные режимы работы, оптимизированные для помощи на технических собеседованиях. Эти функции позволяют получать краткие, точные ответы на технические вопросы с учетом контекста беседы.

## Новые возможности

### 1. Режимы работы

#### 🎯 Режим собеседования (Interview Mode)
- **Назначение:** Технические интервью
- **Особенности:**
  - Краткие ответы (2-3 предложения)
  - Сохранение контекста последних 10 вопросов
  - Фокус на ключевых концепциях
  - Простой, понятный язык

#### 🧮 Режим алгоритмов (Algorithm Mode)
- **Назначение:** Алгоритмические задачи
- **Особенности:**
  - Объяснение подхода к решению
  - Временная и пространственная сложность
  - Ключевая структура данных
  - Краткий псевдокод (до 5 строк)

#### 📝 Режим шпаргалки (Cheatsheet Mode)
- **Назначение:** Быстрые справки
- **Особенности:**
  - Максимально краткие ответы
  - Только факты, без объяснений
  - Синтаксис, определения, формулы

#### 💬 Общий режим (General Mode)
- **Назначение:** Стандартные вопросы
- **Особенности:**
  - Баланс между краткостью и полнотой
  - Без специальной оптимизации

### 2. Контекстная память

В режиме собеседования ассистент:
- Сохраняет последние 10 пар вопрос-ответ
- Использует контекст для более релевантных ответов
- Автоматически очищает историю при переключении режима

### 3. Адаптивные промпты

Каждый режим использует оптимизированный системный промпт:
- **Собеседование:** Фокус на краткости и ключевых концепциях
- **Алгоритмы:** Акцент на сложности и структурах данных
- **Шпаргалка:** Только факты без объяснений
- **Общий:** Стандартные технические ответы

## Архитектура

### Новые компоненты

#### Frontend (apps/desktop)
```
src/
├── components/
│   └── interview-mode.tsx       # UI для выбора режима
├── services/
│   └── interview-service.ts     # Сервис для работы с режимами
└── store/
    └── app-store.ts             # Обновлен для поддержки режимов
```

#### Backend (apps/api)
```
src/
├── services/
│   └── openai-service.ts        # Обновлен для поддержки режимов
└── routes/
    └── openai.ts                # Обновлен для приема параметров режима
```

#### Types (packages/types)
```
src/
├── api.ts                       # GenerateRequest
└── app.ts                       # AssistantMode, InterviewContext
```

### Новые типы

```typescript
// Режимы работы
type AssistantMode = 'general' | 'interview' | 'algorithm' | 'cheatsheet';

// Контекст собеседования
interface InterviewContext {
  questions: Array<{
    question: string;
    answer: string;
    timestamp: number;
  }>;
  startTime: number;
  topic?: string;
}

// Запрос на генерацию
interface GenerateRequest {
  transcript: string;
  mode?: AssistantMode;
  context?: Array<{
    question: string;
    answer: string;
  }>;
}
```

### API изменения

#### POST /api/generate

**Новые параметры:**
```json
{
  "transcript": "Что такое closure?",
  "mode": "interview",
  "context": [
    {
      "question": "Что такое hoisting?",
      "answer": "Hoisting - это механизм..."
    }
  ]
}
```

**Ответ:**
```json
{
  "success": true,
  "response": "Closure - это функция...",
  "mode": "interview"
}
```

## Использование

### Базовое использование

```typescript
import { InterviewService } from './services/interview-service';

const service = new InterviewService();

// Генерация ответа в режиме собеседования
const response = await service.generateResponse({
  transcript: "Что такое Promise?",
  mode: 'interview',
  context: previousQuestions,
  apiKey: apiKey,
});
```

### Управление контекстом

```typescript
import { useAppStore } from './store';

const {
  mode,
  setMode,
  addToInterviewContext,
  clearInterviewContext,
  getInterviewContext,
} = useAppStore();

// Переключение режима
setMode('interview');

// Добавление в контекст
addToInterviewContext(question, answer);

// Получение контекста для API
const context = getInterviewContext();

// Очистка контекста
clearInterviewContext();
```

### UI компонент

```tsx
import { InterviewMode } from './components/interview-mode';

<InterviewMode
  currentMode={mode}
  onModeChange={setMode}
  onClearHistory={clearInterviewContext}
  historyCount={interviewContext?.questions.length || 0}
/>
```

## Конфигурация

### Настройки по умолчанию

```typescript
interface AppConfig {
  // ... существующие настройки
  defaultMode: AssistantMode;
  interviewSettings: {
    saveHistory: boolean;
    maxHistoryItems: number;
    showConfidence: boolean;
  };
}
```

### Пример конфигурации

```json
{
  "defaultMode": "interview",
  "interviewSettings": {
    "saveHistory": true,
    "maxHistoryItems": 10,
    "showConfidence": false
  }
}
```

## Производительность

### Оптимизации

1. **Контекст:** Ограничен 10 вопросами для избежания переполнения
2. **Промпты:** Оптимизированы для кратких ответов
3. **Кэширование:** Режим сохраняется в store
4. **Память:** История автоматически очищается при переключении

### Метрики

- Размер контекста: ~2-3 KB на 10 вопросов
- Время переключения режима: <50ms
- Overhead на запрос: +100-200 токенов для контекста

## Тестирование

### Unit тесты

```typescript
// Тест режимов
describe('InterviewService', () => {
  it('should generate response in interview mode', async () => {
    const service = new InterviewService();
    const response = await service.generateResponse({
      transcript: 'Test question',
      mode: 'interview',
      apiKey: 'test-key',
    });
    expect(response).toBeDefined();
  });
});

// Тест контекста
describe('AppStore', () => {
  it('should add to interview context', () => {
    const { addToInterviewContext, getInterviewContext } = useAppStore.getState();
    addToInterviewContext('Q1', 'A1');
    const context = getInterviewContext();
    expect(context).toHaveLength(1);
  });
});
```

## Документация

### Пользовательская документация

- [Руководство по режимам](interview-modes.md)
- [Примеры использования](examples-ru.md)
- [Быстрый старт](quick-start-interview.md)
- [Руководство пользователя](../usage-guide-ru.md)

### Техническая документация

- [API Reference](api-reference.md) (планируется)
- [Architecture](architecture.md) (планируется)

## Roadmap

### Планируемые улучшения

- [ ] Сохранение истории между сеансами
- [ ] Экспорт истории вопросов
- [ ] Горячие клавиши для переключения режимов
- [ ] Настройка длины ответов
- [ ] Поддержка пользовательских режимов
- [ ] Статистика использования режимов
- [ ] Оценка уверенности в ответах
- [ ] Поддержка английского языка

### Известные ограничения

- Контекст ограничен 10 вопросами
- История не сохраняется между сеансами
- Оптимизировано только для русского языка
- Нет горячих клавиш для переключения режимов

## Вклад в проект

При добавлении новых режимов:

1. Добавьте режим в `AssistantMode` тип
2. Создайте системный промпт в `getSystemPrompt()`
3. Обновите UI в `interview-mode.tsx`
4. Добавьте документацию и примеры
5. Напишите тесты

## Лицензия

MIT License - см. [LICENSE](../LICENSE)

## Поддержка

- GitHub Issues: [github.com/yourusername/voice-assistant-overlay/issues](https://github.com/yourusername/voice-assistant-overlay/issues)
- Документация: [docs/](.)
- Email: support@example.com
