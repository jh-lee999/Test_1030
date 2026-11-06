import {availableArtifacts} from './dungeon80-loot.js';
import {ITEMS,RARITIES,rarityOf,rarityCounts} from './dungeon82-content.js';
import {itemPreview,bonuses,buildStats} from './dungeon82-build.js';
import {rarityOdds,shopPrice} from './dungeon80-economy.js';
import {unlocked} from './dungeon80-progress.js';
export const rarityBadge=id=>'<span class="rarity-badge r'+ITEMS[id].rarity+'">'+rarityOf(id).name+(ITEMS[id].troll?' · 트롤':'')+'</span>';
export function itemIconHTML(id,size=38){
 const d=ITEMS[id];let html;
 if(d.icon77!==undefined){const i=d.icon77;html='<span class="fan-icon item77-icon" style="width:'+size+'px;height:'+size+'px;background-position:'+(i%6/5*100)+'% '+(Math.floor(i/6)/3*100)+'%"></span>';}
 else if(d.icon76!==undefined||d.fan!==undefined){const i=d.icon76??d.fan;html='<span class="fan-icon '+(d.icon76!==undefined?'extras-icon':'')+'" style="width:'+size+'px;height:'+size+'px;background-position:'+(i%4/3*100)+'% '+(Math.floor(i/4)/2*100)+'%"></span>';}
 else html='<img src="./assets/trickcal-artifacts53/ArtifactIcon_'+d.source+'.png" width="'+size+'" height="'+size+'" alt="">';
 return '<span class="rarity-icon r'+d.rarity+'" aria-hidden="true">'+html+'</span>';
}
export function gradeUI(g){
 const grades=rarityCounts(g),b=bonuses(g);
 return '<div class="grade-counts">'+grades.map((n,i)=>'<span class="r'+i+'">'+RARITIES[i].name+' <b>'+n+'</b></span>').join('')+'</div><p class="grade-effects">'+(g.items.includes('rarityLens')?'감정경 공격력 +'+Math.round(Math.min(.4,grades.slice(1).reduce((a,b)=>a+b,0)*.04)*100)+'% · ':'')+(g.items.includes('commonCrown')?'왕관 공속 +'+Math.round(Math.min(.3,grades[0]*.05)*100)+'% · ':'')+(g.items.includes('royalSeal')?'초대장 관통 +'+Math.min(3,grades[3])+' · ':'')+(g.items.includes('collectionBook')?'도감 '+grades.filter(n=>n>0).length+'/4 '+(b.collection?'완성':'미완성'):'')+'</p>';
}
export function catalogUI(run,profile,inRun=true){
 const g=inRun?run:{...run,unlocks:unlocked(profile.progress)};
 const odds=rarityOdds(g);
 return '<div class="eyebrow">유물 '+Object.keys(ITEMS).length+'종 · 독립 팬게임 효과</div><h2>소풍 아이템 도감 · 출처별 풀</h2><p>일반 → 희귀 → 영웅 → 전설. 등급은 실제 추첨과 기본 가격에 적용돼요.<br>트롤템은 장점과 대가가 함께 있어요. 줍기 전 설명을 보고 지나칠 수 있어요.</p>'+RARITIES.map((r,i)=>'<details class="catalog-grade" '+(i===0?'open':'')+'><summary class="r'+i+'">'+r.name+' · '+Object.values(ITEMS).filter(d=>d.rarity===i).length+'종 · 기본 '+r.price+'닢</summary><div class="catalog-grid">'+Object.entries(ITEMS).filter(([,d])=>d.rarity===i).map(([id,d])=>'<article class="'+(d.troll?'troll-item':'')+'">'+itemIconHTML(id,42)+rarityBadge(id)+'<b>'+d.name+'</b><small>'+d.kind+(d.unlock&&!g.unlocks.includes(d.unlock)?' · 해금 필요':'')+(profile.discovered.includes(id)?' · 발견함':'')+'</small><p>'+d.text+'</p><small>티어 '+d.tier+' · '+d.pools.join(' / ')+'</small></article>').join('')+'</div></details>').join('')+'<p>현재 층·해금 조건의 황금방 등급 가중치: '+odds.map((p,i)=>RARITIES[i].name+' '+(p*100).toFixed(1)+'%').join(' / ')+'<br>황금방·계약·상점은 별도 가중치. 행운과 남은 아이템 풀에 따라 바뀌어요.</p><button data-close class="gold">돌아가기</button>';
}
export function itemPeek(g){
 const shop=shopPeek(g);if(shop)return shop;
 const r=g.rooms[g.room],paid=r.type==='devil'&&!r.deal?.used?r.deal:r.type==='forge'&&!r.forge?.used?r.forge:null;
 if(paid?.item&&Math.hypot(g.player.x-640,g.player.y-430)<160){const d=ITEMS[paid.item];return rarityBadge(paid.item)+' <b>'+d.name+'</b><span>'+d.text+'</span><small>'+(r.type==='devil'?'F로 최대 체력 '+paid.cost+' 지불.':'F로 마지막 보유 유물 '+(ITEMS[g.items.at(-1)]?.name||'없음')+'과 '+paid.cost+'닢 지불.')+' 지나가기만 하면 거래하지 않아요.</small>';}
 const q=availableArtifacts(g).filter(q=>q.item&&Math.hypot(g.player.x-q.x,g.player.y-q.y)<160).sort((a,b)=>Math.hypot(g.player.x-a.x,g.player.y-a.y)-Math.hypot(g.player.x-b.x,g.player.y-b.y))[0];if(!q)return '';
 if(g.items.includes(q.item)||ITEMS[q.item]?.active&&g.active?.id===ITEMS[q.item].active)return '<b>중복 선물 · 동전 4닢</b><span>이미 보유한 유물이에요. 가까이 걸으면 동전으로 한 번만 바꿔요.</span>';
 const d=ITEMS[q.item],{before,after}=previewFor(g,q.item),diff=[];
 for(const [k,name]of [['damage','피해'],['rate','발사/초'],['speed','이속'],['maxHp','최대 HP'],['range','사거리'],['luck','행운']])if(before[k]!==after[k])diff.push(name+' '+Number(before[k].toFixed(2))+' → '+Number(after[k].toFixed(2)));
 return rarityBadge(q.item)+' <b>'+d.name+'</b><span>'+d.text+'</span>'+(diff.length?'<small>'+diff.join(' · ')+'</small>':'')+'<small>'+(d.troll?'주의 · 원치 않으면 받침대에서 떨어져 지나가세요.':'')+' 가까이 걸으면 자동 획득.</small>';
}
export function shopPeek(g){
 const r=g.rooms[g.room];if(r.type!=='shop')return '';
 const dist=s=>Math.hypot(g.player.x-s.x,g.player.y-s.y),s=r.stock.filter(s=>!s.sold&&dist(s)<160&&(!ITEMS[s.id]||!g.items.includes(s.id))).sort((a,b)=>dist(a)-dist(b))[0];if(!s)return '';
 if(availableArtifacts(g).some(q=>q.item&&dist(q)<dist(s)))return '';
 const d=ITEMS[s.id],cost=shopPrice(g,s),budget=g.coins>=cost?'구매 후 '+(g.coins-cost)+'닢':(cost-g.coins)+'닢 부족';
 let detail=d?.text|| (s.id==='heal'?'현재 체력 +'+Math.min(22,itemPreview(g,'').before.maxHp-g.player.hp)+' 회복':'열쇠 +1'),delta='';
 if(d){const {before,after}=previewFor(g,s.id),diff=[];for(const [k,name]of [['damage','피해'],['rate','발사/초'],['speed','이속'],['maxHp','최대 HP'],['range','사거리'],['luck','행운']])if(before[k]!==after[k])diff.push(name+' '+Number(before[k].toFixed(2))+' → '+Number(after[k].toFixed(2)));delta=diff.join(' · ');}
 const unavailable=d?.active&&g.active?.id===d.active?'현재 장착 중인 액티브예요.':s.id==='heal'&&g.player.hp>=itemPreview(g,'').before.maxHp?'체력이 가득 차서 구매하지 않아요.':'';
 return (d?rarityBadge(s.id):'')+' <b>'+(d?.name||(s.id==='heal'?'체력 회복':'열쇠'))+'</b><span>'+detail+'</span>'+(delta?'<small>'+delta+'</small>':'')+'<small>가격 '+cost+'닢 · 소지 '+g.coins+'닢 · '+budget+'</small><small>'+unavailable+' 가까이에서 F로만 구매 · 지나가면 지불하지 않아요.</small>';
}
function previewFor(g,id){if(!ITEMS[id]?.active)return itemPreview(g,id);const s=buildStats(g);return {before:s,after:s};}
