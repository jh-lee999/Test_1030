import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
const angle=g=>Math.atan2(g.aim.y-856,g.aim.x-g.launchX);
async function boot(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/?test=1&seed=50');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();}
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});await boot(page);
  const box=await page.locator('#board').boundingBox(),screen=(x,y)=>({x:box.x+x/800*box.width,y:box.y+y/960*box.height});
  const before=await page.evaluate(()=>({aim:{...window.__bonk48.game.aim},enemies:window.__bonk48.game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp}))}));
  await page.evaluate(()=>document.getElementById('board').addEventListener('pointerup',e=>{const r=e.currentTarget.getBoundingClientRect();window.__clickedPoint={x:Math.max(48,Math.min(752,(e.clientX-r.left)/r.width*800)),y:Math.max(112,Math.min(723,(e.clientY-r.top)/r.height*960))};}));
  const right=screen(750,720);await page.mouse.move(right.x,right.y);
  const first=await page.evaluate(()=>({...window.__bonk48.game.aim}));assert.ok(first.x<749,'a pointer jump must not instantly become the actual shot aim');
  await page.screenshot({path:'/tmp/aim50-moving.png'});
  const samples=await page.evaluate(async()=>{
    const result=[];for(let i=0;i<35;i++){await new Promise(requestAnimationFrame);const g=window.__bonk48.game;result.push({a:Math.atan2(g.aim.y-856,g.aim.x-g.launchX),t:g.time});}return result;
  });
  for(let i=1;i<samples.length;i++){const delta=samples[i].a-samples[i-1].a,dt=samples[i].t-samples[i-1].t;assert.ok(delta>=-1e-10);assert.ok(delta<=Math.PI*1.5*dt+Math.PI/3000+1e-8);}
  await page.waitForFunction(()=>window.__bonk48.game.aim.x===750&&window.__bonk48.game.aim.y===720);
  assert.deepEqual(await page.evaluate(()=>window.__bonk48.game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp}))),before.enemies);
  await page.screenshot({path:'/tmp/aim50-settled.png'});
  // Real keyboard input: small taps, continuous hold, Shift fine mode.
  await page.evaluate(()=>window.__bonk48.start('50'));await page.locator('#board').focus();
  let initial=angle(await page.evaluate(()=>window.__bonk48.game));await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);
  let current=angle(await page.evaluate(()=>window.__bonk48.game));assert.ok(Math.abs(current-initial-Math.PI/400)<1e-8);
  initial=current;await page.keyboard.down('Shift');await page.keyboard.press('ArrowLeft');await page.keyboard.up('Shift');await page.waitForTimeout(350);
  current=angle(await page.evaluate(()=>window.__bonk48.game));assert.ok(Math.abs(current-initial+Math.PI/1800)<1e-8);
  const holds=[];
  for(const fine of [false,true]){
    initial=angle(await page.evaluate(()=>window.__bonk48.game));if(fine)await page.keyboard.down('Shift');await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');if(fine)await page.keyboard.up('Shift');await page.waitForTimeout(400);
    current=angle(await page.evaluate(()=>window.__bonk48.game));holds.push((current-initial)*180/Math.PI);
  }
  assert.ok(holds[0]>holds[1]+1&&holds[0]<12&&holds[1]<4);
  const centre=screen(400,200);await page.mouse.move(centre.x,centre.y);await page.waitForTimeout(700);await page.keyboard.down('Shift');await page.mouse.move(centre.x+40,centre.y);await page.keyboard.up('Shift');await page.waitForTimeout(700);
  assert.ok(Math.abs(await page.evaluate(()=>window.__bonk48.game.aim.x)-(400+40/box.width*800*.2))<1e-7);
  // A quick click is buffered once, cannot retarget, then uses the exact clicked ray.
  await page.evaluate(()=>window.__bonk48.start('50'));const left=screen(65,720);await page.mouse.click(left.x,left.y);
  assert.equal(await page.locator('#board').getAttribute('data-aim-pending'),'true');assert.equal(await page.evaluate(()=>window.__bonk48.game.shots),0);
  await page.mouse.move(right.x,right.y);await page.waitForFunction(()=>window.__bonk48.game.shots===1,{},{timeout:2000});
  const shot=await page.evaluate(()=>{const g=window.__bonk48.game,b=g.queue[0]?.ball;return {aim:g.aim,intended:window.__clickedPoint,phase:g.phase,angle:b?Math.atan2(b.vy,b.vx):null};});
  assert.deepEqual(shot.aim,shot.intended);assert.notEqual(shot.angle,null);assert.ok(Math.abs(shot.angle-Math.atan2(shot.intended.y-856,shot.intended.x-400))<1e-9);
  await page.screenshot({path:'/tmp/aim50-click-locked.png'});
  // Pending shots are discarded by help/pause/blur, never fired after resume.
  for(const interruption of ['pause','help','blur']){
    await page.evaluate(()=>window.__bonk48.start('50'));await page.mouse.click(left.x,left.y);
    if(interruption==='pause')await page.keyboard.press('Escape');else if(interruption==='help')await page.locator('#help').click();else await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(()=>window.__bonk48.game.phase),'paused');await page.waitForTimeout(650);
    if(interruption==='help')await page.locator('#help-close').click();else await page.keyboard.press('Escape');await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>window.__bonk48.game.shots),0);
  }
  // Isolated charge fixture: even keyboard E cannot change a committed king request.
  await page.evaluate(()=>{window.__bonk48.start('50');window.__bonk48.game.charge=100;});await page.locator('#board').focus();await page.keyboard.press('e');await page.mouse.click(left.x,left.y);await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__bonk48.game.useKing),true);await page.waitForFunction(()=>window.__bonk48.game.shots===1);
  assert.equal(await page.evaluate(()=>window.__bonk48.game.action.type),'high');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await boot(mobile);const mb=await mobile.locator('#board').boundingBox();
  await mobile.touchscreen.tap(mb.x+mb.width*.15,mb.y+mb.height*.75);await mobile.waitForTimeout(800);assert.equal(await mobile.evaluate(()=>window.__bonk48.game.shots),0);
  const target=await mobile.evaluate(()=>({...window.__bonk48.game.aim}));await mobile.locator('#fire').tap();await mobile.waitForFunction(()=>window.__bonk48.game.shots===1);assert.deepEqual(await mobile.evaluate(()=>window.__bonk48.game.aim),target);
  await mobile.screenshot({path:'/tmp/aim50-touch.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({rateLimitedPointer:true,exactClickDirection:true,continuousKeyboardDegrees:holds,shiftMouseGain:.2,oneBufferedShot:true,pendingCancel:['pause','help','blur'],kingRequestLocked:true,touchAimBeforeFire:true,reducedMotion:true,errors},null,2));
}finally{await browser.close();}
