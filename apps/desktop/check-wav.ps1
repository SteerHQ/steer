# Quick WAV file checker
param([string]$FilePath = "")

$debugPath = Join-Path $env:USERPROFILE "Documents\VoiceAssistant\debug"

if ($FilePath -eq "") {
    if (Test-Path $debugPath) {
        $latestFile = Get-ChildItem -Path $debugPath -Filter "audio_debug_*.wav" | 
                      Sort-Object LastWriteTime -Descending | 
                      Select-Object -First 1
        
        if ($latestFile) {
            $FilePath = $latestFile.FullName
        } else {
            Write-Host "No WAV files found in $debugPath"
            exit
        }
    } else {
        Write-Host "Debug folder not found: $debugPath"
        exit
    }
}

if (-not (Test-Path $FilePath)) {
    Write-Host "File not found: $FilePath"
    exit
}

Write-Host "`nAnalyzing: $FilePath"
Write-Host ("=" * 60)

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$fileSize = $bytes.Length

Write-Host "File size: $fileSize bytes ($([math]::Round($fileSize/1024, 2)) KB)"

# Check RIFF header
$riff = [System.Text.Encoding]::ASCII.GetString($bytes[0..3])
if ($riff -eq "RIFF") {
    Write-Host "[OK] RIFF header found"
} else {
    Write-Host "[ERROR] Invalid RIFF header: $riff"
    exit
}

# Check WAVE
$wave = [System.Text.Encoding]::ASCII.GetString($bytes[8..11])
if ($wave -eq "WAVE") {
    Write-Host "[OK] WAVE format"
} else {
    Write-Host "[ERROR] Invalid WAVE marker: $wave"
    exit
}

# Read fmt chunk
$fmtPos = 12
$fmtMarker = [System.Text.Encoding]::ASCII.GetString($bytes[$fmtPos..($fmtPos+3)])

if ($fmtMarker -eq "fmt ") {
    $fmtSize = [BitConverter]::ToUInt32($bytes, $fmtPos + 4)
    $audioFormat = [BitConverter]::ToUInt16($bytes, $fmtPos + 8)
    $numChannels = [BitConverter]::ToUInt16($bytes, $fmtPos + 10)
    $sampleRate = [BitConverter]::ToUInt32($bytes, $fmtPos + 12)
    $byteRate = [BitConverter]::ToUInt32($bytes, $fmtPos + 16)
    $blockAlign = [BitConverter]::ToUInt16($bytes, $fmtPos + 20)
    $bitsPerSample = [BitConverter]::ToUInt16($bytes, $fmtPos + 22)
    
    Write-Host "`nAudio Parameters:"
    Write-Host "  Format: $(if ($audioFormat -eq 1) { 'PCM' } else { "Unknown ($audioFormat)" })"
    Write-Host "  Channels: $numChannels"
    Write-Host "  Sample Rate: $sampleRate Hz"
    Write-Host "  Byte Rate: $byteRate bytes/sec"
    Write-Host "  Bits per Sample: $bitsPerSample"
    
    # Find data chunk
    $dataPos = $fmtPos + 8 + $fmtSize
    $dataMarker = [System.Text.Encoding]::ASCII.GetString($bytes[$dataPos..($dataPos+3)])
    
    if ($dataMarker -eq "data") {
        $dataSize = [BitConverter]::ToUInt32($bytes, $dataPos + 4)
        $duration = $dataSize / $byteRate
        
        Write-Host "`nAudio Data:"
        Write-Host "  Data size: $dataSize bytes"
        Write-Host "  Duration: $([math]::Round($duration, 2)) seconds"
        
        if ($dataSize -eq 0) {
            Write-Host "`n[ERROR] NO AUDIO DATA!" -ForegroundColor Red
            Write-Host "Buffer is empty - no sound was captured"
            exit
        }
        
        # Analyze signal
        $dataStart = $dataPos + 8
        $sampleCount = [math]::Min(1000, $dataSize / 2)
        
        $maxAmplitude = 0
        $sumSquares = 0.0
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
                
                $normalized = $sample / 32768.0
                $sumSquares += $normalized * $normalized
            }
        }
        
        $rms = [Math]::Sqrt($sumSquares / $sampleCount)
        $maxPercent = ($maxAmplitude / 32768.0) * 100
        $rmsPercent = $rms * 100
        
        Write-Host "`nSignal Analysis (first $sampleCount samples):"
        Write-Host "  Max amplitude: $maxAmplitude / 32768 ($([math]::Round($maxPercent, 2))%)"
        Write-Host "  RMS level: $([math]::Round($rmsPercent, 2))%"
        Write-Host "  Non-zero samples: $nonZeroSamples / $sampleCount"
        
        Write-Host "`nDiagnosis:"
        
        if ($nonZeroSamples -eq 0) {
            Write-Host "  [ERROR] ALL SAMPLES ARE ZERO (SILENCE)" -ForegroundColor Red
            Write-Host "`nPossible causes:"
            Write-Host "  1. Wrong device selected (not Output/Loopback)"
            Write-Host "  2. Sound not routed to VB-Cable"
            Write-Host "  3. VB-Cable driver not working"
            Write-Host "  4. Device doesn't support loopback capture"
        } elseif ($maxPercent -lt 1) {
            Write-Host "  [WARNING] Very low signal level (< 1%)" -ForegroundColor Yellow
            Write-Host "  Increase volume or check VB-Cable mixer level"
        } elseif ($maxPercent -lt 10) {
            Write-Host "  [WARNING] Low signal level (< 10%)" -ForegroundColor Yellow
            Write-Host "  Consider increasing volume"
        } else {
            Write-Host "  [OK] Signal level is good" -ForegroundColor Green
        }
    } else {
        Write-Host "[ERROR] data chunk not found (found: $dataMarker)"
    }
} else {
    Write-Host "[ERROR] fmt chunk not found (found: $fmtMarker)"
}

Write-Host "`n" + ("=" * 60)
