/**
 * Villa Volpe Content Management System Loader
 * Dynamically loads and updates page content from JSON files
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

  function updateContent(data) {
    if (!data) return;
    function getValue(obj, pathStr) {
      return pathStr.split('.').reduce((current, prop) => {
        return current && current[prop] !== undefined ? current[prop] : null;
      }, obj);
    }
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
