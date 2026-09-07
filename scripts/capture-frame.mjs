import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {loadRenderer} from './load-renderer.mjs'
const [a,b,tick,output,mode='authentic'] = process.argv.slice(2)
if (!output) throw new Error('Usage: node scripts/capture-frame.mjs layer1 layer2 frame output-prefix [authentic|remix]')
const {SceneRenderer,WIDTH,HEIGHT}=await loadRenderer()
const frame=new SceneRenderer([Number(a),Number(b)],mode).render(Number(tick))
fs.mkdirSync(path.dirname(output),{recursive:true})
fs.writeFileSync(`${output}.rgba`,frame)
const rgb=Buffer.alloc(WIDTH*HEIGHT*3)
for(let i=0,j=0;i<frame.length;i+=4,j+=3){rgb[j]=frame[i];rgb[j+1]=frame[i+1];rgb[j+2]=frame[i+2]}
fs.writeFileSync(`${output}.ppm`,Buffer.concat([Buffer.from(`P6\n${WIDTH} ${HEIGHT}\n255\n`),rgb]))
const reference=JSON.parse(fs.readFileSync('src/data/reference.json','utf8'))
fs.writeFileSync(`${output}.json`,JSON.stringify({layers:[Number(a),Number(b)],frame:Number(tick),mode,width:WIDTH,height:HEIGHT,format:'RGBA8',sha256:createHash('sha256').update(frame).digest('hex'),referenceSource:reference.source,referenceCommit:reference.commit,validation:'Implementation capture, not emulator evidence'},null,2)+'\n')
console.log(`Wrote ${output}.{rgba,ppm,json}`)
