import {COMBOS as OLD,ITEMS as BASE} from './dungeon82-content.js';
export * from './dungeon82-content.js';
export const COMBOS=[...OLD,
 {parts:['mirror','scythe'],name:'벽을 타는 도탄',text:'저학년·낫 도탄탄이 벽에서도 유한 횟수만큼 반사됩니다.',color:'#d6c3ef'},
 {parts:['frost','belt'],name:'돌아오는 빙하',text:'돌아오는 본체 탄환이 적에게 맞으면 한 번만 냉기 파동을 내고 주변 적을 얼립니다.',color:'#bfe5f0'},
 {parts:['fireworks','bell'],name:'소풍 불꽃놀이',text:'폭탄을 놓을 때 조합이 있으면 폭발 뒤 네 방향에 짧은 불씨 지대가 남습니다.',color:'#f0c58a'},
];
export const combos=g=>COMBOS.filter(c=>c.parts.every(id=>g.items.includes(id)));
export const FAMILIES={lucky:['split'],fan:['split'],afterImage:['split'],scythe:['bounce'],mirror:['bounce'],belt:['return'],scope:['return'],cometThread:['return','split'],frost:['element'],weather:['element'],rust:['element'],snowGlobe:['element'],mace:['impact'],charge:['impact'],bell:['impact'],prism:['impact'],fireworks:['impact'],ward:['defense'],hardCandy:['defense'],komi:['defense'],greed:['economy'],luckyClover:['economy'],cursedCoupon:['economy'],juniorBook:['school'],seniorBook:['school']};
export const isMechanic=id=>!!(BASE[id]?.weapon||BASE[id]?.active||FAMILIES[id]?.some(f=>['split','bounce','return','element','impact'].includes(f))||['ward','komi','yellow','seekingStar','collectionBook'].includes(id));
