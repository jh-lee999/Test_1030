// Mechanical atlas unpacking only. Art is not repainted/generated here.
// Input: the user-supplied public viewer's Butter PNG + text atlas.
// Never bundle the viewer or Spine runtime with the game.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const [imagePath,atlasPath]=process.argv.slice(2);
if(!imagePath||!atlasPath)throw Error('Usage: node tools/pack-butter-parts35.mjs Butter.png Butter.atlas');
const input=await fs.readFile(imagePath),atlas=await fs.readFile(atlasPath,'utf8');
if(createHash('sha256').update(input).digest('hex')!=='3f0b809ecab4f6560e7a7d035b2e4fbb27d8493a2ff3a8bd4eb9c588de080613')throw Error('Unreviewed source texture');
if(createHash('sha256').update(atlas).digest('hex')!=='4e9610a78c7934cd9a7c608cdc9192edba5f19aac2ae9317a015eda0fd2b2b4a')throw Error('Unreviewed source atlas');
const names=['Hand_L_2','Hand_L_1_B'];
const regions={};let current;
for(const line of atlas.split(/\r?\n/)){
  if(!line.includes(':')){current=line;continue;}
  if(!names.includes(current))continue;
  const [key,value]=line.split(':');(regions[current]??={})[key]=value;
}
const entries=names.map((name,index)=>{
  const [x,y,width,height]=regions[name].bounds.split(',').map(Number),rotation=Number(regions[name].rotate||0);
  return {name,index,source:[x,y,width,height],rotation,rect:[index*64+16,16,width,height]};
});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
try{
  const page=await browser.newPage();
  const result=await page.evaluate(async({data,entries})=>{
    const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d');
    for(const {source:[x,y,w,h],rotation,rect:[dx,dy]} of entries){
      ctx.save();ctx.translate(dx+w/2,dy+h/2);ctx.rotate(rotation*Math.PI/180);
      const odd=rotation===90||rotation===270,sw=odd?h:w,sh=odd?w:h;
      ctx.drawImage(image,x,y,sw,sh,-sw/2,-sh/2,sw,sh);ctx.restore();
    }
    // This source is premultiplied-alpha (pma:true), while PNG/canvas expects
    // straight-alpha. Undo PMA once; do not change opaque source colors.
    const pixels=ctx.getImageData(0,0,128,64);
    for(let i=0;i<pixels.data.length;i+=4){const a=pixels.data[i+3];if(a>0&&a<255)for(let c=0;c<3;c++)pixels.data[i+c]=Math.min(255,Math.round(pixels.data[i+c]*255/a));}
    ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
  },{data:input.toString('base64'),entries});
  const out=resolve('assets/butter-2d35');await fs.mkdir(out,{recursive:true});
  await fs.writeFile(resolve(out,'limbs.png'),Buffer.from(result.split(',')[1],'base64'));
  await fs.writeFile(resolve(out,'limbs.json'),JSON.stringify({version:35,image:'./assets/butter-2d35/limbs.png',source:'https://viewer.dclnslde.com/spine/battle/butter/Butter.png',parts:Object.fromEntries(entries.map(e=>[e.name,e.rect]))},null,2)+'\n');
  console.log(`Packed ${entries.length} original hand regions; no face/body/Spine runtime included.`);
}finally{await browser.close();}
