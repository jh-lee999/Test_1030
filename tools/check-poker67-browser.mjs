import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4193',errors=[];
async function open(page,{fallback=false}={}){
 page.on('pageerror',e=>errors.push(e.message));
 if(fallback)await page.route('**/butter-original36/*.webp',r=>r.abort());
 await page.addInitScript(()=>{
  window.facingCalls=[];const original=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
   if(this.canvas.id==='scene'){
    const src=image?.currentSrc||'',m=this.getTransform();
    if(src.includes('butter-original36/')||src.includes('trickcal-stage37/')){window.facingCalls.push({src,a:m.a,d:m.d,x:m.e,y:m.f});if(window.facingCalls.length>300)window.facingCalls.splice(0,100);}
   }
   return original.call(this,image,...args);
  };
 });
 await page.goto(root+'/?test=1&seed=61');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();await page.locator('[data-starter="echo"]').click();
 await page.waitForFunction(()=>window.facingCalls.some(c=>c.src.includes('butter-original36/')));
 const poses=await page.evaluate(()=>window.facingCalls.filter(c=>c.src.includes('butter-original36/')));assert(poses.every(c=>c.a===-1&&c.d===1&&c.x===220&&c.y===220));
}
async function flight(page,clip){
 await page.locator('#attack').click();
 const report=await page.evaluate(async()=>{
  const {sampleDiceEffects,shotGeometry}=await import('./dice-effects.js?v=67');const api=window.__poker58;
  return new Promise((resolve,reject)=>{let tries=0;function observe(){const g=api.game,q=shotGeometry(g,{heroFacing:-1,heroX:220}),rock=sampleDiceEffects(g,{heroFacing:-1,heroX:220}).find(s=>s.id==='rock');if(rock&&rock.x>q.from.x+30){api.engine.pause(g);resolve({from:q.from,legacy:shotGeometry(g).from,to:q.to,clock:g.pending.clock,release:q.release,hitAt:g.pending.hitAt,action:g.action.type,attacks:g.attacks});}else if(++tries>200)reject(Error('missed native flight'));else requestAnimationFrame(observe);}observe();});
 });
 await page.waitForSelector('body[data-phase="paused"]');assert.equal(report.attacks,1);assert(report.from.x>0&&report.from.x<810);assert.equal(report.from.x+report.legacy.x,410);assert.equal(report.from.y,report.legacy.y);assert(report.clock>report.release&&report.clock<report.hitAt);
 const calls=await page.evaluate(clip=>window.facingCalls.filter(c=>c.src.includes('/'+clip+'.webp')),clip);assert(calls.length>0);assert(calls.every(c=>c.a===-1&&c.d===1));
 const enemies=await page.evaluate(()=>window.facingCalls.filter(c=>c.src.includes('trickcal-stage37/')));assert(enemies.length>0);assert(enemies.every(c=>c.a===1&&c.d===1),'enemy and scene must not be flipped');
 await writeFile('/tmp/poker67-'+clip+'.png',Buffer.from((await page.locator('#scene').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));
 const clock=await page.evaluate(()=>window.__poker58.game.pending.clock);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.__poker58.game.pending.clock),clock);
 await page.locator('#resume').click();await page.waitForFunction(()=>window.__poker58.game.phase!=='resolve');assert.equal(await page.evaluate(()=>window.__poker58.game.attacks),1);
}
try{
 const high=await browser.newPage({viewport:{width:1440,height:1000}});await open(high);await writeFile('/tmp/poker67-idle.png',Buffer.from((await high.locator('#scene').evaluate(c=>c.toDataURL())).split(',')[1],'base64'));await flight(high,'high');await high.close();
 const normal=await browser.newPage({viewport:{width:1440,height:1000}});await open(normal);await normal.locator('#select-all').click();await normal.locator('#discard').click();await flight(normal,'shoot');assert.equal(await normal.evaluate(()=>window.__poker58.game.turn),2);await normal.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await open(mobile);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.locator('#attack').tap();await mobile.waitForSelector('body[data-phase="shop"]');assert.equal(await mobile.evaluate(()=>window.__poker58.game.attacks),1);await mobile.close();
 const fallback=await browser.newPage({reducedMotion:'reduce'});await open(fallback,{fallback:true});assert(await fallback.evaluate(()=>window.facingCalls.some(c=>c.src.endsWith('/poster.png')&&c.a===-1)));await fallback.locator('#attack').click();await fallback.waitForSelector('body[data-phase="shop"]');await fallback.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify({idleNormalHighFaceEnemy:true,wholePoseOnly:true,enemyNotMirrored:true,muzzleMatchesFacing:true,originalClocksAndOnceOnlyHit:true,pause:true,mobileReduced:true,posterFallbackMirrored:true,errors},null,2));
}finally{await browser.close();}
