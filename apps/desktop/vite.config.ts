import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
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
    // Enable tree-shaking and code splitting optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunk
          vendor: ["react", "react-dom"],
          // Split zustand state management
          store: ["zustand"],
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining threshold (10kb)
    assetsInlineLimit: 10240,
  },
});
