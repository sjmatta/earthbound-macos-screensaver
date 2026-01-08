/**
 * Earthbound Battle Backgrounds Screensaver
 *
 * Displays random Earthbound battle backgrounds, cycling at a configurable interval.
 * Built with Vite - all dependencies are bundled into a single file.
 *
 * URL Parameters:
 *   ?interval=30  - Cycle every 30 seconds (default: 60)
 *   ?debug=true   - Enable debug overlay
 */

import Rom from 'earthbound-battle-backgrounds/src/rom/rom'
import backgroundData from 'earthbound-battle-backgrounds/data/truncated_backgrounds.dat?uint8array&base64'
import Engine from 'earthbound-battle-backgrounds/src/engine'
import BackgroundLayer from 'earthbound-battle-backgrounds/src/rom/background_layer'

const LAYER_COUNT = 327
const DEFAULT_INTERVAL_SECONDS = 60

const ROM = new Rom(backgroundData)
globalThis.ROM = ROM

let engine = null
let cycleIntervalId = null

function getCycleInterval() {
  const params = new URLSearchParams(window.location.search)
  const interval = parseInt(params.get('interval'), 10)
  return (interval > 0 ? interval : DEFAULT_INTERVAL_SECONDS) * 1000
}

function randomLayer() {
  return Math.floor(Math.random() * LAYER_COUNT)
}

function setRandomLayers() {
  if (engine) {
    engine.layers[0] = new BackgroundLayer(randomLayer(), ROM)
    engine.layers[1] = new BackgroundLayer(randomLayer(), ROM)
  }
}

function start() {
  const params = new URLSearchParams(window.location.search)
  const debug = params.get('debug') === 'true'

  engine = new Engine(
    [new BackgroundLayer(randomLayer(), ROM), new BackgroundLayer(randomLayer(), ROM)],
    {
      fps: 30,
      aspectRatio: 0,
      frameSkip: 1,
      alpha: [0.5, 0.5],
      canvas: document.querySelector('canvas')
    }
  )
  engine.animate(debug)

  const interval = getCycleInterval()
  console.log(`Screensaver: cycling every ${interval / 1000}s`)
  cycleIntervalId = setInterval(setRandomLayers, interval)
}

function stop() {
  if (cycleIntervalId) {
    clearInterval(cycleIntervalId)
    cycleIntervalId = null
  }
  engine = null
}

window.addEventListener('unload', stop)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
