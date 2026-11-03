// Whole source poses. No source rig edits or per-frame fitting.
import fs from 'node:fs/promises';
import {openTrickcalReference} from './lib/trickcal-reference.mjs';
const output='assets/trickcal-enemies43';
const entries=[['rusher','furrywarriorcloserange','FurryWarriorCloseRange','수인 광전사'],['guard','crayontanker','CrayonTanker','막을레용'],['caster','crayonwizard','CrayonWizard','지원할레용'],['drone','drones','DroneS','드론 S형']];
const {browser,page,sources}=await openTrickcalReference();
try{
  await fs.mkdir(output,{recursive:true});const meta={version:43,source:'https://viewer.dclnslde.com/',monsters:{}};
  for(const [key,id,stem,name]of entries){
    const info=await page.evaluate(async({id,stem})=>{
      const {Assets,Application}=await import('/assets/lib-BFAhM2oF.js'),{Spine}=await import('/assets/dist-BKtfa-2w.js');
      const base='/spine/monsters/'+id+'/';await Assets.load([{alias:id+'s',src:base+stem+'.skel'},{alias:id+'a',src:base+stem+'.atlas'}]);
      const s=Spine.from(id+'s',id+'a');s.autoUpdate=false;const skins=s.skeleton.data.skins.map(v=>v.name),animations=s.skeleton.data.animations.map(v=>v.name);
      const skin=skins.includes('Skin_Gloomy')?'Skin_Gloomy':skins.find(n=>n!=='default')||skins[0];s.skeleton.setSkinByName(skin);
      const app=new Application({width:256,height:256,backgroundAlpha:0,antialias:true,resolution:1,preserveDrawingBuffer:true});app.stop();app.stage.addChild(s);
      const apply=s.state.apply.bind(s.state);s.state.apply=sk=>{const value=apply(sk);for(const slot of sk.slots)if(/^CommonShadow/.test(slot.data.name))slot.setAttachment(null);return value;};
      const pose=(name,time)=>{s.state.clearTracks();s.skeleton.setToSetupPose();s.state.setAnimation(0,name,false);s.update(time);s.state.apply(s.skeleton);s.skeleton.updateWorldTransform();};window.export43={s,app,pose};return{skin,animations};
    },{id,stem});console.log(key,JSON.stringify(info));
    const choose=(pattern,fallback)=>info.animations.find(n=>pattern.test(n))||fallback;
    const idle=choose(/^Idle$/,'Idle'),walk=choose(/^Move$/,idle),attack=choose(/^Attack1_1_Gloomy$/,choose(/^Attack1_1/,choose(/^Attack/,idle))),die=choose(/^Die$/,idle);
    const monster={id:'monsters/'+id,name,skin:info.skin,clips:{}};
    for(const [clipKey,clipName,count,loop]of [['idle',idle,32,true],['walk',walk,24,true],['attack',attack,32,false],['die',die,24,false]]){
      const baked=await page.evaluate(({key,name,count,loop})=>{
        const {s,app,pose}=window.export43,scale=.2,pad=16,columns=8,duration=s.skeleton.data.findAnimation(name).duration;
        s.scale.set(1);s.position.set(0,0);let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
        const sample=i=>duration*i/(loop?count:count-1);
        for(let i=0;i<count;i++){pose(name,sample(i));const q=s.getBounds();if(q.width){l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.right);b=Math.max(b,q.bottom);}}
        const width=Math.ceil(((r-l)*scale+pad*2)/16)*16,height=Math.ceil(((b-t)*scale+pad*2)/16)*16,origin=[pad-l*scale,pad-t*scale],rows=Math.ceil(count/columns);
        app.renderer.resize(width,height);s.scale.set(scale);s.position.set(...origin);const sheet=document.createElement('canvas');sheet.width=width*columns;sheet.height=height*rows;const ctx=sheet.getContext('2d');let poster;
        for(let i=0;i<count;i++){pose(name,sample(i));app.renderer.render(app.stage);ctx.drawImage(app.view,i%columns*width,Math.floor(i/columns)*height);if(i===0&&key==='idle')poster=app.view.toDataURL();}
        return{image:sheet.toDataURL('image/webp',.96),poster,meta:{key,name,count,loop,duration,width,height,origin,rows,columns,bodyHeight:(b-t)*scale}};
      },{key:clipKey,name:clipName,count,loop});
      await fs.writeFile(`${output}/${key}-${clipKey}.webp`,Buffer.from(baked.image.split(',')[1],'base64'));
      if(baked.poster)await fs.writeFile(`${output}/${key}-poster.png`,Buffer.from(baked.poster.split(',')[1],'base64'));
      monster.clips[clipKey]={...baked.meta,image:`./${output}/${key}-${clipKey}.webp`};console.log('baked',key,clipKey,baked.meta.width,baked.meta.height);
    }
    monster.gameScale=100/monster.clips.idle.bodyHeight;meta.monsters[key]=monster;await page.evaluate(()=>window.export43.app.destroy(false,{children:true,texture:false,baseTexture:false}));
  }
  await fs.writeFile(`${output}/atlas.json`,JSON.stringify(meta,null,2)+'\n');await fs.writeFile(`${output}/atlas.js`,'export const ENEMY_ART = '+JSON.stringify(meta)+';\n');
  await fs.writeFile(`${output}/sources.json`,JSON.stringify([...sources.values()].filter(s=>/\/spine\/monsters\//.test(s.url)),null,2)+'\n');
}finally{await browser.close();}
