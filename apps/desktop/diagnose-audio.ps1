# Диагностика проблем с записью аудио

Write-Host "`n🔍 ДИАГНОСТИКА АУДИО ЗАПИСИ" -ForegroundColor Cyan
Write-Host "=" * 60

# 1. Проверка папки отладки
Write-Host "`n📁 Проверка папки отладки..." -ForegroundColor Yellow
$debugPath = Join-Path $env:USERPROFILE "Documents\VoiceAssistant\debug"

if (Test-Path $debugPath) {
    Write-Host "✅ Папка существует: $debugPath" -ForegroundColor Green
    
    $files = Get-ChildItem -Path $debugPath -Filter "audio_debug_*.wav" | Sort-Object LastWriteTime -Descending
    
    if ($files.Count -gt 0) {
        Write-Host "✅ Найдено файлов: $($files.Count)" -ForegroundColor Green
        Write-Host "`nПоследние 3 файла:" -ForegroundColor Cyan
        
        $files | Select-Object -First 3 | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1024, 2)
            Write-Host "  - $($_.Name) ($sizeKB KB) - $($_.LastWriteTime)" -ForegroundColor Gray
        }
        
        # Анализ последнего файла
        $latestFile = $files[0]
        Write-Host "`n📊 Анализ последнего файла: $($latestFile.Name)" -ForegroundColor Cyan
        
        $bytes = [System.IO.File]::ReadAllBytes($latestFile.FullName)
        $fileSize = $bytes.Length
        
        Write-Host "  Размер файла: $fileSize байт ($([math]::Round($fileSize/1024, 2)) KB)"
        
        # Проверка RIFF заголовка
        $riff = [System.Text.Encoding]::ASCII.GetString($bytes[0..3])
        if ($riff -eq "RIFF") {
            Write-Host "  ✅ RIFF заголовок: OK" -ForegroundColor Green
        } else {
            Write-Host "  ❌ RIFF заголовок: НЕВЕРНЫЙ ($riff)" -ForegroundColor Red
        }
        
        # Проверка WAVE
        $wave = [System.Text.Encoding]::ASCII.GetString($bytes[8..11])
        if ($wave -eq "WAVE") {
            Write-Host "  ✅ WAVE формат: OK" -ForegroundColor Green
        } else {
            Write-Host "  ❌ WAVE формат: НЕВЕРНЫЙ ($wave)" -ForegroundColor Red
        }
        
        # Чтение параметров
        $fmtPos = 12
        $fmtMarker = [System.Text.Encoding]::ASCII.GetString($bytes[$fmtPos..($fmtPos+3)])
        
        if ($fmtMarker -eq "fmt ") {
            $numChannels = [BitConverter]::ToUInt16($bytes, $fmtPos + 10)
            $sampleRate = [BitConverter]::ToUInt32($bytes, $fmtPos + 12)
            $bitsPerSample = [BitConverter]::ToUInt16($bytes, $fmtPos + 22)
            
            Write-Host "  Каналы: $numChannels"
            Write-Host "  Частота: $sampleRate Hz"
            Write-Host "  Бит/сэмпл: $bitsPerSample"
            
            # Найти data chunk
            $fmtSize = [BitConverter]::ToUInt32($bytes, $fmtPos + 4)
            $dataPos = $fmtPos + 8 + $fmtSize
            $dataMarker = [System.Text.Encoding]::ASCII.GetString($bytes[$dataPos..($dataPos+3)])
            
            if ($dataMarker -eq "data") {
                $dataSize = [BitConverter]::ToUInt32($bytes, $dataPos + 4)
                Write-Host "  Размер данных: $dataSize байт"
                
                if ($dataSize -eq 0) {
                    Write-Host "  ❌ ПРОБЛЕМА: Нет аудио данных!" -ForegroundColor Red
                } else {
                    # Анализ первых сэмплов
                    $dataStart = $dataPos + 8
                    $sampleCount = [math]::Min(1000, $dataSize / 2)
                    
                    $maxAmplitude = 0
                    $nonZeroSamples = 0
                    
                    for ($i = 0; $i -lt $sampleCount; $i++) {
                        $samplePos = $dataStart + ($i * 2)
                        if ($samplePos + 1 -lt $bytes.Length) {
                            $sample = [BitConverter]::ToInt16($bytes, $samplePos)
                            $amplitude = [Math]::Abs($sample)
                            
                            if ($amplitude -gt $maxAmplitude) {
                                $maxAmplitude = $amplitude
                            }
                            
                            if ($sample -ne 0) {
                                $nonZeroSamples++
                            }
                        }
                    }
                    
                    $maxPercent = ($maxAmplitude / 32768.0) * 100
                    $nonZeroPercent = ($nonZeroSamples / $sampleCount) * 100
                    
                    Write-Host "`n  📈 Анализ сигнала (первые $sampleCount сэмплов):" -ForegroundColor Cyan
                    Write-Host "    Макс. амплитуда: $maxAmplitude / 32768 ($([math]::Round($maxPercent, 2))%)"
                    Write-Host "    Ненулевых сэмплов: $nonZeroSamples / $sampleCount ($([math]::Round($nonZeroPercent, 2))%)"
                    
                    # Диагностика
                    Write-Host "`n  🔍 Диагноз:" -ForegroundColor Magenta
                    
                    if ($nonZeroSamples -eq 0) {
                        Write-Host "    ❌ ВСЕ СЭМПЛЫ РАВНЫ НУЛЮ (ТИШИНА)" -ForegroundColor Red
                        Write-Host "    Возможные причины:" -ForegroundColor Yellow
                        Write-Host "      1. Неправильное устройство выбрано" -ForegroundColor Gray
                        Write-Host "      2. Звук не направлен на VB-Cable" -ForegroundColor Gray
                        Write-Host "      3. Драйвер VB-Cable не работает" -ForegroundColor Gray
                        Write-Host "      4. Устройство не поддерживает loopback" -ForegroundColor Gray
                    } elseif ($maxPercent -lt 1) {
                        Write-Host "    ⚠️  ОЧЕНЬ НИЗКИЙ УРОВЕНЬ СИГНАЛА (< 1%)" -ForegroundColor Yellow
                        Write-Host "    Рекомендации:" -ForegroundColor Yellow
                        Write-Host "      1. Увеличьте громкость источника" -ForegroundColor Gray
                        Write-Host "      2. Проверьте уровень VB-Cable в микшере" -ForegroundColor Gray
                    } elseif ($maxPercent -lt 10) {
                        Write-Host "    ⚠️  Низкий уровень сигнала (< 10%)" -ForegroundColor Yellow
                        Write-Host "    Рекомендуется увеличить громкость" -ForegroundColor Gray
                    } else {
                        Write-Host "    ✅ УРОВЕНЬ СИГНАЛА В НОРМЕ" -ForegroundColor Green
                    }
                }
            } else {
                Write-Host "  ❌ data chunk не найден (найден: $dataMarker)" -ForegroundColor Red
            }
        } else {
            Write-Host "  ❌ fmt chunk не найден (найден: $fmtMarker)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Нет WAV файлов в папке отладки" -ForegroundColor Red
        Write-Host "   Запустите приложение и сохраните аудио" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Папка отладки не найдена: $debugPath" -ForegroundColor Red
}

# 2. Проверка аудио устройств
Write-Host "`n`n🎧 Проверка аудио устройств..." -ForegroundColor Yellow

try {
    $devices = Get-PnpDevice -Class "AudioEndpoint" -Status "OK" -ErrorAction SilentlyContinue
    
    if ($devices) {
        Write-Host "✅ Найдено аудио устройств: $($devices.Count)" -ForegroundColor Green
        
        $vbCable = $devices | Where-Object { $_.FriendlyName -like "*VB-Cable*" -or $_.FriendlyName -like "*CABLE*" }
        
        if ($vbCable) {
            Write-Host "✅ VB-Cable найден:" -ForegroundColor Green
            $vbCable | ForEach-Object {
                Write-Host "  - $($_.FriendlyName) (Status: $($_.Status))" -ForegroundColor Gray
            }
        } else {
            Write-Host "❌ VB-Cable НЕ НАЙДЕН" -ForegroundColor Red
            Write-Host "   Установите VB-Cable: https://vb-audio.com/Cable/" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Не удалось получить список устройств" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Ошибка при проверке устройств: $_" -ForegroundColor Yellow
}

# 3. Проверка аудио службы
Write-Host "`n`n🔧 Проверка аудио службы..." -ForegroundColor Yellow

try {
    $audioService = Get-Service -Name "Audiosrv" -ErrorAction SilentlyContinue
    
    if ($audioService) {
        if ($audioService.Status -eq "Running") {
            Write-Host "✅ Аудио служба работает" -ForegroundColor Green
        } else {
            Write-Host "❌ Аудио служба НЕ РАБОТАЕТ (Status: $($audioService.Status))" -ForegroundColor Red
            Write-Host "   Запустите: Restart-Service -Name 'Audiosrv' -Force" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Не удалось проверить аудио службу" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Ошибка при проверке службы: $_" -ForegroundColor Yellow
}

# 4. Рекомендации
Write-Host "`n`n💡 РЕКОМЕНДАЦИИ" -ForegroundColor Cyan
Write-Host "=" * 60

Write-Host "`n1. Если все сэмплы равны нулю:" -ForegroundColor Yellow
Write-Host "   - Выберите устройство с '(Output/Loopback)' в компоненте отладки"
Write-Host "   - Убедитесь, что звук воспроизводится через VB-Cable"
Write-Host "   - Установите VB-Cable как устройство по умолчанию"

Write-Host "`n2. Если низкий уровень сигнала:" -ForegroundColor Yellow
Write-Host "   - Увеличьте громкость источника звука"
Write-Host "   - Проверьте уровень VB-Cable в микшере Windows (Win+G)"
Write-Host "   - Отключите подавление шума"

Write-Host "`n3. Если VB-Cable не найден:" -ForegroundColor Yellow
Write-Host "   - Скачайте: https://vb-audio.com/Cable/"
Write-Host "   - Установите и перезагрузите компьютер"
Write-Host "   - Проверьте в 'Параметры звука' Windows"

Write-Host "`n4. Перезапуск аудио службы:" -ForegroundColor Yellow
Write-Host "   Restart-Service -Name 'Audiosrv' -Force"

Write-Host "`n" + ("=" * 60)
Write-Host ""
