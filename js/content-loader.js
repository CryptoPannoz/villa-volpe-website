/**
 * Villa Volpe Content Management System Loader
 * Dynamically loads and updates page content from JSON files
 */

(function() {
  'use strict';

  // Determine current page
  function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path === '/index.html') return 'index';
    if (path.includes('faqs.html')) return 'faqs';
    if (path.includes('discover.html')) return 'discover';
    if (path.includes('story.html')) return 'story';
    if (path.includes('book.html')) return 'book';
    return null;
  }

  // Get base path (works on both root domains and subdirectories like GitHub Pages)
  function getBasePath() {
    const scripts = document.querySelectorAll('script[src*="content-loader"]');
    if (scripts.length > 0) {
      // Derive base from the script's own src path
      const src = scripts[0].getAttribute('src');
      return src.replace(/js\/content-loader\.js.*$/, '');
    }
    return './';
  }

  // Load JSON file
  async function loadJSON(page) {
    try {
      const base = getBasePath();
      const response = await fetch(`${base}content/pages/${page}.json`);
      if (!response.ok) {
        console.warn(`Failed to load content for ${page}: ${response.statusText}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn(`Error loading content for ${page}:`, error);
      return null;
    }
  }

  // Update DOM elements with data-cms attributes
  function updateContent(data, path = '') {
    if (!data) return;

    // Helper to get nested values from object path
    function getValue(obj, pathStr) {
      return pathStr.split('.').reduce((current, prop) => {
        return current && current[prop] !== undefined ? current[prop] : null;
      }, obj);
    }

    // Find all elements with data-cms attribute
    const elements = document.querySelectorAll('[data-cms]');
    elements.forEach(element => {
      const key = element.getAttribute('data-cms');
      const value = getValue(data, key);

      if (value !== null && value !== undefined) {
        // Check if value is HTML (contains tags)
        if (typeof value === 'string' && value.includes('<')) {
          element.innerHTML = value;
        } else if (typeof value === 'string') {
          element.textContent = value;
        } else if (typeof value === 'number') {
          element.textContent = value;
        }
      }
    });
  }

  // Build FAQ accordion from JSON
  function buildFAQAccordion(faqData) {
    if (!faqData || !faqData.categories) return;

    const container = document.querySelector('[data-cms-faq-container]');
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Build each category
    faqData.categories.forEach(category => {
      // Category section wrapper
      const categoryDiv = document.createElement('div');
      categoryDiv.style.marginBottom = 'var(--space-xl)';

      // Category header
      const categoryHeader = document.createElement('div');
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = category.name;
      const divider = document.createElement('div');
      divider.className = 'divider';
      categoryHeader.appendChild(label);
      categoryHeader.appendChild(divider);

      // FAQ list
      const faqList = document.createElement('div');
      faqList.className = 'faq-list';

      // Build FAQ items
      category.faqs.forEach((faq, index) => {
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

        // Toggle functionality
        question.addEventListener('click', function() {
          const isExpanded = this.getAttribute('aria-expanded') === 'true';
          this.setAttribute('aria-expanded', !isExpanded);
          answerWrapper.style.display = isExpanded ? 'none' : 'block';
        });

        itemDiv.appendChild(question);
        itemDiv.appendChild(answerWrapper);
        faqList.appendChild(itemDiv);
      });

      categoryDiv.appendChild(categoryHeader);
      categoryDiv.appendChild(faqList);
      container.appendChild(categoryDiv);
    });
  }

  // Build stats from JSON
  function buildStats(data) {
    if (!data || !data.stats) return;

    const container = document.getElementById('stats');
    if (!container) return;

    // Clear existing stat items
    const existingStats = container.querySelectorAll('.stat');
    existingStats.forEach(stat => {
      const number = stat.querySelector('.stat__number');
      const label = stat.querySelector('.stat__label');
      const dataKey = stat.getAttribute('data-cms-stat');

      // Find matching stat from data
      const matchingStat = data.stats.find(s => s.number === number?.textContent.trim());
      if (matchingStat) {
        number.textContent = matchingStat.number;
        label.textContent = matchingStat.label;
      }
    });
  }

  // Initialize content loader
  async function init() {
    const page = getCurrentPage();
    if (!page) return;

    const contentData = await loadJSON(page);

    if (page === 'faqs' && contentData) {
      // For FAQs, dynamically build the accordion
      buildFAQAccordion(contentData);
    } else if (page === 'index' && contentData) {
      // Update all content
      updateContent(contentData);
      // Also update stats
      buildStats(contentData);
    } else if (contentData) {
      // For other pages, just update content
      updateContent(contentData);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
