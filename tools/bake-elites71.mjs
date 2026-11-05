// Whole public source poses; constant .14 scale, common source root. No cutouts.
import fs from 'node:fs/promises';
import {openTrickcalReference} from './lib/trickcal-reference.mjs';
const output='assets/trickcal-elites71';
const entries=[['shady','Shady','셰이디'],['velvet','Velvet','벨벳'],['erpin','Erpin','에르핀']];
const {browser,page,sources}=await openTrickcalReference();
try{
 await fs.mkdir(output,{recursive:true});const meta={version:71,source:'https://viewer.dclnslde.com/',heroes:{}};
 for(const [id,stem,name]of entries){
  const info=await page.evaluate(async({id,stem})=>{
   const {Assets,Application}=await import('/assets/lib-BFAhM2oF.js'),{Spine}=await import('/assets/dist-BKtfa-2w.js'),base='/spine/battle/'+id+'/';
   await Assets.load([{alias:id+'71s',src:base+stem+'.skel'},{alias:id+'71a',src:base+stem+'.atlas'}]);
   const s=Spine.from(id+'71s',id+'71a');s.autoUpdate=false;const skins=s.skeleton.data.skins.map(s=>s.name),skin=skins.includes('Normal')?'Normal':skins.find(s=>s!=='default');s.skeleton.setSkinByName(skin);
   const app=new Application({width:256,height:256,backgroundAlpha:0,antialias:true,resolution:1,preserveDrawingBuffer:true});app.stop();app.stage.addChild(s);
   const apply=s.state.apply.bind(s.state);s.state.apply=sk=>{const r=apply(sk);for(const slot of sk.slots)if(/^CommonShadow/.test(slot.data.name))slot.setAttachment(null);return r;};
   const pose=(name,t)=>{s.state.clearTracks();s.skeleton.setToSetupPose();s.state.setAnimation(0,name,false);s.update(t);s.state.apply(s.skeleton);s.skeleton.updateWorldTransform();};window.elite71={s,app,pose};
   return {skin,animations:s.skeleton.data.animations.map(a=>({name:a.name,duration:a.duration,events:a.timelines.filter(t=>t.events).flatMap(t=>t.events.map(e=>({time:e.time,name:e.data.name,value:e.stringValue})))}))};
  },{id,stem});console.log(id,JSON.stringify(info));const hero={id:'battle/'+id,name,skin:info.skin,sourceAnimations:info.animations,scale:.14,clips:{}};
  for(const [key,source,count,loop]of [['idle','Idle',24,true],['walk','Move',24,true],['attack','Attack1_1',36,false],['skill','Skill1_1',48,false],['high','Ultimate1_1',60,false],...(id==='shady'?[['strike','Skill1_2',48,false]]:[])]){
   if(!info.animations.some(a=>a.name===source))continue;
   const baked=await page.evaluate(({key,source,count,loop})=>{
    const {s,app,pose}=window.elite71,scale=.14,pad=16,columns=8,duration=s.skeleton.data.findAnimation(source).duration,sample=i=>duration*i/(loop?count:count-1);s.scale.set(1);s.position.set(0,0);
    let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;for(let i=0;i<count;i++){pose(source,sample(i));const q=s.getBounds();l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.right);b=Math.max(b,q.bottom);}
    const width=Math.ceil(((r-l)*scale+pad*2)/16)*16,height=Math.ceil(((b-t)*scale+pad*2)/16)*16,origin=[pad-l*scale,pad-t*scale],rows=Math.ceil(count/columns);app.renderer.resize(width,height);s.scale.set(scale);s.position.set(...origin);
    const sheet=document.createElement('canvas');sheet.width=columns*width;sheet.height=rows*height;const c=sheet.getContext('2d');let poster;for(let i=0;i<count;i++){pose(source,sample(i));app.renderer.render(app.stage);c.drawImage(app.view,i%columns*width,Math.floor(i/columns)*height);if(i===0&&key==='idle')poster=app.view.toDataURL();}
    return {image:sheet.toDataURL('image/webp',.96),poster,meta:{key,source,count,loop,duration,width,height,origin,columns,rows,bounds:{left:l,top:t,right:r,bottom:b}}};
   },{key,source,count,loop});
   await fs.writeFile(`${output}/${id}-${key}.webp`,Buffer.from(baked.image.split(',')[1],'base64'));if(baked.poster)await fs.writeFile(`${output}/${id}-poster.png`,Buffer.from(baked.poster.split(',')[1],'base64'));hero.clips[key]={...baked.meta,image:`./${output}/${id}-${key}.webp`};console.log(id,key,baked.meta.width,baked.meta.height);
  }
  meta.heroes[id]=hero;await page.evaluate(()=>window.elite71.app.destroy(false,{children:true,texture:false,baseTexture:false}));
 }
 await fs.writeFile(`${output}/atlas.json`,JSON.stringify(meta,null,2)+'\n');await fs.writeFile(`${output}/atlas.js`,'export const ELITE_ART = '+JSON.stringify(meta)+';\n');
 await fs.writeFile(`${output}/sources.json`,JSON.stringify([...sources.values()].filter(s=>/\/spine\/battle\/(shady|velvet|erpin)\//.test(s.url)),null,2)+'\n');
}finally{await browser.close();}
