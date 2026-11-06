import {generateFloor as baseFloor} from './dungeon76-world.js';
export * from './dungeon76-world.js';
// Topology/collision stay unchanged. Persistent containers belong to each room.
export const generateFloor=(...args)=>baseFloor(...args).map(r=>({...r,artifacts:[],chests:[]}));
