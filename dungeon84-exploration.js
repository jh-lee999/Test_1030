import {links} from './dungeon84-world.js';
import {ROOM_NAMES} from './dungeon84-content.js';
const hidden=r=>r.enabled===false||['secret','supersecret','archive'].includes(r.type)&&!r.unlocked;
// A journal, not a wallhack: only facts the player has physically visited.
export function roomMemory(g,r){
 if(!r?.visited||hidden(r))return [];
 const facts=[],gifts=[r.pedestal,...(r.artifacts||[])].filter(q=>q&&!q.taken).length,chests=(r.chests||[]).filter(q=>!q.opened).length;
 if(gifts)facts.push({kind:'gift',mark:'◆',text:'두고 온 선물 '+gifts});
 if(chests)facts.push({kind:'chest',mark:'▣',text:'황금상자 '+chests+(!r.cleared?' · 전투 후 개방':'')+(g.keys<1?' · 열쇠 없음':'')});
 const counts={};for(const p of r.pickups||[])counts[p.kind]=(counts[p.kind]||0)+1;
 for(const [kind,mark,name]of [['heart','♥','회복'],['shield','◈','보호막'],['key','⚿','열쇠'],['bomb','●','폭탄'],['coin','·','동전']])if(counts[kind])facts.push({kind,mark,text:name+' '+counts[kind]});
 if(r.type==='shop'&&(r.stock||[]).some(s=>!s.sold))facts.push({kind:'shop',mark:'$',text:'남은 상점 재고'});
 return facts;
}
export function knownRoute(g,target){
 const destination=g.rooms[target];if(!destination?.visited||hidden(destination))return null;
 if(target===g.room)return [];
 if(!g.rooms[g.room].cleared)return null;
 const previous=new Map([[g.room,null]]),queue=[g.room];
 for(const id of queue){if(id===target)break;for(const l of links(g,g.rooms[id])){const r=g.rooms[l.to];if(previous.has(r.id)||!r.visited||!r.cleared||hidden(r)||r.type==='treasure'&&!r.unlocked)continue;previous.set(r.id,id);queue.push(r.id);}}
 if(!previous.has(target))return null;const route=[];for(let id=target;previous.get(id)!==null;id=previous.get(id)){const from=previous.get(id);route.unshift({from,to:id,dir:links(g,g.rooms[from]).find(l=>l.to===id).dir});}return route;
}
export function journal(g){return g.rooms.filter(r=>r.visited&&!hidden(r)).map(r=>({id:r.id,name:ROOM_NAMES[r.type],facts:roomMemory(g,r),route:knownRoute(g,r.id)})).filter(r=>r.facts.length);}
export function mapJournalHTML(g,target=null){
 const rows=journal(g);return '<section class="map-journal"><h3>두고 온 것들</h3><p>직접 방문한 방만 기록해요. 목적지를 고르면 문 방향만 안내해요.</p>'+ (rows.length?rows.map(r=>'<button data-route-to="'+r.id+'" '+(r.route===null?'disabled':'')+' class="'+(r.id===target?'selected':'')+'"><b>'+r.facts[0].mark+' '+r.name+'</b><span>'+r.facts.map(f=>f.text).join(' · ')+'</span><small>'+(r.route===null?'전투 정리 후 안내':r.route.length?r.route.length+'개 문 건너기':'현재 방')+'</small></button>').join(''):'<p class="journal-empty">지금까지 방문한 방에는 남겨 둔 보상이 없어요.</p>')+(target!==null?'<button data-route-cancel>길 안내 지우기</button>':'')+'</section>';
}
export function routeHint(g,target){
 if(target===null||!g.rooms[target]?.visited||!roomMemory(g,g.rooms[target]).length)return null;
 const route=knownRoute(g,target);if(route===null)return {text:'전투 정리 후 길 안내',dir:null};
 const name=ROOM_NAMES[g.rooms[target].type],mark=roomMemory(g,g.rooms[target])[0].mark;
 return {text:route.length?({n:'↑',s:'↓',e:'→',w:'←'})[route[0].dir]+' '+mark+' '+name+' · '+route.length+'문':'도착 · '+mark+' 보상 확인',dir:route[0]?.dir||null};
}
