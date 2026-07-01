(function() {
  // ── Language detection ─────────────────────────────────────
  var lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
  if (lang !== 'fr' && lang !== 'de') lang = 'en';

  // ── Robust base-path calculation ──────────────────────────
  // Works on the custom domain root (www.villa-volpe.com/…) AND on the
  // GitHub Pages project path (…/villa-volpe-website/…).
  var parts = window.location.pathname.split('/').filter(Boolean);
  var repoIndex = parts.indexOf('villa-volpe-website');
  var last = parts[parts.length - 1] || '';
  var fileIsLast = /\.[a-z0-9]+$/i.test(last);
  var segs = fileIsLast ? parts.slice(0, -1) : parts.slice();
  if (repoIndex >= 0) segs = segs.slice(repoIndex + 1); // drop repo name and anything above it
  var depthFromRoot = segs.length;                       // /fr/ -> 1 ; /blog/posts/ -> 2 ; / -> 0
  var toRoot = depthFromRoot > 0 ? '../'.repeat(depthFromRoot) : '';

  // Localized pages live under toRoot + <lang>/ ; the blog stays English at the site root.
  var langBase = (lang === 'en') ? toRoot : toRoot + lang + '/';
  var blogHref = toRoot + 'blog.html';

  // ── Translations ──────────────────────────────────────────
  var T = {
    en: {
      desc: 'A design glass cube on the sunny shore of Lake Orta. Three meters from crystal clear water, with a view of San Giulio Island.',
      explore: 'Explore', discover: 'Discover', story: 'Our Story', blog: 'Blog', faqs: 'FAQs',
      contact: 'Contact', address: 'Via Novara 38 - Orta San Giulio 28016 - Italy',
      book: 'Book', directBooking: 'Direct Booking (-15%)', airbnb: 'Airbnb Listing', crypto: 'Pay with Crypto',
      rights: '© 2026 Villa Volpe. All rights reserved.'
    },
    fr: {
      desc: 'Un cube de verre design sur la rive ensoleillée du lac d’Orta. À trois mètres d’une eau cristalline, avec vue sur l’île de San Giulio.',
      explore: 'Explorer', discover: 'Découvrir', story: 'Notre histoire', blog: 'Blog', faqs: 'FAQ',
      contact: 'Contact', address: 'Via Novara 38 - Orta San Giulio 28016 - Italie',
      book: 'Réserver', directBooking: 'Réservation directe (-15%)', airbnb: 'Annonce Airbnb', crypto: 'Payer en crypto',
      rights: '© 2026 Villa Volpe. Tous droits réservés.'
    },
    de: {
      desc: 'Ein Design-Glaswürfel am sonnigen Ufer des Ortasees. Drei Meter vom kristallklaren Wasser entfernt, mit Blick auf die Insel San Giulio.',
      explore: 'Entdecken', discover: 'Entdecken', story: 'Unsere Geschichte', blog: 'Blog', faqs: 'FAQ',
      contact: 'Kontakt', address: 'Via Novara 38 - Orta San Giulio 28016 - Italien',
      book: 'Buchen', directBooking: 'Direktbuchung (-15%)', airbnb: 'Airbnb-Inserat', crypto: 'Mit Krypto zahlen',
      rights: '© 2026 Villa Volpe. Alle Rechte vorbehalten.'
    }
  };
  var t = T[lang];

  var footerHTML = `
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <div class="footer__brand">Villa <span>Volpe</span></div>
          <p class="footer__desc">${t.desc}</p>
        </div>
        <div>
          <div class="footer__title">${t.explore}</div>
          <ul class="footer__links">
            <li><a href="${langBase}discover.html">${t.discover}</a></li>
            <li><a href="${langBase}story.html">${t.story}</a></li>
            <li><a href="${blogHref}">${t.blog}</a></li>
            <li><a href="${langBase}faqs.html">${t.faqs}</a></li>
          </ul>
        </div>
        <div>
          <div class="footer__title">${t.contact}</div>
          <ul class="footer__links">
            <li><a href="mailto:villavolpeorta@gmail.com">villavolpeorta@gmail.com</a></li>
            <li><a href="https://maps.app.goo.gl/Sn4s6anH8q2rQJvVA" target="_blank" rel="noopener">${t.address}</a></li>
          </ul>
        </div>
        <div>
          <div class="footer__title">${t.book}</div>
          <ul class="footer__links">
            <li><a href="${langBase}book.html">${t.directBooking}</a></li>
            <li><a href="https://airbnb.com/rooms/16759665" target="_blank" rel="noopener">${t.airbnb}</a></li>
            <li><a href="https://villavolpeortalake.dtravel.com/" target="_blank" rel="noopener">${t.crypto}</a></li>
          </ul>
          <div class="footer__social">
            <a href="https://www.instagram.com/villavolpe/" target="_blank" rel="noopener" aria-label="Villa Volpe on Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://www.facebook.com/villavolpe/" target="_blank" rel="noopener" aria-label="Villa Volpe on Facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/villa-volpe-orta-san-giulio" target="_blank" rel="noopener" aria-label="Villa Volpe on LinkedIn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="https://www.youtube.com/watch?v=NFsZP8XY0Cg" target="_blank" rel="noopener" aria-label="Villa Volpe on YouTube">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="footer__bottom">
        <span>${t.rights}</span>
        <div class="footer__legal">
          <span>CIN: IT003112C2L7M2HAGX</span>
          <span>CIR: 00311200109</span>
        </div>
      </div>
    </div>
  </footer>`;

  var target = document.getElementById('site-footer');
  if (target) {
    target.innerHTML = footerHTML;
  }
})();
