import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'/?test=1&seed=ENEMIES-43');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start-button').click();
  const loaded=await page.evaluate(()=>Object.fromEntries(['rusher','guard','caster','drone'].map(t=>[t,Object.keys(window.__platformer37.images.monsters[t])])));
  for(const clips of Object.values(loaded))assert.deepEqual(clips.sort(),['attack','die','idle','poster','walk']);
  const results=await page.evaluate(async()=>{
    const a=window.__platformer37,g=a.game,{ENEMY_TYPES}=await import('./platformer-enemies.js?v=43');
    const floor={id:'arena43',x:0,y:634,w:2200};g.room.width=2200;g.room.platforms=[floor];g.room.hazards=[];g.room.marks=[];g.room.cleared=false;g.roomIntro=0;g.camera=0;g.cameraY=0;g.random=()=>1;
    const enemy=(type,id,x)=>({...ENEMY_TYPES[type],type,id,x,y:634,hp:500,maxHp:500,home:floor,facing:-1,mode:'idle',timer:0,cooldown:99,clock:0,flash:0,death:0,act:0,attackId:0});
    g.room.enemies=[enemy('guard',1,650)];Object.assign(g.player,{x:400,y:634,vx:0,vy:0,grounded:true,action:null,attackCooldown:0});
    g.phase='playing';for(let n=0;n<110;n++)a.tick(g,{attack:true},1/120);const guardedHP=g.room.enemies[0].hp;
    g.projectiles=[];g.room.marks=[];g.room.enemies=['rusher','guard','caster','drone'].map((type,i)=>enemy(type,i+1,400+i*240));
    g.room.enemies[0].cooldown=0;g.room.enemies[2].cooldown=0;g.room.enemies[3].cooldown=0;Object.assign(g.player,{x:160,y:634,vx:0,vy:0,grounded:true,action:null,invulnerable:99});
    for(let n=0;n<65;n++)a.tick(g,{},1/120);g.phase='paused';a.render();return{guardedHP,types:g.room.enemies.map(e=>e.type),marks:g.room.marks.length};
  });assert.ok(results.guardedHP<500&&results.guardedHP>480,JSON.stringify(results));assert.equal(results.marks,1);
  await page.screenshot({path:'/tmp/enemies43-lineup.png',style:'#pause-screen{visibility:hidden}'});
  await page.keyboard.press('i'); // paused stays paused; no hidden shortcut advances combat
  assert.equal(await page.evaluate(()=>window.__platformer37.game.phase),'paused');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(root+'/?test=1&seed=43');await mobile.waitForSelector('body[data-ready="true"]');await mobile.locator('#start-button').tap();
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.screenshot({path:'/tmp/enemies43-mobile.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({newArtLoaded:loaded,frontShieldProjectileTest:results.guardedHP,visibleCurse:true,mixedEnemyLineup:results.types,mobileStart:true,errors},null,2));
}finally{await browser.close();}
