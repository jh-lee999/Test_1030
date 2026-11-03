import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{const Audio=window.AudioContext;if(Audio){window.__tones=0;window.AudioContext=class extends Audio{createOscillator(){window.__tones++;return super.createOscillator();}};}});
  await page.goto(root+'/?test=1&seed=45');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start-button').click();
  await page.evaluate(()=>{const g=window.__platformer37.game,f={id:'arena',x:0,y:634,w:2500,ground:true};g.room.width=2500;g.room.platforms=[f];g.room.hazards=[];g.room.marks=[];g.room.pickups=[];g.camera=0;g.roomIntro=0;g.random=()=>.99;g.room.enemies=[{...g.room.enemies[0],id:1,type:'archer',x:1500,y:634,home:f,hp:10000,maxHp:10000,w:44,h:94,cooldown:999,mode:'idle'}];Object.assign(g.player,{x:200,y:634,vx:0,vy:0,grounded:true,invulnerable:0});});
  await page.keyboard.down('j');await page.waitForTimeout(1300);await page.keyboard.up('j');assert.equal(await page.evaluate(()=>window.__platformer37.game.room.enemies[0].hp),10000);assert.ok(await page.evaluate(()=>window.__tones)>0);
  await page.locator('#sound-toggle').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');const tones=await page.evaluate(()=>window.__tones);await page.locator('#game-canvas').focus();await page.keyboard.down('j');await page.waitForTimeout(500);await page.keyboard.up('j');assert.equal(await page.evaluate(()=>window.__tones),tones);
  await page.evaluate(()=>{const g=window.__platformer37.game;g.projectiles=[{owner:'enemy',x:310,y:590,vx:-900,vy:0,r:10,life:1,damage:10}];g.player.action=null;g.player.attackCooldown=0;g.player.dashCooldown=0;g.player.invulnerable=0;});
  await page.keyboard.press('Shift');await page.waitForFunction(()=>window.__platformer37.game.perfectDodges===1);assert.match(await page.locator('#dash-label').innerText(),/반격/);await page.screenshot({path:'/tmp/combat45-counter.png'});
  await page.keyboard.down('j');await page.waitForFunction(()=>window.__platformer37.game.projectiles.some(b=>b.owner==='player'&&b.homing&&b.damage>28));await page.keyboard.up('j');
  await page.evaluate(()=>{const g=window.__platformer37.game;g.projectiles=[];g.player.x=200;g.player.vx=0;g.player.action=null;g.player.attackCooldown=0;g.room.enemies[0].x=800;g.room.platforms.push({id:'cover',x:430,y:500,w:100,ground:true});});
  await page.keyboard.down('j');await page.waitForTimeout(1500);await page.keyboard.up('j');assert.equal(await page.evaluate(()=>window.__platformer37.game.room.enemies[0].hp),10000);
  await page.evaluate(()=>{const g=window.__platformer37.game;g.player.x=600;g.player.action=null;g.player.attackCooldown=0;});await page.keyboard.down('j');await page.waitForFunction(()=>window.__platformer37.game.room.enemies[0].hp<10000);await page.keyboard.up('j');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({distantSprayCannotClear:true,coverRequiresRepositioning:true,realDashCounter:true,audioAndMute:true,errors},null,2));
}finally{await browser.close();}
