import {random} from './dungeon74-world.js';
import {ITEMS} from './dungeon76-content.js';
import {buildStats} from './dungeon76-build.js';
function weighted(rng,pool,weight){let sum=pool.reduce((n,id)=>n+weight(id),0),pick=random(rng)*sum;for(const id of pool){pick-=weight(id);if(pick<=0)return id;}return pool.at(-1);}
export function artifactOffers(g,n=1,{rare=false}={}){
 const luck=buildStats(g).luck,pool=Object.keys(ITEMS).filter(id=>!g.items.includes(id)&&(!ITEMS[id].unlock||g.unlocks.includes(ITEMS[id].unlock))),out=[];
 while(pool.length&&out.length<n){const id=weighted(g.loot,pool,id=>(ITEMS[id].rarity===2?(rare?2.2:.48)*(1+luck*.15):1));out.push(id);pool.splice(pool.indexOf(id),1);}
 return out;
}
export function clearReward(g,r,flawless){
 const luck=buildStats(g).luck,threat=r.encounter?.threat||8,boss=r.type==='boss',coins=(boss?6:1+Math.min(1,Math.floor(threat/5)))+(flawless?1:0)+(flawless&&g.items.includes('greed')?1:0)+(g.route==='wild'?1:0),low=g.player.hp<buildStats(g).maxHp*.4;
 let kind=boss?'heart':weighted(g.rewardRng,['key','bomb','heart','shield','none'],id=>({key:22,bomb:24,heart:low?35:17,shield:10+luck*2,none:Math.max(12,27-luck*3)})[id]);
 if(!boss&&g.supplyDry>=3&&(g.keys===0||g.bombs===0))kind=g.keys===0?'key':'bomb';
 if(['key','bomb'].includes(kind))g.supplyDry=0;else if(!boss)g.supplyDry++;
 return {coins,kind,value:kind==='heart'?14:kind==='shield'?10:1,flawless,threat};
}
export function eventQuote(g,kind){
 const r=g.rooms[g.room],s=buildStats(g),ready=r.event&&!r.event.used,coins=3;
 if(kind==='heal')return {kind,ok:!!ready&&r.type==='sanctuary'&&g.coins>=coins&&g.player.hp<s.maxHp,cost:'3 닢',label:'체력 24 회복',amount:Math.min(24,s.maxHp-g.player.hp)};
 if(kind==='shield')return {kind,ok:!!ready&&r.type==='sanctuary'&&g.coins>=coins&&g.shield<20,cost:'3 닢',label:'보호막 14',amount:Math.min(14,20-g.shield)};
 if(kind==='trade'){const id=r.event?.reward;return {kind,ok:!!ready&&r.type==='bargain'&&g.hpCap-10>=40&&!!id&&!g.items.includes(id),cost:'이번 판 최대 체력 −10',label:id?ITEMS[id].name:'이미 모든 선물을 모았어요',item:id};}
 if(kind==='rush')return {kind,ok:!!ready&&r.type==='rush'&&r.rush?.state==='ready',cost:'45초 도전',label:'시간 안에 정리하면 추가 유물',amount:45};
 return {kind,ok:false,cost:'',label:''};
}
