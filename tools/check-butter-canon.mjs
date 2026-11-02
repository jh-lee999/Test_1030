import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canon = JSON.parse(read('docs/art/butter-canon.json'));
const master = read(canon.approvedMaster.path);
assert.equal(hash(master), canon.approvedMaster.sha256, 'Approved Butter artwork changed. Restore it or record an explicitly approved master revision.');
assert.equal(master.readUInt32BE(16), canon.approvedMaster.width);
assert.equal(master.readUInt32BE(20), canon.approvedMaster.height);
const meta = JSON.parse(read(canon.activeCandidate.manifest));
assert.equal(meta.sourceMaster, canon.approvedMaster.path);
assert.equal(meta.sourceMasterSHA256, canon.approvedMaster.sha256, 'Candidate must cite the approved source, not a later generated model.');
const image = read(meta.image);
assert.equal(hash(image), meta.imageSHA256, 'Candidate PNG changed: inspect it and update its metadata.');
const [width, height] = meta.imageSize;
assert.equal(image.readUInt32BE(16), width);
assert.equal(image.readUInt32BE(20), height);
assert.deepEqual(Object.keys(meta.frames).sort(), [...canon.requiredDirections].sort());
assert.equal(new Set(Object.values(meta.frames).map(frame => frame.rect.join(','))).size, 4, 'Each direction must have its own source rectangle.');
assert.equal(meta.animation, null, 'This candidate contains static views, not a completed animation.');
const rgba = execFileSync('convert', [fileURLToPath(new URL(meta.image, root)), '-depth', '8', 'rgba:-'], { maxBuffer: width * height * 4 + 1024 });
assert.equal(rgba.length, width * height * 4);
let smallestGutter = Infinity;
for (const [direction, frame] of Object.entries(meta.frames)) {
  const [sx, sy, sw, sh] = frame.rect;
  assert.ok(sx >= 0 && sy >= 0 && sw > 0 && sh > 0 && sx + sw <= width && sy + sh <= height);
  assert.equal(frame.mirrored, false, `${direction}: preserve physical handedness`);
  let visible = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (rgba[((sy + y) * width + sx + x) * 4 + 3] < 24) continue;
    visible++;
    const gutter = Math.min(x, y, sw - 1 - x, sh - 1 - y);
    smallestGutter = Math.min(smallestGutter, gutter);
    assert.ok(gutter >= 8, `${direction}: visible art touches a source cell edge`);
    const dx = meta.footAnchor[0] + (x - frame.sourceFoot[0]) * meta.sourceScale;
    const dy = meta.footAnchor[1] + (y - frame.sourceFoot[1]) * meta.sourceScale;
    assert.ok(dx >= 4 && dx < meta.logicalSize[0] - 4 && dy >= 4 && dy < meta.logicalSize[1] - 4, `${direction}: logical frame would clip the silhouette`);
  }
  assert.ok(visible > 1000, `${direction}: empty or nearly empty frame`);
}
console.log(`Butter canon unchanged; four independent transparent views fit their cells and the shared foot anchor (minimum source gutter ${smallestGutter}px). Likeness still requires visual review.`);
