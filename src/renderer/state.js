// Integer state transitions transcribed from ebsrc GENERATE_BATTLEBG_FRAME.
// frame 0 is the first initialization update. Drawing never advances state.
export const u16 = n => n & 65535
export const s16 = n => (n << 16) >> 16
export const mod = (n, m) => ((n % m) + m) % m
export const SIMULATION_HZ = 60
export function frameAt(milliseconds) {
  return Math.max(0, Math.floor(milliseconds * SIMULATION_HZ / 1000 + 1e-7))
}
export class Sequence {
  constructor(ids, table) {
    this.ids = ids
    this.table = table
    this.index = 0
    this.remaining = 1
    this.current = null
  }
  step() {
    if (!this.remaining || --this.remaining) return false
    this.index = (this.index + 1) & 3
    if (!this.ids[this.index]) this.index = 0
    const id = this.ids[this.index]
    if (!id) return false
    this.current = this.table[id]
    if (!this.current) throw new Error(`Missing sequence entry ${id}`)
    this.remaining = this.current.duration
    return true
  }
}
export class LayerState {
  constructor(config, scrolling, effects) {
    this.config = config
    this.scroll = new Sequence(config.slice(9, 13), scrolling)
    this.distortion = new Sequence(config.slice(13, 17), effects)
    this.x = this.y = this.vx = this.vy = this.ax = this.ay = 0
    this.effect = { type: 0, frequency: 0, amplitude: 0, phase: 0, compression: 0, df: 0, da: 0, dp: 0, dc: 0 }
    this.paletteStep = 0
    this.paletteCountdown = 1
    this.paletteRotation = 0
  }
  step() {
    if (this.paletteCountdown && --this.paletteCountdown === 0) {
      this.paletteCountdown = this.config[8]
      this.paletteRotation = this.paletteStep++
    }
    if (this.scroll.step()) {
      const s = this.scroll.current
      this.vx = s.vx; this.vy = s.vy; this.ax = s.ax; this.ay = s.ay
    }
    this.vx = u16(this.vx + this.ax); this.vy = u16(this.vy + this.ay)
    this.x = u16(this.x + this.vx); this.y = u16(this.y + this.vy)
    if (this.distortion.step()) this.effect = { ...this.distortion.current }
    const e = this.effect
    if (e.type) {
      e.frequency = u16(e.frequency + e.df)
      e.amplitude = u16(e.amplitude + e.da)
      e.phase = (e.phase + e.dp) & 255
      e.compression = u16(e.compression + e.dc)
    }
  }
  paletteIndex(index) {
    const c = this.config, type = c[3], step = this.paletteRotation
    const cycle = (start, end, reverse) => {
      const size = end - start + 1
      if (size <= 0 || index < start || index > end) return index
      if (!reverse) return start + mod(index - start - step, size)
      const p = mod(index - start + step, size * 2)
      return start + (p < size ? p : size * 2 - 1 - p)
    }
    // The game writes cycle 2 first, then cycle 1 (cycle 1 wins overlaps).
    if (type >= 1 && type <= 3 && index >= c[4] && index <= c[5]) return cycle(c[4], c[5], type === 3)
    if (type === 2) return cycle(c[6], c[7], false)
    return index
  }
}
// PREPARE_BG_OFFSET_TABLES uses a signed 8-bit sine lookup and the middle
// product bytes of Mode 7's multiplier, not floating-point Math.sin.
export function rowOffsets(state, sine, result) {
  const e = state.effect, x = state.x >>> 8, y = state.y >>> 8
  const vertical = e.type >= 3
  const interlaced = e.type === 2 || e.type === 4
  let phase = ((e.phase + (vertical ? 0 : y)) & 255) << 8
  let compression = y << 8
  for (let row = 0; row < result.length; row++) {
    const wave = sine[(phase >>> 8) & 255]
    const signedWave = wave >= 128 ? wave - 256 : wave
    const offset = Math.floor((e.amplitude >>> 8) * signedWave / 256)
    const signedOffset = interlaced && row % 2 ? -offset : offset
    compression = u16(compression + e.compression)
    result[row] = vertical ? (compression >>> 8) + signedOffset : x + signedOffset
    phase = u16(phase + e.frequency)
  }
  return result
}
export function mix15(a, b) {
  return (((a & 31) + (b & 31)) >>> 1) |
    (((((a >>> 5) & 31) + ((b >>> 5) & 31)) >>> 1) << 5) |
    (((((a >>> 10) & 31) + ((b >>> 10) & 31)) >>> 1) << 10)
}
export const expand5 = n => (n << 3) | (n >>> 2)
