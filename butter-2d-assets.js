const labels = { down: '아래 · 정면', left: '왼쪽', up: '위 · 후면', right: '오른쪽' };
const status = document.querySelector('#status');
const canvas = document.querySelector('#preview');
const size = document.querySelector('#size');
const guides = document.querySelector('#guides');
let direction = 'down';

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

try {
  const canon = await json('./docs/art/butter-canon.json');
  const meta = await json(`./${canon.approvedDirections.manifest}`);
  const atlas = new Image();
  atlas.src = `./${meta.image}`;
  await atlas.decode();
  const dpr = Math.min(devicePixelRatio || 1, 3);

  function draw(target, dir, logicalPixels, showGuides) {
    target.width = Math.round(logicalPixels * dpr);
    target.height = Math.round(logicalPixels * dpr);
    target.style.width = `${logicalPixels}px`;
    target.style.height = 'auto';
    const ctx = target.getContext('2d');
    const scale = logicalPixels * dpr / meta.logicalSize[0];
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, ...meta.logicalSize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const frame = meta.frames[dir];
    const [sx, sy, sw, sh] = frame.rect;
    const dx = meta.footAnchor[0] - frame.sourceFoot[0] * meta.sourceScale;
    const dy = meta.footAnchor[1] - frame.sourceFoot[1] * meta.sourceScale;
    ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, sw * meta.sourceScale, sh * meta.sourceScale);
    if (showGuides) {
      ctx.strokeStyle = '#9d6b8199';
      ctx.lineWidth = .6;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();ctx.moveTo(4, meta.footAnchor[1]);ctx.lineTo(156, meta.footAnchor[1]);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#9d6b81';ctx.beginPath();ctx.arc(...meta.footAnchor, 1.3, 0, Math.PI * 2);ctx.fill();
    }
    target.dataset.direction = dir;
  }

  function update() {
    draw(canvas, direction, Number(size.value), guides.checked);
    document.querySelector('#direction-label').textContent = labels[direction];
    for (const button of document.querySelectorAll('button[data-direction]')) {
      button.setAttribute('aria-pressed', String(button.dataset.direction === direction));
    }
  }
  for (const button of document.querySelectorAll('button[data-direction]')) {
    button.addEventListener('click', () => { direction = button.dataset.direction; update(); });
  }
  size.addEventListener('change', update);
  guides.addEventListener('change', update);
  for (const [dir, label] of Object.entries(labels)) {
    const figure = document.createElement('figure');
    const card = document.createElement('canvas');
    card.setAttribute('role', 'img');card.setAttribute('aria-label', `버터 2D ${label} 정지 시안`);
    const caption = document.createElement('figcaption');caption.textContent = label;
    const stage = document.createElement('div');stage.className = 'card-stage';stage.append(card);
    figure.append(stage, caption);document.querySelector('#directions').append(figure);
    draw(card, dir, 160, false);
  }
  document.querySelector('#source-path').textContent = canon.approvedMaster.path;
  document.querySelector('#source-hash').textContent = canon.approvedMaster.sha256;
  update();
  status.textContent = '승인한 4방향 템플릿 · PNG 변경 없이 v34 게임에 적용됨';
  document.body.dataset.ready = 'true';
} catch (error) {
  status.textContent = '미리보기를 불러오지 못했어. 아래 원본 PNG 링크로 확인하거나 새로고침해줘.';
  document.body.dataset.ready = 'error';
  console.error(error);
}
