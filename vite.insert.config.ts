import { defineConfig } from 'vite'
import path from "path";

export default defineConfig({
  build: {
    emptyOutDir: false,
    minify: true,
    chunkSizeWarningLimit: 10240,
    sourcemap: false,
    lib: {
      entry: [path.resolve(__dirname, "src/insert/main.ts")],
      fileName: () => `insert.js`,
      formats: ["cjs"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    "process.env.NODE_ENV": null,
  },
  // insert script 仅导入 autoLogin 工具函数，不需要 vue/tailwindcss
})
