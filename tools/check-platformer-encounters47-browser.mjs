import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'/?test=1&path=barrage&seed=1793686699326');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start-button').click();
  const initial=await page.evaluate(()=>{const g=window.__platformer37.game;return {version:g.world.version,width:g.room.width,floor:g.room.platforms[0].w,arena:g.room.arena};});assert.equal(initial.version,47);assert.equal(initial.width,initial.floor);
  // Real keyboard skirmish, without editing position, HP, enemies or resources.
  const frames=[];await page.keyboard.down('d');await page.keyboard.down('j');await page.waitForTimeout(850);await page.keyboard.up('d');
  for(let i=0;i<8;i++){
    if(i%2===0){await page.keyboard.press('Space');await page.keyboard.down(i%4===0?'d':'a');await page.keyboard.press('Shift');await page.waitForTimeout(100);await page.keyboard.up('d');await page.keyboard.up('a');}
    await page.keyboard.down('j');await page.waitForTimeout(650);await page.keyboard.up('j');await page.waitForTimeout(350);
    const state=await page.evaluate(()=>{const g=window.__platformer37.game;return {time:g.time,hp:g.stats.hp,kills:g.stats.kills,phase:g.phase,focus:g.player.focus,openings:g.room.enemies.filter(e=>e.hp>0&&e.exposedUntil>g.time).length};});frames.push(state);
    await page.screenshot({path:`/tmp/encounters47-play-${i}.png`});
    if(state.focus>=60)await page.keyboard.press('e');if(state.phase!=='playing')break;
  }
  assert.ok(frames.some(f=>f.kills>0));
  // Explicit visual regression fixture, separate from the skirmish above.
  await page.evaluate(async()=>{const g=window.__platformer37.game,{ENEMY_TYPES}=await import('./platformer-enemies.js'),floor=g.room.platforms[0];g.phase='playing';g.room.cleared=false;g.room.hazards=[];g.room.marks=[];g.projectiles=[];g.camera=0;g.roomIntro=0;g.room.nextAttackTime=0;g.room.enemies=[{...ENEMY_TYPES.guard,id:100,type:'guard',x:610,y:634,home:floor,hp:500,maxHp:500,mode:'idle',cooldown:0,timer:0,clock:0,flash:0,death:0,facing:-1,attackId:0}];Object.assign(g.player,{x:530,y:634,vx:0,vy:0,grounded:true,dash:0,invulnerable:0,skillTime:0,action:null});});
  await page.waitForFunction(()=>window.__platformer37.game.room.enemies[0].mode==='attack');await page.keyboard.down('d');await page.keyboard.press('Shift');await page.waitForTimeout(160);await page.keyboard.up('d');await page.waitForFunction(()=>{const g=window.__platformer37.game;return g.room.enemies[0].exposedUntil>g.time;});
  assert.equal(await page.evaluate(()=>window.__platformer37.game.room.enemies[0].facing),-1);assert.ok(await page.evaluate(()=>{const g=window.__platformer37.game;return g.player.x>g.room.enemies[0].x;}));await page.screenshot({path:'/tmp/encounters47-opening.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({reportedSeed:'1793686699326',connectedArena:initial,keyboardSkirmish:frames,committedGuardTell:true,openingVisible:true,errors},null,2));
}finally{await browser.close();}
