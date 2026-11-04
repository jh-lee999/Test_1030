import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4190',errors=[],external=[];
async function open(page,seed='poker58-0'){
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(root)&&!r.url().startsWith('data:'))external.push(r.url());});await page.goto(root+'/?test=1&seed='+seed);await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();await page.locator('[data-starter="echo"]').click();await page.waitForSelector('body[data-phase="pick"]');await page.evaluate(async()=>{window.__policy58=await import('./tools/playtest-poker58.mjs');});
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await open(page);
 assert.equal(await page.locator('[data-card]').count(),8);assert.equal(await page.evaluate(()=>window.__poker58.game.deck.length),52);
 // Native-input run: policy proposes using visible distribution, all mutations
 // go through actual buttons, resources never granted and clocks not accelerated.
 let clears=0,attacks=0,discards=0,removals=0,training=0;
 for(let n=0;n<160;n++){
  const phase=await page.evaluate(()=>window.__poker58.game.phase);if(['won','dead'].includes(phase))break;
  if(phase==='pick'){
   const p=await page.evaluate(()=>{const g=window.__poker58.game,E=window.__poker58.engine,r=E.bestHand(g);return {lethal:r&&r.damage>=g.enemyHp,plan:g.discards?window.__policy58.discardPlan(g):[],best:r?.damage,id:r?.id};});
   if(!p.lethal&&p.plan?.length){for(const id of p.plan)await page.locator('[data-card="'+id+'"]').click();await page.locator('#discard').click();discards++;continue;}
   assert.equal(await page.locator('#preview-damage').innerText(),String(p.best));await page.locator('#attack').click();assert.equal(await page.evaluate(()=>window.__poker58.game.lastResult.id),p.id);attacks++;await page.waitForFunction(()=>window.__poker58.game.phase!=='resolve');continue;
  }
  if(phase==='shop'){
   const p=await page.evaluate(()=>window.__policy58.shopPlan(window.__poker58.game));
   if(p.kind==='relic')await page.locator('[data-buy-relic="'+p.id+'"]').click();
   else if(p.kind==='rest')await page.locator('[data-service="rest"]').click();
   else if(p.kind==='train'){await page.locator('[data-service="train"]').click();await page.locator('[data-train="'+p.id+'"]').click();training++;}
   else if(p.kind==='remove'||p.kind==='copy'){await page.locator('[data-service="'+p.kind+'"]').click();await page.locator('[data-deck-card="'+p.id+'"]').click();await page.locator('#confirm-edit').click();if(p.kind==='remove')removals++;}
   else {await page.screenshot({path:'/tmp/poker58-shop.png'});await page.locator('[data-travel="safe"]').click();clears++;}
   continue;
  }
  throw Error('Unexpected native-run phase '+phase);
 }
 assert.equal(await page.evaluate(()=>window.__poker58.game.phase),'won');assert.equal(clears,5);assert(attacks>=6&&removals>0&&training>0&&discards>0);await page.screenshot({path:'/tmp/poker58-win.png'});
 // Explicit fixture tests BELOW are separate from the genuine six-room run.
 await page.locator('#replay').click();await page.locator('[data-starter="echo"]').click();
 await page.evaluate(()=>{const a=window.__poker58,g=a.game;g.hand=[10,11,12,13,14,2,4,7].map((rank,i)=>({id:'fixture'+i,rank,suit:'hearts'}));g.enemyHp=10000;a.sync();});
 assert.equal(await page.locator('#attack-name').innerText(),'로열 스트레이트 플러시');const hits=await page.evaluate(()=>window.__poker58.game.attacks);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__poker58.game.attacks),hits);
 await page.locator('#attack').click();await page.waitForFunction(()=>window.__poker58.game.pending?.clock>0.05);await page.locator('#help').click();const clock=await page.evaluate(()=>window.__poker58.game.pending.clock);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.__poker58.game.pending.clock),clock);await page.locator('[data-close]').click();await page.waitForFunction(()=>window.__poker58.game.phase==='pick');
 // Shop card services through native UI, with clearly labeled paid-state fixture.
 await page.evaluate(()=>{const a=window.__poker58,g=a.game;g.phase='shop';g.pending=null;g.action=null;g.gold=100;g.shop={relics:['weather'],booster:[{rank:14,suit:'hearts'}],cuts:0,copies:0,changes:0,lessons:0,rested:false,packBought:false};g.history=[{reward:14}];a.sync();});
 let target=await page.evaluate(()=>window.__poker58.game.deck[0].id);
 await page.locator('[data-service="suit"]').click();await page.locator('[data-deck-card="'+target+'"]').click();await page.selectOption('#edit-value','spades');await page.locator('#confirm-edit').click();assert.equal(await page.evaluate(id=>window.__poker58.game.deck.find(c=>c.id===id).suit,target),'spades');
 await page.locator('[data-service="rank"]').click();await page.locator('[data-deck-card="'+target+'"]').click();await page.selectOption('#edit-value','14');await page.locator('#confirm-edit').click();assert.equal(await page.evaluate(id=>window.__poker58.game.deck.find(c=>c.id===id).rank,target),14);
 await page.locator('[data-service="copy"]').click();await page.locator('[data-deck-card="'+target+'"]').click();await page.locator('#confirm-edit').click();assert.equal(await page.evaluate(()=>window.__poker58.game.deck.length),53);assert.equal(await page.evaluate(()=>window.__poker58.game.gold),88);
 // Browse and cancel do not spend or reroll offers.
 const shop=await page.evaluate(()=>JSON.stringify([window.__poker58.game.gold,window.__poker58.game.shop,window.__poker58.game.drawState]));await page.locator('[data-service="remove"]').click();await page.locator('[data-close]').click();assert.equal(await page.evaluate(()=>JSON.stringify([window.__poker58.game.gold,window.__poker58.game.shop,window.__poker58.game.drawState])),shop);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await open(mobile,'58');await mobile.locator('[data-card]').first().tap();assert.equal(await mobile.locator('[data-card][aria-pressed="true"]').count(),1);await mobile.locator('#discard').tap();assert.equal(await mobile.evaluate(()=>window.__poker58.game.discards),2);assert.equal(await mobile.evaluate(()=>window.__poker58.game.attacks),0);await mobile.screenshot({path:'/tmp/poker58-mobile.png'});
 for(const width of [320,390,760,844]){await mobile.setViewportSize({width,height:844});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow width '+width);await mobile.locator('#deck-open').tap();assert.equal(await mobile.locator('[data-deck-card]').count(),52);assert.equal(await mobile.evaluate(()=>{const p=document.querySelector('#screen-panel');return p.scrollWidth>p.clientWidth;}),false);await mobile.locator('[data-close]').tap();}
 await mobile.locator('#attack').tap();await mobile.waitForFunction(()=>window.__poker58.game.phase!=='resolve');assert.equal(await mobile.evaluate(()=>window.__poker58.game.attacks),1);
 await mobile.close();const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.route('**/assets/**',r=>r.request().resourceType()==='image'?r.abort():r.continue());await fallback.goto(root+'/?test=1&seed=fallback');await fallback.waitForSelector('body[data-ready="true"]');await fallback.locator('#start').click();await fallback.locator('[data-starter="echo"]').click();await fallback.locator('#attack').click();await fallback.waitForFunction(()=>window.__poker58.game.phase!=='resolve');assert.equal(await fallback.evaluate(()=>window.__poker58.game.attacks),1);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({nativeSixRoomRun:true,attacks,discards,removals,training,royalFixture:true,paidEditFixture:true,browseNoSpend:true,helpFreezes:true,noAutoFire:true,mobileTouch:true,allOptionalImagesFail:true,widths:[320,390,760,844],errors,external},null,2));
}finally{await browser.close();}
