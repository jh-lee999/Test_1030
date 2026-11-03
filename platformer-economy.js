import {ITEMS,RARITIES,rollBuildItems} from './platformer-build.js?v=42';

export const CONTRACTS={
  frenzy:{name:'위험 수당',description:'다음 전투: 적 체력 +35%, 받는 피해 +20%. 클리어하면 24 G.',coins:24},
  haste:{name:'빠른 배달',description:'다음 전투를 60초 안에 클리어하면 30 G. 메뉴를 연 시간은 제외해요.',coins:30},
  flawless:{name:'말끔한 거래',description:'다음 전투에서 체력 손실 없이 클리어하면 25 G + 할인권 1장. 보호막 피해는 허용해요.',coins:25},
};
export const HEAL_PRICE=12,BAG_PRICE=18;
export const createEconomy=()=>({purchases:0,sales:0,coinsSpent:0,salesEarned:0,stamps:0,coupons:0,visitedShops:[],contractsWon:0,contractsLost:0,bags:0});
export const basePrice=id=>RARITIES[ITEMS[id].rarity].price;
export const salePrice=id=>Math.floor(basePrice(id)*.35);
export const offerPrice=(g,offer)=>Math.ceil(basePrice(offer.id)*(offer.sale?.75:1)*(g.economy.coupons>0?.8:1));
export const shopRerollCost=g=>10+(g.room.shop?.rerolls||0)*4;
export function marketStock(random,stats,depth,exclude=[]){return rollBuildItems(random,stats,depth,3,exclude).map((id,i)=>({id,sold:false,sale:i===0}));}
export function createMarket(g){return{stock:marketStock(g.shopRandom,g.stats,g.room.index),rerolls:0,healed:false,bagOpened:false};}
export function rollSealedBag(random){
  // Roll rarity first: the displayed odds don't change with item pool sizes.
  const roll=random(),rarity=roll<.6?'common':roll<.92?'rare':'epic',pool=Object.keys(ITEMS).filter(id=>ITEMS[id].rarity===rarity);
  return pool[Math.floor(random()*pool.length)];
}
export function contractLabel(g){
  const c=g.contract;if(!c)return '계약 없음 · 상인에게 선택 가능';
  const name=CONTRACTS[c.id].name;
  if(c.status==='pending')return `${name} · 다음 전투 대기`;
  if(c.status!=='active')return `${name} · ${c.status==='completed'?'성공':'실패'}`;
  if(c.id==='haste')return `${name} · 남은 ${Math.max(0,60-c.elapsed).toFixed(1)}초`;
  if(c.id==='flawless')return `${name} · ${(g.room.hpDamage||0)>0?'체력 손실 발생':'체력 손실 없음'}`;
  return `${name} · 적 HP +35% / 받는 피해 +20%`;
}
