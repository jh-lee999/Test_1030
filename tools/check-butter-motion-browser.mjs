// ARCHIVED v35 checker. The active game is checked by check-butter-original-browser.mjs.
// Run against a local HTTP server. Playwright is optional for this visual check.
// PLAYWRIGHT_MODULE may select an already installed module; no downloads here.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || undefined,args:['--no-sandbox']});
try {
  const page=await browser.newPage({viewport:{width:1150,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const root=process.argv[2] || 'http://127.0.0.1:4183';
  await page.goto(`${root}/butter-2d-motion.html`);
  await page.waitForSelector('body[data-ready="true"]');
  assert.equal(await page.locator('body').getAttribute('data-renderer'),'layered35');
  const result=await page.evaluate(async()=>{
    const m=await import('./butter-motion.js?v=35'),image=new Image(),limbs=new Image(),clean=new Image();
    image.src=m.BUTTER_2D_LAYOUT.image;limbs.src=m.BUTTER_LIMB_IMAGE;clean.src=m.BUTTER_CLEAN_IMAGE;
    await Promise.all([image.decode(),limbs.decode(),clean.decode()]);
    const axes={down:[0,1],left:[-1,0],up:[0,-1],right:[1,0]},canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d',{willReadFrequently:true});let checked=0,headMaxDelta=0,minGutter=Infinity;const motionPixels={};
    const draw=(state,size)=>{
      canvas.width=canvas.height=size;ctx.translate(size/2,(148-112*.28)*size/160);ctx.scale(size/160,size/160);
      m.drawButterMotion(ctx,{atlas:image,limbs,clean},state);return ctx.getImageData(0,0,size,size).data;
    };
    const differences=(a,b,size,top,bottom,tolerance=2)=>{
      let n=0;for(let y=top;y<bottom;y++)for(let x=0;x<size;x++){
        const i=(y*size+x)*4;if(a[i+3]<8&&b[i+3]<8)continue;
        if(Math.abs(a[i]-b[i])>tolerance||Math.abs(a[i+1]-b[i+1])>tolerance||Math.abs(a[i+2]-b[i+2])>tolerance||Math.abs(a[i+3]-b[i+3])>tolerance)n++;
      }return n;
    };
    for(const size of [96,160])for(const [view,[x,y]] of Object.entries(axes)){
      const base={size:112,facingX:x,facingY:y,gait:{phase:0,amount:0,dx:x,dy:y},action:null};
      const reference=draw({...base,reference:true},size),idle=draw(base,size);
      if(differences(reference,idle,size,0,size,0))throw Error(`${view}: idle differs from approved pixels`);
      const headBottom=Math.floor((148+(275-m.BUTTER_2D_VIEWS[view].foot[1])*m.BUTTER_2D_LAYOUT.sourceScale)*size/160)-1;
      for(const type of [null,'normal','low','high'])for(let gait=0;gait<12;gait++)for(const time of type?[0,.3,.5,.55,.68,.8,1]:[0]){
        const s={...base,gait:{...base.gait,phase:gait/12*Math.PI*2,amount:1},action:type?{type,time,duration:1}:null};
        const pixels=draw(s,size);
        const headDiff=differences(reference,pixels,size,0,headBottom,0);headMaxDelta=Math.max(headMaxDelta,headDiff);
        if(headDiff)throw Error(`${view}/${type}/${gait}/${time}: head or face changed (${headDiff} pixels)`);
        if(view==='up'){
          // Arms reach forward, so the middle of the back must occlude them.
          // This catches the former white forearm drawn across the rear shirt.
          const t=m.butterSourceTransform(112,view),scale=size/160;
          const x0=Math.ceil((80+t.x+300*t.scale)*scale),x1=Math.floor((80+t.x+400*t.scale)*scale);
          const y0=Math.ceil((148+(315-m.BUTTER_2D_VIEWS.up.foot[1])*t.scale)*scale);
          const y1=Math.floor((148+(385-m.BUTTER_2D_VIEWS.up.foot[1])*t.scale)*scale);
          for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++)for(let channel=0;channel<4;channel++){
            // Ignore translucent source edge pixels: a layer behind them
            // legitimately increases opacity even with the correct order.
            if(reference[(yy*size+xx)*4+3]<255)continue;
            const i=(yy*size+xx)*4+channel;
            if(Math.abs(pixels[i]-reference[i])>2)throw Error(`up/${type}/${time}: back pixel changed at ${xx},${yy}, channel ${channel} (${pixels[i]} vs ${reference[i]})`);
          }
        }
        for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++)if(pixels[(yy*size+xx)*4+3]>=24){
          const g=Math.min(xx,yy,size-1-xx,size-1-yy);minGutter=Math.min(minGutter,g);
          if(g<2)throw Error(`${view}: clipped silhouette at ${xx},${yy}`);
        }
        checked++;
      }
      // Compare actual pixels: changing attack phase must animate the hand,
      // but leave the boots unchanged at the same gait phase.
      const gait={...base.gait,phase:Math.PI/2,amount:1};
      const a=draw({...base,gait,action:{type:'normal',time:.3,duration:1}},size);
      const b=draw({...base,gait,action:{type:'normal',time:.8,duration:1}},size);
      const bootTop=Math.ceil((148+(478-m.BUTTER_2D_VIEWS[view].foot[1])*m.BUTTER_2D_LAYOUT.sourceScale)*size/160);
      if(!differences(a,b,size,headBottom,bootTop))throw Error(`${view}: hand recoil missing`);
      if(differences(a,b,size,bootTop,size))throw Error(`${view}: attack reset boots`);
      const c=draw({...base,gait:{...gait,phase:Math.PI*1.5},action:{type:'normal',time:.3,duration:1}},size);
      const footDifference=differences(a,c,size,bootTop,size);
      motionPixels[`${view}/${size}`]=footDifference;
      if(footDifference<(size===96?40:100))throw Error(`${view}: motion is too small to read (${footDifference} pixels)`);
    }
    return {checked,headChangedPixels:headMaxDelta,minGutter,motionPixels};
  });
  console.log('Pixel comparison:',JSON.stringify(result));
  // Test the REAL requestAnimationFrame loop as well as sampled poses. A paused
  // or broken preview must not pass just because the renderer can draw frames.
  const live='canvas[data-view="down"][data-reference="false"]';
  assert.equal(await page.locator('body').getAttribute('data-playing'),'true');
  const liveBefore=await page.locator(live).evaluate(c=>c.toDataURL());
  await page.waitForTimeout(190);
  assert.notEqual(await page.locator(live).evaluate(c=>c.toDataURL()),liveBefore,'live preview is not moving');
  await page.locator('#play').click();
  const pausedPhase=await page.locator('#phase').inputValue();await page.waitForTimeout(180);
  assert.equal(await page.locator('#phase').inputValue(),pausedPhase,'pause must freeze the preview');
  await page.locator('#step').click();
  assert.notEqual(await page.locator('#phase').inputValue(),pausedPhase,'frame stepping must change the pose');
  const heldGait=await page.locator('#phase').inputValue();
  await page.locator('#shot-phase').evaluate(e=>{e.value='0.3';e.dispatchEvent(new Event('input'));});
  assert.equal(await page.locator('#phase').inputValue(),heldGait,'editing shot phase must not reset gait');
  await page.locator('#show-source').check();assert.equal(await page.locator('.reference:visible').count(),4);
  await page.locator('#show-source').uncheck();assert.equal(await page.locator('.reference:visible').count(),0);
  await page.locator('#play').click();
  const reduced=await browser.newPage({reducedMotion:'reduce',viewport:{width:390,height:844}});
  reduced.on('pageerror',e=>errors.push(String(e)));
  await reduced.goto(`${root}/butter-2d-motion.html`);await reduced.waitForSelector('body[data-ready="true"]');
  assert.equal(await reduced.locator('body').getAttribute('data-playing'),'false');
  assert.equal(await reduced.locator('#reduced-notice').isVisible(),true,'explain why autoplay is off');
  await reduced.locator('#enable-motion').click();
  assert.equal(await reduced.locator('body').getAttribute('data-playing'),'true');
  const reducedBefore=await reduced.locator(live).evaluate(c=>c.toDataURL());await reduced.waitForTimeout(190);
  assert.notEqual(await reduced.locator(live).evaluate(c=>c.toDataURL()),reducedBefore,'explicit play must work with reduced motion');
  await reduced.close();
  for(const mode of ['idle','walk','shoot','walkShoot','low','high'])await page.locator('#motion').selectOption(mode);
  await page.setViewportSize({width:320,height:740});
  await page.locator('#size').selectOption('256');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile preview overflow');
  await page.goto(`${root}/butter-2d-assets.html`);await page.waitForSelector('body[data-ready="true"]');
  await page.locator('button[data-direction="left"]').click();
  assert.equal(await page.locator('#preview').getAttribute('data-direction'),'left');
  await page.goto(root);await page.locator('#start-button').click();
  await page.waitForFunction(()=>document.querySelector('#start-screen').classList.contains('hidden'));
  await page.waitForSelector('#game-canvas[data-butter-renderer="layered35"]');
  await page.keyboard.down('d');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(400);
  await page.keyboard.up('d');await page.keyboard.up('ArrowLeft');
  await page.keyboard.press('e');await page.waitForTimeout(500);
  await page.locator('#pause-button').click();await page.locator('#resume-button').click();
  await page.reload();await page.locator('[data-character="komi"]').click();await page.locator('#start-button').click();
  await page.waitForFunction(()=>document.querySelector('#start-screen').classList.contains('hidden'));
  await page.keyboard.press('ArrowRight');await page.keyboard.press('q');
  const missing=await browser.newPage();missing.on('pageerror',e=>errors.push(String(e)));
  await missing.route('**/assets/butter-2d35/cleanplate.png',route=>route.abort());
  await missing.goto(`${root}/butter-2d-motion.html`);await missing.waitForSelector('body[data-ready="true"]');
  assert.equal(await missing.locator('body').getAttribute('data-renderer'),'fallback34','missing optional artwork must not break startup');
  assert.match(await missing.locator('#status').innerText(),/불러오지 못해/);
  await missing.goto(root);await missing.locator('#start-button').click();
  await missing.waitForFunction(()=>document.querySelector('#start-screen').classList.contains('hidden'));
  await missing.keyboard.press('ArrowLeft');await missing.close();
  assert.deepEqual(errors,[],'browser runtime errors');
  console.log(JSON.stringify({...result,livePlayback:'passed',reducedMotionOptIn:'passed',previewControls:'passed',mobile:'passed',butterAndKomiStart:'passed',runtimeErrors:errors},null,2));
} finally { await browser.close(); }
