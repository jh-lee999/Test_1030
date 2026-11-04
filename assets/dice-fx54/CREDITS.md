# Dice projectile effects — v54

This atlas combines **one original Trickcal stone** with **seven Kenney CC0
particle textures**. They are not all original Trickcal VFX. Animation, timing,
palette and composition in dice-effects.js are this fan game's presentation.
No extra damage, proc, projectile collision or new original character animation
is claimed. Original Butter whole-pose files and rendering scale stay unchanged.

## Trickcal stone

Public source: https://viewer.dclnslde.com/spine/battle/butter/Butter.png

Source SHA-256: `3f0b809ecab4f6560e7a7d035b2e4fbb27d8493a2ff3a8bd4eb9c588de080613`.
The matching `Butter.atlas` names `rock`, bounds `529,63,43,43`, no rotation.
Atlas SHA-256: `4e9610a78c7934cd9a7c608cdc9192edba5f19aac2ae9317a015eda0fd2b2b4a`.
Retrieved 2026-11-04. Only this region is packed, not the full original texture.
PMA RGB is mechanically converted to straight alpha; no stone repaint or
character redraw. The original region is drawn with uniform scale and rotation.

Trickcal content remains owned by the original rights holders, including EPID
Games. Public availability/noncommercial use do not establish a redistribution
license; separate permission has not been verified. Do not label the stone CC0.

## Kenney particles

Kenney Vleugels, Particle Pack 1.1, CC0-1.0. Original pack:
https://kenney.nl/assets/particle-pack

Public mirror: https://github.com/Calinou/kenney-particle-pack
Pinned commit: `ab7086639ee73be31abd87feb21bf1402d4e8144` (2020-12-06).
The source pack's [license text](./KENNEY-LICENSE.txt) is included.
Its license does NOT apply to the Trickcal stone or character artwork.

`symbol_02`, `star_04`, `muzzle_01`, `circle_02`, `smoke_01`, `spark_06`,
`trace_01` are downsampled from512px to112px and RGB-multiplied by warm cream /
blue tints while retaining source luminance and alpha. Each tile has8px gutters.
No Kenney runtime or Godot add-on is bundled. All source URLs/hashes, regions,
colors and the generated PNG hash are in [atlas.json](./atlas.json).

## Rebuild

Download the verified Butter PNG and clone the pinned Kenney mirror, then run:

```
node tools/pack-dice-effects54.mjs /path/to/Butter.png /path/to/kenney-particle-pack
```

Use PLAYWRIGHT_MODULE / CHROMIUM_EXECUTABLE for the installed browser. The packer
mechanically extracts/normalizes/packs source pixels; it does not generate art.
No source assets are fetched during gameplay. Missing atlas falls back to a
small readable stone and does not block starting, attacking or taking a turn.
