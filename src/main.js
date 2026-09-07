import { SceneRenderer, crossfade, WIDTH, HEIGHT, configs } from './renderer/renderer.js'
import { frameAt } from './renderer/state.js'
import { ShuffleBag, normalizeSettings, eligibleScenes } from './selection.js'
import reference from './data/reference.json'

function startScreensaver() {
const params = new URLSearchParams(location.search)
const preview = params.get('preview') === 'true'
const valid = n => Number.isInteger(n) && n >= 0 && n < configs.length
const pinnedPair = ['layer1','layer2'].every(k => params.has(k)) ? ['layer1','layer2'].map(k => Number(params.get(k))) : null
const pinned = pinnedPair?.every(valid) ? pinnedPair : null
let saved = {}
try { saved = JSON.parse(localStorage.getItem('earthbound-settings') || '{}') } catch {}
try { saved = {...saved, ...JSON.parse(params.get('settings') || '{}')} } catch {}
for (const key of ['mode','scale','interval']) if (params.has(key)) saved[key] = params.get(key)
if (params.has('showLayerNames')) saved.showLayerNames = params.get('showLayerNames') !== 'false'
let settings = normalizeSettings(saved)
const scenes = reference.scenes.filter(s => s.layers.every(valid))
const bag = new ShuffleBag()
const canvas = document.querySelector('canvas')
canvas.width = WIDTH; canvas.height = HEIGHT
const context = canvas.getContext('2d', {alpha: false})
context.imageSmoothingEnabled = false
const image = context.createImageData(WIDTH, HEIGHT)
const outgoingBuffer = new Uint8ClampedArray(image.data.length)
const incomingBuffer = new Uint8ClampedArray(image.data.length)
let current, outgoing, startTime, outgoingStart, changeTime, frameId = null, running = false, manual = !!pinned, lastDraw = -Infinity
let shownAt = 0
const status = document.getElementById('status')
function chooseScene() {
  const available = eligibleScenes(scenes, settings)
  if (settings.mode === 'authentic' || settings.favoritesOnly) {
    const scene = bag.next(available)
    status.textContent = !available.length ? 'All backgrounds are excluded. Restore one in the gallery to resume.' : settings.favoritesOnly && !available.some(s => settings.favorites.includes(s.id)) ? 'No available favorites yet; playing the collection.' : ''
    return scene
  }
  const excluded = new Set(settings.excluded)
  // A bounded attempt avoids hanging if a supplied exclusion list covers the pool.
  for (let attempt = 0; attempt < 100; attempt++) {
    const pair = [Math.floor(Math.random()*327), Math.floor(Math.random()*327)]
    const id = pair.join(':')
    if (id !== current?.id && !excluded.has(id)) return {id, layers:pair, name:`Remix ${pair[0]} × ${pair[1]}`}
  }
  return bag.next(available)
}
function setScene(scene, now = performance.now(), fade = true) {
  outgoing = fade && settings.mode === 'remix' ? current : null
  outgoingStart = startTime
  current = scene ? {...scene, renderer: new SceneRenderer(scene.layers, settings.mode)} : null
  startTime = now; changeTime = now + settings.interval*1000; shownAt = now
  document.getElementById('scene-name').textContent = scene?.name || ''
  document.getElementById('scene-detail').textContent = scene ? `${settings.mode === 'authentic' ? 'Original pairing' : 'Remix'} · ${scene.layers.join(' + ')}` : ''
}
function fit() {
  const viewport = document.getElementById('stage')
  const w = viewport.clientWidth, h = viewport.clientHeight
  if (settings.scale === 'fill') { canvas.style.width = '100%'; canvas.style.height = '100%'; return }
  const ratio = settings.scale === '4:3' ? 4/3 : WIDTH/HEIGHT
  let width = Math.min(w,h*ratio), height = width/ratio
  if (settings.scale === 'pixels') {
    const scale = Math.min(w/WIDTH,h/HEIGHT)
    const integer = scale >= 1 ? Math.floor(scale) : scale
    width = WIDTH*integer; height = HEIGHT*integer
  }
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`
}
function draw(now) {
  if (!running) return
  frameId = requestAnimationFrame(draw)
  if (now-lastDraw < 1000/60-0.5) return
  lastDraw = now
  if (!manual && now >= changeTime) setScene(chooseScene(), now)
  if (!current) { context.clearRect(0,0,WIDTH,HEIGHT); return }
  const frame = params.has('frame') ? Math.max(0,Math.floor(Number(params.get('frame')) || 0)) : frameAt(now-startTime)
  if (outgoing && now-startTime < 1200) {
    outgoing.renderer.render(frameAt(now-outgoingStart),outgoingBuffer)
    current.renderer.render(frame,incomingBuffer)
    const p = (now-startTime)/1200
    crossfade(outgoingBuffer,incomingBuffer,p*p*(3-2*p),image.data)
  } else { outgoing = null; current.renderer.render(frame,image.data) }
  context.putImageData(image,0,0)
  document.getElementById('layer-indicator').classList.toggle('visible', settings.showLayerNames && (preview || params.get('debug') === 'true' || now-shownAt < 5000))
}
function applySettings(value, persist = true) {
  const nextSettings = normalizeSettings({...settings,...value})
  if (current !== undefined && JSON.stringify(nextSettings) === JSON.stringify(settings)) { syncControls(); return }
  const galleryChanged = JSON.stringify([nextSettings.favorites,nextSettings.excluded]) !== JSON.stringify([settings.favorites,settings.excluded])
  settings = nextSettings
  bag.bag = []
  fit()
  if (pinned) setScene({id:pinned.join(':'),layers:pinned,name:`Pinned ${pinned.join(' + ')}`},performance.now(),false)
  else { manual = false; setScene(chooseScene(),performance.now(),false) }
  if (persist) {
    try { localStorage.setItem('earthbound-settings',JSON.stringify(settings)) } catch {}
    window.webkit?.messageHandlers?.settingsChanged?.postMessage(settings)
  }
  syncControls()
  if (preview && galleryChanged) gallery()
}
window.setScreensaverSettings = value => applySettings(value,false)
window.setShowLayerNames = value => applySettings({showLayerNames: value === true || value === 'true'},false)
window.setCycleInterval = seconds => {
  settings = normalizeSettings({...settings,interval:seconds}); changeTime = performance.now()+settings.interval*1000
}
window.stopScreensaver = () => { running = false; if (frameId !== null) cancelAnimationFrame(frameId); frameId = null; current = outgoing = null }
// Stable API for raw reference captures and independent automated validation.
window.earthbound = {
  capture: (pair, frame, mode = 'authentic') => Array.from(new SceneRenderer(pair,mode).render(frame)),
  scenes, configs,
  getSettings: () => structuredClone(settings)
}
function syncControls() {
  for (const key of ['mode','scale','interval','showLayerNames','favoritesOnly']) {
    const control = document.getElementById(key)
    if (control.type === 'checkbox') control.checked = settings[key]
    else control.value = settings[key]
  }
}
function gallery() {
  const list = document.getElementById('gallery')
  const query = document.getElementById('search').value.toLowerCase()
  list.replaceChildren()
  for (const scene of scenes.filter(s => `${s.name} ${s.names.join(' ')} ${s.id}`.toLowerCase().includes(query))) {
    const card = document.createElement('article')
    const select = document.createElement('button'); select.className = 'scene'
    const thumbnail = document.createElement('canvas'); thumbnail.width = WIDTH; thumbnail.height = HEIGHT
    const name = document.createElement('span'); name.textContent = scene.name
    select.append(thumbnail,name); select.title = `Play ${scene.name} (${scene.id})`
    select.onclick = () => { manual = true; setScene(scene,performance.now(),false) }
    const favorite = document.createElement('button'); favorite.textContent = settings.favorites.includes(scene.id) ? '★ Favorite' : '☆ Favorite'
    favorite.setAttribute('aria-pressed',String(settings.favorites.includes(scene.id)))
    favorite.onclick = () => { applySettings({favorites:settings.favorites.includes(scene.id) ? settings.favorites.filter(v=>v!==scene.id) : [...settings.favorites,scene.id]}) }
    const exclude = document.createElement('button'); exclude.textContent = settings.excluded.includes(scene.id) ? 'Restore' : 'Exclude'
    exclude.onclick = () => { applySettings({excluded:settings.excluded.includes(scene.id) ? settings.excluded.filter(v=>v!==scene.id) : [...settings.excluded,scene.id]}) }
    card.append(select,favorite,exclude); list.append(card)
    thumbnail.dataset.pair = JSON.stringify(scene.layers)
  }
  thumbnailObserver.disconnect()
  list.querySelectorAll('canvas').forEach(c=>thumbnailObserver.observe(c))
}
const thumbnailObserver = preview ? new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    const c = entry.target, ctx = c.getContext('2d'), data = ctx.createImageData(WIDTH,HEIGHT)
    data.data.set(new SceneRenderer(JSON.parse(c.dataset.pair)).render(0))
    ctx.putImageData(data,0,0); thumbnailObserver.unobserve(c)
  }
}) : null
if (preview) {
  document.body.classList.add('preview')
  for (const key of ['mode','scale','interval','showLayerNames','favoritesOnly']) document.getElementById(key).onchange = e => { applySettings({[key]:e.target.type === 'checkbox' ? e.target.checked : e.target.value}) }
  document.getElementById('search').oninput = gallery
  document.getElementById('next').onclick = () => { manual = false; setScene(chooseScene()) }
  gallery()
}
window.addEventListener('resize',fit)
window.addEventListener('pagehide',window.stopScreensaver)
applySettings(settings,false)
running = true
frameId = requestAnimationFrame(draw)

}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startScreensaver, {once:true})
else startScreensaver()
