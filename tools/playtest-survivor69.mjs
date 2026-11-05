import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {choose,pilot} from './survivor69-policy.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4195',seed=process.argv[3]||'balance-0',errors=[],held=new Set(),state={};
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/?test=1&persist=1&seed='+encodeURIComponent(seed));await page.waitForSelector('body[data-ready="true"]');await page.locator('[data-open="recipes"]').click();await page.locator('[data-goal="thunderweb"]').click();await page.locator('[data-close]').click();await page.locator('#start').click();let reported=-30;
 for(let i=0;i<4000;i++){
  const g=await page.evaluate(()=>window.__survivor69.game);if(g.time-reported>=30){reported=g.time;console.log(JSON.stringify({time:Math.round(g.time),hp:Math.round(g.player.hp),level:g.level,seals:g.seals,fusions:g.fusions}));}
  if(['dead','won'].includes(g.phase))break;
  if(g.phase==='upgrade'){for(const k of held)await page.keyboard.up(k);held.clear();await page.locator('[data-upgrade="'+choose(g,0)+'"]').click();continue;}
  assert.equal(g.phase,'playing','unexpected pause in native run');const decision=pilot(g,state),want=new Set();if(Math.abs(decision.input.x)>.25)want.add(decision.input.x>0?'d':'a');if(Math.abs(decision.input.y)>.25)want.add(decision.input.y>0?'s':'w');
  for(const k of held)if(!want.has(k)){await page.keyboard.up(k);held.delete(k);}for(const k of want)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}if(decision.interact)await page.keyboard.press('f');if(decision.ultimate)await page.keyboard.press('e');if(g.time>420)break;await page.waitForTimeout(110);
 }
 const report=await page.evaluate(()=>({game:window.__survivor69.game,profile:window.__survivor69.profile}));assert(['won','dead'].includes(report.game.phase));assert.deepEqual(errors,[]);assert.equal(report.profile.records.length,1);const shards=report.profile.shards;assert(shards>0);await page.screenshot({path:'/tmp/survivor69-native-end.png'});
 await page.locator('#lobby').click();await page.locator('[data-open="lab"]').click();const buy=page.locator('[data-study="vitality"]');if(await buy.isEnabled()){await buy.click();assert.equal(await page.evaluate(()=>window.__survivor69.profile.studies.vitality),1);}await page.reload();await page.waitForSelector('body[data-ready="true"]');assert.equal(await page.locator('#continue').count(),0);assert.equal(await page.evaluate(()=>window.__survivor69.profile.records.length),1);
 await writeFile('/tmp/survivor69-native-report.json',JSON.stringify({nativeOnly:true,seed,errors,report},null,2));console.log(JSON.stringify({nativeOnly:true,phase:report.game.phase,time:Math.round(report.game.time),level:report.game.level,seals:report.game.seals,fusions:report.game.fusions,shards,recordAndStudyPersist:true,errors},null,2));
}finally{await browser.close();}
