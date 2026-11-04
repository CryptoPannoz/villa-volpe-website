/**
 * Villa Volpe — «the drawer»: the real business cards Alberto kept at the villa,
 * tipped out on a table at the top of the Things to do page.
 *
 * Same principle as js/things-to-do.js: nothing is written here. Every card comes
 * from a «pick» card in the page (article[data-pick] with an .ttd-card__img--card
 * scan), the labels come from data-t-* on the #drawer section, so the four
 * languages stay in the HTML. Extra data on the article:
 *   data-maps   Google Maps link        data-walk / data-drive   minutes from the villa
 *   data-pickup they come to the villa (taxi)
 *   data-drawer-cat  tab override (the public boats sit with «on the water», not «practical»)
 *
 * Our number one (article[data-top], Taverna Antico Agnello) gets its photo as a card in the middle of the
 * table and a block of its own in the head of the drawer ([data-top-slot]).
 * Desktop: cards scattered on the table, draggable, «Shuffle» deals them again.
 * Touch/narrow: a swipeable row. Tap a card → it flips: what it is, how far,
 * call / directions / website / on the map / share. #card-<id> opens one directly.
 */
(function () {
  'use strict';

  var section = document.getElementById('drawer');
  var table = section && section.querySelector('[data-table]');
  if (!section || !table) return;

  // The business cards, our number one (article[data-top]) and the postcards (article[data-postcard]),
  // whose «card» is their photo. Practical services (taxi…) stay in the list, not on the table.
  var arts = Array.prototype.slice.call(document.querySelectorAll('article[data-pick], article[data-postcard]'))
    .filter(function (a) {
      var photo = (a.hasAttribute('data-top') || a.hasAttribute('data-postcard')) && a.querySelector('.ttd-card__img');
      var cat = a.getAttribute('data-drawer-cat') || a.getAttribute('data-cat');
      return (a.querySelector('.ttd-card__img--card') || photo) && cat !== 'practical';
    });
  if (!arts.length) return;
  section.hidden = false;

  var T = section.dataset;
  var wide = window.matchMedia('(min-width: 900px) and (pointer: fine)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function text(el, sel) { var x = el.querySelector(sel); return x ? x.textContent.trim() : ''; }

  var cards = arts.map(function (a) {
    var img = a.querySelector('.ttd-card__img--card') || a.querySelector('.ttd-card__img');
    var tel = a.querySelector('.ttd-card__contact a[href^="tel:"]');
    var web = a.querySelector('.ttd-card__contact a[href^="http"]');
    var more = a.querySelector('.ttd-card__link');
    var postcard = a.hasAttribute('data-postcard');
    return {
      id: a.id,
      art: a,
      cat: postcard ? 'postcard' : (a.getAttribute('data-drawer-cat') || a.getAttribute('data-cat')),
      postcard: postcard,
      label: text(a, '.ttd-card__cat'),
      title: text(a, '.ttd-card__title'),
      desc: text(a, '.ttd-card__desc'),
      src: img.currentSrc || img.src,
      portrait: +img.getAttribute('height') > +img.getAttribute('width'),
      tel: tel ? { href: tel.getAttribute('href'), text: tel.textContent.trim() } : null,
      web: web ? web.getAttribute('href') : '',
      more: more ? { href: more.getAttribute('href'), text: more.textContent.trim() } : null,
      maps: a.getAttribute('data-maps') ||
        'https://www.google.com/maps/search/?api=1&query=' + a.getAttribute('data-lat') + ',' + a.getAttribute('data-lng'),
      walk: a.getAttribute('data-walk'),
      drive: a.getAttribute('data-drive'),
      pickup: a.hasAttribute('data-pickup'),
      top: a.hasAttribute('data-top'),
      badge: a.getAttribute('data-pick') || ''
    };
  });
  // Our number one first, then postcards and cards mixed, food and lake first (the order of the swipeable row)
  var ORDER = ['food', 'postcard', 'sport'];
  cards.sort(function (a, b) { return (b.top - a.top) || (ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat)); });
  var posts = cards.filter(function (c) { return c.postcard; });
  cards = cards.filter(function (c) { return !c.postcard; });
  posts.forEach(function (p, i) { cards.splice(Math.min(cards.length, 1 + i * 2), 0, p); });

  // ── The cards on the table ──────────────────────────────────────
  var z = 10;
  cards.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ttd-bc' + (c.portrait ? ' ttd-bc--tall' : '') + (c.top ? ' ttd-bc--top' : '') + (c.postcard ? ' ttd-bc--postcard' : '');
    if (c.top) b.setAttribute('data-label', '★ ' + c.badge);
    b.setAttribute('aria-label', c.title + ' — ' + (T.tTurn || ''));
    b.innerHTML = '<img alt="" draggable="false" loading="lazy">';
    b.firstChild.src = c.src;
    c.btn = b;
    table.appendChild(b);
    wireCard(c);
  });

  function rand(a, b) { return a + Math.random() * (b - a); }

  // Scatter the visible cards over a loose grid, with a bit of chaos.
  function layout(deal) {
    var on = cards.filter(function (c) { return !c.off && !c.top; });
    var top = cards.filter(function (c) { return !c.off && c.top; })[0];
    if (!wide.matches) {
      cards.forEach(function (c, i) {
        c.btn.style.cssText = '';
        c.btn.style.setProperty('--r', (i % 2 ? 1.6 : -1.8) + 'deg');
      });
      return;
    }
    var W = table.clientWidth, H = table.clientHeight;
    var cols = Math.min(5, Math.max(3, Math.round(W / 250)));
    var rows = Math.ceil(on.length / cols) || 1;
    var cw = W / cols, ch = H / rows;
    var sc = Math.min(1, (cw * 0.92) / 236); // smaller cards on narrower tables
    var order = on.slice().sort(function () { return Math.random() - 0.5; });
    order.forEach(function (c, i) {
      var w = Math.round((c.portrait ? 150 : 236) * sc);
      var h = Math.round((c.portrait ? 226 : 156) * sc);
      var x = (i % cols) * cw + cw / 2 - w / 2 + rand(-cw * 0.16, cw * 0.16);
      var y = Math.floor(i / cols) * ch + ch / 2 - h / 2 + rand(-ch * 0.14, ch * 0.14);
      c.x = Math.max(0, Math.min(W - w, x));
      c.y = Math.max(0, Math.min(H - h, y));
      c.btn.style.width = w + 'px';
      c.btn.style.setProperty('--r', rand(-11, 11).toFixed(1) + 'deg');
      c.btn.style.zIndex = ++z;
      if (deal && !reduce) c.btn.style.transitionDelay = (i * 55) + 'ms';
      place(c);
    });
    // Our number one always lands in the middle, on top of the pile
    if (top) {
      var tw = Math.round(300 * sc);
      top.x = W / 2 - tw / 2;
      top.y = Math.max(0, H / 2 - tw * 0.42);
      top.btn.style.width = tw + 'px';
      top.btn.style.setProperty('--r', rand(-3, 3).toFixed(1) + 'deg');
      top.btn.style.zIndex = z + 50;
      if (deal && !reduce) top.btn.style.transitionDelay = (order.length * 55 + 120) + 'ms';
      place(top);
    }
    cards.filter(function (c) { return c.off; }).forEach(function (c) {
      c.btn.style.setProperty('--x', (W / 2 - 110) + 'px');
      c.btn.style.setProperty('--y', (H + 60) + 'px');
    });
    if (deal) setTimeout(function () { cards.forEach(function (c) { c.btn.style.transitionDelay = ''; }); }, 1400);
  }
  function place(c) {
    c.btn.style.setProperty('--x', c.x + 'px');
    c.btn.style.setProperty('--y', c.y + 'px');
  }

  // Before the table scrolls into view the cards sit in a pile, then they're dealt.
  var dealt = false;
  function pile() {
    if (!wide.matches) return;
    var W = table.clientWidth, H = table.clientHeight;
    cards.forEach(function (c, i) {
      c.btn.style.width = (c.portrait ? 150 : 236) + 'px';
      c.btn.style.setProperty('--x', (W / 2 - 118 + rand(-6, 6)) + 'px');
      c.btn.style.setProperty('--y', (H - 120 + rand(-6, 6)) + 'px');
      c.btn.style.setProperty('--r', rand(-4, 4).toFixed(1) + 'deg');
    });
  }
  if ('IntersectionObserver' in window && !reduce) {
    pile();
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting && !dealt) { dealt = true; io.disconnect(); layout(true); }
    }, { threshold: 0.35 });
    io.observe(table);
  } else { dealt = true; layout(false); }

  var lastW = table.clientWidth;
  window.addEventListener('resize', function () {
    if (Math.abs(table.clientWidth - lastW) < 40) return;
    lastW = table.clientWidth;
    if (dealt) layout(false); else pile();
  });
  if (wide.addEventListener) wide.addEventListener('change', function () { layout(false); });

  var shuffle = section.querySelector('.ttd-drawer__shuffle');
  if (shuffle) shuffle.addEventListener('click', function () { dealt = true; layout(true); });

  // ── Category tabs ───────────────────────────────────────────────
  var tabs = Array.prototype.slice.call(section.querySelectorAll('.ttd-tab'));
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      var f = t.getAttribute('data-dfilter');
      tabs.forEach(function (x) { x.classList.toggle('is-active', x === t); });
      cards.forEach(function (c) {
        c.off = f !== 'all' && c.cat !== f;
        c.btn.classList.toggle('is-off', c.off);
        c.btn.tabIndex = c.off ? -1 : 0;
      });
      dealt = true;
      layout(true);
    });
  });

  // ── Drag on desktop, tap anywhere to open ───────────────────────
  function wireCard(c) {
    var start = null, moved = false;
    c.btn.addEventListener('pointerdown', function (e) {
      if (!wide.matches || e.button !== 0) return;
      start = { px: e.clientX, py: e.clientY, x: c.x || 0, y: c.y || 0 };
      moved = false;
      c.btn.setPointerCapture(e.pointerId);
    });
    c.btn.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.px, dy = e.clientY - start.py;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      if (!moved) { moved = true; c.btn.classList.add('is-dragging'); c.btn.style.zIndex = ++z; }
      c.x = start.x + dx; c.y = start.y + dy;
      place(c);
    });
    function end() {
      if (!start) return;
      start = null;
      c.btn.classList.remove('is-dragging');
    }
    c.btn.addEventListener('pointerup', end);
    c.btn.addEventListener('pointercancel', end);
    c.btn.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); moved = false; return; }
      open(c);
    });
  }

  // ── The card, turned over ───────────────────────────────────────
  var dlg = document.createElement('dialog');
  dlg.className = 'ttd-dlg';
  dlg.setAttribute('aria-labelledby', 'ttd-dlg-title');
  dlg.innerHTML =
    '<div class="ttd-dlg__inner">' +
      '<button type="button" class="ttd-dlg__close" data-close>&times;</button>' +
      '<div class="ttd-flip">' +
        '<div class="ttd-flip__face ttd-flip__front"><img alt=""></div>' +
        '<div class="ttd-flip__face ttd-flip__back">' +
          '<div class="ttd-dlg__cat"></div>' +
          '<h3 class="ttd-dlg__title" id="ttd-dlg-title"></h3>' +
          '<p class="ttd-dlg__desc"></p>' +
          '<p class="ttd-dlg__dist"></p>' +
          '<div class="ttd-dlg__actions"></div>' +
        '</div>' +
      '</div>' +
      '<div class="ttd-dlg__nav">' +
        '<button type="button" class="ttd-dlg__arrow" data-step="-1">&#8249;</button>' +
        '<button type="button" class="ttd-dlg__turn" data-turn></button>' +
        '<button type="button" class="ttd-dlg__arrow" data-step="1">&#8250;</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dlg);
  var flip = dlg.querySelector('.ttd-flip');
  dlg.querySelector('[data-close]').setAttribute('aria-label', T.tClose || 'Close');
  dlg.querySelector('[data-step="-1"]').setAttribute('aria-label', T.tPrev || '');
  dlg.querySelector('[data-step="1"]').setAttribute('aria-label', T.tNext || '');
  dlg.querySelector('[data-turn]').textContent = '↻ ' + (T.tTurn || '');

  var current = null, flipTimer = null;
  var base = window.location.href.split('#')[0];

  function action(tag, cls, label, href) {
    var el = document.createElement(tag);
    el.className = 'ttd-act ' + cls;
    el.textContent = label;
    if (tag === 'a') {
      el.href = href;
      if (/^https?:/.test(href)) { el.target = '_blank'; el.rel = 'noopener'; }
    } else el.type = 'button';
    return el;
  }

  function fill(c) {
    dlg.querySelector('.ttd-flip__front img').src = c.src;
    dlg.querySelector('.ttd-flip__front img').alt = c.title;
    dlg.querySelector('.ttd-dlg__cat').textContent = c.label;
    dlg.querySelector('.ttd-dlg__title').textContent = c.title;
    dlg.querySelector('.ttd-dlg__desc').textContent = c.desc;
    var d = dlg.querySelector('.ttd-dlg__dist');
    d.textContent = distText(c);
    d.hidden = !d.textContent;
    actions(dlg.querySelector('.ttd-dlg__actions'), c, close);
  }

  function distText(c) {
    return c.pickup ? '🚕 ' + (T.tPickup || '')
      : c.walk ? '🚶 ' + c.walk + ' ' + (T.tWalk || '')
      : c.drive ? '🚗 ' + c.drive + ' ' + (T.tDrive || '') : '';
  }

  // Call / directions / website / on the map / share (+ the article's own link)
  function actions(box, c, before) {
    box.innerHTML = '';
    if (c.tel) box.appendChild(action('a', 'ttd-act--main', '📞 ' + (T.tCall || '') + ' · ' + c.tel.text, c.tel.href));
    if (c.maps) box.appendChild(action('a', '', '🧭 ' + (T.tDirections || ''), c.maps));
    if (c.web) box.appendChild(action('a', '', '🌐 ' + (T.tWeb || ''), c.web));
    var onMap = action('button', '', '📍 ' + (T.tMap || ''));
    onMap.addEventListener('click', function () { if (before) before(); if (window.VVTtd) window.VVTtd.focus(c.id); });
    box.appendChild(onMap);
    var share = action('button', '', '↗ ' + (T.tShare || ''));
    share.addEventListener('click', function () { shareCard(c, share); });
    box.appendChild(share);
    if (c.more) box.appendChild(action('a', 'ttd-act--more', c.more.text + ' →', c.more.href));
  }

  function open(c, keepFace) {
    current = c;
    fill(c);
    if (!keepFace) {
      flip.classList.remove('is-back');
      clearTimeout(flipTimer);
      flipTimer = setTimeout(function () { flip.classList.add('is-back'); }, reduce ? 0 : 450);
    }
    if (!dlg.open) dlg.showModal();
    try { history.replaceState(null, '', '#card-' + c.id); } catch (e) { /* file:// */ }
  }

  function close() {
    clearTimeout(flipTimer);
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', function () {
    current = null;
    try { history.replaceState(null, '', base.replace(window.location.origin, '')); } catch (e) { /* file:// */ }
  });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close]')) close();
  });
  flip.addEventListener('click', function (e) {
    if (e.target.closest('a, button')) return;
    flip.classList.toggle('is-back');
  });
  dlg.querySelector('[data-turn]').addEventListener('click', function () { flip.classList.toggle('is-back'); });

  function step(n) {
    if (!current) return;
    var on = cards.filter(function (c) { return !c.off; });
    var i = on.indexOf(current);
    if (i < 0) { on = cards; i = cards.indexOf(current); }
    open(on[(i + n + on.length) % on.length], true);
    flip.classList.add('is-back');
  }
  Array.prototype.forEach.call(dlg.querySelectorAll('[data-step]'), function (b) {
    b.addEventListener('click', function () { step(parseInt(b.getAttribute('data-step'), 10)); });
  });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  function shareCard(c, btn) {
    var url = base + '#card-' + c.id;
    if (navigator.share) {
      navigator.share({ title: c.title + ' — Villa Volpe', url: url }).catch(function () {});
      return;
    }
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '✓ ' + (T.tCopied || '');
      setTimeout(function () { btn.textContent = old; }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () {});
  }

  // ── Our number one, in the head of the drawer ──────────────────
  var slot = section.querySelector('[data-top-slot]');
  var first = cards.filter(function (c) { return c.top; })[0];
  if (slot && first) {
    slot.innerHTML =
      '<button type="button" class="ttd-top__photo"><img alt="" loading="lazy"></button>' +
      '<div class="ttd-top__body">' +
        '<span class="ttd-top__badge"></span>' +
        '<h3 class="ttd-top__title"></h3>' +
        '<p class="ttd-top__desc"></p>' +
        '<p class="ttd-dlg__dist"></p>' +
        '<div class="ttd-dlg__actions"></div>' +
      '</div>';
    slot.querySelector('img').src = first.src;
    slot.querySelector('img').alt = first.title;
    slot.querySelector('.ttd-top__photo').setAttribute('aria-label', first.title + ' — ' + (T.tTurn || ''));
    slot.querySelector('.ttd-top__photo').addEventListener('click', function () { open(first); });
    slot.querySelector('.ttd-top__badge').textContent = '★ ' + first.badge;
    slot.querySelector('.ttd-top__title').textContent = first.title;
    slot.querySelector('.ttd-top__desc').textContent = first.desc;
    slot.querySelector('.ttd-dlg__dist').textContent = distText(first);
    actions(slot.querySelector('.ttd-dlg__actions'), first, null);
    slot.hidden = false;
  }

  // ── The hero: a few cards peeking out of the drawer ([data-fan] = ids, in order) ──
  var fan = document.querySelector('[data-fan]');
  if (fan) {
    var fanCards = fan.getAttribute('data-fan').split(/\s+/).map(function (id) {
      return cards.filter(function (c) { return c.id === id; })[0];
    }).filter(Boolean);
    var mid = (fanCards.length - 1) / 2;
    fanCards.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ttd-fan__card' + (c.top ? ' ttd-fan__card--top' : '') + (c.postcard ? ' ttd-fan__card--postcard' : '');
      b.style.setProperty('--i', i - mid);
      b.style.zIndex = 10 - Math.abs(i - mid);
      b.setAttribute('aria-label', c.title + ' — ' + (T.tTurn || ''));
      b.innerHTML = '<img alt="" draggable="false">';
      b.firstChild.src = c.src;
      b.addEventListener('click', function () { open(c); });
      fan.appendChild(b);
    });
  }

  // ── Deep link: …/things-to-do-lake-orta.html#card-venus ─────────
  var m = /^#card-([\w-]+)$/.exec(window.location.hash);
  if (m) {
    var target = cards.filter(function (x) { return x.id === m[1]; })[0];
    if (target) {
      section.scrollIntoView();
      setTimeout(function () { open(target); }, 300);
    }
  }
})();
