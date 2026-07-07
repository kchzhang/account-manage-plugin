import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { addImportantPlugin } from './postcss-add-important'
import path from "path";
// import sourcemaps from 'rollup-plugin-sourcemaps';
// import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  css: {
    postcss: {
      plugins: [addImportantPlugin()],
    },
  },
  build: {
    emptyOutDir: false,
    // skip code obfuscation
    minify: true,
    // chunk limit is not an issue, this is a browser extension
    chunkSizeWarningLimit: 10240,
    sourcemap: false,
    lib: {
      entry: [path.resolve(__dirname, "src/contentView/main.ts")],
      fileName: () => `content.js`,
      formats: ['cjs']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // 附属文件命名，content script会生成配套的css
          return "content.css";
        },
      },
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
    tailwindcss(),
  ],
})
