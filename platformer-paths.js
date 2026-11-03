export const PATHS={
  ricochet:{name:'도탄 사냥꾼',short:'도탄',color:'#9de5f0',input:'J 유지 · 3발마다 추적탄',strength:'적이 모일수록 왕복 연쇄가 강해져요.',weakness:'평타 피해 −15% · 단독 보스에게 연쇄 불가',skill:'별무리 새총',skillText:'E: 큰 추적탄 3발이 적 사이를 왕복',damage:.85,interval:1,range:1,tags:['ricochet','scholar']},
  barrage:{name:'속사 말썽쟁이',short:'속사',color:'#ffbb91',input:'J 유지 · 과열 전에 끊어 쏘기',strength:'열 60 이상: 피해 +35% · 적중 집중 +2. 과열 직전까지 몰아쳐요.',weakness:'한 발 피해 −28% · 과열되면 냉각 전 사격 불가',skill:'냉각 난사',skillText:'E: 과열을 풀고 부채꼴로 큰 탄환 8발',damage:.72,interval:.62,range:.95,tags:['wind','hunter']},
  boulder:{name:'왕짱돌 장인',short:'차지',color:'#f4d18f',input:'J 눌러 충전 → 떼서 발사',strength:'완전 충전은 방패를 뚫는 큰 관통탄이에요.',weakness:'짧은 사거리 · 충전 중 몰려오는 적에 취약',skill:'왕짱돌',skillText:'E: 더 큰 왕짱돌이 굴러가며 관통 피해',damage:.9,interval:.7,range:.8,tags:['ember','guardian']},
};
export const AWAKENINGS={
  echo:{name:'분열의 약속',icon:'projectile',description:'직접 적중한 탄환이 주변 다른 적에게 작은 추적 파편 2발을 보내요.',cost:'최대 체력 −15% · 단독 적에게는 파편 없음',color:'#9de5f0'},
  predator:{name:'사냥꾼의 허기',icon:'snack',description:'190px 안에서 평타를 직접 맞히면 체력 3 회복. 0.6초마다 한 번.',cost:'탄환 사거리 −25% · 가까이서 싸워야 회복',color:'#b8e59b'},
  overload:{name:'무모한 새총',icon:'attack',description:'공격력 +25%. 왕새총에 필요한 집중이 60에서 45로 감소해요.',cost:'받는 피해 +30% · 실수를 크게 감수하는 선택',color:'#f2aa9a'},
};
export const skillCost=s=>Math.ceil((s.awakening==='overload'?45:60)*(1-s.cooldownReduction*.5));
export const isStyle=s=>Object.hasOwn(PATHS,s.style);
