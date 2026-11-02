# 셰이디의 아공간 탈출

버터와 코미 중 한 명을 선택해 셰이디의 뒤틀린 아공간을 돌파하는 모바일 우선 방 탐험 액션 로그라이트입니다.

## 현재 구현

- 매 판 구조가 달라지는 자동 생성 던전 지도
- 상하좌우 문으로 연결된 비선형 방과 자유로운 왕복 이동
- 적을 남겨둔 채 다른 방으로 도망갈 수 있으며 돌아오면 전투 상태 유지
- 미니맵에 방문방, 잠긴 보물방, 보스방, 발견한 비밀방 표시
- 열쇠를 소모해 여는 보물방
- 벽 가까이에 폭탄을 설치해 발견하는 비밀방
- 일반방 클리어 시 열쇠, 폭탄, 회복 간식 드롭
- WASD/가상 조이스틱 이동, 방향키/공격 조이스틱 평타
- 버터: 원거리 새총 평타
- 버터 저학년: 평타 중 확률로 발동하는 추적탄, 레벨만큼 적 사이를 튕김
- 버터 고학년: 벽을 튕기며 관통 피해를 주는 왕짱돌, 지속 중 무적
- 코미: 넓게 휘두르는 근접 베개 평타
- 코미 저학년: 누워서 체력을 회복하고 가까운 적에게 반사 피해
- 코미 고학년: 일정 시간 거대화하고 밟는 적에게 피해, 방 이동 후에도 지속
- 공격 속도, 탄환 속도, 공격력, 체력, 이동 속도 아이템
- 저학년/고학년 레벨 아이템과 캐릭터별 성장 공식
- 보물방과 비밀방에서 중복 없는 아이템 3개 중 하나 선택
- PC와 모바일 조작 지원
- 전용 SVG 아이콘으로 통일한 HUD, 미니맵, 자원 및 스킬 UI
- 캐릭터 호흡·보행 체중 이동·발먼지·평타 반동·피격 플래시
- 적 스쿼시 모션, 투사체 잔상, 문 맥동, 방 전환 애니메이션
- 큰 머리·짧은 몸통·작은 발로 단순화한 버터의 네 방향 스프라이트
- Blender에서 제작한 실제 메시·뼈대와 정지·걷기·새총·이동사격·고학년 애니메이션
- 12단계 보행과 8단계 사격을 독립 조합한 네 방향 전신 500프레임
- 새총을 잡는 손과 줄을 당기는 손 고정, 좌우 반전 없는 네 방향 촬영
- 짧은 발의 번갈아 접지, 머리·귀·꼬리의 작은 후속 움직임

스프라이트 전체 프레임은 sprite-preview.html에서 확인할 수 있습니다. npm run check:sprites로 실제 이미지의 경계와 발 기준점을 검사합니다(개발 도구: Node.js, ImageMagick).

현재 보행·사격·고학년 모션은 [motion-preview.html](motion-preview.html)에서 비교할 수 있습니다. [Blender 원본](assets/models/butter.blend)을 열면 같은 모델의 메시, 재질, 24개 뼈, 개별 동작과 동기화된 전체 타임라인을 수정할 수 있습니다. 게임은 이 모델을 미리 렌더한 WebP 한 장만 읽으므로 Blender나 3D 라이브러리 설치 없이 실행됩니다. 코미는 기존 스프라이트를 유지합니다.

## 모델과 애니메이션 재생성

Blender 4.3(제작·검증 버전 4.3.2), Node.js와 ImageMagick이 필요합니다. 게임 실행 자체에는 필요하지 않습니다.

```sh
npm run render:animations
npm run pack:model
npm run check:sprites
blender --background assets/models/butter.blend --python-exit-code 1 --python tools/check-butter-model.py
```

`tools/build_butter_model.py`가 실제 메시·리그·재질·동작과 네 방향 렌더를 만듭니다. `assets/butter-model.json`은 128px 셀 좌표 및 손·새총 연결 정보를 담습니다. 프레임을 개별 확대/잘라내기 하지 않아 카메라 기준점이 유지됩니다. 생성 중간 PNG는 `build/`에 두고 배포하지 않습니다. 렌더에는 CPU 환경에서 수십 분이 걸릴 수 있습니다.

## 검토 중인 2D 그림체 시안

[model-study.html](model-study.html)은 원래 버터의 얼굴과 복장을 참고해 새로 그린 2D 시안을 보여줍니다. 공개 참고 자료는 [Triple3T/trickcaltool](https://github.com/Triple3T/trickcaltool)의 `public/charas/Butter.png`와 `public/skills/Icon_GraduateSKill_Butter.png`이며, 기존 `trickcal-heroes.webp`의 왼쪽 버터도 복장 참고로 사용했습니다. 결과는 `assets/butter-2d-study.png`의 투명 배경 이미지입니다. 게임 모델·시트·애니메이션은 아직 교체하지 않았습니다.

이전 3D 시안과 비교 이미지는 페이지의 접힌 영역에 보관합니다.

### CC0 캐릭터 베이스로 다시 만든 3D 외형 시안

[butter-3d-study.html](butter-3d-study.html)은 Kay Lousberg의 KayKit Adventurers(CC0) 캐릭터 베이스를 수정한 실제 3D 모델을 보여줍니다. 베이스 몸·팔다리의 메시와 웨이트를 사용하고 비율을 바꿨습니다. 머리는 둥글게 재구성하고, 머리카락·귀·복장·꼬리·새총은 별도 입체 메시로 만들었습니다. 원화 전체를 부풀려 붙이던 ref29 방식은 사용하지 않습니다. [정확한 출처·수정 내역·라이선스](assets/vendor/kaykit-base30/README.md)를 함께 보관합니다.

기준 2D 그림은 변경하지 않았으며 눈·입·볼의 그림만 머리 UV에 베이크했습니다. 옷과 머리카락은 원화 텍스처를 사용하지 않습니다. `assets/models/butter-base30.blend`와 `.glb`에 얼굴 아틀라스가 내장됩니다. 외형·리그 검토용이며 새로운 걷기·사격 애니메이션과 게임 에셋은 아직 교체하지 않았습니다. 원래 베이스의 애니메이션을 완성된 버터 애니메이션으로 제공하지 않습니다.

재생성은 `npm run render:base-model`, 네이티브 메시·UV·본·GLB 검사는 `npm run check:base-model`입니다(Blender 4.3). 이전 ref29 파일과 `render:reference-model` / `check:reference-model` 명령은 비교용으로 보존합니다. 웹 회전 뷰어는 로컬에 보관한 Apache-2.0 `@google/model-viewer` 4.1.0을 사용하며 라이선스는 `assets/vendor/model-viewer.LICENSE`에 있습니다. WebGL을 사용할 수 없을 때는 Blender 촬영 이미지를 볼 수 있습니다.

`npm run render:model-study`로 `assets/models/butter-study.blend`와 `assets/butter-study/`의 여섯 이미지를 재생성합니다. 원본에는 짧아진 체형에 맞춘 네이티브 애니메이션도 보존합니다. 검증은 `blender --background assets/models/butter-study.blend --python-exit-code 1 --python tools/check-butter-study.py`로 실행합니다.

키보드는 WASD로 이동하고 방향키로 공격합니다. Q는 저학년 액티브, E는 고학년 액티브, R은 폭탄 설치입니다. 버터의 저학년 능력은 패시브로 자동 발동합니다.

## 실행

별도 의존성 설치는 필요하지 않습니다. npm start로 실행한 뒤 브라우저에서 http://localhost:4173 을 엽니다.

## 테스트

npm test
