import {advanceButterGait,butterReleasePoint,butterMuzzleOffset} from './butter-gun-motion71.js';
import {ITEMS,ROLES,combos,FLOORS} from './dungeon74-content.js';
import {generateFloor,makeObstacles,makeTerrain,FLOOR,DIRECTIONS,links,blocked,blockedShot,moveBody,steer,nearestFree,reachable,hash,random,VIEW} from './dungeon74-world.js';
export {ITEMS,combos,FLOORS,VIEW,FLOOR,links};
export const current=g=>g.rooms[g.room];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),live=e=>e.hp>0;
const has=(g,id)=>g.items.includes(id),rnd=g=>random(g.loot),TAU=Math.PI*2;
export function stats(g){return {damage:has(g,'yellow')?21:14,interval:(has(g,'yellow')?.34:.56)*(has(g,'belt')?.85:1),speed:235,shotSpeed:has(g,'yellow')?850:600,maxHp:70,pierce:(has(g,'yellow')?1:0)+(has(g,'mace')?1:0)};}
export function createGame(seed=Date.now()){
 const label=String(seed).trim().slice(0,48)||'BUTTER',g={version:74,floorIndex:0,history:[],floorStartedAt:0,seed:label,runId:label+':'+Date.now(),phase:'playing',returnPhase:null,room:0,rooms:generateFloor(label),time:0,id:0,loot:{rng:hash(label+':loot73')},items:[],coins:5,keys:1,bombs:2,battery:3,shots:0,hits:0,primaryHits:0,kills:0,clears:0,damageTaken:0,bullets:[],hostile:[],queue:[],zones:[],effects:[],numbers:[],choice:null,trial:null,notice:'새총과 선물 하나로, 셰이디의 아공간을 빠져나가자.',noticeUntil:5,transition:0,roomBanner:3,telemetry:{shots:0,gun:0,ricochet:0,lightning:0,split:0,fire:0,parry:0,boulder:0,bounce:0,wallBounce:0,frozen:0,pulse:0,fragments:0,terrainBroken:0,trials:0,damageBy:{}},player:{x:640,y:470,hp:70,facing:-1,invuln:0,fireTimer:0,action:null,aim:{x:1,y:0},gait:{phase:0,amount:0,clock:0}}};initRoom(g,current(g));return g;
}
function note(g,s){g.notice=s;g.noticeUntil=g.time+3;}
function effect(g,kind,x,y,extra={}){g.effects.push({kind,x,y,age:0,life:.35,...extra});if(g.effects.length>90)g.effects.shift();}
function pickup(g,kind,x,y,value=1){const p=nearestFree(current(g),{x,y},32);current(g).pickups.push({id:++g.id,kind,x:p.x,y:p.y,value});}
function bullet(g,b){if(g.bullets.length>=100)return;g.bullets.push({id:++g.id,age:0,life:1.8,radius:7,damage:14,hits:{},child:false,pierce:0,...b});}
function shot(g,x,y,a,speed=235,damage=10){if(g.hostile.length>=90)return;g.hostile.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage,life:6,radius:8});}
export function spawnEnemy(g,role,x,y){const r=ROLES[role],scale=r.boss?1:1+g.floorIndex*.27,e={id:++g.id,role,x,y,hp:Math.round(r.hp*scale),maxHp:Math.round(r.hp*scale),radius:r.radius,speed:r.speed,damage:r.damage+(r.boss?0:g.floorIndex*2),boss:!!r.boss,state:'move',timer:.8+(g.id%5)*.18,age:0,appear:.7,flash:0,burn:0,slow:0,aimX:x,aimY:y,attack:0,action:null};current(g).enemies.push(e);return e;}
function offers(g,n=3){const pool=Object.keys(ITEMS).filter(id=>!has(g,id)),out=[];while(pool.length&&out.length<n)out.push(pool.splice(Math.floor(rnd(g)*pool.length),1)[0]);return out;}
function spawnWave(g,r,wave=0){
 const rng={rng:hash(g.seed+':roster74:'+g.floorIndex+':'+r.id+':'+wave)},roles=['fan','archer','rusher','caster','guard'],count=Math.min(8,3+Math.min(3,Math.floor(r.depth/2))+g.floorIndex+(wave?1:0)),rotation=Math.floor(random(rng)*5);
 const positions=[[390,340],[890,555],[890,340],[390,555],[650,315],[650,570],[310,460],[980,460]];
 for(let i=0;i<count;i++){const role=roles[(rotation+i)%roles.length],target={x:positions[i][0],y:positions[i][1]},spots=[];for(let y=285;y<=600;y+=45)for(let x=290;x<=1020;x+=50)if(reachable(r,{x,y},32)&&r.enemies.every(e=>Math.hypot(e.x-x,e.y-y)>48))spots.push({x,y});const p=spots.sort((a,b)=>dist(a,target)-dist(b,target))[0]||nearestFree(r,target,32);spawnEnemy(g,role,p.x,p.y);}
}
function initRoom(g,r){
 if(r.initialized)return;r.initialized=true;r.obstacles=makeObstacles(g.seed,r);r.terrain=makeTerrain(g.seed,r);r.damageStart=g.damageTaken;
 if(!['combat','boss'].includes(r.type))r.cleared=true;
 if(r.type==='start'&&g.floorIndex===0||r.type==='treasure'||r.type==='secret')r.pedestal={x:640,y:415,offers:offers(g),taken:false};
 if(r.type==='shop'){r.stock=offers(g).map((id,i)=>({id,price:7+i*2,sold:false,x:460+i*180,y:410}));r.stock.push({id:'heal',price:3,sold:false,x:550,y:575},{id:'key',price:3,sold:false,x:730,y:575});}
 if(r.type==='secret'){for(let i=0;i<4;i++)pickup(g,'coin',520+i*80,530,2);pickup(g,'heart',640,570,14);}
 if(r.type==='combat')spawnWave(g,r);
 if(r.type==='boss'){const p=nearestFree(r,{x:820,y:430},32);spawnEnemy(g,FLOORS[g.floorIndex].boss,p.x,p.y);}
}
export function nextFloor(g){
 const r=current(g),p=g.player;if(g.phase!=='playing'||r.type!=='boss'||!r.cleared||r.pedestal&&!r.pedestal.taken||dist(p,{x:640,y:420})>=100||p.action?.type==='high')return false;
 const summary={floor:g.floorIndex,time:g.time-g.floorStartedAt,clears:g.rooms.filter(r=>r.rewarded).length,visited:g.rooms.filter(r=>r.visited).length,items:[...g.items]};g.history.push(summary);
 if(g.floorIndex===FLOORS.length-1){g.phase='won';note(g,'세 겹의 아공간에서 빠져나왔어요!');return true;}
 g.floorIndex++;g.floorStartedAt=g.time;g.rooms=generateFloor(g.seed,g.floorIndex);g.room=0;p.x=640;p.y=470;p.action=null;p.invuln=Math.max(p.invuln,.85);g.queue=[];g.bullets=g.bullets.filter(b=>b.kind==='boulder');g.hostile=[];g.zones=[];g.effects=[];g.transition=.6;g.roomBanner=3;initRoom(g,current(g));note(g,(g.floorIndex+1)+'층 · '+FLOORS[g.floorIndex].name+' — 선물과 자원은 그대로!');return true;
}
export function acceptTrial(g){
 const r=current(g);if(g.phase!=='trial'||g.trial!==r.id||r.type!=='challenge'||r.challenge.state!=='ready')return false;g.phase='playing';g.trial=null;r.challenge={state:'active',wave:1,damageStart:g.damageTaken,nextWaveAt:0};r.cleared=false;spawnWave(g,r,1);note(g,'도전 시작 · 두 무리를 버티면 선물!');return true;
}
export function cancelTrial(g){if(g.phase!=='trial')return false;g.phase='playing';g.trial=null;return true;}
export function restock(g){
 const r=current(g),cost=3+r.restocks*2;if(g.phase!=='playing'||r.type!=='shop'||dist(g.player,{x:310,y:355})>=95||r.restocks>=2||g.coins<cost)return false;
 const pool=offers(g);if(!pool.length)return false;g.coins-=cost;r.restocks++;const services=r.stock.filter(s=>!ITEMS[s.id]);r.stock=[...pool.map((id,i)=>({id,price:7+i*2,sold:false,x:460+i*180,y:410})),...services];note(g,'재입고 완료 · 회복과 열쇠 재고는 리필되지 않아요.');return true;
}
export function pause(g){if(!['playing','choice','trial'].includes(g.phase))return false;g.returnPhase=g.phase;g.phase='paused';return true;}
export function resume(g){if(g.phase!=='paused')return false;g.phase=g.returnPhase||'playing';g.returnPhase=null;return true;}
export function enterRoom(g,dir){
 if(g.phase!=='playing'||!current(g).cleared||g.player.action?.type==='high'||g.transition>0)return false;
 const l=links(g).find(l=>l.dir===dir);if(!l)return false;const to=g.rooms[l.to];
 if(to.type==='secret'&&!to.unlocked){note(g,'이 면의 벽에 작은 금이 있어요. 폭탄으로 열어 보세요.');return false;}
 if(to.type==='treasure'&&!to.unlocked){if(g.keys<1){note(g,'금빛 문에는 열쇠가 필요해요.');return false;}g.keys--;to.unlocked=true;}
 const d=DIRECTIONS[dir];g.room=to.id;to.damageStart=g.damageTaken;to.visited=true;to.entered++;g.player.x=dir==='e'?FLOOR.left+75:dir==='w'?FLOOR.right-75:640;g.player.y=dir==='s'?FLOOR.top+78:dir==='n'?FLOOR.bottom-65:442;
 g.player.invuln=Math.max(g.player.invuln,.85);g.player.action=null;g.queue=[];g.bullets=g.bullets.filter(b=>b.kind==='boulder');g.hostile=[];g.zones=[];g.effects=[];g.transition=.6;g.roomBanner=2.4;initRoom(g,to);return true;
}
export function nearby(g){
 const r=current(g),p=g.player;if(r.pedestal&&!r.pedestal.taken&&dist(p,r.pedestal)<95)return {kind:'pedestal',text:r.type==='boss'?'보스의 선물 고르기':'선물 살펴보기',x:r.pedestal.x,y:r.pedestal.y};
 if(r.type==='shop'){const stock=r.stock.filter(s=>!s.sold&&(!ITEMS[s.id]||!has(g,s.id))&&dist(p,s)<85).sort((a,b)=>dist(p,a)-dist(p,b))[0];if(stock)return {kind:'buy',stock,text:(ITEMS[stock.id]?.name||(stock.id==='heal'?'체력 22 회복':'열쇠 1개'))+' · '+stock.price+'닢',x:stock.x,y:stock.y};if(r.restocks<2&&dist(p,{x:310,y:355})<95)return {kind:'restock',text:'새 물건 재입고 · '+(3+r.restocks*2)+'닢',x:310,y:355};}
 if(r.type==='challenge'&&r.challenge.state==='ready'&&dist(p,{x:640,y:415})<95)return {kind:'trial',text:'두 무리 도전 · 선물 / 무피격 추가 열쇠',x:640,y:415};
 if(r.type==='boss'&&r.cleared&&dist(p,{x:640,y:420})<100)return {kind:'exit',text:g.floorIndex<FLOORS.length-1?'다음 층으로 · 보유 자원 유지':'세 겹의 아공간에서 탈출',x:640,y:420};return null;
}
export function interact(g){if(g.phase!=='playing')return false;const n=nearby(g);if(!n)return false;
 if(n.kind==='pedestal'){const p=current(g).pedestal;p.offers=p.offers.filter(id=>!has(g,id));if(!p.offers.length){p.taken=true;pickup(g,'coin',p.x,p.y,4);return true;}g.choice=[...p.offers];g.phase='choice';return true;}
 if(n.kind==='buy')return buy(g,n.stock.id);
 if(n.kind==='restock')return restock(g);
 if(n.kind==='trial'){g.phase='trial';g.trial=current(g).id;return true;}
 if(n.kind==='exit')return nextFloor(g);return false;
}
export function takeItem(g,id){if(!Object.hasOwn(ITEMS,id)||has(g,id))return false;const before=combos(g).length;g.items.push(id);if(id==='fireworks')g.bombs+=2;effect(g,'item',g.player.x,g.player.y,{life:1});note(g,combos(g).length>before?'조합 완성 · '+combos(g).at(-1).name:ITEMS[id].name+' 획득!');return true;}
export function chooseItem(g,id){if(g.phase!=='choice'||!g.choice?.includes(id)||!takeItem(g,id))return false;current(g).pedestal.taken=true;g.choice=null;g.phase='playing';return true;}
export function cancelChoice(g){if(g.phase!=='choice')return false;g.choice=null;g.phase='playing';return true;}
export function buy(g,id){if(g.phase!=='playing'||current(g).type!=='shop')return false;const s=current(g).stock.find(s=>s.id===id&&!s.sold);if(!s||dist(g.player,s)>85)return false;if(g.coins<s.price){note(g,'동전이 모자라요. 다른 방을 둘러보고 와도 괜찮아요.');return false;}if(id==='heal'&&g.player.hp>=stats(g).maxHp)return false;if(ITEMS[id]&&has(g,id))return false;g.coins-=s.price;s.sold=true;if(id==='heal')g.player.hp=Math.min(stats(g).maxHp,g.player.hp+22);else if(id==='key')g.keys++;else takeItem(g,id);effect(g,'item',s.x,s.y);return true;}
export function useUltimate(g){if(g.phase!=='playing'||g.battery<3||g.player.action?.type==='high')return false;g.battery-=3;g.queue=g.queue.filter(q=>q.kind!=='primary');startHigh(g);if(has(g,'yellow'))g.queue.push({kind:'highStart',at:g.time+1.1});return true;}
function startHigh(g){const p=g.player;p.action={type:'high',time:0,duration:1.1,facing:p.facing};p.invuln=Math.max(p.invuln,1.1);g.queue.push({kind:'high',at:g.time+butterReleasePoint('high')*1.1,aim:{...p.aim},facing:p.facing});effect(g,'charge',p.x,p.y-35,{life:.6});}
export function placeBomb(g){if(g.phase!=='playing'||g.bombs<1||g.zones.length>=70||g.zones.filter(z=>z.kind==='bomb').length>=12)return false;g.bombs--;g.zones.push({kind:'bomb',x:g.player.x,y:g.player.y,age:0,life:1.35,radius:125});return true;}
function damagePlayer(g,amount){const p=g.player;if(p.invuln>0||g.phase!=='playing')return;p.hp=Math.max(0,p.hp-amount);p.invuln=.95;g.damageTaken+=amount;effect(g,'hurt',p.x,p.y,{life:.3});if(p.hp<=0)g.phase='dead';}
function hit(g,e,amount,source='stone'){if(!live(e)||e.appear>0)return;const thaw=has(g,'rust')&&source!=='melt'&&(e.freezeUntil||0)>g.time&&(e.meltAt||0)<g.time;if(thaw){e.freezeUntil=0;e.meltAt=g.time+.5;}const actual=Math.min(e.hp,amount);e.hp-=amount;e.flash=.12;g.telemetry.damageBy[source]=(g.telemetry.damageBy[source]||0)+actual;g.numbers.push({x:e.x,y:e.y-55,value:Math.round(amount),age:0});if(g.numbers.length>50)g.numbers.shift();effect(g,'hit',e.x,e.y-15);if(!live(e)){g.kills++;effect(g,'defeat',e.x,e.y-20,{life:.45});if(has(g,'bell')){g.telemetry.pulse++;area(g,e.x,e.y,110,8,'bell');for(const t of current(g).enemies)if(live(t)&&dist(t,e)<110){const d=dist(t,e)||1;moveBody(current(g),t,(t.x-e.x)/d*35,(t.y-e.y)/d*35,t.radius);}if(has(g,'komi'))for(const b of g.hostile)if(dist(b,e)<130)b.life=0;}}if(thaw)area(g,e.x,e.y,90,18,'melt');}
function area(g,x,y,r,damage,source){for(const e of current(g).enemies)if(live(e)&&Math.hypot(e.x-x,e.y-y)<r+e.radius)hit(g,e,damage,source);effect(g,'pulse',x,y,{radius:r,life:.35});}
function nearest(g,b,except=null,range=480){return current(g).enemies.filter(e=>live(e)&&e.id!==except&&e.appear<=0&&dist(e,b)<range).sort((a,c)=>dist(a,b)-dist(c,b))[0];}
function lightning(g,e){g.telemetry.lightning++;for(const t of current(g).enemies.filter(t=>live(t)&&t.id!==e.id&&dist(t,e)<250).sort((a,b)=>dist(a,e)-dist(b,e)).slice(0,2)){effect(g,'bolt',e.x,e.y-25,{x2:t.x,y2:t.y-25,life:.22});hit(g,t,12,'lightning');}}
function release(g,q){const p=g.player;if(q.kind==='highStart'){startHigh(g);return;}const type=q.kind==='high'?'high':q.gun?'gun':'normal',duration=type==='high'?1.1:type==='gun'?.32:.46,m=butterMuzzleOffset({size:80,gait:p.gait,action:{type,time:butterReleasePoint(type)*duration,duration}}),x=p.x+m.x*q.facing,y=p.y+m.y-22.4;
 if(q.target){const dx=q.target.x-x,dy=q.target.y-y,n=Math.hypot(dx,dy)||1;q.aim={x:dx/n,y:dy/n};}
 if(q.kind==='high'){let a=Math.atan2(q.aim.y,q.aim.x),sx=Math.sign(Math.cos(a))||1,sy=Math.sign(Math.sin(a))||-1;a=clamp(Math.atan2(Math.abs(q.aim.y),Math.abs(q.aim.x)),Math.PI/8,Math.PI*3/8);bullet(g,{kind:'boulder',x:clamp(x,50,1230),y:clamp(y,50,750),vx:Math.cos(a)*640*sx,vy:Math.sin(a)*640*sy,life:8,radius:36,damage:90});g.telemetry.boulder++;effect(g,'muzzle',x,y);return;}
 g.shots++;g.telemetry.shots++;if(q.gun)g.telemetry.gun++;const a=Math.atan2(q.aim.y,q.aim.x),s=stats(g);
 bullet(g,{kind:q.gun?'gun':'stone',x,y,vx:Math.cos(a)*s.shotSpeed,vy:Math.sin(a)*s.shotSpeed,life:1.45,damage:s.damage,pierce:s.pierce,returning:has(g,'belt'),returned:false,wallBounces:has(g,'mirror')?2:0});
 if(has(g,'scythe')&&g.shots%3===0){bullet(g,{kind:'chain',x,y,vx:Math.cos(a)*590,vy:Math.sin(a)*590,life:4,damage:18,bounces:4,last:null,lock:0});g.telemetry.ricochet++;}effect(g,'muzzle',x,y);
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a.x-dx*t,y-a.y-dy*t);}
function projectiles(g,dt){const r=current(g),p=g.player;
 for(const b of g.bullets){b.life-=dt;b.age+=dt;const old={x:b.x,y:b.y};b.lock=Math.max(0,(b.lock||0)-dt);
  if(b.kind==='chain'){const target=nearest(g,b,b.last,480);if(target){const d=dist(target,b);b.vx=(target.x-b.x)/(d||1)*590;b.vy=(target.y-b.y)/(d||1)*590;}}
  if(b.returning&&(b.age>.5||b.returned)){if(!b.returned){b.returned=true;b.hits={};}const target={x:p.x,y:p.y-45},d=dist(target,b);if(d<20){b.life=0;continue;}b.vx=(target.x-b.x)/d*650;b.vy=(target.y-b.y)/d*650;}
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.kind==='boulder'){const k=50;for(const [axis,v,max]of [['x','vx',VIEW.width-k],['y','vy',VIEW.height-k]]){if(b[axis]<k||b[axis]>max){b[axis]=b[axis]<k?k+(k-b[axis]):max-(b[axis]-max);b[v]*=-1;g.telemetry.bounce++;effect(g,'pulse',b.x,b.y,{radius:40,life:.2});}}}
  else if(blockedShot(r,b.x,b.y,b.radius)&&!blockedShot(r,old.x,old.y,b.radius)){const pot=r.obstacles.find(o=>o.kind==='pot'&&o.hp>0&&b.x>o.x-10&&b.x<o.x+o.w+10&&b.y>o.y-10&&b.y<o.y+o.h+10);if(pot){pot.hp=0;pickup(g,'coin',pot.x+20,pot.y+20);}if(b.wallBounces>0){let rx=blockedShot(r,b.x,old.y,b.radius),ry=blockedShot(r,old.x,b.y,b.radius);if(!rx&&!ry)rx=Math.abs(b.vx)>=Math.abs(b.vy),ry=!rx;if(rx)b.vx*=-1;if(ry)b.vy*=-1;b.x=old.x;b.y=old.y;b.wallBounces--;b.hits={};g.telemetry.wallBounce++;if(has(g,'weather'))lightning(g,{x:b.x,y:b.y});}else if(b.returning){b.returned=true;b.hits={};b.x=old.x;b.y=old.y;}else b.life=0;}
  if(b.x<0||b.x>VIEW.width||b.y<0||b.y>VIEW.height)b.life=0;
  for(const e of r.enemies){if(!live(e)||b.life<=0||e.appear>0||b.lock>0||(b.hits[e.id]||0)>g.time||segmentDistance(e.x,e.y-26,old,b)>e.radius+b.radius)continue;
   const shield=e.role==='guard'&&e.state==='move'&&Math.sign(b.vx)===-Math.sign(p.x-e.x),d=b.damage*(shield?.4:1);hit(g,e,d,b.kind);g.hits++;
   if(['stone','gun'].includes(b.kind)&&!b.child)g.primaryHits++;if(has(g,'frost')&&['stone','gun'].includes(b.kind)&&!b.child&&g.primaryHits%3===0){e.freezeUntil=g.time+(e.boss?.15:.65);g.telemetry.frozen++;}
   if(has(g,'weather')&&g.hits%4===0)lightning(g,e);if(has(g,'mace')&&g.hits%3===0)area(g,e.x,e.y,85,12,'impact');
   if(has(g,'rust')&&(!b.child||has(g,'lucky'))&&g.zones.length<35){g.telemetry.fire++;g.zones.push({kind:'fire',x:e.x,y:e.y,age:0,life:2,radius:40,timer:0});}
   if(has(g,'lucky')&&!b.child&&['stone','gun'].includes(b.kind)){g.telemetry.split++;const a=Math.atan2(b.vy,b.vx);for(const offset of [-.6,.6])bullet(g,{kind:'stone',x:e.x,y:e.y-22,vx:Math.cos(a+offset)*470,vy:Math.sin(a+offset)*470,damage:b.damage*.5,life:.6,child:true,hits:{[e.id]:1e9}});}
   if(b.kind==='chain'){if(has(g,'weather'))lightning(g,e);b.hits={};b.hits[e.id]=g.time+.08;b.last=e.id;b.lock=.085;b.bounces--;if(b.bounces<=0||!nearest(g,b,e.id,480))b.life=0;break;}
   b.hits[e.id]=b.kind==='boulder'?g.time+.45:1e9;if(b.kind==='boulder'||b.returning)continue;if(b.pierce>0)b.pierce--;else b.life=0;
  }
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
 for(const b of g.hostile){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(blockedShot(r,b.x,b.y,6))b.life=0;if(b.life<=0)continue;
  if(has(g,'komi')){const x=p.x+Math.cos(g.time*2.8)*72,y=p.y-22+Math.sin(g.time*2.8)*45;if(Math.hypot(b.x-x,b.y-y)<27){b.life=0;g.telemetry.parry++;const e=nearest(g,b,null,800),a=e?Math.atan2(e.y-26-b.y,e.x-b.x):Math.atan2(-b.vy,-b.vx);bullet(g,{kind:'stone',x:b.x,y:b.y,vx:Math.cos(a)*600,vy:Math.sin(a)*600,damage:22,child:true});effect(g,'pulse',x,y,{radius:40});if(has(g,'mace'))area(g,x,y,110,18,'parry');}}
  if(b.life>0&&Math.hypot(p.x-b.x,p.y-28-b.y)<22){damagePlayer(g,b.damage);b.life=0;}
 }g.hostile=g.hostile.filter(b=>b.life>0);
}
function enemies(g,dt){
 const r=current(g),p=g.player;
 for(const e of r.enemies){
  if(!live(e))continue;e.flash=Math.max(0,e.flash-dt);if((e.freezeUntil||0)>g.time)continue;
  e.age+=dt;if(e.state!=='move')e.attackClock=(e.attackClock||0)+dt;e.appear=Math.max(0,e.appear-dt);if(e.appear>0)continue;e.timer-=dt;
  if(e.action){e.action.time+=dt;if(e.action.time>=e.action.duration)e.action=null;}
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
  if(e.state==='move'){
   const ranged=['archer','caster','erpin'].includes(e.role),los=clearShot(r,{x:e.x,y:e.y-26},{x:p.x,y:p.y-28}),sign=ranged?d<210?-1:d>390||!los?1:0:1,speed=e.speed*(e.slow>g.time?.6:1);
   if(sign===1)steer(r,e,p,dt,speed,e.radius);else if(sign===-1){const away={x:e.x-dx/d*160,y:e.y-dy/d*160};steer(r,e,away,dt,speed,e.radius);}
   if(e.timer<=0&&(d<650||e.boss)){e.state='tell';e.attackClock=0;e.timer=e.boss?(e.role==='erpin'?.95:1.05):e.role==='rusher'?.72:e.role==='fan'?.5:.85;e.aimX=p.x;e.aimY=p.y;if(e.role==='shady'){const t=nearestFree(r,{x:clamp(p.x,FLOOR.left+90,FLOOR.right-90),y:clamp(p.y,FLOOR.top+70,FLOOR.bottom-70)},e.radius);e.aimX=t.x;e.aimY=t.y;}e.attack++;e.enraged=e.boss&&e.hp<e.maxHp/2;if(e.boss)e.action={type:e.role==='velvet'?'high':'skill',time:0,duration:e.role==='velvet'?4.25:e.role==='erpin'?2.9:3.55};}
  }else if(e.state==='tell'&&e.timer<=0){
   const a=Math.atan2(e.aimY-e.y,e.aimX-e.x);
   if(e.role==='rusher'){e.state='dash';e.timer=.5;e.vx=Math.cos(a)*480;e.vy=Math.sin(a)*480;}
   else if(e.role==='velvet'){e.state='spin';e.timer=1.8;e.vx=Math.cos(a)*145;e.vy=Math.sin(a)*145;e.pulse=0;}
   else if(e.role==='erpin'){e.state='volley';e.timer=.7;e.volley=0;e.volleyClock=0;e.volleyAngle=Math.atan2(e.aimY-(e.y-25),e.aimX-e.x);}
   else if(e.role==='shady'){const spot=nearestFree(r,{x:clamp(e.aimX,FLOOR.left+90,FLOOR.right-90),y:clamp(e.aimY,FLOOR.top+70,FLOOR.bottom-70)},e.radius);e.x=spot.x;e.y=spot.y;e.state='slash';e.timer=1.2;e.pulse=0;}
   else{if(e.role==='caster')g.zones.push({kind:'danger',x:e.aimX,y:e.aimY,age:0,life:1.05,radius:65});else if(e.role==='archer')for(const offset of [-.16,0,.16])shot(g,e.x,e.y-25,a+offset,240,e.damage);else if(e.role==='guard')for(let i=0;i<6;i++)shot(g,e.x,e.y-25,i*TAU/6+e.attack*.3,200,e.damage);else if(d<75)damagePlayer(g,e.damage);e.state='recover';e.timer=.95;}
  }else if(e.state==='dash'){moveBody(r,e,e.vx*dt,e.vy*dt,e.radius);if(e.timer<=0){e.state='recover';e.timer=1;}}
  else if(e.state==='spin'){moveBody(r,e,e.vx*dt,e.vy*dt,e.radius);e.pulse-=dt;if(e.pulse<=0){e.pulse=.3;effect(g,'slash',e.x,e.y,{radius:132});if(dist(e,p)<132)damagePlayer(g,e.damage);}if(e.timer<=0){e.state='recover';e.timer=1.4;if(e.enraged)for(let i=0;i<8;i++)shot(g,e.x,e.y-25,TAU*i/8+e.attack*.25,190,12);}}
  else if(e.state==='volley'){e.volleyClock-=dt;if(e.volleyClock<=0&&e.volley<4){const offset=[-.15,-.05,.05,.15][e.volley];shot(g,e.x,e.y-25,e.volleyAngle+offset,e.enraged?290:245,e.damage);e.volley++;e.volleyClock=.17;}if(e.timer<=0){e.state='recover';e.timer=1.25;if(e.enraged)for(const dx of [-75,75])g.zones.push({kind:'danger',x:clamp(e.aimX+dx,FLOOR.left+65,FLOOR.right-65),y:e.aimY,age:0,life:1.1,radius:55});}}
  else if(e.state==='slash'){e.pulse-=dt;if(e.pulse<=0){e.pulse=.2;effect(g,'slash',e.x,e.y,{radius:82});if(dist(e,p)<82)damagePlayer(g,e.damage);}if(e.timer<=0){e.state='recover';e.timer=1.3;const count=e.enraged?12:8;for(let i=0;i<count;i++)shot(g,e.x,e.y-25,TAU*i/count+e.attack*.2,e.enraged?230:190,11);if(e.enraged)for(const dx of [-65,65])g.zones.push({kind:'danger',x:clamp(p.x+dx,FLOOR.left+70,FLOOR.right-70),y:p.y,age:0,life:1.1,radius:55});}}
  else if(e.state==='recover'&&e.timer<=0){e.state='move';e.timer=e.boss?.5:.8;}
  if(dist(e,p)<e.radius+17)damagePlayer(g,e.damage);
  if(has(g,'komi')){const a=g.time*2.8,x=p.x+Math.cos(a)*72,y=p.y-22+Math.sin(a)*45;if(Math.hypot(e.x-x,e.y-25-y)<e.radius+20&&(e.pillowAt||0)<g.time){e.pillowAt=g.time+.65;hit(g,e,12,'pillow');moveBody(r,e,-dx/d*18,-dy/d*18,e.radius);}}
 }
 r.enemies=r.enemies.filter(live);
}
function clearShot(r,a,b){const n=Math.max(1,Math.ceil(dist(a,b)/10));for(let i=1;i<n;i++)if(blockedShot(r,a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,5))return false;return true;}
function zones(g,dt){for(const z of g.zones){z.age+=dt;z.life-=dt;
 if(z.kind==='bomb'&&z.life<=0){area(g,z.x,z.y,125,130,'bomb');effect(g,'explosion',z.x,z.y,{life:.5,radius:125});if(dist(g.player,z)<100)damagePlayer(g,14);if(has(g,'fireworks')){for(let i=0;i<8;i++){const a=i*TAU/8;bullet(g,{kind:has(g,'yellow')?'gun':'stone',x:z.x,y:z.y-20,vx:Math.cos(a)*500,vy:Math.sin(a)*500,damage:stats(g).damage*.6,pierce:stats(g).pierce,life:1.4,child:true,wallBounces:has(g,'mirror')?2:0});}g.telemetry.fragments+=8;}for(const o of current(g).obstacles)if(o.hp!==0&&o.kind!=='gap'&&dist(z,{x:o.x+o.w/2,y:o.y+o.h/2})<160){o.hp=0;g.telemetry.terrainBroken++;if(o.kind==='pot')pickup(g,'coin',o.x+20,o.y+20,2);}for(const l of links(g))if(g.rooms[l.to].type==='secret'&&!g.rooms[l.to].unlocked&&dist(z,l)<155){g.rooms[l.to].unlocked=true;note(g,'비밀방을 발견했어요!');}}
 if(z.kind==='danger'&&z.age>=.75&&!z.triggered){z.triggered=true;areaVisual(g,z);if(dist(g.player,z)<z.radius)damagePlayer(g,12);}
 if(z.kind==='fire'){z.timer-=dt;if(z.timer<=0){z.timer=.4;for(const e of current(g).enemies)if(live(e)&&dist(e,z)<z.radius+e.radius)hit(g,e,4,'fire');}}
 }g.zones=g.zones.filter(z=>z.life>0);}
function areaVisual(g,z){effect(g,'pulse',z.x,z.y,{radius:z.radius,life:.25});}
function clearRoom(g){
 const r=current(g);if(r.cleared||r.enemies.length||!r.initialized)return;
 if(r.type==='challenge'&&r.challenge.state==='active'&&r.challenge.wave<2){if(!r.challenge.nextWaveAt){r.challenge.nextWaveAt=g.time+1.15;note(g,'두 번째 무리가 다가와요!');}if(g.time<r.challenge.nextWaveAt)return;r.challenge.wave=2;spawnWave(g,r,2);return;}
 r.cleared=true;g.clears++;g.battery=Math.min(3,g.battery+1);g.hostile=[];g.zones=g.zones.filter(z=>z.kind==='bomb');if(r.rewarded)return;r.rewarded=true;
 const flawless=g.damageTaken===r.damageStart;for(let i=0;i<3;i++)pickup(g,'coin',590+i*48,465);if(flawless)pickup(g,'coin',560,500);pickup(g,g.clears%2===1?'key':'bomb',640,510);if(g.clears%3===0)pickup(g,'heart',640,550,14);
 if(r.type==='challenge'){r.challenge.state='done';g.telemetry.trials++;r.pedestal={x:640,y:415,offers:offers(g),taken:false};pickup(g,'coin',720,500,3);if(g.damageTaken===r.challenge.damageStart)pickup(g,'key',680,550);note(g,'도전 성공 · 선물'+(g.damageTaken===r.challenge.damageStart?' + 무피격 열쇠!':'!'));}
 else if(r.type==='boss'){r.bossGift=true;r.pedestal={x:640,y:415,offers:offers(g),taken:false};note(g,FLOORS[g.floorIndex].bossName+' 격파 · 선물을 고르고 중앙 문으로!');}
 else note(g,'방 정리 완료 · 왕새총 +1'+(flawless?' · 무피격 동전':''));
 effect(g,'clear',640,440,{life:1});
}
function step(g,dt,input){g.time+=dt;g.transition=Math.max(0,g.transition-dt);g.roomBanner=Math.max(0,g.roomBanner-dt);const p=g.player,r=current(g),s=stats(g);p.invuln=Math.max(0,p.invuln-dt);p.fireTimer-=dt;if(p.action){p.action.time+=dt;if(p.action.time>=p.action.duration)p.action=null;}
 const dx=clamp(Number(input.x)||0,-1,1),dy=clamp(Number(input.y)||0,-1,1),n=Math.max(1,Math.hypot(dx,dy)),old={x:p.x,y:p.y};moveBody(r,p,dx/n*s.speed*dt,dy/n*s.speed*dt);advanceButterGait(p.gait,dist(p,old),dx/n,dy/n,dt);
 const aim=input.aim;if(aim&&Number.isFinite(aim.x)&&Number.isFinite(aim.y)&&Math.hypot(aim.x,aim.y)>.01){const d=Math.hypot(aim.x,aim.y);p.aim={x:aim.x/d,y:aim.y/d};if(Math.abs(p.aim.x)>.1)p.facing=p.aim.x>0?-1:1;}else if(Math.abs(dx)>.01&&!p.action)p.facing=dx>0?-1:1;
 if(input.fire&&p.fireTimer<=0&&p.action?.type!=='high'){const gun=has(g,'yellow'),type=gun?'gun':'normal',duration=gun?.32:.46;p.fireTimer=s.interval;p.action={type,time:0,duration,facing:p.facing};const target=input.target&&Number.isFinite(input.target.x)&&Number.isFinite(input.target.y)?{...input.target}:null;g.queue.push({kind:'primary',gun,at:g.time+butterReleasePoint(type)*duration,aim:{...p.aim},target,facing:p.facing});}
 for(const q of g.queue)if(q.at<=g.time){release(g,q);q.done=true;}g.queue=g.queue.filter(q=>!q.done);
 enemies(g,dt);if(g.phase!=='playing')return;projectiles(g,dt);zones(g,dt);r.enemies=r.enemies.filter(live);clearRoom(g);
 r.pickups=r.pickups.filter(q=>{if(dist(p,q)>30||q.kind==='heart'&&p.hp>=s.maxHp)return true;if(q.kind==='coin')g.coins+=q.value;if(q.kind==='key')g.keys+=q.value;if(q.kind==='bomb')g.bombs+=q.value;if(q.kind==='heart')p.hp=Math.min(s.maxHp,p.hp+q.value);effect(g,'pickup',q.x,q.y,{life:.4});return false;});
 if(r.cleared&&g.transition<=0&&p.action?.type!=='high')for(const l of links(g)){const towards=dx*l.dx+dy*l.dy;if(towards>.3&&dist(p,l)<48){if(enterRoom(g,l.dir))break;g.transition=.4;}}
 for(const e of g.effects)e.age+=dt;g.effects=g.effects.filter(e=>e.age<e.life);for(const e of g.numbers)e.age+=dt;g.numbers=g.numbers.filter(e=>e.age<.7);
}
export function tick(g,dt,input={}){if(g.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;const total=Math.min(.1,dt),n=Math.ceil(total/(1/120));for(let i=0;i<n&&g.phase==='playing';i++)step(g,total/n,input);}
