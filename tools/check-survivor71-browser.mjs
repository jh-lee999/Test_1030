import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4195',errors=[],report={};
async function open(options={},fallback=false){
 const p=await browser.newPage(options);p.on('pageerror',e=>errors.push(e.message));
 if(fallback)await p.route('**/assets/**',r=>['image','font'].includes(r.request().resourceType())?r.abort():r.continue());
 await p.addInitScript(()=>{window.sourceFrames=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(this.canvas.id==='world'&&/butter-(gun71|original36)\//.test(im?.currentSrc||'')){const m=this.getTransform();window.sourceFrames.push({src:im.currentSrc,a:m.a,d:m.d,alpha:this.globalAlpha,args});if(window.sourceFrames.length>500)window.sourceFrames.shift();}return draw.call(this,im,...args);};});
 await p.goto(root+'/?test=1&persist=1&seed=elite71');await p.waitForSelector('body[data-ready="true"]');return p;
}
async function start(p){await p.locator('#start').click();await p.locator('[data-upgrade="relic:comet"]').click();}
try{
 const p=await open({viewport:{width:1366,height:768}});await p.screenshot({path:'/tmp/elite71-title.png'});await start(p);
 await p.keyboard.down('d');await p.waitForTimeout(350);await p.keyboard.up('d');assert(await p.evaluate(()=>window.__survivor71.game.player.x)>1940);report.nativeStartAndMovement=true;
 // Explicit chest-position fixture, then use real F/choice buttons.
 await p.evaluate(()=>{const a=window.__survivor71,g=a.game,p=g.world.points.find(p=>p.artifact==='yellow');Object.assign(g.player,{x:p.x,y:p.y});a.sync();});await p.keyboard.press('f');assert(await p.locator('[data-upgrade="relic:yellow"] [data-original-icon="yellow"]').isVisible());await p.screenshot({path:'/tmp/elite71-yellow-choice.png'});await p.locator('[data-upgrade="relic:yellow"]').click();
 await p.evaluate(()=>{const a=window.__survivor71,g=a.game;g.player.x=1900;g.player.y=1400;g.player.invuln=100;g.spawnTimer=999;g.eliteAt=999;g.burstAt=999;g.moves.stone.level=3;const t=a.engine.spawnEnemy(g,'fan',{x:1620,y:1400});t.hp=t.maxHp=10000;t.speed=0;a.sync();});
 await p.keyboard.down('d');await p.waitForTimeout(700);await p.keyboard.up('d');assert(await p.evaluate(()=>window.__survivor71.game.telemetry.procs.gunShot)>0);assert((await p.locator('#moves').textContent()).includes('옐로카드 권총'));await p.screenshot({path:'/tmp/elite71-gun.png'});
 await p.keyboard.press('e');await p.waitForTimeout(850);await p.keyboard.press('p');const before=await p.evaluate(()=>window.__survivor71.game.telemetry.procs.ultimateShot);assert.equal(before,1);await p.reload();await p.waitForSelector('body[data-ready="true"]');await p.locator('#continue').click();await p.locator('#resume').click();await p.waitForTimeout(1400);await p.keyboard.press('p');assert.equal(await p.evaluate(()=>window.__survivor71.game.telemetry.procs.ultimateShot),2);report.yellowSourceShotAndDoubleCastSave=true;
 for(const id of ['shady','velvet','erpin']){
  await p.evaluate(id=>{const a=window.__survivor71,g=a.game;a.engine.resume(g);g.enemies=[];g.player.x=1900;g.player.y=1400;g.player.invuln=100;g.moves.stone.timer=999;g.spawnTimer=g.eliteAt=g.burstAt=999;g.championSpawned=true;const e=a.engine.spawnElite(g,id,{x:1650,y:1400});e.timer=0;a.sync();},id);
  await p.waitForTimeout(450);await p.screenshot({path:'/tmp/elite71-'+id+'-tell.png'});await p.waitForTimeout(850);await p.screenshot({path:'/tmp/elite71-'+id+'-attack.png'});
  assert(await p.evaluate(id=>Boolean(window.__survivor71.images.elites[id][id==='velvet'?'high':'skill']?.naturalWidth),id));await p.keyboard.press('p');
 }report.originalElitesAndPatterns=true;
 const stress=await p.evaluate(()=>{const a=window.__survivor71,g=a.game;a.engine.resume(g);g.enemies=[];for(let i=0;i<240;i++)a.engine.spawnEnemy(g,['fan','rusher','archer','guard','drone','caster'][i%6],{x:1400+(i%20)*48,y:1000+Math.floor(i/20)*65});a.engine.pause(g);const before=JSON.stringify(g),start=performance.now();for(let i=0;i<20;i++)a.render();return {count:g.enemies.length,averageRenderMs:(performance.now()-start)/20,pure:JSON.stringify(g)===before};});assert.equal(stress.count,240);assert(stress.pure);report.stress=stress;
 const frames=await p.evaluate(()=>window.sourceFrames);assert(frames.length);assert(frames.every(f=>Math.abs(Math.abs(f.a)-Math.abs(f.d))<1e-6&&f.alpha===1));report.uniformWholePose=true;
 await p.close();
 for(const [width,height]of [[320,740],[390,844],[568,320],[844,390]]){
  const m=await open({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await start(m);assert(await m.locator('#joystick').isVisible());await m.locator('#ultimate').tap();await m.waitForTimeout(500);await m.screenshot({path:'/tmp/elite71-mobile-'+width+'.png'});await m.close();
 }report.touchLayouts=[320,390,568,844];
 const fail=await open({},true);await start(fail);await fail.waitForTimeout(200);assert(await fail.evaluate(()=>window.__survivor71.game.time)>0);await fail.close();report.assetFailurePlayable=true;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,errors},null,2));
}finally{await browser.close();}
