# Tauri Desktop Application Setup - Complete ✓

## Task 2: Настройка Tauri desktop приложения

All sub-tasks have been completed successfully:

### ✓ Инициализировать Tauri проект в apps/desktop

Created complete Tauri project structure:
- `src-tauri/` directory with Rust backend
- `src-tauri/Cargo.toml` - Rust dependencies and build configuration
- `src-tauri/build.rs` - Tauri build script
- `src-tauri/src/main.rs` - Main Rust entry point
- `src-tauri/.gitignore` - Git ignore for Rust target directory

### ✓ Настроить tauri.conf.json с overlay window конфигурацией

Created `src-tauri/tauri.conf.json` with the following overlay configurations:
- **alwaysOnTop: true** - Window stays on top of all applications
- **transparent: true** - Transparent background for overlay effect
- **skipTaskbar: true** - Window doesn't appear in Windows taskbar
- **decorations: false** - No window frame or title bar
- **resizable: false** - Fixed window size
- **width: 400, height: 200** - Initial window dimensions

Additional configurations:
- MSI bundler target for Windows installation
- Russian language support (ru-RU)
- Security settings configured
- Build optimization settings

### ✓ Создать базовую Rust структуру в src-tauri/

Created Rust project structure:
- `Cargo.toml` with dependencies:
  - tauri 1.5 with shell-open feature
  - serde for serialization
  - tokio for async operations
- Release profile optimizations:
  - `lto = true` - Link-time optimization
  - `opt-level = "z"` - Optimize for size
  - `strip = true` - Strip debug symbols
  - Target: ≤ 20MB final size
- `main.rs` with basic Tauri application setup
- Icon placeholders in `icons/` directory

### ✓ Настроить Vite для React frontend

Updated `vite.config.ts` with:
- React plugin configured
- Development server on port 1420
- Strict port enforcement
- Tauri-specific environment variables (VITE_, TAURI_)
- Build optimizations:
  - Target: ES2021, Chrome 100, Safari 13
  - Conditional minification based on debug mode
  - Source maps for debugging
  - Output to `dist/` directory
- Watch configuration to ignore src-tauri changes

Additional frontend setup:
- `src/main.tsx` - React entry point with CSS import
- `src/App.tsx` - Main application component
- `src/index.css` - Global styles with transparent background support
- `index.html` - HTML entry with Russian language support

## Requirements Satisfied

- **Requirement 7.1**: ✓ Uses Tauri framework for desktop application
- **Requirement 4.1**: ✓ Overlay window configured with topmost priority and transparency

## Next Steps

To run the application:
1. Install Rust from https://rustup.rs/
2. Run `bun install` to install dependencies
3. Run `bun run tauri:dev` for development
4. Run `bun run tauri:build` to create MSI installer

## Files Created/Modified

### Created:
- apps/desktop/src-tauri/Cargo.toml
- apps/desktop/src-tauri/tauri.conf.json
- apps/desktop/src-tauri/build.rs
- apps/desktop/src-tauri/src/main.rs
- apps/desktop/src-tauri/.gitignore
- apps/desktop/src-tauri/icons/* (placeholders)
- apps/desktop/src/index.css
- apps/desktop/README.md

### Modified:
- apps/desktop/vite.config.ts (added build output and watch config)
- apps/desktop/src/main.tsx (added CSS import)

## Notes

- Icon files are currently placeholders and should be replaced with actual PNG/ICO/ICNS files before production build
- Rust toolchain must be installed to build and run the application
- The transparent overlay window configuration is ready for UI components to be added in subsequent tasks
