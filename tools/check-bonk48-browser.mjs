import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[],external=[];
const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith(root)&&!r.url().startsWith('data:'))external.push(r.url());});};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1080}});watch(page);await page.goto(root+'/?test=1&seed=48');await page.waitForSelector('body[data-ready="true"]');assert.match(await page.locator('#load-status').innerText(),/준비 완료/);await page.screenshot({path:'/tmp/bonk48-title.png'});await page.locator('#start').click();
  const before=await page.evaluate(()=>window.__bonk48.game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp})));await page.waitForTimeout(180);assert.deepEqual(await page.evaluate(()=>window.__bonk48.game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp}))),before);
  await page.screenshot({path:'/tmp/bonk48-aim.png'});await page.locator('#board').click({position:{x:180,y:180}});await page.waitForFunction(()=>window.__bonk48.game.balls.length>0);assert.equal(await page.evaluate(()=>window.__bonk48.game.shots),1);await page.waitForTimeout(650);await page.screenshot({path:'/tmp/bonk48-flight.png'});
  await page.keyboard.press('Escape');const paused=await page.evaluate(()=>({time:window.__bonk48.game.time,phase:window.__bonk48.game.phase}));assert.equal(paused.phase,'paused');await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__bonk48.game.time),paused.time);await page.keyboard.press('Escape');await page.keyboard.press('r');await page.waitForFunction(()=>window.__bonk48.game.phase!=='flight');
  // New run; input-only aiming solver advances time, never grants kills/HP/items.
  await page.evaluate(()=>window.__bonk48.start('48'));await page.evaluate(async()=>window.__bestAim=(await import('./tools/playtest-bonk48.mjs')).bestAim);
  let rewards=0,highest=0;
  for(let i=0;i<45;i++){
    const phase=await page.evaluate(()=>window.__bonk48.game.phase);
    if(phase==='won')break;if(phase==='dead')throw Error('solver lost the genuine resource run');
    if(phase==='aim'||phase==='flight'||phase==='enemy'){
      if(phase==='aim'){const king=await page.evaluate(()=>{const a=window.__bonk48,g=a.game,p=window.__bestAim(g);a.aimAt(g,p.x,p.y);return g.charge>=100;});if(king)await page.locator('#king').click();await page.locator('#board').focus();await page.keyboard.press('Space');await page.waitForTimeout(king?520:850);await page.screenshot({path:king?'/tmp/bonk48-king.png':'/tmp/bonk48-real-flight.png'});}
      const r=await page.evaluate(()=>{const a=window.__bonk48,g=a.game;for(let n=0;n<500&&['flight','enemy'].includes(g.phase);n++)a.tick(g,1/60);return {stage:g.stage,combo:g.combo,phase:g.phase};});highest=Math.max(highest,r.combo);
    }else if(phase==='reward'){
      await page.waitForSelector('#reward-cards button');await page.screenshot({path:'/tmp/bonk48-reward.png'});const id=await page.evaluate(()=>{const g=window.__bonk48.game;return [...g.choices].sort((a,b)=>({split:8,mark:7,pouch:6,bomb:5,lower:4,upper:3,rubber:2,snack:1}[b])-({split:8,mark:7,pouch:6,bomb:5,lower:4,upper:3,rubber:2,snack:1}[a]))[0];});await page.locator(`[data-upgrade="${id}"]`).click();rewards++;
    }else if(phase==='next'){await page.locator('#next').click();}
    await page.waitForTimeout(35);
  }
  assert.equal(await page.evaluate(()=>window.__bonk48.game.phase),'won');assert.ok(rewards>=4);assert.ok(highest>=10);await page.screenshot({path:'/tmp/bonk48-win.png'});await page.locator('#replay').click();assert.equal(await page.evaluate(()=>window.__bonk48.game.seed),'48');assert.deepEqual(await page.evaluate(()=>window.__bonk48.game.inventory),{});
  // Separate UI fixture: a 400-XP lump must require ALL six picks, not one.
  await page.evaluate(async()=>{const a=window.__bonk48;a.start('XP-QUEUE');const g=a.game,{gainXP}=await import('./bonk-engine.js?v=48');gainXP(g,400);g.phase='flight';g.queue=[];g.balls=[];g.flightTime=0;a.tick(g,1/120);});await page.waitForSelector('body[data-phase="reward"]');
  for(let pending=6;pending>0;pending--){assert.equal(await page.evaluate(()=>window.__bonk48.game.pending),pending);await page.locator('#reward-cards button').first().click();}
  await page.waitForFunction(()=>window.__bonk48.game.phase!=='reward');assert.equal(await page.evaluate(()=>window.__bonk48.game.pending),0);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});watch(mobile);await mobile.goto(root+'/?test=1&seed=48');await mobile.waitForSelector('body[data-ready="true"]');await mobile.locator('#start').tap();const box=await mobile.locator('#board').boundingBox();await mobile.touchscreen.tap(box.x+box.width*.25,box.y+box.height*.3);assert.equal(await mobile.evaluate(()=>window.__bonk48.game.shots),0);await mobile.locator('#fire').tap();await mobile.waitForFunction(()=>window.__bonk48.game.shots===1);await mobile.waitForTimeout(300);await mobile.screenshot({path:'/tmp/bonk48-mobile.png'});
  for(const width of [320,390,844]){await mobile.setViewportSize({width,height:width===844?390:844});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  const fallback=await browser.newPage({reducedMotion:'reduce'});watch(fallback);await fallback.route('**/assets/**/*.webp',r=>r.abort());await fallback.goto(root+'/?test=1');await fallback.waitForSelector('body[data-ready="true"]');assert.match(await fallback.locator('#load-status').innerText(),/불러오지 못/);await fallback.locator('#start').click();await fallback.keyboard.press('Space');assert.equal(await fallback.evaluate(()=>window.__bonk48.game.shots),1);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({mouseAndKeyboard:true,touchAimBeforeFire:true,menusFreeze:true,fullGenuineRun:true,rewards,highest,seedReplay:true,mobileWidths:[320,390,844],optionalImageFailure:true,errors,external},null,2));
}finally{await browser.close();}
