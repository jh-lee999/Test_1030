import {ITEMS as PREVIOUS} from './dungeon76-content.js';
export {AUGMENTS,COMBOS,combos,ROOM_NAMES,FLOORS,ROLES,HEROES,LOADOUTS,UNLOCKS} from './dungeon76-content.js';
export const RARITIES=[
 {name:'일반',color:'#c9d3bf',weight:60,price:5},
 {name:'희귀',color:'#80cce4',weight:28,price:9},
 {name:'영웅',color:'#c5a0e9',weight:10,price:14},
 {name:'전설',color:'#f3cd75',weight:2,price:22},
];
const grades={lucky:1,scythe:2,weather:2,rust:0,mace:1,komi:2,belt:1,yellow:3,mirror:1,frost:1,bell:1,fireworks:0,charge:1,fan:1,prism:2,ward:2,scope:1,greed:1};
export const ITEMS=Object.fromEntries(Object.entries(PREVIOUS).map(([id,d])=>[id,{...d,rarity:grades[id],kind:'기믹'}]));
const add=(id,name,rarity,icon77,kind,text,stats={},extra={})=>ITEMS[id]={name,rarity,icon77,kind,tag:kind,color:RARITIES[rarity].color,text,stats,...extra};
// Original fan-game names/rules, not official Trickcal items or effects.
add('powerCandy','힘나는 왕사탕',0,0,'스탯','공격력 +3.',{damageFlat:3});
add('fastRibbon','재빠른 리본',0,1,'스탯','공격 속도 +12%.',{rate:.12});
add('featherShoes','깃털 실내화',0,2,'스탯','이동속도 +18.',{speed:18});
add('ironLunch','든든한 도시락',0,3,'스탯','최대 체력 +12. 획득할 때 체력 12도 회복해요.',{hp:12},{healOnAcquire:12});
add('smoothPebble','매끈한 조약돌',0,4,'스탯','탄환 속도 +18%. 즉발 광선과 근접 베기의 속도는 바뀌지 않아요.',{shotSpeed:.18});
add('longString','긴 새총줄',0,5,'스탯','기본 사거리 +100.',{range:100});
add('luckyClover','네잎 사탕풀',1,6,'스탯','행운 +2. 높은 등급 유물과 보급의 추첨 가중치가 올라가요.',{luck:2});
add('thickGloves','두툼한 장갑',1,7,'스탯','공격력 +18%.',{damage:.18});
add('schoolBell','쉬는 시간 종',1,8,'스탯','공격 속도 +22%.',{rate:.22});
add('runningRibbon','달리기 완장',1,9,'스탯','이동속도 +32.',{speed:32});
add('hardCandy','튼튼한 하트 사탕',2,10,'스탯','최대 체력 +22. 획득할 때 체력 22도 회복해요.',{hp:22},{healOnAcquire:22});
add('damageFocus','집중의 별',2,11,'스탯','공격력 +35%.',{damage:.35});
add('seekingStar','길찾는 별가루',1,12,'기믹','탄환이 가까운 적을 완만하게 추적해요. 즉발 광선과 근접 베기는 대신 피해 +10%.');
add('afterImage','남겨진 잔상',2,13,'기믹','다섯 번째 평타마다 0.15초 뒤에 55% 피해의 잔상탄 하나. 탄도·상태를 계승하지만 다시 분열하지 않아요.');
add('rarityLens','빛바랜 감정경',1,14,'등급 연동','보유한 희귀 이상 유물 하나마다 공격력 +4%. 최대 +40%, 자신도 포함해요.');
add('commonCrown','잡동사니 왕관',2,15,'등급 연동','보유한 일반 유물 하나마다 공격 속도 +5%. 최대 +30%.');
add('royalSeal','금빛 초대장',3,16,'등급 연동','보유한 전설 유물 하나마다 관통 +1. 최대 +3, 자신도 포함해요.');
add('collectionBook','완벽한 소풍 도감',3,17,'등급 연동','네 등급을 모두 모으면 네 번째 평타마다 35% 피해의 원형 탄환 6발. 상태를 계승하지만 다시 분열하지 않아요.');
add('glassMarble','금간 구슬',1,18,'트롤','공격력 +65%, 최대 체력 −24. 현재 체력도 새 상한까지 줄어들어요. 최종 최대 체력은 최소 24.',{damage:.65,hp:-24},{troll:true,warning:'강한 피해 / 낮아지는 생존력'});
add('snailShell','산책 금지 달팽이',0,19,'트롤','공격력 +45%, 이동속도 −28%.',{damage:.45,speedMultiplier:.72},{troll:true,warning:'강한 피해 / 느린 회피'});
add('wetMatches','젖은 폭죽',0,20,'트롤','처음 획득 시 폭탄 +5. 폭발 범위 +30%, 적에게 주는 폭탄 피해 −45%. 내 폭탄에 다치는 범위도 넓어져요.',{bombRadius:.3,bombDamage:-.45},{troll:true,bombsOnAcquire:5,warning:'넓은 폭발 / 약한 피해·자폭 주의'});
add('heavyAnklet','금납 신발',1,21,'트롤','관통 +2, 최종 사거리 −35%, 이동속도 −12%.',{pierce:2,rangeMultiplier:.65,speedMultiplier:.88},{troll:true,warning:'관통 강화 / 짧은 사거리·느린 이동'});
add('leakyPouch','구멍난 주머니',2,22,'트롤','공격력 +50%. 실제 체력을 잃는 피격마다 동전 1닢을 잃어요. 보호막만 줄면 잃지 않아요.',{damage:.5},{troll:true,warning:'강한 피해 / 피격 시 지갑 손실'});
add('cursedCoupon','셰이디의 검은 쿠폰',3,23,'트롤','상점 상품 40% 할인. 대신 받는 모든 피해 +25%. 할인가는 올림하며 최소 1닢이에요.',{incoming:.25},{troll:true,warning:'싼 물건 / 아픈 피격'});
export const rarityOf=id=>RARITIES[ITEMS[id]?.rarity??0];
export const rarityCounts=g=>g.items.reduce((out,id)=>{if(ITEMS[id])out[ITEMS[id].rarity]++;return out;},[0,0,0,0]);
export const iconURL=id=>ITEMS[id]?.icon77!==undefined?'./assets/items77/icons.svg':ITEMS[id]?.icon76!==undefined?'./assets/sanctuary76/objects.webp':ITEMS[id]?.fan!==undefined?'./assets/sanctuary74/objects.webp':'./assets/trickcal-artifacts53/ArtifactIcon_'+ITEMS[id]?.source+'.png';
