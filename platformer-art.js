import {STAGE_ART as legacy} from './assets/trickcal-stage37/atlas.js';
import {ENEMY_ART} from './assets/trickcal-enemies43/atlas.js';
export const STAGE_ART={...legacy,monsters:{...legacy.monsters,...ENEMY_ART.monsters}};
