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
          </ul>
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
