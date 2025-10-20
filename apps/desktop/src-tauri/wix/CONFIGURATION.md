# MSI Installer Configuration

## Overview

The MSI installer for VoiceAssistant has been configured with Russian localization and proper Windows integration.

## Configuration Details

### Installation Settings

- **Install Location**: `C:\Program Files\VoiceAssistant`
- **Install Scope**: Per-machine (requires administrator privileges)
- **Language**: Russian (ru-RU, LCID 1049)
- **Upgrade Behavior**: Automatic upgrade from previous versions

### Start Menu Integration

A shortcut is automatically created in the Start Menu:
- **Location**: Start Menu → VoiceAssistant → VoiceAssistant
- **Description**: "Голосовой помощник для Windows"
- **Icon**: Application icon from the executable

### Registry Keys

The installer creates the following registry entry:
- **Path**: `HKEY_CURRENT_USER\Software\VoiceAssistant`
- **Key**: `installed`
- **Value**: `1` (integer)
- **Purpose**: Track installation state and enable proper uninstallation

### License Agreement

The installer displays a Russian-language license agreement (RTF format) that users must accept before installation.

Key points in the license:
- Audio capture through VB-Cable
- Data sent to OpenAI API
- No local storage of audio data
- User responsibility for OpenAI API costs

### Installer UI

The installer uses the WixUI_InstallDir dialog set with:
- Custom license agreement
- Installation directory selection
- Progress indicators
- Optional "Launch application" checkbox on completion

### Product Information

- **Product Name**: VoiceAssistant
- **Version**: 1.0.0
- **Manufacturer**: VoiceAssistant
- **Product Icon**: Application icon
- **Help Link**: https://github.com/voiceassistant
- **Upgrade Code**: A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D (fixed for upgrade support)

## File Structure

```
src-tauri/wix/
├── main.wxs           # Main WiX template with Russian localization
├── license.rtf        # Russian license agreement
├── README.md          # Asset documentation
└── CONFIGURATION.md   # This file
```

## Requirements Met

This configuration satisfies the following requirements:

### Requirement 6.4
✓ MSI installer creates shortcut in Start Menu (меню Пуск)

### Requirement 6.5
✓ MSI installer installs to Program Files directory

### Additional Features

- Russian language support throughout the installer
- Proper upgrade/downgrade handling
- Clean uninstallation with registry cleanup
- Launch application option after installation
- Product icon in Add/Remove Programs

## Customization

### Changing the Upgrade Code

If you need to prevent automatic upgrades (force side-by-side installation), change the `UpgradeCode` in `main.wxs`:

```xml
<Product UpgradeCode="NEW-GUID-HERE">
```

Generate a new GUID using PowerShell:
```powershell
[guid]::NewGuid().ToString().ToUpper()
```

### Modifying Install Location

To change the default installation directory, edit the `Directory` structure in `main.wxs`:

```xml
<Directory Id="ProgramFiles64Folder">
  <Directory Id="INSTALLDIR" Name="YourAppName">
```

### Adding More Shortcuts

To add desktop or other shortcuts, add new `Shortcut` elements in the `ApplicationShortcut` component.

## Build Process

The MSI is built automatically when running:
```powershell
bun run tauri build
```

Or use the provided build script:
```powershell
.\build-msi.ps1 -Verify
```

## Testing Checklist

- [ ] Install on clean Windows 10 (1809+)
- [ ] Install on clean Windows 11
- [ ] Verify installation in `C:\Program Files\VoiceAssistant`
- [ ] Verify Start Menu shortcut exists
- [ ] Launch application from Start Menu
- [ ] Check Add/Remove Programs entry
- [ ] Test upgrade from previous version
- [ ] Test uninstallation
- [ ] Verify registry cleanup after uninstall
- [ ] Verify no files left after uninstall

## Troubleshooting

### Installer Fails to Start

- Ensure WiX Toolset v3 is installed
- Check that `candle.exe` and `light.exe` are in PATH
- Verify all referenced files exist (icons, license.rtf)

### Russian Characters Display Incorrectly

- Ensure `license.rtf` uses Windows-1251 encoding
- Verify `Language="1049"` in main.wxs
- Check that RTF file has proper charset declaration

### Upgrade Doesn't Work

- Verify `UpgradeCode` is the same across versions
- Check that version number is incremented
- Ensure `MajorUpgrade` element is present in main.wxs

### Start Menu Shortcut Not Created

- Verify `ApplicationProgramsFolder` directory is defined
- Check that `ApplicationShortcut` component is referenced
- Ensure `RemoveFolder` element is present for cleanup
