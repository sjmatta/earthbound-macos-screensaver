import { build } from 'vite'
import arraybuffer from 'vite-plugin-arraybuffer'
// Bundle the same source used by WKWebView without a DOM or different engine.
export async function loadRenderer() {
  const result = await build({
    configFile: false, logLevel: 'error', plugins: [arraybuffer()],
    build: { write: false, minify: false, lib: {entry: 'src/renderer/renderer.js', formats: ['es']}, rolldownOptions: {output: {codeSplitting: false}} }
  })
  const output = (Array.isArray(result) ? result[0] : result).output.find(o => o.type === 'chunk')
  return import(`data:text/javascript;base64,${Buffer.from(output.code).toString('base64')}`)
}
