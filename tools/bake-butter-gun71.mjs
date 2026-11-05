// Render whole poses through the public viewer's own rig. No painted/cutout
// replacements, no bundled Spine runtime, no runtime requests to the viewer.
// Uses the managed proxy and normal TLS verification for the SAME public URLs.
import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const run=promisify(execFile),origin='https://viewer.dclnslde.com';
const expected={
  'Butter.png':'3f0b809ecab4f6560e7a7d035b2e4fbb27d8493a2ff3a8bd4eb9c588de080613',
  'Butter.atlas':'4e9610a78c7934cd9a7c608cdc9192edba5f19aac2ae9317a015eda0fd2b2b4a',
  'Butter.skel':'191c9632527f68ffa821d0376e0e786d098097ad74740c7d5f7d568346682e09',
};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
  const context=await browser.newContext({serviceWorkers:'block'}),responses=new Map();
  await context.route('https://**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!==origin||route.request().method()!=='GET')return route.abort();
    try {
      let body=responses.get(u.href);
      if(!body){({stdout:body}=await run('curl',['-fsSL','--max-time','30','--max-filesize','25000000',u.href],{encoding:'buffer',maxBuffer:26000000}));responses.set(u.href,body);}
      const name=u.pathname.split('/').pop();
      if(u.pathname.startsWith('/spine/battle/butter/')&&expected[name]&&createHash('sha256').update(body).digest('hex')!==expected[name])throw Error('Source changed: '+name);
      const type={js:'text/javascript',css:'text/css',json:'application/json',png:'image/png',webp:'image/webp',ttf:'font/ttf'}[name.split('.').pop()]||(u.pathname==='/'?'text/html':'application/octet-stream');
      await route.fulfill({status:200,body,contentType:type});
    } catch(error){console.error('Source request failed:',u.pathname,error.message);await route.abort();}
  });
  const page=await context.newPage();page.on('pageerror',e=>console.error(e.message));
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.waitForSelector('#root .app');
  await page.evaluate(async()=>{
    const {Assets,Application}=await import('/assets/lib-BFAhM2oF.js');
    const {Spine}=await import('/assets/dist-BKtfa-2w.js');
    await Assets.load([{alias:'b36-skel',src:'/spine/battle/butter/Butter.skel'},{alias:'b36-atlas',src:'/spine/battle/butter/Butter.atlas'}]);
    const s=Spine.from('b36-skel','b36-atlas');s.autoUpdate=false;s.skeleton.setSkinByName('Normal');
    const app=new Application({width:256,height:256,backgroundAlpha:0,antialias:true,resolution:1,preserveDrawingBuffer:true});app.stop();app.stage.addChild(s);
    const fields=['x','y','rotation','scaleX','scaleY','shearX','shearY'];
    const lower=b=>b.data.name==='root'||/^(Pelvis_|Leg_|UpLeg_|Foot_|skirt_|tail_|Bag(?:$|_))/.test(b.data.name);
    const ikFields=['mix','softness','bendDirection','compress','stretch'];
    const transformFields=['mixRotate','mixX','mixY','mixScaleX','mixScaleY','mixShearY'];
    let restore=null;
    const originalApply=s.state.apply.bind(s.state);
    // Restore lower-body LOCAL rig state before Spine updates world transforms
    // and attachments. Updating bones after s.update() leaves stale mesh vertices.
    s.state.apply=skeleton=>{
      const result=originalApply(skeleton);
      if(restore){
        for(const item of restore.bones){const b=skeleton.findBone(item.name);fields.forEach((k,i)=>b[k]=item.values[i]);}
        for(const item of restore.ik){const ik=skeleton.ikConstraints.find(c=>c.data.name===item.name);ikFields.forEach((k,i)=>ik[k]=item.values[i]);}
        for(const item of restore.transforms){const c=skeleton.transformConstraints.find(c=>c.data.name===item.name);transformFields.forEach((k,i)=>c[k]=item.values[i]);}
      }
      for(const slot of skeleton.slots)if(/^CommonShadow/.test(slot.data.name))slot.setAttachment(null);
      return result;
    };
    function rawPose(name,time){s.state.clearTracks();s.skeleton.setToSetupPose();s.state.setAnimation(0,name,false);s.update(time);s.state.apply(s.skeleton);s.skeleton.updateWorldTransform();}
    function pose(name,time,gait){
      restore=null;
      if(gait!==undefined){
        rawPose('Move',gait*s.skeleton.data.findAnimation('Move').duration);
        restore={bones:s.skeleton.bones.filter(lower).map(b=>({name:b.data.name,values:fields.map(k=>b[k])})),
          ik:s.skeleton.ikConstraints.filter(c=>c.bones.some(lower)).map(c=>({name:c.data.name,values:ikFields.map(k=>c[k])})),
          transforms:s.skeleton.transformConstraints.filter(c=>c.bones.some(lower)).map(c=>({name:c.data.name,values:transformFields.map(k=>c[k])}))};
      }
      rawPose(name,time);
      // Pixi also applies the state while updating bounds/rendering. Keep the
      // lower-body override alive until the next pose, not only this call.
      // The game draws its own floor shadow; the apply hook hides those slots.
    }
    window.butter36={s,app,pose};
  });
  console.log(await page.evaluate(()=>window.butter36.s.skeleton.data.findAnimation('OW1_Attack2_1').timelines.filter(t=>t.events).map(t=>t.events.map(e=>({time:e.time,name:e.data.name,string:e.stringValue})))));
  if(process.env.BUTTER_BAKE_DIAGNOSTICS==='1')console.log(await page.evaluate(()=>{
    const {s}=window.butter36;
    return {update:String(s.internalUpdate),constraints:s.skeleton.transformConstraints.map(c=>({name:c.data.name,bones:c.bones.map(b=>b.data.name),target:c.target.data.name})),ik:s.skeleton.ikConstraints.map(c=>({name:c.data.name,bones:c.bones.map(b=>b.data.name),target:c.target.data.name}))};
  }));
  // Original aim/fire/recoil window, no repeated pocket/draw on every attack.
  // Source Event 1002924 at 1.4333334s agrees with visible recoil.
  const specs=[{key:'gun',name:'OW1_Attack2_1',start:1.2,end:1.85,frames:36,release:(1.4333334-1.2)/.65},{key:'walkGun',name:'OW1_Attack2_1',start:1.2,end:1.85,gaitFrames:24,shotFrames:16,release:(1.4333334-1.2)/.65}];
  const output=resolve('assets/butter-gun71');await fs.mkdir(output,{recursive:true});
  const meta={version:71,source:origin+'/spine/battle/butter/',skin:'Normal',renderScale:.18,directions:['original-three-quarter'],mirrored:false,clips:{}};
  for(const spec of specs){
    const baked=await page.evaluate(spec=>{
      const {s,app,pose}=window.butter36,scale=.18,padding=12;
      s.scale.set(1);s.position.set(0,0);
      const duration=spec.end-spec.start,count=spec.frames??spec.gaitFrames*spec.shotFrames;
      const sample=i=>({time:spec.start+duration*(spec.gaitFrames?i%spec.shotFrames/(spec.shotFrames-1):i/(spec.loop?count:count-1)),gait:spec.gaitFrames?Math.floor(i/spec.shotFrames)/spec.gaitFrames:undefined});
      let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
      for(let i=0;i<count;i++){const q=sample(i);pose(spec.name,q.time,q.gait);const b=s.getBounds();left=Math.min(left,b.x);top=Math.min(top,b.y);right=Math.max(right,b.right);bottom=Math.max(bottom,b.bottom);}
      const width=Math.ceil(((right-left)*scale+padding*2)/16)*16,height=Math.ceil(((bottom-top)*scale+padding*2)/16)*16;
      const origin=[padding-left*scale,padding-top*scale],columns=8,rows=Math.ceil(count/columns);
      app.renderer.resize(width,height);s.scale.set(scale);s.position.set(...origin);
      const sheet=document.createElement('canvas');sheet.width=width*columns;sheet.height=height*rows;const ctx=sheet.getContext('2d');
      const anchors=[],lowerChecks=[];let poster;
      for(let i=0;i<count;i++){
        const q=sample(i);pose(spec.name,q.time,q.gait);app.renderer.render(app.stage);ctx.drawImage(app.view,i%columns*width,Math.floor(i/columns)*height);
        const bone=s.skeleton.findBone('Point_Attack_OW1');
        anchors.push([Number((bone.worldX*scale).toFixed(3)),Number((bone.worldY*scale).toFixed(3))]);
        if(spec.gaitFrames){const l=s.skeleton.findBone('Leg_L'),r=s.skeleton.findBone('Leg_R');lowerChecks.push([l.worldX,l.worldY,r.worldX,r.worldY].map(v=>Number(v.toFixed(4))));}
        if(spec.key==='idle'&&i===0)poster=app.view.toDataURL('image/png');
      }
      return {image:sheet.toDataURL('image/webp',.96),poster,meta:{...spec,duration,count,width,height,columns,rows,origin,bounds:{left,top,right,bottom},anchors,lowerChecks}};
    },spec);
    await fs.writeFile(resolve(output,spec.key+'.webp'),Buffer.from(baked.image.split(',')[1],'base64'));
    if(baked.poster)await fs.writeFile(resolve(output,'poster.png'),Buffer.from(baked.poster.split(',')[1],'base64'));
    meta.clips[spec.key]={...baked.meta,image:`./assets/butter-gun71/${spec.key}.webp`};
    console.log(spec.key,baked.meta.count,`${baked.meta.width}x${baked.meta.height}`);
  }
  await fs.writeFile(resolve(output,'atlas.json'),JSON.stringify(meta,null,2)+'\n');
  await fs.writeFile(resolve(output,'atlas.js'),'// Generated by tools/bake-butter-gun71.mjs\nexport const BUTTER_GUN = '+JSON.stringify(meta)+';\n');
} finally {await browser.close();}
