export function normalizeSettings(input = {}) {
  const ids = values => Array.isArray(values) ? [...new Set(values.filter(v => typeof v === 'string' && /^\d+:\d+$/.test(v)))] : []
  return {
    mode: input.mode === 'remix' ? 'remix' : 'authentic',
    scale: ['pixels', '4:3', 'fill'].includes(input.scale) ? input.scale : '4:3',
    interval: Math.min(300, Math.max(5, Number(input.interval) || 60)),
    showLayerNames: input.showLayerNames !== false,
    favoritesOnly: input.favoritesOnly === true,
    favorites: ids(input.favorites), excluded: ids(input.excluded)
  }
}
export class ShuffleBag {
  constructor(random = Math.random) { this.random = random; this.bag = []; this.last = null }
  next(items) {
    if (!items.length) return null
    if (!this.bag.length || this.bag.some(v => !items.includes(v))) {
      this.bag = [...items]
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i+1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
      }
      if (this.bag.length > 1 && this.bag.at(-1) === this.last) [this.bag[0], this.bag[this.bag.length-1]] = [this.bag.at(-1), this.bag[0]]
    }
    this.last = this.bag.pop()
    return this.last
  }
}
export function eligibleScenes(scenes, settings) {
  const allowed = scenes.filter(s => !settings.excluded.includes(s.id))
  const favorites = allowed.filter(s => settings.favorites.includes(s.id))
  return settings.favoritesOnly && favorites.length ? favorites : allowed
}
