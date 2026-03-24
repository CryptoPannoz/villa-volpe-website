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
    navToggle.addEventListener('click', function () {
      mobileMenu.classList.add('mobile-menu--open');
      document.body.style.overflow = 'hidden';
    });

    if (mobileClose) {
      mobileClose.addEventListener('click', function () {
        mobileMenu.classList.remove('mobile-menu--open');
        document.body.style.overflow = '';
      });
    }

    // Close mobile menu when a link is clicked
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('mobile-menu--open');
        document.body.style.overflow = '';
      });
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

  // ---------- Initialize ----------
  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    animateCounters();
  });

  // Also run if DOM is already loaded
  if (document.readyState !== 'loading') {
    initReveal();
    animateCounters();
  }
})();
