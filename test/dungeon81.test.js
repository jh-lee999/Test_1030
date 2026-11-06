import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as A from '../dungeon80-nav.js';
import * as B from '../dungeon81-nav.js';
import * as E80 from '../dungeon80-engine.js';
import * as E81 from '../dungeon81-engine.js';
import * as S from '../dungeon80-save.js';
import {links} from '../dungeon80-world.js';
import {cachedContext,cacheStats,clearCaches} from '../dungeon81-cache.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('CPU canvas fallback cache has a hard budget, hits, eviction and real clear',()=>{
 const previous=globalThis.document;let copies=0,draws=0;
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){copies++;}};}};}};
 try{clearCaches();const ctx={drawImage(){draws++;}},c=cachedContext(ctx),image={naturalWidth:2048,naturalHeight:2048};
  c.drawImage(image,0,0,384,384,0,0,80,80);c.drawImage(image,0,0,384,384,0,0,80,80);assert.equal(copies,1);assert.equal(draws,2);
  for(let i=1;i<500;i++)c.drawImage(image,i*2,0,384,384,0,0,80,80);
  assert(cacheStats().bytes<=cacheStats().limit);assert(cacheStats().entries<=192);assert(cacheStats().hits>=1);
  const before=copies;c.drawImage(image,0,0,384,384,0,0,80,80);assert.equal(copies,before+1);clearCaches();assert.equal(cacheStats().bytes,0);assert.equal(cacheStats().entries,0);
 }finally{clearCaches();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('81 archives exact80, retains same rules/save/art, changes only steering import',()=>{
 assert.equal(createHash('sha256').update(read('dungeon80.html')).digest('hex'),'825e86ecf8767636e390d0092b57cb122cb80cba65379954a110a93fd2fc28d3');
 assert.match(read('dungeon81.html'),/dungeon81.js\?v=81/);
 const normalized=read('dungeon81-engine.js').replace(/^\/\/[^\n]*\nimport \{steer\} from '\.\/dungeon81-nav.js';\n/,'').replace('moveBody,nearestFree','moveBody,steer,nearestFree');
 assert.equal(normalized.trimEnd(),read('dungeon80-engine.js').trimEnd());
 assert.match(read('dungeon81.js'),/dungeon80-save.js/);
 assert(!read('dungeon81.js').includes('butter.dungeon81.v1'));
 for(const [path,hash]of Object.entries(JSON.parse(read('docs/dungeon80-diagnostics.json')).sourceHashes))assert.equal(createHash('sha256').update(read(path==='index.html'?'dungeon80.html':path)).digest('hex'),hash,'preserved80 '+path);
});
test('navigation has exact routes and stable ties across shapes, radii, mutations',()=>{
 for(let seed=0;seed<12;seed++){
  const g=E80.createGame('perf81-'+seed);
  for(const r of g.rooms.filter(r=>r.type==='combat').slice(0,4)){
   const from=g.rooms.find(q=>links(g,q).some(l=>l.to===r.id));g.room=from.id;from.cleared=true;g.transition=0;g.phase='playing';E80.enterRoom(g,links(g).find(l=>l.to===r.id).dir);
   const b=A.boundsFor(r),points=[...r.enemies.map(e=>({x:e.x,y:e.y})),{x:b.left+40,y:b.top+40},{x:b.right-40,y:b.bottom-40},{x:(b.left+b.right)/2,y:(b.top+b.bottom)/2}];
   for(const radius of [16,24,29,32])for(let i=0;i<points.length;i++)assert.deepEqual(B.findPath(r,points[i],points.at(-1),radius),A.findPath(r,points[i],points.at(-1),radius));
   for(const o of r.obstacles){if(o.hp!==0){o.hp=0;assert.deepEqual(B.findPath(r,points[0],points.at(-1)),A.findPath(r,points[0],points.at(-1)));break;}}
   r.obstacles.push({x:b.left+90,y:b.top+80,w:40,h:40,kind:'rock',hp:3});assert.deepEqual(B.findPath(r,points[0],points.at(-1)),A.findPath(r,points[0],points.at(-1)));
   r.obstacles.at(-1).x+=40;assert.deepEqual(B.findPath(r,points[0],points.at(-1)),A.findPath(r,points[0],points.at(-1)));
  }
 }
});
test('same native engine inputs produce byte-identical combat/RNG and resume saves',()=>{
 for(const seed of ['lag80','replay81','wide81']){
  const a=E80.createGame(seed),b=structuredClone(a),r=a.rooms.find(r=>r.type==='combat'&&r.shape!=='normal')||a.rooms.find(r=>r.type==='combat');
  for(const [g,E]of [[a,E80],[b,E81]]){const from=g.rooms.find(q=>links(g,q).some(l=>l.to===r.id));g.room=from.id;from.cleared=true;g.transition=0;E.enterRoom(g,links(g).find(l=>l.to===r.id).dir);g.player.invuln=999;}
  for(let i=0;i<1440;i++){const input={x:Math.sin(i/89),y:Math.cos(i/131),aim:{x:Math.cos(i/61),y:Math.sin(i/61)},fire:i%180<120};E80.tick(a,1/120,input);E81.tick(b,1/120,input);if(i%120===0)assert.deepEqual(b,a);}
  assert.deepEqual(b,a);assert(S.validRun(b));
 }
});
