/**
 * Earthbound Battle Backgrounds Screensaver
 *
 * Main entry point that imports the upstream engine and adds screensaver cycling logic.
 * Built with Vite - all dependencies are bundled into a single file.
 *
 * URL Parameters:
 *   ?interval=30  - Cycle every 30 seconds (default: 60)
 */

// Import upstream modules
import Rom from '../upstream/src/rom/rom'
import backgroundData from '../upstream/data/truncated_backgrounds.dat?uint8array&base64'
import Engine from '../upstream/src/engine'
import BackgroundLayer from '../upstream/src/rom/background_layer'

// Constants
const LAYER_COUNT = 327
const DEFAULT_INTERVAL = 60

// Initialize ROM
const ROM = new Rom(backgroundData)
globalThis.ROM = ROM

// Utility functions (from upstream utils.js)
function getJsonFromUrl() {
  const query = location.search.substr(1)
  if (query === '') return {}

  const data = query.split('&')
  const result = {}
  for (let i = 0; i < data.length; i++) {
    const item = data[i].split('=')
    result[item[0]] = item[1]
  }
  return result
}

function parseLayerParam(number, options) {
  const defaultLayer = options.firstLayer ? 270 : 269
  const canvas = document.querySelector('canvas')
  let num = Number(number)
  if (isNaN(num)) num = defaultLayer
  else if (num < 0 || num > 326) num = defaultLayer

  options.firstLayer
    ? (canvas.dataset.layerOne = num)
    : (canvas.dataset.layerTwo = num)
  return num
}

function parseFrameskipParam(number) {
  const canvas = document.querySelector('canvas')
  let num = Number(number)
  if (isNaN(num)) return (num = 1)
  else if (num < 1 || num > 10) return (num = 1)

  canvas.dataset.frameskip = num
  return num
}

function parseAspectRatioParam(number) {
  const canvas = document.querySelector('canvas')
  let num = Number(number)
  if (isNaN(num)) return (num = 0)
  else if (num != 0 && num != 16 && num != 48 && num != 64) return (num = 0)

  canvas.dataset.aspectRatio = num
  return num
}

// Screensaver functions
function getCycleInterval() {
  const params = new URLSearchParams(window.location.search)
  const interval = parseInt(params.get('interval'), 10)
  if (interval && interval > 0) {
    return interval * 1000
  }
  return DEFAULT_INTERVAL * 1000
}

function randomLayer() {
  return Math.floor(Math.random() * LAYER_COUNT)
}

function setRandomLayers() {
  if (document.engine && document.BackgroundLayer && ROM) {
    const l1 = randomLayer()
    const l2 = randomLayer()
    try {
      document.engine.layers[0] = new document.BackgroundLayer(l1, ROM)
      document.engine.layers[1] = new document.BackgroundLayer(l2, ROM)
    } catch (e) {
      console.error('Error setting layers:', e)
    }
  }
}

// Setup and start engine
function setupEngine() {
  const params = getJsonFromUrl()

  const layer1Val = parseLayerParam(params.layer1, { firstLayer: true })
  const layer2Val = parseLayerParam(params.layer2, { firstLayer: false })
  const frameskip = parseFrameskipParam(params.frameskip)
  const aspectRatio = parseAspectRatioParam(params.aspectRatio)
  const debug = params.debug === 'true'

  const fps = 30
  let alpha = 0.5

  if (layer2Val === 0) {
    alpha = 1.0
  }

  // Make BackgroundLayer available globally for layer cycling
  document.BackgroundLayer = BackgroundLayer

  // Create initial layers
  const layer1 = new BackgroundLayer(layer1Val, ROM)
  const layer2 = new BackgroundLayer(layer2Val, ROM)

  // Create animation engine
  const engine = new Engine([layer1, layer2], {
    fps: fps,
    aspectRatio: aspectRatio,
    frameSkip: frameskip,
    alpha: [alpha, alpha],
    canvas: document.querySelector('canvas')
  })

  document.engine = engine
  document.engine.animate(debug)

  // Start screensaver cycling
  startScreensaver()
}

function startScreensaver() {
  if (document.engine && document.BackgroundLayer && ROM && document.engine.layers) {
    const interval = getCycleInterval()
    console.log(`Screensaver started: cycling every ${interval / 1000} seconds`)
    // Set initial random layers
    setRandomLayers()
    // Cycle at configured interval
    setInterval(setRandomLayers, interval)
  } else {
    setTimeout(startScreensaver, 200)
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEngine)
} else {
  setupEngine()
}
