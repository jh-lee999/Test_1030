import {ITEMS as ORIGINAL_ITEMS,COMBOS as ORIGINAL_COMBOS,ROLES as ORIGINAL_ROLES} from './dungeon74-content.js';
import {AUGMENTS as OLD_AUGMENTS} from './dungeon75-content.js';
export const AUGMENTS=Object.fromEntries(Object.entries(OLD_AUGMENTS).map(([id,d])=>[id,{...d}]));
AUGMENTS.trail={...AUGMENTS.trail,text:'왕짱돌이 0.32초마다 불씨를 깔아요. 벨벳은 궁극기 회전 중 발밑에 불씨를 남겨요. 불씨는 1초 동안 주변 적을 때려요.'};
AUGMENTS.echo={...AUGMENTS.echo,text:'네 번째 평타마다 좌우로 60% 피해의 작은 탄환 두 발. 현재 관통·도탄·상태 효과를 계승하지만 다시 분열하지 않아요.'};

// New effects and names are fan-game rules, not original Trickcal mechanics.
export const ITEMS={
 ...Object.fromEntries(Object.entries(ORIGINAL_ITEMS).map(([id,v])=>[id,{...v}])),
 charge:{name:'대왕 고무줄',icon76:0,tag:'차지 무기',color:'#edc77e',weapon:'charge',rarity:1,text:'공격을 누르면 차지, 가득 차거나 놓으면 큰 관통탄. 다른 무기로 쓸 때는 네 번째 적중에 작은 폭발.'},
 fan:{name:'노란 바람부채',icon76:1,tag:'부채꼴 무기',color:'#e6ca84',weapon:'fan',rarity:1,text:'가까운 적에게 세 갈래로 사격. 다른 무기에서도 네 번째 공격마다 작은 날개탄 두 발을 더해요.'},
 prism:{name:'아공간 프리즘',icon76:2,tag:'광선 무기',color:'#91d8da',weapon:'prism',rarity:2,unlock:'prism',text:'엄폐물에서 멈추는 관통 광선. 도탄·귀환·분열·상태 효과도 계승해요. 다른 무기는 관통 +1.'},
 ward:{name:'비상 사탕',icon76:3,tag:'보호막 반격',color:'#e7b2c6',rarity:2,unlock:'ward',text:'최대 체력 +10, 처음 얻을 때 보호막 +10. 보호막으로 탄환을 막으면 반격탄을 쏴요.'},
 scope:{name:'잎사귀 망원경',icon76:4,tag:'사거리 귀환',color:'#a7cf9a',rarity:1,unlock:'scope',text:'사거리 +160. 탄환이 사거리 끝에 닿으면 돌아와 다시 적중할 수 있어요.'},
 greed:{name:'주머니 나침반',icon76:5,tag:'탐험 보급',color:'#e6c277',rarity:1,unlock:'greed',text:'동전 획득 범위 +55, 행운 +1. 무피격으로 전투방을 정리하면 동전이 하나 더 나와요.'},
};
ITEMS.lucky={...ITEMS.lucky,text:ITEMS.lucky.text+' 행운 +1.'};
ITEMS.yellow={...ITEMS.yellow,weapon:'pistol',rarity:2,text:'버터는 더 강하고 빠른 권총, 벨벳은 원거리 도끼 파동으로 교체. 궁극기 한 번에 두 차례 시전!'};
ITEMS.frost={...ITEMS.frost,text:'평타와 파생탄이 세 번 적중할 때마다 잠깐 얼려요. 보스는 짧게, 불씨와 만나면 해빙 폭발.'};
export const COMBOS=[...ORIGINAL_COMBOS,
 {parts:['charge','mirror'],name:'벽 너머 대왕돌',text:'차지 관통탄도 벽에 반사돼요',color:'#dfcc95'},
 {parts:['fan','rust'],name:'불꽃 부채',text:'부채꼴과 날개탄이 불씨를 남겨요',color:'#f2b68c'},
 {parts:['prism','frost'],name:'얼음빛 광선',text:'관통 광선과 파생탄도 빙결을 쌓아요',color:'#b8e2ec'},
];
export const combos=g=>COMBOS.filter(c=>c.parts.every(id=>g.items.includes(id)));
export const iconURL=id=>ITEMS[id]?.icon76!==undefined?'./assets/sanctuary76/objects.webp':ITEMS[id]?.fan!==undefined?'./assets/sanctuary74/objects.webp':'./assets/trickcal-artifacts53/ArtifactIcon_'+ITEMS[id]?.source+'.png';
export const ROOM_NAMES={start:'작은 쉼터',combat:'아공간 전투방',treasure:'황금 선물방',shop:'밤의 잡화점',secret:'벽 너머의 비밀',boss:'수호자의 무대',challenge:'두 무리 도전',sanctuary:'달콤한 휴식',bargain:'셰이디의 계약',rush:'모래시계 도전',archive:'잊힌 보관실'};
export const FLOORS=[
 {id:'forest',name:'이끼빛 숲',boss:'velvet',bossName:'벨벳',color:'#c6db9a',rule:'뿌리는 모두를 늦추고, 버섯 포자는 양쪽 모두를 해쳐요.'},
 {id:'library',name:'꿀빛 도서관',boss:'erpin',bossName:'에르핀',color:'#f1cb88',rule:'황금빛 낙하 예고를 보고 책장 사이의 안전한 길을 찾아요.'},
 {id:'moon',name:'달그림자 극장',boss:'shady',bossName:'셰이디',color:'#cfb3ec',rule:'짝을 이룬 이동문은 버터와 적 모두를 옮겨요. 출구 예고를 살펴보세요.'},
];
export const ROLES={...ORIGINAL_ROLES,velvet:{...ORIGINAL_ROLES.velvet,hp:650},erpin:{...ORIGINAL_ROLES.erpin,hp:950},shady:{...ORIGINAL_ROLES.shady,hp:1200}};
export const HEROES={
 butter:{name:'버터',hp:70,speed:235,damage:14,interval:.56,poster:'./assets/butter-original36/poster.png',ultimate:'왕새총',text:'새총과 원거리 탄도 조합. 옐로카드로 권총 전환.'},
 velvet:{name:'벨벳',hp:82,speed:220,damage:24,interval:.66,poster:'./assets/trickcal-elites71/velvet-poster.png',ultimate:'원심분리',unlock:'velvetHero',text:'도끼의 전방 베기와 이동 회전. 원작 전신 모션을 사용해요.'},
};
export const LOADOUTS={
 random:{name:'뜻밖의 선물',item:null,text:'첫 방에서 무작위 아이템 하나.'},
 charged:{name:'차지 준비',item:'charge',unlock:'chargedStart',text:'첫 방의 선물이 대왕 고무줄.'},
 spread:{name:'바람 준비',item:'fan',unlock:'fanStart',text:'첫 방의 선물이 노란 바람부채.'},
 scout:{name:'탐험 준비',item:'scope',unlock:'scope',text:'첫 방의 선물이 잎사귀 망원경.'},
 prism:{name:'빛의 준비',item:'prism',unlock:'prismStart',text:'첫 방의 선물이 아공간 프리즘.'},
};
export const UNLOCKS={
 chargedStart:{name:'차지 시작 장비',goal:'한 판에서 전투방 3개 정리'},
 fanStart:{name:'부채 시작 장비',goal:'한 판에서 적 20마리 처치'},
 velvetHero:{name:'플레이 캐릭터 벨벳',goal:'벨벳 격파'},
 prism:{name:'프리즘 유물',goal:'벨벳 격파'},
 prismStart:{name:'프리즘 시작 장비',goal:'에르핀 격파'},
 ward:{name:'비상 사탕 유물',goal:'두 무리 도전 성공'},
 scope:{name:'망원경 유물·시작 장비',goal:'비밀방 입장'},
 greed:{name:'나침반 유물',goal:'최대 체력 계약 수락'},
 wildRoute:{name:'샛길 경유 탐사',goal:'에르핀 격파'},
};
