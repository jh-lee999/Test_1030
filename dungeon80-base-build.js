import {HEROES,ITEMS} from './dungeon80-content.js';
export const PLAYER_HURT_RADIUS=14,PLAYER_BODY_RADIUS=16,HURT_LIFT=26;
export const hurtPoint=a=>({x:a.x,y:a.y-HURT_LIFT});
const has=(g,id)=>g.items.includes(id);
export const weaponIds=g=>['standard',...g.items.map(id=>ITEMS[id]?.weapon).filter(Boolean)].filter((id,i,a)=>a.indexOf(id)===i);
export function shotProfile(g,{charge=1}={}){
 const hero=HEROES[g.hero||'butter'],weapon=weaponIds(g).includes(g.weapon)?g.weapon:'standard',gun=has(g,'yellow'),base=hero.damage*(gun?1.5:1),melee=g.hero==='velvet'&&weapon==='standard';
 const shapes={standard:{damage:base,interval:gun?(g.hero==='velvet'?.44:.34):hero.interval,range:melee?112:720,speed:gun?850:600,count:1,spread:0,radius:7,shape:melee?'cleave':'pellet'},pistol:{damage:base,interval:g.hero==='velvet'?.44:.34,range:780,speed:850,count:1,spread:0,radius:6,shape:'pellet'},charge:{damage:base*(1.2+2.2*charge),interval:gun?.45:.55,range:650,speed:570,count:1,spread:0,radius:10+3*charge,shape:'pellet'},fan:{damage:base*.58,interval:gun?.44:.65,range:440,speed:600,count:3,spread:.24,radius:6,shape:'pellet'},prism:{damage:base*1.2,interval:gun?.48:.72,range:720,speed:0,count:1,spread:0,radius:5,shape:'beam'}};
 const b=shapes[weapon]||shapes.standard;
 return {...b,weapon,damage:Math.round(b.damage*100)/100,interval:b.interval*(has(g,'belt')?.85:1),range:b.range+(has(g,'scope')?160:0),pierce:(gun?1:0)+(has(g,'mace')?1:0)+(has(g,'prism')?1:0)+(weapon==='charge'&&charge>=.99?2:0),bounces:has(g,'mirror')?2:0,returning:has(g,'belt'),rangeReturn:has(g,'scope'),charge:weapon==='charge'?charge:0,gun:g.hero!=='velvet'&&gun,flags:{split:has(g,'lucky'),fire:has(g,'rust'),frost:has(g,'frost'),lightning:has(g,'weather'),impact:has(g,'mace'),charged:has(g,'charge'),primary:true}};
}
export function buildStats(g){
 const b=shotProfile(g),h=HEROES[g.hero||'butter'];
 const interval=b.interval+(b.weapon==='charge'?.7:0);
 return {damage:b.damage,interval,rate:1/interval,speed:h.speed,shotSpeed:b.speed,maxHp:(g.hpCap||h.hp)+(has(g,'ward')?10:0),pierce:b.pierce,range:b.range,luck:(has(g,'lucky')?1:0)+(has(g,'greed')?1:0),weapon:b.weapon,shape:b.shape,traits:shotTraits(g,b)};
}
export const WEAPON_NAMES={standard:'기본',pistol:'권총 / 파동',charge:'차지',fan:'부채꼴',prism:'프리즘'};
export function shotTraits(g,b=shotProfile(g)){
 const out=[];if(b.shape==='cleave')out.push('전방 베기');if(b.pierce)out.push('관통 '+b.pierce);if(b.bounces)out.push('도탄 '+b.bounces);if(b.returning||b.rangeReturn)out.push('귀환');
 for(const [key,label]of Object.entries({split:'분열',fire:'불씨',frost:'빙결',lightning:'번개',impact:'충격'}))if(b.flags[key])out.push(label);
 if(g.items.includes('scythe'))out.push('추적');return out;
}
export function inheritedChild(plan,scale=.5){return {...plan,damage:plan.damage*scale,speed:plan.speed||600,shape:'pellet',radius:5,count:1,charge:0,flags:{...plan.flags,split:false},child:true};}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
