// Pure product views. No mutations, random sampling, hidden draw-order reads or actions.
import * as E from './poker-engine.js?v=65';
export const ENCOUNTERS = [
  {name:'숲의 첫 내기',enemy:'fan',hp:180,hint:'힘을 모은 뒤 강타. 작은 족보는 남는 득점 칸으로 방어해요.'},
  {name:'성급한 사수',enemy:'archer',hp:340,hint:'조준 다음은 저격. 다음 반격을 보고 패를 바꿔요.'},
  {name:'방패 뒤의 거래',enemy:'guard',hp:570,hint:'원페어로 방패를 부수면 남은 전투 내내 방어가 사라져요.'},
  {name:'밤숲의 추종자',enemy:'fan',hp:850,hint:'성장한 족보와 유물 순서가 중요해지는 구간이에요.'},
  {name:'마지막 문지기',enemy:'archer',hp:1250,hint:'보스 직전 마지막 투자. 주력 외 족보도 준비하세요.'},
  {name:'이불령의 마지막 내기',enemy:'ghost',hp:2300,hint:'직전 족보를 봉인해요. 절반 체력부터 반격 +3, 피해 ×1.35.'}
];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildAdvice(g) {
  const suits=E.deckSummary(g).suits, dominant=Object.keys(suits).sort((a,b)=>suits[b]-suits[a])[0];
  const trained=Object.keys(g.training).filter(k=>g.training[k]>0).sort((a,b)=>g.training[b]-g.training[a]);
  let name='다양한 족보',tip='첫 승리 뒤, 자주 만드는 족보를 강화하고 불필요한 카드를 줄여요.';
  if(g.relics.includes('paint')){name='같은 무늬 빌드';tip=E.SUITS[dominant].symbol+' '+suits[dominant]+'/'+g.deck.length+'장. 무늬 변환과 잡패 제거로 플러시 확률을 높여요.';}
  else if(g.relics.includes('ladder')){name='연속 숫자 빌드';tip='연속 다섯 숫자를 남기고, 중복 숫자를 변환해 스트레이트를 안정화해요.';}
  else if(g.relics.includes('echo')){name='같은 숫자 빌드';tip='짝이 되는 숫자를 복제하고 투페어·풀하우스를 강화하면 리본이 재발동해요.';}
  if(trained.length)tip+=' 주력 '+E.PATTERNS[trained[0]].name+' Lv'+(g.training[trained[0]]+1)+'.';
  return {name,tip};
}
export function tacticalView(g,result) {
  const resolving=g.phase==='resolve'||g.phase==='paused'&&g.returnPhase==='resolve',counter=E.counterPreview(g,result);
  const targetHp=g.enemyHp+(resolving&&g.pending?.applied?(result?.damage||0):0),lethal=Boolean(result&&result.damage>=targetHp),next=E.enemyIntent({...g,turn:g.turn+1,pressure:0});
  let title=lethal?'이 공격으로 마무리 가능':!result?'봉인을 풀 다른 패가 필요해요':g.hands===1?'마지막 공격 기회':'다음 한 수';
  let message=lethal?'처치하면 반격 없이 보상과 상점으로 이동해요.':!result?g.discards?'카드를 버려 다른 족보를 만들어야 해요.':'넘기면 공격 1회와 반격을 지불해요.':counter.loss>=g.hp?'현재 패로 공격하면 반격을 버티지 못해요. 패 교체·기절·흡혈을 확인하세요.':'현재 반격 '+counter.raw+' → 방어·보호막 반영 후 '+counter.loss+' HP.';
  if(!lethal&&result&&g.hands===1)message='남은 적 HP '+Math.max(0,g.enemyHp-result.damage)+'. 처치하지 못하면 공격 기회 소진으로 패배해요.';
  if(resolving){title='공격 확정';message='확정한 '+(result?.name||'족보')+'와 피해는 바뀌지 않아요. '+(lethal?'처치 시 반격 없음.':'생존 시 반격 '+counter.loss+' HP.');}
  if(g.mode==='deep')message+=' 교체 압박 +'+(g.pressure||0)+' · 다음 턴 초기화.'+(g.foe.boss&&!g.wardUsed?' 꿈의 장막: 첫 피해는 최대 '+Math.ceil(g.foe.maxHp*.5)+'.':'');
  return {title,message,danger:!lethal&&Boolean(result)&&(counter.loss>=g.hp||g.hands===1),lethal,next:next.name+' · 반격 '+next.attack+(next.armor?' · 방패 '+next.armor:'')+(next.exposed?' · 빈틈 ×1.35':''),hint:ENCOUNTERS[g.depth].hint};
}
export function tacticalMarkup(v) {return '<h2>'+esc(v.title)+'</h2><p class="'+(v.danger?'danger':v.lethal?'safe':'')+'">'+esc(v.message)+'</p><p class="intent-forecast">다음 턴: '+esc(v.next)+'<br><small>현재 적 체력 기준 · '+esc(v.hint)+'</small></p>';}
export function mapMarkup(g) {return '<h2 id="screen-title">아공간의 여섯 내기</h2><p>'+E.RUN_MODES[g.mode||'classic'].name+' · 각 전투 뒤 상점에서 덱을 다듬어요. 일반전과 정예전은 직접 선택해요.</p><div class="map-grid">'+ENCOUNTERS.map((r,i)=>'<div class="map-room '+(i<g.depth?'done':i===g.depth?'current':'')+'"><em>'+(i<g.depth?'CLEAR':i===g.depth?'CURRENT':'ROOM '+(i+1))+'</em><b>'+(i+1)+'. '+r.name+'</b><small>HP '+E.encounterPreview(i,false,g.mode||'classic').maxHp+'<br>'+r.hint+'</small></div>').join('')+'</div><button class="secondary" data-close>돌아가기</button>';}
function sample(g,relics=g.relics,training=g.training) {
  const depth=Math.min(5,g.depth+1),foe=E.encounterPreview(depth,false,g.mode||'classic'),limits=E.resourceLimits({relics});
  return {...g,relics,training,phase:'pick',pending:null,lastPattern:null,depth,turn:1,pressure:0,foe,enemyHp:foe.maxHp,discards:limits.discards,hands:limits.hands,armorBroken:false};
}
export function relicImpact(g,id,replace=null) {
  const limits=E.relicResourcePreview(g,id,replace);if(!limits||!g.hand.length)return null;
  const relics=[...g.relics];if(relics.length>=E.MAX_RELICS)relics[relics.indexOf(replace)]=id;else relics.push(id);
  const before=E.bestHand(sample(g)),after=E.bestHand(sample(g,relics));
  return {before:before?.damage||0,after:after?.damage||0,delta:(after?.damage||0)-(before?.damage||0),limits};
}
export function impactMarkup(p) {return p?'<span class="shop-impact '+(p.delta>0?'gain':'')+'">이 손패·다음 일반전 기준<br>'+p.before+' → '+p.after+' 피해'+(p.delta?' ('+(p.delta>0?'+':'')+p.delta+')':' · 피해 조건 변화 없음')+'</span>':'';}
export function trainingImpact(g,id) {
  if(!E.PATTERNS[id]||g.training[id]>=8||!g.hand.length)return null;
  const before=E.bestHand(sample(g)),after=E.bestHand(sample(g,g.relics,{...g.training,[id]:g.training[id]+1}));
  return {before:before?.damage||0,after:after?.damage||0,delta:(after?.damage||0)-(before?.damage||0)};
}
export function shopAnalysisMarkup(g) {
  const depth=Math.min(5,g.depth+1),room={...ENCOUNTERS[depth],hp:E.encounterPreview(depth,false,g.mode||'classic').maxHp},build=buildAdvice(g);
  return '<div class="shop-analysis"><h3>다음 상대 · '+room.name+' / HP '+room.hp+'</h3><p>'+room.hint+(g.mode==='deep'&&depth===5?' 꿈의 장막이 첫 피해를 최대 '+Math.ceil(room.hp*.5)+'로 제한해요. 서로 다른 두 족보 이상을 준비하세요.':'')+'</p><h3 style="margin-top:10px">내 빌드 · '+build.name+'</h3><p>'+build.tip+'</p><p style="margin-top:7px">투자 비교는 방금 손패를 다음 일반전 첫 턴에 냈을 때의 예시예요. 미래 패·전체 덱의 기대 피해는 아니에요.</p></div>';
}
export function coachMarkup(g) {
  if(g.attacks)return '<b>③</b><span>공격은 <strong>전투당</strong>, 버리기는 <strong>턴마다</strong> 채워져요. 상점에서 주력 족보를 키워 보세요.</span><button data-coach-dismiss aria-label="시작 안내 닫기">확인</button>';
  if(g.discards<E.resourceLimits(g).discards)return '<b>②</b><span>금색 카드가 자동으로 득점해요. <strong>공격 버튼</strong>을 누르면 가장 강한 족보를 발사해요.</span><button data-coach-dismiss aria-label="시작 안내 닫기">×</button>';
  return '<b>①</b><span>카드를 누르면 <strong>버릴 카드</strong>를 골라요. 좋은 패는 남기고 교체하거나, 지금 바로 공격하세요.</span><button data-coach-dismiss aria-label="시작 안내 닫기">×</button>';
}
export function recapMarkup(g) {
  const build=buildAdvice(g),cleared=g.history.length;
  return '<div class="run-recap"><div><b>'+cleared+'/6</b><small>통과한 내기</small></div><div><b>'+g.best+'</b><small>최고의 한 방</small></div><div><b>'+g.deck.length+'</b><small>완성한 덱 크기</small></div></div><div class="run-timeline">'+ENCOUNTERS.map((_,i)=>{const r=g.history.find(h=>h.depth===i);return '<span><b>'+(i+1)+'번 내기</b>'+(r?'통과 · HP '+r.hp:i===g.depth&&g.phase==='dead'?'도전 종료':'—')+'</span>';}).join('')+'</div><div class="shop-analysis"><h3>'+build.name+'</h3><p>'+build.tip+'</p><p>공격 '+g.attacks+'회 · 누적 피해 '+g.totalDamage+' · 유물 '+g.relics.length+'/4</p></div>';
}
