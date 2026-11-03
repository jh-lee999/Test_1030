// v39 run build. Inventory counts are the source of truth; derived stats are
// rebuilt from base values so acquisitions cannot overwrite earlier upgrades.
import {ITEMS as LEGACY_ITEMS,createRunState} from './survivor-engine.js';

export const INSCRIPTIONS={
  hunter:{name:'명사수',color:'#efca83',two:'치명타 확률 +10%p',four:'치명타 피해 +50%p'},
  ricochet:{name:'탄성',color:'#a4d9e9',two:'추적탄 추가 도약 +1',four:'추가 탄환 +2발 (각 55% 피해)'},
  scholar:{name:'학구열',color:'#c0b2ed',two:'스킬 재사용 대기시간 -10%p',four:'저학년·고학년 +1, 스킬 피해 +25%p'},
  ember:{name:'불꽃놀이',color:'#efac8d',two:'적중 시 2초 화상 (초당 공격력 15%)',four:'처치 시 공격력 80% 폭발 (100px)'},
  guardian:{name:'포근함',color:'#b2d6ad',two:'방 입장 보호막 +18',four:'방어력 +25, 처치 시 체력 +2'},
  wind:{name:'질주',color:'#b4dcd0',two:'대시 재사용 대기시간 -20%',four:'대시 접촉 공격력 140% 피해'},
};
export const RARITIES={common:{name:'일반',color:'#d2d2ac',price:15},rare:{name:'희귀',color:'#9bd7e5',price:24},epic:{name:'영웅',color:'#d6b4ef',price:38}};
const tags={hot_candy:['wind','ember'],alarm_clock:['wind','scholar'],fresh_band:['ricochet','hunter'],propeller_hat:['ricochet','wind'],sweet_carrot:['hunter','ember'],mystery_sauce:['ember','scholar'],milk_carton:['guardian','scholar'],emergency_snack:['guardian','hunter'],speedy_shoes:['wind','hunter'],hall_pass:['wind','guardian'],lower_book:['scholar','ricochet'],lower_badge:['scholar','hunter'],upper_book:['scholar','ember'],upper_badge:['scholar','guardian']};
export const ITEMS=Object.fromEntries(Object.entries(LEGACY_ITEMS).map(([id,item])=>[id,{...item,rarity:id.includes('book')?'rare':'common',tags:tags[id],effects:{[item.stat]:item.value}}]));
Object.assign(ITEMS,{
  shiny_lens:{name:'반짝 조준경',icon:'attack',rarity:'rare',tags:['hunter','ricochet'],description:'치명타 확률 +8%p',effects:{critChance:.08}},
  lucky_bell:{name:'행운의 방울',icon:'attack',rarity:'rare',tags:['hunter','wind'],description:'치명타 피해 +30%p',effects:{critDamage:.3}},
  sharp_stone:{name:'뾰족한 짱돌',icon:'projectile',rarity:'rare',tags:['ricochet','hunter'],description:'평타 관통 +1명',effects:{pierce:1}},
  double_pouch:{name:'두 칸짜리 새총 주머니',icon:'projectile',rarity:'epic',tags:['ricochet','wind'],description:'추가 탄환 +2발 (각 55% 피해)',effects:{extraProjectiles:2}},
  fluffy_blanket:{name:'폭신한 낮잠 담요',icon:'heart',rarity:'common',tags:['guardian','scholar'],description:'방어력 +12',effects:{armor:12}},
  shield_pin:{name:'보호의 옷핀',icon:'heart',rarity:'rare',tags:['guardian','ricochet'],description:'방 입장 보호막 +16',effects:{shieldMax:16}},
  licorice:{name:'쫀득한 감초 사탕',icon:'snack',rarity:'epic',tags:['hunter','guardian'],description:'직접 적중 피해의 3% 흡혈',effects:{lifeSteal:.03}},
  snack_jar:{name:'주머니 간식통',icon:'snack',rarity:'rare',tags:['guardian','ember'],description:'처치 시 체력 +2',effects:{killHeal:2}},
  magic_ink:{name:'반짝 마법 잉크',icon:'book-high',rarity:'rare',tags:['scholar','ember'],description:'스킬 피해 +25%p',effects:{skillDamage:.25}},
  hourglass:{name:'수업 종료 모래시계',icon:'clock',rarity:'rare',tags:['scholar','wind'],description:'스킬 재사용 대기시간 -10%p',effects:{cooldownReduction:.1}},
  magnet_bag:{name:'자석 달린 가방',icon:'move',rarity:'common',tags:['guardian','ricochet'],description:'아이템 획득 반경 +40px',effects:{pickupRadius:40}},
  long_gloves:{name:'멀리 쏘는 장갑',icon:'projectile',rarity:'common',tags:['ricochet','scholar'],description:'탄환 지속시간 +25%p',effects:{projectileLife:.25}},
  firecracker:{name:'축제의 폭죽',icon:'attack',rarity:'rare',tags:['ember','hunter'],description:'적중 시 화상 +공격력 20%/초',effects:{burnPower:.2}},
  elastic_badge:{name:'말썽쟁이 탄성 배지',icon:'book-low',rarity:'epic',tags:['ricochet','scholar'],description:'저학년 발동 확률 +8%p, 추가 도약 +1',effects:{lowerChance:.08,chainBonus:1}},
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const clone=value=>JSON.parse(JSON.stringify(value));
export const LOWER_CHAIN_RANGE=480;
export function inscriptionCounts(inventory={}){
  const counts=Object.fromEntries(Object.keys(INSCRIPTIONS).map(id=>[id,0]));
  for(const [id,n]of Object.entries(inventory))for(const tag of ITEMS[id]?.tags||[])counts[tag]+=n;
  return counts;
}
export function rebuildStats(current){
  const base=createRunState('butter'),s={...base,...current,inventory:{...current.inventory}},counts=inscriptionCounts(s.inventory);
  Object.assign(s,{damage:base.damage,attackCooldown:base.attackCooldown,moveSpeed:base.moveSpeed,projectileSpeed:base.projectileSpeed,maxHp:base.maxHp,lowerGrade:1,upperGrade:1,critChance:.05,critDamage:1.5,armor:0,shieldMax:0,lifeSteal:0,killHeal:0,skillDamage:1,cooldownReduction:0,pierce:0,extraProjectiles:0,pickupRadius:45,projectileLife:1,burnPower:0,chainBonus:0,lowerChance:0,dashMultiplier:1,dashDamage:0,killExplosion:0});
  for(const [id,n]of Object.entries(s.inventory))for(const [key,value]of Object.entries(ITEMS[id]?.effects||{})){
    if(['damage','moveSpeed','projectileSpeed'].includes(key))s[key]*=(1+value)**n;
    else if(key==='attackSpeed')s.attackCooldown/=(1+value)**n;
    else s[key]+=value*n;
  }
  if(counts.hunter>=2)s.critChance+=.1;if(counts.hunter>=4)s.critDamage+=.5;
  if(counts.ricochet>=2)s.chainBonus++;if(counts.ricochet>=4)s.extraProjectiles+=2;
  if(counts.scholar>=2)s.cooldownReduction+=.1;if(counts.scholar>=4){s.lowerGrade++;s.upperGrade++;s.skillDamage+=.25;}
  if(counts.ember>=2)s.burnPower+=.15;if(counts.ember>=4)s.killExplosion=.8;
  if(counts.guardian>=2)s.shieldMax+=18;if(counts.guardian>=4){s.armor+=25;s.killHeal+=2;}
  if(counts.wind>=2)s.dashMultiplier=.8;if(counts.wind>=4)s.dashDamage=1.4;
  s.attackCooldown=Math.max(.08,s.attackCooldown);s.critChance=clamp(s.critChance,0,.8);s.cooldownReduction=clamp(s.cooldownReduction,0,.65);s.lifeSteal=clamp(s.lifeSteal,0,.15);s.armor=clamp(s.armor,0,200);s.pierce=Math.min(6,s.pierce);s.extraProjectiles=Math.min(6,s.extraProjectiles);
  s.damageReduction=s.armor/(100+s.armor);s.skillCooldown=13*(1-s.cooldownReduction);s.dashCooldown=.7*s.dashMultiplier;s.projectileLifetime=2.4*s.projectileLife;s.inscriptions=counts;
  s.hp=clamp(current.hp??s.maxHp,0,s.maxHp);s.itemsTaken=Object.values(s.inventory).reduce((sum,n)=>sum+n,0);return s;
}
export function createBuildState(){return rebuildStats(createRunState('butter'));}
export function applyBuildItem(current,id){
  if(!ITEMS[id])return clone(current);
  const inventory={...current.inventory,[id]:(current.inventory[id]||0)+1},next=rebuildStats({...current,inventory});
  next.hp=Math.min(next.maxHp,current.hp+Math.max(0,next.maxHp-current.maxHp));return next;
}
export function removeBuildItem(current,id){
  if(!ITEMS[id]||!(current.inventory[id]>0))return clone(current);
  const inventory={...current.inventory};if(--inventory[id]===0)delete inventory[id];
  // Removing a maximum-health item clamps health; it never heals the player.
  return rebuildStats({...current,inventory});
}
export function lowerPower(s){return{chance:Math.min(.85,.13+s.lowerGrade*.055+(s.lowerChance||0)),bounces:s.lowerGrade+(s.chainBonus||0),chainRange:LOWER_CHAIN_RANGE,homing:7+s.lowerGrade*.8,damage:s.damage*(1.15+s.lowerGrade*.1)*(s.skillDamage||1),extraProjectiles:s.lowerGrade>=5?2:s.lowerGrade>=3?1:0,pity:Math.max(3,7-Math.floor(s.lowerGrade/2))};}
export function upperPower(s){return{duration:4.5+s.upperGrade*.8,damage:s.damage*(2.5+s.upperGrade*.55)*(s.skillDamage||1),radius:40+s.upperGrade*4,count:s.upperGrade>=3?2:1};}

export function rollBuildItems(random,stats,depth=0,count=3,exclude=[]){
  const pool=Object.keys(ITEMS).filter(id=>!exclude.includes(id)),result=[];
  while(result.length<count&&pool.length){
    const weights=pool.map(id=>{const item=ITEMS[id],rarity={common:5,rare:2.5+depth*.15,epic:.7+depth*.18}[item.rarity],match=item.tags.some(t=>(stats.inscriptions?.[t]||0)>0)?1.4:1;return rarity*match;});
    let pick=random()*weights.reduce((a,b)=>a+b,0),index=weights.length-1;for(let i=0;i<weights.length;i++){pick-=weights[i];if(pick<0){index=i;break;}}result.push(pool.splice(index,1)[0]);
  }return result;
}
export function rewardChoices(random,stats,room,exclude=[]){
  if(room.type==='boss'){
    const pool=Object.keys(ITEMS).filter(id=>ITEMS[id].rarity==='epic'),result=[];
    while(result.length<3&&pool.length)result.push(pool.splice(Math.floor(random()*pool.length),1)[0]);return result;
  }
  const grade=random()<.5?'lower_book':'upper_book',guaranteed=room.type==='elite'?['lower_book','upper_book']:[grade];
  return [...guaranteed,...rollBuildItems(random,stats,room.index,3-guaranteed.length,[...exclude,...guaranteed])];
}
export function statRows(s){const low=lowerPower(s),high=upperPower(s),f=n=>Number(n.toFixed(2)).toString(),pct=n=>`${f(n*100)}%`;return[
  ['damage','공격력',f(s.damage)],['attackSpeed','공격 속도',`${f(1/s.attackCooldown)}회/초`],['maxHp','최대 체력',f(s.maxHp)],['moveSpeed','이동 속도',`${f(s.moveSpeed*1.4)}px/s`],['projectileSpeed','탄환 속도',`${f(s.projectileSpeed*1.55)}px/s`],['range','탄환 지속',`${f(s.projectileLifetime)}초`],
  ['critChance','치명타 확률',pct(s.critChance)],['critDamage','치명타 피해',pct(s.critDamage)],['pierce','평타 추가 관통',`${s.pierce}명`],['projectiles','평타 탄환 수',`${1+s.extraProjectiles}발`],['skillDamage','스킬 피해',pct(s.skillDamage)],['skillCooldown','왕새총 쿨타임',`${f(s.skillCooldown)}초`],
  ['armor','방어 / 피해 감소',`${s.armor} / ${pct(s.damageReduction)}`],['shield','방 입장 보호막',f(s.shieldMax)],['lifeSteal','직접 피해 흡혈',pct(s.lifeSteal)],['killHeal','처치 시 회복',f(s.killHeal)],['pickup','획득 반경',`${f(s.pickupRadius)}px`],['dash','대시 쿨타임',`${f(s.dashCooldown)}초`],
  ['lower','저학년',`Lv.${s.lowerGrade}`],['lowerChance','추적탄 발동',pct(low.chance)],['chain','추가 도약',`${low.bounces}회`],['lowDamage','추적탄 피해',f(low.damage)],['upper','고학년',`Lv.${s.upperGrade}`],['highDamage','왕짱돌 피해',f(high.damage)],['highDuration','왕짱돌 지속',`${f(high.duration)}초`],['burn','화상 / 초',f(s.damage*s.burnPower)],
  ['lowCount','추적탄 수',`${1+s.extraProjectiles+low.extraProjectiles}발`],['highCount','왕짱돌 수',`${high.count}개`],['dashDamage','대시 접촉 피해',f(s.damage*s.dashDamage)],['explosion','처치 폭발 피해',f(s.damage*s.killExplosion)],['cooldownReduction','스킬 쿨감',pct(s.cooldownReduction)],
];}
export function itemChanges(s,id){
  const before=statRows(s),after=statRows(applyBuildItem(s,id)),rowForEffect={lowerGrade:'lower',upperGrade:'upper',shieldMax:'shield',extraProjectiles:'projectiles',projectileLife:'range',pickupRadius:'pickup',burnPower:'burn',lowerChance:'lowerChance',chainBonus:'chain'},primary=Object.keys(ITEMS[id]?.effects||{}).map(key=>rowForEffect[key]||key);
  return after.filter((r,i)=>r[2]!==before[i][2]).sort((a,b)=>Number(primary.includes(b[0]))-Number(primary.includes(a[0]))).map(r=>`${r[1]} ${before.find(b=>b[0]===r[0])[2]} → ${r[2]}`);
}
export function gradeSources(s,key){return ['기본 Lv.1',...Object.entries(s.inventory).filter(([id])=>ITEMS[id]?.effects[key]).map(([id,n])=>`${ITEMS[id].name} ×${n}`),...(s.inscriptions.scholar>=4?['학구열 4세트 +1']:[])].join(' + ');}
