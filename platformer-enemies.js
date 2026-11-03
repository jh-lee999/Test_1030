// Source art names and fan-game combat roles are deliberately separate.
export const ENEMY_TYPES={
  fan:{name:'추격병',hint:'근접 연타 · 거리 벌리기',hp:48,w:44,h:94},
  archer:{name:'궁수',hint:'조준 사격 · 수직 이동',hp:38,w:44,h:94},
  rusher:{name:'광전사',hint:'도약 돌진 · 착지 후 빈틈',hp:65,w:48,h:100},
  guard:{name:'방패병',hint:'정면 75% 방어 · 뒤쪽/왕짱돌 공략',hp:90,w:58,h:100},
  caster:{name:'주술사',hint:'바닥 저주 · 시전 전에 처치',hp:43,w:44,h:100},
  drone:{name:'추적 드론',hint:'발판 넘어 추격 · 점사 회피',hp:42,w:52,h:75},
  ghost:{name:'이불령',hint:'원형 탄막',hp:460,w:126,h:148},
};
export const ENCOUNTERS=[
  {id:'hunt',name:'사냥 무리',hint:'도약 돌진과 공중 견제',roster:['rusher','drone','fan','archer']},
  {id:'wall',name:'방패 전열',hint:'방패 뒤의 사수를 먼저 끊기',roster:['guard','archer','rusher','guard','caster']},
  {id:'hex',name:'저주 추격대',hint:'드론을 피하며 주술사 집중 공격',roster:['drone','caster','rusher','guard','drone']},
];
