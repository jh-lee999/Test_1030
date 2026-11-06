import {ITEMS as OLD} from './dungeon80-content.js';
export * from './dungeon80-content.js';
// Text-only overrides; never mutate archived content objects or item pools.
export const ITEMS={...OLD,
 scythe:{...OLD.scythe,text:'평타 3회마다 도탄탄 발사. 조준 방향으로 날아가 적중한 뒤 임의 방향으로 튕겨요. 도탄 최소 4회, 저학년이 높으면 더 늘어요.'},
 seekingStar:{...OLD.seekingStar,text:'조준 방향으로 짧게 직진한 뒤 전방에 보이는 적을 완만하게 추적해요. 즉발 광선과 근접 베기는 대신 피해 +10%.'},
 juniorBook:{...OLD.juniorBook,text:'저학년 +1. 버터의 적중 후 무작위 도탄 횟수, 벨벳의 충격 범위가 커져요.'},
};
