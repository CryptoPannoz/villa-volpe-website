/**
 * Villa Volpe — "Things to do on Lake Orta" interactive map.
 *
 * The map is built FROM the visible POI cards in the page (elements with
 * [data-poi]). This keeps a single source of truth: the same text that Google
 * indexes (the cards) also feeds the map markers and the JSON-LD, so map and
 * content can never drift, and the file stays language-agnostic (all display
 * text lives in the localized HTML, never here).
 *
 * Leaflet and the base map come from the shared js/vv-map.js (also used by the
 * homepage map), loaded on demand only when the map scrolls into view.
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
    var imgEl = el.querySelector('.ttd-card__img');
    return {
      el: el,
      id: el.id || '',
      lat: parseFloat(el.getAttribute('data-lat')),
      lng: parseFloat(el.getAttribute('data-lng')),
      cat: (el.getAttribute('data-cat') || 'culture').trim(),
      pick: el.hasAttribute('data-pick'),
      emoji: el.getAttribute('data-emoji') || '📍',
      title: titleEl ? titleEl.textContent.trim() : '',
      desc: descEl ? descEl.textContent.trim() : '',
      link: linkEl ? { href: linkEl.getAttribute('href'), text: linkEl.textContent.trim() } : null,
      img: imgEl ? imgEl.src : ''
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
          if (p.img) attraction.image = p.img;
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
      // «pick» = le scelte di casa (data-pick), trasversali alle categorie
      var show = cat === 'all' || (cat === 'pick' ? p.pick : p.cat === cat) || p.cat === 'villa';
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
    // How many places each chip shows (the villa marker is always there, so it doesn't count)
    var f = c.getAttribute('data-filter');
    var n = pois.filter(function (p) {
      return p.cat !== 'villa' && (f === 'all' || (f === 'pick' ? p.pick : p.cat === f));
    }).length;
    var badge = document.createElement('span');
    badge.className = 'ttd-chip__n';
    badge.textContent = n;
    c.appendChild(badge);
  });

  // Opens one place on the map from elsewhere on the page (the business-card
  // drawer, js/ttd-drawer.js). If the map isn't built yet, it waits for it.
  var pendingFocus = null;
  function focusPoi(id) {
    var p = pois.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var shown = activeFilter === 'all' || (activeFilter === 'pick' ? p.pick : p.cat === activeFilter);
    if (!shown) applyFilter('all');
    mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!mapRef) { pendingFocus = id; return; }
    mapRef.setView([p.lat, p.lng], Math.max(mapRef.getZoom(), 15), { animate: true });
    if (markers[id]) markers[id].openPopup();
  }
  window.VVTtd = { focus: focusPoi };

  // «#picks» (il pulsante in Discover) apre la pagina già filtrata sulle scelte di casa
  if (window.location.hash === '#picks') applyFilter('pick');

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
    VVMap.addBase(map);

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
    if (pendingFocus) { var f = pendingFocus; pendingFocus = null; focusPoi(f); }
  }

  // Leaflet + base map are loaded on demand by the shared js/vv-map.js.
  VVMap.whenVisible(mapEl, initMap);
})();
