// Original icons, new explicitly fan-game rules. No original artwork modified.
export const ITEMS={
 lucky:{name:'왕사탕의 행운',source:73,color:'#eeb96b',tag:'분열',text:'돌이 적중하면 작은 돌 2개로 갈라져요. 작은 돌은 다시 갈라지지 않아요.'},
 scythe:{name:'보랏빛 낫',source:40,color:'#b69bdf',tag:'저학년',text:'세 번째 공격은 적을 추적하며 4번 튕겨요. 가까운 이전 적에게도 다시 튕겨요.'},
 weather:{name:'날씨는 맑음',source:12,color:'#8ccacb',tag:'전하',text:'네 번째 적중에 주변 두 적을 잇는 번개. 보랏빛 낫과 만나면 반사 때도 번개가 터져요.'},
 rust:{name:'녹슨 단검',source:80,color:'#e8a580',tag:'불씨',text:'적중한 자리에 2초간 불씨. 왕사탕의 행운과 만나면 분열탄도 불씨를 남겨요.'},
 mace:{name:'무자비한 철퇴',source:65,color:'#b4b8de',tag:'충격',text:'평타가 적 한 명을 더 관통하고, 세 번째 적중에 충격파를 만들어요.'},
 komi:{name:'코미의 베개',source:11,color:'#ebbdcf',tag:'반사',text:'공전하는 베개가 닿은 적을 밀치고 적 탄환을 돌려줘요. 철퇴와 만나면 반사 때 충격파.'},
 belt:{name:'지옥의 요술 벨트',source:10,color:'#e4c777',tag:'귀환',text:'돌이 0.5초 뒤 되돌아와 다시 맞혀요. 발사 간격도 15% 짧아져요.'},
 yellow:{name:'옐로카드',source:83,color:'#f5cf6c',tag:'권총',text:'평타를 피해 1.5배의 빠른 관통 권총으로 교체. 왕새총 한 번에 왕짱돌 2개!'},
 mirror:{name:'도탄 거울',fan:8,color:'#91d4d2',tag:'벽 도탄',text:'평타가 벽과 장애물에 두 번 튕겨요. 날씨는 맑음과 조합하면 도탄 지점에 번개가 터져요.'},
 frost:{name:'서리 별사탕',fan:9,color:'#a9d4f2',tag:'빙결',text:'세 번째 평타 적중마다 잠깐 얼려 공격과 이동을 멈춰요. 보스는 짧게, 불씨와 만나면 해빙 폭발.'},
 bell:{name:'꿈방울',fan:10,color:'#debded',tag:'처치 파동',text:'처치한 적에게서 파동이 퍼져 주변 적을 밀치고 때려요. 베개와 만나면 파동이 적 탄환도 지워요.'},
 fireworks:{name:'폭죽 상자',fan:11,color:'#f0b07c',tag:'폭탄 변형',text:'폭탄 +2. 폭발 때 현재 평타 효과를 가진 작은 탄환 8발이 퍼져요. 도탄 거울도 함께 적용돼요.'},
};
export const iconURL=id=>ITEMS[id].fan!==undefined?'./assets/sanctuary74/objects.webp':'./assets/trickcal-artifacts53/ArtifactIcon_'+ITEMS[id].source+'.png';
export const COMBOS=[{parts:['scythe','weather'],name:'뇌우 도탄',text:'추적탄이 튕길 때마다 근처 적에게 번개',color:'#a9d7e2'},{parts:['lucky','rust'],name:'불꽃 사탕',text:'분열탄도 불씨를 남김',color:'#f2b68c'},{parts:['komi','mace'],name:'베개 대소동',text:'반사에 성공하면 주변 적에게 충격파',color:'#dcc4e8'}];
export const combos=g=>COMBOS.filter(c=>c.parts.every(id=>g.items.includes(id)));
COMBOS.push({parts:['mirror','weather'],name:'굴절 번개',text:'벽이나 장애물 도탄 지점에서 주변 적에게 번개',color:'#a9e5e7'},{parts:['frost','rust'],name:'해빙 소동',text:'얼어 있는 적에게 불씨가 닿으면 한 번 폭발',color:'#e6c2bb'},{parts:['bell','komi'],name:'꿈의 파장',text:'처치 파동이 주변 적 탄환도 지움',color:'#e1c6ef'});
export const ROOM_NAMES={start:'작은 쉼터',combat:'아공간의 잔상',treasure:'황금 선물방',shop:'밤의 잡화점',secret:'벽 너머의 비밀',boss:'수호자의 무대',challenge:'장난꾸러기의 도전'};
export const FLOORS=[{id:'forest',name:'이끼빛 숲',boss:'velvet',bossName:'벨벳',rule:'바위와 끈적한 이끼 사이로 회전 공격을 피하세요.',color:'#c6db9a'},{id:'library',name:'꿀빛 도서관',boss:'erpin',bossName:'에르핀',rule:'책장 너머 마력탄을 피해 사격 각도를 찾으세요.',color:'#f1cb88'},{id:'moon',name:'달그림자 극장',boss:'shady',bossName:'셰이디',rule:'결정과 틈새 사이, 순간이동 예고에서 벗어나세요.',color:'#cfb3ec'}];
export const ROLES={fan:{hp:36,speed:91,radius:17,damage:10},rusher:{hp:58,speed:65,radius:19,damage:13},archer:{hp:40,speed:53,radius:17,damage:10},caster:{hp:48,speed:48,radius:19,damage:12},guard:{hp:85,speed:43,radius:23,damage:13},velvet:{hp:700,speed:55,radius:29,damage:14,boss:true},erpin:{hp:1050,speed:48,radius:28,damage:14,boss:true},shady:{hp:1400,speed:56,radius:29,damage:16,boss:true}};
