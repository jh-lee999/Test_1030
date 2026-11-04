import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../poker-engine.js';
import {butterMuzzleOffset,BUTTER_ORIGINAL} from '../butter-original-motion.js';
import {shotGeometry,sampleDiceEffects,flightPoint} from '../dice-effects.js';
function shot(high){const g=E.createGame('61');E.chooseStarter(g,'echo');if(!high){E.selectAllCards(g);E.discard(g);}E.attack(g);return g;}
test('every full idle/normal/high source cell fits at the shared mirrored anchor without auto-fit or cropping',()=>{
 for(const key of ['idle','shoot','high']){const c=BUTTER_ORIGINAL.clips[key],s=80/112,left=220-(c.width-c.origin[0])*s,right=220+c.origin[0]*s,top=220+80*.28-c.origin[1]*s,bottom=top+c.height*s;assert(left>=0&&right<=1000&&top>=0&&bottom<=300,key+' full cell bounds');}
});
test('mirrored normal/high shots use the same flipped source marker as the hero, with unchanged target and clocks',()=>{
 for(const high of [false,true]){
  const g=shot(high),before=JSON.stringify(g),legacy=shotGeometry(g),q=shotGeometry(g,{heroFacing:-1,heroX:220}),m=butterMuzzleOffset({size:80,action:{...g.action,time:q.release}});
  assert.equal(q.from.x,220-m.x);assert.equal(q.from.y,220+m.y);if(!high)assert(q.from.x>220);assert.equal(q.from.x+legacy.from.x,410);assert.equal(q.release,legacy.release);assert.equal(q.hitAt,legacy.hitAt);assert.deepEqual(q.to,legacy.to);assert.equal(flightPoint(q,0).x,q.from.x);assert.equal(flightPoint(q,1).x,810);assert.equal(JSON.stringify(g),before);
  assert.deepEqual(shotGeometry(g,{heroFacing:1}),legacy);assert.deepEqual(shotGeometry(g,{heroFacing:0}),legacy);
 }
});
test('facing is presentation-only: particles stay bounded and do not change damage, RNG, pause or resources',()=>{
 for(const high of [false,true]){
  const g=shot(high),q=shotGeometry(g,{heroFacing:-1,heroX:220});
  for(let i=0;i<150;i++){g.pending.clock=i/150*g.pending.endAt;g.pending.applied=g.pending.clock>=g.pending.hitAt;const before=JSON.stringify(g),sprites=sampleDiceEffects(g,{heroFacing:-1,heroX:220});assert.equal(JSON.stringify(g),before);assert.deepEqual(sprites,sampleDiceEffects(g,{heroFacing:-1,heroX:220}));for(const s of sprites){assert(s.x-s.width/2>=0&&s.x+s.width/2<=1000);assert(s.y-s.height/2>=0&&s.y+s.height/2<=300);}}
  g.pending.clock=q.release+.1;g.pending.applied=false;E.pause(g);const frozen=sampleDiceEffects(g,{heroFacing:-1,heroX:220});E.tick(g,1);assert.deepEqual(sampleDiceEffects(g,{heroFacing:-1,heroX:220}),frozen);assert.deepEqual(sampleDiceEffects(g,{heroFacing:-1,heroX:220,reduced:true}),[]);
 }
});
