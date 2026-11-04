import {createGame,FACES,PATTERNS,RELICS,ENCOUNTERS,evaluate,toggleHold,reroll,attack,chooseRelic,counterPreview,canPass,pass,pause,resume,tick} from './dice-engine.js?v=53.1';
import {renderDiceScene} from './dice-renderer.js?v=54';
import {EFFECT_ATLAS} from './dice-effects.js?v=54';
import {BUTTER_ORIGINAL,BUTTER_POSTER} from './butter-original-motion.js';
import {STAGE_ART} from './platformer-art.js?v=43';
import {createGameAudio} from './platformer-audio.js?v=46';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),audio=createGameAudio(),canvas=$('scene'),ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let seedInput=params.get('seed')||'',g=createGame(seedInput||'BUTTER-DICE'),started=false,ready=false,last=0,selected='free',modalKey='',diceKey='',chainKey='',relicKey='',helpOpen=false,helpPaused=false,seenRoll=-1;
const images={butter:{},monsters:Object.fromEntries(['fan','archer','guard','ghost'].map(id=>[id,{}])),backgrounds:{}};
const number=value=>Number(value.toFixed(3));
const label=(id,value)=>{const e=$(id),s=String(value);if(e.textContent!==s)e.textContent=s;};
const icon=id=>'<svg aria-hidden="true"><use href="./assets/ui-icons.svg#'+id+'"></use></svg>';
const relicIcon=id=>'<span class="relic-icon" style="--relic-color:'+RELICS[id].color+'">'+icon(RELICS[id].icon)+(RELICS[id].image?'<img src="'+RELICS[id].image+'" alt="" loading="lazy">':'')+'</span>';
const provenance=id=>RELICS[id].sourceId?'<span class="source-note">원작 참고 · 주사위용 각색</span><span class="original-note">원작: '+RELICS[id].original+'</span>':'<span class="source-note">팬 창작 유물</span>';
// Broken optional artifact art never blocks play; retain the SVG underneath.
document.addEventListener('error',e=>{if(e.target.matches?.('.relic-icon img'))e.target.hidden=true;},true);
const focusTable=()=>$('table').focus({preventScroll:true});
function start(seed=seedInput.trim()||Date.now()){
 if(!ready)return;audio.unlock();g=createGame(seed);started=true;selected='free';helpOpen=false;helpPaused=false;modalKey='';diceKey='';chainKey='';relicKey='';seenRoll=-1;last=0;
 const url=new URL(location.href);url.searchParams.set('seed',g.seed);history.replaceState(null,'',url);sync();
}
function doRoll(){if(reroll(g)){audio.unlock();audio.play(['shot']);sync();focusTable();}}
function doAttack(){if(attack(g,selected)){audio.unlock();audio.play(['shot']);chainKey='';sync();focusTable();}}
function togglePause(){if(!started||helpOpen)return;if(g.phase==='paused')resume(g);else pause(g);sync();if(g.phase!=='paused')focusTable();}
function openHelp(){if(helpOpen)return;helpPaused=started&&pause(g);helpOpen=true;sync();}
function closeHelp(){helpOpen=false;if(helpPaused){resume(g);helpPaused=false;}sync();if(!['draft','reward','paused','dead','won'].includes(g.phase))focusTable();}
for(let i=0;i<5;i++){
 const b=document.createElement('button');b.className='die';b.dataset.die=i;b.addEventListener('click',()=>{if(toggleHold(g,i)){sync();focusTable();}});$('dice').append(b);
}
for(const [id,p]of Object.entries(PATTERNS)){
 const b=document.createElement('button');b.className='pattern';b.dataset.pattern=id;b.addEventListener('click',()=>{selected=id;chainKey='';sync();focusTable();});$('patterns').append(b);
}
$('reroll').addEventListener('click',doRoll);$('attack').addEventListener('click',doAttack);
$('unhold').addEventListener('click',()=>{for(let i=0;i<5;i++)if(g.held[i])toggleHold(g,i);sync();focusTable();});
$('pass').addEventListener('click',()=>{if(pass(g)){sync();focusTable();}});
$('pause').addEventListener('click',togglePause);$('help').addEventListener('click',openHelp);
$('sound').addEventListener('click',()=>{const on=audio.toggle();label('sound',on?'소리 켬':'소리 끔');$('sound').setAttribute('aria-pressed',String(on));});
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement)return;
 if(e.code==='Escape'){e.preventDefault();if(helpOpen)closeHelp();else togglePause();return;}
 if(!started||helpOpen||e.repeat)return;
 if(/^Digit[1-5]$/.test(e.code)){e.preventDefault();if(toggleHold(g,Number(e.code.at(-1))-1)){sync();focusTable();}}
 else if(e.code==='KeyR'){e.preventDefault();doRoll();}
 else if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();doAttack();}
});
function freeze(){if(started&&pause(g))sync();}
window.addEventListener('blur',freeze);document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze();});
function modal(){
 const kind=helpOpen?'help':!started?'title':['draft','reward','paused','won','dead'].includes(g.phase)?g.phase:'';
 const key=kind+':'+g.choices.join(',')+':'+(kind==='title'?ready:'');
 $('screen').hidden=!kind;$('app').inert=Boolean(kind);document.body.classList.toggle('modal-open',Boolean(kind));
 if(key===modalKey)return;modalKey=key;if(!kind)return;
 const p=$('screen-panel');p.className='modal-panel '+(kind==='title'?'title-panel':'');
 if(kind==='title'){
  p.innerHTML='<div class="title-hero"><img src="./assets/butter-original36/poster.png" alt="원작 버터"><div><small>A LITTLE DICE ROGUELIKE</small><h2 id="screen-title">버터의<br><em>사기 주사위</em></h2><p>남길 눈을 고르고, 한 번 더 욕심내고.<br>유물로 작은 행운을 커다란 한 방으로.</p></div></div><div class="title-rules"><span>주사위 5개</span><span>재굴림 2번</span><span>유물 14종</span></div><button id="start" class="primary" '+(!ready?'disabled':'')+'>'+(ready?'작은 사기를 시작하자 →':'원작 모션 준비 중…')+'</button><details class="seed-options"><summary>같은 주사위 순서로 도전하기</summary><label>시드 <input id="seed" maxlength="48" placeholder="비우면 새로운 판"></label></details><p class="modal-status" id="load-status">'+(ready?'준비 완료 · 마우스 / 터치로 고정하고 재굴림':'버터와 몬스터의 원작 모션을 불러오고 있어요.')+'</p><button id="learn" class="secondary">어떻게 하는 거야?</button>';
  $('seed').value=seedInput;$('seed').addEventListener('input',e=>{seedInput=e.target.value;});$('start').addEventListener('click',()=>start());$('learn').addEventListener('click',openHelp);
 }else if(['draft','reward'].includes(kind)){
  p.innerHTML='<span class="eyebrow">'+(kind==='draft'?'YOUR FIRST LITTLE CHEAT':'ONE MORE PIECE OF TROUBLE')+'</span><h2 id="screen-title">'+(kind==='draft'?'첫 장난을 골라볼까?':'이번엔 뭘 더할까?')+'</h2><p>'+(kind==='draft'?'유물은 이번 판 내내 함께해요.':'전투 클리어 · 체력 12 회복 후 다음 전투로')+'</p><div class="relic-choices">'+g.choices.map(id=>{const r=RELICS[id];return '<button class="relic-choice" data-relic="'+id+'" style="--relic-color:'+r.color+'">'+relicIcon(id)+'<span class="tag">'+r.tag+'</span><b>'+r.name+'</b><small>'+r.text+'</small>'+provenance(id)+'<span>주머니에 넣기 →</span></button>';}).join('')+'</div>';
  for(const b of p.querySelectorAll('[data-relic]'))b.addEventListener('click',()=>{if(chooseRelic(g,b.dataset.relic)){audio.unlock();sync();focusTable();}});
 }else if(kind==='help'){
  p.innerHTML='<span class="eyebrow">BUTTER\'S CHEAT SHEET</span><h2 id="screen-title">한 번 더 굴릴까?</h2><ol class="help-list"><li><b>① 남길 주사위를 눌러 고정</b><span>초기 굴림 후 두 번 더 굴릴 수 있어요. 고정하지 않은 주사위만 바뀌어요. 숫자 1~5 키로도 고정할 수 있어요.</span></li><li><b>② 조합을 고르고 공격</b><span>자유 투척 / 짝꿍 / 삼총사 / 별빛 행진 중 골라요. 카드에 실제 유물 계산을 적용한 피해가 보여요. 삼총사는 같은 눈 4개·5개면 더 강해져요.</span></li><li><b>③ 유물의 조건을 활용</b><span>꼭 쥔 행운은 재굴림 때 지킨 주사위를 강화해요. 원작 코미의 베개는 위기 회복, 옐로카드는 분노 강화, 날씨는 맑음은 누적 번개로 각색했어요. 카드의 원작 참고와 이번 게임 효과를 구분해 읽어요.</span></li><li><b>④ 반격과 보스의 규칙 확인</b><span>쓰러뜨리지 못하면 표시된 피해만큼 반격받아요. 보스에게 같은 조합을 연속 사용할 수 없어요. 공격할 조합이 전혀 없고 재굴림도 없으면 빈손으로 넘길 수 있어요.</span></li></ol><button id="help-close" class="primary">알겠어, 돌아가기</button>';$('help-close').addEventListener('click',closeHelp);
 }else if(kind==='paused'){
  p.innerHTML='<span class="eyebrow">TAKE YOUR TIME</span><h2 id="screen-title">잠깐 쉬어 가자</h2><p>주사위와 전투 시간도 멈춰 있어요.</p><button id="resume" class="primary">계속하기</button><br><button id="restart" class="secondary">새로운 판</button>';
  $('resume').addEventListener('click',togglePause);$('restart').addEventListener('click',()=>start(Date.now()));
 }else{
  p.innerHTML='<span class="eyebrow">'+(kind==='won'?'THE LUCK YOU MADE':'ONE MORE LITTLE BET')+'</span><h2 id="screen-title">'+(kind==='won'?'버터, 아공간 탈출!':'다음엔 어떤 장난을 칠까?')+'</h2><p>최고의 한 방</p><p class="end-score">'+g.best+'</p><p>'+(g.stage+1)+'번째 전투 · 공격 '+g.attacks+'번 · 유물 '+g.relics.length+'개</p><button id="replay" class="primary">같은 시드로 다시 도전</button><br><button id="restart" class="secondary">새로운 판</button>';
  $('replay').addEventListener('click',()=>start(g.seed));$('restart').addEventListener('click',()=>start(Date.now()));
 }
 p.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
}
function sync(){
 const results=Object.keys(PATTERNS).map(id=>evaluate(g,id)),valid=results.filter(r=>r&&!r.blocked);
 if(g.phase!=='resolve'&&!valid.some(r=>r.id===selected))selected=[...valid].sort((a,b)=>b.damage-a.damage)[0]?.id||'free';
 const result=g.phase==='resolve'?g.lastResult:evaluate(g,selected),active=started&&g.phase==='pick'&&!helpOpen;
 document.body.dataset.phase=started?g.phase:'title';document.body.dataset.stage=g.stage;
 label('hp',g.hp+' / '+g.maxHp+(g.shield?' · 방패 '+g.shield:''));$('hp-bar').style.width=g.hp/g.maxHp*100+'%';
 label('round','전투 '+(g.stage+1)+' / 4');label('turn',g.turn+' TURN');
 $('route').innerHTML=Array.from({length:4},(_,i)=>'<i class="'+(i===g.stage?'current':i<g.stage?'done':'')+'"></i>').join('');
 $('route').setAttribute('aria-label','네 전투 중 '+(g.stage+1)+'번째');
 label('enemy-name',ENCOUNTERS[g.stage].name);label('enemy-hp',g.enemyHp+' / '+ENCOUNTERS[g.stage].hp);$('enemy-bar').style.width=g.enemyHp/ENCOUNTERS[g.stage].hp*100+'%';
 label('rule',g.stage===3&&g.lastPattern?(g.phase==='resolve'?'다음 턴 금지: ':'이번 턴 금지: ')+PATTERNS[g.lastPattern].name:ENCOUNTERS[g.stage].rule);
 label('rolls','재굴림 '+g.rerolls+' / 2');label('phase-label',g.phase==='rolling'?'새로운 행운이 오는 중':g.phase==='resolve'?'작은 장난이 터지는 중':'행운은, 만드는 거야.');
 label('hold-hint',g.held.every(Boolean)?'다시 굴리려면 고정을 하나 이상 풀어요':'주사위를 눌러 남길 눈을 골라요');
 const key=JSON.stringify([g.dice,g.held,g.kept,g.phase,g.rollSerial,started]);
 if(key!==diceKey){diceKey=key;for(const b of $('dice').children){const i=Number(b.dataset.die),v=g.dice[i],face=FACES[v];b.className='die'+(g.kept[i]?' kept':'')+(g.phase==='rolling'&&g.changed.includes(i)?' rolling':'');b.style.setProperty('--face-color',face.color);b.disabled=!active;b.setAttribute('aria-pressed',String(g.held[i]));b.setAttribute('aria-label',(i+1)+'번 주사위 '+v+' '+face.name+' · '+(g.held[i]?'고정됨':'고정 안 됨')+(g.kept[i]?' · 재굴림에서 지킴':''));b.innerHTML='<span class="index">'+(i+1)+'</span><b class="value">'+v+'</b>'+icon(face.icon)+'<span class="face-name">'+face.name+'</span><span class="held-label">'+(g.held[i]?'고정 ✓':'눌러서 고정')+'</span>';}}
 for(const b of $('patterns').children){const id=b.dataset.pattern,r=results.find(r=>r?.id===id);b.disabled=!active||!r||r.blocked;b.className='pattern'+(selected===id?' selected':'')+(r?.blocked?' banned':'');b.setAttribute('aria-pressed',String(selected===id));b.innerHTML='<b>'+PATTERNS[id].name+'</b><small>'+(r?.blocked?r.reason:PATTERNS[id].hint)+'</small><span class="damage">'+(r&&!r.blocked?r.damage:'—')+'<em>'+(r?.blocked?'금지':'피해')+'</em></span>';}
 $('reroll').disabled=!active||g.rerolls===0||g.held.every(Boolean);$('unhold').disabled=!active||!g.held.some(Boolean);$('attack').disabled=!active||!result||result.blocked;
 const stuck=canPass(g);$('pass').hidden=!stuck;$('attack').hidden=stuck;
 label('attack-name',result?.name||'조합을 골라요');label('preview-damage',result&&!result.blocked?result.damage:'—');
 const visible=g.phase==='resolve'?Math.max(1,Math.ceil(g.pending.clock/g.pending.hitAt*(result?.steps.length||0))):result?.steps.length||0,steps=(result?.steps||[]).slice(0,visible),ck=JSON.stringify(steps);
 const live=g.phase==='resolve'?steps.at(-1):null;
 label('chips',live?.chips??result?.chips??0);label('mult',number(live?.mult??result?.mult??1));label('score-total',live?.total??result?.damage??0);label('score-label',g.phase==='resolve'?'터지는 한 방':'예상 피해');label('score-caption',live?.label||'이번 공격의 계산');
 for(const b of $('dice').children)b.classList.toggle('scoring',g.phase==='resolve'&&!g.pending.applied&&live?.die===Number(b.dataset.die));
 if(ck!==chainKey){chainKey=ck;$('chain').innerHTML=steps.map((s,i)=>'<div class="chain-step'+(!['die','pattern'].includes(s.source)?' relic-step':'')+(g.phase==='resolve'&&i===steps.length-1?' active':'')+'"><span>'+s.label+'</span><b>'+s.chips+' × '+number(s.mult)+'</b></div>').join('');if(g.phase==='resolve')$('chain').scrollTop=$('chain').scrollHeight;}
 const rk=g.relics.join(',');if(relicKey!==rk||!$('relics').childElementCount){relicKey=rk;$('relics').innerHTML=g.relics.length?g.relics.map(id=>'<article class="relic">'+relicIcon(id)+'<div><b>'+RELICS[id].name+'</b><small>'+RELICS[id].text+'</small>'+provenance(id)+'</div></article>').join(''):'<p class="empty">첫 유물로 장난을 시작해 보세요.</p>';}
 label('relic-count',g.relics.length+' / '+Object.keys(RELICS).length);label('best',g.best);label('attacks',g.attacks);label('seed-label','SEED '+g.seed);label('notice',g.notice);
 const effects=[];
 if(g.relics.includes('yellow'))effects.push('분노 '+g.rage+'/3');
 if(g.relics.includes('weather'))effects.push('번개 '+g.strikes+'/3');
 if(g.relics.includes('mace'))effects.push('참회 '+g.maceHits+'/3');
 if(g.relics.includes('komi'))effects.push('베개 '+(g.komiUsed?'이번 전투 사용함':'위기 회복 준비'));
 label('artifact-state',effects.join(' · ')||'원작 참고 아티팩트 8종 + 팬 창작 유물 6종');
 const predicted=counterPreview(g,result),kill=result&&!result.blocked&&(g.phase==='resolve'&&g.pending.applied?g.enemyHp===0:result.damage>=g.enemyHp);
 label('incoming',kill?'이 공격 처치 시 반격 없음':predicted.stun?'선택한 공격: 기절 · 반격 없음':'생존 시 반격 −'+predicted.loss+' HP'+(predicted.blocked?' · 방패 −'+predicted.blocked:''));
 label('attack-effect',result?.heal?'실제 적중 시 흡혈 +'+result.heal+' HP':result?.execute?'일반 적 처형 적용':result?.rageSpent?'분노 3 소모 · 강화 공격':result?.stun?'메이스 충전 소모 · 반격 취소':'');
 $('pause').disabled=!started||!['pick','rolling','resolve','paused'].includes(g.phase)||helpOpen;
 modal();if(g.rollSerial!==seenRoll){seenRoll=g.rollSerial;canvas.dataset.roll=String(g.rollSerial);}
}
function frame(now){const dt=last?Math.min((now-last)/1000,1/30):0;last=now;if(started){const hit=g.pending?.applied;tick(g,dt);if(!hit&&g.pending?.applied)audio.play(['hit']);sync();}renderDiceScene(ctx,g,images,{reduced:reduced.matches});requestAnimationFrame(frame);}
function load(src,target,id){return new Promise(resolve=>{const img=new Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);if(ok)target[id]=img;resolve(ok);},timeout=setTimeout(()=>finish(false),8000);img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;});}
async function boot(){load(EFFECT_ATLAS,images,'effects');const tasks=[load(BUTTER_POSTER,images.butter,'poster')];for(const key of ['idle','shoot','high'])tasks.push(load(BUTTER_ORIGINAL.clips[key].image,images.butter,key));for(const id of Object.keys(images.monsters))for(const key of ['idle','attack','die'])tasks.push(load(STAGE_ART.monsters[id].clips[key].image,images.monsters[id],key));for(const [id,b]of Object.entries(STAGE_ART.backgrounds))tasks.push(load(b.image,images.backgrounds,id));await Promise.all(tasks);ready=true;document.body.dataset.ready='true';sync();}
if(params.get('test')==='1')window.__dice52={get game(){return g;},start,tick,reroll,toggleHold,attack,chooseRelic,evaluate,pass,images};
sync();requestAnimationFrame(frame);boot().catch(e=>{console.error(e);ready=true;document.body.dataset.ready='true';sync();});
