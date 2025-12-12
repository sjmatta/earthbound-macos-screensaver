import { defineConfig } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'

export default defineConfig({
  base: './',
  plugins: [arraybuffer()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/main.js',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'screensaver.js',
      }
    }
  },
  resolve: {
    alias: {
      '@upstream': './upstream/src'
    }
  }
})
