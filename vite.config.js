import { defineConfig } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'

// Remove type="module" and crossorigin from script tags so the bundle
// works correctly when loaded via file:// URLs in WKWebView (macOS screensaver).
// Module scripts enforce CORS which silently fails on file:// origins.
function fileUrlCompatPlugin() {
  return {
    name: 'file-url-compat',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/ type="module"/g, '')
        .replace(/ crossorigin/g, '')
    }
  }
}

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [arraybuffer(), fileUrlCompatPlugin()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    codeSplitting: false,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'screensaver.js',
      }
    }
  }
})
