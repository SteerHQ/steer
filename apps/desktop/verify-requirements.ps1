# Verification Script for VoiceAssistant Requirements
# This script helps verify requirements 5.1-5.4, 6.2-6.3

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "VoiceAssistant Verification Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Function to check Windows version
function Test-WindowsVersion {
    Write-Host "Checking Windows Version..." -ForegroundColor Yellow
    
    $osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
    $version = $osInfo.Version
    $caption = $osInfo.Caption
    
    Write-Host "OS: $caption" -ForegroundColor Green
    Write-Host "Version: $version" -ForegroundColor Green
    
    # Parse version
    $versionParts = $version.Split('.')
    $majorVersion = [int]$versionParts[0]
    $buildNumber = [int]$versionParts[2]
    
    # Check Windows 10 1809+ (build 17763+)
    if ($majorVersion -eq 10 -and $buildNumber -ge 17763) {
        Write-Host "✅ Windows 10 version 1809 or higher detected" -ForegroundColor Green
        return $true
    }
    # Check Windows 11 (build 22000+)
    elseif ($majorVersion -eq 10 -and $buildNumber -ge 22000) {
        Write-Host "✅ Windows 11 detected" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "❌ Windows version not supported (requires Windows 10 1809+ or Windows 11)" -ForegroundColor Red
        return $false
    }
}

# Function to check for audio files in temp directories
function Test-NoAudioFiles {
    Write-Host ""
    Write-Host "Checking for audio files in temp directories..." -ForegroundColor Yellow
    
    $tempDirs = @(
        $env:TEMP,
        $env:APPDATA,
        $env:LOCALAPPDATA
    )
    
    $audioExtensions = @("*.wav", "*.mp3", "*.webm", "*.pcm", "*.raw")
    $foundFiles = @()
    
    foreach ($dir in $tempDirs) {
        if (Test-Path $dir) {
            foreach ($ext in $audioExtensions) {
                $files = Get-ChildItem -Path $dir -Filter $ext -Recurse -ErrorAction SilentlyContinue | 
                         Where-Object { $_.Name -match "voice|assistant" }
                
                if ($files) {
                    $foundFiles += $files
                }
            }
        }
    }
    
    if ($foundFiles.Count -eq 0) {
        Write-Host "✅ No audio files found in temp directories" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "❌ Found audio files:" -ForegroundColor Red
        foreach ($file in $foundFiles) {
            Write-Host "  - $($file.FullName)" -ForegroundColor Red
        }
        return $false
    }
}

# Function to check for temporary data files
function Test-NoTempFiles {
    Write-Host ""
    Write-Host "Checking for temporary data files..." -ForegroundColor Yellow
    
    $appDir = Get-Location
    $forbiddenExtensions = @("*.dat", "*.bin", "*.cache", "*.tmp")
    $foundFiles = @()
    
    foreach ($ext in $forbiddenExtensions) {
        $files = Get-ChildItem -Path $appDir -Filter $ext -Recurse -ErrorAction SilentlyContinue |
                 Where-Object { 
                     $_.FullName -notmatch "target|node_modules|\.git" -and
                     $_.Name -notmatch "^\..*"
                 }
        
        if ($files) {
            $foundFiles += $files
        }
    }
    
    if ($foundFiles.Count -eq 0) {
        Write-Host "✅ No temporary data files found" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "❌ Found temporary files:" -ForegroundColor Red
        foreach ($file in $foundFiles) {
            Write-Host "  - $($file.FullName)" -ForegroundColor Red
        }
        return $false
    }
}

# Function to check log directory
function Test-LogDirectory {
    Write-Host ""
    Write-Host "Checking log directory..." -ForegroundColor Yellow
    
    $logDir = Join-Path $env:APPDATA "VoiceAssistant\logs"
    
    if (Test-Path $logDir) {
        Write-Host "Log directory exists: $logDir" -ForegroundColor Green
        
        $files = Get-ChildItem -Path $logDir -File
        $nonLogFiles = $files | Where-Object { $_.Extension -ne ".log" }
        
        if ($nonLogFiles.Count -eq 0) {
            Write-Host "✅ Only log files found in log directory" -ForegroundColor Green
            
            # Check log file sizes
            $largeFiles = $files | Where-Object { $_.Length -gt 10MB }
            if ($largeFiles.Count -eq 0) {
                Write-Host "✅ All log files are within size limits" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "⚠️ Some log files are larger than 10MB:" -ForegroundColor Yellow
                foreach ($file in $largeFiles) {
                    Write-Host "  - $($file.Name): $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Yellow
                }
                return $true
            }
        }
        else {
            Write-Host "❌ Non-log files found in log directory:" -ForegroundColor Red
            foreach ($file in $nonLogFiles) {
                Write-Host "  - $($file.Name)" -ForegroundColor Red
            }
            return $false
        }
    }
    else {
        Write-Host "ℹ️ Log directory does not exist yet (will be created on first run)" -ForegroundColor Cyan
        return $true
    }
}

# Function to check VB-Cable installation
function Test-VBCable {
    Write-Host ""
    Write-Host "Checking VB-Cable installation..." -ForegroundColor Yellow
    
    # Get audio devices
    $devices = Get-CimInstance -ClassName Win32_SoundDevice | Select-Object -ExpandProperty Name
    
    $vbCableFound = $devices | Where-Object { $_ -match "VB-Cable|CABLE" }
    
    if ($vbCableFound) {
        Write-Host "✅ VB-Cable device found: $vbCableFound" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "❌ VB-Cable device not found" -ForegroundColor Red
        Write-Host "   Please install VB-Cable from: https://vb-audio.com/Cable/" -ForegroundColor Yellow
        return $false
    }
}

# Function to check network endpoints (requires manual verification)
function Show-NetworkVerification {
    Write-Host ""
    Write-Host "Network Endpoint Verification (Manual)" -ForegroundColor Yellow
    Write-Host "To verify that data is sent only to OpenAI API:" -ForegroundColor Cyan
    Write-Host "1. Install Wireshark or Fiddler" -ForegroundColor White
    Write-Host "2. Start network capture" -ForegroundColor White
    Write-Host "3. Run VoiceAssistant and process audio" -ForegroundColor White
    Write-Host "4. Filter for HTTPS traffic" -ForegroundColor White
    Write-Host "5. Verify only these endpoints are called:" -ForegroundColor White
    Write-Host "   - https://api.openai.com/v1/audio/transcriptions" -ForegroundColor Green
    Write-Host "   - https://api.openai.com/v1/chat/completions" -ForegroundColor Green
    Write-Host "6. Verify NO other external endpoints are called" -ForegroundColor White
}

# Function to check overlay window (requires manual verification)
function Show-OverlayVerification {
    Write-Host ""
    Write-Host "Overlay Window Verification (Manual)" -ForegroundColor Yellow
    Write-Host "To verify overlay window behavior:" -ForegroundColor Cyan
    Write-Host "1. Launch VoiceAssistant" -ForegroundColor White
    Write-Host "2. Trigger a response to display overlay" -ForegroundColor White
    Write-Host "3. Verify overlay appears in bottom-right corner" -ForegroundColor White
    Write-Host "4. Measure offset from screen edges (should be 20px)" -ForegroundColor White
    Write-Host "5. Start timer and verify overlay disappears after 10 seconds" -ForegroundColor White
    Write-Host "6. Test on multiple monitor configurations if available" -ForegroundColor White
}

# Function to run Rust integration tests
function Test-RustIntegration {
    Write-Host ""
    Write-Host "Running Rust integration tests..." -ForegroundColor Yellow
    
    $tauriDir = Join-Path (Get-Location) "src-tauri"
    
    if (Test-Path $tauriDir) {
        Push-Location $tauriDir
        
        Write-Host "Running: cargo test --test integration_verification" -ForegroundColor Cyan
        cargo test --test integration_verification
        
        $exitCode = $LASTEXITCODE
        Pop-Location
        
        if ($exitCode -eq 0) {
            Write-Host "✅ Rust integration tests passed" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ Rust integration tests failed" -ForegroundColor Red
            return $false
        }
    }
    else {
        Write-Host "⚠️ Tauri directory not found, skipping Rust tests" -ForegroundColor Yellow
        return $true
    }
}

# Main execution
Write-Host "Starting verification checks..." -ForegroundColor Cyan
Write-Host ""

$results = @{
    "Windows Version" = Test-WindowsVersion
    "No Audio Files" = Test-NoAudioFiles
    "No Temp Files" = Test-NoTempFiles
    "Log Directory" = Test-LogDirectory
    "VB-Cable" = Test-VBCable
}

# Show manual verification instructions
Show-NetworkVerification
Show-OverlayVerification

# Run Rust tests if available
$results["Rust Tests"] = Test-RustIntegration

# Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

foreach ($key in $results.Keys) {
    if ($results[$key]) {
        Write-Host "✅ $key" -ForegroundColor Green
        $passed++
    }
    else {
        Write-Host "❌ $key" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "✅ All automated checks passed!" -ForegroundColor Green
    Write-Host "⚠️ Please complete manual verification steps above" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "❌ Some checks failed. Please review the errors above." -ForegroundColor Red
}

Write-Host ""
Write-Host "For detailed verification checklist, see: VERIFICATION_CHECKLIST.md" -ForegroundColor Cyan
