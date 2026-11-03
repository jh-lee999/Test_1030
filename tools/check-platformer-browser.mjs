import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const root=process.argv[2]||'http://127.0.0.1:4186',errors=[],external=[];
const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(root)&&!r.url().startsWith('data:'))external.push(r.url());});};
const state=page=>page.evaluate(()=>{const g=window.__platformer37.game;return{phase:g.phase,x:g.player.x,y:g.player.y,hp:g.stats.hp,time:g.time,frame:document.querySelector('canvas').dataset.butterFrame,shots:g.shotsFired,projectiles:g.projectiles.length,boulders:g.boulders.length,jumps:g.player.jumps,facing:g.player.facing,stage:g.room.index,items:g.stats.itemsTaken};});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});watch(page);
  await page.goto(root+'/?test=1&path=classic');await page.waitForSelector('body[data-ready="true"]');assert.match(await page.locator('#load-status').innerText(),/준비 완료/);await page.locator('#seed-input').fill('ROGUE-38');
  await page.screenshot({path:'/tmp/platform37-title.png'});await page.locator('#start-button').click();assert.equal((await state(page)).phase,'playing');
  const initial=await state(page);await page.keyboard.down('d');await page.keyboard.down('j');await page.waitForFunction(x=>window.__platformer37.game.player.x>x+100,initial.x);let s=await state(page);assert.match(s.frame,/walkShoot|walk/);
  await page.keyboard.down('Space');await page.waitForTimeout(130);await page.keyboard.up('Space');s=await state(page);assert.equal(s.jumps,1);assert.ok(s.y<initial.y-40);
  await page.keyboard.down('Space');await page.waitForTimeout(130);await page.keyboard.up('Space');s=await state(page);assert.equal(s.jumps,2);assert.ok(s.shots>0);
  await page.keyboard.up('d');await page.keyboard.up('j');await page.keyboard.down('a');await page.waitForTimeout(100);assert.equal((await state(page)).facing,-1);await page.keyboard.up('a');
  await page.keyboard.press('Shift');await page.keyboard.press('e');await page.waitForTimeout(800);assert.ok((await state(page)).boulders>0);await page.screenshot({path:'/tmp/platform37-skill.png'});
  await page.locator('#pause-button').click();const paused=await state(page);await page.waitForTimeout(180);assert.equal((await state(page)).time,paused.time);await page.locator('#resume-button').click();await page.waitForTimeout(80);assert.ok((await state(page)).time>paused.time);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await state(page)).phase,'paused');await page.locator('#resume-button').click();
  await page.keyboard.press('m');await page.waitForSelector('body[data-phase="map"]');const mapped=await state(page);await page.waitForTimeout(100);assert.equal((await state(page)).time,mapped.time);assert.equal(await page.locator('.map-node:not(:disabled)').count(),0);await page.screenshot({path:'/tmp/rogue38-map.png'});await page.locator('#map-close').click();assert.equal((await state(page)).phase,'playing');
  // Fixture the remaining HP, but exercise actual UI choices, portal proximity,
  // collision checks, keyboard interaction and every real room transition.
  let items=0;const types=[];
  for(let i=0;i<21;i++){
    if(i%7===0||i%7===6){await page.evaluate(()=>{const g=window.__platformer37.game;g.phase='paused';g.roomIntro=0;g.camera=Math.max(0,g.room.enemies.find(e=>e.boss)?.x-850||0);});await page.waitForTimeout(60);await page.screenshot({path:`/tmp/campaign42-room-${i}.png`,style:'#pause-screen{visibility:hidden}'});await page.evaluate(()=>window.__platformer37.game.phase='playing');}
    const kind=await page.evaluate(()=>{const g=window.__platformer37.game;g.room.enemies.forEach(e=>{e.hp=0;});if(g.room.shrine)Object.assign(g.player,{x:g.room.shrine.x,y:g.room.shrine.y,vy:0,grounded:true});return g.room.type;});types.push(kind);
    if(['treasure','rest'].includes(kind))await page.keyboard.press('f');
    if(!['rest','shop'].includes(kind)){await page.waitForSelector('body[data-phase="reward"]');assert.equal(await page.locator('#reward-cards .reward-card').count(),3);if(i===0)await page.screenshot({path:'/tmp/platform37-reward.png'});if(i%7===2){await page.locator('#reward-gold').click();}else{await page.locator('#reward-cards .reward-card').first().click();items++;}}
    else await page.waitForFunction(()=>window.__platformer37.game.room.rewardTaken);
    assert.equal((await state(page)).items,items);
    await page.evaluate(()=>{const g=window.__platformer37.game;g.player.x=g.room.exit.x;g.player.y=g.room.exit.y;g.player.vy=0;g.player.grounded=true;});
    await page.keyboard.press('f');await page.waitForTimeout(80);
    await page.waitForSelector(`body[data-phase="${i===20?'won':'route'}"]`);
    if(i<20){assert.ok(await page.locator('.map-node:not(:disabled)').count()>=1);if(i===0)await page.screenshot({path:'/tmp/rogue38-route.png'});const wanted=i===0?'treasure':i===1?'elite':i===2?'rest':null;const id=await page.evaluate(wanted=>{const g=window.__platformer37.game,ids=g.world.nodes.find(n=>n.id===g.currentNodeId).next;return ids.find(id=>g.world.nodes.find(n=>n.id===id).type===wanted)||ids[0];},wanted);await page.locator(`[data-node="${id}"]`).click();assert.equal((await state(page)).stage,i+1);}
  }
  assert.ok(types.includes('treasure')&&types.includes('rest')&&types.includes('elite'));await page.locator('#end-screen .replay').click();assert.equal(await page.evaluate(()=>window.__platformer37.game.seedLabel),'ROGUE-38');await page.keyboard.press('Escape');
  await page.locator('#pause-screen .restart').click();assert.notEqual(await page.evaluate(()=>window.__platformer37.game.seedLabel),'ROGUE-38');
  assert.equal((await state(page)).stage,0);assert.equal((await state(page)).items,0);
  await page.evaluate(async()=>{const {hurtPlayer}=await import('./platformer-engine.js');hurtPlayer(window.__platformer37.game,999);});await page.waitForSelector('body[data-phase="dead"]');await page.locator('#end-screen .restart').click();
  // Whole-pose visual proof: ordinary walking/fire, both mirrors, air and high.
  const sheet=await page.evaluate(()=>{
    const api=window.__platformer37,g=api.game,output=document.createElement('canvas');output.width=1280;output.height=720;const ctx=output.getContext('2d');
    const cases=[['walk L',-1,null,1,true,-300],['walk R',1,null,3,true,-300],['fire L',-1,'normal',1,true,-300],['fire R',1,'normal',3,true,-300],['air fire',1,'normal',1,false,-300],['high',1,'high',0,true,-300]];
    const canvas=document.querySelector('#game-canvas');g.phase='paused';g.camera=0;g.roomIntro=0;g.player.x=620;g.player.y=550;g.player.invulnerable=0;g.player.skillTime=0;
    cases.forEach(([label,facing,action,phase,grounded,vy],i)=>{g.player.facing=facing;g.player.action=action?{type:action,time:.45,duration:1}:null;g.player.gait={amount:1,phase,clock:1};g.player.grounded=grounded;g.player.vy=vy;api.render();const x=i%3*426,y=Math.floor(i/3)*360;ctx.drawImage(canvas,420,230,426,360,x,y,426,360);ctx.fillStyle='#fff5ca';ctx.font='18px sans-serif';ctx.fillText(label,x+20,y+25);});return output.toDataURL();
  });await fs.writeFile('/tmp/platform37-motion-proof.png',Buffer.from(sheet.split(',')[1],'base64'));
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});watch(mobile);await mobile.goto(root+'/?test=1&path=classic');await mobile.waitForSelector('body[data-ready="true"]');await mobile.locator('#start-button').tap();
  const cdp=await mobile.context().newCDPSession(mobile),points=[];for(const action of ['right','attack']){const b=await mobile.locator(`[data-control="${action}"]`).boundingBox();points.push({x:b.x+b.width/2,y:b.y+b.height/2,id:points.length+1});}
  const start=await state(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await mobile.waitForFunction(x=>window.__platformer37.game.player.x>x+40&&window.__platformer37.game.shotsFired>0,start.x);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.waitForTimeout(200);const stopped=await state(mobile);await mobile.waitForTimeout(200);assert.ok(Math.abs((await state(mobile)).x-stopped.x)<1,'released touch kept moving');
  await mobile.screenshot({path:'/tmp/platform37-mobile-play.png'});
  for(const width of [320,390,844]){await mobile.setViewportSize({width,height:width===844?390:844});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await mobile.setViewportSize({width:390,height:844});await mobile.evaluate(()=>window.__platformer37.game.room.enemies.forEach(e=>e.hp=0));await mobile.waitForSelector('body[data-phase="reward"]');await mobile.screenshot({path:'/tmp/platform37-mobile-reward.png'});await mobile.locator('.reward-card').first().tap();assert.equal((await state(mobile)).items,1);
  await mobile.evaluate(()=>{const g=window.__platformer37.game;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,vy:0,grounded:true});});await mobile.locator('[data-control="interact"]').tap();await mobile.waitForSelector('body[data-phase="route"]');
  for(const width of [320,390,844]){await mobile.setViewportSize({width,height:width===844?390:844});const stage=await mobile.evaluate(()=>({x:0,y:0,width:innerWidth,height:innerHeight}));for(const b of await mobile.locator('.map-node:not(:disabled)').all()){const box=await b.boundingBox();assert.ok(box.x>=stage.x&&box.x+box.width<=stage.x+stage.width+1);assert.ok(box.y>=stage.y&&box.y+box.height<=stage.y+stage.height+1);}}
  await mobile.setViewportSize({width:390,height:844});await mobile.screenshot({path:'/tmp/rogue38-mobile-route.png'});await mobile.locator('.map-node:not(:disabled)').first().tap();assert.equal((await state(mobile)).stage,1);
  const missing=await browser.newPage({reducedMotion:'reduce'});watch(missing);await missing.route('**/assets/**/*.webp',r=>r.abort());await missing.goto(root+'/?test=1&path=classic');await missing.waitForSelector('body[data-ready="true"]');assert.match(await missing.locator('#load-status').innerText(),/불러오지 못/);await missing.locator('#start-button').click();await missing.keyboard.down('d');await missing.waitForTimeout(200);assert.ok((await state(missing)).x>150);await missing.keyboard.up('d');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({start:true,movingFire:true,doubleJump:true,mirroring:true,dashAndSkill:true,pauseAndBlur:true,twentyOneRoomCampaign:true,eventTypes:types,mapPause:true,seedReplay:true,restart:true,realMultitouch:true,mobileWidths:[320,390,844],mobileRouteChoice:true,optionalImageFailure:true,runtimeErrors:errors,externalRequests:external},null,2));
}finally{await browser.close();}
