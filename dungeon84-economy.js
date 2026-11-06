import {random} from './dungeon84-world.js';
import {ITEMS,RARITIES,ACTIVES} from './dungeon84-content.js';
import {buildStats} from './dungeon84-build.js';
import {FAMILIES,isMechanic} from './dungeon84-content.js';
export const MIX={treasure:{stats:.2,shot:.29,weapon:.16,familiar:.08,defense:.1,utility:.08,risk:.04,active:.05},boss:{stats:.28,shot:.22,weapon:.15,familiar:.06,defense:.12,utility:.1,risk:.02,active:.05},shop:{stats:.3,shot:.15,defense:.16,utility:.22,risk:.02,active:.15}};
// Every cached, unpaid offer reserves its ID too. Entering the shop first must
// not create a duplicate of a pedestal/forge/deal that was already revealed.
export function reservedItems(g,except=null){const out=[];for(const r of g.rooms){for(const q of [r.pedestal,...(r.artifacts||[])])if(q&&q!==except&&!q.taken&&q.item)out.push(q.item);for(const q of r.stock||[])if(q!==except&&!q.sold&&ITEMS[q.id])out.push(q.id);for(const q of [r.forge,r.deal])if(q&&q!==except&&!q.used&&q.item)out.push(q.item);if(r.event&&r.event!==except&&!r.event.used&&r.event.reward)out.push(r.event.reward);}return [...new Set(out)];}
export function tierCap(g,source='treasure'){return Math.min(4,[2,3,4][g.floorIndex]+(buildStats(g).luck>=4?1:0)+(['angel','devil','secret'].includes(source)?1:0));}
export function eligibleItems(g,{source='treasure',exclude=[],safe=false}={}){
 return Object.keys(ITEMS).filter(id=>{const d=ITEMS[id];return !g.items.includes(id)&&!g.discarded?.includes(id)&&!exclude.includes(id)&&d.pools.includes(source)&&d.tier<=tierCap(g,source)&&(!d.unlock||g.unlocks.includes(d.unlock))&&(!safe||!d.troll)&&(!d.active||g.active?.id!==d.active&&g.clears>=2)&&!(id==='juniorBook'&&g.school.junior>=6)&&!(id==='seniorBook'&&g.school.senior>=4);});
}
function weighted(rng,xs,weight){let n=random(rng)*xs.reduce((a,id)=>a+Math.max(0,weight(id)),0);for(const id of xs){n-=Math.max(0,weight(id));if(n<=0)return id;}return xs.at(-1);}
export function rarityOdds(g,{source='treasure',exclude=[],safe=false}={}){const pool=eligibleItems(g,{source,exclude,safe}),luck=buildStats(g).luck,w=source==='boss'?[20,42,29,9]:source==='treasure'?[35,40,20,5]:RARITIES.map(r=>r.weight),v=w.map((n,i)=>pool.some(id=>ITEMS[id].rarity===i)?n*(1+luck*[0,.08,.18,.28][i]):0),sum=v.reduce((a,b)=>a+b,0);return v.map(n=>sum?n/sum:0);}
export function drawArtifact(g,source='treasure',exclude=[]){
 let pool=eligibleItems(g,{source,exclude});if(!pool.length)return null;
 const mix=MIX[source]||MIX.treasure,state=g.poolMix[source]||(g.poolMix[source]={counts:{},last:null,total:0,floors:{},streak:0});state.floors||={};const floor=state.floors[g.floorIndex]||(state.floors[g.floorIndex]={total:0,mechanics:0});
 // Present at least one real mechanic in a floor's first two treasure gifts.
 // This is an offer-history constraint, NOT owned luck or a free starter item.
 if(source==='treasure'&&floor.total===1&&floor.mechanics===0&&pool.some(isMechanic))pool=pool.filter(isMechanic);
 const cats=[...new Set(pool.map(id=>ITEMS[id].category))],families=new Set(g.items.flatMap(id=>FAMILIES[id]||[]));
 const cat=weighted(g.loot,cats,c=>{const p=mix[c]||.04,deficit=p*(state.total+1)-(state.counts[c]||0),repeat=state.last===c?(c==='stats'&&state.streak>=2?.08:['weapon','active','familiar','risk'].includes(c)?.15:1):1;return p*Math.max(.15,Math.min(3,1+2*deficit))*repeat;});
 const candidates=pool.filter(id=>ITEMS[id].category===cat),odds=rarityOdds(g,{source,exclude}),id=weighted(g.loot,candidates,id=>odds[ITEMS[id].rarity]/candidates.filter(p=>ITEMS[p].rarity===ITEMS[id].rarity).length*(ITEMS[id].troll?.65:1)*(FAMILIES[id]?.some(f=>families.has(f))?1.35:1));
 state.streak=state.last===cat?(state.streak||0)+1:1;state.last=cat;state.total++;state.counts[cat]=(state.counts[cat]||0)+1;floor.total++;if(isMechanic(id))floor.mechanics++;return id;
}
export function artifactOffers(g,n=1,{source='treasure'}={}){const reserved=reservedItems(g),out=[];while(out.length<n){const id=drawArtifact(g,source,[...reserved,...out]);if(!id)break;out.push(id);}return out;}
export const priceK=g=>[1,1.15,1.3][g.floorIndex];
export const itemPrice=(id,g)=>Math.ceil(RARITIES[ITEMS[id]?.rarity||0].price*(g?priceK(g):1));
export const shopPrice=(g,s)=>Math.max(1,Math.ceil(s.price*(g.items.includes('cursedCoupon')?.6:1)));
export const restockCost=g=>Math.ceil((3+g.rooms[g.room].restocks*2)*priceK(g));
export const serviceCost=g=>Math.ceil(3*priceK(g));
export function clearReward(g,r,flawless){const luck=buildStats(g).luck,boss=r.type==='boss',low=g.player.hp<buildStats(g).maxHp*.4;let kind=boss?'heart':weighted(g.rewardRng,['key','bomb','heart','shield','none'],id=>({key:22,bomb:24,heart:low?35:17,shield:10+luck*2,none:Math.max(12,25-luck*3)})[id]);if(!boss&&g.supplyDry>=3&&(g.keys===0||g.bombs===0))kind=g.keys===0?'key':'bomb';g.supplyDry=['key','bomb'].includes(kind)?0:g.supplyDry+1;return {coins:(boss?6:2)+(r.type==='combat'&&r.waves?.total>1?1:0)+(flawless?1:0)+(flawless&&g.items.includes('greed')?1:0)+(flawless&&g.regionPath.at(-1)==='echo'?1:0),kind,value:kind==='heart'?14:kind==='shield'?10:1,flawless};}
export function eventQuote(g,kind){const r=g.rooms[g.room],ready=r.event&&!r.event.used,cost=serviceCost(g),s=buildStats(g);if(['heal','shield'].includes(kind))return {kind,ok:!!ready&&r.type==='sanctuary'&&g.coins>=cost&&(kind==='heal'?g.player.hp<s.maxHp:g.shield<20),cost:cost+' 닢',label:kind==='heal'?'체력 24 회복':'보호막 14',amount:Math.min(kind==='heal'?24:14,kind==='heal'?s.maxHp-g.player.hp:20-g.shield)};if(kind==='trade')return {kind,ok:!!ready&&r.type==='bargain'&&g.hpCap>=50&&s.maxHp-buildStats({...g,hpCap:g.hpCap-10}).maxHp>=9.99&&!!r.event.reward&&!g.items.includes(r.event.reward),cost:'최대 체력 −10',label:ITEMS[r.event?.reward]?.name||'후보 없음',item:r.event?.reward};if(kind==='rush')return {kind,ok:!!ready&&r.type==='rush'&&r.rush?.state==='ready',cost:'45초',label:'성공하면 황금상자'};return {ok:false,label:'',cost:''};}
