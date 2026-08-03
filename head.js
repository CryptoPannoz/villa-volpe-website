(function() {
  // Google Analytics 4 (gtag.js)
  //
  // gtag.js pesa ~150 KB: caricato durante il primo rendering si mangia banda
  // e main thread proprio mentre il browser sta cercando di dipingere l'hero.
  // Lo carichiamo dopo il `load`, in un momento di idle. La coda dataLayer e'
  // pronta da subito, quindi la pageview (e qualunque evento sparato prima)
  // viene comunque inviata appena lo script arriva.
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', 'G-85LLNHZDE2');

  var loaded = false;
  function loadGtag() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-85LLNHZDE2';
    document.head.appendChild(s);
  }

  function schedule() {
    // requestIdleCallback dove c'e', ma con timeout: su una pagina sempre
    // occupata l'idle potrebbe non arrivare mai e perderemmo la visita.
    if (window.requestIdleCallback) requestIdleCallback(loadGtag, { timeout: 3000 });
    else setTimeout(loadGtag, 1200);
  }

  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule);
})();
