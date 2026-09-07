import {performance} from 'node:perf_hooks'
import {loadRenderer} from './load-renderer.mjs'
const {SceneRenderer,WIDTH,HEIGHT}=await loadRenderer()
for(const pair of [[262,0],[269,270],[1,0]]) {
  const renderer=new SceneRenderer(pair),buffer=new Uint8ClampedArray(WIDTH*HEIGHT*4),times=[]
  for(let tick=0;tick<180;tick++) {const start=performance.now();renderer.render(tick,buffer);if(tick>=60)times.push(performance.now()-start)}
  times.sort((a,b)=>a-b)
  console.log(JSON.stringify({pair,samples:times.length,meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:times[Math.floor(times.length*.95)],scope:'Node CPU rendering only; excludes WebKit, display, and native host'}))
}
