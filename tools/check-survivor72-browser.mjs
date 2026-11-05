import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4195',errors=[],report={};
async function open(options={},fallback=false){
 const p=await browser.newPage(options);p.on('pageerror',e=>errors.push(e.message));
 if(fallback)await p.route('**/assets/**',r=>['image','font'].includes(r.request().resourceType())?r.abort():r.continue());
 await p.addInitScript(()=>{window.sourceFrames=[];const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(im,...args){if(this.canvas.id==='world'&&/butter-(gun71|original36)\//.test(im?.currentSrc||'')){const m=this.getTransform();window.sourceFrames.push({src:im.currentSrc,a:m.a,d:m.d,alpha:this.globalAlpha,args});if(window.sourceFrames.length>500)window.sourceFrames.shift();}return draw.call(this,im,...args);};});
 await p.goto(root+'/?test=1&persist=1&seed=screen72');await p.waitForSelector('body[data-ready="true"]');return p;
}
async function start(p){await p.locator('#start').click();await p.locator('[data-upgrade="relic:comet"]').click();}
try{
 const p=await open({viewport:{width:1366,height:768}});await p.screenshot({path:'/tmp/screen72-title.png'});await start(p);
 await p.keyboard.down('d');await p.waitForTimeout(350);await p.keyboard.up('d');assert(await p.evaluate(()=>window.__survivor72.game.player.x)>1940);report.nativeStartAndMovement=true;
 // Explicit chest-position fixture, then use real F/choice buttons.
 await p.evaluate(()=>{const a=window.__survivor72,g=a.game,p=g.world.points.find(p=>p.artifact==='yellow');Object.assign(g.player,{x:p.x,y:p.y});a.sync();});await p.keyboard.press('f');assert(await p.locator('[data-upgrade="relic:yellow"] [data-original-icon="yellow"]').isVisible());await p.screenshot({path:'/tmp/screen72-yellow-choice.png'});await p.locator('[data-upgrade="relic:yellow"]').click();
 await p.evaluate(()=>{const a=window.__survivor72,g=a.game;g.player.x=1900;g.player.y=1400;g.player.invuln=100;g.spawnTimer=999;g.eliteAt=999;g.burstAt=999;g.moves.stone.level=3;const t=a.engine.spawnEnemy(g,'fan',{x:1620,y:1400});t.hp=t.maxHp=10000;t.speed=0;a.sync();});
 await p.keyboard.down('d');await p.waitForTimeout(700);await p.keyboard.up('d');assert(await p.evaluate(()=>window.__survivor72.game.telemetry.procs.gunShot)>0);assert((await p.locator('#moves').textContent()).includes('옐로카드 권총'));await p.screenshot({path:'/tmp/screen72-gun.png'});
 await p.keyboard.press('e');await p.waitForTimeout(850);await p.keyboard.press('p');const before=await p.evaluate(()=>window.__survivor72.game.telemetry.procs.ultimateShot);assert.equal(before,1);await p.reload();await p.waitForSelector('body[data-ready="true"]');await p.locator('#continue').click();await p.locator('#resume').click();await p.waitForTimeout(1400);await p.keyboard.press('p');assert.equal(await p.evaluate(()=>window.__survivor72.game.telemetry.procs.ultimateShot),2);report.yellowSourceShotAndDoubleCastSave=true;
 for(const id of ['shady','velvet','erpin']){
  await p.evaluate(id=>{const a=window.__survivor72,g=a.game;a.engine.resume(g);g.enemies=[];g.player.x=1900;g.player.y=1400;g.player.invuln=100;g.moves.stone.timer=999;g.spawnTimer=g.eliteAt=g.burstAt=999;g.championSpawned=true;const e=a.engine.spawnElite(g,id,{x:1650,y:1400});e.timer=0;a.sync();},id);
  await p.waitForTimeout(450);await p.screenshot({path:'/tmp/screen72-'+id+'-tell.png'});await p.waitForTimeout(850);await p.screenshot({path:'/tmp/screen72-'+id+'-attack.png'});
  assert(await p.evaluate(id=>Boolean(window.__survivor72.images.elites[id][id==='velvet'?'high':'skill']?.naturalWidth),id));await p.keyboard.press('p');
 }report.originalElitesAndPatterns=true;
 const stress=await p.evaluate(()=>{const a=window.__survivor72,g=a.game;a.engine.resume(g);g.enemies=[];for(let i=0;i<240;i++)a.engine.spawnEnemy(g,['fan','rusher','archer','guard','drone','caster'][i%6],{x:1400+(i%20)*48,y:1000+Math.floor(i/20)*65});a.engine.pause(g);const before=JSON.stringify(g),start=performance.now();for(let i=0;i<20;i++)a.render();return {count:g.enemies.length,averageRenderMs:(performance.now()-start)/20,pure:JSON.stringify(g)===before};});assert.equal(stress.count,240);assert(stress.pure);report.stress=stress;
 const frames=await p.evaluate(()=>window.sourceFrames);assert(frames.length);assert(frames.every(f=>Math.abs(Math.abs(f.a)-Math.abs(f.d))<1e-6&&f.alpha===1));report.uniformWholePose=true;
 for(const map of ['forest','night','ember']){await p.evaluate(map=>{const a=window.__survivor72;a.profile.totalSeals=2;a.profile.discovered=['firefly'];a.begin('garden-'+map,false,{map});a.engine.chooseUpgrade(a.game,'relic:comet');a.sync();},map);await p.waitForTimeout(100);assert(await p.evaluate(map=>window.__survivor72.images.scenery[map]?.naturalWidth>0,map));await p.screenshot({path:'/tmp/screen72-map-'+map+'.png'});}
 report.paintedMapTextures=true;
 await p.close();
 for(const [width,height]of [[320,740],[390,844],[568,320],[844,390]]){
  const m=await open({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await start(m);assert(await m.locator('#joystick').isVisible());
  await m.evaluate(async()=>{const a=window.__survivor72,g=a.game;g.spawnTimer=g.eliteAt=g.burstAt=999;g.championSpawned=true;g.moves.stone.timer=999;const {cameraFor}=await import('./survivor72-camera.js'),{projectBoulder}=await import('./survivor72-boulder.js');window.kingSamples=[];const observe=()=>{const g=a.game,box=document.querySelector('#world').getBoundingClientRect(),v={width:box.width,height:box.height},c=cameraFor(g.player,v);for(const b of g.bullets.filter(b=>b.kind==='boulder')){const q=projectBoulder(b,g.player,v),r=q.radius+4;window.kingSamples.push({left:(q.x-r-c.left)*c.zoom,right:(q.x+r-c.left)*c.zoom,top:(q.y-r-c.top)*c.zoom,bottom:(q.y+r-c.top)*c.zoom,width:v.width,height:v.height});}requestAnimationFrame(observe);};requestAnimationFrame(observe);});
  await m.locator('#ultimate').tap();await m.keyboard.down('d');await m.waitForTimeout(2000);await m.keyboard.up('d');await m.screenshot({path:'/tmp/screen72-mobile-'+width+'.png'});
  await m.setViewportSize({width:height,height:width});await m.waitForTimeout(250);await m.keyboard.down('s');await m.waitForTimeout(700);await m.keyboard.up('s');await m.keyboard.press('p');
  const frozen=await m.evaluate(()=>JSON.stringify(window.__survivor72.game));await m.setViewportSize({width,height});await m.waitForTimeout(200);assert.equal(await m.evaluate(()=>JSON.stringify(window.__survivor72.game)),frozen);
  const samples=await m.evaluate(()=>window.kingSamples);assert(samples.length>20);assert(samples.every(s=>s.left>=-1&&s.top>=-1&&s.right<=s.width+1&&s.bottom<=s.height+1));await m.close();
 }report.touchLayouts=[320,390,568,844];
 report.screenBoundsDuringPanResizePause=true;
 const fail=await open({},true);await start(fail);await fail.waitForTimeout(200);assert(await fail.evaluate(()=>window.__survivor72.game.time)>0);await fail.close();report.assetFailurePlayable=true;
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...report,errors},null,2));
}finally{await browser.close();}
