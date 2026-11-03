import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'/?test=1&seed=1793682210169');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start-button').click();
  const get=()=>page.evaluate(()=>{const g=window.__platformer37.game,e=g.room.enemies.find(e=>e.type==='drone');return{x:e.x,y:e.y,mode:e.mode,timer:e.timer,facing:e.facing,angle:e.aimAngle,active:e.droneActive,attack:e.attackId,playerX:g.player.x};});
  const spawn=await get();await page.evaluate(()=>{const a=window.__platformer37,g=a.game;g.player.invulnerable=999;for(let n=0;n<960;n++)a.tick(g,{});});assert.equal((await get()).x,spawn.x);assert.equal((await get()).attack,0);
  await page.keyboard.down('d');await page.waitForFunction(()=>window.__platformer37.game.player.x>350);await page.keyboard.up('d');
  await page.waitForFunction(()=>{const e=window.__platformer37.game.room.enemies.find(e=>e.type==='drone');return e.mode==='attack'&&e.timer<.15;});const aiming=await get();
  await page.keyboard.down('Space');await page.waitForTimeout(180);await page.keyboard.up('Space');const jumped=await get();
  assert.equal(jumped.x,aiming.x);assert.equal(jumped.y,aiming.y);assert.equal(jumped.angle,aiming.angle);assert.equal(jumped.facing,aiming.facing);
  await page.screenshot({path:'/tmp/drone44-aim.png'});await page.keyboard.press('Escape');const paused=await get();await page.waitForTimeout(180);assert.deepEqual(await get(),paused);await page.locator('#resume-button').click();
  await page.waitForFunction(()=>window.__platformer37.game.room.enemies.find(e=>e.type==='drone').droneState==='recover');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({seed:'1793682210169',distantDroneStaysPut:true,approachFromActualMovement:true,jumpDoesNotMoveLockedMuzzle:true,aimAndFacingLocked:true,pauseFreezesAI:true,recovery:true,errors},null,2));
}finally{await browser.close();}
