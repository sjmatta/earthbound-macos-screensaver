import fs from 'node:fs'
const [actualPath,expectedPath]=process.argv.slice(2)
if(!expectedPath) throw new Error('Usage: node scripts/compare-frames.mjs actual.rgba reference.rgba (256×224 RGBA8)')
const actual=fs.readFileSync(actualPath),expected=fs.readFileSync(expectedPath)
if(actual.length!==256*224*4 || expected.length!==actual.length) throw new Error('Both files must be 256×224 RGBA8')
let differentPixels=0,maxError=0,total=0
for(let i=0;i<actual.length;i+=4){let different=false;for(let c=0;c<3;c++){const error=Math.abs(actual[i+c]-expected[i+c]);different ||= error!==0;maxError=Math.max(maxError,error);total+=error}differentPixels+=Number(different)}
console.log(JSON.stringify({differentPixels,totalPixels:256*224,maxChannelError:maxError,meanAbsoluteError:total/(256*224*3)},null,2))
process.exitCode=differentPixels ? 1 : 0
