import {MOVES,RELICS,FUSIONS,MAPS,LOADOUTS,STUDIES,unlockedMaps,unlockedLoadouts} from './survivor69-content.js';
import {eligibleUpgrades,stats} from './survivor69-engine.js';
import {generateWorld} from './survivor69-world.js';
export const SAVE_KEY='butter.survivor69.v1';
const finite=(o,keys)=>o&&keys.every(k=>Number.isFinite(o[k]));
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const ids=(xs,table,max)=>Array.isArray(xs)&&xs.length<=max&&new Set(xs).size===xs.length&&xs.every(id=>Object.hasOwn(table,id));
const safeText=s=>typeof s==='string'&&s.length<=500&&!/[<>]/.test(s);
export function freshProfile(){return {version:1,shards:0,studies:{vitality:0,stride:0,pocket:0,insight:0},totalSeals:0,discovered:[],wins:0,bestTier:-1,redeemed:[],records:[]};}
export function validProfile(p){
 return Boolean(p&&p.version===1&&integer(p.shards,0,1000000)&&integer(p.totalSeals,0,1000000)&&integer(p.wins,0,1000000)&&integer(p.bestTier,-1,2)&&p.studies&&Object.entries(STUDIES).every(([id,d])=>integer(p.studies[id],0,d.cap))&&ids(p.discovered,FUSIONS,5)&&Array.isArray(p.redeemed)&&p.redeemed.length<=128&&new Set(p.redeemed).size===p.redeemed.length&&p.redeemed.every(s=>safeText(s)&&s.length<=100)&&Array.isArray(p.records)&&p.records.length<=10&&p.records.every(r=>safeText(r.id)&&safeText(r.seed)&&Object.hasOwn(MAPS,r.map)&&integer(r.tier,0,2)&&['dead','won','abandoned'].includes(r.phase)&&finite(r,['time','level','kills','seals','shards','damageTaken'])&&ids(r.fusions,FUSIONS,2)&&Array.isArray(r.samples)&&r.samples.length<=30));
}
export function validRun(g){try{
 if(!g||g.version!==69||!safeText(g.seed)||g.seed.length>48||!safeText(g.runId)||!g.runId||g.runId.length>100||!Object.hasOwn(MAPS,g.map)||!Object.hasOwn(LOADOUTS,g.loadout)||!integer(g.tier,0,2)||!['playing','paused','upgrade'].includes(g.phase))return false;
 if(!finite(g,['time','xp','damageDealt','spawnRng','lootRng','spawnTimer','eliteAt','burstAt','pillowHeat'])||g.time<0||g.time>7200||g.xp<0||g.damageDealt<0||!['level','pendingLevels','pendingRewards','rerolls','seals','cores','bonusShards','kills','id'].every(k=>integer(g[k],0,100000))||g.level<1||g.level>60||g.pendingLevels>59||g.pendingRewards>8||g.seals>2||g.rerolls>3)return false;
 if(!['draft','championSpawned','finalSpawned','earlySummon','won'].every(k=>typeof g[k]==='boolean')||g.won||!safeText(g.notice))return false;
 if(!finite(g.meta,['hp','speed','magnet','rerolls'])||![0,5,10,15].includes(g.meta.hp)||g.meta.speed<1||g.meta.speed>1.061||![0,8,16,24].includes(g.meta.magnet)||!integer(g.meta.rerolls,0,2))return false;
 const p=g.player;if(!finite(p,['x','y','hp','invuln','ultCooldown'])||p.x<60||p.x>2540||p.y<60||p.y>1940||p.hp<=0||p.hp>stats(g).maxHp||p.invuln<0||p.ultCooldown<0||![-1,1].includes(p.facing)||!finite(p.gait,['phase','amount','clock']))return false;
 if(p.action&&(!['normal','high'].includes(p.action.type)||!finite(p.action,['time','duration'])||p.action.time<0||p.action.time>p.action.duration||p.action.duration<=0||p.action.duration>2||![-1,1].includes(p.action.facing)))return false;
 if(!g.moves?.stone||Object.keys(g.moves).length>4||Object.entries(g.moves).some(([id,m])=>!Object.hasOwn(MOVES,id)||!integer(m.level,1,3)||!Number.isFinite(m.timer)||typeof m.awake!=='boolean'))return false;
 if(g.goal!==null&&!Object.hasOwn(FUSIONS,g.goal))return false;
 if(!ids(g.relics,RELICS,6)||!ids(g.fusions,FUSIONS,2)||g.fusions.some(id=>!FUSIONS[id].parts.every(k=>g.moves[k]?.level===3)))return false;
 for(const [key,max]of [['enemies',150],['bullets',120],['shots',80],['gems',350],['effects',140],['numbers',70],['queue',20],['offers',3],['zones',48]])if(!Array.isArray(g[key])||g[key].length>max)return false;
 if(g.enemies.some(e=>!['fan','rusher','archer','caster','ghost'].includes(e.role)||!finite(e,['id','x','y','hp','maxHp','speed','damage','xp','radius','timer','animation','vx','vy','stun','flash','slowUntil','chargedUntil','burnUntil','bowlingUntil','attackCount','expires'])||!integer(e.id,1,g.id)||e.hp<=0||e.hp>e.maxHp||e.dead!==false||!['move','windup','charge','recover'].includes(e.state)||!['elite','final','boss','treasure'].every(k=>typeof e[k]==='boolean')||!Array.isArray(e.bowlingHits)||e.bowlingHits.length>150||['windup','charge'].includes(e.state)&&!finite(e,['aimX','aimY'])))return false;
 if(new Set(g.enemies.map(e=>e.id)).size!==g.enemies.length)return false;
 if(g.bullets.some(b=>!['stone','chain','bomb','boulder'].includes(b.kind)||!finite(b,['id','x','y','vx','vy','age','life','damage','radius','lock'])||!b.hits||Array.isArray(b.hits)||typeof b.hits!=='object'||Object.values(b.hits).some(v=>!Number.isFinite(v))||typeof b.child!=='boolean'||b.kind==='chain'&&!finite(b,['speed','range','bounces','target'])||b.kind==='bomb'&&!finite(b,['tx','ty'])||b.returning&&(!['out','back'].includes(b.mode)||!Number.isFinite(b.turnAt))||b.lastPoint&&!finite(b.lastPoint,['x','y'])))return false;
 if(g.shots.some(b=>!finite(b,['x','y','vx','vy','life','damage','radius'])||typeof b.parried!=='boolean')||g.gems.some(b=>!finite(b,['id','x','y','value'])||b.value<=0))return false;
 if(g.effects.some(e=>!finite(e,['x','y','age','life']))||g.numbers.some(n=>!finite(n,['x','y','age','value'])))return false;
 if(g.queue.some(q=>!['stone','ultimate'].includes(q.kind)||!Number.isFinite(q.at)||![-1,1].includes(q.facing)||q.kind==='stone'&&(!Number.isFinite(q.duration)||q.duration<=0)))return false;
 if(g.zones.some(z=>!['fire','cloud','web','ice','mine','vortex','decoy','danger','warning'].includes(z.kind)||!finite(z,['id','x','y','age','timer','life','radius','damage'])||z.kind==='web'&&!finite(z,['x2','y2'])))return false;
 if(!g.pillowHits||typeof g.pillowHits!=='object'||Object.values(g.pillowHits).some(v=>!Number.isFinite(v))||!Array.isArray(g.events)||g.events.length>100||g.events.some(v=>!safeText(v)))return false;
 if(!finite(g.relicState,['distance','pickups','still','frostAt','parries'])||!finite(g.telemetry,['damageTaken','nextSample','distance'])||g.telemetry.damageTaken<0||!safeText(g.telemetry.lastHit)||g.telemetry.firstLevelAt!==null&&!Number.isFinite(g.telemetry.firstLevelAt)||!Array.isArray(g.telemetry.samples)||g.telemetry.samples.length>30||!g.telemetry.damageBy||!g.telemetry.procs||Object.values(g.telemetry.damageBy).some(v=>!Number.isFinite(v)||v<0)||Object.values(g.telemetry.procs).some(v=>!Number.isFinite(v)||v<0))return false;
 if(g.phase==='paused'&&!['playing','upgrade'].includes(g.returnPhase))return false;
 const up=g.phase==='upgrade'||g.phase==='paused'&&g.returnPhase==='upgrade',eligible=new Set(eligibleUpgrades(g).map(o=>o.id));
 if(up&&(!g.offers.length||g.pendingLevels+g.pendingRewards<1)||!up&&(g.offers.length||g.pendingLevels||g.pendingRewards)||new Set(g.offers.map(o=>o.id)).size!==g.offers.length||g.offers.some(o=>!eligible.has(o.id)||!['name','icon','text','tag'].every(k=>safeText(o[k]))))return false;
 const w=g.world,expected=generateWorld(g.seed,g.map);if(w?.version!==69||w.map!==g.map||JSON.stringify(w.obstacles)!==JSON.stringify(expected.obstacles)||JSON.stringify(w.hazards)!==JSON.stringify(expected.hazards)||!Array.isArray(w.points)||w.points.length!==6)return false;
 if(w.points.some((q,i)=>q.id!==expected.points[i].id||q.type!==expected.points[i].type||q.x!==expected.points[i].x||q.y!==expected.points[i].y||q.radius!==expected.points[i].radius||!['ready','active','done'].includes(q.state)||!Number.isFinite(q.progress)||q.progress<0||q.progress>18))return false;
 if(g.seals!==w.points.filter(q=>q.type==='rift'&&q.state==='done').length)return false;return true;
}catch{return false;}}
export function rewardFor(g){return (g.time>=15?1:0)+Math.min(8,Math.floor(g.time/45))+Math.min(4,Math.floor(g.kills/25))+g.seals*3+g.bonusShards+g.fusions.length*2+(g.phase==='won'?8+(g.earlySummon?3:0):0);}
export function settle(profile,g,abandoned=false){
 if(!validProfile(profile)||!g||!['dead','won'].includes(g.phase)&&!abandoned||profile.redeemed.includes(g.runId))return {profile,amount:0,applied:false};
 const p=structuredClone(profile),amount=rewardFor(g),oldMaps=unlockedMaps(p),oldLoadouts=unlockedLoadouts(p);p.redeemed.push(g.runId);p.redeemed=p.redeemed.slice(-128);p.shards+=amount;p.totalSeals+=g.seals;
 for(const id of g.fusions)if(!p.discovered.includes(id))p.discovered.push(id);if(g.phase==='won'){p.wins++;p.bestTier=Math.max(p.bestTier,g.tier);}
 p.records.unshift({id:g.runId,seed:g.seed,map:g.map,tier:g.tier,phase:abandoned?'abandoned':g.phase,time:g.time,level:g.level,kills:g.kills,seals:g.seals,shards:amount,fusions:[...g.fusions],damageTaken:g.telemetry.damageTaken,damageBy:structuredClone(g.telemetry.damageBy),procs:structuredClone(g.telemetry.procs),samples:structuredClone(g.telemetry.samples),cause:g.telemetry.lastHit});p.records=p.records.slice(0,10);
 return {profile:p,amount,applied:true,unlocks:[...unlockedMaps(p).filter(id=>!oldMaps.includes(id)).map(id=>MAPS[id].name),...unlockedLoadouts(p).filter(id=>!oldLoadouts.includes(id)).map(id=>LOADOUTS[id].name)]};
}
export function buyStudy(profile,id){const d=STUDIES[id];if(!validProfile(profile)||!d||profile.studies[id]>=d.cap||profile.shards<d.costs[profile.studies[id]])return null;const p=structuredClone(profile);p.shards-=d.costs[p.studies[id]];p.studies[id]++;return p;}
export function loadStore(storage){try{const raw=storage?.getItem(SAVE_KEY);if(!raw||raw.length>800000)return {profile:freshProfile(),active:null};const data=JSON.parse(raw);if(data.version!==1||!validProfile(data.profile))return {profile:freshProfile(),active:null};return {profile:data.profile,active:validRun(data.active)&&!data.profile.redeemed.includes(data.active.runId)?data.active:null};}catch{return {profile:freshProfile(),active:null};}}
export function saveStore(storage,profile,g=null){try{if(!validProfile(profile)||g&&!validRun(g))return false;storage.setItem(SAVE_KEY,JSON.stringify({version:1,profile,active:g}));return true;}catch{return false;}}
