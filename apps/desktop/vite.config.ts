import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Плагин предотвращает копирование ORT WASM/MJS файлов в dist/assets/.
 * ORT использует `new URL('ort-wasm-*.mjs', import.meta.url)` — Vite это
 * перехватывает и копирует файл в assets/. Мы заменяем это на прямой URL
 * из корня, где файлы уже лежат из public/.
 */
function ortWasmPublicPathPlugin(): Plugin {
  return {
    name: "ort-wasm-public-path",
    transform(code, id) {
      if (
        id.includes("onnxruntime-web") &&
        code.includes("ort-wasm-simd-threaded")
      ) {
        // Заменяем new URL('ort-wasm-*.mjs', import.meta.url) → прямую строку
        // чтобы Rollup не копировал файл в assets/
        return code.replace(
          /new URL\(["']([^"']*ort-wasm[^"']*)["']\s*,\s*import\.meta\.url\)/g,
          (_match, filename) => JSON.stringify(`/${filename}`),
        );
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
  // Не оптимизировать onnxruntime-web через Vite prebundling —
  // ORT загружает WASM через fetch/динамический import и должен брать
  // файлы из корня сервера (public/), а не из node_modules/.vite/deps/
  optimizeDeps: {
    exclude: ["onnxruntime-web", "@ricky0123/vad-web"],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Заголовки для SharedArrayBuffer (нужен ORT threaded WASM)
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
