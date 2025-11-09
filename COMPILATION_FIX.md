# Исправление ошибок компиляции Event-Driven архитектуры

## Ошибки

### 1. Missing trait `Emitter`

```
error[E0599]: no method named `emit` found for struct `AppHandle<R>`
help: trait `Emitter` which provides `emit` is implemented but not in scope
```

**Причина:** Метод `emit()` доступен только если импортирован trait `Emitter`.

**Решение:**
```rust
use tauri::{State, AppHandle, Emitter, Manager}; // Добавлены Emitter и Manager
```

**Примечание:** `Manager` trait нужен для метода `app.state::<T>()`.

---

### 2. Lifetime issue with `State`

```
error[E0521]: borrowed data escapes outside of function
argument requires that `'1` must outlive `'static`
```

**Причина:** `State<'_, AudioState>` имеет ограниченный lifetime и не может быть передан в `thread::spawn`, который требует `'static`.

**Было (неправильно):**
```rust
#[tauri::command]
pub async fn start_audio_level_emitter(
    state: State<'_, AudioState>,  // ❌ Ограниченный lifetime
    app: AppHandle,
) -> Result<String, String> {
    let state_ptr = state.inner().clone();
    
    thread::spawn(move || {
        // ❌ state_ptr не может жить дольше функции
        let capture_guard = state_ptr.capture.lock();
    });
}
```

**Стало (правильно):**
```rust
#[tauri::command]
pub async fn start_audio_level_emitter(
    app: AppHandle,  // ✅ AppHandle можно клонировать
) -> Result<String, String> {
    let app_clone = app.clone();
    
    thread::spawn(move || {
        // ✅ Получаем state из app_clone внутри потока
        let state = app_clone.state::<AudioState>();
        let capture_guard = state.capture.lock();
    });
}
```

---

## Почему это работает?

### AppHandle vs State

| Тип | Lifetime | Клонирование | Использование в потоках |
|-----|----------|--------------|-------------------------|
| `State<'_, T>` | Ограниченный | ❌ Нет | ❌ Нельзя |
| `AppHandle` | `'static` | ✅ Да | ✅ Можно |

### Паттерн для потоков в Tauri

```rust
#[tauri::command]
pub async fn my_command(app: AppHandle) -> Result<String, String> {
    // 1. Клонируем AppHandle
    let app_clone = app.clone();
    
    // 2. Передаем клон в поток
    thread::spawn(move || {
        // 3. Получаем state внутри потока
        let state = app_clone.state::<MyState>();
        
        // 4. Работаем со state
        let data = state.data.lock().unwrap();
    });
    
    Ok("Started".to_string())
}
```

---

## Альтернативные решения (не выбраны)

### 1. Arc<State>
```rust
let state_arc = Arc::new(state);
thread::spawn(move || {
    let state = state_arc.clone();
});
```

**Почему не выбрано:**
- ❌ Не компилируется (State не Clone)
- ❌ Сложнее

### 2. Передача данных напрямую
```rust
let capture = state.capture.lock().unwrap().clone();
thread::spawn(move || {
    // Работаем с capture
});
```

**Почему не выбрано:**
- ❌ Нужно клонировать AudioCapture (может быть дорого)
- ❌ Не получим обновления state

### 3. Использование каналов
```rust
let (tx, rx) = mpsc::channel();
thread::spawn(move || {
    for msg in rx {
        // Обработка
    }
});
```

**Почему не выбрано:**
- ❌ Избыточная сложность
- ❌ AppHandle проще и эффективнее

---

## Итоговый код

```rust
use tauri::{State, AppHandle, Emitter, Manager};

#[tauri::command]
pub async fn start_audio_level_emitter(
    app: AppHandle,
) -> Result<String, String> {
    let state = app.state::<AudioState>();
    let mut is_running = state.level_emitter_running.lock().unwrap();
    
    if *is_running {
        return Ok("Already running".to_string());
    }
    
    *is_running = true;
    drop(is_running);
    
    let is_running_clone = Arc::clone(&state.level_emitter_running);
    let app_clone = app.clone();
    
    thread::spawn(move || {
        while *is_running_clone.lock().unwrap() {
            let state = app_clone.state::<AudioState>();
            
            // Вычисляем уровень
            let level = calculate_level(&state);
            
            // Отправляем событие
            let _ = app_clone.emit("audio-level", level);
            
            thread::sleep(Duration::from_millis(100));
        }
    });
    
    Ok("Started".to_string())
}

#[tauri::command]
pub async fn stop_audio_level_emitter(app: AppHandle) -> Result<String, String> {
    let state = app.state::<AudioState>();
    let mut is_running = state.level_emitter_running.lock().unwrap();
    *is_running = false;
    Ok("Stopped".to_string())
}
```

---

## Проверка

```bash
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

✅ Компилируется без ошибок  
✅ Нет предупреждений  
✅ Lifetime проблемы решены

---

## Уроки

1. **Всегда импортируйте traits** - методы из traits не доступны без импорта
2. **AppHandle для потоков** - используйте `AppHandle` вместо `State` в потоках
3. **Клонируйте AppHandle** - он дешево клонируется и имеет `'static` lifetime
4. **State внутри потока** - получайте state через `app.state::<T>()` внутри потока

---

## Связанные файлы

- `apps/desktop/src-tauri/src/commands.rs` - исправлены lifetime и добавлен Emitter
- `EVENT_DRIVEN_ARCHITECTURE.md` - документация архитектуры
