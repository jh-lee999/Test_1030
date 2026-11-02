import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceButterGait,butterSpriteState,butterBootTransforms,butterSourceTransform,butterMuzzleOffset,drawButterMotion,BUTTER_STRIDE_DISTANCE,BUTTER_2D_LAYOUT,BUTTER_2D_VIEWS} from '../butter-motion.js';
const axes={down:[0,1],left:[-1,0],up:[0,-1],right:[1,0]};
const state=(view='down',phase=0,amount=1,action=null)=>({size:112,facingX:axes[view][0],facingY:axes[view][1],gait:{phase,amount,dx:axes[view][0],dy:axes[view][1]},action});

test('live 2D renderer uses the approved four independent rectangles and foot anchors',()=>{
  const meta=JSON.parse(readFileSync(new URL('../assets/butter-2d32/directions.json',import.meta.url)));
  assert.equal(BUTTER_2D_LAYOUT.image,'./'+meta.image);
  assert.equal(new Set(Object.values(BUTTER_2D_VIEWS).map(v=>v.rect.join(','))).size,4);
  for(const view of Object.keys(axes)){
    assert.deepEqual(BUTTER_2D_VIEWS[view].rect,meta.frames[view].rect);
    assert.deepEqual(BUTTER_2D_VIEWS[view].foot,meta.frames[view].sourceFoot);
    assert.equal(butterSpriteState(state(view)).view,view);
    assert.equal(butterSpriteState(state(view)).flip,false);
  }
});

test('only positive uniform scale, with the SAME ground anchor in all directions',()=>{
  for(const view of Object.keys(axes))for(const size of [67.2,112,179.2]){
    const t=butterSourceTransform(size,view),[x,y]=BUTTER_2D_VIEWS[view].foot;
    assert.ok(t.scale>0);assert.ok(Math.abs(t.x+x*t.scale)<1e-10);
    assert.ok(Math.abs(t.y+y*t.scale-size*.28)<1e-10);
    const scales=[],draws=[];
    const ctx={save(){},restore(){},translate(){},scale(x,y){scales.push([x,y]);},drawImage(...args){draws.push(args);}};
    const atlas={};drawButterMotion(ctx,{atlas},{...state(view,0,0),size});
    assert.deepEqual(scales,[[t.scale,t.scale]]);
    assert.deepEqual(draws,[[atlas,...BUTTER_2D_VIEWS[view].rect,0,0,627,627]]);
  }
});

test('both boots alternate, one planted foot remains, and all motion fades to zero',()=>{
  for(const view of Object.keys(axes)){
    const a=butterBootTransforms(butterSpriteState(state(view,Math.PI/2)));
    const b=butterBootTransforms(butterSpriteState(state(view,Math.PI*1.5)));
    assert.ok(a[0].y< -8);assert.ok(Math.abs(a[1].y)<1e-10);
    assert.ok(Math.abs(b[0].y)<1e-10);assert.ok(b[1].y< -8);
    for(let i=0;i<2;i++)for(const axis of ['x','y'])assert.ok(Math.abs(a[i][axis]-b[1-i][axis])<1e-10);
    const stopped=butterBootTransforms(butterSpriteState(state(view,Math.PI/2,0)));
    assert.ok(stopped.every(p=>Math.abs(p.x)+Math.abs(p.y)===0));
  }
});

test('walking never suppresses holding-hand recoil or resets the gait',()=>{
  for(const view of Object.keys(axes))for(const type of ['normal','low']){
    const moving=state(view,1.2), before=structuredClone(moving.gait);
    const a=butterSpriteState({...moving,action:{type,time:.2,duration:1}});
    const b=butterSpriteState({...moving,action:{type,time:.8,duration:1}});
    assert.equal(a.clip,'walkShoot');assert.equal(b.clip,'walkShoot');
    assert.notEqual(a.weaponAngle,b.weaponAngle);
    assert.deepEqual(butterBootTransforms(a),butterBootTransforms(b));
    assert.deepEqual(moving.gait,before);
  }
});

test('the face is outside ALL cutouts; body size cannot change with an action',()=>{
  for(const rig of Object.values(BUTTER_2D_VIEWS)){
    assert.ok(rig.weapon.polygon.every(([x,y])=>x>=8&&x<619&&y>=280&&y<478));
    assert.ok(rig.boots.every(([x,y,w,h])=>x>=8&&y>=478&&x+w<619&&y+h<619));
    for(const points of rig.bootMasks ?? [])assert.ok(points.every(([x,y])=>x>=8&&x<619&&y>=478&&y<619));
  }
  for(const type of ['normal','low','high'])for(let n=0;n<=100;n++){
    const pose=butterSpriteState(state('up',n,1,{type,time:n/100,duration:1}));
    assert.ok(Math.abs(pose.weaponAngle)<.09);
  }
});

test('release phase matches gameplay; muzzle follows the SAME rigid weapon rotation',()=>{
  for(const view of Object.keys(axes))for(const [type,time] of [['normal',.55],['low',.5],['high',.68]]){
    const s=state(view,1,1,{type,time,duration:1}),p=butterSpriteState(s),rig=BUTTER_2D_VIEWS[view];
    assert.equal(p.release,time);assert.equal(p.pull,1);
    const [px,py]=rig.weapon.pivot,[mx,my]=rig.muzzle,c=Math.cos(p.weaponAngle),sin=Math.sin(p.weaponAngle);
    const t=butterSourceTransform(s.size,view),actual=butterMuzzleOffset(s);
    assert.ok(Math.abs(actual.x-(t.x+(px+(mx-px)*c-(my-py)*sin)*t.scale))<1e-10);
    assert.ok(Math.abs(actual.y-(t.y+(py+(mx-px)*sin+(my-py)*c)*t.scale))<1e-10);
    const doubled=butterMuzzleOffset({...s,size:224});
    assert.equal(doubled.x,actual.x*2);assert.equal(doubled.y,actual.y*2);
  }
});

test('shot facing is locked while strafing, and backpedaling reverses only feet',()=>{
  const s=state('down',Math.PI/2,1,{type:'normal',time:.3,duration:1,dx:0,dy:-1});
  const p=butterSpriteState(s);assert.equal(p.view,'up');assert.equal(p.walkFrame,9);
  assert.equal(p.weaponAngle,butterSpriteState({...s,gait:{...s.gait,dy:-1}}).weaponAngle);
});

test('gait is distance-driven and settles after stopping',()=>{
  const gait={phase:0,amount:0,dx:0,dy:1};
  advanceButterGait(gait,BUTTER_STRIDE_DISTANCE/4,0,1,.1);
  assert.ok(Math.abs(gait.phase-Math.PI/2)<1e-10);
  for(let i=0;i<90;i++)advanceButterGait(gait,0,0,0,1/60);
  assert.equal(gait.amount,0);assert.ok(Math.abs(gait.phase-Math.PI/2)<1e-10);
});
