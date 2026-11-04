// Native UI resource run. Diagnostic policy decisions, not a human fun test.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4192',errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(root+'/cards67.html?test=1&persist=1&seed=poker58-0&mode=deep');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();await page.locator('[data-starter="echo"]').click();
 await page.evaluate(async()=>{window.policy=await import('./tools/playtest-poker58.mjs');});let attacks=0,discards=0,shops=0,wardObserved=false;
 for(let i=0;i<180;i++){
  const phase=await page.evaluate(()=>window.__poker58.game.phase);if(['won','dead'].includes(phase))break;
  if(phase==='pick'){
   const p=await page.evaluate(()=>{const g=window.__poker58.game,E=window.__poker58.engine,r=E.bestHand(g);return {lethal:r&&r.damage>=g.enemyHp,plan:g.discards?window.policy.discardPlan(g):[],damage:r?.damage,ward:g.foe.boss&&!g.wardUsed,cap:Math.ceil(g.foe.maxHp*.5)};});
   if(!p.lethal&&p.plan?.length){for(const id of p.plan)await page.locator('[data-card="'+id+'"]').click();await page.locator('#discard').click();discards++;continue;}
   if(p.ward){assert(p.damage<=p.cap);wardObserved=true;assert.match(await page.locator('#tactical').innerText(),/꿈의 장막/);}
   await page.locator('#attack').click();attacks++;await page.waitForFunction(()=>window.__poker58.game.phase!=='resolve');continue;
  }
  assert.equal(phase,'shop');const p=await page.evaluate(()=>window.policy.shopPlan(window.__poker58.game));
  if(p.kind==='relic')await page.locator('[data-buy-relic="'+p.id+'"]').click();
  else if(p.kind==='rest')await page.locator('[data-service="rest"]').click();
  else if(p.kind==='train'){await page.locator('[data-service="train"]').click();await page.locator('[data-train="'+p.id+'"]').click();}
  else if(p.kind==='remove'||p.kind==='copy'){await page.locator('[data-service="'+p.kind+'"]').click();await page.locator('[data-deck-card="'+p.id+'"]').click();await page.locator('#confirm-edit').click();}
  else {await page.locator('[data-travel="safe"]').click();shops++;}
 }
 assert.equal(await page.evaluate(()=>window.__poker58.game.phase),'won');assert.equal(shops,5);assert(wardObserved);assert(attacks>6&&discards>0);assert.equal(await page.locator('.run-recap').count(),1);assert.equal(await page.locator('.run-timeline>span').count(),6);await page.screenshot({path:'/tmp/poker65-deep-win.png'});
 const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('butter.cards.profile.v1')).records);assert.equal(record.length,1);assert.equal(record[0].mode,'deep');assert.equal(await page.evaluate(()=>localStorage.getItem('butter.cards.run.v1')),'');await page.reload();await page.waitForSelector('body[data-ready="true"]');assert.equal(await page.locator('#continue-run').count(),0);await page.locator('[data-open="records"]').click();assert.equal(await page.locator('.record-item').count(),1);assert.match(await page.locator('.record-item').innerText(),/탈출 성공/);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({nativeDeepSixRoomWin:true,resourceGrants:0,clockAcceleration:false,attacks,discards,shops,bossWardObserved:true,recap:true,terminalRecordPersists:true,noEndSaveRevive:true,errors},null,2));
}finally{await browser.close();}
