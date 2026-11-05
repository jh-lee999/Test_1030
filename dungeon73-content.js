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
};
export const iconURL=id=>'./assets/trickcal-artifacts53/ArtifactIcon_'+ITEMS[id].source+'.png';
export const COMBOS=[{parts:['scythe','weather'],name:'뇌우 도탄',text:'추적탄이 튕길 때마다 근처 적에게 번개',color:'#a9d7e2'},{parts:['lucky','rust'],name:'불꽃 사탕',text:'분열탄도 불씨를 남김',color:'#f2b68c'},{parts:['komi','mace'],name:'베개 대소동',text:'반사에 성공하면 주변 적에게 충격파',color:'#dcc4e8'}];
export const combos=g=>COMBOS.filter(c=>c.parts.every(id=>g.items.includes(id)));
export const ROOM_NAMES={start:'작은 쉼터',combat:'숲의 잔상',treasure:'숨겨 둔 선물',shop:'밤의 잡화점',secret:'벽 너머의 비밀',boss:'셰이디의 무대'};
export const ROLES={fan:{hp:36,speed:91,radius:17,damage:10},rusher:{hp:58,speed:65,radius:19,damage:13},archer:{hp:40,speed:53,radius:17,damage:10},caster:{hp:48,speed:48,radius:19,damage:12},guard:{hp:85,speed:43,radius:23,damage:13},shady:{hp:1150,speed:56,radius:29,damage:16}};
