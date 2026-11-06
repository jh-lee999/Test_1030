import {load as oldLoad} from './dungeon76-save.js';
import {generateFloor,makeObstacles,makeTerrain,makeBiome,FLOOR} from './dungeon76-world.js';
import {ITEMS,AUGMENTS,HEROES,UNLOCKS} from './dungeon77-content.js';
import {weaponIds,buildStats} from './dungeon77-build.js';
import {emptyProgress,mergeProgress} from './dungeon76-progress.js';
export const SAVE_KEY='butter.dungeon77.v1';
const finite=(v,keys)=>v&&keys.every(k=>Number.isFinite(v[k]));
const unique=(xs,allowed,max=100)=>Array.isArray(xs)&&xs.length<=max&&new Set(xs).size===xs.length&&xs.every(x=>allowed.includes(x));
const itemIds=xs=>unique(xs,Object.keys(ITEMS),42),augIds=xs=>unique(xs,Object.keys(AUGMENTS),2);
const validPlan=p=>!!(finite(p,['damage','interval','range','speed','count','radius','pierce','bounces'])&&p.damage>=0&&p.interval>0&&p.range>0&&p.speed>=0&&['pellet','beam','cleave'].includes(p.shape)&&p.flags&&Object.values(p.flags).every(v=>typeof v==='boolean'));
export const freshProfile=()=>({version:2,wins:0,discovered:[],discoveredAugments:[],records:[],settled:[],progress:emptyProgress()});
export function validProgress(p){return !!(p&&['bestClears','bestKills','bestFloor'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0)&&p.bestFloor<=3&&unique(p.bosses,['velvet','erpin','shady'],3)&&['trial','secret','bargain'].every(k=>typeof p[k]==='boolean'));}
export function validProfile(p){return !!(p?.version===2&&Number.isSafeInteger(p.wins)&&p.wins>=0&&itemIds(p.discovered)&&unique(p.discoveredAugments,Object.keys(AUGMENTS),4)&&validProgress(p.progress)&&Array.isArray(p.records)&&p.records.length<=20&&p.records.every(r=>typeof r.id==='string'&&typeof r.seed==='string'&&['won','dead'].includes(r.phase)&&finite(r,['time','kills','clears','damageTaken'])&&itemIds(r.items))&&Array.isArray(p.settled)&&p.settled.length<=128&&p.settled.every(id=>typeof id==='string'));}
function numbersFinite(o,depth=0){if(depth>25)return false;if(typeof o==='number')return Number.isFinite(o)&&Math.abs(o)<1e12;if(o===null||typeof o!=='object')return typeof o!=='function';return Object.values(o).every(v=>numbersFinite(v,depth+1));}
export function validRun(g){try{
 if(g?.version!==77||!numbersFinite(g)||typeof g.seed!=='string'||g.seed.length>48||typeof g.runId!=='string'||g.runId.length>150||!Number.isInteger(g.floorIndex)||g.floorIndex<0||g.floorIndex>2||!['playing','paused','augment','trial','event'].includes(g.phase)||!HEROES[g.hero]||!['normal','wild'].includes(g.route)||!itemIds(g.items)||!augIds(g.augments)||!weaponIds(g).includes(g.weapon))return false;
 if(!finite(g,['time','id','coins','keys','bombs','battery','shots','hits','kills','clears','damageTaken','hpCap','shield','audioSerial','supplyDry','nextTellAt','salvageCount','repulseAt','doorIntent'])||g.time<0||g.time>7200||g.hpCap<40||g.hpCap>HEROES[g.hero].hp||g.shield<0||g.shield>20||g.battery<0||g.battery>3||[g.coins,g.keys,g.bombs].some(x=>!Number.isSafeInteger(x)||x<0||x>10000)||!unique(g.unlocks,Object.keys(UNLOCKS),20))return false;
 if(!validProgress(g.achievements)||!finite(g.loot,['rng'])||!finite(g.rewardRng,['rng'])||!Array.isArray(g.history)||g.history.length!==g.floorIndex)return false;
 const expected=generateFloor(g.seed,g.floorIndex,g.route);
 if(!Array.isArray(g.rooms)||g.rooms.length!==expected.length||!Number.isInteger(g.room)||!g.rooms[g.room])return false;
 for(const r of g.rooms){
  const model=expected[r.id];if(!model||['id','x','y','type','level','route','layoutKey'].some(k=>r[k]!==model[k])||!['visited','cleared','unlocked','rewarded','initialized'].every(k=>typeof r[k]==='boolean'))return false;
  const geometry=r.initialized?makeObstacles(g.seed,r):[],terrain=r.initialized?makeTerrain(g.seed,r):[];
  if(!Array.isArray(r.obstacles)||r.obstacles.length!==geometry.length||r.obstacles.some((o,i)=>['x','y','w','h','kind'].some(k=>o[k]!==geometry[i][k])||![-1,0,1].includes(o.hp)||o.kind==='gap'&&o.hp!==-1)||JSON.stringify(r.terrain)!==JSON.stringify(terrain))return false;
  const biome=r.initialized?makeBiome(g.seed,r):null;if(!!r.biome!==!!biome||biome&&(r.biome.kind!==biome.kind||JSON.stringify(r.biome.points)!==JSON.stringify(biome.points)||!finite(r.biome,['clock','cycle'])))return false;
  if(!Array.isArray(r.enemies)||r.enemies.length>10||r.enemies.some(e=>!['fan','archer','rusher','caster','guard','velvet','erpin','shady'].includes(e.role)||!finite(e,['id','x','y','hp','maxHp','radius','speed','damage','age','timer','appear'])||e.hp<=0||e.hp>e.maxHp||!['move','tell','attack','dash','recover'].includes(e.state)))return false;
  if(!Array.isArray(r.pickups)||r.pickups.length>100||r.pickups.some(p=>!finite(p,['id','x','y','value'])||!['coin','key','bomb','heart','shield'].includes(p.kind)))return false;
  if(!Array.isArray(r.stock)||r.stock.length>5||r.stock.some(s=>!ITEMS[s.id]&&!['heal','key'].includes(s.id)||!finite(s,['x','y','price'])||s.price<0||typeof s.sold!=='boolean'))return false;
  if(r.pedestal&&(!finite(r.pedestal,['x','y'])||r.pedestal.item!==null&&!ITEMS[r.pedestal.item]||typeof r.pedestal.taken!=='boolean'))return false;
  if(!r.challenge||!['ready','active','done'].includes(r.challenge.state)||!Number.isInteger(r.challenge.wave)||r.challenge.wave<0||r.challenge.wave>2||!finite(r.challenge,['damageStart']))return false;
  if(r.event&&(typeof r.event.used!=='boolean'||r.event.reward!==null&&!ITEMS[r.event.reward]))return false;
  if(r.rush&&(!['ready','active','failed','done'].includes(r.rush.state)||!finite(r.rush,['deadline'])))return false;
 }
 const p=g.player;if(!finite(p,['x','y','hp','facing','invuln','fireTimer','charge'])||p.hp<=0||p.hp>buildStats(g).maxHp||p.charge<0||p.charge>.7||![-1,1].includes(p.facing)||p.x<FLOOR.left||p.x>FLOOR.right||p.y<FLOOR.top||p.y>FLOOR.bottom||!finite(p.aim,['x','y'])||!finite(p.gait,['phase','amount','clock']))return false;
 if(p.action&&(!['normal','gun','high'].includes(p.action.type)||!finite(p.action,['time','duration','facing'])||p.action.duration<=0))return false;
 for(const [key,max,fields]of [['bullets',100,['id','x','y','vx','vy','age','life','radius','damage']],['hostile',90,['x','y','vx','vy','life','radius','damage']],['zones',80,['x','y','age','life','radius']],['effects',90,['x','y','age','life']],['numbers',50,['x','y','value','age']],['queue',10,['at']]])if(!Array.isArray(g[key])||g[key].length>max||g[key].some(v=>!finite(v,fields)))return false;
 if(g.bullets.some(b=>!['beam','charged','stone','gun','chain','boulder'].includes(b.kind)||!b.hits||Array.isArray(b.hits)||b.kind==='beam'&&(!b.plan||!Array.isArray(b.segments)||b.segments.length>10))||g.queue.some(q=>!['primary','high','highStart','echo'].includes(q.kind)||q.kind!=='highStart'&&!finite(q.aim,['x','y'])||q.kind==='echo'&&(!finite(q,['x','y'])||!finite(q.plan,['damage','speed','range','radius','count'])||!q.plan.child)))return false;
 const phase=g.phase==='paused'?g.returnPhase:g.phase;if(!['playing','augment','trial','event'].includes(phase))return false;
 if(g.queue.some(q=>['primary','echo'].includes(q.kind)&&!validPlan(q.plan))||g.bullets.some(b=>b.plan&&!validPlan(b.plan))||g.zones.some(z=>z.kind==='bomb'&&(!finite(z,['damage'])||z.damage<=0)))return false;
 const r=g.rooms[g.room];if(phase==='augment'){if(!unique(g.choice,Object.keys(AUGMENTS),3)||g.choice.length!==3||g.choice.some(id=>g.augments.includes(id))||r.type!=='boss'||!r.cleared||r.augment?.taken||JSON.stringify(g.choice)!==JSON.stringify(r.augment?.offers))return false;}else if(g.choice!==null)return false;
 for(const room of g.rooms)if(room.augment&&(room.type!=='boss'||g.floorIndex>=2||!room.cleared||!unique(room.augment.offers,Object.keys(AUGMENTS),3)||room.augment.offers.length!==3||typeof room.augment.taken!=='boolean'||!room.augment.taken&&(phase!=='augment'||room.id!==g.room)))return false;
 if(phase==='trial'&&(r.type!=='challenge'||r.challenge.state!=='ready'||g.trial!==r.id)||phase!=='trial'&&g.trial!==null)return false;
 if(phase==='event'&&(!r.event||r.event.used||!['sanctuary','bargain','rush'].includes(r.type)))return false;
 return typeof g.notice==='string'&&g.notice.length<=500&&Array.isArray(g.audioEvents)&&g.audioEvents.length<=24;
 }catch{return false;}}
export function capture(profile,g){return {...profile,progress:mergeProgress(profile.progress,g),discovered:[...new Set([...profile.discovered,...g.items])],discoveredAugments:[...new Set([...profile.discoveredAugments,...g.augments])]};}
export function settle(profile,g){
 if(!['won','dead'].includes(g.phase)||profile.settled.includes(g.runId))return profile;
 const p=capture(structuredClone(profile),g);p.settled=[...p.settled,g.runId].slice(-128);if(g.phase==='won')p.wins++;
 p.records.unshift({id:g.runId,seed:g.seed,phase:g.phase,time:g.time,kills:g.kills,clears:g.clears,damageTaken:g.damageTaken,items:[...g.items],augments:[...g.augments],floors:g.floorIndex+1,hero:g.hero,route:g.route});p.records=p.records.slice(0,20);return p;
}
export function load(storage){try{
 const raw=storage?.getItem(SAVE_KEY);if(!raw){const old=oldLoad(storage);return {profile:structuredClone(old.profile),active:null,legacyActive:!!old.active,warning:old.warning};}
 if(raw.length>900000)throw Error('too large');const d=JSON.parse(raw);if(d.version!==1||!validProfile(d.profile))throw Error('bad profile');const active=validRun(d.active)&&!d.profile.settled.includes(d.active.runId)?d.active:null;return {profile:d.profile,active,warning:d.active&&!active?'진행 중인 저장을 읽지 못했어요. 발견·해금 기록은 유지했어요.':''};
 }catch{return {profile:freshProfile(),active:null,warning:'저장소를 읽지 못했어요. 이 탭에서는 플레이할 수 있지만 이어하기는 보장되지 않아요.'};}}
export function save(storage,profile,active){try{if(!validProfile(profile)||active&&!validRun(active))return false;storage?.setItem(SAVE_KEY,JSON.stringify({version:1,profile,active}));return !!storage;}catch{return false;}}
