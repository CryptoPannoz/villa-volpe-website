/**
 * Villa Volpe — "Things to do on Lake Orta" interactive map.
 *
 * The map is built FROM the visible POI cards in the page (elements with
 * [data-poi]). This keeps a single source of truth: the same text that Google
 * indexes (the cards) also feeds the map markers and the JSON-LD, so map and
 * content can never drift, and the file stays language-agnostic (all display
 * text lives in the localized HTML, never here).
 *
 * Leaflet is loaded on-demand only when the map scrolls into view, exactly like
 * the homepage map, to keep the page fast.
 */
(function () {
  'use strict';

  var mapEl = document.getElementById('ttd-map');
  var cardEls = Array.prototype.slice.call(document.querySelectorAll('[data-poi]'));
  if (!mapEl || !cardEls.length) return;

  // Category → colour (harmonised with the site's earthy palette). Emoji lives
  // in the card markup (data-emoji) so it stays editable per language if needed.
  var CAT_COLOR = {
    villa: '#1A1A1A',
    food: '#C2683D',
    sport: '#2E7DA1',
    nature: '#5C8A4A',
    culture: '#9B5B8B',
    practical: '#8A8A82'
  };

  // ── Read the POIs from the cards ───────────────────────────────
  var pois = cardEls.map(function (el) {
    var titleEl = el.querySelector('.ttd-card__title');
    var descEl = el.querySelector('.ttd-card__desc');
    var linkEl = el.querySelector('.ttd-card__link');
    return {
      el: el,
      id: el.id || '',
      lat: parseFloat(el.getAttribute('data-lat')),
      lng: parseFloat(el.getAttribute('data-lng')),
      cat: (el.getAttribute('data-cat') || 'culture').trim(),
      emoji: el.getAttribute('data-emoji') || '📍',
      title: titleEl ? titleEl.textContent.trim() : '',
      desc: descEl ? descEl.textContent.trim() : '',
      link: linkEl ? { href: linkEl.getAttribute('href'), text: linkEl.textContent.trim() } : null
    };
  }).filter(function (p) { return !isNaN(p.lat) && !isNaN(p.lng); });

  if (!pois.length) return;

  // ── JSON-LD (ItemList of TouristAttraction) for rich results ───
  (function injectJsonLd() {
    try {
      var pageUrl = (document.querySelector('link[rel="canonical"]') || {}).href ||
        window.location.href.split('#')[0];
      var items = pois
        .filter(function (p) { return p.cat !== 'practical'; })
        .map(function (p, i) {
          var attraction = {
            '@type': 'TouristAttraction',
            name: p.title,
            geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
            url: p.link && /^https?:/.test(p.link.href) ? p.link.href
              : pageUrl + (p.id ? '#' + p.id : '')
          };
          if (p.desc) attraction.description = p.desc;
          return { '@type': 'ListItem', position: i + 1, item: attraction };
        });
      var ld = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: document.title,
        itemListElement: items
      };
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    } catch (e) { /* non-critical */ }
  })();

  // ── Category filter chips ──────────────────────────────────────
  var markers = {}; // id → Leaflet marker (populated after map init)
  var chips = Array.prototype.slice.call(document.querySelectorAll('.ttd-chip'));
  var groupTitles = Array.prototype.slice.call(document.querySelectorAll('.ttd-grouptitle'));
  var activeFilter = 'all';
  var mapRef = null;
  var groupRef = null;

  function applyFilter(cat) {
    activeFilter = cat;
    chips.forEach(function (c) {
      c.classList.toggle('is-active', c.getAttribute('data-filter') === cat);
    });
    pois.forEach(function (p) {
      var show = cat === 'all' || p.cat === cat || p.cat === 'villa';
      p.el.style.display = show ? '' : 'none';
      var m = markers[p.id];
      if (m && mapRef && groupRef) {
        if (show) { if (!mapRef.hasLayer(m)) groupRef.addLayer(m); }
        else { groupRef.removeLayer(m); }
      }
    });
    // Group headings show only when browsing "all" (a single-category view is
    // already labelled by the active chip), avoiding orphan headings.
    groupTitles.forEach(function (t) {
      t.style.display = (cat === 'all') ? '' : 'none';
    });
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () { applyFilter(c.getAttribute('data-filter')); });
  });

  // ── Leaflet: build the map ─────────────────────────────────────
  function pinIcon(p) {
    var color = CAT_COLOR[p.cat] || CAT_COLOR.culture;
    return L.divIcon({
      className: 'ttd-pin-wrap',
      html: '<span class="ttd-pin" style="background:' + color + '">' + p.emoji + '</span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  function popupHtml(p) {
    var html = '<div class="ttd-popup"><strong>' + escapeHtml(p.title) + '</strong>';
    if (p.desc) html += '<span>' + escapeHtml(p.desc) + '</span>';
    if (p.link) {
      html += '<a href="' + escapeHtml(p.link.href) + '">' + escapeHtml(p.link.text) + ' &rarr;</a>';
    }
    return html + '</div>';
  }

  function initMap() {
    if (typeof L === 'undefined') return;
    var map = L.map('ttd-map', { scrollWheelZoom: false });
    mapRef = map;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 20,
      subdomains: 'abcd'
    }).addTo(map);

    var group = L.featureGroup().addTo(map);
    groupRef = group;
    var bounds = [];

    pois.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(p), title: p.title });
      m.bindPopup(popupHtml(p), { className: 'ttd-popup-wrap' });
      m.addTo(group);
      if (p.id) markers[p.id] = m;
      bounds.push([p.lat, p.lng]);

      // Card → map: clicking a card focuses its marker.
      p.el.addEventListener('click', function (ev) {
        if (ev.target.closest('a')) return; // let real links work
        map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15), { animate: true });
        m.openPopup();
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    map.fitBounds(bounds, { padding: [40, 40] });

    // Open the villa marker by default so guests get their bearing.
    var villa = pois.filter(function (p) { return p.cat === 'villa'; })[0];
    if (villa && markers[villa.id]) markers[villa.id].openPopup();

    if (activeFilter !== 'all') applyFilter(activeFilter);
  }

  // ── On-demand Leaflet loader (same pattern as the homepage map) ─
  var loaded = false;
  function loadMap() {
    if (loaded) return; loaded = true;
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    var js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = initMap;
    document.body.appendChild(js);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { loadMap(); io.disconnect(); }
    }, { rootMargin: '300px' });
    io.observe(mapEl);
  } else {
    loadMap();
  }
})();
