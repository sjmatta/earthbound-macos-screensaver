import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {loadRenderer} from '../scripts/load-renderer.mjs'
const {SceneRenderer, crossfade, configs, WIDTH, HEIGHT} = await loadRenderer()
const reference=JSON.parse(fs.readFileSync('src/data/reference.json','utf8'))
const hash = data => createHash('sha256').update(data).digest('hex')

test('all 327 raw layers produce opaque pixels with legal channels', () => {
  for(let id=0;id<327;id++) {
    const frame = new SceneRenderer([id,id],'remix').render(0)
    assert.equal(frame.length,WIDTH*HEIGHT*4)
    for(let p=3;p<frame.length;p+=4) assert.equal(frame[p],255)
  }
})
test('every available original pairing renders at initialization and after a transition window', () => {
  for(const scene of reference.scenes.filter(s=>s.layers.every(n=>n<327))) {
    const renderer = new SceneRenderer(scene.layers)
    renderer.render(0); renderer.render(601)
  }
})
test('seeking, repeated drawing, and 30/60/120 Hz presentation agree', () => {
  for(const pair of [[1,0],[269,270],[19,20],[270,269]]) {
    const direct = hash(new SceneRenderer(pair).render(120))
    for(const step of [2,1,0.5]) {
      const renderer = new SceneRenderer(pair)
      for(let tick=0;tick<=120;tick+=step) renderer.render(Math.floor(tick))
      assert.equal(hash(renderer.render(120)),direct)
      assert.equal(hash(renderer.render(10)),hash(new SceneRenderer(pair).render(10)))
    }
  }
})
test('Authentic zero means absent, Remix zero remains selectable', () => {
  assert.equal(new SceneRenderer([269,0]).layers.length,1)
  assert.equal(new SceneRenderer([269,0],'remix').layers.length,2)
  assert.equal(new SceneRenderer([1,269]).layers.length,1)
})
test('crossfade endpoints and constant-color brightness are exact', () => {
  const a=new Uint8ClampedArray([11,55,101,255]), b=new Uint8ClampedArray([201,99,1,255]), out=new Uint8ClampedArray(4)
  assert.deepEqual(crossfade(a,b,0,out),a); assert.deepEqual(crossfade(a,b,1,out),b)
  assert.deepEqual(crossfade(a,a,0.37,out),a)
  assert.deepEqual(crossfade(a,b,0.5,out),new Uint8ClampedArray([106,77,51,255]))
})
test('checked-in metadata matches the pinned ROM config structure', () => {
  assert.equal(configs.length,327)
  for(const c of configs) {
    assert.equal(c.length,17); assert.ok([2,4].includes(c[2]))
    c.slice(9,13).forEach(n=>assert.ok(n<reference.scrolling.length))
    c.slice(13,17).forEach(n=>assert.ok(n<135))
  }
  assert.equal(reference.sine.length,256)
  assert.equal(reference.scenes.find(s=>s.groups.includes(1)).name,'Spiteful Crow')
  assert.deepEqual(reference.scenes.find(s=>s.groups.includes(1)).layers,[262,0])
})

test('type 4 uses horizontal DMA, despite its compression-based row generator',()=>{
  const renderer=new SceneRenderer([1,0])
  renderer.render(0)
  const layer=renderer.layers[0]
  layer.indices=Uint8Array.from({length:256*256},(_,i)=>(i%256)%16)
  layer.colors=Uint16Array.from({length:16},(_,i)=>i)
  layer.state.effect.type=4;layer.state.x=0;layer.state.y=0
  layer.rows.fill(3)
  assert.equal(layer.color(0,0),3)
})
test('transparent subscreen preserves full main brightness in Authentic mode',()=>{
  const renderer=new SceneRenderer([269,270])
  renderer.render(0)
  renderer.layers[0].color=()=>31
  renderer.layers[1].color=()=>-1
  assert.equal(renderer.render(0)[0],255)
  renderer.layers[1].color=()=>0
  assert.equal(renderer.render(0)[0],123)
})
