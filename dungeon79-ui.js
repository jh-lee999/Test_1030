import {HEROES,ITEMS,UNLOCKS} from './dungeon77-content.js';
import {unlocked,unlockView} from './dungeon76-progress.js';
import {buildStats,weaponIds,WEAPON_NAMES} from './dungeon77-build.js';
import {gradeUI} from './dungeon79-items-ui.js';
import {eventQuote} from './dungeon77-economy.js';
export function selectionUI(p){
 const open=unlocked(p.progress),options=defs=>Object.entries(defs).map(([id,d])=>'<option value="'+id+'" '+(d.unlock&&!open.includes(d.unlock)?'disabled':'')+'>'+d.name+(d.unlock&&!open.includes(d.unlock)?' · '+UNLOCKS[d.unlock].goal:'')+'</option>').join('');
 return '<details class="start-equipment"><summary>출발 준비 · 캐릭터 / 경로</summary><div class="start-settings"><label>캐릭터<select id="hero-select">'+options(HEROES)+'</select></label><label>경로<select id="route-select"><option value="normal">기본 탐사</option><option value="wild" '+(!open.includes('wildRoute')?'disabled':'')+'>샛길 탐사'+(!open.includes('wildRoute')?' · 에르핀 격파로 해금':' · 적 편성 강화 / 추가 보관실')+'</option></select></label></div></details>';
}
export function statsUI(g){
 const s=buildStats(g),row=(a,b)=>'<span><small>'+a+'</small><b>'+b+'</b></span>';
 return gradeUI(g)+'<div class="build-stats">'+row('무기',WEAPON_NAMES[s.weapon])+row('1발 피해',s.damage)+row('초당 발사',s.rate.toFixed(2))+row('사거리',s.range)+row('탄속',s.shotSpeed||'즉시')+row('이동속도',s.speed)+row('최대 체력',s.maxHp)+row('행운',s.luck)+row('받는 피해',s.incoming+'배')+row('폭탄 피해',s.bombDamage)+row('폭탄 범위',s.bombRadius)+'</div><p class="trait-summary">'+(s.traits.join(' · ')||'기본 사격')+'</p><p>보호막 '+g.shield+'/20 · 평타 '+g.shots+'회 · 다음 추적탄 '+(g.items.includes('scythe')?3-g.shots%3:'유물 필요')+' · 다음 빙결 '+(g.items.includes('frost')?3-g.hits%3:'유물 필요')+'</p><p>R / 무기 버튼으로 보유한 사격 형태 전환. 선택하지 않은 무기 유물도 설명에 적힌 보조 효과는 유지돼요.</p>';
}
export function unlockUI(p){return '<div class="eyebrow">리트라이 목표 · 능력치 노가다가 아닌 새 선택</div><h2>다음 소풍의 준비</h2><div class="unlock-list">'+unlockView(p.progress).filter(d=>!['chargedStart','fanStart','prismStart'].includes(d.id)).map(d=>'<article class="'+(d.open?'open':'')+'"><b>'+(d.open?'✓ ':'◇ ')+(d.id==='scope'?'망원경 유물':d.name)+'</b><span>'+d.goal+'</span></article>').join('')+'</div><button data-close class="gold">돌아가기</button>';}
export function eventUI(g){
 const r=g.rooms[g.room],kinds=r.type==='sanctuary'?['heal','shield']:r.type==='bargain'?['trade']:['rush'];
 return '<div class="eyebrow">선택형 탐험 · 이 화면에서는 시간이 멈춰요</div><h2>'+(r.type==='sanctuary'?'쉬어갈까?':r.type==='bargain'?'작은 대가, 새로운 장난':'모래가 다 떨어지기 전에')+'</h2><p>'+(r.type==='bargain'?'최대 체력은 이번 판 동안 줄어요. 현재 체력이 새 상한보다 높으면 함께 줄어들어요.':r.type==='rush'?'수락하면 문이 닫혀요. 45초 안에 정리하면 황금상자 하나. 열쇠 1개로 열면 유물 30%, 아니면 동전과 보급품. 실패해도 적을 정리하면 나갈 수 있어요.':'3닢으로 체력 또는 보호막. 이 방에서는 한 번만 이용할 수 있어요.')+'</p><div class="event-choices">'+kinds.map(k=>{const q=eventQuote(g,k);return '<button class="gold" data-event="'+k+'" '+(!q.ok?'disabled':'')+'><b>'+(k==='rush'?'시간 안에 정리하면 황금상자':q.label)+'</b><small>'+q.cost+'</small>'+(q.item?'<small>'+ITEMS[q.item].text+'</small>':'')+'</button>';}).join('')+'</div><button data-event-cancel>지금은 지나갈래</button>';
}
export function pickupUI(g){const d=g.pickupDelta;if(!d||g.time-d.at>5)return '';const diffs=[];for(const [k,name]of [['damage','피해'],['rate','초당 발사'],['range','사거리'],['maxHp','최대 체력'],['luck','행운']])if(d.before[k]!==d.after[k])diffs.push(name+' '+Number(d.before[k].toFixed(2))+' → '+Number(d.after[k].toFixed(2)));return ITEMS[d.id].name+' · '+(ITEMS[d.id].troll?'주의: '+ITEMS[d.id].text+' / ':'')+(diffs.join(' / ')||ITEMS[d.id].text);}
export function compactBuild(g){const s=buildStats(g);return WEAPON_NAMES[s.weapon]+' · 피해 '+s.damage+' · '+s.rate.toFixed(1)+'/초'+(s.traits.length?' · '+s.traits.join(' · '):'');}
