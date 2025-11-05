# 🚀 LockedIn AI Style - Быстрый старт

> **⚠️ ВАЖНО:** Если VB-Cable не работает, используйте альтернативы:
> - ⚡ [Быстрое решение за 2 минуты](apps/desktop/AUDIO-QUICK-FIX.md)
> - 📖 [Подробное сравнение всех вариантов](apps/desktop/AUDIO-ALTERNATIVES.md)
> - 📋 [Шпаргалка для печати](apps/desktop/AUDIO-CHEATSHEET.md)

## Что нового?

### 1. Современный Overlay (ModernOverlay)
Новый компонент с glassmorphism эффектами и улучшенным UX:

- ✨ **Glassmorphism дизайн** - прозрачность с blur эффектом
- 🎯 **Drag & Drop** - перетаскивание overlay по экрану
- 📌 **Pin функция** - закрепление для постоянного показа
- 🌓 **Dark mode** - автоматическая поддержка темной темы
- 📱 **Responsive** - адаптивный дизайн
- ⚡ **Анимации** - плавные transitions

### 2. Умный анализатор вопросов (QuestionAnalyzer)
AI-powered определение типа вопроса:

- 🎯 **7 типов вопросов**: technical, behavioral, algorithm, system-design, coding, database, general
- 🧠 **Автоматическое определение** - анализ ключевых слов
- 📊 **Оценка сложности** - easy, medium, hard
- 📝 **Структура ответа** - STAR method, алгоритмический подход и т.д.
- 💡 **Умные промпты** - оптимизированные для каждого типа

## 🎨 Использование ModernOverlay

### Базовое использование

```tsx
import { ModernOverlay } from "./components/modern-overlay";

function App() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <>
      <ModernOverlay
        message={message}
        visible={showOverlay}
        isProcessing={false}
        onHide={() => setShowOverlay(false)}
      />
    </>
  );
}
```

### Особенности

#### Перетаскивание
- Просто зажмите и перетащите overlay
- Автоматическое сохранение позиции

#### Закрепление
- Нажмите 📍 для закрепления
- Закрепленный overlay не исчезает автоматически
- Зеленая рамка показывает закрепленное состояние

#### Форматирование
Overlay автоматически форматирует текст:

```typescript
// Простой текст
"React hooks - это функции для работы с состоянием"

// Bullet points (автоматически)
"• useState для состояния\n• useEffect для side effects\n• useContext для контекста"

// Результат: красивый список с зелеными bullet points
```

## 🧠 Использование QuestionAnalyzer

### Базовое использование

```typescript
import { QuestionAnalyzer } from "./services/question-analyzer";

const analyzer = new QuestionAnalyzer();

// Анализ вопроса
const question = "Расскажите о ситуации, когда вы работали в команде";
const analysis = analyzer.analyze(question);

console.log(analysis);
// {
//   type: "behavioral",
//   confidence: 0.8,
//   keywords: ["команда"],
//   suggestedStructure: "STAR method: Situation → Task → Action → Result",
//   estimatedComplexity: "medium"
// }
```

### Генерация улучшенного промпта

```typescript
const question = "Объясните, как работает React Virtual DOM";
const analysis = analyzer.analyze(question);

// Генерация оптимизированного промпта для ChatGPT
const prompt = analyzer.generatePrompt(question, analysis);

// Отправка в ChatGPT
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: "Ты помощник на техническом собеседовании. Давай краткие, структурированные ответы.",
    },
    {
      role: "user",
      content: prompt,
    },
  ],
});
```

### Типы вопросов и их обработка

#### 1. Behavioral (Поведенческие)
```typescript
"Расскажите о конфликте в команде"
// → STAR method структура
// → Фокус на действиях и результатах
```

#### 2. Algorithm (Алгоритмические)
```typescript
"Найдите два числа в массиве, сумма которых равна target"
// → Подход + сложность O(n)
// → Оптимизация
```

#### 3. System Design
```typescript
"Спроектируйте систему для URL shortener"
// → High-level архитектура
// → Компоненты и взаимодействие
// → Bottlenecks
```

#### 4. Coding
```typescript
"Напишите функцию для валидации email"
// → Решение с псевдокодом
// → Edge cases
```

#### 5. Database
```typescript
"Как оптимизировать запрос с JOIN?"
// → SQL пример
// → Индексы
```

#### 6. Technical
```typescript
"Что такое closure в JavaScript?"
// → Определение
// → Как работает
// → Примеры
```

## 🎯 Интеграция в существующее приложение

### Шаг 1: Обновить interview-service.ts

```typescript
import { QuestionAnalyzer } from "./question-analyzer";

export class InterviewService {
  private analyzer = new QuestionAnalyzer();

  async generateResponse(params: {
    transcript: string;
    mode: string;
    context?: string;
    apiKey: string;
  }): Promise<string> {
    // Анализ вопроса
    const analysis = this.analyzer.analyze(params.transcript);
    
    // Генерация улучшенного промпта
    const enhancedPrompt = this.analyzer.generatePrompt(
      params.transcript,
      analysis
    );

    // Отправка в OpenAI с улучшенным промптом
    // ...
  }
}
```

### Шаг 2: Заменить OverlayWindow на ModernOverlay

```typescript
// В app.tsx
import { ModernOverlay } from "./components/modern-overlay";

// Заменить
<OverlayWindow ... />

// На
<ModernOverlay
  message={currentResponse}
  visible={overlayVisible}
  isProcessing={isProcessing}
  onHide={hideOverlay}
/>
```

### Шаг 3: Добавить экспорт в components/index.ts

```typescript
export { ModernOverlay } from "./modern-overlay";
```

## 🎨 Кастомизация

### Изменение цветов

В `modern-overlay.css`:

```css
.modern-overlay.pinned {
  border: 2px solid #4CAF50; /* Зеленый для закрепленного */
}

.overlay-list li::before {
  color: #4CAF50; /* Цвет bullet points */
}
```

### Изменение размера

```css
.modern-overlay {
  width: 420px; /* Измените на нужный размер */
  max-width: 90vw;
}
```

### Изменение времени auto-hide

В `modern-overlay.tsx`:

```typescript
setTimeout(() => {
  onHide();
}, 15000); // 15 секунд, измените на нужное
```

## 📊 Примеры использования

### Пример 1: Behavioral вопрос

**Вопрос:** "Расскажите о ситуации, когда вы не согласились с решением команды"

**Анализ:**
```json
{
  "type": "behavioral",
  "confidence": 0.9,
  "suggestedStructure": "STAR method",
  "estimatedComplexity": "medium"
}
```

**Ответ в overlay:**
```
💡 Быстрый ответ:

• Situation: Команда хотела использовать MongoDB для транзакционных данных
• Task: Убедить в необходимости PostgreSQL
• Action: Подготовил сравнение, показал риски
• Result: Команда согласилась, избежали проблем с ACID
```

### Пример 2: Algorithm вопрос

**Вопрос:** "Найдите два числа в массиве, сумма которых равна target"

**Анализ:**
```json
{
  "type": "algorithm",
  "confidence": 0.85,
  "suggestedStructure": "Подход + сложность",
  "estimatedComplexity": "easy"
}
```

**Ответ в overlay:**
```
💡 Быстрый ответ:

• Используй HashMap для хранения чисел
• Для каждого числа проверяй (target - число) в HashMap
• Сложность: O(n) время, O(n) память
• Edge case: дубликаты, отрицательные числа
```

### Пример 3: System Design вопрос

**Вопрос:** "Спроектируйте Twitter"

**Анализ:**
```json
{
  "type": "system-design",
  "confidence": 0.95,
  "suggestedStructure": "High-level design",
  "estimatedComplexity": "hard"
}
```

**Ответ в overlay:**
```
💡 Быстрый ответ:

• Load Balancer → API Gateway → Microservices
• Tweet Service, Timeline Service, User Service
• Redis для кэша, Cassandra для tweets
• Message Queue для async обработки
• CDN для медиа файлов
```

## 🚀 Следующие шаги

1. **Интегрируйте ModernOverlay** - замените старый overlay
2. **Добавьте QuestionAnalyzer** - улучшите качество ответов
3. **Тестируйте** - попробуйте разные типы вопросов
4. **Кастомизируйте** - настройте под свои нужды
5. **Добавьте аналитику** - отслеживайте типы вопросов

## 📚 Дополнительные ресурсы

- [LOCKEDIN-FEATURES.md](LOCKEDIN-FEATURES.md) - Полный roadmap
- [ModernOverlay API](apps/desktop/src/components/modern-overlay.tsx) - Исходный код
- [QuestionAnalyzer API](apps/desktop/src/services/question-analyzer.ts) - Исходный код

## 🎯 Roadmap

- [ ] Markdown рендеринг в overlay
- [ ] Hotkeys для показа/скрытия
- [ ] История вопросов и ответов
- [ ] Экспорт сессии в PDF
- [ ] Аналитика по типам вопросов
- [ ] Режим тренировки (mock interview)

---

**Готово к использованию!** 🎉

Начните с интеграции ModernOverlay и QuestionAnalyzer в ваше приложение.
