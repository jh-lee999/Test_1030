# 셰이디의 아공간 탈출

**현재 v37: 버터 기본 횡스크롤 플랫폼 액션 프로토타입.** 벨트스크롤이 아닌
점프/발판 중심의 전투로 전환했습니다. 이전 방 탐험 게임은
[topdown36.html](topdown36.html)에 그대로 보관합니다.

## 횡스크롤 v37

- 원작 버터 전신 모션 + 사용자 승인 좌우 반전. 이동/공중 사격, 2단 점프,
  점프 높이 조절, 코요테 타임/입력 버퍼, 무적 대시.
- 새총 연사, 저학년 확률 추적/연쇄 탄환, 고학년 왕짱돌 + 지속 중 무적.
- 실제 트릭컬 셰이디아 열혈팬/극성팬/이불령 애니메이션과 숲 배경 2종.
- 시드로 배치가 달라지는 3개 전투 구역 + 이불령 보스 구역. 클리어마다
  기존 14종 아이템 중 3개 선택지, 1개 획득. 출구까지 이동 후 다음 방 진입.
- 키보드/마우스/멀티터치 조작, 일시정지, 탭 이탈 시 자동 일시정지,
  실패/탈출/재시작, 이미지 실패 시 기본 표시로 시작 가능.

조작: A D / ← → 이동 · Space / W / ↑ 2단 점프 · J / X / 클릭 유지 사격 ·
Shift / K 대시 · E 왕새총 · F / ↓ 출구 진입 · Esc 일시정지.
휴대폰은 가로 화면을 권장합니다. 터치 조작은 화면 아래에 있습니다.

완성된 스컬 복제는 아닙니다. 현재는 짧은 전투 루프이며 스컬 교체, 상점,
분기 지도, 저장/메타 성장, 별도 점프/피격 원작 클립은 없습니다. 코인은
현재 점수입니다. 기존 탑뷰의 코미·폭탄·열쇠·비밀방은 보관 버전에 남아 있습니다.
플랫폼/포털/짱돌은 직접 그린 게임 도형입니다.

[추출 범위·출처·권리 미확인 사항](assets/trickcal-stage37/CREDITS.md)을 확인하세요.
원작 그림을 재생성하지 않고 로컬 아틀라스로 재생하며 런타임 외부 요청은 없습니다.

검사: `npm test`, `npm run check:platformer-art`, `npm run check:butter-canon`,
`npm run check:butter-original`. 로컬 서버 실행 후
`node tools/check-platformer-browser.mjs http://127.0.0.1:4173` 및
`node tools/check-butter-original-browser.mjs http://127.0.0.1:4173`.
브라우저 검사에 `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE` 지정이 가능합니다.

아래는 v36 이하의 보관 구현 기록입니다. v37 좌우 반전 승인이 이전 손 고정
규칙보다 우선하며 원본 PNG/아틀라스는 그대로 보존합니다.

## 버터 외형과 모션 기준

**현재 v36:** 사용자는 v35 조각 합성을 거절하고 **원작 그림·모션 우선**으로
방침을 변경했습니다. [원작 동작 미리보기](butter-2d-motion.html)와 게임은
`butter-original-motion.js`에서 원작 리그로 렌더한 전신 프레임을 사용합니다.
대기·달리기·평타·저학년·고학년은 원작 클립이며 이동 사격만 원본 리그에서
달리기 하체와 사격 상체를 합성했습니다. v35의 코드 팔과 잘라낸 무릎은 쓰지 않습니다.

현재 원본은 **한 시점의 3/4 모습**이며 네 방향 세트가 아닙니다. 캐릭터를 뒤집지 않고
바닥 화살표로 조준 방향을 표시합니다. [출처·정확한 변경 범위·권리와 한계](assets/butter-original36/CREDITS.md)를
확인하세요. 원래 승인 PNG는 보관합니다. 아래 v28–35 설명은 과거 작업 기록입니다.

현재 검사: `npm test`, `npm run check:butter-original`, `npm run check:butter-canon`.
브라우저 검사는 `node tools/check-butter-original-browser.mjs http://127.0.0.1:4173`입니다.

### 보관: v28–35의 고정 시안 작업

버터 에셋 작업은 루트 [AGENTS.md](AGENTS.md)와 [외형 기준 문서](docs/art/BUTTER_CANON.md)를 먼저 읽고, 승인 원본 `assets/butter-2d-study.png`를 직접 열어 시작합니다. 원본은 체크섬으로 고정하며 새 후보가 자동으로 기준을 대체하지 않습니다. 아래의 기존 게임·3D 구현 기록은 승인된 외형을 의미하지 않습니다.

[2D 에셋 비교](butter-2d-assets.html)의 v32 네 방향을 사용자가 스프라이트의 고정 템플릿으로 지정했습니다. v35 게임은 **그 PNG를 바꾸지 않고 직접 사용**합니다. [원본/동작 비교](butter-2d-motion.html)에서 실제 게임 렌더러의 정지·보행·사격·이동 사격을 96/160/256px로 확인하고 한 프레임씩 진행할 수 있습니다. 보행과 사격 슬라이더는 독립적이며 정지 원본은 선택해서 펼칩니다. 동작 줄이기 설정에서는 정지 이유와 직접 재생 버튼을 표시합니다.

얼굴과 비율은 고정하며 양다리의 고관절/무릎 교대, 오른손 새총 유지, 왼손 당기기·놓기, 줄 복귀, 중앙 꼬리 흔들림을 합성합니다. 보행은 사격 중에도 유지되고 뒷모습의 팔은 머리/몸통에 가려집니다. 공개 뷰어의 실제 전투 동작을 분석해 발사 타이밍을 맞췄습니다. 손 두 조각과 옛 팔/무기 영역의 보완 그림만 추가했으며 [출처·사용 범위](assets/butter-2d35/CREDITS.md)를 기록했습니다. 얼굴 재생성, 좌우 반전, 비균일 확대, 색 보정은 없습니다. 동작은 검토 후보이며 왕새총 전용 자세와 머리카락/귀 후속 동작은 아직 없습니다.

`npm run check:butter-canon`은 두 승인 원본의 해시, 실제 투명 여백, 게임의 크롭/발 기준점을 검사합니다. `npm test`는 방향·교대 보행·독립 반동·발사점을 검사합니다. Playwright와 Chromium이 설치된 환경에서 로컬 서버를 연 후 `node tools/check-butter-motion-browser.mjs http://127.0.0.1:4173`을 실행하면 실제 렌더 픽셀의 얼굴 불변·잘림·손/발 독립성과 두 캐릭터의 시작 버튼도 검사합니다. 시스템 브라우저는 `CHROMIUM_EXECUTABLE`, 기존 Playwright 경로는 `PLAYWRIGHT_MODULE`로 지정할 수 있습니다.

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
- 원작 리그에서 렌더한 버터 전신 동작, 독립적인 발걸음·사격, 원작 귀/머리카락/꼬리 움직임
- 원본/동작 비교와 위상 슬라이더, 이동 사격 발사점 연동

이전 Blender 500프레임과 구형 스프라이트는 보관합니다. `sprite-preview.html`, `motion-preview.html`은 **이전 버전 보관 화면**이며 현재 게임 외형이 아닙니다. `npm run check:sprites`는 이 보관 에셋도 검사합니다(개발 도구: Node.js, ImageMagick).

보관된 3D 모션은 [motion-preview.html](motion-preview.html)에서 비교할 수 있습니다. [Blender 원본](assets/models/butter.blend)은 과거 모델이며 현재 버터 렌더러에는 쓰지 않습니다. 현재 게임은 2D Canvas로 실행되어 Blender나 Spine 설치가 필요 없습니다. 코미는 기존 스프라이트를 유지합니다.

## 보관 모델과 애니메이션 재생성

Blender 4.3(제작·검증 버전 4.3.2), Node.js와 ImageMagick이 필요합니다. 게임 실행 자체에는 필요하지 않습니다.

```sh
npm run render:animations
npm run pack:model
npm run check:sprites
blender --background assets/models/butter.blend --python-exit-code 1 --python tools/check-butter-model.py
```

`tools/build_butter_model.py`가 실제 메시·리그·재질·동작과 네 방향 렌더를 만듭니다. `assets/butter-model.json`은 128px 셀 좌표 및 손·새총 연결 정보를 담습니다. 프레임을 개별 확대/잘라내기 하지 않아 카메라 기준점이 유지됩니다. 생성 중간 PNG는 `build/`에 두고 배포하지 않습니다. 렌더에는 CPU 환경에서 수십 분이 걸릴 수 있습니다.

## 승인한 2D 그림체 원본

[model-study.html](model-study.html)은 원래 버터의 얼굴과 복장을 참고해 새로 그린 2D 시안을 보여줍니다. 공개 참고 자료는 [Triple3T/trickcaltool](https://github.com/Triple3T/trickcaltool)의 `public/charas/Butter.png`와 `public/skills/Icon_GraduateSKill_Butter.png`이며, 기존 `trickcal-heroes.webp`의 왼쪽 버터도 복장 참고로 사용했습니다. 결과는 `assets/butter-2d-study.png`의 투명 배경 이미지이며 이후 승인된 v32 방향별 그림의 외형 기준입니다.

이전 3D 시안과 비교 이미지는 페이지의 접힌 영역에 보관합니다.

### 보관: 기준 자료에 맞춘 3D 외형 시안 (31)

[이전 3D 검토 페이지](butter-aligned-study.html)는 승인 2D를 바탕으로 만든 방향별 시트와 모델을 함께 보여줍니다. [자료 정합 문서](docs/butter-modeling31/README.md)에 당시의 높이 기준, 복장 구조, 추정과 충돌 처리 내역을 기록했습니다. `spec.json`은 모델 생성기와 웹 비교 화면에서 함께 읽습니다. 정면 렌더와 도안을 같은 좌표·배율로 겹쳐 볼 수 있습니다. 이 3D 외형은 승인 기준으로 사용하지 않습니다.

`npm run render:aligned-model`로 `assets/models/butter-aligned31.blend`, `.glb`, `assets/butter-aligned31/`를 재생성합니다. Blender 원본에는 기준 시트와 설명도 포함합니다. 외형 검토용이며 게임과 애니메이션은 교체하지 않았습니다.

### 이전 CC0 캐릭터 베이스 시안 (30)

[butter-3d-study.html](butter-3d-study.html)은 Kay Lousberg의 KayKit Adventurers(CC0) 캐릭터 베이스를 수정한 실제 3D 모델을 보여줍니다. 베이스 몸·팔다리의 메시와 웨이트를 사용하고 비율을 바꿨습니다. 머리는 둥글게 재구성하고, 머리카락·귀·복장·꼬리·새총은 별도 입체 메시로 만들었습니다. 원화 전체를 부풀려 붙이던 ref29 방식은 사용하지 않습니다. [정확한 출처·수정 내역·라이선스](assets/vendor/kaykit-base30/README.md)를 함께 보관합니다.

기준 2D 그림은 변경하지 않았으며 눈·입·볼의 그림만 머리 UV에 베이크했습니다. 옷과 머리카락은 원화 텍스처를 사용하지 않습니다. `assets/models/butter-base30.blend`와 `.glb`에 얼굴 아틀라스가 내장됩니다. 외형·리그 검토용이며 새로운 걷기·사격 애니메이션과 게임 에셋은 아직 교체하지 않았습니다. 원래 베이스의 애니메이션을 완성된 버터 애니메이션으로 제공하지 않습니다.

재생성은 `npm run render:base-model`, 네이티브 메시·UV·본·GLB 검사는 `npm run check:base-model`입니다(Blender 4.3). 이전 ref29 파일과 `render:reference-model` / `check:reference-model` 명령은 비교용으로 보존합니다. 웹 회전 뷰어는 로컬에 보관한 Apache-2.0 `@google/model-viewer` 4.1.0을 사용하며 라이선스는 `assets/vendor/model-viewer.LICENSE`에 있습니다. WebGL을 사용할 수 없을 때는 Blender 촬영 이미지를 볼 수 있습니다.

`npm run render:model-study`로 `assets/models/butter-study.blend`와 `assets/butter-study/`의 여섯 이미지를 재생성합니다. 원본에는 짧아진 체형에 맞춘 네이티브 애니메이션도 보존합니다. 검증은 `blender --background assets/models/butter-study.blend --python-exit-code 1 --python tools/check-butter-study.py`로 실행합니다.

키보드는 WASD로 이동하고 방향키로 공격합니다. Q는 저학년 액티브, E는 고학년 액티브, R은 폭탄 설치입니다. 버터의 저학년 능력은 패시브로 자동 발동합니다.

## 실행

별도 의존성 설치는 필요하지 않습니다. npm start로 실행한 뒤 브라우저에서 http://localhost:4173 을 엽니다.

## 테스트

npm test
