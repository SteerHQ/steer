import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

/**
 * Решает проблему загрузки ort-wasm-simd-threaded.*.mjs в dev и build.
 *
 * В dev режиме onnxruntime-web (внутри prebundle @ricky0123_vad-web.js) делает
 * динамический import() с URL относительно import.meta.url (.vite/deps/),
 * где файлов нет. Перехватываем эти HTTP-запросы и отдаём файлы из public/.
 *
 * В production build патчим new URL('ort-wasm-*.mjs', import.meta.url) → '/ort-wasm-*.mjs'
 * чтобы Rolldown не копировал WASM в dist/assets/.
 */
function ortWasmPlugin(): Plugin {
  const publicDir = resolve(__dirname, "public");

  const WASM_URL_RE =
    /new URL\(["']([^"']*ort-wasm[^"']*)["']\s*,\s*import\.meta\.url\)/g;
  const replacer = (_m: string, filename: string) =>
    JSON.stringify(`/${filename}`);

  return {
    name: "ort-wasm",
    enforce: "pre",

    // Dev: middleware перехватывает запросы к ort-wasm .mjs/.wasm из любого URL
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        // Убираем query string
        const pathname = url.split("?")[0];
        const basename = pathname.split("/").pop() ?? "";

        if (
          basename.startsWith("ort-wasm-simd-threaded") &&
          (basename.endsWith(".mjs") || basename.endsWith(".wasm"))
        ) {
          const filePath = resolve(publicDir, basename);
          try {
            const content = readFileSync(filePath);
            const mime = basename.endsWith(".mjs")
              ? "text/javascript"
              : "application/wasm";
            res.setHeader("Content-Type", mime);
            res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
            res.end(content);
            return;
          } catch {
            // файл не найден — передаём дальше
          }
        }
        next();
      });
    },

    // Build: патчим new URL(...) чтобы Rolldown не копировал WASM в assets/
    transform(code, id) {
      if (
        id.includes("onnxruntime-web") &&
        code.includes("ort-wasm-simd-threaded")
      ) {
        return code.replace(WASM_URL_RE, replacer);
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    ortWasmPlugin(),
  ],
  // @ricky0123/vad-web — CJS, нужен prebundle (CJS → ESM)
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
