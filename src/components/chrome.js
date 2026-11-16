import { articles, chapters, copy } from '../data/exhibition.js';
import { icons } from './icons.js';

const chromeCopy = (key, fallback) => copy.chrome?.[key] ?? fallback;

export function rule() {
  return `<div class="ornament-rule"><span></span>${icons.diamond}<span></span></div>`;
}

export function header({ title = '光而不耀', back = '', detail = false } = {}) {
  if (detail) {
    return `<header class="detail-header">
      <a class="icon-button" href="${back}" aria-label="${chromeCopy('backLabel', '返回')}">${icons.back}</a>
      <strong>${title}</strong>
      <button class="guide-toggle" type="button" data-guide-toggle aria-expanded="false">${chromeCopy('guideToggle', '导览')} ${icons.chevron}</button>
    </header>`;
  }
  return `<header class="site-header">
    <a href="#/" class="wordmark">${title}</a>
    <button class="menu-button" type="button" aria-label="${chromeCopy('menuLabel', '打开目录')}" data-guide-toggle aria-expanded="false">${icons.menu}</button>
    ${rule()}
  </header>`;
}

export function guidePanel(current = '') {
  return `<div class="guide-panel" data-guide-panel aria-hidden="true">
    <nav aria-label="${chromeCopy('guideToggle', '章节导览')}">
      <a href="#/guide" class="guide-panel__row ${current === 'catalog' ? 'is-active' : ''}">
        <i aria-hidden="true"></i><strong>${chromeCopy('catalogTitle', '目录')}</strong><span>${chromeCopy('catalogDescription', '展览简介与作品目录')}</span>
      </a>
      ${articles.map((article) => `<a href="#/article/${article.id}" class="guide-panel__row ${article.id === current ? 'is-active' : ''}">
        <i aria-hidden="true"></i><strong>${article.title}</strong><span>${article.summary}</span>
      </a>`).join('')}
      ${chapters.map((chapter) => `<a href="#/chapter/${chapter.id}" class="guide-panel__row ${chapter.id === current ? 'is-active' : ''}">
        <i aria-hidden="true"></i><strong>${chapter.title}</strong><span>${chapter.short}</span>
      </a>`).join('')}
    </nav>
  </div>`;
}

export function bindChrome(root) {
  const toggle = root.querySelector('[data-guide-toggle]');
  const panel = root.querySelector('[data-guide-panel]');
  if (toggle && panel) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      panel.setAttribute('aria-hidden', String(!open));
      panel.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
    panel.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  }
}
