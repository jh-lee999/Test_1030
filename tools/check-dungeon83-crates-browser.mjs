import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.env.GAME_URL||'http://127.0.0.1:4196',errors=[],results=[];
try{
 const p=await browser.newPage({viewport:{width:1366,height:850}});p.on('pageerror',e=>errors.push(e.message));await p.goto(root+'/?test=1&seed=1793941607142');await p.waitForSelector('body[data-ready="true"]');await p.locator('#start').click();
 for(const mode of ['standard','inside','yellow','fan','charge','prism','velvet']){
  const target=await p.evaluate(async mode=>{
   const a=__dungeon83,g=a.game,E=a.engine,{shotBounds,firstShotHit}=await import('./dungeon82-collision.js'),{blocked,links}=await import('./dungeon80-world.js'),{butterMuzzleOffset,butterReleasePoint}=await import('./butter-gun-motion71.js');
   const room=g.rooms.find(r=>r.type==='combat'),from=g.rooms.find(r=>links(g,r).some(l=>l.to===room.id));g.room=from.id;from.cleared=true;g.transition=0;g.phase='playing';E.enterRoom(g,links(g).find(l=>l.to===room.id).dir);room.enemies.forEach(e=>e.appear=999);g.items=[];g.weapon='standard';g.hero=mode==='velvet'?'velvet':'butter';g.player.action=null;g.player.fireTimer=0;g.player.charge=0;g.player.invuln=999;g.queue=[];g.bullets=[];g.hostile=[];g.school.pending=[];g.phase='playing';
   for(const o of room.obstacles)if(o.kind==='pot')o.hp=1;
   if(['yellow','fan','charge','prism'].includes(mode))E.takeItem(g,mode);
   const type=mode==='yellow'?'gun':'normal',duration=type==='gun'?.32:.46,m=g.hero==='velvet'?{x:0,y:-26+22.4}:butterMuzzleOffset({size:80,gait:g.player.gait,action:{type,time:butterReleasePoint(type)*duration,duration}});
   let selected=null;
   for(const [i,o]of room.obstacles.entries())if(o.kind==='pot')for(const side of [1,-1]){
    const box=shotBounds(o),target={x:(box.left+box.right)/2,y:(box.top+box.bottom)/2},distance=mode==='inside'?16.1:mode==='velvet'?55:110,point={x:side===1?o.x-distance:o.x+o.w+distance,y:target.y-(m.y-22.4)},origin={x:point.x+m.x*(side===1?-1:1),y:target.y};
    if(blocked(room,point.x,point.y,16))continue;const hit=firstShotHit(room,origin,target,7);if(hit?.obstacle!==o)continue;selected={index:i,point,target,origin};break;
   }
   if(!selected)throw Error('no legal crate fixture '+mode);Object.assign(g.player,selected.point);g.fixtureCrateIndex=selected.index;a.sync();return selected;
  },mode);
  const v=await p.evaluate(async()=>{const {viewport}=await import('./dungeon83-renderer.js');return viewport(innerWidth,innerHeight,__dungeon83.game);});
  await p.mouse.move(v.x+target.target.x*v.zoom,v.y+target.target.y*v.zoom);await p.mouse.down();await p.waitForFunction(()=>__dungeon83.engine.current(__dungeon83.game).obstacles[__dungeon83.game.fixtureCrateIndex].hp===0,undefined,{timeout:6000});await p.mouse.up();results.push({mode,destroyed:true});
 }
 await p.keyboard.press('Escape');const exact=await p.evaluate(()=>{delete __dungeon83.game.fixtureCrateIndex;__dungeon83.checkpoint();return structuredClone(__dungeon83.game);});
 await p.screenshot({path:'/tmp/dungeon83-crates.png'});assert(exact.rooms.some(r=>r.obstacles.some(o=>o.kind==='pot'&&o.hp===0)));
 // Separate real81 save ->82 entry with no state injections.
 const c=await browser.newPage({viewport:{width:1366,height:850}});c.on('pageerror',e=>errors.push(e.message));await c.goto(root+'/dungeon81.html?test=1&persist=1&seed=resume82');await c.waitForSelector('body[data-ready="true"]');await c.locator('#start').click();await c.keyboard.press('Escape');const old=await c.evaluate(()=>structuredClone(__dungeon81.game));await c.goto(root+'/?test=1&persist=1');await c.waitForSelector('body[data-ready="true"]');await c.locator('[data-continue]').click();assert.deepEqual(await c.evaluate(()=>structuredClone(__dungeon83.game)),old);await c.close();assert.deepEqual(errors,[]);
 console.log(JSON.stringify({explicitGeneratedRoomFixture:true,realMouseFire:results,exact81To83Continue:true,errors},null,2));
}finally{await browser.close();}
