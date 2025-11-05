# ⚡ Быстрые команды для тестирования аудио

Набор команд для быстрой проверки и отладки аудио устройств.

---

## 🔍 Проверка устройств

### Список всех аудио устройств
```powershell
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.Status -eq "OK"} | Format-Table -AutoSize
```

### Проверка Stereo Mix
```powershell
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*Stereo Mix*"}
```

### Проверка VoiceMeeter
```powershell
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*VoiceMeeter*"}
```

### Проверка VB-Cable
```powershell
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*VB-Cable*"}
```

---

## 🔧 Управление аудио службой

### Проверка статуса
```powershell
Get-Service -Name "Audiosrv" | Select-Object Status, StartType
```

### Перезапуск службы
```powershell
Restart-Service -Name "Audiosrv" -Force
```

### Запуск службы
```powershell
Start-Service -Name "Audiosrv"
```

### Остановка службы
```powershell
Stop-Service -Name "Audiosrv"
```

---

## 📊 Анализ WAV файлов

### Проверка последнего файла
```powershell
.\check-wav.ps1
```

### Проверка конкретного файла
```powershell
.\check-wav.ps1 "C:\Users\...\audio_debug_20241104_153045.wav"
```

### Полная диагностика
```powershell
.\diagnose-audio.ps1
```

### Сохранить диагностику в файл
```powershell
.\diagnose-audio.ps1 > diagnosis.txt
```

---

## 🎯 Быстрые тесты

### Тест 1: Проверка Stereo Mix
```powershell
# 1. Проверить наличие
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*Stereo Mix*"}

# 2. Если найден - включить в настройках звука
# Параметры звука → Управление устройствами → Stereo Mix → Включить

# 3. Проверить в приложении
# Открыть "🔧 Отладка" → Выбрать "Stereo Mix" → Начать захват
```

### Тест 2: Проверка VoiceMeeter
```powershell
# 1. Проверить установку
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*VoiceMeeter*"}

# 2. Если не найден - установить
# https://vb-audio.com/Voicemeeter/

# 3. Перезагрузить компьютер

# 4. Проверить снова
Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*VoiceMeeter*"}
```

### Тест 3: Проверка записи
```powershell
# 1. Запустить приложение
cd apps/desktop
bun run tauri:dev

# 2. Открыть компонент отладки (кнопка "🔧 Отладка")

# 3. Выбрать устройство и начать захват

# 4. Воспроизвести музыку

# 5. Проверить уровень аудио (должен быть > 10%)

# 6. Сохранить WAV

# 7. Проанализировать
.\check-wav.ps1
```

---

## 🐛 Отладка проблем

### Проблема: Устройство не найдено
```powershell
# 1. Проверить все устройства
Get-PnpDevice -Class "AudioEndpoint" | Format-Table -AutoSize

# 2. Перезапустить аудио службу
Restart-Service -Name "Audiosrv" -Force

# 3. Проверить снова
Get-PnpDevice -Class "AudioEndpoint" | Format-Table -AutoSize
```

### Проблема: Буфер пустой
```powershell
# 1. Проверить, что устройство включено
# Параметры звука → Управление устройствами

# 2. Проверить уровень громкости
# Микшер громкости (Win+G)

# 3. Проверить, что звук идет через устройство
# Параметры звука → Устройство вывода по умолчанию
```

### Проблема: Низкий уровень сигнала
```powershell
# 1. Увеличить громкость источника

# 2. Увеличить громкость устройства
# Микшер громкости (Win+G)

# 3. Проверить настройки устройства
# Параметры звука → Свойства устройства → Уровень
```

---

## 📝 Логи и диагностика

### Просмотр логов приложения
```powershell
Get-Content "$env:USERPROFILE\AppData\Local\VoiceAssistant\logs\*.log" -Tail 50
```

### Просмотр логов в реальном времени
```powershell
Get-Content "$env:USERPROFILE\AppData\Local\VoiceAssistant\logs\*.log" -Wait -Tail 10
```

### Очистка логов
```powershell
Remove-Item "$env:USERPROFILE\AppData\Local\VoiceAssistant\logs\*.log"
```

### Очистка отладочных файлов
```powershell
Remove-Item "$env:USERPROFILE\Documents\VoiceAssistant\debug\*.wav"
```

---

## 🔄 Сброс настроек

### Сброс аудио службы
```powershell
Stop-Service -Name "Audiosrv" -Force
Start-Sleep -Seconds 2
Start-Service -Name "Audiosrv"
```

### Переустановка VoiceMeeter
```powershell
# 1. Удалить через "Установка и удаление программ"

# 2. Перезагрузить компьютер

# 3. Скачать заново: https://vb-audio.com/Voicemeeter/

# 4. Установить

# 5. Перезагрузить компьютер
```

---

## 📊 Мониторинг

### Мониторинг CPU
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*VoiceAssistant*"} | Select-Object ProcessName, CPU, WorkingSet
```

### Мониторинг памяти
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*VoiceAssistant*"} | Select-Object ProcessName, @{Name="Memory(MB)";Expression={[math]::Round($_.WorkingSet / 1MB, 2)}}
```

---

## 🎯 Автоматизация

### Скрипт полной проверки
```powershell
# Создайте файл: test-audio-full.ps1

Write-Host "=== Проверка аудио устройств ===" -ForegroundColor Cyan

# 1. Проверка Stereo Mix
Write-Host "`n1. Stereo Mix:" -ForegroundColor Yellow
$stereoMix = Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*Stereo Mix*"}
if ($stereoMix) {
    Write-Host "   [OK] Найден: $($stereoMix.FriendlyName)" -ForegroundColor Green
} else {
    Write-Host "   [X] Не найден" -ForegroundColor Red
}

# 2. Проверка VoiceMeeter
Write-Host "`n2. VoiceMeeter:" -ForegroundColor Yellow
$voiceMeeter = Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*VoiceMeeter*"}
if ($voiceMeeter) {
    Write-Host "   [OK] Найден: $($voiceMeeter.FriendlyName)" -ForegroundColor Green
} else {
    Write-Host "   [X] Не найден" -ForegroundColor Red
}

# 3. Проверка VB-Cable
Write-Host "`n3. VB-Cable:" -ForegroundColor Yellow
$vbCable = Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.FriendlyName -like "*VB-Cable*"}
if ($vbCable) {
    Write-Host "   [OK] Найден: $($vbCable.FriendlyName)" -ForegroundColor Green
} else {
    Write-Host "   [X] Не найден" -ForegroundColor Red
}

# 4. Проверка аудио службы
Write-Host "`n4. Аудио служба:" -ForegroundColor Yellow
$audioService = Get-Service -Name "Audiosrv"
if ($audioService.Status -eq "Running") {
    Write-Host "   [OK] Запущена" -ForegroundColor Green
} else {
    Write-Host "   [X] Не запущена" -ForegroundColor Red
}

# 5. Рекомендации
Write-Host "`n=== Рекомендации ===" -ForegroundColor Cyan
if ($stereoMix) {
    Write-Host "✅ Используйте Stereo Mix (самый простой вариант)" -ForegroundColor Green
} elseif ($voiceMeeter) {
    Write-Host "✅ Используйте VoiceMeeter (стабильный вариант)" -ForegroundColor Green
} elseif ($vbCable) {
    Write-Host "⚠️ VB-Cable найден, но рекомендуем VoiceMeeter" -ForegroundColor Yellow
} else {
    Write-Host "❌ Установите VoiceMeeter: https://vb-audio.com/Voicemeeter/" -ForegroundColor Red
}
```

### Запуск скрипта
```powershell
.\test-audio-full.ps1
```

---

## 📚 Дополнительные ресурсы

- [AUDIO-QUICK-FIX.md](AUDIO-QUICK-FIX.md) - Быстрое решение
- [AUDIO-ALTERNATIVES.md](AUDIO-ALTERNATIVES.md) - Сравнение вариантов
- [HOW-TO-DEBUG.md](HOW-TO-DEBUG.md) - Отладка
- [README-DEBUG.md](README-DEBUG.md) - Компонент отладки

---

**Создано:** 2024-11-04  
**Версия:** 1.0
