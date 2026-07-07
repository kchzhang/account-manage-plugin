import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from "path";
// import sourcemaps from 'rollup-plugin-sourcemaps';
// import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  build: {
    emptyOutDir: false,
    // skip code obfuscation
    minify: true,
    // chunk limit is not an issue, this is a browser extension
    chunkSizeWarningLimit: 10240,
    sourcemap: false,
    lib: {
      entry: [path.resolve(__dirname, "src/background/main.ts")],
      fileName: () => `background.js`,
      formats: ['cjs']
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
  plugins: [
    vue(),
  ],
})
