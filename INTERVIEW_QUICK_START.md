# Interview Mode - Quick Start

## Как использовать режим интервью

### Концепция

Система захватывает **вопросы интервьюера** из системного аудио (Zoom/Teams/Meet) и помогает кандидату подготовить ответ.

**Ответы кандидата НЕ записываются** - только вопросы для анализа.

### Проблема

Как отличить вопрос интервьюера от ответа кандидата в системном аудио?

### Решение: Кнопка "Я отвечаю"

Кандидат нажимает кнопку когда начинает отвечать:
- **Кнопка НЕ нажата** → система слушает и анализирует вопросы
- **Кнопка нажата** → система приостанавливает обработку (кандидат отвечает)

## Компоненты готовы к интеграции

### 1. SpeakingToggle Component (бывший PushToTalk)
Файл: `apps/desktop/src/components/push-to-talk.tsx`

**Использование:**
```tsx
import { PushToTalk } from "./components/push-to-talk";

const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false);

<PushToTalk
  onSpeakingChange={(isSpeaking) => {
    setIsCandidateSpeaking(isSpeaking);
    // Когда кандидат говорит - приостанавливаем обработку
  }}
  disabled={!isCapturing}
/>
```

## Интеграция в App.tsx

### Шаг 1: Добавить состояние
```typescript
const [isCandidateSpeaking, setIsCandidateSpeaking] = useState(false);
```

### Шаг 2: Обновить логику обработки
```typescript
const processAudioPipeline = async () => {
  const analysisEnabled = localStorage.getItem("analysis_enabled") !== "false";
  
  // Пропускаем если кандидат говорит (отвечает на вопрос)
  if (isCandidateSpeaking) {
    console.log("Candidate is speaking, skipping processing");
    return;
  }
  
  // Пропускаем если анализ отключен или уже обрабатываем
  if (!analysisEnabled || isProcessing || !audioPipelineRef.current) {
    return;
  }

  try {
    setProcessing(true);

    // Получаем аудио (это вопрос интервьюера)
    const audioBuffer = await invoke<number[]>("get_audio_data");
    
    if (!audioBuffer || audioBuffer.length === 0) {
      return;
    }

    const audioData = new Uint8Array(audioBuffer);

    // Транскрибируем вопрос интервьюера
    const question = await interviewServiceRef.current.transcribeAudio(audioData);
    
    setTranscript(question);

    // Генерируем подсказку для ответа
    const suggestion = await interviewServiceRef.current.generateResponse({
      transcript: question,
      mode,
      context: getInterviewContext(),
    });

    setResponse(suggestion);
    
    // Добавляем в контекст
    if (mode === 'interview') {
      addToInterviewContext(question, ''); // Ответ кандидата не записываем
    }

    setError(null);
  } catch (error) {
    // ... обработка ошибок
  } finally {
    setProcessing(false);
  }
};
```

### Шаг 3: Добавить компонент в UI
```tsx
import { PushToTalk } from "./components/push-to-talk";

{mode === 'interview' && (
  <div style={{ marginTop: "20px" }}>
    <PushToTalk
      onSpeakingChange={setIsCandidateSpeaking}
      disabled={!isCapturing}
    />
  </div>
)}
```

## Workflow

```
1. Система постоянно захватывает системное аудио (Zoom/Teams/Meet)
   ↓
2. Интервьюер задает вопрос
   ↓
3. Вопрос транскрибируется и анализируется
   ↓
4. Генерируется подсказка для ответа
   ↓
5. Кандидат видит подсказку
   ↓
6. Кандидат нажимает "Я отвечаю" (или SPACE)
   ↓
7. Обработка аудио приостанавливается
   ↓
8. Кандидат отвечает (его речь НЕ записывается)
   ↓
9. Кандидат отпускает кнопку
   ↓
10. Система снова слушает вопросы интервьюера
```

## Настройки микрофона

В Settings добавить выбор микрофона:

```tsx
<div className="form-group">
  <label>Микрофон для вопросов</label>
  <select value={microphoneDevice} onChange={...}>
    {audioDevices
      .filter(d => d.includes('Input'))
      .map(device => (
        <option key={device} value={device}>
          {device}
        </option>
      ))}
  </select>
</div>
```

## Альтернативный подход: Два режима

Если PTT сложен, можно сделать переключатель:

```tsx
<button onClick={() => setRecordingMode('system')}>
  🔊 Слушать ответы
</button>
<button onClick={() => setRecordingMode('microphone')}>
  🎤 Записать вопрос
</button>
```

Когда `recordingMode === 'microphone'`:
- Останавливаем системный захват
- Включаем микрофон
- Записываем вопрос
- Возвращаемся к системному захвату

## Преимущества PTT подхода

✅ Простая реализация
✅ Нет ложных срабатываний
✅ Полный контроль
✅ Работает в любых условиях
✅ Не требует настройки порогов
✅ Интуитивно понятен

## Следующие шаги

1. Добавить PushToTalk в app.tsx
2. Протестировать запись вопросов
3. Улучшить UI индикацию
4. Добавить настройки микрофона
5. Опционально: добавить VAD для автоматического режима
