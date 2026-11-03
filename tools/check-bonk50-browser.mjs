import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
const angle=g=>Math.atan2(g.aim.y-856,g.aim.x-g.launchX);
async function boot(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(root+'/?test=1&seed=51');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start').click();}
// Isolated synchronous keyboard-event fixture: leaves a large unfinished nudge.
// Mouse no longer buffers shots. Real keyboard taps/holds are exercised below.
async function queueKeyboardShot(page){await page.evaluate(()=>{
  for(let i=0;i<60;i++)window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight'}));
  window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight'}));
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));
  window.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));
});}
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});await boot(page);
  const box=await page.locator('#board').boundingBox(),screen=(x,y)=>({x:box.x+x/800*box.width,y:box.y+y/960*box.height});
  const before=await page.evaluate(()=>({aim:{...window.__bonk48.game.aim},enemies:window.__bonk48.game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp}))}));
  await page.evaluate(()=>{
    const canvas=document.getElementById('board');window.__pointerSamples=[];
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:Math.max(48,Math.min(752,(e.clientX-r.left)/r.width*800)),y:Math.max(112,Math.min(723,(e.clientY-r.top)/r.height*960))};};
    canvas.addEventListener('pointerup',e=>{window.__clickedPoint=point(e);});
    canvas.addEventListener('pointermove',e=>{if(window.__bonk48.game.phase==='aim')window.__pointerSamples.push({point:point(e),actual:{...window.__bonk48.game.aim}});});
  });
  const right=screen(750,720);
  for(const [x,y]of [[750,720],[65,720],[400,130],[600,500],[750,720]]){const p=screen(x,y);await page.mouse.move(p.x,p.y);}
  for(const sample of await page.evaluate(()=>window.__pointerSamples))assert.deepEqual(sample.actual,sample.point,'mouse must match in the input event, not catch up over later frames');
  const first=await page.evaluate(()=>({...window.__bonk48.game.aim}));assert.ok(Math.abs(first.x-750)<.001);
  const samples=await page.evaluate(async()=>{
    const {preview}=await import('./bonk-engine.js?v=48'),result=[];for(let i=0;i<25;i++){await new Promise(requestAnimationFrame);const g=window.__bonk48.game;result.push({aim:{...g.aim},path:preview(g)});}return result;
  });
  for(const sample of samples)assert.deepEqual(sample,samples[0],'stopped pointer must leave no path or angle drift');
  assert.deepEqual(await page.evaluate(()=>window.__bonk48.game.enemies.map(e=>({x:e.x,y:e.y,hp:e.hp}))),before.enemies);
  await page.screenshot({path:'/tmp/pointer51-still.png'});
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
  assert.ok(Math.abs(await page.evaluate(()=>window.__bonk48.game.aim.x)-(400+40/box.width*800*.2))<.001);
  // A mouse click fires in the pointerup event, with no alignment queue.
  await page.evaluate(()=>window.__bonk48.start('50'));const left=screen(65,720);await page.mouse.click(left.x,left.y);
  assert.equal(await page.locator('#board').getAttribute('data-aim-pending'),'false');assert.equal(await page.evaluate(()=>window.__bonk48.game.shots),1);
  await page.mouse.move(right.x,right.y);
  const shot=await page.evaluate(()=>{const g=window.__bonk48.game,b=g.queue[0]?.ball;return {aim:g.aim,intended:window.__clickedPoint,phase:g.phase,angle:b?Math.atan2(b.vy,b.vx):null};});
  assert.deepEqual(shot.aim,shot.intended);assert.notEqual(shot.angle,null);assert.ok(Math.abs(shot.angle-Math.atan2(shot.intended.y-856,shot.intended.x-400))<1e-9);
  await page.screenshot({path:'/tmp/pointer51-fired.png'});
  // Only unfinished keyboard nudges can buffer. Their cancellation still works.
  for(const interruption of ['pause','help','blur']){
    await page.evaluate(()=>window.__bonk48.start('51'));await queueKeyboardShot(page);
    if(interruption==='pause')await page.keyboard.press('Escape');else if(interruption==='help')await page.locator('#help').click();else await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(()=>window.__bonk48.game.phase),'paused');await page.waitForTimeout(650);
    if(interruption==='help')await page.locator('#help-close').click();else await page.keyboard.press('Escape');await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>window.__bonk48.game.shots),0);
  }
  // Isolated charge fixture: even keyboard E cannot change a committed king request.
  await page.evaluate(()=>{window.__bonk48.start('51');window.__bonk48.game.charge=100;});await page.locator('#board').focus();await page.keyboard.press('e');await queueKeyboardShot(page);await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>window.__bonk48.game.useKing),true);await page.waitForFunction(()=>window.__bonk48.game.shots===1);
  assert.equal(await page.evaluate(()=>window.__bonk48.game.action.type),'high');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await boot(mobile);const mb=await mobile.locator('#board').boundingBox();
  await mobile.touchscreen.tap(mb.x+mb.width*.15,mb.y+mb.height*.75);const immediate=await mobile.evaluate(()=>({...window.__bonk48.game.aim}));await mobile.waitForTimeout(400);assert.deepEqual(await mobile.evaluate(()=>window.__bonk48.game.aim),immediate);assert.equal(await mobile.evaluate(()=>window.__bonk48.game.shots),0);
  const target=await mobile.evaluate(()=>({...window.__bonk48.game.aim}));await mobile.locator('#fire').tap();await mobile.waitForFunction(()=>window.__bonk48.game.shots===1);assert.deepEqual(await mobile.evaluate(()=>window.__bonk48.game.aim),target);
  await mobile.screenshot({path:'/tmp/pointer51-touch.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({directPointer:true,noPointerDrift:true,immediateMouseFire:true,exactClickDirection:true,continuousKeyboardDegrees:holds,shiftMouseGain:.2,keyboardFixtureCancellation:['pause','help','blur'],kingRequestLocked:true,touchAimBeforeFire:true,reducedMotion:true,errors},null,2));
}finally{await browser.close();}
