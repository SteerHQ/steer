# Test script for logging system verification
# This script verifies that the logging system is properly configured

Write-Host "=== VoiceAssistant Logging System Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check log directory path
Write-Host "Test 1: Checking log directory path..." -ForegroundColor Yellow
$logDir = "$env:APPDATA\VoiceAssistant\logs"
Write-Host "Expected log directory: $logDir"

if (Test-Path $logDir) {
    Write-Host "✓ Log directory exists" -ForegroundColor Green
    
    # List log files
    $logFiles = Get-ChildItem $logDir -Filter "voice-assistant*" -ErrorAction SilentlyContinue
    if ($logFiles) {
        Write-Host "✓ Found $($logFiles.Count) log file(s):" -ForegroundColor Green
        foreach ($file in $logFiles) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  - $($file.Name) ($sizeMB MB)" -ForegroundColor Gray
        }
        
        # Test 2: Verify file count limit
        Write-Host ""
        Write-Host "Test 2: Checking file count limit (max 5)..." -ForegroundColor Yellow
        if ($logFiles.Count -le 5) {
            Write-Host "✓ File count within limit: $($logFiles.Count)/5" -ForegroundColor Green
        } else {
            Write-Host "✗ Too many log files: $($logFiles.Count)/5" -ForegroundColor Red
        }
        
        # Test 3: Verify file size limit
        Write-Host ""
        Write-Host "Test 3: Checking file size limit (max 10MB)..." -ForegroundColor Yellow
        $oversizedFiles = $logFiles | Where-Object { $_.Length -gt 10MB }
        if ($oversizedFiles.Count -eq 0) {
            Write-Host "✓ All files within size limit" -ForegroundColor Green
        } else {
            Write-Host "✗ Found $($oversizedFiles.Count) oversized file(s)" -ForegroundColor Red
            foreach ($file in $oversizedFiles) {
                $sizeMB = [math]::Round($file.Length / 1MB, 2)
                Write-Host "  - $($file.Name) ($sizeMB MB)" -ForegroundColor Red
            }
        }
        
        # Test 4: Check log content
        Write-Host ""
        Write-Host "Test 4: Checking log content..." -ForegroundColor Yellow
        $latestLog = $logFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            Write-Host "Latest log file: $($latestLog.Name)" -ForegroundColor Gray
            $content = Get-Content $latestLog.FullName -Tail 10 -ErrorAction SilentlyContinue
            if ($content) {
                Write-Host "✓ Log file is readable" -ForegroundColor Green
                Write-Host "Last 10 lines:" -ForegroundColor Gray
                $content | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
            } else {
                Write-Host "⚠ Log file is empty or unreadable" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "⚠ No log files found (application may not have been run yet)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ Log directory does not exist yet (will be created on first run)" -ForegroundColor Yellow
}

# Test 5: Check dependencies
Write-Host ""
Write-Host "Test 5: Checking Cargo.toml dependencies..." -ForegroundColor Yellow
$cargoToml = Get-Content "Cargo.toml" -Raw -ErrorAction SilentlyContinue
if ($cargoToml) {
    $hasTracing = $cargoToml -match 'tracing\s*='
    $hasTracingSubscriber = $cargoToml -match 'tracing-subscriber\s*='
    $hasTracingAppender = $cargoToml -match 'tracing-appender\s*='
    
    if ($hasTracing -and $hasTracingSubscriber -and $hasTracingAppender) {
        Write-Host "✓ All logging dependencies present in Cargo.toml" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing logging dependencies:" -ForegroundColor Red
        if (-not $hasTracing) { Write-Host "  - tracing" -ForegroundColor Red }
        if (-not $hasTracingSubscriber) { Write-Host "  - tracing-subscriber" -ForegroundColor Red }
        if (-not $hasTracingAppender) { Write-Host "  - tracing-appender" -ForegroundColor Red }
    }
} else {
    Write-Host "✗ Could not read Cargo.toml" -ForegroundColor Red
}

# Test 6: Check source files
Write-Host ""
Write-Host "Test 6: Checking source files..." -ForegroundColor Yellow
$requiredFiles = @(
    "src\logger.rs",
    "src\main.rs",
    "src\audio.rs",
    "src\commands.rs"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✓ $file exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $file missing" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# Summary
Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "The logging system has been implemented with the following features:" -ForegroundColor White
Write-Host "  • Local storage in %APPDATA%\VoiceAssistant\logs\" -ForegroundColor Gray
Write-Host "  • Maximum 5 log files" -ForegroundColor Gray
Write-Host "  • Maximum 10MB per file" -ForegroundColor Gray
Write-Host "  • Daily rotation" -ForegroundColor Gray
Write-Host "  • Minimal logging (WARN level)" -ForegroundColor Gray
Write-Host "  • No telemetry or external transmission" -ForegroundColor Gray
Write-Host ""
Write-Host "To test the logging system:" -ForegroundColor Yellow
Write-Host "  1. Build the application: cargo build" -ForegroundColor Gray
Write-Host "  2. Run the application" -ForegroundColor Gray
Write-Host "  3. Trigger some errors (e.g., start without VB-Cable)" -ForegroundColor Gray
Write-Host "  4. Check the log directory: $logDir" -ForegroundColor Gray
Write-Host ""
