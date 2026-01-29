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
import layerNames from './layerNames.json'

const LAYER_COUNT = 327
const DEFAULT_INTERVAL_SECONDS = 60
const INDICATOR_DISPLAY_TIME = 5000  // 5 seconds

const ROM = new Rom(backgroundData)
globalThis.ROM = ROM

let engine = null
let cycleIntervalId = null
let indicatorTimeoutId = null

function getCycleInterval() {
  const params = new URLSearchParams(window.location.search)
  const interval = parseInt(params.get('interval'), 10)
  return (interval > 0 ? interval : DEFAULT_INTERVAL_SECONDS) * 1000
}

function randomLayer() {
  return Math.floor(Math.random() * LAYER_COUNT)
}

function getLayerName(index) {
  return layerNames[index] || `Layer ${index}`
}

function showLayerIndicator() {
  const indicator = document.getElementById('layer-indicator')
  const layer1El = document.getElementById('layer1-name')
  const layer2El = document.getElementById('layer2-name')

  if (!indicator || !layer1El || !layer2El || !engine) return

  layer1El.textContent = getLayerName(engine.layers[0].entry)
  layer2El.textContent = getLayerName(engine.layers[1].entry)

  indicator.classList.add('visible')
  clearTimeout(indicatorTimeoutId)
  indicatorTimeoutId = setTimeout(() => {
    indicator.classList.remove('visible')
  }, INDICATOR_DISPLAY_TIME)
}

function setRandomLayers() {
  if (engine) {
    engine.layers[0] = new BackgroundLayer(randomLayer(), ROM)
    engine.layers[1] = new BackgroundLayer(randomLayer(), ROM)
    showLayerIndicator()
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
  showLayerIndicator()

  const interval = getCycleInterval()
  console.log(`Screensaver: cycling every ${interval / 1000}s`)
  cycleIntervalId = setInterval(setRandomLayers, interval)
}

function stop() {
  if (cycleIntervalId) {
    clearInterval(cycleIntervalId)
    cycleIntervalId = null
  }
  if (indicatorTimeoutId) {
    clearTimeout(indicatorTimeoutId)
    indicatorTimeoutId = null
  }
  engine = null
}

window.addEventListener('unload', stop)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
