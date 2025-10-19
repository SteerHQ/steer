# Voice Assistant Desktop App

This is the Tauri-based desktop application for Voice Assistant Overlay.

## Prerequisites

Before running this application, ensure you have the following installed:

1. **Rust** - Install from [rustup.rs](https://rustup.rs/)
2. **Bun.js** - Already configured as the package manager
3. **Visual Studio C++ Build Tools** (Windows) - Required for Tauri

## Setup

1. Install dependencies:
```bash
bun install
```

2. Run in development mode:
```bash
bun run tauri:dev
```

3. Build for production:
```bash
bun run tauri:build
```

## Project Structure

```
apps/desktop/
├── src/                  # React frontend source
│   ├── App.tsx          # Main React component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles
├── src-tauri/           # Rust backend
│   ├── src/
│   │   └── main.rs      # Tauri main entry point
│   ├── Cargo.toml       # Rust dependencies
│   ├── tauri.conf.json  # Tauri configuration
│   └── build.rs         # Build script
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
└── package.json         # Node dependencies
```

## Configuration

The Tauri window is configured with the following properties:
- **alwaysOnTop**: true - Window stays on top of all other windows
- **transparent**: true - Transparent background for overlay effect
- **skipTaskbar**: true - Doesn't appear in taskbar
- **decorations**: false - No window frame/title bar

These settings are defined in `src-tauri/tauri.conf.json`.

## Development Notes

- The frontend runs on port 1420 during development
- Hot reload is enabled for both React and Rust code
- Build output is optimized for size (target: ≤ 20MB)
# steer
