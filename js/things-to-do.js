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
      icon: el.getAttribute('data-icon') || '',   // icona SVG (style.css .ttd-ico--*); la villa tiene la 🦊
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
  // Telefoni e tablet: dito invece del mouse (mappa bloccata finche' non la tocchi)
  var COARSE = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

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
        if (show) { if (!groupRef.hasLayer(m) && !mapRef.hasLayer(m)) groupRef.addLayer(m); }
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
    if (markers[id]) openMarker(markers[id], p);
  }

  // Porta la mappa sul posto e apre il fumetto, anche se il pin era dentro un gruppo
  function openMarker(m, p) {
    if (groupRef && groupRef.zoomToShowLayer && groupRef.hasLayer(m)) {
      mapRef.setView([p.lat, p.lng], Math.max(mapRef.getZoom(), 15), { animate: false });
      groupRef.zoomToShowLayer(m, function () { m.openPopup(); });
    } else {
      mapRef.setView([p.lat, p.lng], Math.max(mapRef.getZoom(), 15), { animate: true });
      m.openPopup();
    }
  }
  window.VVTtd = { focus: focusPoi };

  // «#picks» (il pulsante in Discover) apre la pagina già filtrata sulle scelte di casa
  if (window.location.hash === '#picks') applyFilter('pick');

  // ── Leaflet: build the map ─────────────────────────────────────
  function pinIcon(p) {
    var color = CAT_COLOR[p.cat] || CAT_COLOR.culture;
    return L.divIcon({
      className: 'ttd-pin-wrap',
      html: '<span class="ttd-pin" style="background:' + color + '">' +
        (p.icon ? '<span class="ttd-ico ttd-ico--' + p.icon + '"></span>' : p.emoji) + '</span>',
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

  // Pin vicini raggruppati (intorno a Orta erano una pila illeggibile): plugin
  // standard di Leaflet, caricato solo qui. Se non arriva, pin sciolti come prima.
  var CLUSTER_JS = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
  function withCluster(done) {
    if (L.markerClusterGroup) { done(); return; }
    var js = document.createElement('script');
    js.src = CLUSTER_JS;
    js.onload = js.onerror = function () { done(); };
    document.body.appendChild(js);
  }

  function makeGroup() {
    if (!L.markerClusterGroup) return L.featureGroup();
    return L.markerClusterGroup({
      maxClusterRadius: 34,
      disableClusteringAtZoom: 14,
      showCoverageOnHover: false,
      iconCreateFunction: function (cl) {
        return L.divIcon({
          className: 'ttd-cluster-wrap',
          html: '<span class="ttd-cluster">' + cl.getChildCount() + '</span>',
          iconSize: [38, 38]
        });
      }
    });
  }

  function initMap() {
    if (typeof L === 'undefined') return;
    withCluster(buildMap);
  }

  function buildMap() {
    // maxZoom esplicito: markercluster lo pretende, e la base MapLibre non lo dichiara
    var map = L.map('ttd-map', { scrollWheelZoom: false, maxZoom: 18 });
    mapRef = map;
    VVMap.addBase(map);

    var group = makeGroup().addTo(map);
    groupRef = group;
    var bounds = [];

    pois.forEach(function (p) {
      var villaPin = p.cat === 'villa';
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(p), title: p.title, zIndexOffset: villaPin ? 1000 : 0 });
      m.bindPopup(popupHtml(p), { className: 'ttd-popup-wrap' });
      // la villa resta sempre fuori dai gruppi: e' il punto di riferimento
      m.addTo(villaPin ? map : group);
      if (p.id) markers[p.id] = m;
      bounds.push([p.lat, p.lng]);

      // Card → map: clicking a card focuses its marker.
      p.el.addEventListener('click', function (ev) {
        if (ev.target.closest('a')) return; // let real links work
        openMarker(m, p);
        mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    map.fitBounds(bounds, { padding: COARSE ? [20, 20] : [40, 40] });

    // Su telefono un dito che scorre la pagina non deve restare incastrato nella
    // mappa (400px su 812): si sposta solo dopo un tocco, lo zoom a due dita va sempre.
    if (COARSE && map.dragging) {
      map.dragging.disable();
      var unlock = document.createElement('button');
      unlock.type = 'button';
      unlock.className = 'ttd-map__unlock';
      unlock.textContent = mapEl.getAttribute('data-t-unlock') || 'Tap to move the map';
      L.DomEvent.disableClickPropagation(unlock);
      var free = function () {
        if (!map.dragging.enabled()) map.dragging.enable();
        if (unlock.parentNode) unlock.parentNode.removeChild(unlock);
      };
      unlock.addEventListener('click', free);
      map.on('popupopen', free);
      mapEl.appendChild(unlock);
    }

    // Open the villa marker by default so guests get their bearing — solo su
    // computer: sul telefono il fumetto copriva quasi tutti i pin.
    var villa = pois.filter(function (p) { return p.cat === 'villa'; })[0];
    if (villa && markers[villa.id] && !COARSE && window.innerWidth > 768) markers[villa.id].openPopup();

    if (activeFilter !== 'all') applyFilter(activeFilter);
    if (pendingFocus) { var f = pendingFocus; pendingFocus = null; focusPoi(f); }
  }

  // Leaflet + base map are loaded on demand by the shared js/vv-map.js.
  VVMap.whenVisible(mapEl, initMap);
})();
