import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,createBuildState,applyBuildItem,removeBuildItem,rebuildStats} from '../platformer-build.js';
import {createGame,canOpenShop,openShop,buyShopItem,sellShopItem,buyShopHealing,buySealedBag,rerollShop,acceptContract,grantItem,chooseReward,enterNextRoom,chooseRoute,routeOptions,interactRoom,hurtPlayer,tick} from '../platformer-engine.js';
import {generateWorld,generateRoom,validateRoom,seededRandom} from '../platformer-world.js';
import {basePrice,salePrice,offerPrice,shopRerollCost,rollSealedBag,contractLabel} from '../platformer-economy.js';

function market(seed=41){const g=createGame(seed);g.room.cleared=g.room.rewardTaken=true;g.room.enemies.forEach(e=>e.hp=0);Object.assign(g.player,{x:g.room.merchant.x,y:g.room.merchant.y,grounded:true});assert.equal(openShop(g),true);return g;}
function next(g,type){g.phase='playing';Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});assert.equal(enterNextRoom(g),true);const node=routeOptions(g).find(n=>n.type===type);assert.ok(node,type);assert.equal(chooseRoute(g,node.id),true);return g;}
function finish(g){g.room.enemies.forEach(e=>e.hp=0);tick(g,{},0);assert.equal(g.phase,'reward');chooseReward(g,g.choices[0]);}
function active(id){const g=market();assert.equal(acceptContract(g,id),true);return next(g,'combat');}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('v41 guarantees reachable optional shop routes and a supported first-room merchant',()=>{
  for(let seed=0;seed<100;seed++){
    const w=generateWorld(seed);assert.equal(w.version,43);
    assert.ok(w.nodes.find(n=>n.id===w.startId).next.some(id=>w.nodes.find(n=>n.id===id).type==='shop'));
    for(const depth of [1,3,5])assert.equal(w.nodes.filter(n=>n.depth===depth&&n.type==='shop').length,1);
    for(const node of w.nodes.filter(n=>n.type==='shop'||n.depth===0)){
      const room=generateRoom(node);assert.ok(room.merchant);assert.ok(validateRoom(room).valid);
      if(node.type==='shop'){assert.equal(room.enemies.length,0);assert.equal(room.shrine,null);assert.equal(room.rewardTaken,true);}
      room.merchant.platformId='missing';assert.equal(validateRoom(room).valid,false);
    }
  }
});
test('merchant access needs completion, proximity, matching height and ground; F selects nearest interaction',()=>{
  const g=createGame(41),m=g.room.merchant;
  Object.assign(g.player,{x:m.x,y:m.y,grounded:true});assert.equal(canOpenShop(g),false);
  g.room.cleared=true;assert.equal(openShop(g),false);g.room.rewardTaken=true;
  for(const change of [{x:m.x-101},{y:m.y-41},{grounded:false}]){Object.assign(g.player,{x:m.x,y:m.y,grounded:true},change);assert.equal(openShop(g),false);}
  Object.assign(g.player,{x:m.x,y:m.y,grounded:true});assert.equal(interactRoom(g),true);assert.equal(g.phase,'shop');
  const shop=g.room.shop;g.phase='playing';openShop(g);assert.equal(g.room.shop,shop);assert.equal(g.economy.visitedShops.length,1);
  g.phase='playing';Object.assign(g.player,{x:g.room.exit.x-70,y:g.room.exit.y,grounded:true});assert.equal(interactRoom(g),true);assert.equal(g.phase,'route');
});
test('shop rooms can be skipped at zero gold, with no purchase or contract gating the exit',()=>{
  const g=market();next(g,'shop');assert.equal(g.coins,0);assert.equal(g.room.shop,undefined);assert.equal(g.phase,'playing');
  Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});assert.equal(interactRoom(g),true);assert.equal(g.phase,'route');assert.equal(g.world.nodes.find(n=>n.id===g.currentNodeId).completed,true);
});
test('discount quotes, coupons and stamps pay exactly once with no buy/sell arbitrage',()=>{
  const g=market();g.coins=500;g.economy.coupons=1;
  for(const id of Object.keys(ITEMS))for(const sale of [false,true])assert.ok(offerPrice(g,{id,sale})>salePrice(id));
  const [first,second]=g.room.shop.stock,price=offerPrice(g,first);assert.equal(price,Math.ceil(basePrice(first.id)*.75*.8));
  assert.equal(buyShopItem(g,0),true);assert.equal(g.coins,500-price);assert.equal(g.economy.coupons,0);assert.equal(g.economy.stamps,1);assert.equal(buyShopItem(g,0),false);
  assert.equal(offerPrice(g,second),basePrice(second.id));buyShopItem(g,1);buyShopItem(g,2);assert.equal(g.economy.stamps,0);assert.equal(g.economy.coupons,1);assert.equal(g.economy.purchases,3);assert.equal(g.economy.coinsSpent,500-g.coins);
  const inventory=structuredClone(g.stats.inventory);g.phase='playing';assert.equal(buyShopItem(g,1),false);assert.deepEqual(g.stats.inventory,inventory);
});
test('insufficient funds and sold/invalid offers do not consume coupons or inventory',()=>{
  const g=market();g.economy.coupons=1;const before=structuredClone(g.economy);assert.equal(buyShopItem(g,0),false);assert.equal(buyShopItem(g,99),false);assert.equal(buyShopItem(g,-1),false);assert.deepEqual(g.economy,before);assert.equal(g.stats.itemsTaken,0);
});
test('selling removes one copy, deactivates exact thresholds, synchronizes cooldowns and never heals',()=>{
  const g=market();for(let i=0;i<4;i++)grantItem(g,'lower_book');assert.equal(g.stats.lowerGrade,6);g.player.skillCooldown=g.stats.skillCooldown/2;g.stats.hp=22;
  const before=structuredClone(g.stats);assert.equal(sellShopItem(g,'lower_book'),true);assert.equal(g.stats.inventory.lower_book,3);assert.equal(g.stats.lowerGrade,4);assert.equal(g.stats.upperGrade,1);assert.equal(g.stats.extraProjectiles,0);assert.equal(g.stats.inscriptions.scholar,3);close(g.player.skillCooldown,g.stats.skillCooldown/2);assert.equal(g.stats.hp,22);assert.equal(before.inventory.lower_book,4);
  for(let i=0;i<3;i++)sellShopItem(g,'lower_book');assert.equal(g.stats.lowerGrade,1);assert.equal(g.stats.chainBonus,0);assert.equal(g.stats.inventory.lower_book,undefined);const coins=g.coins;assert.equal(sellShopItem(g,'lower_book'),false);assert.equal(sellShopItem(g,'invalid'),false);assert.equal(g.coins,coins);assert.equal(g.economy.sales,4);assert.deepEqual(rebuildStats(g.stats),g.stats);
  grantItem(g,'milk_carton');g.stats.hp=g.stats.maxHp;sellShopItem(g,'milk_carton');assert.equal(g.stats.hp,90);
  grantItem(g,'shield_pin');grantItem(g,'shield_pin');g.player.shield=g.stats.shieldMax;sellShopItem(g,'shield_pin');assert.equal(g.player.shield,g.stats.shieldMax);
});
test('pure removal leaves its input untouched; selling health at low HP does not refill',()=>{
  const s=applyBuildItem(createBuildState(),'milk_carton');s.hp=10;const next=removeBuildItem(s,'milk_carton');assert.equal(next.hp,10);assert.equal(next.maxHp,90);assert.equal(s.inventory.milk_carton,1);assert.deepEqual(removeBuildItem(next,'milk_carton'),next);
});
test('healing is bounded, paid once, disabled at full health or without gold and grants no stamps',()=>{
  const g=market();g.coins=100;assert.equal(buyShopHealing(g),false);assert.equal(g.coins,100);assert.equal(g.room.shop.healed,false);
  g.stats.hp=10;g.coins=11;assert.equal(buyShopHealing(g),false);g.coins=100;assert.equal(buyShopHealing(g),true);assert.equal(g.stats.hp,37);assert.equal(g.coins,88);assert.equal(buyShopHealing(g),false);assert.equal(g.economy.stamps,0);
  const other=market();other.coins=12;other.stats.hp=89;buyShopHealing(other);assert.equal(other.stats.hp,90);
});
test('sealed bag has exact rarity boundaries, deterministic seeded results and one purchase per shop',()=>{
  for(const [roll,rarity]of [[0,'common'],[.599999,'common'],[.6,'rare'],[.919999,'rare'],[.92,'epic'],[.999999,'epic']]){
    let n=0;const id=rollSealedBag(()=>n++===0?roll:.5);assert.equal(ITEMS[id].rarity,rarity);
  }
  const g=market('bag'),control=market('bag');g.coins=control.coins=18;g.economy.coupons=1;
  assert.equal(buySealedBag(g),true);assert.equal(buySealedBag(control),true);assert.deepEqual(g.stats.inventory,control.stats.inventory);assert.equal(g.stats.itemsTaken,1);assert.equal(g.coins,0);assert.equal(g.economy.stamps,0);assert.equal(g.economy.coupons,1);g.coins=100;assert.equal(buySealedBag(g),false);assert.equal(g.coins,100);
});
test('shop rerolls escalate 10/14/18, cap at three, exclude current stock, preserve service flags and RNG streams',()=>{
  const g=market('isolated'),control=market('isolated');g.coins=100;g.stats.hp=10;buyShopHealing(g);buySealedBag(g);
  for(const price of [10,14,18]){assert.equal(shopRerollCost(g),price);const ids=g.room.shop.stock.map(o=>o.id),coins=g.coins;assert.equal(rerollShop(g),true);assert.equal(g.coins,coins-price);assert.ok(g.room.shop.stock.every(o=>!ids.includes(o.id)));assert.equal(g.room.shop.stock.filter(o=>o.sale).length,1);}
  assert.equal(rerollShop(g),false);assert.ok(g.room.shop.healed&&g.room.shop.bagOpened);assert.equal(g.random(),control.random());assert.equal(g.rewardRandom(),control.rewardRandom());assert.deepEqual(g.world,control.world);
});
test('contracts require a shop, cannot overwrite a pending contract and wait through safe rooms',()=>{
  const g=createGame(41);assert.equal(acceptContract(g,'frenzy'),false);const h=market();assert.equal(acceptContract(h,'invalid'),false);assert.equal(acceptContract(h,'frenzy'),true);assert.equal(acceptContract(h,'haste'),false);next(h,'treasure');assert.equal(h.contract.status,'pending');assert.match(contractLabel(h),/대기/);
  Object.assign(h.player,{x:h.room.shrine.x,y:h.room.shrine.y,grounded:true});interactRoom(h);chooseReward(h,h.choices[0]);next(h,'elite');assert.equal(h.contract.status,'active');assert.equal(h.contract.nodeId,h.currentNodeId);
});
test('frenzy scales actual enemies and incoming damage once and settles a single reward',()=>{
  const g=active('frenzy'),plain=generateRoom(g.world.nodes.find(n=>n.id===g.currentNodeId));
  for(let i=0;i<g.room.enemies.length;i++)assert.equal(g.room.enemies[i].maxHp,Math.ceil(plain.enemies[i].maxHp*1.35));
  g.player.invulnerable=0;hurtPlayer(g,10);assert.equal(g.stats.hp,78);const coins=g.coins;finish(g);assert.equal(g.coins,coins+24);assert.equal(g.contract.status,'completed');assert.equal(g.economy.contractsWon,1);
  tick(g,{});assert.equal(g.coins,coins+24);g.player.invulnerable=0;hurtPlayer(g,10);assert.equal(g.stats.hp,68);assert.match(g.room.contractResult,/성공/);
});
test('haste counts only active gameplay, not pause/build/map or rewards, and times out without an extra penalty',()=>{
  const g=active('haste');g.room.enemies.forEach(e=>e.cooldown=999);const elapsed=g.contract.elapsed;
  for(const phase of ['paused','build','map','reward']){g.phase=phase;tick(g,{},1/30);assert.equal(g.contract.elapsed,elapsed);}
  g.phase='playing';tick(g,{},1/30);close(g.contract.elapsed,1/30);g.contract.elapsed=59.9;const coins=g.coins;finish(g);assert.equal(g.contract.status,'completed');assert.equal(g.coins,coins+30+8);
  const h=active('haste');h.contract.elapsed=60.01;finish(h);assert.equal(h.contract.status,'failed');assert.equal(h.coins,8);assert.equal(h.economy.contractsLost,1);
});
test('flawless allows shield damage but not HP loss, pays a coupon once, and death fails all outstanding contracts',()=>{
  const g=active('flawless');grantItem(g,'shield_pin');g.player.invulnerable=0;hurtPlayer(g,5);assert.equal(g.room.hpDamage,0);finish(g);assert.equal(g.contract.status,'completed');assert.equal(g.economy.coupons,1);assert.equal(g.coins,33);tick(g,{});assert.equal(g.economy.coupons,1);
  const h=active('flawless');h.player.invulnerable=0;hurtPlayer(h,1);finish(h);assert.equal(h.contract.status,'failed');assert.equal(h.coins,0);
  for(const pending of [false,true]){const d=pending?market():active('haste');if(pending)acceptContract(d,'haste');d.phase='playing';d.player.invulnerable=0;hurtPlayer(d,1000);assert.equal(d.phase,'dead');assert.equal(d.contract.status,'failed');assert.equal(d.economy.contractsLost,1);hurtPlayer(d,1000);assert.equal(d.economy.contractsLost,1);}
});
test('all economy state resets for a new run and contract offers are deterministic definitions',()=>{
  const a=market('reset');a.coins=200;buyShopItem(a,0);acceptContract(a,'frenzy');const b=createGame('reset');assert.equal(b.economy.purchases,0);assert.equal(b.economy.coupons,0);assert.equal(b.contract,null);assert.equal(b.coins,0);assert.equal(b.stats.itemsTaken,0);
  const rng=seededRandom(41),other=seededRandom(41);assert.deepEqual(Array.from({length:100},()=>rollSealedBag(rng)),Array.from({length:100},()=>rollSealedBag(other)));
});
