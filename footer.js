(function() {
  // Get base path for links (works in root and subfolders)
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  const repoName = 'villa-volpe-website';
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const repoIndex = pathParts.indexOf(repoName);
  const levelsDeep = repoIndex >= 0 ? pathParts.length - repoIndex - 1 : 0;
  const base = levelsDeep > 0 ? '../'.repeat(levelsDeep) : '';

  const footerHTML = `
  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <div class="footer__brand">Villa <span>Volpe</span></div>
          <p class="footer__desc">A design glass cube on the sunny shore of Lake Orta. Three meters from crystal clear water, with a view of San Giulio Island.</p>
        </div>
        <div>
          <div class="footer__title">Explore</div>
          <ul class="footer__links">
            <li><a href="${base}discover.html">Discover</a></li>
            <li><a href="${base}story.html">Our Story</a></li>
            <li><a href="${base}blog.html">Blog</a></li>
            <li><a href="${base}faqs.html">FAQs</a></li>
          </ul>
        </div>
        <div>
          <div class="footer__title">Contact</div>
          <ul class="footer__links">
            <li><a href="mailto:villavolpeorta@gmail.com">villavolpeorta@gmail.com</a></li>
            <li><a href="https://maps.app.goo.gl/Sn4s6anH8q2rQJvVA" target="_blank" rel="noopener">Via Novara 38 - Orta San Giulio 28016 - Italy</a></li>
          </ul>
        </div>
        <div>
          <div class="footer__title">Book</div>
          <ul class="footer__links">
            <li><a href="${base}book.html">Direct Booking (-15%)</a></li>
            <li><a href="https://www.airbnb.com/rooms/26816946" target="_blank" rel="noopener">Airbnb Listing</a></li>
            <li><a href="https://villavolpeortalake.dtravel.com/" target="_blank" rel="noopener">Pay with Crypto</a></li>
          </ul>
          <div class="footer__social">
            <a href="https://www.instagram.com/villavolpe/" target="_blank" rel="noopener" aria-label="Instagram">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://www.facebook.com/villavolpe/" target="_blank" rel="noopener" aria-label="Facebook">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/villa-volpe-orta-san-giulio" target="_blank" rel="noopener" aria-label="LinkedIn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="https://www.youtube.com/watch?v=NFsZP8XY0Cg" target="_blank" rel="noopener" aria-label="YouTube">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div class="footer__bottom">
        <span>&copy; 2026 Villa Volpe. All rights reserved.</span>
        <div class="footer__legal">
          <span>CIN: IT003112C2L7M2HAGX</span>
          <span>CIR: 00311200109</span>
        </div>
      </div>
    </div>
  </footer>`;

  const target = document.getElementById('site-footer');
  if (target) {
    target.innerHTML = footerHTML;
  }
})();
