import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));
  for(const style of ['ricochet','barrage','boulder']){
    await page.goto(`${root}/side-scroll47.html?test=1&seed=1793682210169&path=${style}`);await page.waitForSelector('body[data-ready="true"]');
    assert.equal(await page.locator(`[data-path="${style}"]`).getAttribute('aria-pressed'),'true');await page.locator('#start-button').click();
    assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.style),style);
    // Actual keyboard controls, original generated room, no resource or enemy edits.
    await page.keyboard.down('d');await page.keyboard.down('j');await page.waitForTimeout(600);await page.keyboard.up('d');
    if(style==='boulder'){
      assert.equal(await page.evaluate(()=>window.__platformer37.game.shotsFired),0);
      await page.screenshot({path:'/tmp/paths46-charged.png'});await page.keyboard.up('j');await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>window.__platformer37.game.basicShots),1);
    }else{
      await page.waitForTimeout(style==='barrage'?3000:1400);await page.keyboard.up('j');
      assert.ok(await page.evaluate(()=>window.__platformer37.game.basicShots)>0);
    }
    await page.screenshot({path:`/tmp/paths46-${style}-keyboard.png`});
    // A longer INPUT-ONLY playback. Advancing time in chunks is not invulnerability.
    await page.evaluate(async()=>{window.__pilot=(await import('./tools/playtest-paths46.mjs')).createPilot();window.__platformer37.game.phase='paused';});
    const frames=[];
    for(let frame=0;frame<6;frame++){
      frames.push(await page.evaluate(()=>{const api=window.__platformer37,g=api.game;g.phase='playing';for(let i=0;i<360&&!['dead','won'].includes(g.phase);i++)api.tick(g,window.__pilot(g));const phase=g.phase;api.render();g.phase='paused';return {time:g.time,hp:g.stats.hp,kills:g.stats.kills,room:g.room.index,phase,skills:g.skillCasts||0};}));
      await page.screenshot({path:`/tmp/paths46-${style}-play-${frame}.png`,style:'#pause-screen{visibility:hidden}'});
      if(['dead','won'].includes(frames.at(-1).phase))break;
    }
    console.log(JSON.stringify({style,frames}));
  }
  // UI-only fixture: verify irreversible reward choice and the following item screen.
  await page.evaluate(()=>{const api=window.__platformer37;api.start('UI-AWAKENING');const g=api.game;g.phase='playing';g.room.type='elite';g.room.enemies.forEach(e=>e.hp=0);});
  await page.waitForSelector('[data-awakening="echo"]');assert.equal(await page.locator('#reward-gold').isVisible(),false);assert.equal(await page.locator('#reward-reroll').isVisible(),false);
  await page.screenshot({path:'/tmp/paths46-awakening.png'});await page.locator('[data-awakening="echo"]').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.awakening),'echo');
  await page.keyboard.press('i');assert.match(await page.locator('#build-path').innerText(),/왕짱돌/);await page.keyboard.press('i');
  await page.evaluate(()=>window.__platformer37.game.phase='dead');await page.locator('#change-path').click();await page.locator('[data-path="barrage"]').click();await page.locator('#start-button').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.style),'barrage');assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.awakening),null);
  await page.keyboard.press('Escape');await page.locator('#pause-screen .replay').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.stats.style),'barrage');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(root+'/side-scroll47.html?test=1&path=boulder');await mobile.waitForSelector('body[data-ready="true"]');
  assert.equal(await mobile.locator('[data-path]').count(),3);await mobile.locator('#start-button').scrollIntoViewIfNeeded();await mobile.screenshot({path:'/tmp/paths46-mobile-title.png'});await mobile.locator('#start-button').tap();const button=await mobile.locator('[data-control="attack"]').boundingBox(),cdp=await mobile.context().newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x+button.width/2,y:button.y+button.height/2,id:7}]});await mobile.waitForTimeout(1000);assert.equal(await mobile.evaluate(()=>window.__platformer37.game.shotsFired),0);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(400);assert.equal(await mobile.evaluate(()=>window.__platformer37.game.basicShots),1);
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.screenshot({path:'/tmp/paths46-mobile-game.png'});
  assert.deepEqual(errors,[]);console.log('paths46: keyboard/touch, distinct fire, real-resource playbacks, awakening UI, path reselection/replay and mobile layout passed');
}finally{await browser.close();}
