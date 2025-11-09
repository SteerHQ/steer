# Удаление Overlay Message

## Изменение

Удален компонент `OverlayWindow` из приложения.

## Причина

Overlay сообщения больше не нужны, так как:
1. Все ответы отображаются в чате
2. Чат более удобен для просмотра истории
3. Overlay перекрывал интерфейс

## Что было удалено

### Компонент
```tsx
<OverlayWindow
  message={currentResponse || ...}
  visible={overlayVisible || ...}
  autoHideDuration={config?.autoHideDuration || 10000}
  onHide={hideOverlay}
  isError={error?.code === "OPENAI_ERROR"}
/>
```

### Импорты
```tsx
import { OverlayWindow } from "./components/overlay-window";
```

### Переменные из store
```tsx
currentResponse,
overlayVisible,
hideOverlay,
```

### Неиспользуемая функция
```tsx
function calculateAudioLevel(buffer: number[]): number { ... }
```

## Результат

✅ Более чистый интерфейс  
✅ Нет перекрытия UI  
✅ Все сообщения в одном месте (чат)  
✅ Меньше кода для поддержки

## Измененные файлы

- `apps/desktop/src/App.tsx` - удален OverlayWindow и связанные переменные

## Альтернатива

Все ответы теперь отображаются только в компоненте `Chat`:
- История сообщений
- Системные уведомления
- Ответы от бота
- Ошибки

Это более удобно и не отвлекает пользователя.
