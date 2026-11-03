import {createGame,tick,fire,aimAt,toggleKing,recall,nextStage,chooseUpgrade,UPGRADES,FUSIONS,hasFusion,xpNeeded,FOES} from './bonk-engine.js?v=48';
import {renderGame} from './bonk-renderer.js?v=49';
import {ITEM_ICONS,ITEM_TYPES,phaseView,enemySummary,enemyIntent,fusionProgress,upgradeBenefit,fusionBenefit} from './bonk-ui.js?v=49';
import {STAGE_ART} from './platformer-art.js?v=43';
import {BUTTER_ORIGINAL,BUTTER_POSTER} from './butter-original-motion.js';
import {createGameAudio} from './platformer-audio.js?v=46';
import {AIM_CONTROL,createAimControl,cancelAim,setAimTarget,nudgeAim,requestAimShot,advanceAim} from './bonk-aim.js?v=50';
const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d'),params=new URLSearchParams(location.search),audio=createGameAudio();
let g=createGame(params.get('seed')||'BUTTER-BONK'),started=false,ready=false,last=0,phaseShown='',buildShown='',stageShown=-1,returnPhase='aim',helpOpen=false,helpPaused=false,inspectedId=null;
let aimControl=createAimControl(g),lastPointer=null,keyHoldTime=0,fineAim=false;
const aimKeys=new Set();
function stopAiming(){aimKeys.clear();keyHoldTime=0;lastPointer=null;cancelAim(aimControl,g);}
const images={butter:{},monsters:Object.fromEntries(['fan','archer','guard','ghost'].map(k=>[k,{}])),backgrounds:{}};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
$('build-details').open=!matchMedia('(max-width:760px)').matches;
if(params.has('seed'))$('seed').value=params.get('seed').slice(0,48);
const label=(id,value)=>{const e=$(id),text=String(value);if(e.textContent!==text)e.textContent=text;};
const itemIcon=id=>'<span class="item-icon"><svg aria-hidden="true"><use href="./assets/ui-icons.svg#'+ITEM_ICONS[id]+'"></use></svg></span>';
function focusIfPlaying(){if(['aim','flight','enemy'].includes(g.phase))canvas.focus({preventScroll:true});}
function start(seed=$('seed').value.trim()||Date.now()){
  if(!ready)return;audio.unlock();g=createGame(seed);started=true;phaseShown='';buildShown='';stageShown=-1;helpOpen=false;helpPaused=false;inspectedId=null;last=0;
  aimControl=createAimControl(g);pointer=null;fineAim=false;stopAiming();
  const url=new URL(location.href);url.searchParams.set('seed',g.seed);history.replaceState(null,'',url);sync();canvas.focus({preventScroll:true});
}
function pause(){pointer=null;stopAiming();if(!started||!['aim','flight','enemy'].includes(g.phase))return;returnPhase=g.phase;g.phase='paused';sync();$('resume').focus({preventScroll:true});}
function resume(){if(g.phase!=='paused')return;g.phase=returnPhase;last=0;sync();canvas.focus({preventScroll:true});}
function openHelp(){if(helpOpen)return;helpPaused=started&&['aim','flight','enemy'].includes(g.phase);if(helpPaused)pause();helpOpen=true;sync();$('help-close').focus({preventScroll:true});}
function closeHelp(){helpOpen=false;if(helpPaused){helpPaused=false;resume();}else{sync();$('help').focus({preventScroll:true});}}
function commitShot(){aimControl.pending=false;if(fire(g)){audio.play([g.action?.type==='high'?'boulder':'shot']);sync();canvas.focus({preventScroll:true});}}
function shoot(){
  if(!started||!ready||helpOpen||!requestAimShot(aimControl,g))return;
  audio.unlock();aimKeys.clear();keyHoldTime=0;
  if(advanceAim(aimControl,g,0))commitShot();else sync();
}
$('start').addEventListener('click',()=>start());$('fire').addEventListener('click',shoot);
$('recall').addEventListener('click',()=>{if(recall(g)){sync();focusIfPlaying();}});
$('king').addEventListener('click',()=>{if(toggleKing(g)){sync();focusIfPlaying();}});
$('pause').addEventListener('click',()=>{if(!helpOpen)g.phase==='paused'?resume():pause();});$('resume').addEventListener('click',resume);
$('help').addEventListener('click',openHelp);$('help-close').addEventListener('click',closeHelp);
$('next').addEventListener('click',()=>{if(nextStage(g)){inspectedId=null;sync();canvas.focus({preventScroll:true});}});
$('replay').addEventListener('click',()=>start(g.seed));
for(const b of document.querySelectorAll('.restart'))b.addEventListener('click',()=>{$('seed').value='';start();});
$('sound').addEventListener('click',()=>{const enabled=audio.toggle();label('sound',enabled?'소리 켬':'소리 끔');$('sound').setAttribute('aria-pressed',String(enabled));focusIfPlaying();});
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*canvas.width,y:(e.clientY-r.top)/r.height*canvas.height};}
function inspect(p){inspectedId=g.enemies.find(e=>!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+25)?.id??null;}
function pointerAim(p,precise){
  if(aimControl.pending)return;
  const target=precise&&lastPointer?{x:aimControl.target.x+(p.x-lastPointer.x)*.2,y:aimControl.target.y+(p.y-lastPointer.y)*.2}:p;
  setAimTarget(aimControl,g,target.x,target.y);lastPointer=p;inspect(p);
}
let pointer=null;
canvas.addEventListener('pointermove',e=>{if(!started||g.phase!=='aim')return;const p=point(e);if(e.pointerType==='mouse'||pointer===e.pointerId)pointerAim(p,e.shiftKey);});
canvas.addEventListener('pointerdown',e=>{if(!started||g.phase!=='aim'||e.button>0||pointer!==null||aimControl.pending)return;e.preventDefault();canvas.focus({preventScroll:true});pointerAim(point(e),e.shiftKey);pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;pointer=null;if(g.phase!=='aim')return;pointerAim(point(e),e.shiftKey);if(e.pointerType==='mouse')shoot();else{g.notice='조준 완료 · 새총 발사 버튼을 누르세요.';sync();}});
canvas.addEventListener('pointercancel',()=>{pointer=null;stopAiming();});
canvas.addEventListener('lostpointercapture',()=>{pointer=null;});
canvas.addEventListener('pointerleave',()=>{lastPointer=null;});
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement)return;
  fineAim=e.shiftKey;
  if(helpOpen){if(e.code==='Escape'){e.preventDefault();closeHelp();}return;}if(!started)return;
  if(e.code==='Escape'){e.preventDefault();g.phase==='paused'?resume():pause();return;}
  if(e.target instanceof HTMLButtonElement)return;
  if(['Space','KeyR','KeyE','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;
  if(e.code==='Space')shoot();else if(e.code==='KeyR'){if(recall(g))sync();}else if(e.code==='KeyE'&&!aimControl.pending){toggleKing(g);sync();}
  else if(g.phase==='aim'&&['ArrowLeft','ArrowRight'].includes(e.code)&&!aimControl.pending){aimKeys.add(e.code);nudgeAim(aimControl,g,(e.code==='ArrowLeft'?-1:1)*(fineAim?AIM_CONTROL.fineStep:AIM_CONTROL.keyStep));}
});
window.addEventListener('keyup',e=>{fineAim=e.shiftKey;aimKeys.delete(e.code);if(!aimKeys.size)keyHoldTime=0;});
window.addEventListener('blur',()=>{pointer=null;fineAim=false;pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=null;fineAim=false;pause();}});
function drawBuild(){
  label('upgrade-count',Object.values(g.inventory).reduce((a,b)=>a+b,0)+'개');
  $('fusions').replaceChildren(...FUSIONS.map(f=>{
    const div=document.createElement('article'),active=hasFusion(g,f.id),n=fusionProgress(g,f);div.className='fusion'+(active?' active':'');
    div.innerHTML='<div class="fusion-heading"><span>'+(f.id==='fireworks'?'✦':'◆')+'</span><div><b>'+f.name+'</b><small>'+(active?'조합 완성 · 효과 활성화':(4-n)+'번의 강화로 완성')+'</small></div></div><div class="fusion-track">'+Array.from({length:4},(_,i)=>'<i class="'+(i<n?'filled':'')+'"></i>').join('')+'</div><p>'+f.description+'</p><div class="progress">'+Object.entries(f.needs).map(([id,max])=>'<span class="'+((g.inventory[id]||0)>=max?'done':'')+'">'+UPGRADES[id].name.split(' · ').at(-1)+' '+Math.min(max,g.inventory[id]||0)+'/'+max+'</span>').join('')+'</div>';
    return div;
  }));
  $('inventory').replaceChildren(...Object.entries(g.inventory).map(([id,n])=>{
    const item=UPGRADES[id],div=document.createElement('div');div.className='owned';div.style.setProperty('--item-color',item.color);div.title=item.description;
    div.innerHTML=itemIcon(id)+'<div><b>'+item.name+'</b><small>'+ITEM_TYPES[id]+'</small></div><span>Lv.'+n+'</span>';return div;
  }));
  if(!Object.keys(g.inventory).length)$('inventory').innerHTML='<p class="empty">아직 가방이 비어 있어요.<br>첫 강화로 조합을 시작해 보세요.</p>';
}
function drawReward(){
  label('reward-info','Lv.'+g.level+' · 선택 '+g.pending+'번 남음 · 하나를 골라요');
  $('reward-cards').replaceChildren(...g.choices.map(id=>{
    const item=UPGRADES[id],n=(g.inventory[id]||0)+1,b=document.createElement('button'),fusion=fusionBenefit(g,id);b.className='reward-card';b.dataset.upgrade=id;b.style.setProperty('--item-color',item.color);
    b.innerHTML=itemIcon(id)+'<div><div class="reward-heading"><b>'+item.name+'</b><small>Lv.'+(n-1)+' → '+n+'</small></div><div class="reward-type">'+ITEM_TYPES[id]+'</div></div><strong class="benefit">'+upgradeBenefit(g,id)+'</strong><span class="description">'+item.description+'</span>'+(fusion?'<div class="reward-fusion'+(fusion.complete?' complete':'')+'">✦ '+fusion.text+'</div>':'');
    b.addEventListener('click',()=>{if(chooseUpgrade(g,id)){phaseShown='';sync();if(g.phase==='reward')$('reward-cards').firstElementChild?.focus({preventScroll:true});else canvas.focus({preventScroll:true});}});return b;
  }));
}
function sync(){
  $('start-screen').hidden=started||helpOpen;$('help-screen').hidden=!helpOpen;
  for(const [id,phase]of [['reward-screen','reward'],['next-screen','next'],['pause-screen','paused']])$(id).hidden=helpOpen||!started||g.phase!==phase;
  $('end-screen').hidden=helpOpen||!started||!['dead','won'].includes(g.phase);
  const view=phaseView(g),summary=enemySummary(g);
  document.body.dataset.turnKind=helpOpen?'paused':started?view.kind:'title';
  label('phase-name',!started?'모험 준비':aimControl.pending?'조준 고정 · 발사 준비':view.label);label('phase-hint',!started?'한 발로 시작하는 탈출 작전':aimControl.pending?'선택한 방향으로 곧 발사':g.phase==='aim'&&!g.useKing?'← → 조절 · Shift 정밀조준':view.hint);label('volley-count','탄환 '+(3+(g.inventory.pouch||0))+'개');
  label('stage',g.stage===3?'마지막 전투':'전투 '+(g.stage+1)+' / 4');label('turn',g.turn+'턴');
  label('hp',Math.ceil(g.hp)+' / '+g.maxHp);$('hp-bar').style.width=g.hp/g.maxHp*100+'%';$('hp-bar').style.background=g.hp/g.maxHp<.3?'#c57061':'';
  label('level','Lv.'+g.level);label('xp',g.xp+' / '+xpNeeded(g.level)+' XP');$('xp-bar').style.width=Math.min(100,g.xp/xpNeeded(g.level)*100)+'%';
  label('best',g.bestCombo+' HIT');label('kills',g.kills);label('shots',g.shots);label('seed-label','SEED '+g.seed);
  label('live-combo',g.combo);label('live-damage',Math.ceil(g.turnDamage));
  label('shot-status',g.phase==='flight'?'타격 집계 중':g.shots?'최근 발사 결과':'첫 발을 기다리는 중');
  label('enemy-count','적 '+summary.count+'마리');label('threat',g.phase==='enemy'?'반격 진행 중':summary.count===0?'전투 클리어':summary.damage?'생존 시 −'+summary.damage+' HP':'사격·접촉 없음');
  $('threat').parentElement.classList.toggle('danger',summary.damage>0);
  const target=g.enemies.find(e=>e.id===inspectedId&&!e.dead);label('target-info',target?FOES[target.type].name+' · 체력 '+Math.ceil(target.hp)+'/'+target.maxHp+' · '+enemyIntent(g,target).label:'적을 가리키면 행동과 체력을 확인할 수 있어요.');
  $('fire').disabled=!started||g.phase!=='aim'||aimControl.pending;$('recall').disabled=!started||g.phase!=='flight'||g.flightTime<.6;
  $('king').disabled=!started||g.phase!=='aim'||g.charge<100||aimControl.pending;$('king').setAttribute('aria-pressed',String(g.useKing));$('king').classList.toggle('ready',g.phase==='aim'&&g.charge>=100);$('king').style.setProperty('--charge',g.charge*3.6+'deg');
  label('king-label',g.useKing?'준비됨 · 취소':'왕새총 준비');label('charge',g.charge>=100?'충전 완료!':Math.floor(g.charge)+' / 100');$('charge-bar').style.width=g.charge+'%';
  label('fire-label',aimControl.pending?'조준 고정 중':g.phase==='flight'?'탄환 이동 중':g.phase==='enemy'?'적 행동 중':g.phase==='reward'?'강화 선택 중':g.useKing?'왕새총 발사':'새총 발사');
  label('fire-hint',aimControl.pending?'선택한 방향으로 곧 발사':g.phase==='aim'?(g.useKing?'왕짱돌이 함께 나가요':'각도를 골랐다면 발사!'):'다음 차례를 기다려요');
  $('pause').disabled=helpOpen||!started||!['aim','flight','enemy','paused'].includes(g.phase);
  label('notice',(g.unlockMessage&&g.unlockUntil>g.time?g.unlockMessage:g.notice)||view.hint);
  if(stageShown!==g.stage){stageShown=g.stage;$('route').replaceChildren(...Array.from({length:4},(_,i)=>{const dot=document.createElement('i');dot.className=i===g.stage?'current':i<g.stage?'done':'';return dot;}));$('route').setAttribute('aria-label','네 전투 중 '+(g.stage+1)+'번째');}
  const build=JSON.stringify(g.inventory);if(build!==buildShown){buildShown=build;drawBuild();}
  if(phaseShown!==g.phase){
    phaseShown=g.phase;document.body.dataset.phase=started?g.phase:'title';
    if(g.phase==='reward'){drawReward();$('reward-cards').firstElementChild?.focus({preventScroll:true});}
    if(g.phase==='next'){label('clear-info','최고 '+g.bestCombo+'연쇄 · 강화 '+Object.values(g.inventory).reduce((a,b)=>a+b,0)+'개 · 다음은 '+(g.stage===2?'아공간의 수호자':'새로운 적 배치')+'예요.');$('next').focus({preventScroll:true});}
    if(['won','dead'].includes(g.phase)){label('end-kicker',g.phase==='won'?'아공간 탈출 성공':'다른 각도, 다른 조합');label('end-title',g.phase==='won'?'버터, 아공간 탈출!':'다음 한 발은 다를 거야');label('end-info',(g.stage+1)+'번째 전투 · '+g.shots+'번 발사 · '+g.kills+'마리 처치 · 최고 '+g.bestCombo+'연쇄');$('replay').focus({preventScroll:true});}
  }
  canvas.dataset.combo=g.combo;canvas.dataset.balls=g.balls.length;canvas.dataset.aimPending=String(aimControl.pending);
}
function frame(now){
  const dt=last?Math.min((now-last)/1000,1/30):0;last=now;
  if(started){
    if(g.phase==='aim'&&!helpOpen){
      if(aimKeys.size&&!aimControl.pending){const before=keyHoldTime;keyHoldTime+=dt;const held=Math.max(0,keyHoldTime-.18)-Math.max(0,before-.18),direction=Number(aimKeys.has('ArrowRight'))-Number(aimKeys.has('ArrowLeft'));nudgeAim(aimControl,g,direction*held*(fineAim?AIM_CONTROL.fineSpeed:AIM_CONTROL.keySpeed));}
      if(advanceAim(aimControl,g,dt))commitShot();
    }else stopAiming();
    const before=g.combo;tick(g,dt);if(g.combo>before)audio.play(['hit']);sync();
  }
  renderGame(ctx,g,images,{reduced:reduced.matches,selectedId:inspectedId});requestAnimationFrame(frame);
}
async function load(src,target,key){const img=new Image();return new Promise(resolve=>{let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);if(ok)target[key]=img;resolve(ok);};const timeout=setTimeout(()=>finish(false),8000);img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;});}
async function boot(){
  const tasks=[load(BUTTER_POSTER,images.butter,'poster')];for(const key of ['idle','shoot','high'])tasks.push(load(BUTTER_ORIGINAL.clips[key].image,images.butter,key));
  for(const type of Object.keys(images.monsters))for(const key of ['idle','walk','attack','die'])tasks.push(load(STAGE_ART.monsters[type].clips[key].image,images.monsters[type],key));
  for(const [key,b]of Object.entries(STAGE_ART.backgrounds))tasks.push(load(b.image,images.backgrounds,key));
  const result=await Promise.all(tasks);ready=true;document.body.dataset.ready='true';$('start').disabled=false;label('start','새총을 들고 출발 →');label('load-status',result.every(Boolean)?'준비 완료 · 마우스 조준, 클릭 발사 / 터치는 조준 후 발사 버튼':'일부 이미지를 불러오지 못했어요. 기본 표시로 플레이할 수 있어요.');
}
if(params.get('test')==='1')window.__bonk48={get game(){return g;},start,tick,fire,aimAt,recall,toggleKing,chooseUpgrade,nextStage,images,render:()=>renderGame(ctx,g,images)};
drawBuild();sync();requestAnimationFrame(frame);boot().catch(e=>{console.error(e);label('load-status','준비 오류 · 새로고침해 주세요.');});
