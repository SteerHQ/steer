# Скрипт для проверки VB Cable устройств
# Использование: .\check-vb-cable.ps1

Write-Host "=== Проверка VB Cable устройств ===" -ForegroundColor Cyan
Write-Host ""

# Проверка установки VB Cable
Write-Host "1. Проверка установленных аудио устройств..." -ForegroundColor Yellow
$devices = Get-PnpDevice -Class "AudioEndpoint" | Where-Object {$_.Status -eq "OK"}
$vbCableDevices = $devices | Where-Object {$_.FriendlyName -like "*Cable*"}

if ($vbCableDevices.Count -eq 0) {
    Write-Host "   ❌ VB Cable не найден!" -ForegroundColor Red
    Write-Host "   Установите VB Cable: https://vb-audio.com/Cable/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
} else {
    Write-Host "   ✅ Найдено VB Cable устройств: $($vbCableDevices.Count)" -ForegroundColor Green
    foreach ($device in $vbCableDevices) {
        Write-Host "      - $($device.FriendlyName)" -ForegroundColor Gray
    }
}

Write-Host ""

# Проверка аудио службы
Write-Host "2. Проверка аудио службы Windows..." -ForegroundColor Yellow
$audioService = Get-Service -Name "Audiosrv"
if ($audioService.Status -eq "Running") {
    Write-Host "   ✅ Аудио служба работает" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Аудио служба не запущена: $($audioService.Status)" -ForegroundColor Yellow
    Write-Host "   Попробуйте перезапустить: Restart-Service -Name 'Audiosrv' -Force" -ForegroundColor Gray
}

Write-Host ""

# Инструкции
Write-Host "=== Как использовать VB Cable ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Для записи С МИКРОФОНА:" -ForegroundColor Yellow
Write-Host "  1. В приложении выберите: CABLE Output (VB-Audio Virtual Cable) (Input)" -ForegroundColor White
Write-Host "  2. Настройте микрофон на вывод в CABLE Input" -ForegroundColor White
Write-Host ""
Write-Host "Для записи СИСТЕМНОГО ЗВУКА:" -ForegroundColor Yellow
Write-Host "  1. В приложении выберите: CABLE Output (VB-Audio Virtual Cable) (Output/Loopback)" -ForegroundColor White
Write-Host "  2. Установите CABLE Input как устройство воспроизведения по умолчанию" -ForegroundColor White
Write-Host ""
Write-Host "Подробная документация:" -ForegroundColor Cyan
Write-Host "  - МИКРОФОН-VB-CABLE.md (краткая инструкция)" -ForegroundColor Gray
Write-Host "  - VB-CABLE-MICROPHONE.md (полная инструкция)" -ForegroundColor Gray
Write-Host ""
