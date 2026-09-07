import Rom from 'earthbound-battle-backgrounds/src/rom/rom'
import BackgroundGraphics from 'earthbound-battle-backgrounds/src/rom/background_graphics'
import BackgroundPalette from 'earthbound-battle-backgrounds/src/rom/background_palette'
import backgroundData from 'earthbound-battle-backgrounds/data/truncated_backgrounds.dat?uint8array&base64'
import reference from '../data/reference.json'
import { LayerState, rowOffsets, mix15, expand5 } from './state.js'
export const WIDTH = 256, HEIGHT = 224
export const rom = new Rom(backgroundData)
export const configs = Array.from({length: 327}, (_, i) => Array.from(backgroundData.slice(0xDCA1 + i * 17, 0xDCA1 + (i + 1) * 17)))
const word = (offset) => backgroundData[offset] | backgroundData[offset + 1] << 8
const effects = Array.from({length: 135}, (_, i) => {
  const p = 0xF708 + 17 * i
  return { duration: word(p), type: backgroundData[p+2], frequency: word(p+3), amplitude: word(p+5), phase: backgroundData[p+7], compression: word(p+8), df: word(p+10), da: word(p+12), dp: backgroundData[p+14], dc: word(p+15) }
})
const scrolling = reference.scrolling.map(([duration,vx,vy,ax,ay]) => ({duration,vx,vy,ax,ay}))
const graphicsCache = new Map()
function indexedGraphics(index) {
  if (graphicsCache.has(index)) return graphicsCache.get(index)
  const gfx = rom.getObject(BackgroundGraphics, index)
  const indices = new Uint8Array(256 * 256)
  for (let ty = 0; ty < 32; ty++) for (let tx = 0; tx < 32; tx++) {
    const pos = (ty * 32 + tx) * 2
    const tile = gfx.arrayROMGraphics[pos] | gfx.arrayROMGraphics[pos+1] << 8
    const pixels = gfx.romGraphics.tiles[tile & 1023]
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      indices[(ty*8+y)*256+tx*8+x] = pixels[tile & 0x4000 ? 7-x : x][tile & 0x8000 ? 7-y : y]
    }
  }
  graphicsCache.set(index, indices)
  return indices
}
class Layer {
  constructor(id) {
    if (!Number.isInteger(id) || id < 0 || id >= 327) throw new Error(`Invalid layer ${id}`)
    this.config = configs[id]
    this.indices = indexedGraphics(this.config[0])
    const palette = rom.getObject(BackgroundPalette, this.config[1])
    this.palette = Array.from({length: 1 << this.config[2]}, (_, i) => word(palette.address + i*2))
    this.state = new LayerState(this.config, scrolling, effects)
    this.rows = new Int16Array(HEIGHT)
    this.colors = new Uint16Array(this.palette.length)
  }
  step(frame, alternate, slot) {
    this.state.step()
    if (!alternate || frame % 2 === slot || frame === 0) rowOffsets(this.state, reference.sine, this.rows)
  }
  updatePalette() {
    for (let i = 0; i < this.colors.length; i++) this.colors[i] = this.palette[this.state.paletteIndex(i)] ?? 0
  }
  color(x, y, transparent = false) {
    const s = this.state, type = s.effect.type
    // Type 4 computes an interlaced compression ramp, but the game's DMA
    // still targets horizontal scroll (only type 3 selects vertical DMA).
    const sx = (x + (type !== 0 && type !== 3 ? this.rows[y] : s.x >>> 8)) & 255
    const sy = (y + (type === 3 ? this.rows[y] : s.y >>> 8)) & 255
    const index = this.indices[sy*256+sx]
    if (transparent && index === 0) return -1
    return this.colors[index]
  }
}
export class SceneRenderer {
  constructor(pair, mode = 'authentic') {
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some(id => !Number.isInteger(id) || id < 0 || id >= configs.length)) throw new Error('Expected two layer IDs from 0 to 326')
    if (!['authentic', 'remix'].includes(mode)) throw new Error('Unknown rendering mode')
    this.pair = [...pair]; this.mode = mode
    // In the game's pairing table zero means absent. In remix mode it is an
    // explicitly selectable raw layer. 4bpp first backgrounds occupy one layer.
    this.ids = mode === 'authentic' ? (configs[pair[0]][2] === 4 ? [pair[0]] : pair.filter(id => id !== 0)) : pair
    this.reset()
  }
  reset() {
    this.layers = this.ids.map(id => new Layer(id))
    this.frame = -1
    this.alternate = this.layers.length === 2 && this.layers[1].config[13] !== 0
  }
  render(frame, destination = new Uint8ClampedArray(WIDTH * HEIGHT * 4)) {
    if (!Number.isSafeInteger(frame) || frame < 0) throw new Error('Frame must be a nonnegative integer')
    if (frame < this.frame) this.reset()
    while (this.frame < frame) {
      this.frame++
      this.layers.forEach((layer, slot) => layer.step(this.frame, this.alternate, slot))
    }
    if (destination.length !== WIDTH * HEIGHT * 4) throw new Error('Destination must be 256×224 RGBA8')
    this.layers.forEach(layer => layer.updatePalette())
    for (let y = 0, p = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++, p+=4) {
      const authentic = this.mode === 'authentic'
      let color = Math.max(0, this.layers[0]?.color(x,y,authentic) ?? 0)
      if (this.layers.length === 2) {
        const sub = this.layers[1].color(x,y,authentic)
        // CGADSUB=$64: average BG3/backdrop with BG4. A transparent
        // subscreen selects fixed black and suppresses halving.
        if (sub >= 0) color = mix15(color, sub)
      }
      destination[p] = expand5(color & 31)
      destination[p+1] = expand5((color >>> 5) & 31)
      destination[p+2] = expand5((color >>> 10) & 31)
      destination[p+3] = 255
    }
    return destination
  }
}
export function crossfade(a, b, progress, output) {
  const p = Math.max(0, Math.min(1, progress))
  for (let i = 0; i < output.length; i+=4) {
    for (let c = 0; c < 3; c++) output[i+c] = Math.round(a[i+c] * (1-p) + b[i+c] * p)
    output[i+3] = 255
  }
  return output
}
