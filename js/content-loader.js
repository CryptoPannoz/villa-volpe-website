/**
 * Villa Volpe Content Management System Loader
 * Dynamically loads and updates page content from JSON files
 * Supports text content (data-cms), images (data-cms-img), and background images (data-cms-bg)
 */

(function() {
  'use strict';

  function getCurrentPage() {
    const path = window.location.pathname.replace(/\/+$/, '');
    // Support both /discover.html and /discover (Netlify Pretty URLs)
    if (path === '' || path === '/' || path.includes('index')) return 'index';
    if (path.includes('faqs')) return 'faqs';
    if (path.includes('discover')) return 'discover';
    if (path.includes('story')) return 'story';
    if (path.includes('book')) return 'book';
    return null;
  }

  async function loadJSON(page) {
    try {
      const response = await fetch(`/content/pages/${page}.json`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  /**
   * Resolve a dot-notation path like "outdoor.image" from a nested object
   */
  function getValue(obj, pathStr) {
    return pathStr.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : null;
    }, obj);
  }

  /**
   * Update text content — elements with [data-cms="path.to.value"]
   */
  function updateTextContent(data) {
    const elements = document.querySelectorAll('[data-cms]');
    elements.forEach(element => {
      const key = element.getAttribute('data-cms');
      const value = getValue(data, key);
      if (value !== null && value !== undefined) {
        if (typeof value === 'string' && value.includes('<')) {
          element.innerHTML = value;
        } else {
          element.textContent = String(value);
        }
      }
    });
  }

  /**
   * Update images — elements with [data-cms-img="path.to.image"]
   * Replaces placeholder divs with actual <img> tags,
   * or sets src on existing <img> elements
   */
  function updateImages(data) {
    const elements = document.querySelectorAll('[data-cms-img]');
    elements.forEach(element => {
      const key = element.getAttribute('data-cms-img');
      const value = getValue(data, key);
      if (value && typeof value === 'string') {
        if (element.tagName === 'IMG') {
          // If it's already an <img>, just update src
          element.src = value;
          if (!element.alt) {
            element.alt = key.split('.').pop();
          }
        } else {
          // Replace placeholder div with an <img>
          const img = document.createElement('img');
          img.src = value;
          img.alt = element.textContent || key.split('.').pop();
          img.loading = 'lazy';
          // Preserve the original element's classes and style
          img.className = element.className;
          img.style.cssText = element.style.cssText;
          // Ensure it fills the container
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          element.replaceWith(img);
        }
      }
    });
  }

  /**
   * Update background images — elements with [data-cms-bg="path.to.image"]
   */
  function updateBackgroundImages(data) {
    const elements = document.querySelectorAll('[data-cms-bg]');
    elements.forEach(element => {
      const key = element.getAttribute('data-cms-bg');
      const value = getValue(data, key);
      if (value && typeof value === 'string') {
        element.style.backgroundImage = `url('${value}')`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
      }
    });
  }

  /**
   * Build FAQ accordion from JSON data
   */
  function buildFAQAccordion(faqData) {
    if (!faqData || !faqData.categories) return;
    const container = document.querySelector('[data-cms-faq-container]');
    if (!container) return;
    container.innerHTML = '';
    faqData.categories.forEach(category => {
      const categoryDiv = document.createElement('div');
      categoryDiv.style.marginBottom = 'var(--space-xl)';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = category.name;
      const divider = document.createElement('div');
      divider.className = 'divider';
      categoryDiv.appendChild(label);
      categoryDiv.appendChild(divider);
      const faqList = document.createElement('div');
      faqList.className = 'faq-list';
      category.faqs.forEach(faq => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'faq-item';
        const question = document.createElement('button');
        question.className = 'faq-item__question';
        question.setAttribute('aria-expanded', 'false');
        question.innerHTML = faq.question + '<span class="faq-item__icon"></span>';
        const answerWrapper = document.createElement('div');
        answerWrapper.className = 'faq-item__answer';
        answerWrapper.style.display = 'none';
        const answerInner = document.createElement('div');
        answerInner.className = 'faq-item__answer-inner';
        answerInner.innerHTML = faq.answer;
        answerWrapper.appendChild(answerInner);
        question.addEventListener('click', function() {
          const isExpanded = this.getAttribute('aria-expanded') === 'true';
          this.setAttribute('aria-expanded', !isExpanded);
          answerWrapper.style.display = isExpanded ? 'none' : 'block';
        });
        itemDiv.appendChild(question);
        itemDiv.appendChild(answerWrapper);
        faqList.appendChild(itemDiv);
      });
      categoryDiv.appendChild(faqList);
      container.appendChild(categoryDiv);
    });
  }

  /**
   * Build photo gallery from JSON data
   * Expects data.gallery = [{ image: "/path.jpg", caption: "text" }, ...]
   */
  function buildGallery(data) {
    if (!data || !data.gallery) return;
    var container = document.querySelector('[data-cms-gallery]');
    if (!container) return;

    // Filter out items without images
    var items = data.gallery.filter(function(item) { return item.image && item.image !== ''; });
    if (items.length === 0) return;

    // Clear placeholder content
    container.innerHTML = '';

    // Build gallery grid
    items.forEach(function(item, index) {
      var div = document.createElement('div');
      div.className = 'gallery__item';
      var img = document.createElement('img');
      img.src = item.image;
      img.alt = item.caption || 'Villa Volpe';
      img.loading = 'lazy';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.cursor = 'pointer';
      img.addEventListener('click', function() {
        openLightbox(items, index);
      });
      div.appendChild(img);
      if (item.caption) {
        var cap = document.createElement('div');
        cap.className = 'gallery__caption';
        cap.textContent = item.caption;
        div.appendChild(cap);
      }
      container.appendChild(div);
    });
  }

  /**
   * Lightbox functionality
   */
  var lightboxItems = [];
  var lightboxIndex = 0;

  function openLightbox(items, index) {
    lightboxItems = items;
    lightboxIndex = index;
    var lightbox = document.getElementById('lightbox');
    var img = document.getElementById('lightboxImg');
    var caption = document.getElementById('lightboxCaption');
    if (!lightbox || !img) return;
    img.src = items[index].image;
    if (caption) caption.textContent = items[index].caption || '';
    lightbox.classList.add('lightbox--open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var lightbox = document.getElementById('lightbox');
    if (lightbox) {
      lightbox.classList.remove('lightbox--open');
      document.body.style.overflow = '';
    }
  }

  function navigateLightbox(direction) {
    lightboxIndex = (lightboxIndex + direction + lightboxItems.length) % lightboxItems.length;
    var img = document.getElementById('lightboxImg');
    var caption = document.getElementById('lightboxCaption');
    if (img) img.src = lightboxItems[lightboxIndex].image;
    if (caption) caption.textContent = lightboxItems[lightboxIndex].caption || '';
  }

  // Lightbox event listeners
  document.addEventListener('DOMContentLoaded', function() {
    var closeBtn = document.getElementById('lightboxClose');
    var prevBtn = document.getElementById('lightboxPrev');
    var nextBtn = document.getElementById('lightboxNext');
    var lightbox = document.getElementById('lightbox');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function() { navigateLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { navigateLightbox(1); });
    if (lightbox) lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function(e) {
      if (!document.getElementById('lightbox').classList.contains('lightbox--open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    });
  });

  /**
   * Main content update function
   */
  function updateContent(data) {
    if (!data) return;
    updateTextContent(data);
    updateImages(data);
    updateBackgroundImages(data);
    buildGallery(data);
  }

  async function init() {
    const page = getCurrentPage();
    if (!page) return;
    const contentData = await loadJSON(page);
    if (page === 'faqs' && contentData) {
      buildFAQAccordion(contentData);
    } else if (contentData) {
      updateContent(contentData);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
