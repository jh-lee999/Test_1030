# Original Trickcal reference assets — side-scroller prototype 37

Retrieved 2026-11-03 from the public, user-supplied [Trickcal viewer](https://viewer.dclnslde.com/).
These are original game illustrations, not newly generated art or CC0 assets.
Character, monster and background rights remain with Trickcal / EPID Games and
their respective rightsholders. The viewer is a reference source, not evidence of
a redistribution license. No separate reuse license was found or verified.
The user requested their use in this unofficial noncommercial fan prototype;
noncommercial intent alone is not permission from the rightsholder. Review
permissions before broader redistribution or commercial use.

## What is included

- `fan-*`: `monsters/shadyfollowercloserange`, 셰이디아 열혈팬.
- `archer-*`: `monsters/shadyfollowerlongrange`, 셰이디아 극성팬.
- `ghost-*`: `monsters/blanketghost`, 이불령. Enlarged and used as the prototype's
  final guardian; that boss role/pattern is our adaptation, not an original claim.
- Each monster: `Skin_Gloomy`; original `Idle`, `Move`, `Attack1_1_Gloomy`, `Die`.
  Whole poses, uniform source scale .2, constant clip origin, 12px minimum baking
  padding. Browser playback may mirror whole poses to face their target.
- `forest.webp`: viewer background image `9.png`.
- `night.webp`: viewer background image `150.png`.
  Backgrounds are quality-94 WebP conversions of complete source PNGs, not cut-up
  platform tile sets. Room names are prototype labels, not verified official names.

`sources.json` records exact source URLs, lengths and SHA-256 hashes.
`atlas.json` records sampling, geometry and source clip names. Regenerate with
`tools/bake-platformer-assets37.mjs` (Playwright, Chromium, ImageMagick, access to
the public viewer). The viewer runtime is used in the reference session only;
the game ships no Spine runtime and makes no requests to the viewer.

Butter remains the unchanged [v36 original rig export](../butter-original36/CREDITS.md).
The user explicitly approved horizontal mirroring including weapon/bag for v37.
Moving fire is our same-rig composition, not an original named combined clip.
Jump uses intact Move samples; there is no new original Jump animation.
Platforms, collision geometry, projectiles, boulder, portal, effects and interface
are procedural game elements, not claimed to be extracted Trickcal illustrations.

v41 reuses the existing `fan` Idle animation for a friendly merchant behind a
procedural stall. This shop role is a fan-game adaptation, not an extracted or
official merchant NPC. No source sprite, animation or background was changed.
