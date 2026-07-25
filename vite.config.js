import { defineConfig } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'

// Remove type="module" and crossorigin from script tags so the bundle
// works correctly when loaded via file:// URLs in WKWebView (macOS screensaver).
// Module scripts enforce CORS which silently fails on file:// origins.
// Build only: the dev server serves over http:// and genuinely needs the module
// script, so stripping it there breaks `task dev` with "Cannot use import
// statement outside a module".
function fileUrlCompatPlugin() {
  return {
    name: 'file-url-compat',
    apply: 'build',
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
