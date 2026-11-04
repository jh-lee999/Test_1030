import {MOVES,PASSIVES,eligibleUpgrades,stats} from './survivor68-engine.js?v=68';
const KEY='butter.survivor68.v1';
export function validSave(g){try{
 if(g?.version!==68||typeof g.seed!=='string'||g.seed.length>48||!['playing','paused','upgrade'].includes(g.phase)||!Number.isFinite(g.time)||g.time<0||g.time>7200)return false;
 if(!g.player||!['x','y','hp','invuln','ultCooldown'].every(k=>Number.isFinite(g.player[k]))||g.player.hp<=0||g.player.hp>300||![-1,1].includes(g.player.facing))return false;
 if(!g.player.gait||!['phase','amount','clock'].every(k=>Number.isFinite(g.player.gait[k])))return false;
 if(g.phase==='paused'&&!['playing','upgrade'].includes(g.returnPhase)||g.player.x<0||g.player.x>2600||g.player.y<0||g.player.y>2000)return false;
 if(g.player.action&&(!['normal','high'].includes(g.player.action.type)||!Number.isFinite(g.player.action.time)||!Number.isFinite(g.player.action.duration)||![-1,1].includes(g.player.action.facing)))return false;
 if(!g.moves?.stone||Object.keys(g.moves).length>4||Object.entries(g.moves).some(([id,m])=>!Object.hasOwn(MOVES,id)||!Number.isInteger(m.level)||m.level<1||m.level>5||typeof m.awake!=='boolean'||!Number.isFinite(m.timer)))return false;
 if(!g.passives||Object.keys(PASSIVES).some(k=>!Number.isInteger(g.passives[k])||g.passives[k]<0||g.passives[k]>5))return false;
 for(const [key,max]of [['enemies',170],['bullets',100],['shots',80],['gems',350],['effects',140],['numbers',90],['queue',20],['offers',3]])if(!Array.isArray(g[key])||g[key].length>max)return false;
 if(g.enemies.some(e=>!['fan','rusher','archer','caster','ghost'].includes(e.role)||!['x','y','hp','maxHp','timer','animation','speed','damage','radius','stun','flash','vx','vy'].every(k=>Number.isFinite(e[k]))))return false;
 if(g.bullets.some(b=>!['stone','chain','bomb','boulder'].includes(b.kind)||!['x','y','life','damage','radius'].every(k=>Number.isFinite(b[k]))))return false;
 if(g.shots.some(b=>!['x','y','vx','vy','life','damage','radius'].every(k=>Number.isFinite(b[k])))||g.gems.some(b=>!['x','y','value'].every(k=>Number.isFinite(b[k]))))return false;
 if(g.effects.some(e=>!['x','y','age','life'].every(k=>Number.isFinite(e[k])))||g.numbers.some(e=>!['x','y','age','value'].every(k=>Number.isFinite(e[k])))||g.queue.some(q=>!['stone','ultimate'].includes(q.kind)||!Number.isFinite(q.at)||![-1,1].includes(q.facing)))return false;
 if(!Number.isInteger(g.level)||g.level<1||g.level>80||!Number.isInteger(g.pendingLevels)||g.pendingLevels<0||g.pendingLevels>79||!Number.isFinite(g.xp))return false;
 if(g.offers.some(o=>typeof o.id!=='string'||typeof o.name!=='string'||/[<>]/.test(o.name)||typeof o.text!=='string'||/[<>]/.test(o.text)||typeof o.tag!=='string'||/[<>]/.test(o.tag)))return false;
 if(!['spawnRng','lootRng','id','spawnTimer','eliteAt','kills','damageDealt','cores'].every(k=>Number.isFinite(g[k]))||!g.pillowHits||!Array.isArray(g.events))return false;
 if(g.player.hp>stats(g).maxHp||g.player.invuln<0||g.player.ultCooldown<0||g.player.action&&(g.player.action.duration<=0||g.player.action.duration>2||g.player.action.time<0||g.player.action.time>g.player.action.duration))return false;
 if(Object.values(g.moves).some(m=>m.awake&&m.level!==5))return false;
 if(!['level','pendingLevels','cores','kills','id'].every(k=>Number.isSafeInteger(g[k])&&g[k]>=0)||g.xp<0||g.damageDealt<0)return false;
 if(!['championSpawned','finalSpawned','won'].every(k=>typeof g[k]==='boolean')||typeof g.notice!=='string'||g.notice.length>500)return false;
 const ids=g.enemies.map(e=>e.id);if(new Set(ids).size!==ids.length||g.enemies.some(e=>!Number.isSafeInteger(e.id)||!['move','windup','charge','recover'].includes(e.state)||e.hp<=0||e.hp>e.maxHp||e.radius<=0||e.radius>100||typeof e.dead!=='boolean'||e.dead||typeof e.boss!=='boolean'||typeof e.final!=='boolean'||typeof e.elite!=='boolean'||['windup','charge'].includes(e.state)&&!['aimX','aimY'].every(k=>Number.isFinite(e[k]))))return false;
 if(g.bullets.some(b=>!Number.isSafeInteger(b.id)||!b.hits||typeof b.hits!=='object'||Array.isArray(b.hits)||Object.values(b.hits).some(n=>!Number.isFinite(n))||!Number.isFinite(b.lock)||(b.kind==='bomb'?!['tx','ty','age'].every(k=>Number.isFinite(b[k])):!['vx','vy'].every(k=>Number.isFinite(b[k])))))return false;
 if(g.bullets.some(b=>b.kind==='chain'&&(!['speed','range','bounces','target'].every(k=>Number.isFinite(b[k]))||b.bounces<1||b.bounces>20)))return false;
 if(Object.values(g.pillowHits).some(n=>!Number.isFinite(n))||g.events.length>100||g.events.some(e=>typeof e!=='string'))return false;
 const upgrading=g.phase==='upgrade'||g.phase==='paused'&&g.returnPhase==='upgrade',eligible=new Set(eligibleUpgrades(g).map(o=>o.id));
 if(upgrading&&(g.pendingLevels<1||!g.offers.length)||!upgrading&&(g.pendingLevels!==0||g.offers.length)||g.offers.some(o=>!eligible.has(o.id)||typeof o.icon!=='string')||new Set(g.offers.map(o=>o.id)).size!==g.offers.length)return false;
 if(g.queue.some(q=>q.kind==='stone'&&(!Number.isFinite(q.duration)||q.duration<=0)))return false;
 return true;
}catch{return false;}}
export function loadRun(storage){try{const raw=storage?.getItem(KEY);if(!raw||raw.length>500000)return null;const g=JSON.parse(raw);return validSave(g)?g:null;}catch{return null;}}
export function saveRun(storage,g){try{if(['won','dead'].includes(g.phase)){storage?.removeItem(KEY);return Boolean(storage);}if(!validSave(g))return false;storage.setItem(KEY,JSON.stringify(g));return true;}catch{return false;}}
