/**
 * Earthbound Battle Backgrounds Screensaver
 *
 * Displays random Earthbound battle backgrounds, cycling at a configurable interval.
 * Built with Vite - all dependencies are bundled into a single file.
 *
 * We drive the render loop here rather than using the engine's own `animate()` so
 * that we can cancel it (`animate()` offers no stop) and so that layer opacity stays
 * under our control - see LAYER_ALPHA below.
 *
 * URL Parameters:
 *   ?interval=30          - Cycle every 30 seconds (default: 60)
 *   ?showLayerNames=false - Hide layer name indicator (default: true)
 *   ?layer1=N&layer2=N    - Pin specific layers (0-326); pinned layers do not cycle
 *   ?debug=true           - Keep the layer indicator on screen permanently
 *
 * Native bridge (called from Swift via evaluateJavaScript):
 *   window.setShowLayerNames(bool)
 *   window.setCycleInterval(seconds)
 *   window.stopScreensaver()
 */

import Rom from 'earthbound-battle-backgrounds/src/rom/rom'
import backgroundData from 'earthbound-battle-backgrounds/data/truncated_backgrounds.dat?uint8array&base64'
import { renderLayers, SNES_WIDTH, SNES_HEIGHT } from 'earthbound-battle-backgrounds/src/engine'
import BackgroundLayer from 'earthbound-battle-backgrounds/src/rom/background_layer'
import { HORIZONTAL, HORIZONTAL_INTERLACED, VERTICAL } from 'earthbound-battle-backgrounds/src/rom/distortion_effect'
import layerNames from './layerNames.json'

const LAYER_COUNT = 327
const DEFAULT_INTERVAL_SECONDS = 60
const INDICATOR_DISPLAY_TIME = 5000  // 5 seconds

const FPS = 30
const FRAME_INTERVAL = 1000 / FPS
const FRAME_SKIP = 1
const LETTERBOX = 0    // pixels of black bar top and bottom; 0 fills the frame

// Both layers render at half opacity so they sum to a full-brightness frame.
// The engine's own animate() rewrites this array when a layer's entry index is
// falsy - and index 0 is a perfectly valid background - which would leave one
// layer stuck invisible for the rest of the session. Owning the loop avoids that.
const LAYER_ALPHA = 0.5

const EFFECT_NAMES = {
  [HORIZONTAL]: 'Horizontal',
  [HORIZONTAL_INTERLACED]: 'Interlaced',
  [VERTICAL]: 'Vertical'
}

const ROM = new Rom(backgroundData)
globalThis.ROM = ROM  // exposed for poking at the ROM from a browser console

let layers = []
const alpha = [LAYER_ALPHA, LAYER_ALPHA]
let tick = 0

let canvas = null
let context = null
let image = null

let frameId = null
let lastFrameTime = 0
let cycleIntervalId = null
let indicatorTimeoutId = null

let intervalMs = DEFAULT_INTERVAL_SECONDS * 1000
let showLayerNames = true
let pinIndicator = false

// MARK: - Native bridge

window.setShowLayerNames = function (value) {
  showLayerNames = value === true || value === 'true'
  if (showLayerNames) {
    showLayerIndicator()
  } else {
    hideLayerIndicator()
  }
}

window.setCycleInterval = function (seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return
  intervalMs = value * 1000
  startCycleTimer()
}

window.stopScreensaver = function () {
  stop()
}

// MARK: - Layer selection

function randomLayer () {
  return Math.floor(Math.random() * LAYER_COUNT)
}

function isValidLayer (index) {
  return Number.isInteger(index) && index >= 0 && index < LAYER_COUNT
}

function getSpecificLayers (params) {
  const layer1 = parseInt(params.get('layer1'), 10)
  const layer2 = parseInt(params.get('layer2'), 10)
  return isValidLayer(layer1) && isValidLayer(layer2) ? [layer1, layer2] : null
}

function getCycleInterval (params) {
  const interval = parseInt(params.get('interval'), 10)
  return (interval > 0 ? interval : DEFAULT_INTERVAL_SECONDS) * 1000
}

// MARK: - Layer indicator

/**
 * Names come from layerNames.json when present. That table has to be compiled by
 * hand, so anything missing falls back to a description derived from the ROM
 * itself - the index plus the distortion style you can actually see on screen.
 */
function describeLayer (layer) {
  const named = layerNames[String(layer.entry)]
  if (named) return named

  const effect = EFFECT_NAMES[layer.distorter.effect.type]
  const index = String(layer.entry).padStart(3, '0')
  return effect ? `#${index} ${effect}` : `#${index}`
}

function hideLayerIndicator () {
  const indicator = document.getElementById('layer-indicator')
  if (indicator) indicator.classList.remove('visible')
}

function showLayerIndicator () {
  if (!showLayerNames) return

  const indicator = document.getElementById('layer-indicator')
  const layer1El = document.getElementById('layer1-name')
  const layer2El = document.getElementById('layer2-name')

  if (!indicator || !layer1El || !layer2El || layers.length < 2) return

  layer1El.textContent = describeLayer(layers[0])
  layer2El.textContent = describeLayer(layers[1])

  indicator.classList.add('visible')

  clearTimeout(indicatorTimeoutId)
  indicatorTimeoutId = null
  if (pinIndicator) return

  indicatorTimeoutId = setTimeout(() => {
    indicator.classList.remove('visible')
  }, INDICATOR_DISPLAY_TIME)
}

// MARK: - Cycling

function setRandomLayers () {
  layers = [
    new BackgroundLayer(randomLayer(), ROM),
    new BackgroundLayer(randomLayer(), ROM)
  ]
  showLayerIndicator()
}

function startCycleTimer () {
  clearInterval(cycleIntervalId)
  cycleIntervalId = setInterval(setRandomLayers, intervalMs)
}

// MARK: - Render loop

function drawFrame (now) {
  frameId = requestAnimationFrame(drawFrame)

  const elapsed = now - lastFrameTime
  if (elapsed < FRAME_INTERVAL) return
  // Carry the remainder forward so the frame clock doesn't drift.
  lastFrameTime = now - (elapsed % FRAME_INTERVAL)

  const bitmap = renderLayers(layers, image.data, LETTERBOX, tick, alpha)
  tick += FRAME_SKIP
  // renderLayers writes into the buffer we hand it and hands the same array back;
  // the copy only matters if a future engine version returns a different one.
  if (bitmap !== image.data) image.data.set(bitmap)
  context.putImageData(image, 0, 0)
}

function start () {
  canvas = document.querySelector('canvas')
  if (!canvas) {
    console.error('Screensaver: no canvas element')
    return
  }

  // Setting width/height resets the 2D context, so configure the context after.
  canvas.width = SNES_WIDTH
  canvas.height = SNES_HEIGHT
  context = canvas.getContext('2d')
  context.imageSmoothingEnabled = false
  image = context.getImageData(0, 0, SNES_WIDTH, SNES_HEIGHT)

  const params = new URLSearchParams(window.location.search)
  showLayerNames = params.get('showLayerNames') !== 'false'
  pinIndicator = params.get('debug') === 'true'
  intervalMs = getCycleInterval(params)

  const pinned = getSpecificLayers(params)
  const [layer1, layer2] = pinned ?? [randomLayer(), randomLayer()]
  layers = [new BackgroundLayer(layer1, ROM), new BackgroundLayer(layer2, ROM)]

  lastFrameTime = performance.now()
  frameId = requestAnimationFrame(drawFrame)
  showLayerIndicator()

  if (pinned) {
    console.log(`Screensaver: pinned to layers ${layer1} and ${layer2}, not cycling`)
  } else {
    console.log(`Screensaver: cycling every ${intervalMs / 1000}s`)
    startCycleTimer()
  }
}

function stop () {
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
  clearInterval(cycleIntervalId)
  cycleIntervalId = null
  clearTimeout(indicatorTimeoutId)
  indicatorTimeoutId = null
  layers = []
}

window.addEventListener('pagehide', stop)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
