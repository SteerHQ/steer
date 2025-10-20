# VoiceAssistant Build Instructions

## Building the MSI Installer

### Prerequisites

1. **Rust toolchain** (1.70+)
   ```powershell
   rustup update stable
   ```

2. **Bun.js** package manager
   ```powershell
   # Install from https://bun.sh
   ```

3. **WiX Toolset v3** (for MSI creation)
   ```powershell
   # Download from https://wixtoolset.org/releases/
   # Or install via winget:
   winget install WiXToolset.WiX
   ```

4. **Visual Studio Build Tools** (for Rust compilation)
   - Install "Desktop development with C++" workload

### Build Commands

#### Development Build
```powershell
cd apps/desktop
bun run tauri dev
```

#### Production MSI Build
```powershell
cd apps/desktop
bun run tauri build
```

The MSI installer will be created at:
```
apps/desktop/src-tauri/target/release/bundle/msi/VoiceAssistant_1.0.0_x64_ru-RU.msi
```

### Build Configuration

The MSI installer is configured with:

- **Language**: Russian (ru-RU)
- **Install Location**: `C:\Program Files\VoiceAssistant`
- **Start Menu Shortcut**: Yes (in "VoiceAssistant" folder)
- **Target Size**: ≤ 20MB (optimized with LTO and strip)
- **Scope**: Per-machine installation
- **Upgrade Support**: Automatic upgrade from previous versions

### Size Optimization

The following optimizations are applied to meet the 20MB size requirement:

1. **Rust Compiler Flags** (Cargo.toml):
   - `opt-level = "z"` - Optimize for size
   - `lto = true` - Link-time optimization
   - `strip = true` - Remove debug symbols
   - `codegen-units = 1` - Better optimization

2. **Frontend Build** (Vite):
   - Tree-shaking enabled
   - Code splitting
   - Minification

3. **Dependencies**:
   - Minimal external crates
   - Only essential features enabled

### Customizing the Installer

#### Changing the License
Edit `src-tauri/wix/license.rtf` with your license text in RTF format.

#### Customizing Installer UI
Replace the following files in `src-tauri/wix/`:
- `dialog.bmp` - Dialog background (493x312px, 24-bit BMP)
- `banner.bmp` - Top banner (493x58px, 24-bit BMP)

#### Modifying Install Location
Edit `src-tauri/wix/main.wxs` and change the `INSTALLDIR` directory structure.

### Verification

After building, verify:

1. **MSI Size**: Should be ≤ 20MB
   ```powershell
   Get-Item "src-tauri/target/release/bundle/msi/*.msi" | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
   ```

2. **Installation**: Test on clean Windows 10 (1809+) and Windows 11
   - Install via MSI
   - Verify Start Menu shortcut
   - Verify installation in Program Files
   - Test application launch
   - Uninstall and verify cleanup

3. **Upgrade**: Test upgrade from previous version
   - Install older version
   - Install newer version
   - Verify settings are preserved

### Troubleshooting

#### WiX Not Found
Ensure WiX Toolset is installed and `candle.exe` / `light.exe` are in PATH:
```powershell
$env:PATH += ";C:\Program Files (x86)\WiX Toolset v3.11\bin"
```

#### Build Size Too Large
- Check dependencies in Cargo.toml
- Verify release profile settings
- Use `cargo bloat --release` to analyze binary size

#### Russian Characters Not Displaying
- Ensure license.rtf uses Windows-1251 encoding
- Verify Language="1049" in main.wxs (Russian LCID)
