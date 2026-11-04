// Mechanical source-region extraction / particle atlas packing, not new artwork.
// Usage: node tools/pack-dice-effects54.mjs /path/to/Butter.png /path/to/kenney/repo
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const [butterPath,kenneyPath]=process.argv.slice(2);if(!butterPath||!kenneyPath)throw Error('Provide Butter.png and Kenney checkout');
const commit='ab7086639ee73be31abd87feb21bf1402d4e8144',butterHash='3f0b809ecab4f6560e7a7d035b2e4fbb27d8493a2ff3a8bd4eb9c588de080613';
const specs=[
 {id:'rock',file:butterPath,region:[529,63,43,43],pma:true,expected:butterHash,url:'https://viewer.dclnslde.com/spine/battle/butter/Butter.png',license:'Trickcal original; redistribution permission not separately verified'},
 {id:'star',name:'symbol_02.png',color:'#ffe6a8'},
 {id:'flare',name:'star_04.png',color:'#ffe6b0'},
 {id:'muzzle',name:'muzzle_01.png',color:'#ffe6ac'},
 {id:'ring',name:'circle_02.png',color:'#f8d68c'},
 {id:'dust',name:'smoke_01.png',color:'#d7b8aa'},
 {id:'bolt',name:'spark_06.png',color:'#a9e7ff'},
 {id:'trace',name:'trace_01.png',color:'#fbd59b'}
];
const sources=[];
for(const s of specs){const file=s.file||resolve(kenneyPath,'addons/kenney_particle_pack',s.name),body=await fs.readFile(file),hash=createHash('sha256').update(body).digest('hex');if(s.expected&&hash!==s.expected)throw Error('Source changed '+s.id);s.data='data:image/png;base64,'+body.toString('base64');sources.push({id:s.id,url:s.url||`https://raw.githubusercontent.com/Calinou/kenney-particle-pack/${commit}/addons/kenney_particle_pack/${s.name}`,sha256:hash,license:s.license||'CC0-1.0',region:s.region||null,color:s.color||null,pma:s.pma||false});}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const result=await page.evaluate(async specs=>{
  const sheet=document.createElement('canvas');sheet.width=512;sheet.height=256;const ctx=sheet.getContext('2d'),regions={};
  for(let i=0;i<specs.length;i++){
   const s=specs[i],img=new Image();img.src=s.data;await img.decode();const tile=document.createElement('canvas');tile.width=112;tile.height=112;const c=tile.getContext('2d');
   if(s.region){const [x,y,w,h]=s.region;c.drawImage(img,x,y,w,h,Math.floor((112-w)/2),Math.floor((112-h)/2),w,h);if(s.pma){const d=c.getImageData(0,0,112,112);for(let p=0;p<d.data.length;p+=4){const a=d.data[p+3];if(a)for(let n=0;n<3;n++)d.data[p+n]=Math.min(255,Math.round(d.data[p+n]*255/a));}c.putImageData(d,0,0);}}
   else{c.drawImage(img,0,0,112,112);const d=c.getImageData(0,0,112,112),rgb=s.color.slice(1).match(/../g).map(v=>parseInt(v,16));for(let p=0;p<d.data.length;p+=4)for(let n=0;n<3;n++)d.data[p+n]=Math.round(d.data[p+n]*rgb[n]/255);c.putImageData(d,0,0);}
   const x=i%4*128+8,y=Math.floor(i/4)*128+8;ctx.drawImage(tile,x,y);regions[s.id]=s.region?{x:x+Math.floor((112-s.region[2])/2),y:y+Math.floor((112-s.region[3])/2),width:s.region[2],height:s.region[3]}:{x,y,width:112,height:112};
  }
  return {image:sheet.toDataURL('image/png'),regions};
 },specs);
 const output=resolve('assets/dice-fx54');await fs.mkdir(output,{recursive:true});const bytes=Buffer.from(result.image.split(',')[1],'base64');await fs.writeFile(resolve(output,'particles.png'),bytes);
 const manifest={version:54,image:'./assets/dice-fx54/particles.png',width:512,height:256,sha256:createHash('sha256').update(bytes).digest('hex'),gutter:8,regions:result.regions,sources};
 await fs.writeFile(resolve(output,'atlas.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({bytes:bytes.length,sha256:manifest.sha256,regions:Object.keys(result.regions)}));
}finally{await browser.close();}
