import test from 'node:test';
import assert from 'node:assert/strict';
import {ITEMS,INSCRIPTIONS,RARITIES,createBuildState,applyBuildItem,rebuildStats,lowerPower,upperPower,rollBuildItems,rewardChoices,itemChanges,statRows,gradeSources} from '../platformer-build.js';
import {createGame,grantItem,chooseRoute,routeOptions,enterNextRoom,chooseReward,rerollReward,openShop,buyShopItem,rerollShop,tick,seededRandom} from '../platformer-engine.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const stack=(id,n)=>{let s=createBuildState();for(let i=0;i<n;i++)s=applyBuildItem(s,id);return s;};

test('same-run grades, damage and inventory accumulate, not replace; source is inventory',()=>{
  const g=createGame(39);for(const id of ['lower_book','sweet_carrot','lower_book','sweet_carrot'])assert.equal(grantItem(g,id),true);
  assert.equal(g.stats.lowerGrade,3);assert.equal(g.stats.inventory.lower_book,2);assert.equal(g.stats.inventory.sweet_carrot,2);near(g.stats.damage,15*1.2**2);assert.equal(g.stats.itemsTaken,4);
  assert.deepEqual(rebuildStats(g.stats),g.stats);assert.match(gradeSources(g.stats,'lowerGrade'),/기본 Lv.1.*×2/);
  g.room.cleared=g.room.rewardTaken=true;Object.assign(g.player,{x:g.room.exit.x,y:g.room.exit.y,grounded:true});const before=structuredClone(g.stats);enterNextRoom(g);chooseRoute(g,routeOptions(g)[0].id);assert.deepEqual(g.stats,before);
  const fresh=createGame(g.seedLabel);assert.equal(fresh.stats.lowerGrade,1);assert.equal(fresh.stats.itemsTaken,0);assert.deepEqual(fresh.world,createGame(39).world);
});
test('acquisition order does not lose old bonuses; input states are immutable',()=>{
  const ids=['hot_candy','hourglass','lower_book','upper_book','sweet_carrot','shield_pin','magic_ink','lower_book'],initial=createBuildState();
  const a=ids.reduce(applyBuildItem,initial),b=[...ids].reverse().reduce(applyBuildItem,initial);
  for(const key of ['damage','attackCooldown','lowerGrade','upperGrade','skillDamage','shieldMax','skillCooldown'])near(a[key],b[key]);assert.deepEqual(initial,createBuildState());assert.deepEqual(applyBuildItem(a,'invalid'),a);
});
test('duplicate copies count toward 2/4 inscriptions and bonuses apply only once',()=>{
  const one=stack('lower_book',1),two=stack('lower_book',2),four=stack('lower_book',4),five=stack('lower_book',5);
  assert.equal(one.lowerGrade,2);assert.equal(two.lowerGrade,3);assert.equal(four.lowerGrade,6);assert.equal(four.upperGrade,2);assert.equal(four.extraProjectiles,2);assert.equal(five.extraProjectiles,2);
  near(two.cooldownReduction,.1);assert.equal(two.chainBonus,1);assert.equal(four.inscriptions.scholar,4);assert.match(gradeSources(four,'lowerGrade'),/학구열 4세트/);
  assert.equal(Object.keys(INSCRIPTIONS).length,6);assert.equal(Object.keys(ITEMS).length,28);
});
test('all items change displayed effective stats; previews reflect duplicate gains',()=>{
  const s=createBuildState();for(const id of Object.keys(ITEMS)){assert.ok(itemChanges(s,id).length,id);assert.ok(ITEMS[id].tags.every(t=>INSCRIPTIONS[t]));assert.ok(RARITIES[ITEMS[id].rarity]);}
  const two=stack('lower_book',2);assert.ok(itemChanges(applyBuildItem(s,'lower_book'),'lower_book').some(t=>t.includes('Lv.2 → Lv.3')));assert.equal(statRows(two).find(r=>r[0]==='lowCount')[2],'2발');
  const speed=stack('hot_candy',2);near(1/speed.attackCooldown,1/s.attackCooldown*1.13**2);
});
test('health stacks refill only added max HP; effective caps are explicit and finite',()=>{
  let s=createBuildState();s.hp=25;const next=applyBuildItem(s,'milk_carton');assert.equal(next.maxHp,114);assert.equal(next.hp,49);assert.equal(s.hp,25);
  const caps={shiny_lens:['critChance',.8],hourglass:['cooldownReduction',.65],licorice:['lifeSteal',.15],fluffy_blanket:['armor',200],sharp_stone:['pierce',6],double_pouch:['extraProjectiles',6],hot_candy:['attackCooldown',.08]};
  for(const [id,[key,limit]]of Object.entries(caps)){const max=stack(id,100);near(max[key],limit);assert.equal(max.inventory[id],100);assert.ok(Number.isFinite(max.skillCooldown));}
});
test('low grade 1/3/5 raises actual damage, tracking, chaining and extra shots; upper 3 adds a boulder',()=>{
  const base=createBuildState(),three=stack('lower_book',2),five=applyBuildItem(stack('lower_badge',3),'hourglass'),a=lowerPower(base),b=lowerPower(three),c=lowerPower(five);
  assert.equal(three.lowerGrade,3);assert.equal(five.lowerGrade,5);assert.equal(a.extraProjectiles,0);assert.equal(b.extraProjectiles,1);assert.equal(c.extraProjectiles,2);
  for(const key of ['chance','bounces','damage','homing'])assert.ok(c[key]>b[key]&&b[key]>a[key],key);assert.ok(c.pity<a.pity);assert.equal(upperPower(stack('upper_book',2)).count,2);
});
test('reward choices are reproducible, unique and guarantee grades; elites guarantee both',()=>{
  const s=stack('sweet_carrot',3);assert.deepEqual(rollBuildItems(seededRandom(39),s),rollBuildItems(seededRandom(39),s));
  for(let seed=0;seed<100;seed++)for(const type of ['combat','elite','treasure']){const choices=rewardChoices(seededRandom(seed),s,{type,index:2});assert.equal(new Set(choices).size,3);assert.ok(choices.some(id=>id==='lower_book'||id==='upper_book'));if(type==='elite')assert.ok(choices.includes('lower_book')&&choices.includes('upper_book'));}
});
test('reward rerolls cost escalating coins, preserve old stats and cannot duplicate claims',()=>{
  const g=createGame(39);g.room.enemies.forEach(e=>e.hp=0);tick(g,{});const coins=g.coins;assert.equal(coins,8);assert.equal(rerollReward(g),true);assert.equal(g.coins,0);assert.equal(rerollReward(g),false);g.coins=100;assert.equal(rerollReward(g),true);assert.equal(g.coins,86);assert.equal(rerollReward(g),false);
  const id=g.choices[0];assert.equal(chooseReward(g,id),true);assert.equal(chooseReward(g,id),false);assert.equal(g.stats.itemsTaken,1);assert.equal(rerollReward(g),false);
});
test('shops require room completion, spend coins exactly once, stack and keep map/loot RNG independent',()=>{
  const g=createGame('shop'),control=createGame('shop');assert.equal(openShop(g),false);g.room.cleared=true;assert.equal(openShop(g),false);g.room.rewardTaken=true;Object.assign(g.player,{x:g.room.merchant.x,y:g.room.merchant.y,grounded:true});assert.equal(openShop(g),true);
  const id=g.room.shop.stock[0].id,price=Math.ceil(RARITIES[ITEMS[id].rarity].price*.75);assert.equal(buyShopItem(g,0),false);g.coins=200;assert.equal(buyShopItem(g,0),true);assert.equal(g.coins,200-price);assert.equal(buyShopItem(g,0),false);assert.equal(g.stats.inventory[id],1);
  g.room.shop.stock[1]={id,sold:false};assert.equal(buyShopItem(g,1),true);assert.equal(g.stats.inventory[id],2);assert.equal(buyShopItem(g,99),false);
  const old=g.room.shop.stock.map(o=>o.id);assert.equal(rerollShop(g),true);assert.ok(g.room.shop.stock.every(o=>!old.includes(o.id)));assert.equal(rerollShop(g),true);assert.equal(rerollShop(g),true);assert.equal(rerollShop(g),false);
  assert.equal(g.rewardRandom(),control.rewardRandom());assert.equal(g.random(),control.random());assert.deepEqual(g.world,control.world);
  g.phase='playing';openShop(g);assert.equal(g.room.shop.rerolls,3);const time=g.time;tick(g,{right:true});assert.equal(g.time,time);
});
