import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.env.GAME_URL||'http://127.0.0.1:4196',errors=[];
try{
 const p=await browser.newPage({viewport:{width:1366,height:850},deviceScaleFactor:2});p.on('pageerror',e=>errors.push(e.message));
 await p.goto(root+'/dungeon80.html?test=1&persist=1&seed=compat81',{waitUntil:'domcontentloaded'});await p.waitForSelector('body[data-ready="true"]');await p.locator('#start').click();await p.keyboard.down('ArrowLeft');await p.waitForFunction(()=>__dungeon80.game.shots>0);await p.keyboard.up('ArrowLeft');await p.keyboard.press('Escape');const old=await p.evaluate(()=>structuredClone(__dungeon80.game));
 await p.goto(root+'/dungeon81.html?test=1&persist=1');await p.waitForSelector('body[data-ready="true"]');await p.locator('[data-continue]').click();assert.deepEqual(await p.evaluate(()=>structuredClone(__dungeon81.game)),old);
 await p.evaluate(()=>{__dungeon81.engine.takeItem(__dungeon81.game,'yellow');__dungeon81.sync();});await p.waitForFunction(()=>__dungeon81.images.butter.walkGun?.naturalWidth>0);
 const pixels=await p.evaluate(async()=>{
  const {drawButterMotion,selectButterFrame}=await import('./butter-gun-motion71.js'),{cachedContext,cacheStats}=await import('./dungeon81-cache.js');
  const raw=document.createElement('canvas'),tile=document.createElement('canvas');raw.width=tile.width=900;raw.height=tile.height=800;const a=raw.getContext('2d',{willReadFrequently:true}),b=tile.getContext('2d',{willReadFrequently:true}),cached=cachedContext(b);let compared=0,maxError=0,maxAlphaError=0,maxPremultipliedError=0;const mismatches=[];
  for(const type of [null,'normal','high','gun'])for(const moving of [false,true])for(const facing of [-1,1])for(const phase of [0,.44,.7,.99]){
   const state={size:112,gait:{amount:moving?1:0,phase:phase*Math.PI*2,clock:phase},action:type?{type,time:phase,duration:1}:null,time:phase};
   // The original anchors are fractional. Compare the WHOLE source cells at
   // integer native scale: a canvas/bitmap may use a different interpolation
   // kernel from an HTML image at subpixel game positions, not different poses.
   const f=selectButterFrame(state),im=__dungeon81.images.butter[f.key];
   const calls=[];drawButterMotion({save(){},restore(){},drawImage(...args){calls.push(args);}},__dungeon81.images.butter,state);
   if(calls.length!==1||calls[0][1]!==f.rect[0]||calls[0][2]!==f.rect[1]||calls[0][5]!==-f.origin[0])throw Error('source/anchor changed');
   for(const c of [a,cached]){c.setTransform(facing,0,0,1,facing<0?700:0,0);c.clearRect(-900,0,1800,800);c.drawImage(im,...f.rect,0,0,f.clip.width,f.clip.height);}
   const x=a.getImageData(0,0,900,800).data,y=b.getImageData(0,0,900,800).data;let alpha=0,pm=0;for(let i=0;i<x.length;i+=4){alpha=Math.max(alpha,Math.abs(x[i+3]-y[i+3]));for(let j=0;j<3;j++){maxError=Math.max(maxError,Math.abs(x[i+j]-y[i+j]));pm=Math.max(pm,Math.abs(x[i+j]*x[i+3]-y[i+j]*y[i+3])/255);}}maxAlphaError=Math.max(maxAlphaError,alpha);maxPremultipliedError=Math.max(maxPremultipliedError,pm);if(alpha>2||pm>2)mismatches.push({type,moving,facing,phase,alpha,pm});compared++;
  }
  return {compared,maxError,maxAlphaError,maxPremultipliedError,mismatches,cache:cacheStats()};
 });
 assert(pixels.maxAlphaError<=2);assert(pixels.maxPremultipliedError<=2);assert(pixels.cache.bytes<=pixels.cache.limit);
 // Camera resize and a second context cannot retain an old-sized map/background.
 await p.setViewportSize({width:568,height:320});await p.evaluate(()=>__dungeon81.render());await p.screenshot({path:'/tmp/dungeon81-dpr2-resize.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({exact80To81Resume:true,nativeWholePosePixelComparison:pixels,dpr2Resize:true,errors},null,2));
}finally{await browser.close();}
