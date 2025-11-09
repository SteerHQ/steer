# WASAPI Loopback Implementation

## Что сделано

Добавлена поддержка **WASAPI Loopback** - встроенной функции Windows для захвата системного аудио без виртуальных устройств.

## Изменения

### 1. Новые файлы

- `apps/desktop/src-tauri/src/audio_wasapi.rs` - реализация WASAPI Loopback
- `apps/desktop/WASAPI-GUIDE.md` - подробное руководство
- `apps/desktop/WASAPI-QUICKSTART.md` - быстрый старт

### 2. Обновленные файлы

- `apps/desktop/src-tauri/Cargo.toml` - добавлена зависимость `windows`
- `apps/desktop/src-tauri/src/audio.rs` - добавлен enum `CaptureBackend` с поддержкой WASAPI
- `apps/desktop/src-tauri/src/main.rs` - добавлен модуль `audio_wasapi`
- `apps/desktop/src-tauri/src/commands.rs` - WASAPI Loopback добавлен в список устройств
- `README.md` - обновлена документация

## Архитектура

```rust
pub enum CaptureBackend {
    Cpal {
        device: Device,
        buffer: Arc<Mutex<Vec<u8>>>,
        is_capturing: Arc<Mutex<bool>>,
    },
    #[cfg(windows)]
    Wasapi(WasapiCapture),
}

pub struct AudioCapture {
    backend: CaptureBackend,
    sample_rate: u32,
}
```

## Использование

```rust
// Создать WASAPI capture
let capture = AudioCapture::new("WASAPI Loopback")?;

// Или использовать CPAL с конкретным устройством
let capture = AudioCapture::new("VB-Cable")?;
```

## Технические детали

### WASAPI Loopback

- Использует Windows API напрямую через `windows-rs`
- Захватывает аудио из `eRender` endpoint в режиме loopback
- Работает в отдельном потоке
- Конвертирует float32 в int16 PCM mono
- Поддерживает любое количество каналов

### Формат аудио

- **Входной формат**: Float32, любое количество каналов
- **Выходной формат**: Int16 PCM Mono
- **Частота**: Автоматически определяется из системы (обычно 48000 Hz)
- **Буфер**: До 10 секунд

## Преимущества

1. ✅ Не требует установки драйверов
2. ✅ Работает на всех Windows 10/11
3. ✅ Захватывает все системное аудио
4. ✅ Более стабильно чем виртуальные устройства
5. ✅ Лучшее качество звука

## Совместимость

- Windows Vista+ (WASAPI доступен с Vista)
- Рекомендуется Windows 10/11
- Fallback на CPAL для других устройств

## Тестирование

```bash
cd apps/desktop/src-tauri
cargo check  # Проверка компиляции
cargo build  # Сборка
```

## Документация

- [WASAPI-QUICKSTART.md](apps/desktop/WASAPI-QUICKSTART.md) - быстрый старт
- [WASAPI-GUIDE.md](apps/desktop/WASAPI-GUIDE.md) - подробное руководство
- [README.md](README.md) - общая документация

## Следующие шаги

1. Протестировать с Zoom/Google Meet
2. Добавить UI для выбора WASAPI Loopback
3. Добавить индикатор активного захвата
4. Оптимизировать производительность

---

**Реализовано**: WASAPI Loopback для захвата системного аудио без виртуальных устройств
