/**
 * Villa Volpe — anteprima del feed Instagram sopra il footer.
 *
 * Lo carica footer.js (async, col percorso toRoot) su ogni pagina che ha
 * #site-footer: e' l'UNICO posto dove vive questa sezione.
 *
 * Dati: v5, GET /api/public/instagram
 *   { username, profileUrl, posts: [{ id, permalink, kind, caption, at, image }] }
 *   kind = "image" | "carousel" | "video"; image e' gia' un JPEG proxato da v5
 *   (CORS/CORP a posto), caption al massimo 140 caratteri.
 *
 * - Il JSON si chiede solo quando il footer arriva a ~600px dallo schermo
 *   (IntersectionObserver): chi non scende fino in fondo non scarica nulla.
 * - La sezione nasce SOLO a dati arrivati: niente box vuoto, niente salti.
 *   Richiesta fallita, oltre 5 secondi o meno di 3 post validi: non compare
 *   niente (nel footer resta comunque l'icona Instagram).
 * - Griglia sempre piena: 6 riquadri, oppure 3 se i post validi sono 3-5.
 * - Nessuno script o widget di Instagram: solo <a> e <img>, costruiti con le
 *   API del DOM (mai innerHTML con testo che arriva dal JSON).
 * - Prove in locale: window.VV_IG_FEED_URL = 'http://localhost:.../feed.json'
 *   prima che il footer entri in vista sostituisce l'endpoint di produzione.
 *
 * Stili: blocco "Instagram" in fondo a style.css.
 */
(function () {
  'use strict';

  var DEFAULT_URL = 'https://villa-volpe-v5.vercel.app/api/public/instagram';
  var PROFILE_URL = 'https://www.instagram.com/villavolpe/';
  var MAX_POSTS = 6;
  var MIN_POSTS = 3;
  var COLUMNS = 3;
  var TIMEOUT_MS = 5000;

  var anchor = document.getElementById('site-footer');
  if (!anchor || !window.fetch || window.VV_IG_FEED_STARTED) return;
  window.VV_IG_FEED_STARTED = true;

  var lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  var T = {
    en: { follow: 'Follow us on Instagram', view: 'View on Instagram', alt: 'Villa Volpe on Instagram', carousel: 'Carousel', video: 'Video' },
    it: { follow: 'Seguici su Instagram', view: 'Vedi su Instagram', alt: 'Villa Volpe su Instagram', carousel: 'Carosello', video: 'Video' },
    de: { follow: 'Folgen Sie uns auf Instagram', view: 'Auf Instagram ansehen', alt: 'Villa Volpe auf Instagram', carousel: 'Karussell', video: 'Video' },
    fr: { follow: 'Suivez-nous sur Instagram', view: 'Voir sur Instagram', alt: 'Villa Volpe sur Instagram', carousel: 'Carrousel', video: 'Vidéo' }
  };
  var t = T[lang] || T.en;

  // Icone statiche (nostre, non dal JSON): sicure come innerHTML.
  var ICONS = {
    carousel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 4H5a2 2 0 0 0-2 2v11"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 4.5v15a.8.8 0 0 0 1.2.7l12-7.5a.8.8 0 0 0 0-1.4l-12-7.5A.8.8 0 0 0 7 4.5z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>'
  };

  var IG_HOST = /(^|\.)instagram\.com$/i;

  // Solo http(s); per i link verso Instagram anche https + dominio instagram.com.
  function safeUrl(value, instagramOnly) {
    if (typeof value !== 'string' || !value) return null;
    try {
      var u = new URL(value, window.location.href);
      if (instagramOnly) {
        if (u.protocol !== 'https:' || !IG_HOST.test(u.hostname)) return null;
      } else if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return null;
      }
      return u.href;
    } catch (e) {
      return null;
    }
  }

  // Alt dalla didascalia, senza la coda di #hashtag/@menzioni (a voce e' solo rumore).
  function altFrom(caption) {
    var s = typeof caption === 'string' ? caption.replace(/\s+/g, ' ').trim() : '';
    s = s.replace(/(?:\s*[#@][^\s#@]+)+\s*$/, '').trim();
    return s || t.alt;
  }

  function pickPosts(data) {
    var list = data && Array.isArray(data.posts) ? data.posts : [];
    var out = [];
    for (var i = 0; i < list.length && out.length < MAX_POSTS; i++) {
      var p = list[i];
      if (!p || typeof p !== 'object') continue;
      var link = safeUrl(p.permalink, true);
      var image = safeUrl(p.image, false);
      if (!link || !image) continue;
      out.push({
        link: link,
        image: image,
        kind: p.kind === 'carousel' || p.kind === 'video' ? p.kind : 'image',
        alt: altFrom(p.caption)
      });
    }
    if (out.length < MIN_POSTS) return [];
    return out.slice(0, out.length - (out.length % COLUMNS));
  }

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) node.setAttribute(k, attrs[k]);
      }
    }
    return node;
  }

  function externalLink(className, href) {
    return el('a', className, { href: href, target: '_blank', rel: 'noopener' });
  }

  function render(data, posts) {
    var profile = safeUrl(data.profileUrl, true) || PROFILE_URL;
    var user = typeof data.username === 'string' && /^[A-Za-z0-9._]{1,30}$/.test(data.username)
      ? data.username : 'villavolpe';

    var section = el('section', 'ig-feed', { 'aria-labelledby': 'ig-feed-title' });
    var wrap = el('div', 'container');

    var head = el('div', 'ig-feed__head');
    var title = el('h2', 'label ig-feed__eyebrow', { id: 'ig-feed-title' });
    title.textContent = t.follow;
    var handle = externalLink('ig-feed__handle', profile);
    handle.textContent = '@' + user;
    head.appendChild(title);
    head.appendChild(handle);

    var grid = el('ul', 'ig-feed__grid', { role: 'list' });
    posts.forEach(function (p) {
      var item = el('li', 'ig-feed__item');
      var tile = externalLink('ig-feed__tile', p.link);
      // loading/decoding PRIMA di src, altrimenti il browser parte subito.
      var img = el('img', null, {
        alt: p.alt, width: '640', height: '640', loading: 'lazy', decoding: 'async'
      });
      img.addEventListener('error', function () { tile.classList.add('is-broken'); });
      img.src = p.image;
      tile.appendChild(img);
      if (p.kind !== 'image') {
        var badge = el('span', 'ig-feed__badge', { 'aria-hidden': 'true' });
        badge.innerHTML = ICONS[p.kind];
        var kind = el('span', 'ig-feed__sr');
        kind.textContent = ' (' + t[p.kind] + ')';
        tile.appendChild(badge);
        tile.appendChild(kind);
      }
      item.appendChild(tile);
      grid.appendChild(item);
    });

    var cta = el('div', 'ig-feed__cta');
    var btn = externalLink('btn btn--dark ig-feed__btn', profile);
    btn.innerHTML = ICONS.instagram;
    btn.appendChild(document.createTextNode(t.view));
    cta.appendChild(btn);

    wrap.appendChild(head);
    wrap.appendChild(grid);
    wrap.appendChild(cta);
    section.appendChild(wrap);
    anchor.parentNode.insertBefore(section, anchor);
  }

  function load() {
    var url = (typeof window.VV_IG_FEED_URL === 'string' && window.VV_IG_FEED_URL) || DEFAULT_URL;
    var ctrl = window.AbortController ? new AbortController() : null;
    var settled = false;
    var timer = setTimeout(function () {
      settled = true;
      if (ctrl) ctrl.abort();
    }, TIMEOUT_MS);

    fetch(url, { mode: 'cors', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (settled) return; // arrivato dopo il timeout: troppo tardi
        settled = true;
        clearTimeout(timer);
        var posts = pickPosts(data);
        if (posts.length) render(data, posts);
      })
      .catch(function () {
        // In silenzio: niente sezione, il footer resta com'e'.
        settled = true;
        clearTimeout(timer);
      });
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;
    load();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          io.disconnect();
          start();
          return;
        }
      }
    }, { rootMargin: '600px 0px' });
    io.observe(anchor);
  } else if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start);
  }
})();
