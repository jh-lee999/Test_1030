// Fan-game rules, not claimed to be Trickcal's original artifact effects.
export const MOVES = {
 stone:{name:'버터의 새총',icon:'◈',color:'#e6bd75',ranks:['가까운 적에게 자동 사격','부메랑: 탄이 돌아오며 다시 타격 · 받으면 왕새총 충전','파쇄탄: 첫 충돌에서 파편 · 벽에 튕긴 뒤 귀환']},
 chain:{name:'말썽 유도탄',icon:'✦',color:'#a5d4bb',ranks:['적 사이를 3회 추적 · A→B→A 재타격','서리탄: 맞은 적을 둔화 · 튕김 5회','씨앗탄: 처치 시 한 번만 새 유도탄 발생 · 튕김 7회']},
 pillow:{name:'베개 호위',icon:'☁',color:'#e3a9c2',ranks:['주위를 돌며 적을 밀어냄','반사 베개: 적 탄환을 쳐서 되돌려 보냄','몸통 볼링: 밀려난 적이 다른 적과 충돌 · 베개 2개']},
 storm:{name:'날씨는 맑음',icon:'ϟ',color:'#a9c9eb',ranks:['가까운 적에게 번개 · 짧은 기절','잔류 전하: 유도탄으로 다시 맞히면 주변 방전 · 뇌운 방패 융합은 베개로도 발동','뇌운: 번개 자리에 지속 번개 지대 생성']},
 bomb:{name:'별사탕 폭탄',icon:'✺',color:'#e7a689',ranks:['적 무리로 던지는 지연 폭발','불씨: 폭발 자리에 적을 늦추는 불길이 남음','연쇄 점화: 불붙은 적 처치 시 주변으로 불길 번짐']}
};
export const RELICS = {
 comet:{name:'별똥별 신발',icon:'»',text:'이동 거리마다 뒤에 지뢰를 남겨요. 1초 뒤 무장 · 적이 밟으면 폭발.'},
 hoarder:{name:'욕심쟁이 주머니',icon:'◎',text:'경험치 10개를 주울 때마다 주변 적을 끌어모으는 소용돌이. 모았다가 한 번에 터뜨려요.'},
 frost:{name:'시원한 도시락',icon:'❄',text:'제자리에 0.7초 머물면 서리 원이 생겨요. 다가오는 적을 늦추지만 가만히 버틸 수는 없어요.'},
 echo:{name:'빈자리 인형',icon:'♧',text:'왕새총을 쓰면 제자리에 분신을 남겨요. 분신은 적을 유인하고 2초 뒤 폭발.'},
 harvest:{name:'축제 초대장',icon:'✿',text:'정예·수호자를 쓰러뜨리면 날아다니는 적 탄환을 경험치로 바꿔요.'},
 mirror:{name:'반짝이는 단추',icon:'◇',text:'피격을 무적으로 피한 것이 아닌 실제 반사 3회마다 왕새총 쿨다운을 4초 줄여요.'}
};
export const FUSIONS = {
 thunderweb:{name:'천둥 거미줄',icon:'ϟ',parts:['chain','storm'],text:'유도탄이 튕긴 두 지점 사이에 번개 줄을 걸어요. 줄을 가로지르는 적도 감전.'},
 dreamoven:{name:'움직이는 화덕',icon:'☁',parts:['pillow','bomb'],text:'베개가 불길을 주워 6초간 불꽃을 두르고, 반사한 탄환도 폭발해요.'},
 popcorn:{name:'팝콘 새총',icon:'✺',parts:['stone','bomb'],text:'귀환탄이 불길을 지나면 점화돼요. 다음 충돌에서 폭발하고 새총 파편도 불씨를 남겨요.'},
 tempest:{name:'뇌운 방패',icon:'◇',parts:['pillow','storm'],text:'반사한 탄환이 유도 번개로 바뀌어요. 베개로 전하가 붙은 적을 치면 주변까지 방전.'},
 firefly:{name:'반딧불 추격전',icon:'✦',parts:['stone','chain'],text:'받아낸 귀환탄이 주변 적에게 새 유도탄 한 발을 돌려줘요. 다시 돌아오는 조각은 재발동하지 않아요.'}
};
export const MAPS = {
 forest:{name:'뒤틀린 숲',color:'#41655d',light:'#a6d7bd',rule:'가시꽃이 주기적으로 피어요. 붉은 원 밖으로 이동.',hazard:'thorn',unlock:'기본 개방'},
 night:{name:'잠들지 않는 정원',color:'#333e62',light:'#bdb2e9',rule:'달의 구역은 적과 버터 모두를 느리게 해요. 경계를 이용하세요.',hazard:'moon',unlock:'균열 봉인 2회 누적'},
 ember:{name:'별사탕 화덕',color:'#654947',light:'#e6ba86',rule:'증기 분출 예고를 보고, 엄폐물 사이로 이동하세요.',hazard:'steam',unlock:'융합 1종 발견'}
};
export const LOADOUTS={
 butter:{name:'말썽의 시작',move:null,unlock:'기본 개방'},
 guard:{name:'베개와 함께',move:'pillow',unlock:'균열 봉인 2회 누적'},
 hunter:{name:'유도탄 실험',move:'chain',unlock:'융합 1종 발견'}
};
export const STUDIES={
 vitality:{name:'든든한 아침',text:'다음 새 판 최대 체력 +5',cap:3,costs:[3,6,9]},
 stride:{name:'가벼운 발걸음',text:'다음 새 판 이동 속도 +2%',cap:3,costs:[3,6,9]},
 pocket:{name:'주머니 손질',text:'다음 새 판 경험치 흡수 반경 +8',cap:3,costs:[2,4,6]},
 insight:{name:'다른 가능성',text:'다음 새 판 성장 다시 뽑기 +1',cap:2,costs:[5,10]}
};
export function fusionProgress(g,id){const f=FUSIONS[id];return f.parts.map(k=>({id:k,name:MOVES[k].name,level:g.moves[k]?.level||0,required:3}));}
export function unlockedMaps(p){return ['forest',...(p.totalSeals>=2?['night']:[]),...(p.discovered.length?['ember']:[])];}
export function unlockedLoadouts(p){return ['butter',...(p.totalSeals>=2?['guard']:[]),...(p.discovered.length?['hunter']:[])];}
export const metaBonuses=studies=>({hp:5*studies.vitality,speed:1+.02*studies.stride,magnet:8*studies.pocket,rerolls:studies.insight});
export function moveStats(id,level=1){return {
 stone:{damage:[14,18,23][level-1],cooldown:.62,count:1,pierce:level>=3?1:0,speed:570},
 chain:{damage:[18,23,29][level-1],cooldown:2,bounces:[3,5,7][level-1],speed:490},
 pillow:{damage:[14,19,25][level-1],cooldown:.65,count:level>=3?2:1,radius:86},
 storm:{damage:[32,43,55][level-1],cooldown:3.2,count:level>=3?3:2},
 bomb:{damage:[35,46,59][level-1],cooldown:2.8,radius:95}
}[id];}
