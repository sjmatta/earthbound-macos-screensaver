import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {build} from 'vite'

const output = await build({logLevel:'error', build:{write:false}})
const files=(Array.isArray(output)?output[0]:output).output
const script=files.find(f=>f.type==='chunk').code
const html=files.find(f=>f.fileName==='index.html').source
function page(readyState='loading',search='?layer1=269&layer2=270') {
  const events=new Map(),rafs=new Map(),nodes=new Map()
  let nextId=0,now=0,canvasQueries=0,frames=0
  function node(id) {
    if(!nodes.has(id)) nodes.set(id,{style:{},value:'',type:'select-one',textContent:'',classList:{toggle(){}},getContext(){return {createImageData:()=>({data:new Uint8ClampedArray(256*224*4)}),putImageData(){frames++},clearRect(){}}},clientWidth:1920,clientHeight:1080})
    return nodes.get(id)
  }
  const sandbox={URLSearchParams,console,atob,structuredClone,localStorage:{getItem:()=>null,setItem(){}},location:{search},performance:{now:()=>now},requestAnimationFrame:fn=>{rafs.set(++nextId,fn);return nextId},cancelAnimationFrame:id=>rafs.delete(id),document:{readyState,addEventListener:(name,fn)=>events.set(name,fn),querySelector:()=>{canvasQueries++;return node('canvas')},getElementById:node},addEventListener:(name,fn)=>events.set(name,fn)}
  sandbox.window=sandbox
  vm.runInNewContext(script,sandbox)
  return {sandbox,nodes,events,rafs,get queries(){return canvasQueries},get frames(){return frames},draw(time){now=time;const callbacks=[...rafs.values()];rafs.clear();callbacks.forEach(fn=>fn(time))}}
}
test('classic file-URL bundle waits for DOM readiness, renders, and stops all animation callbacks',()=>{
  assert.doesNotMatch(html,/type="module"|crossorigin/)
  const p=page()
  assert.equal(p.queries,0)
  p.events.get('DOMContentLoaded')()
  assert.equal(p.queries,1)
  p.draw(34);assert.equal(p.frames,1)
  p.sandbox.stopScreensaver();assert.equal(p.rafs.size,0)
})
test('runtime interval changes preserve pinned layers and duplicate settings do not reset a scene',()=>{
  const p=page('complete')
  const name=p.nodes.get('scene-name').textContent
  p.sandbox.setCycleInterval(5);p.draw(10000)
  assert.equal(p.nodes.get('scene-name').textContent,name)
  p.sandbox.setScreensaverSettings(p.sandbox.earthbound.getSettings())
  assert.equal(p.nodes.get('scene-name').textContent,name)
  p.events.get('pagehide')();assert.equal(p.rafs.size,0)
})
