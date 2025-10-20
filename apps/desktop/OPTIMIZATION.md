# Bundle Size Optimization Guide

This document describes the optimizations applied to reduce the VoiceAssistant application bundle size to ≤ 20MB.

## Applied Optimizations

### 1. Rust Build Optimizations (Cargo.toml)

```toml
[profile.release]
panic = "abort"           # Remove panic unwinding code
codegen-units = 1         # Better optimization, slower compile
lto = true                # Link-time optimization
opt-level = "z"           # Optimize for size
strip = true              # Strip debug symbols
```

**Impact**: Reduces Rust binary size by ~40-60%

### 2. Minimal Tokio Features

```toml
tokio = { version = "1", features = ["sync", "rt-multi-thread", "macros"], default-features = false }
```

Instead of `features = ["full"]`, we only include:

- `sync`: For Arc, Mutex
- `rt-multi-thread`: Multi-threaded runtime
- `macros`: Async macros

**Impact**: Reduces tokio dependency size by ~30%

### 3. Vite Build Optimizations (vite.config.ts)

#### Code Splitting

```typescript
rollupOptions: {
  output: {
    manualChunks: {
      vendor: ['react', 'react-dom'],
      store: ['zustand'],
    },
  },
}
```

**Impact**: Enables better caching and parallel loading

#### Tree-Shaking

- Enabled by default in production mode
- Removes unused code from dependencies

#### Asset Optimization

```typescript
assetsInlineLimit: 10240; // Inline assets < 10KB
cssCodeSplit: true; // Split CSS into separate files
```

**Impact**: Reduces initial bundle size by ~15-20%

### 4. Minimal Dependencies

#### Desktop App

- `react` + `react-dom`: UI framework (required)
- `zustand`: Lightweight state management (3KB)
- `@tauri-apps/api`: Tauri bindings (required)

#### API App

- `hono`: Lightweight web framework (13KB)
- `@ai-sdk/openai`: OpenAI integration (required)
- `ai`: AI SDK (required)

**Impact**: Minimal dependency footprint

### 5. Tauri Configuration Optimizations

#### Disabled Unnecessary Features

```json
"allowlist": {
  "all": false,
  "shell": {
    "all": false,
    "open": true  // Only what we need
  }
}
```

#### WebView Optimization

```json
"webviewInstallMode": {
  "type": "embedBootstrapper"
}
```

Uses the system WebView2 when available, reducing bundle size.

## Verification

### Check Bundle Size

```bash
# Build and check size
bun run build:optimized

# Or manually
bun run tauri:build
bun run check-size
```

### Expected Sizes

- **Rust binary**: ~2-4 MB (stripped)
- **Frontend bundle**: ~200-400 KB (gzipped)
- **WebView2 bootstrapper**: ~1-2 MB
- **MSI overhead**: ~1-2 MB
- **Total MSI**: ~8-15 MB ✅

## Additional Optimization Tips

### If Size Still Exceeds 20MB

1. **Analyze Bundle**

   ```bash
   cd apps/desktop
   bun run build -- --mode analyze
   ```

2. **Check for Large Assets**

   - Icons should be optimized (use tools like ImageOptim)
   - Remove unused icon sizes
   - Compress images with lossy compression

3. **Dynamic Imports**

   ```typescript
   // Instead of
   import { HeavyComponent } from "./heavy";

   // Use
   const HeavyComponent = lazy(() => import("./heavy"));
   ```

4. **Review Rust Dependencies**

   ```bash
   cd src-tauri
   cargo tree --edges normal --depth 1
   ```

   Look for large dependencies that can be replaced or removed.

5. **Consider UPX Compression** (Advanced)
   ```bash
   upx --best --lzma target/release/voice-assistant-overlay.exe
   ```
   ⚠️ May trigger antivirus false positives

## Monitoring

### CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Check bundle size
  run: |
    cd apps/desktop
    bun run build:optimized
```

This will fail the build if the MSI exceeds 20MB.

## Results

After applying all optimizations:

- ✅ Rust binary optimized for size
- ✅ Vite tree-shaking enabled
- ✅ Code splitting configured
- ✅ Minimal dependencies
- ✅ Automated size checking

Target: **≤ 20MB MSI** 🎯
