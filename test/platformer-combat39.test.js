import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,tick,grantItem,hitEnemy,hurtPlayer,FLOOR,chooseRoute,routeOptions,enterNextRoom} from '../platformer-engine.js';
import {lowerPower,upperPower} from '../platformer-build.js';
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
function fixture(){const g=createGame(39),floor={id:'flat',x:0,y:FLOOR,w:5000,ground:true};g.room.platforms=[floor];g.room.width=5000;g.room.pickups=[];g.room.enemies=g.room.enemies.slice(0,1);Object.assign(g.room.enemies[0],{x:4500,y:FLOOR,home:floor,hp:10000,maxHp:10000,cooldown:999});g.random=()=>.99;return g;}
function step(g,n,input={}){for(let i=0;i<n;i++)tick(g,input,1/120);}
function shot(g,type='normal'){g.player.action={type,time:.99,duration:1,fired:false};tick(g,{});return type==='high'?g.boulders:g.projectiles;}
function enemies(g,xs,hp=100){const template=g.room.enemies[0];g.room.enemies=xs.map((x,i)=>({...template,id:'e'+i,x,hp,maxHp:hp,cooldown:999}));return g.room.enemies;}
function bullet(extra={}){return{owner:'player',x:100,y:FLOOR-50,vx:1000,vy:0,speed:1000,r:6,life:2.4,damage:15,hitIds:[],bounces:0,pierce:0,...extra};}

test('low shots use accumulated grade for homing, damage, chaining and Lv3/5 projectiles',()=>{
  const g=fixture();grantItem(g,'lower_book');grantItem(g,'lower_book');const b=shot(g,'low'),p=lowerPower(g.stats);assert.equal(b.length,2);near(b[0].damage,p.damage);assert.equal(b[0].bounces,p.bounces);near(b[0].homingStrength,9.4);assert.equal(g.lowerProcs,1);assert.equal(g.player.lowerDryShots,0);near(Math.hypot(b[0].vx,b[0].vy),b[0].speed);near(b[1].damage,b[0].damage*.55);
  const h=fixture();for(let i=0;i<4;i++)grantItem(h,'lower_badge');assert.equal(shot(h,'low').length,3);
});
test('low proc drought has a finite guarantee with held fire, based on released shots',()=>{
  const g=fixture();step(g,420,{attack:true});assert.ok(g.shotsFired>=7);assert.ok(g.lowerProcs>=1);assert.ok(g.player.lowerDryShots<lowerPower(g.stats).pity);
});
test('faster attacks release more shots; speed and duration change actual projectiles',()=>{
  const a=fixture(),b=fixture();for(let i=0;i<5;i++)grantItem(b,'hot_candy');step(a,240,{attack:true});step(b,240,{attack:true});assert.ok(b.shotsFired>a.shotsFired);
  const c=fixture();grantItem(c,'fresh_band');grantItem(c,'long_gloves');const q=shot(c)[0];near(q.speed,c.stats.projectileSpeed*1.55);near(q.life,c.stats.projectileLifetime-1/120);
});
test('critical roll changes actual damage and shows a distinct damage number',()=>{
  const g=fixture();grantItem(g,'shiny_lens');grantItem(g,'lucky_bell');g.random=()=>0;const b=shot(g)[0];assert.equal(b.critical,true);near(b.damage,g.stats.damage*g.stats.critDamage);
  hitEnemy(g,g.room.enemies[0],b.damage,0,{critical:b.critical});assert.ok(g.effects.some(e=>e.type==='text'&&e.text.endsWith('!')));
});
test('piercing sweeps multiple bodies in one fast step, once each and in travel order',()=>{
  const g=fixture(),es=enemies(g,[400,300,200]);g.projectiles=[bullet({vx:70000,pierce:2})];tick(g,{});assert.ok(es.every(e=>e.hp===85));assert.equal(g.projectiles.length,0);tick(g,{});assert.ok(es.every(e=>e.hp===85));
  const h=fixture(),targets=enemies(h,[300,200]);h.projectiles=[bullet({vx:70000,pierce:0})];tick(h,{});assert.equal(targets[0].hp,100);assert.equal(targets[1].hp,85);
});
test('chain can return to a previous nearby target, refreshes life and keeps speed',()=>{
  const g=fixture(),es=enemies(g,[200,500,900]);g.projectiles=[bullet({x:175,life:.02,bounces:2,homing:true,homingStrength:11})];tick(g,{});let b=g.projectiles[0];assert.ok(b.life>=1.3);assert.equal(b.targetId,'e1');near(Math.hypot(b.vx,b.vy),1000);step(g,90);assert.deepEqual(es.map(e=>e.hp),[70,85,100]);assert.deepEqual(b.hitIds,['e0','e1','e0']);assert.equal(g.projectiles.length,0);
});
test('Lv3 upper skill spawns two boulders, applies skill damage, cooldown and full body collision',()=>{
  const g=fixture();for(const id of ['upper_book','upper_book','magic_ink','hourglass'])grantItem(g,id);tick(g,{skill:true});near(g.player.skillCooldown,g.stats.skillCooldown);step(g,85);assert.equal(g.boulders.length,2);const [a,b]=g.boulders,p=upperPower(g.stats);near(a.damage,p.damage);near(b.damage,a.damage*.65);assert.equal(Math.sign(a.vx),-Math.sign(b.vx));assert.equal(a.r,p.radius);
  const e=g.room.enemies[0];e.x=a.x;e.y=a.y+e.h-10;const before=e.hp;tick(g,{});assert.ok(e.hp<before);assert.equal(hurtPlayer(g,999),false);
});
test('armor absorbs a predictable share; shield takes damage first and restores in next room',()=>{
  const g=fixture();grantItem(g,'fluffy_blanket');grantItem(g,'shield_pin');const shield=g.player.shield,hp=g.stats.hp;hurtPlayer(g,20);near(g.player.shield,shield-20*(1-g.stats.damageReduction));near(g.stats.hp,hp);near(g.room.hpDamage,0);
  g.player.invulnerable=0;hurtPlayer(g,100);assert.equal(g.player.shield,0);assert.ok(g.stats.hp<hp);assert.ok(g.room.hpDamage>0);
  g.room.cleared=g.room.rewardTaken=true;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});enterNextRoom(g);chooseRoute(g,routeOptions(g)[0].id);assert.equal(g.player.shield,g.stats.shieldMax);
});
test('life steal uses actual damage not overkill; kill heal triggers once and respects max HP',()=>{
  const g=fixture();grantItem(g,'licorice');grantItem(g,'snack_jar');g.stats.hp=20;const es=enemies(g,[1000,1200],10);hitEnemy(g,es[0],1000);near(g.stats.hp,20+10*g.stats.lifeSteal+g.stats.killHeal);const hp=g.stats.hp;hitEnemy(g,es[0],1000);near(g.stats.hp,hp);g.stats.hp=g.stats.maxHp-1;hitEnemy(g,es[1],1000);assert.equal(g.stats.hp,g.stats.maxHp);
});
test('burn deals two seconds of tick damage without recursively igniting or stealing',()=>{
  const g=fixture();grantItem(g,'firecracker');grantItem(g,'licorice');g.stats.hp=40;const e=g.room.enemies[0],hp=e.hp;hitEnemy(g,e,10);const playerHP=g.stats.hp;step(g,260);near(e.hp,hp-10-2*g.stats.damage*g.stats.burnPower);near(g.stats.hp,playerHP);assert.equal(e.burnTime,0);
});
test('four ember inscriptions explode on kill; four wind inscriptions damage once per dash',()=>{
  const g=fixture();for(let i=0;i<4;i++)grantItem(g,'sweet_carrot');const es=enemies(g,[1000,1040,1080],20);hitEnemy(g,es[0],1000);assert.equal(g.stats.kills,3);assert.ok(es.every(e=>e.hp===0));
  const h=fixture();for(let i=0;i<4;i++)grantItem(h,'speedy_shoes');const target=enemies(h,[190])[0];tick(h,{dash:true});step(h,18,{dash:true});near(target.hp,100-h.stats.damage*h.stats.dashDamage);assert.deepEqual(h.player.dashHits,[target.id]);
});
test('expanded pickup radius works, clean-clear bonus pays once, HP damage disqualifies it',()=>{
  const g=fixture();g.room.pickups=[{x:g.player.x+70,y:g.player.y-30,kind:'coin'}];tick(g,{});assert.equal(g.coins,0);grantItem(g,'magnet_bag');tick(g,{});assert.equal(g.coins,5);
  g.player.skillCooldown=10;g.room.enemies.forEach(e=>e.hp=0);tick(g,{});assert.equal(g.coins,13);near(g.player.skillCooldown,10-1/120-3);tick(g,{});assert.equal(g.coins,13);
  const h=fixture();hurtPlayer(h,1);h.room.enemies.forEach(e=>e.hp=0);tick(h,{});assert.equal(h.coins,0);assert.equal(h.room.cleanBonus,undefined);
});
