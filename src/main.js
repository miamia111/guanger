import './styles/tokens.css';
import './styles/app.css';
import { exhibition, chapters, works } from './data/exhibition.js';
import { header, guidePanel, bindChrome, rule } from './components/chrome.js';
import { icons } from './components/icons.js';

const app = document.querySelector('#app');
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

function chapterRows() {
  return chapters.map((chapter) => `<a class="chapter-row" href="#/chapter/${chapter.id}">
    <span class="chapter-row__number">${chapter.number}</span>
    <span class="chapter-row__copy"><strong>${chapter.catalogTitle || chapter.title}</strong><small>${chapter.description.replace('\n', '<br>')}</small></span>
    <img src="${assetUrl(chapter.image)}" alt="" />
    <span class="round-arrow">${icons.arrow}</span>
  </a>`).join('');
}

function homeView() {
  return `<main class="page page--home">
    <section class="home-art" aria-label="展览主视觉"><div class="cropped-temple"><img src="${assetUrl('/artworks/chen-temple.webp')}" alt="陈致远庙埕街景油画" /></div></section>
    <section class="home-copy">
      <h1>${exhibition.title}</h1>
      <p>${exhibition.subtitle}</p>
      <i aria-hidden="true"></i>
      <a class="enter-button" href="#/guide">进入展览 <span>◇</span></a>
    </section>
    <div class="home-flora" aria-hidden="true"></div>
  </main>`;
}

function guideView() {
  return `<main class="page page--guide">
    ${header({ title: '首页' })}
    ${guidePanel('catalog')}
    <section class="guide-intro">
      <h1>展览导览 <span aria-hidden="true">✦</span></h1>
      <h2 class="section-title">${icons.diamond} 关于展览</h2>
      <p class="guide-subtitle">${exhibition.subtitle}</p>
      <p class="guide-about">${exhibition.about}</p>
      <div class="guide-flora" aria-hidden="true"></div>
      <img class="studio-photo" src="${assetUrl('/artworks/studio-wall.png')}" alt="画室作品墙" />
    </section>
    <section class="guide-catalogue">
      <h2 class="section-title">${icons.diamond} 作品目录</h2>
      <div class="chapter-list">${chapterRows()}</div>
      ${rule()}
    </section>
  </main>`;
}

function chapterView(chapter) {
  const chapterWorks = works.filter((work) => work.chapter === chapter.id);
  return `<main class="page page--chapter">
    ${header({ title: chapter.title, back: '#/guide', detail: true })}
    ${guidePanel(chapter.id)}
    <section class="chapter-heading"><span>${chapter.number} / CHAPTER</span><h1>${chapter.title}</h1><p>${chapter.short}</p><div class="chapter-intro">${chapter.intro}</div></section>
    <section class="work-section"><div class="work-section__label"><span>本章作品</span><small>点击作品图片或按钮进入详情</small></div>
    <div class="work-grid">${chapterWorks.map((work) => `<a href="#/work/${work.id}" class="work-card"><div class="work-card__image"><img src="${assetUrl(work.image)}" alt="${work.title}" /><span>点击观看作品 ${icons.arrow}</span></div><div><h2>${work.title}</h2><p>${work.artist}</p></div></a>`).join('') || '<p class="empty">作品资料整理中</p>'}</div></section>
  </main>`;
}

function detailView(work) {
  const chapter = chapters.find((item) => item.id === work.chapter);
  const index = works.indexOf(work);
  const previous = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];
  return `<main class="page page--detail">
    ${header({ title: '作品详情', detail: true, back: `#/chapter/${work.chapter}` })}
    ${guidePanel(work.chapter)}
    <div class="detail-art"><img src="${assetUrl(work.image)}" alt="${work.title}" /></div>
    <article class="detail-copy">
      <p class="detail-chapter">${chapter.title}</p>
      <h1>${work.title}</h1>
      <h2>${work.artist}</h2>
      <dl class="metadata"><div><dt>创作年份</dt><dd>${work.year}</dd></div><div><dt>尺寸</dt><dd>${work.size}</dd></div><div><dt>材料</dt><dd>${work.medium}</dd></div></dl>
      <section class="work-description"><h3>作品简介</h3><p>${work.description}</p></section>
      <nav class="work-pagination"><a href="#/work/${previous.id}">‹　上一件</a><i></i><a href="#/work/${next.id}">下一件　›</a></nav>
    </article>
  </main>`;
}

function render() {
  const route = location.hash.slice(2).split('/').filter(Boolean);
  if (route[0] === 'guide') app.innerHTML = guideView();
  else if (route[0] === 'chapter') app.innerHTML = chapterView(chapters.find((item) => item.id === route[1]) || chapters[0]);
  else if (route[0] === 'work') app.innerHTML = detailView(works.find((item) => item.id === route[1]) || works[0]);
  else app.innerHTML = homeView();
  bindChrome(app);
  window.scrollTo(0, 0);
}
addEventListener('hashchange', render);
render();
