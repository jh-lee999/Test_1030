import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUTTER_ORIGINAL as meta,selectButterFrame,drawButterMotion,butterMuzzleOffset,butterReleasePoint,advanceButterGait,BUTTER_STRIDE_DISTANCE} from '../butter-original-motion.js';
const state=(phase=.2,progress=.3,type='normal',moving=true)=>({size:112,gait:{phase:phase*Math.PI*2,amount:moving?1:0},action:type?{type,time:progress,duration:1}:null});
test('v36 declares one actual source view, never four invented or mirrored views',()=>{
  assert.deepEqual(meta.directions,['original-three-quarter']);assert.equal(meta.mirrored,false);
  for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])assert.deepEqual(selectButterFrame({...state(),facingX:x,facingY:y}),selectButterFrame(state()));
});
test('all source clips and composed frames use valid cells and the same source-unit scale',()=>{
  const disk=JSON.parse(readFileSync(new URL('../assets/butter-original36/atlas.json',import.meta.url)));
  assert.deepEqual(meta,disk);assert.equal(meta.renderScale,.18);
  for(const c of Object.values(meta.clips)){
    assert.equal(c.anchors.length,c.count);assert.ok(c.width*c.columns<=16383&&c.height*c.rows<=16383);
    for(const a of c.anchors)assert.ok(a.every(Number.isFinite));
    assert.ok(c.origin.every(Number.isFinite));assert.ok(c.count<=c.columns*c.rows);
  }
});
test('moving fire uses independent full-pose gait and shot indices',()=>{
  const c=meta.clips.walkShoot,a=selectButterFrame(state(.2,.2)),b=selectButterFrame(state(.2,.7)),d=selectButterFrame(state(.7,.2));
  assert.equal(a.key,'walkShoot');assert.equal(Math.floor(a.index/c.shotFrames),Math.floor(b.index/c.shotFrames));
  assert.equal(a.index%c.shotFrames,d.index%c.shotFrames);assert.notEqual(a.index,d.index);
  for(let g=0;g<c.gaitFrames;g++)for(let shot=0;shot<c.shotFrames;shot++)assert.deepEqual(c.lowerChecks[g*c.shotFrames],c.lowerChecks[g*c.shotFrames+shot],`shot changed leg rig at gait ${g}`);
  assert.equal(new Set(c.lowerChecks.map(JSON.stringify)).size,c.gaitFrames);
});
test('idle, run and all skill selections reach their real source clips',()=>{
  assert.equal(selectButterFrame(state(0,0,null,false)).key,'idle');assert.equal(selectButterFrame(state(0,0,null)).key,'walk');
  assert.equal(selectButterFrame(state(0,.4,'normal',false)).key,'shoot');assert.equal(selectButterFrame(state(0,.4,'low',false)).key,'low');assert.equal(selectButterFrame(state(0,.4,'high')).key,'high');
  assert.notEqual(selectButterFrame({...state(0,0,null,false),time:.1}).index,selectButterFrame({...state(0,0,null,false),time:.8}).index);
});
test('release ratios follow the original reference and moving low fire is retimed',()=>{
  const refs=JSON.parse(readFileSync(new URL('../docs/art/butter-motion-reference.json',import.meta.url)));
  for(const [type,clip]of[['normal','Attack1_1'],['low','Skill1_1'],['high','Ultimate1_1']]){
    const ref=refs.observedClips.find(x=>x.name===clip);assert.ok(Math.abs(butterReleasePoint(type)-ref.releaseReferenceSeconds/ref.durationSeconds)<1e-6);
  }
  assert.equal(selectButterFrame(state(.2,butterReleasePoint('low'),'low')).index,selectButterFrame(state(.2,butterReleasePoint('normal'))).index);
});
test('runtime draws exactly one whole frame; fallback is the original idle, not a cutout rig',()=>{
  const calls=[],ctx={save(){},restore(){},drawImage(...args){calls.push(args);}},images={walkShoot:{naturalWidth:1},idle:{naturalWidth:1},poster:{naturalWidth:1}};
  const s=state(),f=selectButterFrame(s);assert.equal(drawButterMotion(ctx,images,s),true);assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(1,5),f.rect);
  assert.equal(calls[0][5]+f.origin[0],0);assert.ok(Math.abs(calls[0][6]+f.origin[1]-112*.28)<1e-9);
  drawButterMotion(ctx,{idle:images.idle},s);assert.equal(calls[1][0],images.idle);
  assert.equal(drawButterMotion(ctx,{},s),false);
});
test('source muzzle markers share frame transforms and size scaling',()=>{
  for(const type of ['normal','low','high'])for(const moving of [true,false]){
    const s=state(.3,butterReleasePoint(type),type,moving),frame=selectButterFrame(s),p=butterMuzzleOffset(s),q=butterMuzzleOffset({...s,size:224});
    assert.equal(p.x,frame.muzzle[0]);assert.equal(p.y,frame.muzzle[1]+112*.28);assert.equal(q.x,p.x*2);assert.equal(q.y,p.y*2);
  }
});
test('distance-driven gait does not stop its idle clock',()=>{
  const gait={phase:0,amount:0};advanceButterGait(gait,BUTTER_STRIDE_DISTANCE/4,1,0,.1);assert.ok(Math.abs(gait.phase-Math.PI/2)<1e-9);
  advanceButterGait(gait,0,0,0,1);assert.equal(gait.clock,1.1);assert.equal(gait.amount,0);
});
