import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createGame} from '../survivor69-engine.js';
import {lineBlocked} from '../survivor69-world.js';
import {artwork,artURL,icon,ART_KINDS,PALETTES} from '../survivor70-art.js';
import {sceneLayout,cacheInfo,clearSceneCache} from '../survivor70-scenery.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url)),sha=f=>createHash('sha256').update(read(f)).digest('hex');
test('v70 changes presentation only, preserves the complete v69 entry and original renderer anchor',()=>{
 assert.equal(sha('survivor69.html'),'e10cc864a4ed0dd09fd57ee2b22d7320e0df7529609bc470757d7eefbb367632');assert.match(read('index.html').toString(),/survivor70\.js\?v=70/);
 const main=read('survivor70.js').toString(),renderer=read('survivor70-renderer.js').toString();assert.match(main,/survivor69-engine\.js\?v=69/);assert.match(main,/survivor69-profile\.js\?v=69/);assert.match(renderer,/size:80/);assert.match(renderer,/translate\(0,-22\.4\)/);assert.match(renderer,/scale\(p.action\?\.facing\?\?p.facing,1\)/);assert.doesNotMatch(main,/localStorage\.clear|survivor70\.v1|Math\.random/);
});
test('storybook vector assets are complete, self-contained and safely whitelisted',()=>{
 for(const map of Object.keys(PALETTES))for(const id of ART_KINDS){const svg=artwork(id,map);assert(svg.startsWith('<svg '));assert(svg.endsWith('</svg>'));assert.match(svg,/viewBox="0 0 128 136"/);assert.doesNotMatch(svg,/<script|foreignObject|onload=|https?:\/\/(?!www\.w3\.org)/i);assert.equal(decodeURIComponent(artURL(id,map).split(',')[1]),svg);}
 assert.match(icon('move','pillow'),/ArtifactIcon_11\.png/);assert.match(icon('move','storm'),/ArtifactIcon_12\.png/);assert.match(icon('fusion','thunderweb'),/fusion-art/);assert.doesNotMatch(icon('move','<script>'),/<script>/);
});
test('visual paths use actual navigation, are deterministic, and never consume game RNG or state',()=>{
 for(let seed=0;seed<12;seed++)for(const map of Object.keys(PALETTES)){const g=createGame(seed,{map}),before=JSON.stringify(g),layout=sceneLayout(g);assert(layout.roads.length);for(const {a,b}of layout.roads)assert(!lineBlocked(g.world,a,b,14));assert.equal(JSON.stringify(g),before);assert.equal(sceneLayout(g),layout);}
 clearSceneCache();assert.deepEqual(cacheInfo(),{tiles:0,limit:48,layouts:0,bytes:0});
});
test('local rounded font is pinned and its redistribution license is included',()=>{const source=JSON.parse(read('assets/storybook70/sources.json'));assert.equal(sha('assets/storybook70/Jua-Regular.ttf'),source.font.sha256);assert.match(read('assets/storybook70/OFL.txt').toString(),/SIL OPEN FONT LICENSE Version 1\.1/);assert.match(read('survivor70.css').toString(),/font-display:swap/);});
