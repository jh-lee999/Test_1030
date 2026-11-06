import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {BUTTER_ORIGINAL} from '../butter-original-motion.js';
import {BUTTER_GUN,selectButterFrame as sourceFrame} from '../butter-gun-motion71.js';
import {chooseButterFrame,drawButterMotion,imageReady,loopFrame} from '../dungeon86-motion.js';
import {createImageLoader} from '../dungeon86-loader.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),clips={...BUTTER_ORIGINAL.clips,...BUTTER_GUN.clips};
const readyImages=()=>Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,{naturalWidth:c.width*c.columns,naturalHeight:c.height*Math.ceil(c.count/c.columns),complete:true}]));
test('86 preserves exact85 archive and all85 source pins except archive-entry URL redirects',()=>{
 assert.match(read('index.html'),/dungeon86.js\?v=86/);assert.match(read('dungeon86.js'),/dungeon84-save.js/);assert.match(read('dungeon86.js'),/dungeon84-engine.js\?v=84/);assert.equal(createHash('sha256').update(read('dungeon85.html')).digest('hex'),'017787054f117efb9c6547867a5c90e7ca0f5eac72d2438c7f4284191259557c');
 for(const [file,hash]of Object.entries(JSON.parse(read('docs/dungeon85-diagnostics.json')).sourceHashes)){let source=read(file==='index.html'?'dungeon85.html':file);if(file==='test/dungeon85.test.js')source=source.replace("read('dungeon85.html'),/dungeon85","read('index.html'),/dungeon85");if(file.startsWith('tools/check-dungeon85-'))source=source.replaceAll("root+'/dungeon85.html?test=1","root+'/?test=1");assert.equal(createHash('sha256').update(source).digest('hex'),hash,file);}
});
test('fully loaded frames are exactly the original selection, dimensions, anchors and timing',()=>{
 const images=readyImages();for(let i=0;i<100;i++)for(const moving of [false,true])for(const type of [null,'normal','gun','high']){const state={size:80,time:i/30,gait:{amount:moving?1:0,phase:i/99*Math.PI*2,clock:i/30},action:type?{type,time:i/100,duration:1}:null},before=JSON.stringify(state),expected=sourceFrame(state),actual=chooseButterFrame(images,state);assert.deepEqual(Object.fromEntries(Object.keys(expected).map(k=>[k,actual[k]])),expected);assert.equal(actual.fallback,false);assert.equal(JSON.stringify(state),before);}
});
test('missing moving-shot sheets fall back to a full animated walk, never idle/frame0',()=>{
 const images=readyImages();delete images.walkShoot;delete images.walkGun;for(const type of ['normal','gun']){const indices=new Set();for(let i=0;i<24;i++){const frame=chooseButterFrame(images,{time:i/30,gait:{amount:1,phase:(i+.5)/24*Math.PI*2},action:{type,time:.2,duration:.46}});assert.equal(frame.key,'walk');assert(frame.fallback);indices.add(frame.index);}assert(indices.size===24);}
});
test('stationary fallback idle keeps its saved-time clock rather than reference frame0',()=>{
 const images={idle:readyImages().idle},indices=new Set();for(let i=0;i<60;i++)indices.add(chooseButterFrame(images,{time:i/30,gait:{amount:0,phase:0},action:{type:'high',time:.4,duration:1.1}}).index);assert(indices.size>40);
});
test('rendering uses one whole source cell with the original uniform scale',()=>{
 const images=readyImages(),state={size:80,time:1,gait:{amount:1,phase:2},action:{type:'normal',time:.2,duration:.46}},calls=[],f=chooseButterFrame(images,state);assert(drawButterMotion({save(){},restore(){},drawImage(...a){calls.push(a);}},images,state));assert.equal(calls.length,1);assert.deepEqual(calls[0],[f.image,...f.rect,-f.origin[0]*80/112,80*.28-f.origin[1]*80/112,f.clip.width*80/112,f.clip.height*80/112]);
});
test('poster remains last resort and never masks a ready walking clip',()=>{
 const images={poster:{naturalWidth:144,naturalHeight:160,complete:true}},state={time:2,gait:{amount:1,phase:1}};assert.equal(chooseButterFrame(images,state).key,'poster');images.walk=readyImages().walk;assert.equal(chooseButterFrame(images,state).key,'walk');images.walk.complete=false;assert.equal(chooseButterFrame(images,state).key,'poster');assert.equal(chooseButterFrame({},state),null);
});
test('pause does not invent a wall-clock animation timeline',()=>{const images=readyImages(),state={time:2.7,gait:{amount:1,phase:2},action:{type:'normal',time:.2,duration:.46}},first=chooseButterFrame(images,state);for(let i=0;i<50;i++)assert.deepEqual(chooseButterFrame(images,state),first);assert(!imageReady({naturalWidth:144,naturalHeight:160,complete:false}));assert(loopFrame(clips.walk,-1)>=0);});
function loaderFixture(){const made=[],queue=[];class Image{constructor(){made.push(this);this.naturalWidth=144;this.naturalHeight=160;this.complete=true;this.decode=()=>Promise.resolve();}}return {made,queue,Image};}
test('dimensions alone do not publish a pending decode, and a ready previous image stays visible',async()=>{
 const {made,queue,Image}=loaderFixture();let finish,primed=false;const load=createImageLoader({ImageClass:Image,prime:()=>{primed=true;}}),previous={ready:true},target={walk:previous},p=load('/walk.webp',target,'walk');made[0].decode=()=>new Promise(r=>finish=r);const onload=made[0].onload();assert.equal(target.walk,previous);finish();await onload;assert.equal(await p,made[0]);assert(primed);assert.equal(target.walk,made[0]);
});
test('failed image/decode retries are bounded and never replace the old ready clip',async()=>{
 const {made,queue,Image}=loaderFixture(),load=createImageLoader({ImageClass:Image,schedule:f=>queue.push(f)}),previous={ready:true},target={high:previous},p=load('/high.webp',target,'high');made[0].onerror();queue.shift()();assert.match(made[1].src,/assetRetry86=1/);made[1].decode=()=>Promise.reject(Error('decode'));await made[1].onload();queue.shift()();assert.match(made[2].src,/assetRetry86=2/);made[2].onerror();assert.equal(await p,null);assert.equal(target.high,previous);assert.equal(made.length,3);assert.equal(queue.length,0);
});
test('a slower previous request cannot overwrite the newer decoded clip',async()=>{
 const {made,Image}=loaderFixture(),load=createImageLoader({ImageClass:Image}),target={};let finish;const p1=load('/old.webp',target,'walk');made[0].decode=()=>new Promise(r=>finish=r);const old=made[0].onload(),p2=load('/new.webp',target,'walk');await made[1].onload();await p2;finish();await old;assert.equal(await p1,null);assert.equal(target.walk,made[1]);
});
test('reduced motion suppresses decorative effects, not essential actor clocks',()=>{
 const renderer=read('dungeon86-renderer.js'),hero=read('dungeon86-hero.js');assert(!/gait:reduced\?|action:reduced\?|time:reduced\?|if\(reduced\)index=0|index=reduced\?0/.test(renderer));assert(!/key=reduced\?|t=reduced\?/.test(hero));assert.match(renderer,/shadowBlur=reduced\?0/);assert.match(renderer,/drawCastHints\(c,g,e,\{reduced\}\)/);
});
