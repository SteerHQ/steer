import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Патчит new URL('ort-wasm-*.mjs', import.meta.url) → '/ort-wasm-*.mjs'
 * в коде onnxruntime-web, чтобы Rolldown/Rollup не копировал WASM в dist/assets/.
 * Файлы уже лежат в public/ и попадают в корень dist/ автоматически.
 * Работает и при production build (transform hook), и при dev prebundle
 * (через optimizeDeps.rolldownOptions.plugins).
 */
function ortWasmPublicPathPlugin(): Plugin {
  const WASM_URL_RE =
    /new URL\(["']([^"']*ort-wasm[^"']*)["']\s*,\s*import\.meta\.url\)/g;
  const replacer = (_m: string, filename: string) =>
    JSON.stringify(`/${filename}`);

  const patchTransform = {
    name: "ort-wasm-public-path-inner",
    transform(code: string, id: string) {
      if (id.includes("onnxruntime-web") && code.includes("ort-wasm-simd-threaded")) {
        return { code: code.replace(WASM_URL_RE, replacer) };
      }
      return null;
    },
  };

  return {
    name: "ort-wasm-public-path",
    // Применяем патч при prebundle (Vite 8 использует Rolldown)
    config() {
      return {
        optimizeDeps: {
          rolldownOptions: {
            plugins: [patchTransform],
          },
        },
      };
    },
    // Применяем патч при production build (Rolldown/Rollup)
    transform(code, id) {
      if (id.includes("onnxruntime-web") && code.includes("ort-wasm-simd-threaded")) {
        return code.replace(WASM_URL_RE, replacer);
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    ortWasmPublicPathPlugin(),
  ],
  // @ricky0123/vad-web — CJS, нужен prebundle (CJS → ESM).
  // onnxruntime-web тоже prebundle — наш плагин патчит new URL(...) при prebundle.
  optimizeDeps: {
    include: ["@ricky0123/vad-web"],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Заголовки для SharedArrayBuffer (требуется ORT threaded WASM)
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor-react";
            }
            if (id.includes("zustand")) {
              return "vendor-store";
            }
            return "vendor";
          }
        },
      },
    },
    chunkSizeWarningLimit: 2500,
    cssCodeSplit: true,
    assetsInlineLimit: 10240,
  },
});
