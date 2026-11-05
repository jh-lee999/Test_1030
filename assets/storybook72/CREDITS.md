# Storybook environment and rolling boulder · v72

New AI-generated fan-game artwork,2026-11-05. NOT newly extracted Trickcal map
tiles/props or an official asset pack. The supplied style reference was the
unchanged forest illustration already credited in
[stage37](../trickcal-stage37/CREDITS.md). No character was generated or redrawn.
Public/noncommercial use does not establish rights to the original Trickcal art.

- forest: overhead painted green grass, clover, cream flowers and worn patches.
- night / ember: image-generation color variants of that same ground design.
- props: transparent4×2 sheet, tree/bush/rock/mushroom/stump/flowers/log/fern.
- boulder: separate transparent round rolling stone with a small engraved star.
  It is our generated ultimate projectile, NOT an original Butter weapon texture.

Original generated PNG files are preserved. Runtime WebP files are format/
quality encodings only; original character/source files remain untouched.
Dimensions, hashes and fixed prop foot anchors: [sources.json](sources.json).
The original generation outputs are also left in the workspace's generated_images
folder. Candidate art has not been promoted to a user-approved character master.

Terrain is mirrored across1024-world-pixel macro tiles for boundary continuity;
paths and small decorations are rendered in code. New drawings do not add a
collider or change seeded world/POI geometry. Large props correspond to existing
cover, with a translucent canopy when Butter would otherwise be obscured.

Other original-source credits remain separate:
[Butter](../butter-original36/CREDITS.md), [pistol](../butter-gun71/CREDITS.md),
[apostles](../trickcal-elites71/CREDITS.md), [monsters](../trickcal-enemies43/CREDITS.md),
[artifact icons](../trickcal-artifacts53/CREDITS.md),
[normal-shot/source VFX](../dice-fx54/CREDITS.md), [Jua OFL](../storybook70/OFL.txt).
All playable assets load locally; the game makes no runtime image-generation,
viewer, CDN or remote font requests.
