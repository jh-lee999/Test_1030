// Read-only markup; the engine owns validated moves and exact score previews.
import {RELICS,RELIC_STAGES,MAX_RELICS,canReorder,reorderPreview} from './poker-engine.js?v=65';
const stages={card:'카드 발동',relic:'배수·칩 계산',impact:'적중 후',passive:'전투·피격',resource:'횟수 확장'};
export function relicOrderMarkup(g,{feedback=''}={}){
 const enabled=canReorder(g),picking=g.phase==='pick';
 const control=(from,to,direction)=>{
  const valid=enabled&&to>=0&&to<g.relics.length,preview=valid&&picking?reorderPreview(g,from,to):null,delta=preview?.delta;
  const detail=preview?' · 예상 피해 '+preview.before+' → '+preview.after+(delta?' ('+(delta>0?'+':'')+delta+')':' (동일)'):'';
  return '<button data-move-from="'+from+'" data-move-to="'+to+'" '+(!valid?'disabled':'')+' aria-label="'+RELICS[g.relics[from]].name+' '+direction+'으로 이동'+detail+'" title="'+direction+'으로 이동'+detail+'">'+(direction==='왼쪽'?'←':'→')+(preview?'<small class="'+(delta>0?'gain':delta<0?'loss':'')+'">'+(delta>0?'+':'')+delta+'</small>':'')+'</button>';
 };
 return '<div class="order-heading"><b>유물 발동 순서 <span>1 → 2 → 3 → 4</span></b><small>'+(enabled?'드래그 또는 화살표로 이동':'공격 확정 · 배치 잠김')+'</small></div><div class="order-slots" role="list" aria-label="왼쪽부터 발동하는 유물 슬롯">'+Array.from({length:MAX_RELICS},(_,i)=>{
  const id=g.relics[i],r=RELICS[id];if(!r)return '<div class="order-empty" role="listitem"><b>'+(i+1)+'</b><span>빈 유물 칸</span></div>';
  return '<div class="order-slot" role="listitem" data-order-slot="'+i+'" draggable="'+enabled+'" style="--relic-color:'+r.color+'" title="'+r.text+'"><span class="order-number">'+(i+1)+'</span><span class="order-icon">✦'+(r.image?'<img src="'+r.image+'" alt="">':'')+'</span><b>'+r.name+'</b><span class="order-stage">'+stages[RELIC_STAGES[id]]+'</span><div class="order-controls">'+control(i,i-1,'왼쪽')+control(i,i+1,'오른쪽')+'</div></div>';
 }).join('')+'</div><p class="order-feedback" role="status" aria-live="polite">'+(feedback||'+배수 → ×배수 순서로 두면 더 크게 증폭돼요. 화살표 숫자는 현재 패의 피해 변화.')+'</p>';
}
export function scoreTraceMarkup(result){
 const names={base:'족보 기본값',card:'① 카드 발동 · 재발동',relic:'② 유물 · 슬롯 번호 순서',enemy:'③ 적 방어·빈틈',impact:'④ 적중 후 효과'};let phase='';
 return (result?.steps||[]).map(s=>{const next=s.phase||'relic',heading=phase!==next?'<div class="trace-heading">'+names[next]+'</div>':'';phase=next;return heading+'<div class="chain-step '+(['pattern','card'].includes(s.source)?'':'relic-step')+(s.active===false?' inactive-step':'')+'" data-trace-phase="'+next+'" data-trace-slot="'+s.slot+'"><span>'+(s.slot>=0?'#'+(s.slot+1)+' ':'')+s.label+'</span><b>'+s.chips+' × '+Number(s.mult.toFixed(2))+'</b></div>';}).join('');
}
