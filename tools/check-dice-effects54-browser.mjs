import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4187',errors=[];
async function open(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/dice54.html?test=1&seed=54');await page.waitForSelector('body[data-ready="true"]');await page.waitForFunction(()=>window.__dice52.images.effects?.naturalWidth===512);await page.locator('#start').click();await page.locator('[data-relic]').last().click();await page.waitForSelector('body[data-phase="pick"]');}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await open(page);
 await page.locator('[data-pattern="free"]').click();await page.locator('#attack').click();
 // Capture a genuine first shot at its flight midpoint. No score/clock grants.
 await page.evaluate(async()=>{const {sampleDiceEffects}=await import('./dice-effects.js?v=54'),{pause}=await import('./dice-engine.js?v=53.1');await new Promise((resolve,reject)=>{let frames=0;function observe(){const g=window.__dice52.game,rock=sampleDiceEffects(g).find(s=>s.id==='rock');if(rock&&rock.x>420&&rock.x<680){pause(g);resolve();}else if(++frames>180)reject(Error('missed actual projectile'));else requestAnimationFrame(observe);}observe();});});
 await page.waitForSelector('body[data-phase="paused"]');const flight=await page.locator('#scene').evaluate(c=>c.toDataURL());await writeFile('/tmp/fx54-real-flight.png',Buffer.from(flight.split(',')[1],'base64'));const frozen=await page.evaluate(()=>JSON.stringify(window.__dice52.game.pending));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>JSON.stringify(window.__dice52.game.pending)),frozen);await page.locator('#resume').click();await page.waitForSelector('body[data-phase="pick"]');assert.equal(await page.evaluate(()=>window.__dice52.game.attacks),1);
 // Explicit deterministic visual fixtures: same renderer and assets, not a legal build.
 const report=await page.evaluate(async()=>{
  const {createGame,chooseRelic,attack,tick}=await import('./dice-engine.js?v=53.1'),{renderDiceScene}=await import('./dice-renderer.js?v=54'),{sampleDiceEffects,shotGeometry}=await import('./dice-effects.js?v=54');
  const strip=document.createElement('canvas');strip.width=1000;strip.height=900;const c=strip.getContext('2d'),images=window.__dice52.images;
  const g=createGame(54);chooseRelic(g,g.choices[0]);for(let i=0;i<40;i++)tick(g,1/120);Object.assign(g,{relics:['yellow','weather'],rage:3,dice:[6,6,6,6,6],enemyHp:2000});attack(g,'kind');const q=shotGeometry(g),clocks=[q.release+.04,q.release+.18,g.pending.hitAt+.08];
  const counts=[];for(let i=0;i<clocks.length;i++){g.pending.clock=clocks[i];g.pending.applied=clocks[i]>=g.pending.hitAt;g.action.time=clocks[i];const before=JSON.stringify(g);c.save();c.translate(0,i*300);c.beginPath();c.rect(0,0,1000,300);c.clip();renderDiceScene(c,g,images);c.restore();if(before!==JSON.stringify(g))throw Error('renderer mutated state');counts.push(sampleDiceEffects(g).length);}
  window.__fx54strip=strip;return {image:strip.toDataURL(),counts,bolt:sampleDiceEffects(g).some(s=>s.id==='bolt'),size:images.effects.naturalWidth};
 });
 await writeFile('/tmp/fx54-enhanced-strip.png',Buffer.from(report.image.split(',')[1],'base64'));assert.ok(report.bolt);assert.equal(report.size,512);assert.ok(report.counts.every(n=>n>0&&n<=32));
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await open(mobile);await mobile.locator('#attack').tap();await mobile.waitForSelector('body[data-phase="resolve"]');assert.deepEqual(await mobile.evaluate(async()=>{const {sampleDiceEffects}=await import('./dice-effects.js?v=54');return sampleDiceEffects(window.__dice52.game,{reduced:true}).filter(s=>s.id!=='ring');}),[]);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/dice-fx54/particles.png',r=>r.abort());await fallback.goto(root+'/dice54.html?test=1&seed=54');await fallback.waitForSelector('body[data-ready="true"]');await fallback.locator('#start').click();await fallback.locator('[data-relic]').last().click();await fallback.waitForSelector('body[data-phase="pick"]');await fallback.locator('#attack').click();await fallback.waitForSelector('body[data-phase="pick"]');assert.equal(await fallback.evaluate(()=>window.__dice52.game.attacks),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({actualInputFlight:true,pauseFreezes:true,enhancedFixtures:report.counts,weatherBolt:true,rendererReadOnly:true,reducedMotion:true,mobile:true,missingEffectsPlayable:true,errors},null,2));
}finally{await browser.close();}
