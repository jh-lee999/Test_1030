import {createGame,tick,chooseReward,enterNextRoom,chooseRoute,routeOptions,interactRoom,STAGES} from './platformer-engine.js?v=38';
import {renderGame} from './platformer-renderer.js?v=38';
import {BIOMES,ROOM_TYPES} from './platformer-world.js?v=38';
import {BUTTER_ORIGINAL,BUTTER_POSTER} from './butter-original-motion.js';
import {STAGE_ART} from './assets/trickcal-stage37/atlas.js';
import {ITEMS} from './survivor-engine.js';
const $=id=>document.getElementById(id),canvas=$('game-canvas'),ctx=canvas.getContext('2d');
let game=createGame(),started=false,ready=false,last=0,accumulator=0,shownPhase='',shownRoom=-1;
const urlSeed=new URLSearchParams(location.search).get('seed');if(urlSeed)$('seed-input').value=urlSeed.slice(0,48);
const keys=new Set(),touch=new Map(),pending=new Set(),images={butter:{},monsters:{fan:{},archer:{},ghost:{}},backgrounds:{}},reduced=matchMedia('(prefers-reduced-motion: reduce)');
const bindings={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',Space:'jump',KeyW:'jump',ArrowUp:'jump',KeyJ:'attack',KeyX:'attack',ShiftLeft:'dash',ShiftRight:'dash',KeyK:'dash',KeyE:'skill',KeyF:'interact',ArrowDown:'interact',KeyS:'interact'};
function input(){const value={};for(const key of keys){const action=bindings[key]||key;value[action]=true;}for(const action of touch.values())value[action]=true;for(const action of pending)value[action+'Pressed']=true;value.jumpReleased=pending.has('jumpRelease');return value;}
function clearInput(){keys.clear();touch.clear();pending.clear();document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));if(game)game.previous={};}
function focusGame(){canvas.focus({preventScroll:true});}
function start(seed=$('seed-input').value.trim()||Date.now()){if(!ready)return;clearInput();game=createGame(seed);started=true;shownPhase='';shownRoom=-1;accumulator=0;const url=new URL(location.href);url.searchParams.set('seed',game.seedLabel);history.replaceState(null,'',url);syncUI();focusGame();}
function pause(){if(!started||game.phase!=='playing')return;game.phase='paused';clearInput();syncUI();$('resume-button').focus({preventScroll:true});}
function resume(){if(game.phase!=='paused')return;game.phase='playing';clearInput();syncUI();focusGame();}
$('start-button').addEventListener('click',()=>start());$('pause-button').addEventListener('click',pause);$('resume-button').addEventListener('click',resume);
document.querySelectorAll('.restart').forEach(b=>b.addEventListener('click',()=>{$('seed-input').value='';start();}));
document.querySelectorAll('.replay').forEach(b=>b.addEventListener('click',()=>start(game.seedLabel)));
function toggleMap(){if(!started)return;if(game.phase==='map'){game.phase='playing';syncUI();focusGame();}else if(game.phase==='playing'){game.phase='map';clearInput();syncUI();$('map-close').focus({preventScroll:true});}}
$('map-button').addEventListener('click',toggleMap);$('map-close').addEventListener('click',toggleMap);
$('touch-toggle').addEventListener('click',()=>{const show=document.body.classList.toggle('show-touch');$('touch-toggle').setAttribute('aria-pressed',String(show));});
window.addEventListener('keydown',e=>{
  if(e.code==='KeyM'&&started){e.preventDefault();toggleMap();return;}
  if(e.code==='Escape'){e.preventDefault();game.phase==='map'?toggleMap():game.phase==='paused'?resume():pause();return;}
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
  $('map-screen').hidden=!['map','route'].includes(game.phase);
  $('hp-text').textContent=`${Math.ceil(game.stats.hp)} / ${game.stats.maxHp}`;$('hp-fill').style.width=`${game.stats.hp/game.stats.maxHp*100}%`;
  $('grades').textContent=`저학년 ${game.stats.lowerGrade} · 고학년 ${game.stats.upperGrade}`;$('coins').textContent=game.coins;
  $('enemy-count').textContent=game.room.rewardTaken?'출구 개방':game.room.shrine?`${ROOM_TYPES[game.room.type].name} · F로 이용`:`남은 적 ${game.room.enemies.filter(e=>e.hp>0).length}`;
  $('dash-label').textContent=game.player.dashCooldown>0?`${game.player.dashCooldown.toFixed(1)}s`:'준비';
  $('skill-label').textContent=game.player.skillTime>0?'무적':game.player.skillCooldown>0?`${Math.ceil(game.player.skillCooldown)}s`:'준비';
  $('toast').textContent=game.noticeTime>0?game.notice:'';
  if(shownRoom!==game.room.index){shownRoom=game.room.index;$('room-label').textContent=`0${shownRoom+1} / 0${STAGES}`;$('route').replaceChildren(...Array.from({length:STAGES},(_,i)=>{const dot=document.createElement('i');dot.className='route-dot '+(i===shownRoom?'active':i<shownRoom?'done':'');return dot;}));}
  if(shownPhase!==game.phase){shownPhase=game.phase;document.body.dataset.phase=game.phase;
    if(game.phase==='map'||game.phase==='route'){clearInput();drawWorldMap();if(game.phase==='route')$('world-map').querySelector('button:not(:disabled)')?.focus({preventScroll:true});}
    if(game.phase==='reward'){
      clearInput();$('reward-cards').replaceChildren(...game.choices.map((id,i)=>{const item=ITEMS[id],button=document.createElement('button');button.className='reward-card';button.dataset.item=id;button.innerHTML=`<small>선택 ${i+1}</small><svg aria-hidden="true"><use href="./assets/ui-icons.svg#${item.icon}"></use></svg><b>${item.name}</b><span>${item.description}</span>`;button.addEventListener('click',()=>{if(chooseReward(game,id)){clearInput();syncUI();focusGame();}});return button;}));$('reward-cards').firstElementChild?.focus({preventScroll:true});
    }
    if(game.phase==='dead'||game.phase==='won'){clearInput();const won=game.phase==='won';$('end-kicker').textContent=won?'ESCAPED!':'ONE MORE TRY';$('end-title').textContent=won?'버터, 탈출 성공!':'조금만 더 가면 되는데…';$('end-summary').textContent=`${game.room.index+1}구역 · ${game.stats.kills}마리 처치 · 아이템 ${game.stats.itemsTaken}개 · ${Math.floor(game.elapsed/60)}분 ${Math.floor(game.elapsed%60)}초`;$('end-screen').querySelector('button').focus({preventScroll:true});}
  }
  canvas.dataset.x=game.player.x.toFixed(2);canvas.dataset.y=game.player.y.toFixed(2);canvas.dataset.facing=game.player.facing;canvas.dataset.butterRenderer='original36-mirrored37';
}
function drawWorldMap(){
  const selecting=game.phase==='route',available=new Set(selecting?routeOptions(game).map(n=>n.id):[]),world=game.world;
  $('map-title').textContent=selecting?'다음에는 어디로 갈까?':'아공간 지도';$('map-instruction').textContent=selecting?'빛나는 방을 선택하세요. 선택하지 않은 갈래는 이번 여정에서 지나갑니다.':'출구에서 다음 갈림길을 선택할 수 있어요. 지도 확인 중에는 전투가 멈춰요.';
  $('map-close').hidden=selecting;$('seed-label').textContent=`SEED ${game.seedLabel} · 생성 규칙 v38`;
  const positions=new Map(world.nodes.map(n=>{const layer=world.nodes.filter(v=>v.depth===n.depth);return[n.id,{x:6+n.depth/(STAGES-1)*88,y:layer.length===1?50:18+n.lane/(layer.length-1)*64}];}));
  const map=$('world-map');map.replaceChildren();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 1000 300');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  for(const node of world.nodes)for(const id of node.next){const a=positions.get(node.id),b=positions.get(id),line=document.createElementNS(svg.namespaceURI,'line');for(const [key,value]of Object.entries({x1:a.x*10,y1:a.y*3,x2:b.x*10,y2:b.y*3}))line.setAttribute(key,value);line.setAttribute('class',node.id===game.currentNodeId&&available.has(id)?'available-edge':node.completed&&world.nodes.find(n=>n.id===id).visited?'visited-edge':'');svg.append(line);}map.append(svg);
  for(const node of world.nodes){const pos=positions.get(node.id),type=ROOM_TYPES[node.type],button=document.createElement('button');button.className='map-node'+(node.visited?' visited':'')+(node.id===game.currentNodeId?' current':'')+(available.has(node.id)?' available':'');button.style.left=`${pos.x}%`;button.style.top=`${pos.y}%`;button.style.setProperty('--node-color',type.color);button.disabled=!available.has(node.id);button.dataset.node=node.id;button.setAttribute('aria-label',`${node.depth+1}단계 ${type.name}, ${BIOMES[node.biome].name}, ${type.reward}`);button.title=`${BIOMES[node.biome].name} · ${type.reward}`;button.innerHTML=`<b>${type.symbol} ${type.name}</b><small>${BIOMES[node.biome].name}</small>`;button.addEventListener('click',()=>{if(chooseRoute(game,node.id)){clearInput();syncUI();focusGame();}});map.append(button);}
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
if(new URLSearchParams(location.search).get('test')==='1')window.__platformer37={get game(){return game;},start,tick,chooseReward,enterNextRoom,chooseRoute,interactRoom,images,render:()=>renderGame(ctx,game,images,{started:true,reducedMotion:true})};
