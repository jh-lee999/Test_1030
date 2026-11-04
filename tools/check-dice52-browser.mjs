import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4187',errors=[],external=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(root)&&!r.url().startsWith('data:'))external.push(r.url());});};
async function open(page){watch(page);await page.goto(root+'/?test=1&seed=52');await page.waitForSelector('body[data-ready="true"]');}
async function settle(page){await page.evaluate(()=>{const a=window.__dice52;for(let i=0;i<300&&['rolling','resolve'].includes(a.game.phase);i++)a.tick(a.game,1/120);});await page.waitForTimeout(30);}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});await open(page);
 await page.screenshot({path:'/tmp/dice52-title-desktop.png'});await page.locator('#learn').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#start').isVisible(),true);
 await page.locator('#start').click();assert.equal(await page.locator('[data-relic]').count(),3);await page.screenshot({path:'/tmp/dice52-draft-desktop.png'});await page.locator('[data-relic]').first().click();await page.waitForSelector('body[data-phase="pick"]');
 const bounds=await page.locator('#attack').boundingBox();assert.ok(bounds.y+bounds.height<=900);assert.ok(bounds.height>=44);
 const dice=await page.evaluate(()=>[...window.__dice52.game.dice]);await page.locator('[data-die="0"]').click();await page.keyboard.press('Digit2');await page.keyboard.press('r');await page.waitForSelector('body[data-phase="pick"]');
 assert.deepEqual(await page.evaluate(()=>window.__dice52.game.dice.slice(0,2)),dice.slice(0,2));assert.equal(await page.evaluate(()=>window.__dice52.game.rerolls),1);assert.deepEqual(await page.evaluate(()=>window.__dice52.game.kept.slice(0,2)),[true,true]);
 await page.locator('#help').click();const t=await page.evaluate(()=>window.__dice52.game.time);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__dice52.game.time),t);await page.locator('#help-close').click();
 await page.keyboard.press('Escape');assert.equal(await page.locator('#resume').isVisible(),true);await page.keyboard.press('Escape');
 // Fresh genuine-resource run: planner chooses legal holds/rerolls/attacks only.
 await page.evaluate(async()=>{window.__dice52.start('52');const m=await import('./tools/playtest-dice52.mjs');window.__diceMove=m.bestMove;window.__diceRelic=m.relicChoice;});
 let rolls=0,attacks=0,rewards=0,boss=false,firstDice=null;
 for(let n=0;n<120;n++){
  const state=await page.evaluate(()=>({phase:window.__dice52.game.phase,stage:window.__dice52.game.stage}));
  if(state.phase==='won')break;if(state.phase==='dead')throw Error('genuine dice resource run lost');
  if(['draft','reward'].includes(state.phase)){
   const id=await page.evaluate(()=>window.__diceRelic(window.__dice52.game));await page.locator('[data-relic="'+id+'"]').click();await page.waitForSelector('body[data-phase="pick"]');
   if(firstDice===null)firstDice=await page.evaluate(()=>[...window.__dice52.game.dice]);if(state.phase==='reward')rewards++;
  }else if(state.phase==='pick'){
   if(state.stage===3&&!boss){boss=true;await page.screenshot({path:'/tmp/dice52-boss.png'});}
   const move=await page.evaluate(()=>window.__diceMove(window.__dice52.game));
   if(move.type==='roll'){
    const held=await page.evaluate(()=>[...window.__dice52.game.held]);for(let i=0;i<5;i++)if(held[i]!==Boolean(move.mask&(1<<i)))await page.locator('[data-die="'+i+'"]').click();
    await page.locator('#reroll').click();await page.waitForSelector('body[data-phase="pick"]');rolls++;
   }else if(move.type==='attack'){
    await page.locator('[data-pattern="'+move.id+'"]').click();const expected=await page.evaluate(()=>window.__dice52.evaluate(window.__dice52.game,document.querySelector('.pattern.selected').dataset.pattern).damage);
    assert.equal(Number(await page.locator('#preview-damage').innerText()),expected);
    await page.locator('#attack').click();assert.equal(await page.evaluate(()=>window.__dice52.game.lastResult.damage),expected);attacks++;
    await page.waitForTimeout(230);await page.screenshot({path:'/tmp/dice52-live-chain.png'});await settle(page);
   }else{await page.locator('#pass').click();await settle(page);}
  }else await settle(page);
 }
 assert.equal(await page.evaluate(()=>window.__dice52.game.phase),'won');assert.equal(rewards,3);assert.ok(rolls>=4&&attacks>=4&&boss);await page.screenshot({path:'/tmp/dice52-win.png'});
 await page.locator('#replay').click();assert.deepEqual(await page.evaluate(()=>window.__dice52.game.relics),[]);const id=await page.evaluate(()=>window.__diceRelic(window.__dice52.game));await page.locator('[data-relic="'+id+'"]').click();await page.waitForSelector('body[data-phase="pick"]');assert.deepEqual(await page.evaluate(()=>window.__dice52.game.dice),firstDice);
 // Isolated UI fixture: every combo blocked and no rolls must offer an honest pass.
 await page.evaluate(()=>{const g=window.__dice52.game;Object.assign(g,{stage:3,turn:1,enemyHp:1000,dice:[1,2,3,4,6],rerolls:0,lastPattern:'free',phase:'pick'});});
 await page.waitForSelector('#pass:not([hidden])');assert.equal(await page.locator('[data-pattern="free"]').isDisabled(),true);const hp=await page.evaluate(()=>window.__dice52.game.hp);await page.locator('#pass').click();assert.equal(await page.evaluate(()=>window.__dice52.game.hp),hp-12);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await open(mobile);await mobile.screenshot({path:'/tmp/dice52-title-mobile.png'});await mobile.locator('#start').tap();await mobile.screenshot({path:'/tmp/dice52-draft-mobile.png'});await mobile.locator('[data-relic]').last().tap();await mobile.waitForSelector('body[data-phase="pick"]');
 await mobile.locator('[data-die="0"]').tap();assert.equal(await mobile.locator('[data-die="0"]').getAttribute('aria-pressed'),'true');await mobile.locator('#reroll').tap();await mobile.waitForSelector('body[data-phase="pick"]');await mobile.screenshot({path:'/tmp/dice52-pick-mobile.png'});
 assert.equal(await mobile.locator('[data-die="0"]').evaluate(e=>getComputedStyle(e).animationName),'none');
 for(const width of [320,390,760,844]){await mobile.setViewportSize({width,height:width===844?390:844});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 const fallback=await browser.newPage();watch(fallback);await fallback.route('**/assets/**/*.webp',r=>r.abort());await fallback.goto(root+'/?test=1');await fallback.waitForSelector('body[data-ready="true"]');await fallback.locator('#start').click();await fallback.locator('[data-relic]').first().click();await fallback.waitForSelector('body[data-phase="pick"]');await fallback.locator('#attack').click();assert.equal(await fallback.evaluate(()=>window.__dice52.game.attacks),1);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({realMouseAndKeyboard:true,heldDicePreserved:true,menusFreeze:true,genuineRun:{rolls,attacks,rewards,boss},seedReplay:true,bossPassFixture:true,touch:true,reducedMotion:true,widths:[320,390,760,844],assetFallback:true,errors,external},null,2));
}finally{await browser.close();}
