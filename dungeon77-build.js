import {HEROES,ITEMS,rarityCounts} from './dungeon77-content.js';
import {shotProfile as originalPlan} from './dungeon76-build.js';
import {butterReleasePoint} from './butter-gun-motion71.js';
export {PLAYER_HURT_RADIUS,PLAYER_BODY_RADIUS,HURT_LIFT,hurtPoint,weaponIds,inheritedChild,segmentDistance,WEAPON_NAMES} from './dungeon76-build.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function bonuses(g){
 const out={damageFlat:0,damage:0,rate:0,speed:0,hp:0,shotSpeed:0,range:0,luck:0,pierce:0,incoming:0,bombRadius:0,bombDamage:0,speedMultiplier:1,rangeMultiplier:1},grades=rarityCounts(g);
 for(const id of g.items)for(const [k,v]of Object.entries(ITEMS[id]?.stats||{}))if(k.endsWith('Multiplier'))out[k]*=v;else out[k]+=v;
 if(g.items.includes('rarityLens'))out.damage+=Math.min(.4,grades[1]*.04+grades[2]*.04+grades[3]*.04);
 if(g.items.includes('commonCrown'))out.rate+=Math.min(.3,grades[0]*.05);
 if(g.items.includes('royalSeal'))out.pierce+=Math.min(3,grades[3]);
 return {...out,grades,collection:grades.every(n=>n>0)&&g.items.includes('collectionBook')};
}
export function shotProfile(g,options={}){
 const p=originalPlan(g,options),b=bonuses(g),yellow=g.items.includes('yellow'),form=p.shape,sourceMin=g.hero==='velvet'?(.866666734/2.33333349)*.66:butterReleasePoint(p.gun?'gun':'normal')*(p.gun?.32:.46);
 // Speed upgrades may shorten recovery, never overwrite a source pose before release.
 const interval=Math.max(sourceMin+1/120,p.interval/(1+b.rate));
 return {...p,damage:Math.round((p.damage+b.damageFlat*(yellow?1.5:1)*(p.damage/(HEROES[g.hero||'butter'].damage*(yellow?1.5:1))))*(1+b.damage)*(g.items.includes('seekingStar')&&form!=='pellet'?1.1:1)*100)/100,
  interval,range:Math.round(Math.max(60,(p.range+b.range)*b.rangeMultiplier)),speed:p.speed?Math.round(p.speed*(1+b.shotSpeed)):0,pierce:Math.min(8,p.pierce+b.pierce),
  flags:{...p.flags,seeking:g.items.includes('seekingStar'),echo:g.items.includes('afterImage'),collection:b.collection}};
}
export function buildStats(g){
 const p=shotProfile(g),b=bonuses(g),hero=HEROES[g.hero||'butter'],interval=p.interval+(p.weapon==='charge'?.7:0);
 return {damage:p.damage,interval,rate:1/interval,speed:Math.round(clamp((hero.speed+b.speed)*b.speedMultiplier,130,360)),shotSpeed:p.speed,maxHp:clamp((g.hpCap||hero.hp)+(g.items.includes('ward')?10:0)+b.hp,24,160),pierce:p.pierce,range:p.range,luck:Math.min(12,(g.items.includes('lucky')?1:0)+(g.items.includes('greed')?1:0)+b.luck),weapon:p.weapon,shape:p.shape,traits:shotTraits(g,p),grades:b.grades,incoming:1+b.incoming,bombRadius:Math.round(125*(1+b.bombRadius)),bombDamage:Math.round(130*(1+b.bombDamage))};
}
export function shotTraits(g,p=shotProfile(g)){
 const out=[];if(p.shape==='cleave')out.push('전방 베기');if(p.pierce)out.push('관통 '+p.pierce);if(p.bounces)out.push('도탄 '+p.bounces);if(p.returning||p.rangeReturn)out.push('귀환');
 for(const [k,label]of Object.entries({split:'분열',fire:'불씨',frost:'빙결',lightning:'번개',impact:'충격',seeking:'완만한 추적',echo:'잔상',collection:'도감 완성'}))if(p.flags[k])out.push(label);
 if(g.items.includes('scythe'))out.push('추적 도탄');return out;
}
export function itemPreview(g,id){const before=buildStats(g),item=ITEMS[id];if(!item||g.items.includes(id))return {before,after:before};return {before,after:buildStats({...g,items:[...g.items,id],weapon:item.weapon||g.weapon})};}
