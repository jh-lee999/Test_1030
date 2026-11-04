// Verified Korean source snapshot: Triple3T/trickcaltool, 2025-08-25.
// Original descriptions are summaries, NOT a claim about current live balance.
const artifact=(sourceId,name,original,text,tag,color)=>({sourceId,name,original,text,tag,color,icon:'book-high',image:`./assets/trickcal-artifacts53/ArtifactIcon_${sourceId}.png`});
export const TRICKCAL_ARTIFACTS={
 yellow:artifact(83,'버터의 옐로카드','강화 공격 피해 증가. 아군의 직접 피해로 분노를 모아 강화 공격을 변경해요.','삼총사·별빛 행진 배수 ×1.35. 실제 체력 피해마다 분노 +1(최대 3). 분노 3에서 해당 조합 공격은 추가 ×2 후 분노 소모.','분노 / 강화','#e3bf69'),
 komi:artifact(11,'코미의 베개','체력이 30% 이하가 되면 일정 시간 체력을 재생해요.','반격 후 살아 있고 체력이 30% 이하면 8 회복. 전투마다 한 번, 사망을 되돌리지는 못해요.','위기 회복','#e8b6ce'),
 weather:artifact(12,'날씨는 맑음 카드','일반 공격 3회 적중마다 번개 추가 피해를 줘요.','득점 주사위가 3번 발동할 때마다 칩 +18. 리본의 재발동도 세고, 남은 충전은 다음 공격에 이어져요.','누적 번개','#a7c9e5'),
 belt:artifact(10,'긴급 보호 벨트','전투 시작 시 같은 열 아군에게 일정 시간 보호막을 부여해요.','매 전투 시작 시 보호막 8. 반격을 먼저 흡수하며, 보호막만 깎이면 분노·메이스가 충전되지 않아요.','전투 보호막','#a6c9b0'),
 scythe:artifact(40,'림의 낫','일반 공격에 맞은 체력 18% 이하 일반 몬스터를 처형해요.','자유 투척·짝꿍 공격 뒤 일반 적의 남은 체력이 최대치의 18% 이하면 처형. 보스에게는 적용되지 않아요.','마무리','#baa4d8'),
 lucky:artifact(73,'행운의 주사위','일반 공격 피해의 일부를 체력으로 흡수해요. 재사용 대기시간이 있어요.','자유 투척·짝꿍이 실제 깎은 체력의 5% 회복(내림, 공격당 최대 4). 초과 피해는 흡혈하지 못해요.','일반 공격 흡혈','#dfb28d'),
 rust:artifact(80,'녹슨 붉은 검','체력이 가득 차 있지 않으면 일시적으로 공격 속도와 피해가 증가해요.','공격을 결정할 때 체력이 최대치보다 낮으면 배수 ×1.2. 체력 회복과 공격 강화 사이를 선택해요.','상처 강화','#da939e'),
 mace:artifact(65,'참회의 메이스','일정 횟수 피격 후 다음 일반 공격에 추가 피해와 기절을 부여해요.','실제 체력 피해를 3번 받으면 충전. 다음 자유 투척·짝꿍 배수 ×1.5, 해당 반격 취소 후 충전 소모.','피격 / 기절','#c3addb')
};
