// Presentation only: never receives the engine, game state, RNG or action callbacks.
export function createPokerFeedback(doc, reduced) {
  const $ = id => doc.getElementById(id), running = new Set(), channels = new WeakMap();
  let previous = null, panelWasHidden = true, panelTitle = '';
  function play(el, frames, options = {}, channel = 'feedback') {
    if (!el?.isConnected || reduced.matches || !el.animate) return null;
    let slots = channels.get(el);
    if (!slots) channels.set(el, slots = new Map());
    slots.get(channel)?.cancel();
    const animation = el.animate(frames, {duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)', ...options});
    slots.set(channel, animation); running.add(animation);
    const cleanup = () => {running.delete(animation); if (slots.get(channel) === animation) slots.delete(channel);};
    animation.finished.then(cleanup, cleanup);
    return animation;
  }
  function stop() {
    for (const animation of running) animation.cancel();
    running.clear();
    doc.querySelectorAll('.discard-ghost').forEach(el => el.remove());
  }
  reduced.addEventListener('change', () => {if (reduced.matches) stop();});
  doc.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (!button || button.disabled || button.closest('[inert]') || button.matches('.playing-card')) return;
    play(button, [{scale: '.96'}, {scale: '1.025', offset: .6}, {scale: '1'}]);
  }, true);
  // Keep card nodes by identity: CSS selection transitions survive sync(), and
  // unselected cards do not flicker/redeal when a single card is toggled.
  function renderHand(markup) {
    const hand = $('hand'), template = doc.createElement('template');
    template.innerHTML = markup;
    const old = new Map([...hand.children].map(el => [el.dataset.card, el]));
    let cursor = hand.firstChild, deal = 0;
    for (const source of template.content.children) {
      const retained = old.get(source.dataset.card), el = retained || source.cloneNode(true);
      if (retained) {
        old.delete(source.dataset.card);
        for (const attr of [...el.attributes]) if (!source.hasAttribute(attr.name)) el.removeAttribute(attr.name);
        for (const attr of source.attributes) if (el.getAttribute(attr.name) !== attr.value) el.setAttribute(attr.name, attr.value);
        if (el.innerHTML !== source.innerHTML) el.innerHTML = source.innerHTML;
      }
      if (el !== cursor) hand.insertBefore(el, cursor);
      cursor = el.nextSibling;
      if (!retained) play(el, [{opacity: 0, translate: '0 16px', scale: '.94'}, {opacity: 1, translate: '0 0', scale: '1'}], {duration: 270, delay: deal++ * 24, fill: 'backwards'}, 'deal');
    }
    for (const el of old.values()) {el.getAnimations().forEach(a => a.cancel()); el.remove();}
  }
  function captureDiscard() {
    if (reduced.matches) return [];
    return [...$('hand').querySelectorAll('[aria-pressed="true"]')].map(el => ({el: el.cloneNode(true), rect: el.getBoundingClientRect()}));
  }
  function discard(cards) {
    cards.forEach(({el, rect}, i) => {
      // Decorative copies cannot become a second clickable/announced card hand.
      el.removeAttribute('data-card'); el.removeAttribute('aria-label'); el.removeAttribute('aria-pressed');
      el.className = 'playing-card discard-ghost'; el.disabled = true; el.inert = true; el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'});
      doc.body.append(el);
      const animation = play(el, [{opacity: .8, translate: '0 0', rotate: '0deg'}, {opacity: 0, translate: '18px -42px', rotate: (i % 2 ? 8 : -8) + 'deg', scale: '.86'}], {duration: 230, delay: i * 12});
      if (animation) animation.finished.then(() => el.remove(), () => el.remove()); else el.remove();
    });
    bump($('resources'));
  }
  function bump(el) {play(el, [{scale: '1'}, {scale: '1.07', offset: .35}, {scale: '1'}], {duration: 260});}
  function attack() {
    play($('attack'), [{scale: '.95'}, {scale: '1.035', offset: .45}, {scale: '1'}], {duration: 280});
    [...$('hand').querySelectorAll('.scoring')].forEach((el, i) => play(el, [{translate: '0 0'}, {translate: '0 -9px', offset: .4}, {translate: '0 0'}], {duration: 340, delay: i * 35}, 'commit'));
    [...$('chain').querySelectorAll('.chain-step')].forEach((el, i) => play(el, [{opacity: .45, translate: '6px 0'}, {opacity: 1, translate: '0 0'}], {duration: 220, delay: Math.min(i * 28, 320)}, 'trace'));
  }
  function impact() {
    bump($('score-total'));
    bump($('enemy-hp'));
  }
  function panel() {play($('screen-panel'), [{opacity: 0, translate: '0 12px', scale: '.98'}, {opacity: 1, translate: '0 0', scale: '1'}], {duration: 210}, 'panel');}
  function refresh() {
    const open = !$('screen').hidden, title = $('screen-title')?.textContent || '';
    if (open && (panelWasHidden || title !== panelTitle)) panel();
    panelWasHidden = !open; panelTitle = title;
    const current = Object.fromEntries(['gold','hp','resources','preview-damage'].map(id => [id, $(id).textContent]));
    if (previous) for (const id of Object.keys(current)) if (previous[id] !== current[id]) bump($(id));
    previous = current;
    const resolving = doc.body.dataset.phase === 'resolve' || doc.body.dataset.phase === 'paused' && $('attack').getAttribute('aria-busy') === 'true';
    $('attack').setAttribute('aria-busy', String(resolving));
    // Menus/pause cancel background flourishes; no delayed action or visual hit on resume.
    for (const animation of running) {
      const target = animation.effect?.target;
      if (!target?.isConnected || $('app').inert && (target.closest('#app') || target.matches('.discard-ghost'))) animation.cancel();
    }
  }
  return {renderHand, captureDiscard, discard, attack, impact, panel, refresh};
}
