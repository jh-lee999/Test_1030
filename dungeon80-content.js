import {ITEMS as BASE,COMBOS as OLD_COMBOS,UNLOCKS as OLD_UNLOCKS} from './dungeon77-content.js';
export {RARITIES,HEROES,LOADOUTS,AUGMENTS,ROLES} from './dungeon77-content.js';
import {RARITIES} from './dungeon77-content.js';
import {ROOM_NAMES as NAMES,FLOORS as OLD_FLOORS} from './dungeon77-content.js';
export const FLOORS=OLD_FLOORS.map(f=>({...f}));
export const ROOM_NAMES={...NAMES,supersecret:'깊숙한 비밀',puzzle:'별빛 발자국',forge:'기억 재봉실',omen:'잠긴 기회',angel:'별의 축복방',devil:'셰이디의 밀약방'};
export const ACTIVES={
 lantern:{name:'안개 걷는 등불',cost:2,text:'시야·지도 저주를 걷고 방 전체의 적을 1.5초 느리게 해요. 이미 확장된 지형은 줄이지 않아요.'},
 clapper:{name:'되감는 딸랑이',cost:3,text:'화면의 적 탄환 최대 24발을 가장 가까운 적에게 돌려보내요.'},
 dice:{name:'장난감 주사위',cost:4,text:'현재 방의 미획득 무료 유물을 다시 추첨해요. 버린 유물은 이번 판에 다시 나오지 않아요.'},
 pocket:{name:'접힌 귀가문',cost:3,text:'전투 중에도 현재 층의 시작방으로 돌아가요. 적·파괴물·보상은 리셋되지 않아요.'},
};
const defaults=['treasure','boss','shop','crate','goldChest','secret','forge'];
export const ITEMS=Object.fromEntries(Object.entries(BASE).map(([id,d])=>{
 const category=d.weapon?'weapon':id==='komi'?'familiar':d.kind==='스탯'?'stats':d.troll?'risk':['ward','frost','bell'].includes(id)?'defense':['greed','scope','luckyClover'].includes(id)?'utility':'shot';
 let pools=[...defaults];if(category==='weapon'||category==='familiar')pools=['treasure','boss','goldChest','forge'];
 if(d.troll)pools=['treasure','devil','goldChest','forge'];if(['ward','hardCandy','rarityLens','royalSeal'].includes(id))pools.push('angel');
 return [id,{...d,category,tier:d.rarity+1,pools}];
}));
const add=(id,name,category,text,icon77,extra={})=>ITEMS[id]={name,kind:'기믹',tag:category,category,tier:2,rarity:1,icon77,color:'#bfe2cb',pools:['treasure','boss','goldChest','forge'],text,...extra};
add('openingBell','등교 종','shot','방의 첫 평타는 두 배 피해. 첫 발이 빗나가도 기회는 소모돼요.',8);
add('restlessRibbon','들뜬 리본','shot','이동 중 발사한 평타의 피해 +20%. 예약한 발사 사양은 나중에 바뀌지 않아요.',1);
add('lastCrumb','마지막 빵조각','risk','체력 35% 이하에서 평타 피해 +45%.',3);
ITEMS.lastCrumb.icon77=3;ITEMS.lastCrumb.pools=['treasure','devil','goldChest'];
add('longSight','멀리 보는 유리','shot','발사점에서 300px 이상 날아온 탄환의 적중 피해 +25%.',4);
add('snowGlobe','녹지 않는 눈구슬','shot','얼린 적을 번개로 맞히면 3초 재사용의 서리 파동. 가까운 적을 잠깐 얼려요.',12,{tier:3,rarity:2,unlock:'stormLessons'});
add('cometThread','혜성 실타래','shot','분열탄에 귀환이 있으면 돌아오는 동안 한 번만 작은 혜성 두 발을 흩뿌려요. 파생탄은 다시 분열하지 않아요.',13,{tier:3,rarity:2,unlock:'branchLessons'});
add('juniorBook','저학년 공책','utility','저학년 +1. 버터의 추적 도탄 횟수, 벨벳의 충격 범위가 커져요.',17,{pools:['treasure','boss','shop','goldChest'],tier:1});
add('seniorBook','고학년 공책','utility','고학년 +1. 왕짱돌의 피해·크기·수명 또는 회전 궁극기를 강화해요.',16,{pools:['boss','angel','goldChest'],tier:2});
for(const [i,[id,d]]of Object.entries(ACTIVES).entries())add('active_'+id,d.name,'active',d.text+' 충전 '+d.cost+'칸.',[6,8,14,5][i],{active:id,tier:i===2?3:2,pools:['treasure','shop','goldChest','angel'],unlock:i===2?'branchLessons':undefined});
export const COMBOS=[...OLD_COMBOS,{parts:['frost','weather','snowGlobe'],name:'천둥 눈보라',text:'번개가 빙결을 이웃에게 옮겨요.',color:'#b9e5ee'},{parts:['lucky','belt','cometThread'],name:'귀환하는 혜성',text:'돌아오는 분열탄이 한 번 더 혜성을 흩뿌려요.',color:'#f0c4e2'},{parts:['charge','fan'],name:'세 갈래 왕짱돌',text:'차지탄이 세 갈래로 갈라져요. 각 탄환은 원래 피해의 58%.',color:'#edce8f'}];
export const combos=g=>COMBOS.filter(c=>c.parts.every(id=>g.items.includes(id)));
export const rarityCounts=g=>g.items.reduce((a,id)=>{if(ITEMS[id])a[ITEMS[id].rarity]++;return a;},[0,0,0,0]);
export const rarityOf=id=>RARITIES[ITEMS[id]?.rarity||0];
export const iconURL=id=>ITEMS[id]?.icon77!==undefined?'./assets/items77/icons.svg':ITEMS[id]?.icon76!==undefined?'./assets/sanctuary76/objects.webp':ITEMS[id]?.fan!==undefined?'./assets/sanctuary74/objects.webp':'./assets/trickcal-artifacts53/ArtifactIcon_'+ITEMS[id]?.source+'.png';
export const UNLOCKS={...OLD_UNLOCKS,stormLessons:{name:'천둥 눈보라 유물',goal:'서로 다른 보스 2종 격파'},branchLessons:{name:'혜성 유물·주사위',goal:'서로 다른 다음 층 경로 2종 방문'},eclipseRoute:{name:'완주 후 뒤섞인 소풍',goal:'세 겹의 아공간 탈출 1회'},puzzleMaster:{name:'별빛 퍼즐의 새 배치',goal:'발자국 퍼즐 한 번 완주'}};
export const CURSES={none:'평온',dusk:'안개 · 시야 제한',lost:'길잃음 · 방문한 방만 지도 표시',expanse:'확장 · 전투방 2개 추가'};
export const ROUTES={root:{name:'기본 길',text:'표준 편성과 위험 주기'},canopy:{name:'뿌리 우회로',text:'도서관에서도 포자와 둔화 지형, 방패·돌진 편성'},archive:{name:'잊힌 서고',text:'도서관 낙하 책, 포대·순간이동 편성'},moon:{name:'달빛 무대',text:'쌍 이동문과 혼합 편성'},echo:{name:'메아리 회랑',text:'낙하 책과 땅굴·소환 편성, 추가 무피격 동전'}};
