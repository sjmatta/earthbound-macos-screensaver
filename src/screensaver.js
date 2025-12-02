/**
 * Earthbound Battle Backgrounds Screensaver
 * Cycles through random layer combinations at a configurable interval
 *
 * URL Parameters:
 *   ?interval=30  - Cycle every 30 seconds (default: 60)
 */

const LAYER_COUNT = 327;
const DEFAULT_INTERVAL = 60;

// Parse cycle interval from URL (in seconds), default to 60
function getCycleInterval() {
  const params = new URLSearchParams(window.location.search);
  const interval = parseInt(params.get('interval'), 10);
  if (interval && interval > 0) {
    return interval * 1000;
  }
  return DEFAULT_INTERVAL * 1000;
}

function randomLayer() {
  return Math.floor(Math.random() * LAYER_COUNT);
}

function setRandomLayers() {
  if (typeof document.engine !== 'undefined' &&
      typeof document.BackgroundLayer !== 'undefined' &&
      typeof ROM !== 'undefined') {
    const l1 = randomLayer();
    const l2 = randomLayer();
    try {
      document.engine.layers[0] = new document.BackgroundLayer(l1, ROM);
      document.engine.layers[1] = new document.BackgroundLayer(l2, ROM);
    } catch(e) {
      console.error('Error setting layers:', e);
    }
  }
}

// Wait for engine to be fully initialized
function startScreensaver() {
  if (typeof document.engine !== 'undefined' &&
      typeof document.BackgroundLayer !== 'undefined' &&
      typeof ROM !== 'undefined' &&
      document.engine.layers) {
    const interval = getCycleInterval();
    console.log(`Screensaver started: cycling every ${interval / 1000} seconds`);
    // Set initial random layers
    setRandomLayers();
    // Cycle at configured interval
    setInterval(setRandomLayers, interval);
  } else {
    setTimeout(startScreensaver, 200);
  }
}

// Start after a brief delay to let engine initialize
setTimeout(startScreensaver, 500);
