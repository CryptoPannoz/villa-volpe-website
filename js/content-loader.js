/**
 * Villa Volpe Content Management System Loader
 * Dynamically loads and updates page content from JSON files
 * Supports text content (data-cms), images (data-cms-img), and background images (data-cms-bg)
 */

(function() {
  'use strict';

  function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path === '/index.html') return 'index';
    if (path.includes('faqs.html')) return 'faqs';
    if (path.includes('discover.html')) return 'discover';
    if (path.includes('story.html')) return 'story';
    if (path.includes('book.html')) return 'book';
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
   * Main content update function
   */
  function updateContent(data) {
    if (!data) return;
    updateTextContent(data);
    updateImages(data);
    updateBackgroundImages(data);
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
