import {createGame,tick,chooseReward,enterNextRoom,STAGES} from './platformer-engine.js';
import {renderGame} from './platformer-renderer.js';
import {BUTTER_ORIGINAL,BUTTER_POSTER} from './butter-original-motion.js';
import {STAGE_ART} from './assets/trickcal-stage37/atlas.js';
import {ITEMS} from './survivor-engine.js';
const $=id=>document.getElementById(id),canvas=$('game-canvas'),ctx=canvas.getContext('2d');
let game=createGame(),started=false,ready=false,last=0,accumulator=0,shownPhase='',shownRoom=-1;
const keys=new Set(),touch=new Map(),pending=new Set(),images={butter:{},monsters:{fan:{},archer:{},ghost:{}},backgrounds:{}},reduced=matchMedia('(prefers-reduced-motion: reduce)');
const bindings={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',KeyW:'jump',ArrowUp:'jump',KeyJ:'attack',KeyX:'attack',ShiftLeft:'dash',ShiftRight:'dash',KeyK:'dash',KeyE:'skill',KeyF:'interact',ArrowDown:'interact',KeyS:'interact'};
function input(){const value={};for(const key of keys){const action=bindings[key]||key;value[action]=true;}for(const action of touch.values())value[action]=true;for(const action of pending)value[action+'Pressed']=true;value.jumpReleased=pending.has('jumpRelease');return value;}
function clearInput(){keys.clear();touch.clear();pending.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));if(game)game.previous={};}
function focusGame(){canvas.focus({preventScroll:true});}
function start(){if(!ready)return;clearInput();game=createGame();started=true;shownPhase='';shownRoom=-1;accumulator=0;syncUI();focusGame();}
function pause(){if(!started||game.phase!=='playing')return;game.phase='paused';clearInput();syncUI();$('resume-button').focus({preventScroll:true});}
function resume(){if(game.phase!=='paused')return;game.phase='playing';clearInput();syncUI();focusGame();}
$('start-button').addEventListener('click',start);$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);
document.querySelectorAll('.restart').forEach(b=>b.addEventListener('click',start));
$('touch-toggle').addEventListener('click',()=>{const show=document.body.classList.toggle('show-touch');$('touch-toggle').setAttribute('aria-pressed',String(show));});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'){e.preventDefault();game.phase==='paused'?resume():pause();return;}
  if(bindings[e.code]&&started&&game.phase==='playing'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();keys.add(e.code);if(!e.repeat)pending.add(bindings[e.code]);}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(bindings[e.code]==='jump')pending.add('jumpRelease');});
window.addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!started||game.phase!=='playing')return;e.preventDefault();focusGame();canvas.setPointerCapture(e.pointerId);touch.set(e.pointerId,'attack');pending.add('attack');});
function releasePointer(e){if(touch.get(e.pointerId)==='jump')pending.add('jumpRelease');touch.delete(e.pointerId);for(const b of document.querySelectorAll('[data-control]'))b.classList.toggle('pressed',[...touch.values()].includes(b.dataset.control));}
for(const event of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,releasePointer);
for(const button of document.querySelectorAll('[data-control]'))button.addEventListener('pointerdown',e=>{if(!started||game.phase!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);touch.set(e.pointerId,button.dataset.control);pending.add(button.dataset.control);button.classList.add('pressed');});
function syncUI(){
  $('start-screen').hidden=started;$('hud').hidden=!started;$('skill-hud').hidden=!started;
  $('pause-screen').hidden=game.phase!=='paused';$('reward-screen').hidden=game.phase!=='reward';$('end-screen').hidden=!['dead','won'].includes(game.phase);
  $('hp-text').textContent=`${Math.ceil(game.stats.hp)} / ${game.stats.maxHp}`;$('hp-fill').style.width=`${game.stats.hp/game.stats.maxHp*100}%`;
  $('grades').textContent=`저학년 ${game.stats.lowerGrade} · 고학년 ${game.stats.upperGrade}`;$('coins').textContent=game.coins;
  $('enemy-count').textContent=game.room.cleared?'출구 개방':`남은 적 ${game.room.enemies.filter(e=>e.hp>0).length}`;
  $('dash-label').textContent=game.player.dashCooldown>0?`${game.player.dashCooldown.toFixed(1)}s`:'준비';
  $('skill-label').textContent=game.player.skillTime>0?'무적':game.player.skillCooldown>0?`${Math.ceil(game.player.skillCooldown)}s`:'준비';
  $('toast').textContent=game.noticeTime>0?game.notice:'';
  if(shownRoom!==game.room.index){shownRoom=game.room.index;$('room-label').textContent=`0${shownRoom+1} / 0${STAGES}`;$('route').replaceChildren(...Array.from({length:STAGES},(_,i)=>{const dot=document.createElement('i');dot.className='route-dot '+(i===shownRoom?'active':i<shownRoom?'done':'');return dot;}));}
  if(shownPhase!==game.phase){shownPhase=game.phase;document.body.dataset.phase=game.phase;
    if(game.phase==='reward'){
      clearInput();$('reward-cards').replaceChildren(...game.choices.map((id,i)=>{const item=ITEMS[id],button=document.createElement('button');button.className='reward-card';button.dataset.item=id;button.innerHTML=`<small>선택 ${i+1}</small><svg aria-hidden="true"><use href="./assets/ui-icons.svg#${item.icon}"></use></svg><b>${item.name}</b><span>${item.description}</span>`;button.addEventListener('click',()=>{if(chooseReward(game,id)){clearInput();syncUI();focusGame();}});return button;}));$('reward-cards').firstElementChild?.focus({preventScroll:true});
    }
    if(game.phase==='dead'||game.phase==='won'){clearInput();const won=game.phase==='won';$('end-kicker').textContent=won?'ESCAPED!':'ONE MORE TRY';$('end-title').textContent=won?'버터, 탈출 성공!':'조금만 더 가면 되는데…';$('end-summary').textContent=`${game.room.index+1}구역 · ${game.stats.kills}마리 처치 · 아이템 ${game.stats.itemsTaken}개 · ${Math.floor(game.elapsed/60)}분 ${Math.floor(game.elapsed%60)}초`;$('end-screen').querySelector('button').focus({preventScroll:true});}
  }
  canvas.dataset.x=game.player.x.toFixed(2);canvas.dataset.y=game.player.y.toFixed(2);canvas.dataset.facing=game.player.facing;canvas.dataset.butterRenderer='original36-mirrored37';
}
function frame(ms){
  const dt=Math.min(.1,(ms-(last||ms))/1000);last=ms;
  if(started&&game.phase==='playing'){accumulator+=dt;while(accumulator>=1/120){tick(game,input(),1/120);pending.clear();accumulator-=1/120;if(game.phase!=='playing'){accumulator=0;break;}}}
  else{accumulator=0;if(!started&&!reduced.matches){game.time+=dt;game.player.gait.clock+=dt;}}
  renderGame(ctx,game,images,{started,reducedMotion:reduced.matches});syncUI();requestAnimationFrame(frame);
}
function loadImage(src,target,key){return new Promise(resolve=>{const image=new Image();let done=false;const finish=ok=>{if(done)return;done=true;clearTimeout(timeout);if(ok)target[key]=image;resolve(ok);};const timeout=setTimeout(()=>finish(false),12000);image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=src;});}
async function boot(){
  let completed=0;const tasks=[];const add=(src,target,key)=>tasks.push(()=>loadImage(src,target,key).then(ok=>{completed++;$('load-status').textContent=`원작 에셋 ${completed} / ${tasks.length}`;return ok;}));
  add(BUTTER_POSTER,images.butter,'poster');for(const [key,c]of Object.entries(BUTTER_ORIGINAL.clips))add(c.image,images.butter,key);
  for(const [key,m]of Object.entries(STAGE_ART.monsters)){for(const [clip,c]of Object.entries(m.clips))add(c.image,images.monsters[key],clip);add(`./assets/trickcal-stage37/${key}-poster.png`,images.monsters[key],'poster');}
  for(const [key,b]of Object.entries(STAGE_ART.backgrounds))add(b.image,images.backgrounds,key);
  const results=await Promise.all(tasks.map(t=>t())),failed=results.filter(x=>!x).length;ready=true;document.body.dataset.ready='true';$('start-button').disabled=false;$('start-button').textContent='아공간으로 출발 →';$('load-status').textContent=failed?`${failed}개 이미지를 불러오지 못했어요. 기본 표시로 플레이할 수 있어요.`:'준비 완료 · 새총은 공격 버튼을 누르고 있으면 계속 발사해요.';
}
requestAnimationFrame(frame);boot().catch(error=>{$('load-status').textContent='준비 중 오류가 났어요. 새로고침해 주세요.';console.error(error);});
// Only the explicit local test URL exposes fixtures; normal play has no debug UI.
if(new URLSearchParams(location.search).get('test')==='1')window.__platformer37={get game(){return game;},start,tick,chooseReward,enterNextRoom,images,render:()=>renderGame(ctx,game,images,{started:true,reducedMotion:true})};
