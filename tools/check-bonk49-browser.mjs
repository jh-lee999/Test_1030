import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
const watch=page=>page.on('pageerror',e=>errors.push(e.message));
async function open(page){watch(page);await page.goto(root+'/?test=1&seed=48');await page.waitForSelector('body[data-ready="true"]');}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});await open(page);
  await page.locator('#help').click();assert.equal(await page.locator('#start-screen').isVisible(),false);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#start-screen').isVisible(),true);
  await page.locator('#start').click();await noOverflow(page);
  const fire=await page.locator('#fire').boundingBox();assert.ok(fire.y+fire.height<=900);assert.ok(fire.height>=44);
  assert.match(await page.locator('#phase-name').innerText(),/내 차례/);
  const enemy=await page.evaluate(()=>window.__bonk48.game.enemies[0]),board=await page.locator('#board').boundingBox();
  await page.mouse.move(board.x+enemy.x/800*board.width,board.y+enemy.y/960*board.height);
  await page.waitForFunction(()=>document.getElementById('target-info').textContent.includes('돌진 팬'));
  await page.locator('#fire').click();assert.match(await page.locator('#fire-label').innerText(),/이동 중/);
  await page.locator('#help').click();const time=await page.evaluate(()=>window.__bonk48.game.time);
  assert.equal(await page.locator('#pause').isDisabled(),true);await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>window.__bonk48.game.time),time);await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>window.__bonk48.game.phase),'flight');
  await page.keyboard.press('Escape');await page.locator('#help').click();await page.locator('#help-close').click();
  assert.equal(await page.evaluate(()=>window.__bonk48.game.phase),'paused');await page.locator('#resume').click();
  // Isolated UI fixture: ready/queued/spent are three different labels, not a gameplay reward.
  await page.evaluate(()=>{window.__bonk48.start('49');window.__bonk48.game.charge=100;});
  await page.waitForFunction(()=>document.getElementById('charge').textContent==='충전 완료!');
  await page.locator('#king').click();assert.equal(await page.locator('#king').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#fire-label').innerText(),'왕새총 발사');await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>window.__bonk48.game.action.type),'high');
  assert.equal(await page.evaluate(()=>window.__bonk48.game.charge),0);
  await page.screenshot({path:'/tmp/gui49-king.png'});
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await open(mobile);
  assert.equal(await mobile.locator('#build-details').getAttribute('open'),null);await mobile.locator('#start').tap();
  const dock=await mobile.locator('#fire').boundingBox();assert.ok(dock.y+dock.height<=844);assert.ok(dock.height>=44);
  assert.equal(await mobile.locator('#build-details').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await mobile.locator('#help').tap();await mobile.screenshot({path:'/tmp/gui49-help-mobile.png'});
  await mobile.locator('#help-close').tap();assert.equal(await mobile.evaluate(()=>window.__bonk48.game.phase),'aim');
  await mobile.locator('#build-details summary').tap();assert.equal(await mobile.locator('#fusions').isVisible(),true);
  await mobile.locator('#build-details summary').tap();await mobile.evaluate(()=>window.scrollTo(0,0));
  // Separate 400-XP fixture verifies every card remains reachable, including at 320px.
  await mobile.evaluate(async()=>{const a=window.__bonk48,g=a.game,{gainXP}=await import('./bonk-engine.js?v=48');gainXP(g,400);g.phase='flight';g.queue=[];g.balls=[];g.flightTime=0;a.tick(g,1/120);});
  await mobile.waitForSelector('body[data-phase="reward"]');await mobile.setViewportSize({width:320,height:844});await noOverflow(mobile);
  assert.equal(await mobile.locator('#reward-cards button').count(),3);
  for(let pending=6;pending>0;pending--){
    assert.equal(await mobile.evaluate(()=>window.__bonk48.game.pending),pending);
    assert.match(await mobile.locator('#reward-cards .benefit').last().innerText(),/→/);
    await mobile.locator('#reward-cards button').last().tap();
  }
  assert.equal(await mobile.evaluate(()=>window.__bonk48.game.pending),0);
  for(const width of [320,390,760,844]){await mobile.setViewportSize({width,height:width===844?390:844});await noOverflow(mobile);}
  assert.deepEqual(errors,[]);console.log(JSON.stringify({desktopControlsInView:true,helpFreezesAndRestores:true,kingQueueClear:true,targetInspection:true,mobileDetails:true,sixRewardCardsReachable:true,reducedMotion:true,widths:[320,390,760,844],errors},null,2));
}finally{await browser.close();}
