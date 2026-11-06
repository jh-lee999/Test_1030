import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
let browser;
const root=process.env.GAME_URL||'http://127.0.0.1:4196',reports=[],errors=[];
const stats=xs=>{xs=[...xs].sort((a,b)=>a-b);return {frames:xs.length,meanMs:+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(2),p95Ms:+xs[Math.floor(xs.length*.95)].toFixed(2),maxMs:+xs.at(-1).toFixed(2),over33:xs.filter(x=>x>33.4).length};};
try{
 for(let round=0;round<Number(process.env.PERF_ROUNDS||3);round++)for(const version of round%2?[81,80]:[80,81]){
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1366,height:850}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__perf={frames:[],long:[],portrait:0,record:false};let last=0;const frame=t=>{if(__perf.record&&last)__perf.frames.push(t-last);last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);new PerformanceObserver(l=>{if(__perf.record)__perf.long.push(...l.getEntries().map(e=>e.duration));}).observe({type:'longtask'});const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');Object.defineProperty(HTMLImageElement.prototype,'src',{...d,set(v){if(this.id==='hero-portrait'&&__perf.record)__perf.portrait++;d.set.call(this,v);}});});
  await p.goto(root+(version===80?'/dungeon80.html':'/dungeon81.html')+'?test=1&persist=1&seed=lag80',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForSelector('body[data-ready="true"]');await p.locator('#start').click();
  await p.evaluate(()=>{const a=__dungeon80,g=a.game,E=a.engine,r=g.rooms.find(r=>r.type==='combat'&&r.shape==='normal'),prev=g.rooms.find(q=>E.links(g,q).some(l=>l.to===r.id));__perf.frames=[];__perf.long=[];__perf.portrait=0;__perf.record=true;g.room=prev.id;prev.cleared=true;g.phase='playing';g.transition=0;E.enterRoom(g,E.links(g).find(l=>l.to===r.id).dir);g.player.invuln=999;r.enemies.forEach(e=>e.appear=0);a.sync();});
  await p.waitForTimeout(7000);
  const data=await p.evaluate(async()=>{__perf.record=false;const a=__dungeon80,E=a.engine;E.pause(a.game);a.sync();const t=performance.now();for(let i=0;i<120;i++)a.render();const render120ms=performance.now()-t,cache=location.pathname.endsWith('dungeon80.html')?null:(await import('./dungeon81-cache.js')).cacheStats();return {frames:__perf.frames,longTasks:__perf.long,portraitWrites:__perf.portrait,render120ms,cache,room:{shape:E.current(a.game).shape,enemies:E.current(a.game).enemies.length}};});
  const report={round,version,...data,frames:stats(data.frames),longTasks:{count:data.longTasks.length,maxMs:Math.max(0,...data.longTasks)}};reports.push(report);console.log(JSON.stringify(report));await context.close();await browser.close();browser=null;
 }
 assert.deepEqual(errors,[]);assert(reports.filter(r=>r.version===81).every(r=>r.portraitWrites===0&&r.cache.bytes<=r.cache.limit));
 const output={method:'Three paired fresh browser instances, alternating order, headless Chromium,1366x850,DPR1,seed lag80,7s cold combat entry. Explicit invulnerability/door fixture, no CPU profiler/throttling or concurrent tests. render120ms measures paused CPU submission time, not GPU paint latency. Not user-device FPS or measured GPU/RAM.',reports,errors};
 await fs.writeFile(process.env.PERF_OUTPUT||'/tmp/dungeon81-performance.json',JSON.stringify(output,null,2));
}finally{await browser?.close();}
