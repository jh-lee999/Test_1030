import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[];
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'/side-scroll47.html?test=1&path=classic&seed=chain40');await page.waitForSelector('body[data-ready="true"]');await page.locator('#start-button').click();
  await page.evaluate(()=>{
    const a=window.__platformer37,g=a.game,floor={id:'flat',x:0,y:634,w:4000,ground:true},e=g.room.enemies[0];
    g.room.width=4000;g.room.platforms=[floor];g.room.pickups=[];g.room.cleared=true;g.room.rewardTaken=true;g.roomIntro=0;g.camera=0;
    g.room.enemies=[600,900].map((x,i)=>({...e,id:'target'+i,type:'archer',x,y:634,w:44,h:94,home:floor,hp:10000,maxHp:10000,mode:'idle',cooldown:999}));
    Object.assign(g.player,{x:400,y:634,vx:0,vy:0,grounded:true,invulnerable:100,action:{type:'low',time:0,duration:.4,fired:false}});g.random=()=>.99;
    a.grantItem(g,'lower_book');a.grantItem(g,'lower_book');
  });
  await page.waitForFunction(()=>window.__platformer37.game.projectiles.length>0);
  await page.evaluate(()=>{const g=window.__platformer37.game;window.__chain40Probe=g.projectiles[0];g.projectiles=[window.__chain40Probe];});
  await page.waitForFunction(()=>window.__chain40Probe.hitIds.length>=2);await page.screenshot({path:'/tmp/chain40-return.png'});
  await page.waitForFunction(()=>window.__chain40Probe.hitIds.length===5,{},{timeout:8000});
  const result=await page.evaluate(()=>{const g=window.__platformer37.game,b=window.__chain40Probe;return{hits:b.hitIds,remaining:b.bounces,expired:!g.projectiles.includes(b),hp:g.room.enemies.map(e=>e.hp),y:g.player.y,grade:g.stats.lowerGrade};});
  assert.deepEqual(result.hits,['target0','target1','target0','target1','target0']);assert.equal(result.remaining,0);assert.equal(result.expired,true);assert.equal(result.grade,3);assert.equal(result.y,634);assert.ok(result.hp[0]<result.hp[1]);
  await page.keyboard.press('i');await page.waitForSelector('body[data-phase="build"]');const description=await page.locator('#grade-details').innerText();assert.match(description,/학년 3 \+ 보너스 1 = 4회/);assert.match(description,/최대 5회 적중/);assert.match(description,/480px.*A → B → A/);assert.doesNotMatch(description,/같은 적은 재타격하지/);await page.screenshot({path:'/tmp/chain40-build.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({liveRicochet:result,buildDescription:true,errors},null,2));
}finally{await browser.close();}
