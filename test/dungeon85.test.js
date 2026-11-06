import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as E from '../dungeon84-engine.js';
import * as S from '../dungeon84-save.js';
import * as W from '../dungeon84-world.js';
import {doorState,openingFor} from '../dungeon85-doors.js';
import {cachedContext,cacheStats,clearCaches,cachedLabel,primeImage} from '../dungeon85-cache.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('85 is presentation-only and archives exact84, without modifying84 save/engine/world/source pins',()=>{
 assert.match(read('dungeon85.html'),/dungeon85.js\?v=85/);assert.match(read('dungeon85.js'),/dungeon84-save.js/);assert.match(read('dungeon85.js'),/dungeon84-engine.js\?v=84/);assert.equal(createHash('sha256').update(read('dungeon84.html')).digest('hex'),'8f20d51a3cbc25f89d8021405c28f9f99b2707610141e7f852b18a73740d9543');
 const redirected=['tools/check-dungeon84-browser.mjs','tools/check-dungeon84-rules-browser.mjs','tools/check-dungeon84-crates-browser.mjs','tools/check-dungeon84-decisions-browser.mjs','tools/playtest-dungeon84.mjs','tools/check-dungeon84-performance.mjs'];
 for(const [file,hash]of Object.entries(JSON.parse(read('docs/dungeon84-diagnostics.json')).sourceHashes)){let source=read(file==='index.html'?'dungeon84.html':file);if(file==='test/dungeon84.test.js')source=source.replace("read('dungeon84.html'),/dungeon84","read('index.html'),/dungeon84");if(redirected.includes(file))source=source.replaceAll("root+'/dungeon84.html?test=1","root+'/?test=1");assert.equal(createHash('sha256').update(source).digest('hex'),hash,file);}
});
test('cached source cells never use transferable bitmaps and survive LRU churn/clear',()=>{
 const doc=globalThis.document,off=globalThis.OffscreenCanvas;let copies=0,draws=0;globalThis.OffscreenCanvas=class{constructor(){throw Error('broken bitmap platform');}};globalThis.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){copies++;}};}};}};
 try{clearCaches();const c=cachedContext({drawImage(tile){assert(tile.width>0&&tile.height>0);draws++;}}),image={naturalWidth:2048,naturalHeight:2048};for(let i=0;i<600;i++)c.drawImage(image,i*2,0,384,384,0,0,80,80);assert(copies>0&&draws===600);assert(cacheStats().bytes<=cacheStats().limit);clearCaches();c.drawImage(image,0,0,384,384,0,0,80,80);assert.equal(draws,601);}finally{clearCaches();if(doc===undefined)delete globalThis.document;else globalThis.document=doc;if(off===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=off;}
});
test('failed cache allocation falls back to the ORIGINAL source draw, not an invisible tile',()=>{
 const old=globalThis.document;globalThis.document={createElement(){return {width:0,height:0,getContext(){return null;}};}};try{clearCaches();const im={naturalWidth:1024,naturalHeight:1024},calls=[],c=cachedContext({drawImage(...a){calls.push(a);}});c.drawImage(im,0,0,384,384,10,20,80,80);assert.equal(calls[0][0],im);assert.equal(calls[0].length,9);}finally{clearCaches();if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('lost cached canvas contexts are evicted and copied again from the original atlas',()=>{
 const old=globalThis.document;let lost=false,copies=0;globalThis.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){copies++;},isContextLost(){return lost;}};}};}};try{clearCaches();const c=cachedContext({drawImage(){}}),im={naturalWidth:1024,naturalHeight:1024};c.drawImage(im,0,0,144,160,0,0,80,90);assert.equal(copies,1);lost=true;c.drawImage(im,0,0,144,160,0,0,80,90);lost=false;c.drawImage(im,0,0,144,160,0,0,80,90);assert.equal(copies,2);assert(cacheStats().bytes<=cacheStats().limit);}finally{clearCaches();if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('known image dimensions are not decode readiness; cache only primed images and invalidate on re-prime',()=>{
 const old=globalThis.document;let copies=0;globalThis.document={createElement(){return {width:0,height:0,getContext(){return {drawImage(){copies++;},getImageData(){return {data:[0,0,0,0]};}};}};}};try{clearCaches();const calls=[],c=cachedContext({drawImage(im){calls.push(im);}}),im={naturalWidth:1024,naturalHeight:1024,complete:false};c.drawImage(im,0,0,144,160,0,0,80,90);assert.equal(calls.at(-1),im);assert.equal(copies,0);im.complete=true;c.drawImage(im,0,0,144,160,0,0,80,90);assert.equal(copies,0);primeImage(im);c.drawImage(im,0,0,144,160,0,0,80,90);const tile=calls.at(-1);assert.notEqual(tile,im);assert.equal(copies,2);primeImage(im);c.drawImage(im,0,0,144,160,0,0,80,90);assert.notEqual(calls.at(-1),tile);assert.equal(copies,4);}finally{clearCaches();if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('oversized outlined text bypasses cache rather than evicting/zeroing itself',()=>{
 assert.equal(cachedLabel({getTransform:()=>({a:4,b:0}),save(){},restore(){},measureText:()=>({width:1e8})},'large',0,0,16,'#fff'),false);
});
test('door artwork matches actual lock rules: unvisited bosses are OPEN, treasure/secrets stay locked',()=>{
 const g=E.createGame('1793961062183'),r=E.current(g);for(const type of ['combat','boss','treasure','secret']){const to={type,unlocked:false,visited:false};g.rooms.push(to);const l={to:g.rooms.length-1};r.cleared=true;const s=doorState(g,l);assert.equal(s.open,['combat','boss'].includes(type));assert.equal(s.index,type==='secret'?7:type==='treasure'?2:0);if(type==='treasure'||type==='secret'){to.unlocked=true;assert(doorState(g,l).open);}r.cleared=false;assert(!doorState(g,l).open);g.rooms.pop();}
});
test('passages cut the baked wall along actual door centers and extend to every room edge',()=>{
 for(const view of [{width:1280,height:800},{width:1920,height:800},{width:1280,height:1200},{width:1920,height:1200}]){const r={view,bounds:{left:130,right:view.width-130,top:205,bottom:view.height-120}};for(const dir of Object.keys(W.DIRECTIONS)){const p=openingFor(r,dir),d=W.doorsFor(r)[dir];assert(p.x<=d.x&&p.x+p.w>=d.x&&p.y<=d.y&&p.y+p.h>=d.y);assert(p.w>=96&&p.h>=96);assert(dir==='n'?p.y===0:dir==='s'?p.y+p.h===view.height:dir==='w'?p.x===0:p.x+p.w===view.width);}}
});
test('reported seed and generated open doors really transition by walking, not direct enterRoom calls',()=>{
 let checked=0;const shapes=new Set(),directions=new Set();for(const seed of ['1793961062183',...Array.from({length:24},(_,i)=>'doorwalk85-'+i)]){
  const initial=E.createGame(seed);for(const model of initial.rooms.filter(r=>['start','combat'].includes(r.type)))for(const l of E.links(initial,model).filter(l=>['start','combat','boss'].includes(initial.rooms[l.to].type))){
   const g=structuredClone(initial),r=g.rooms[model.id];g.room=r.id;r.initialized=true;r.visited=true;r.cleared=true;r.obstacles=W.makeObstacles(seed,r);r.terrain=[];r.biome=null;g.player.x=l.x-l.dx*76;g.player.y=l.y-l.dy*76;g.player.invuln=999;g.transition=0;assert(!W.blocked(r,g.player.x,g.player.y,16));for(let t=0;t<20&&g.room===r.id;t++)E.tick(g,.05,{x:l.dx,y:l.dy});assert.equal(g.room,l.to,seed+' '+r.id+' '+l.dir);checked++;shapes.add(r.shape);directions.add(l.dir);
  }
 }assert(checked>400);assert.equal(shapes.size,4);assert.equal(directions.size,4);
});
