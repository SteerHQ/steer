# VoiceAssistant MSI Build Script
# This script builds the MSI installer and verifies the output

param(
    [switch]$Clean,
    [switch]$Verify
)

$ErrorActionPreference = "Stop"

Write-Host "=== VoiceAssistant MSI Build Script ===" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✓ Rust: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Rust not found. Install from https://rustup.rs" -ForegroundColor Red
    exit 1
}

# Check Bun
try {
    $bunVersion = bun --version
    Write-Host "✓ Bun: $bunVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Bun not found. Install from https://bun.sh" -ForegroundColor Red
    exit 1
}

# Check WiX
try {
    $wixPath = Get-Command candle.exe -ErrorAction Stop
    Write-Host "✓ WiX Toolset found at: $($wixPath.Source)" -ForegroundColor Green
} catch {
    Write-Host "✗ WiX Toolset not found. Install from https://wixtoolset.org" -ForegroundColor Red
    Write-Host "  Or run: winget install WiXToolset.WiX" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Clean if requested
if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
    if (Test-Path "src-tauri/target") {
        Remove-Item -Recurse -Force "src-tauri/target"
        Write-Host "✓ Cleaned target directory" -ForegroundColor Green
    }
}

# Build the MSI
Write-Host "Building MSI installer..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
Write-Host ""

try {
    bun run tauri build
    Write-Host ""
    Write-Host "✓ Build completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

# Find the MSI file
$msiPath = Get-ChildItem -Path "src-tauri/target/release/bundle/msi" -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1

if (-not $msiPath) {
    Write-Host "✗ MSI file not found in expected location" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Results ===" -ForegroundColor Cyan
Write-Host "MSI Location: $($msiPath.FullName)" -ForegroundColor White

# Get file size
$sizeMB = [math]::Round($msiPath.Length / 1MB, 2)
Write-Host "MSI Size: $sizeMB MB" -ForegroundColor White

# Check size requirement
if ($sizeMB -le 20) {
    Write-Host "✓ Size requirement met (≤ 20MB)" -ForegroundColor Green
} else {
    Write-Host "✗ Size requirement NOT met (> 20MB)" -ForegroundColor Red
    Write-Host "  Consider optimizing dependencies or build settings" -ForegroundColor Yellow
}

# Verify if requested
if ($Verify) {
    Write-Host ""
    Write-Host "=== Verification ===" -ForegroundColor Cyan
    
    # Check MSI properties
    Write-Host "Checking MSI properties..." -ForegroundColor Yellow
    
    try {
        $windowsInstaller = New-Object -ComObject WindowsInstaller.Installer
        $database = $windowsInstaller.GetType().InvokeMember("OpenDatabase", "InvokeMethod", $null, $windowsInstaller, @($msiPath.FullName, 0))
        
        # Get product name
        $view = $database.GetType().InvokeMember("OpenView", "InvokeMethod", $null, $database, @("SELECT Value FROM Property WHERE Property='ProductName'"))
        $view.GetType().InvokeMember("Execute", "InvokeMethod", $null, $view, $null)
        $record = $view.GetType().InvokeMember("Fetch", "InvokeMethod", $null, $view, $null)
        $productName = $record.GetType().InvokeMember("StringData", "GetProperty", $null, $record, 1)
        Write-Host "  Product Name: $productName" -ForegroundColor White
        
        # Get product version
        $view = $database.GetType().InvokeMember("OpenView", "InvokeMethod", $null, $database, @("SELECT Value FROM Property WHERE Property='ProductVersion'"))
        $view.GetType().InvokeMember("Execute", "InvokeMethod", $null, $view, $null)
        $record = $view.GetType().InvokeMember("Fetch", "InvokeMethod", $null, $view, $null)
        $productVersion = $record.GetType().InvokeMember("StringData", "GetProperty", $null, $record, 1)
        Write-Host "  Product Version: $productVersion" -ForegroundColor White
        
        # Get manufacturer
        $view = $database.GetType().InvokeMember("OpenView", "InvokeMethod", $null, $database, @("SELECT Value FROM Property WHERE Property='Manufacturer'"))
        $view.GetType().InvokeMember("Execute", "InvokeMethod", $null, $view, $null)
        $record = $view.GetType().InvokeMember("Fetch", "InvokeMethod", $null, $view, $null)
        $manufacturer = $record.GetType().InvokeMember("StringData", "GetProperty", $null, $record, 1)
        Write-Host "  Manufacturer: $manufacturer" -ForegroundColor White
        
        Write-Host "✓ MSI properties verified" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not verify MSI properties: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Test installation on Windows 10 (1809+) and Windows 11" -ForegroundColor White
Write-Host "2. Verify Start Menu shortcut creation" -ForegroundColor White
Write-Host "3. Verify installation in Program Files" -ForegroundColor White
Write-Host "4. Test application launch and functionality" -ForegroundColor White
Write-Host "5. Test uninstallation and cleanup" -ForegroundColor White
Write-Host ""
Write-Host "To install: msiexec /i `"$($msiPath.FullName)`"" -ForegroundColor Gray
Write-Host "To uninstall: msiexec /x `"$($msiPath.FullName)`"" -ForegroundColor Gray
