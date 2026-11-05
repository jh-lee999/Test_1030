# Skill reference versus this arena's rules

Pinned Korean reference: Triple3T/trickcaltool, commit
`d15bb4c1f3f6d363939f851a434226bff9a77557` (2025 snapshot),
https://raw.githubusercontent.com/Triple3T/trickcaltool/d15bb4c1f3f6d363939f851a434226bff9a77557/src/locale/ko-KR.json
`translation.skill.Shady/Velvet/Erpin`, checked2026-11-05. Not a live balance claim.

| Apostle | Original reference | Implemented survivor adaptation |
| --- | --- | --- |
| 셰이디 | 저학년 “불 좀 꺼줄래?” teleports to a rear enemy and hits13 times, reduces SP; basic chain-scythe | Locked destination warning1.1s, safe collision-checked teleport, six stationary82px slashes over1.2s, then1.3s recovery. Move out of destination; no SP/silence implementation |
| 벨벳 | 고학년 “마법 : 원심 분리” axe-spin11 area hits, knockback, stronger final blow |132px circle warning1.05s,1.8s spin toward the previously locked point, knockback and1.4s recovery. No taunt/physical-defense artifact system |
| 에르핀 | 저학년 “마력탄 폭주” sends4 magic area projectiles to random enemies | Four visible13px magic orbs along a committed aim,0.17s apart, followed by1.25s recovery. They do not home after firing and stop at cover |

Butter source animation `OW1_Attack2_1` was inspected separately. The user's
Yellow Card effect (pistol + two ultimates per E) intentionally combines their
requested rules; the2025 reference lists two high-skill casts under signature
`translation.aside.Butter.skill2`, while Yellow Card originally has anger and
enhanced-attack effects. We do not mislabel this adaptation as original mechanics.
