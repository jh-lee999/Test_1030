// Read-only presentation helpers. No physics, RNG, inventory or damage writes.
import {BOARD,FOES,FUSIONS,hasFusion} from './bonk-engine.js?v=48';
export const ITEM_ICONS={split:'projectile',mark:'attack',lower:'book-low',upper:'book-high',pouch:'projectile',rubber:'slingshot',bomb:'bomb',snack:'snack'};
export const ITEM_TYPES={split:'탄환 변화',mark:'연쇄 폭발',lower:'저학년 강화',upper:'고학년 강화',pouch:'발사 수 증가',rubber:'경유 강화',bomb:'처치 효과',snack:'체력 회복'};
export function phaseView(g){
  if(g.phase==='aim')return g.useKing?{label:'왕새총 준비 완료',hint:'발사하면 왕짱돌이 함께 나가요',kind:'king'}:{label:'내 차례 · 조준',hint:'시간 제한 없이 각도를 골라요',kind:'aim'};
  return ({flight:{label:'연쇄 타격 중',hint:'탄환이 끝나면 적이 한 번 행동해요',kind:'flight'},enemy:{label:'적의 반격',hint:'다음 한 발을 준비하세요',kind:'enemy'},reward:{label:'강화 선택',hint:'남은 선택을 모두 마치면 이어져요',kind:'reward'},next:{label:'전투 클리어',hint:'강화를 확인하고 다음 전투로',kind:'clear'},paused:{label:'잠깐 쉬는 중',hint:'전투 시간도 멈춰 있어요',kind:'paused'},won:{label:'아공간 탈출 성공',hint:'다른 조합으로 다시 도전해 보세요',kind:'clear'},dead:{label:'다시 도전',hint:'이번에는 다른 각도로',kind:'enemy'}})[g.phase];
}
export function enemyIntent(g,e){
  const p=FOES[e.type],shoot=['archer','ghost'].includes(e.type)&&g.turn%2===0,baseY=g.phase==='enemy'?e.fromY:e.y,contact=baseY+p.advance+e.r>=BOARD.danger;
  const guarded=e.type==='guard'&&g.turn%2===1;
  return {icon:shoot?'◎':guarded?'◈':'↓',short:shoot?'−'+p.damage:guarded?'½':String(p.advance),label:shoot?(e.type==='ghost'?'탄막과 졸개 소환':'조준 사격'):guarded?'직격 피해 절반 · 경유로 공략':'아래로 '+p.advance+' 전진',damage:(shoot?p.damage:0)+(contact?p.damage:0),contact,shoot,guarded,color:shoot||contact?'#f2ac9f':guarded?'#b9caed':'#d7e5be'};
}
export function enemySummary(g){const alive=g.enemies.filter(e=>!e.dead);return {count:alive.length,damage:alive.reduce((n,e)=>n+enemyIntent(g,e).damage,0),shooters:alive.filter(e=>enemyIntent(g,e).shoot).length};}
export function fusionProgress(g,f){return Object.entries(f.needs).reduce((n,[id,max])=>n+Math.min(max,g.inventory[id]||0),0);}
export function upgradeBenefit(g,id){const n=(g.inventory[id]||0)+1;return ({pouch:`발사 ${3+n-1} → ${3+n}개`,lower:`추가 도약 ${n} → ${n+1}회`,split:`분열 파편 ${g.inventory.split? n:0} → ${1+n}개`,upper:`왕짱돌 피해 ${27+(n-1)*9} → ${27+n*9}`,rubber:`경유당 피해 +${(n-1)*12}% → +${n*12}%`,snack:`최대 체력 ${g.maxHp} → ${g.maxHp+15} · 15 회복`,mark:`폭발 피해 ${n===1?0:5+(n-1)*4} → ${5+n*4} · 범위 ${85+n*15}`,bomb:`처치 폭발 피해 ${n===1?0:6+(n-1)*5} → ${6+n*5}`})[id];}
export function fusionBenefit(g,id){
  const f=FUSIONS.find(f=>Object.hasOwn(f.needs,id)&&!hasFusion(g,f.id));if(!f)return null;
  const before=fusionProgress(g,f),after=before+Number((g.inventory[id]||0)<f.needs[id]);
  return after===4?{text:f.name+' 완성!',complete:true}:after>before?{text:f.name+' '+before+'/4 → '+after+'/4',complete:false}:null;
}
