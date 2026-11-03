import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,FOES,FUSIONS,BOARD,fire,tick,chooseUpgrade} from '../bonk-engine.js';
import {phaseView,enemyIntent,enemySummary,fusionProgress,upgradeBenefit,fusionBenefit,ITEM_ICONS} from '../bonk-ui.js';

test('GUI derivations do not mutate game state or consume either random stream',()=>{
  const g=createGame('gui49'),control=createGame('gui49'),before=JSON.stringify(g);
  for(let i=0;i<20;i++){
    phaseView(g);enemySummary(g);for(const e of g.enemies)enemyIntent(g,e);
    for(const f of FUSIONS)fusionProgress(g,f);
    for(const id of Object.keys(ITEM_ICONS)){upgradeBenefit(g,id);fusionBenefit(g,id);}
  }
  assert.equal(JSON.stringify(g),before);assert.equal(g.rng(),control.rng());assert.equal(g.lootRng(),control.lootRng());
});

test('intent predicts actual surviving enemy damage, including simultaneous contact and shooting',()=>{
  for(const type of Object.keys(FOES))for(const turn of [1,2])for(const near of [false,true]){
    const g=createGame(49),e={...g.enemies[0],type,r:32,y:near?BOARD.danger-33:200};g.enemies=[e];g.turn=turn;
    const intent=enemyIntent(g,e);assert.equal(intent.shoot,['archer','ghost'].includes(type)&&turn===2);
    assert.equal(intent.guarded,type==='guard'&&turn===1);assert.equal(intent.contact,near);
    g.phase='enemy';g.enemyClock=0;g.enemyResolved=false;e.fromY=e.y;
    const hp=g.hp;for(let i=0;i<80;i++)tick(g,1/120);assert.equal(hp-g.hp,intent.damage);
    g.enemyClock=.3;e.y=e.fromY+FOES[type].advance*.5;
    assert.equal(enemyIntent(g,e).contact,near,'animation offset must not count the advance twice');
  }
  const g=createGame(49);g.turn=2;g.enemies[0].dead=true;
  assert.deepEqual(enemySummary(g),{count:2,damage:5,shooters:1});
});

test('upgrade comparisons match actual emitted balls at every legal level',()=>{
  for(let n=0;n<3;n++){
    const g=createGame(49);g.inventory={pouch:n,lower:n,upper:n};
    assert.equal(upgradeBenefit(g,'pouch'),`발사 ${3+n} → ${4+n}개`);
    assert.equal(upgradeBenefit(g,'lower'),`추가 도약 ${1+n} → ${2+n}회`);
    assert.equal(upgradeBenefit(g,'upper'),`왕짱돌 피해 ${27+n*9} → ${36+n*9}`);
    for(const id of ['pouch','lower','upper']){g.phase='reward';g.pending=1;g.choices=[id];g.afterReward='aim';assert.ok(chooseUpgrade(g,id));}
    g.phase='aim';g.charge=100;g.useKing=true;fire(g);
    assert.equal(g.queue.filter(q=>!q.ball.king).length,4+n);
    assert.equal(g.queue[2].ball.bounces,2+n);assert.equal(g.queue.find(q=>q.ball.king).ball.damage,36+n*9);
  }
  const g=createGame(49);assert.match(upgradeBenefit(g,'mark'),/0 → 9/);assert.match(upgradeBenefit(g,'bomb'),/0 → 11/);
  g.inventory={split:2,rubber:2,mark:2,bomb:2};
  assert.match(upgradeBenefit(g,'split'),/3 → 4/);assert.match(upgradeBenefit(g,'rubber'),/24% → \+36%/);
  assert.match(upgradeBenefit(g,'mark'),/13 → 17/);assert.match(upgradeBenefit(g,'bomb'),/16 → 21/);
});

test('fusion progress caps each ingredient and never promises completion for an extra duplicate',()=>{
  const g=createGame(49),f=FUSIONS[0];g.inventory={split:3,mark:1};
  assert.equal(fusionProgress(g,f),3);assert.equal(fusionBenefit(g,'split'),null);
  assert.deepEqual(fusionBenefit(g,'mark'),{text:'별사탕 폭죽 완성!',complete:true});
  g.inventory.mark=2;assert.equal(fusionProgress(g,f),4);assert.equal(fusionBenefit(g,'mark'),null);
  assert.equal(fusionBenefit(g,'snack'),null);
});

test('phase copy distinguishes preparing the king from committing the volley',()=>{
  const g=createGame(49);assert.equal(phaseView(g).kind,'aim');g.useKing=true;assert.equal(phaseView(g).kind,'king');
  for(const phase of ['flight','enemy','reward','next','paused','won','dead']){g.phase=phase;assert.ok(phaseView(g).label);assert.ok(phaseView(g).hint);}
});
