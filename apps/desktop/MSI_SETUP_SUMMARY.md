# MSI Installer Setup - Implementation Summary

## Task Completed: 12. Настройка MSI installer

All sub-tasks have been successfully implemented:

### ✓ 1. Настроить tauri.conf.json для MSI bundler

**File**: `apps/desktop/src-tauri/tauri.conf.json`

Updated with complete MSI configuration:
- Target set to `["msi"]`
- Windows-specific WiX configuration
- Russian language support (`ru-RU`)
- Product metadata (descriptions, copyright, category)
- License file reference
- Custom WiX template reference

### ✓ 2. Создать WiX template для русской локализации

**File**: `apps/desktop/src-tauri/wix/main.wxs`

Created comprehensive WiX template with:
- Russian language (LCID 1049)
- Product information in Russian
- Custom UI with Russian text
- Proper component structure
- Upgrade support with fixed UpgradeCode
- Registry key management

### ✓ 3. Настроить installer для установки в Program Files

**Configuration in**: `wix/main.wxs`

Installation configured to:
- Install to `C:\Program Files\VoiceAssistant`
- Use per-machine installation scope (requires admin)
- Proper directory structure with INSTALLDIR
- Component placement in Program Files

### ✓ 4. Добавить создание ярлыка в меню Пуск

**Configuration in**: `wix/main.wxs`

Start Menu shortcut configured with:
- Location: Start Menu → VoiceAssistant folder
- Shortcut name: "VoiceAssistant"
- Description: "Голосовой помощник для Windows"
- Icon: Application icon
- Working directory: INSTALLDIR
- Automatic cleanup on uninstall

## Files Created

1. **apps/desktop/src-tauri/wix/main.wxs**
   - Main WiX template with Russian localization
   - Product configuration and component definitions

2. **apps/desktop/src-tauri/wix/license.rtf**
   - Russian language license agreement
   - RTF format with Windows-1251 encoding

3. **apps/desktop/src-tauri/wix/README.md**
   - Documentation for WiX assets
   - Instructions for customizing installer images

4. **apps/desktop/src-tauri/wix/CONFIGURATION.md**
   - Detailed configuration documentation
   - Customization guide
   - Testing checklist

5. **apps/desktop/BUILD.md**
   - Complete build instructions
   - Prerequisites and setup
   - Size optimization details
   - Troubleshooting guide

6. **apps/desktop/build-msi.ps1**
   - PowerShell build script
   - Automated verification
   - Size checking

7. **apps/desktop/MSI_SETUP_SUMMARY.md**
   - This summary document

## Files Modified

1. **apps/desktop/src-tauri/tauri.conf.json**
   - Added complete MSI bundler configuration
   - Added WiX-specific settings
   - Added product metadata

## Requirements Satisfied

### Requirement 6.4
✓ **MSI installer creates shortcut in Start Menu**
- Shortcut created in "VoiceAssistant" folder
- Includes proper icon and description
- Automatic cleanup on uninstall

### Requirement 6.5
✓ **MSI installer installs to Program Files**
- Installation path: `C:\Program Files\VoiceAssistant`
- Per-machine installation scope
- Proper Windows integration

## Build Instructions

To build the MSI installer:

```powershell
# Using Tauri CLI
cd apps/desktop
bun run tauri build

# Using the build script (with verification)
cd apps/desktop
.\build-msi.ps1 -Verify
```

Output location:
```
apps/desktop/src-tauri/target/release/bundle/msi/VoiceAssistant_1.0.0_x64_ru-RU.msi
```

## Size Optimization

The configuration includes optimizations to meet the ≤ 20MB requirement:

**Rust Compiler** (already configured in Cargo.toml):
- `opt-level = "z"` - Optimize for size
- `lto = true` - Link-time optimization
- `strip = true` - Remove debug symbols
- `codegen-units = 1` - Better optimization

## Testing Recommendations

Before deployment, test the installer on:

1. **Windows 10** (version 1809 or higher)
   - Clean installation
   - Upgrade from previous version
   - Uninstallation

2. **Windows 11** (all versions)
   - Clean installation
   - Upgrade from previous version
   - Uninstallation

Verify:
- [ ] Installation completes successfully
- [ ] Files installed to `C:\Program Files\VoiceAssistant`
- [ ] Start Menu shortcut created
- [ ] Application launches from Start Menu
- [ ] Entry appears in Add/Remove Programs
- [ ] Uninstallation removes all files
- [ ] Registry keys cleaned up after uninstall
- [ ] MSI size ≤ 20MB

## Next Steps

The MSI installer is now fully configured. To proceed:

1. Build the MSI using the instructions above
2. Test on target Windows versions
3. Verify all requirements are met
4. Deploy to users

## Notes

- The WiX template uses a fixed UpgradeCode to enable automatic upgrades
- Russian localization is applied throughout the installer
- The license agreement must be accepted before installation
- Administrator privileges are required for installation
- The installer supports silent installation: `msiexec /i VoiceAssistant.msi /quiet`
