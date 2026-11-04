import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4187',errors=[];
async function open(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/?test=1&seed=52');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();await page.evaluate(async()=>{const m=await import('./tools/playtest-dice55.mjs');window.__runPolicy=m;});}
async function settle(page){await page.evaluate(()=>window.__runPolicy.settle(window.__dice55.game));await page.waitForTimeout(25);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await open(page);let camps=0,routes=0,attacks=0,rolls=0;
 for(let n=0;n<200;n++){
  const phase=await page.evaluate(()=>window.__dice55.game.phase);if(phase==='won')break;if(phase==='dead')throw Error('legal run died');
  if(['draft','reward'].includes(phase)){const id=await page.evaluate(()=>window.__runPolicy.relicChoice(window.__dice55.game));await page.locator('[data-relic="'+id+'"]').click();await settle(page);}
  else if(phase==='camp'){
   if(!camps)await page.screenshot({path:'/tmp/dice55-camp.png'});
   const points=await page.evaluate(()=>window.__dice55.game.campPoints);if(points){camps++;const c=await page.evaluate(()=>window.__runPolicy.campChoice(window.__dice55.game));await page.locator(c.kind==='train'?'[data-train="'+c.id+'"]':'[data-camp="'+c.kind+'"]').click();}else await page.locator('#leave-camp').click();
  }else if(phase==='route'){
   if(!routes)await page.screenshot({path:'/tmp/dice55-route.png'});routes++;await page.locator('[data-route]').first().click();await settle(page);
  }else if(phase==='pick'){
   if(!attacks){assert.match(await page.locator('.pattern-defense').first().innerText(),/방어/);const bounds=await page.locator('#attack').boundingBox();assert.ok(bounds.y+bounds.height<=900);await page.screenshot({path:'/tmp/dice55-combat.png'});}
   const move=await page.evaluate(()=>window.__runPolicy.bestMove(window.__dice55.game));
   if(move.type==='roll'){const held=await page.evaluate(()=>window.__dice55.game.held);for(let i=0;i<5;i++)if(held[i]!==Boolean(move.mask&(1<<i)))await page.locator('[data-die="'+i+'"]').click();await page.locator('#reroll').click();rolls++;await settle(page);}
   else if(move.type==='attack'){await page.locator('[data-pattern="'+move.id+'"]').click();const preview=await page.locator('#preview-damage').innerText();await page.locator('#attack').click();assert.equal(await page.evaluate(()=>window.__dice55.game.lastResult.damage),Number(preview));attacks++;await settle(page);}
   else{await page.locator('#pass').click();await settle(page);}
  }else await settle(page);
 }
 assert.equal(await page.evaluate(()=>window.__dice55.game.phase),'won');assert.equal(routes,5);assert.equal(await page.evaluate(()=>window.__dice55.game.history.length),6);await page.screenshot({path:'/tmp/dice55-win.png'});
 // Explicit four-slot replacement fixture, not a resource-run grant.
 await page.evaluate(()=>window.__dice55.start('52'));await page.locator('[data-relic]').first().click();await settle(page);
 await page.evaluate(()=>{const a=window.__dice55;Object.assign(a.game,{relics:['echo','weather','belt','mace'],strikes:2,maceHits:3,enemyHp:1,dice:[1,2,3,4,5]});a.attack(a.game,'free');window.__runPolicy.settle(a.game);});
 await page.locator('[data-camp="relic"]').click();const candidate=await page.locator('[data-relic]').first().getAttribute('data-relic');await page.locator('[data-relic]').first().click();assert.equal(await page.locator('[data-replace]').count(),4);assert.equal(await page.evaluate(()=>window.__dice55.game.campPoints),1);await page.screenshot({path:'/tmp/dice55-swap.png'});await page.locator('#swap-cancel').click();await page.locator('[data-relic="'+candidate+'"]').click();await page.locator('[data-replace="weather"]').click();assert.equal(await page.evaluate(()=>window.__dice55.game.relics.length),4);assert.equal(await page.evaluate(()=>window.__dice55.game.campPoints),0);assert.equal(await page.evaluate(()=>window.__dice55.game.strikes),0);
 // Explicit fixtures for camp cancellation, risk/reward and compact mobile UI.
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await open(mobile);await mobile.locator('[data-relic]').first().tap();await settle(mobile);
 await mobile.evaluate(()=>{const a=window.__dice55;a.game.enemyHp=1;a.attack(a.game,'free');window.__runPolicy.settle(a.game);});await mobile.waitForSelector('[data-camp="relic"]');
 await mobile.locator('[data-camp="relic"]').tap();const choices=await mobile.locator('[data-relic]').evaluateAll(bs=>bs.map(b=>b.dataset.relic));await mobile.locator('#reward-back').tap();await mobile.locator('[data-camp="relic"]').tap();assert.deepEqual(await mobile.locator('[data-relic]').evaluateAll(bs=>bs.map(b=>b.dataset.relic)),choices);await mobile.locator('#reward-back').tap();
 await mobile.locator('[data-train="pair"]').tap();assert.equal(await mobile.evaluate(()=>window.__dice55.game.training.pair),1);await mobile.screenshot({path:'/tmp/dice55-camp-mobile.png'});await mobile.locator('#leave-camp').tap();await mobile.screenshot({path:'/tmp/dice55-route-mobile.png'});await mobile.locator('[data-route="elite"]').tap();await settle(mobile);assert.equal(await mobile.evaluate(()=>window.__dice55.game.foe.elite),true);
 for(const width of [320,390,760,844]){await mobile.setViewportSize({width,height:width===844?390:844});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await mobile.locator('#help').tap();const frozen=await mobile.evaluate(()=>window.__dice55.game.time);await mobile.waitForTimeout(80);assert.equal(await mobile.evaluate(()=>window.__dice55.game.time),frozen);await mobile.locator('#help-close').tap();
 const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/assets/**/*.webp',r=>r.abort());await fallback.goto(root+'/?test=1');await fallback.waitForSelector('body[data-ready="true"]');await fallback.locator('#start').click();await fallback.locator('[data-relic]').first().click();await fallback.waitForSelector('body[data-phase="pick"]');await fallback.locator('#attack').click();assert.equal(await fallback.evaluate(()=>window.__dice55.game.attacks),1);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({genuineResourceRun:{attacks,rolls,routes,camps},defensePreview:true,rewardCancelNoReroll:true,training:true,eliteRoute:true,mobile:true,widths:[320,390,760,844],menusFreeze:true,assetFallback:true,errors},null,2));
}finally{await browser.close();}
