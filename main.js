/* ============================================
   VILLA VOLPE — Main JavaScript
   ============================================ */

(function () {
  'use strict';

  // ---------- Navigation scroll effect ----------
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function handleScroll() {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = currentScroll;
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // ---------- Mobile menu ----------
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileClose = document.getElementById('mobileClose');

  if (navToggle && mobileMenu) {
    navToggle.setAttribute('aria-controls', mobileMenu.id || 'mobileMenu');
    navToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');

    function openMobileMenu() {
      mobileMenu.classList.add('mobile-menu--open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      if (mobileClose) mobileClose.focus();
    }

    function closeMobileMenu() {
      mobileMenu.classList.remove('mobile-menu--open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      navToggle.focus();
    }

    navToggle.addEventListener('click', function () {
      openMobileMenu();
    });

    if (mobileClose) {
      mobileClose.addEventListener('click', function () {
        closeMobileMenu();
      });
    }

    // Close mobile menu when a link is clicked
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        closeMobileMenu();
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && mobileMenu.classList.contains('mobile-menu--open')) {
        closeMobileMenu();
      }
    });
  }

  // ---------- FAQ Accordion ----------
  document.querySelectorAll('.faq-item__question').forEach(function (button) {
    button.addEventListener('click', function () {
      const item = this.closest('.faq-item');
      const isOpen = item.classList.contains('faq-item--open');

      // Close all other items in the same list
      const faqList = item.closest('.faq-list');
      if (faqList) {
        faqList.querySelectorAll('.faq-item--open').forEach(function (openItem) {
          openItem.classList.remove('faq-item--open');
          openItem.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
        });
      }

      // Toggle this item
      if (!isOpen) {
        item.classList.add('faq-item--open');
        this.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ---------- Scroll Reveal Animation ----------
  function initReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-stagger');

    if (!reveals.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains('reveal-stagger')) {
              entry.target.classList.add('reveal-stagger--visible');
            } else {
              entry.target.classList.add('reveal--visible');
            }
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ---------- Smooth scroll for anchor links ----------
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = nav ? nav.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }
    });
  });

  // ---------- Animated counters (stats) ----------
  function animateCounters() {
    const stats = document.querySelectorAll('.stat__number');
    if (!stats.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const el = entry.target;
            const text = el.textContent.trim();
            const hasPlus = text.includes('+');
            const hasComma = text.includes(',');
            const cleanNum = text.replace(/[^0-9.]/g, '');
            const target = parseFloat(cleanNum);
            const isDecimal = cleanNum.includes('.');
            const duration = 2000;
            const startTime = performance.now();

            function update(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              // Ease out cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = target * eased;

              let display;
              if (isDecimal) {
                display = current.toFixed(2);
              } else {
                display = Math.floor(current).toString();
                if (hasComma) {
                  display = display.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                }
              }
              if (hasPlus) display += '+';

              el.textContent = display;

              if (progress < 1) {
                requestAnimationFrame(update);
              }
            }

            requestAnimationFrame(update);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    stats.forEach(function (stat) {
      observer.observe(stat);
    });
  }

  // =====================================================================
  // MOTION 2026 — vedi il blocco omonimo in fondo a style.css
  // =====================================================================
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  if (!hasIO) document.documentElement.classList.add('no-io');

  // ---------- Nav: si nasconde scendendo, torna risalendo ----------
  function initSmartNav() {
    if (!nav || reduceMotion) return;
    let last = window.scrollY;
    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY;
      const menuOpen = mobileMenu && mobileMenu.classList.contains('mobile-menu--open');
      if (menuOpen || y < 400 || y < last - 4) nav.classList.remove('nav--hidden');
      else if (y > last + 4) nav.classList.add('nav--hidden');
      last = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    // Un focus da tastiera dentro la nav la riporta sempre in vista.
    nav.addEventListener('focusin', function () { nav.classList.remove('nav--hidden'); });
  }

  // ---------- Immagini: sipario + zoom all'ingresso in vista ----------
  const REVEAL_SELECTOR = [
    '.post-photo .post-photo__frame', '.post-content figure:not(.post-photo)',
    '.gallery__item', '.feature-card', '.two-col__img', '.blog-card__img',
    '.ttd-card__img', '.divider'
  ].join(',');
  function initImageReveal() {
    if (reduceMotion || !hasIO) return;
    const els = document.querySelectorAll(REVEAL_SELECTOR);
    if (!els.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        el.classList.add('vv-in');
        setTimeout(function () { el.classList.remove('vv-pre', 'vv-in'); }, 2000);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    const fold = window.innerHeight * 0.95;
    els.forEach(function (el) {
      // Mai nascondere cio' che e' gia' sullo schermo al caricamento.
      if (el.getBoundingClientRect().top < fold) return;
      el.classList.add('vv-pre');
      io.observe(el);
    });
  }

  // ---------- Sezioni cinema: titolo a righe + video solo quando in vista ----------
  function splitLines(el) {
    // Le righe sono marcate a mano con <br> nell'HTML: nessuna misura del
    // testo, quindi niente salti di layout e traduzioni libere di andare a capo.
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (p) {
      return '<span class="vv-line"><span>' + p.trim() + '</span></span>';
    }).join('');
  }
  function canAutoplay() {
    const c = navigator.connection || {};
    return !reduceMotion && !c.saveData && !/(^|-)2g$/.test(c.effectiveType || '');
  }
  function initCinema() {
    const sections = document.querySelectorAll('.vv-cinema, .page-header--cinema, .cta-banner--cinema');
    sections.forEach(function (s) {
      const t = s.querySelector('.vv-cinema__title[data-lines]');
      if (t && !reduceMotion && hasIO) splitLines(t);
    });
    if (!hasIO) { sections.forEach(function (s) { s.classList.add('is-inview'); }); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('is-inview');
      });
    }, { threshold: 0.25 });
    sections.forEach(function (s) { io.observe(s); });
  }
  function initLoopVideos() {
    const vids = document.querySelectorAll('video[data-vv-video]');
    if (!vids.length || !canAutoplay()) return;
    function play(v) {
      if (!v.dataset.vvLoaded) {
        v.dataset.vvLoaded = '1';
        v.addEventListener('playing', function () { v.classList.add('is-playing'); });
        v.addEventListener('canplay', function () { v.play().catch(function () {}); }, { once: true });
        v.load();
      }
      v.play().catch(function () {});
    }
    if (!hasIO) { vids.forEach(play); return; }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        const v = entry.target;
        if (entry.isIntersecting) play(v);
        else if (v.dataset.vvLoaded) { try { v.pause(); } catch (e) {} }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    vids.forEach(function (v) { io.observe(v); });
  }

  // ---------- Barra di avanzamento della lettura (articoli) ----------
  function initReadingProgress() {
    const article = document.querySelector('.post-content');
    if (!article) return;
    const bar = document.createElement('div');
    bar.className = 'vv-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let ticking = false;
    function update() {
      ticking = false;
      const r = article.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(Math.max(-r.top / (total > 0 ? total : 1), 0), 1);
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------- Volo della foto: card del blog -> testata dell'articolo ----------
  function clearHeroNames() {
    document.querySelectorAll('.blog-card__img').forEach(function (el) {
      el.style.viewTransitionName = '';
    });
  }
  function initHeroFlight() {
    if (reduceMotion) return;
    document.addEventListener('click', function (e) {
      const link = e.target.closest && e.target.closest('a[href]');
      if (!link) return;
      const card = link.closest('.blog-card');
      clearHeroNames();
      if (!card || e.metaKey || e.ctrlKey || e.shiftKey || link.target === '_blank') return;
      const img = card.querySelector('.blog-card__img');
      const ownHero = document.querySelector('.post-hero');
      if (ownHero) ownHero.style.viewTransitionName = 'none';
      if (img) img.style.viewTransitionName = 'vv-hero';
    });
    // Tornando indietro (bfcache) i nomi restano appesi: li azzero.
    window.addEventListener('pageshow', function () {
      clearHeroNames();
      const ownHero = document.querySelector('.post-hero');
      if (ownHero) ownHero.style.viewTransitionName = '';
    });
  }

  // Una transizione saltata (navigazione senza gesto dell'utente, scheda in
  // background...) rifiuta le sue promise: e' normale, non e' un errore.
  function quietTransition(e) {
    const vt = e.viewTransition;
    if (!vt) return;
    [vt.updateCallbackDone, vt.ready, vt.finished].forEach(function (p) {
      if (p && p.catch) p.catch(function () {});
    });
  }
  window.addEventListener('pageswap', quietTransition);
  window.addEventListener('pagereveal', quietTransition);

  // ---------- Visore a schermo intero per le foto degli articoli ----------
  function initPhotoViewer() {
    const photos = document.querySelectorAll('.post-photo img');
    if (!photos.length) return;
    let viewer = null;
    let opener = null;
    function close() {
      if (!viewer) return;
      viewer.remove();
      viewer = null;
      document.body.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    }
    function open(img) {
      opener = img;
      viewer = document.createElement('div');
      viewer.className = 'vv-viewer';
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      viewer.setAttribute('aria-label', img.alt || '');
      viewer.tabIndex = -1;
      const big = document.createElement('img');
      big.src = img.dataset.full || img.currentSrc || img.src;
      big.alt = img.alt || '';
      viewer.appendChild(big);
      const fig = img.closest('figure');
      const cap = fig && fig.querySelector('figcaption');
      if (cap) {
        const c = document.createElement('div');
        c.className = 'vv-viewer__cap';
        c.textContent = cap.textContent;
        viewer.appendChild(c);
      }
      viewer.addEventListener('click', close);
      document.body.appendChild(viewer);
      document.body.style.overflow = 'hidden';
      viewer.focus();
    }
    photos.forEach(function (img) {
      img.tabIndex = 0;
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  // ---------- Initialize ----------
  let started = false;
  function init() {
    if (started) return;
    started = true;
    initReveal();
    animateCounters();
    initSmartNav();
    initImageReveal();
    initCinema();
    initLoopVideos();
    initReadingProgress();
    initHeroFlight();
    initPhotoViewer();
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
