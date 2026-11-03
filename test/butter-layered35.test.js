import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceButterGait,butterSpriteState,butterLegTransforms,butterArmPose,butterTailPose,butterSourceTransform,butterMuzzleOffset,butterReleasePoint,BUTTER_2D_LAYOUT,BUTTER_2D_VIEWS,BUTTER_RIG35,BUTTER_MOTION,BUTTER_STRIDE_DISTANCE} from '../butter-motion.js';
import {LIMB_PARTS} from '../assets/butter-2d35/rig.js';
const axes={down:[0,1],left:[-1,0],up:[0,-1],right:[1,0]};
const state=(view='down',phase=0,amount=1,time=.3,type='normal')=>({size:112,facingX:axes[view][0],facingY:axes[view][1],gait:{phase,amount,dx:axes[view][0],dy:axes[view][1]},action:time===null?null:{type,time,duration:1,dx:axes[view][0],dy:axes[view][1]}});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('v35 keeps the four approved views, common scale, foot anchor and handedness',()=>{
  const approved=JSON.parse(readFileSync(new URL('../assets/butter-2d32/directions.json',import.meta.url)));
  for(const view of Object.keys(axes)){
    assert.deepEqual(BUTTER_2D_VIEWS[view].rect,approved.frames[view].rect);
    assert.equal(butterSpriteState(state(view)).view,view);assert.equal(butterSpriteState(state(view)).flip,false);
    const t=butterSourceTransform(112,view),[x,y]=BUTTER_2D_VIEWS[view].foot;
    assert.ok(t.scale>0);near(t.x+x*t.scale,0);near(t.y+y*t.scale,112*.28);
    const arm=butterArmPose(butterSpriteState(state(view,0,1,butterReleasePoint('normal'))));
    assert.equal(Math.sign(arm.wrist[0]-arm.draw[0]),['down','left'].includes(view)?-1:1);
  }
  assert.equal(BUTTER_2D_LAYOUT.holdingHand,'right');
});

test('source reference release moments are normalized and shared with gameplay',()=>{
  const reference=JSON.parse(readFileSync(new URL('../docs/art/butter-motion-reference.json',import.meta.url)));
  for(const [type,name]of [['normal','Attack1_1'],['low','Skill1_1'],['high','Ultimate1_1']]){
    const clip=reference.observedClips.find(c=>c.name===name);
    assert.ok(Math.abs(butterReleasePoint(type)-clip.releaseReferenceSeconds/clip.durationSeconds)<1e-6);
    assert.equal(butterSpriteState(state('down',0,1,.3,type)).release,butterReleasePoint(type));
  }
  const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.ok(app.includes('const releasePoint = butterReleasePoint(butterAction.type)'));
});

test('both hips and knees alternate while at least one sole stays grounded',()=>{
  for(const view of Object.keys(axes))for(let i=0;i<48;i++){
    const p=butterSpriteState(state(view,i/48*Math.PI*2,1,null)),legs=butterLegTransforms(p);
    assert.ok(legs.some(l=>l.lift<1e-8));
    for(const leg of legs){
      near(leg.sole[1],BUTTER_2D_VIEWS[view].foot[1]-leg.lift);
      assert.ok(leg.lift>=0&&leg.lift<=BUTTER_MOTION.bootLift);
      for(const a of [leg.hip,leg.knee,leg.sole])assert.ok(a.every(Number.isFinite));
    }
    const opposite=butterLegTransforms(butterSpriteState(state(view,i/48*Math.PI*2+Math.PI,1,null)));
    near(legs[0].lift,opposite[1].lift);near(legs[1].lift,opposite[0].lift);
  }
});

test('walking and shooting are independent; release does not reset legs or tail',()=>{
  for(const view of Object.keys(axes))for(const type of ['normal','low']){
    const a=butterSpriteState(state(view,1.3,1,.2,type)),b=butterSpriteState(state(view,1.3,1,.62,type));
    assert.equal(a.clip,'walkShoot');assert.equal(b.clip,'walkShoot');
    assert.deepEqual(butterLegTransforms(a),butterLegTransforms(b));
    assert.deepEqual(butterTailPose(a),butterTailPose(b));
    assert.notDeepEqual(butterArmPose(a).draw,butterArmPose(b).draw);
  }
});

test('left hand pulls a readable distance, opens on release and stays back while band snaps forward',()=>{
  for(const view of Object.keys(axes)){
    const release=butterReleasePoint('normal');
    const start=butterArmPose(butterSpriteState(state(view,0,1,.14)));
    const loaded=butterArmPose(butterSpriteState(state(view,0,1,release-.0001)));
    const released=butterArmPose(butterSpriteState(state(view,0,1,release+.10)));
    assert.ok(Math.hypot(loaded.draw[0]-start.draw[0],loaded.draw[1]-start.draw[1])>40);
    assert.equal(loaded.opening,false);assert.equal(released.opening,true);
    assert.ok(Math.hypot(released.draw[0]-loaded.draw[0],released.draw[1]-loaded.draw[1])<12);
    assert.ok(Math.hypot(released.band[0]-released.muzzle[0],released.band[1]-released.muzzle[1])<1);
  }
});

test('muzzle is the transformed fork midpoint at every attack phase and display size',()=>{
  for(const view of Object.keys(axes))for(let i=0;i<=24;i++){
    const s=state(view,1,1,i/24),arm=butterArmPose(butterSpriteState(s)),t=butterSourceTransform(s.size,view),m=butterMuzzleOffset(s);
    near(m.x,t.x+(arm.fork[0][0]+arm.fork[1][0])*.5*t.scale);
    near(m.y,t.y+(arm.fork[0][1]+arm.fork[1][1])*.5*t.scale);
    const double=butterMuzzleOffset({...s,size:224});near(double.x,m.x*2);near(double.y,m.y*2);
  }
});

test('tail rotates around a fixed pelvis pivot, including the visible back-view center',()=>{
  for(const view of Object.keys(axes)){
    const poses=[0,1,2,3,4].map(phase=>butterTailPose(butterSpriteState(state(view,phase))));
    for(const p of poses){assert.deepEqual(p.root,BUTTER_RIG35[view].tail.root);assert.ok(Math.abs(p.angle)<=BUTTER_MOTION.tailSwing);}
    assert.ok(new Set(poses.map(p=>p.angle)).size>1);
    assert.ok(Math.abs(poses[0].root[0]-BUTTER_2D_VIEWS[view].foot[0])<15);
  }
});

test('distance-driven gait fades and backpedaling reverses feet, not the hand action',()=>{
  const gait={phase:0,amount:0,dx:0,dy:1};advanceButterGait(gait,BUTTER_STRIDE_DISTANCE/4,0,1,.1);near(gait.phase,Math.PI/2);
  const a=state('up',1.3),b={...a,gait:{...a.gait,dy:1}};
  assert.notEqual(butterSpriteState(a).phase,butterSpriteState(b).phase);
  assert.deepEqual(butterArmPose(butterSpriteState(a)),butterArmPose(butterSpriteState(b)));
  for(let i=0;i<90;i++)advanceButterGait(gait,0,0,0,1/60);assert.equal(gait.amount,0);
});

test('packed hand coordinates match the build manifest and contain only the two used poses',()=>{
  const packed=JSON.parse(readFileSync(new URL('../assets/butter-2d35/limbs.json',import.meta.url)));
  assert.deepEqual(LIMB_PARTS,packed.parts);
  assert.deepEqual(Object.keys(packed.parts),['Hand_L_2','Hand_L_1_B']);
  for(const [name,[x,y,w,h]]of Object.entries(packed.parts)){
    assert.match(name,/^Hand_/);assert.ok(x>=0&&y>=0&&x+w<128&&y+h<64);
  }
});
