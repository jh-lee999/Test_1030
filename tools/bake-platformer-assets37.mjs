// Whole original poses exported through the public viewer; no runtime CDN.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {openTrickcalReference} from './lib/trickcal-reference.mjs';
const run=promisify(execFile),output='assets/trickcal-stage37';
const {browser,page,sources,responses}=await openTrickcalReference();
try{
  await fs.mkdir(output,{recursive:true});
  const catalog=await page.evaluate(async()=>({monsters:await(await fetch('/spine/data.json')).json(),backgrounds:await(await fetch('/backgroundlist/datalist.json')).json()}));
  const entries=['shadyfollowercloserange','shadyfollowerlongrange','blanketghost'].map(id=>catalog.monsters.find(e=>e.id==='monsters/'+id));
  const meta={version:37,source:'https://viewer.dclnslde.com/',skin:'Skin_Gloomy',monsters:{},backgrounds:{}};
  for(let n=0;n<entries.length;n++){
    const entry=entries[n],key=['fan','archer','ghost'][n];
    await page.evaluate(async e=>{
      const {Assets,Application}=await import('/assets/lib-BFAhM2oF.js'),{Spine}=await import('/assets/dist-BKtfa-2w.js');
      const base='/spine/'+(e.resourceId||e.id)+'/',alias=e.id.replaceAll('/','-');
      await Assets.load([{alias:alias+'-s',src:base+e.skeletonFile},{alias:alias+'-a',src:base+e.atlasFile}]);
      const s=Spine.from(alias+'-s',alias+'-a');s.autoUpdate=false;s.skeleton.setSkinByName('Skin_Gloomy');
      const app=new Application({width:256,height:256,backgroundAlpha:0,antialias:true,resolution:1,preserveDrawingBuffer:true});app.stop();app.stage.addChild(s);
      const apply=s.state.apply.bind(s.state);s.state.apply=skeleton=>{const value=apply(skeleton);for(const slot of skeleton.slots)if(/^CommonShadow/.test(slot.data.name))slot.setAttachment(null);return value;};
      const pose=(name,time)=>{s.state.clearTracks();s.skeleton.setToSetupPose();s.state.setAnimation(0,name,false);s.update(time);s.state.apply(s.skeleton);s.skeleton.updateWorldTransform();};
      window.stage37={s,app,pose};
    },entry);
    const monster={id:entry.id,name:entry.displayName,renderScale:.2,clips:{}};
    for(const spec of [{key:'idle',name:'Idle',count:48,loop:true},{key:'walk',name:'Move',count:24,loop:true},{key:'attack',name:'Attack1_1_Gloomy',count:32},{key:'die',name:'Die',count:32}]){
      const baked=await page.evaluate(spec=>{
        const {s,app,pose}=window.stage37,scale=.2,pad=12,columns=8;
        s.scale.set(1);s.position.set(0,0);const duration=s.skeleton.data.findAnimation(spec.name).duration;
        const sample=i=>duration*i/(spec.loop?spec.count:spec.count-1);
        let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;
        for(let i=0;i<spec.count;i++){pose(spec.name,sample(i));const q=s.getBounds();if(q.width>0){l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.right);b=Math.max(b,q.bottom);}}
        const width=Math.ceil(((r-l)*scale+pad*2)/16)*16,height=Math.ceil(((b-t)*scale+pad*2)/16)*16,origin=[pad-l*scale,pad-t*scale],rows=Math.ceil(spec.count/columns);
        app.renderer.resize(width,height);s.scale.set(scale);s.position.set(...origin);
        const sheet=document.createElement('canvas');sheet.width=width*columns;sheet.height=height*rows;const ctx=sheet.getContext('2d');let poster;
        for(let i=0;i<spec.count;i++){pose(spec.name,sample(i));app.renderer.render(app.stage);ctx.drawImage(app.view,i%columns*width,Math.floor(i/columns)*height);if(spec.key==='idle'&&i===0)poster=app.view.toDataURL();}
        return {image:sheet.toDataURL('image/webp',.96),poster,meta:{...spec,duration,width,height,origin,rows,columns}};
      },spec);
      await fs.writeFile(`${output}/${key}-${spec.key}.webp`,Buffer.from(baked.image.split(',')[1],'base64'));
      if(baked.poster)await fs.writeFile(`${output}/${key}-poster.png`,Buffer.from(baked.poster.split(',')[1],'base64'));
      monster.clips[spec.key]={...baked.meta,image:`./${output}/${key}-${spec.key}.webp`};
      console.log(key,spec.key,baked.meta.width,baked.meta.height);
    }
    meta.monsters[key]=monster;
    await page.evaluate(()=>{window.stage37.app.destroy(false,{children:true,texture:false,baseTexture:false});});
  }
  for(const [key,id]of[['forest',9],['night',150]]){
    const entry=catalog.backgrounds.find(e=>new RegExp('/'+id+'\\.png').test(e.src));
    if(!entry)throw Error('Missing background '+id);
    await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();},entry.src);
    const url=new URL(entry.src,meta.source).href,body=responses.get(url);if(!body)throw Error('Missing source bytes');
    const temp=`/tmp/trickcal-bg37-${id}.png`;await fs.writeFile(temp,body);
    await run('convert',[temp,'-quality','94',`${output}/${key}.webp`]);
    meta.backgrounds[key]={image:`./${output}/${key}.webp`,source:url,sourceSha256:createHash('sha256').update(body).digest('hex')};
  }
  await fs.writeFile(`${output}/atlas.json`,JSON.stringify(meta,null,2)+'\n');
  await fs.writeFile(`${output}/atlas.js`,'// Generated by tools/bake-platformer-assets37.mjs\nexport const STAGE_ART = '+JSON.stringify(meta)+';\n');
  await fs.writeFile(`${output}/sources.json`,JSON.stringify([...sources.values()].filter(s=>/\/spine\/monsters\/|\/backgroundlist\/images\//.test(s.url)),null,2)+'\n');
}finally{await browser.close();}
