/**
 * Villa Volpe — shared map loader (homepage map + "Things to do" map).
 *
 * This is the ONLY place that picks the base map. If a tile provider changes
 * its terms (as CARTO did in October 2026, when every tile started coming back
 * as an "API KEY REQUIRED" watermark), only this file needs to change.
 *
 * Base map: OpenFreeMap "bright" — vector tiles, free for commercial use, no
 * API key, rendered by MapLibre GL underneath Leaflet (markers and popups stay
 * plain Leaflet). Automatic fallback: standard OpenStreetMap raster tiles when
 * the browser has no WebGL, MapLibre fails to load, or the style does not
 * render within a few seconds.
 *
 * Everything is loaded on demand, only when the map is about to scroll into
 * view, to keep the pages fast.
 *
 * Usage:
 *   VVMap.whenVisible(el, function (L) {
 *     var map = L.map(el);
 *     VVMap.addBase(map);
 *     ...
 *   });
 */
(function () {
  'use strict';

  var LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet';
  var MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl';
  var MAPLIBRE_LEAFLET = 'https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js';
  var STYLE = 'https://tiles.openfreemap.org/styles/bright';
  var OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var STYLE_TIMEOUT = 8000;

  var OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  var OFM_ATTR = '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> ' + OSM_ATTR;

  function loadCss(href) {
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = href;
    document.head.appendChild(css);
  }

  function loadScript(src, done) {
    var js = document.createElement('script');
    js.src = src;
    js.onload = function () { done(true); };
    js.onerror = function () { done(false); };
    document.body.appendChild(js);
  }

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) {
      return false;
    }
  }

  // ── Loading: Leaflet always, MapLibre + its Leaflet bridge when WebGL works ─
  var state = 'idle'; // idle → loading → ready | failed
  var vector = false;
  var queue = [];

  function load(cb) {
    if (state === 'ready') return cb(window.L);
    if (state === 'failed') return; // no Leaflet, no map: leave the placeholder alone
    queue.push(cb);
    if (state === 'loading') return;
    state = 'loading';

    var wantVector = hasWebGL();
    var pending = wantVector ? 2 : 1;
    var leafletOk = false;
    var maplibreOk = false;

    function finish() {
      state = leafletOk ? 'ready' : 'failed';
      var fns = queue.splice(0);
      if (leafletOk) fns.forEach(function (fn) { fn(window.L); });
    }

    function step() {
      if (--pending) return;
      if (leafletOk && maplibreOk) {
        loadScript(MAPLIBRE_LEAFLET, function (ok) {
          vector = ok && typeof window.L.maplibreGL === 'function';
          finish();
        });
      } else {
        finish();
      }
    }

    loadCss(LEAFLET + '.css');
    loadScript(LEAFLET + '.js', function (ok) {
      leafletOk = ok && typeof window.L !== 'undefined';
      step();
    });
    if (wantVector) {
      loadCss(MAPLIBRE + '.css');
      loadScript(MAPLIBRE + '.js', function (ok) {
        maplibreOk = ok && typeof window.maplibregl !== 'undefined';
        step();
      });
    }
  }

  // ── Base layer ─────────────────────────────────────────────────────────────
  function addOsm(map) {
    window.L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
  }

  function addVector(map) {
    var gl = null;
    var settled = false;
    var timer;

    function fallback() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (gl && map.hasLayer(gl)) map.removeLayer(gl);
      addOsm(map);
    }

    try {
      gl = window.L.maplibreGL({ style: STYLE, attribution: OFM_ATTR }).addTo(map);
      var ml = gl.getMaplibreMap();
      timer = setTimeout(fallback, STYLE_TIMEOUT);
      ml.once('load', function () {
        settled = true;
        clearTimeout(timer);
      });
      // Style / glyph / sprite failures have no tile or source attached; a
      // single missing tile is not a reason to throw the vector map away.
      ml.on('error', function (e) {
        if (!e.tile && !e.sourceId) fallback();
      });
    } catch (e) {
      fallback();
    }
  }

  function addBase(map) {
    if (!vector) return addOsm(map);
    // The GL layer needs a centre and zoom; the Things-to-do map only gets
    // them from fitBounds() after its markers are added.
    map.whenReady(function () { addVector(map); });
  }

  function whenVisible(el, cb) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return load(cb);
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); load(cb); }
    }, { rootMargin: '300px' });
    io.observe(el);
  }

  window.VVMap = { whenVisible: whenVisible, load: load, addBase: addBase };
})();
