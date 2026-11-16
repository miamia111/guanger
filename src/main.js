import './styles/tokens.css';
import './styles/app.css';
import { exhibition, articles, students, chapters, works, copy } from './data/exhibition.js';
import { header, guidePanel, bindChrome, rule } from './components/chrome.js';
import { icons } from './components/icons.js';
import { mountPaintReveal } from './components/paintReveal.js';

const app = document.querySelector('#app');
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
const pageCopy = (section, key, fallback) => copy[section]?.[key] ?? fallback;
let disposePage = () => {};

async function importWithRetry(loader, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await loader();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
    }
  }
  throw lastError;
}

function catalogueRows() {
  const articleRows = articles.map((article) => `<a class="chapter-row chapter-row--article" href="#/article/${article.id}">
    <span class="chapter-row__number">${article.number}</span>
    <span class="chapter-row__copy"><strong>${article.title}</strong><small class="chapter-row__artist">${article.label}</small><small class="chapter-row__description">${article.summary}</small></span>
    <span class="chapter-row__article-mark"><small>ARTICLE</small><b>阅读文章</b></span>
    <span class="round-arrow">${icons.arrow}</span>
  </a>`).join('');
  const workRows = chapters.map((chapter) => `<a class="chapter-row" href="#/chapter/${chapter.id}">
    <span class="chapter-row__number">${chapter.number}</span>
    <span class="chapter-row__copy"><strong>${chapter.title}</strong><small class="chapter-row__artist">${chapter.artistLabel}</small><small class="chapter-row__description">${chapter.description.replace('\n', '<br>')}</small></span>
    <span class="chapter-row__image" data-image-frame><img src="${assetUrl(chapter.image)}" alt="" loading="lazy" decoding="async" /><span class="image-loader" aria-hidden="true"><i></i><b>载入中</b></span></span>
    <span class="round-arrow">${icons.arrow}</span>
  </a>`).join('');
  return articleRows + workRows;
}

function homeView() {
  return `<main class="page page--home is-home-loading">
    <div class="home-loading-screen" role="status" aria-live="polite">
      <span class="home-loading-mark" aria-hidden="true"><i></i></span>
      <p>正在进入展览</p>
    </div>
    <section class="home-art" aria-label="${pageCopy('home', 'heroAria', '展览主视觉')}"><div class="cropped-temple" data-image-frame data-home-depth-root><picture>
      <source media="(max-width: 600px)" srcset="${assetUrl('/artworks/home-swans-720.webp')}" />
      <img src="${assetUrl('/artworks/home-swans-1080.webp')}" width="1080" height="867" alt="${pageCopy('home', 'heroAlt', '湖畔天鹅与桥梁油画')}" loading="eager" fetchpriority="high" decoding="async" />
    </picture><span class="image-loader image-loader--hero" aria-hidden="true"><i></i><b>作品载入中</b></span><canvas class="home-depth-canvas" data-home-depth aria-hidden="true"></canvas></div></section>
    <section class="home-copy">
      <h1 aria-label="${exhibition.title}"><span class="home-title-line home-title-line--first">${exhibition.title.slice(0, 2)}</span><span class="home-title-line home-title-line--second">${exhibition.title.slice(2)}</span></h1>
      <div class="home-subtitle"><i aria-hidden="true"></i><p>${exhibition.subtitle}</p></div>
      <a class="enter-button" href="#/guide">${pageCopy('home', 'enterButton', '进入展览')} <span>◇</span></a>
    </section>
    <div class="home-flora" aria-hidden="true"></div>
  </main>`;
}

function guideView() {
  return `<main class="page page--guide">
    ${header({ title: pageCopy('guide', 'headerTitle', '首页') })}
    ${guidePanel('catalog')}
    <section class="guide-intro">
      <h1>${pageCopy('guide', 'pageTitle', '展览导览')} <span aria-hidden="true">✦</span></h1>
      <h2 class="section-title">${icons.diamond} ${pageCopy('guide', 'aboutHeading', '关于展览')}</h2>
      <p class="guide-subtitle">${exhibition.subtitle}</p>
      <p class="guide-about">${exhibition.about}</p>
      <div class="guide-flora" aria-hidden="true"></div>
      <div class="studio-photo-frame" data-image-frame><picture><source media="(max-width: 600px)" srcset="${assetUrl('/artworks/studio-thumb.webp')}" /><img class="studio-photo" src="${assetUrl('/artworks/studio-large.webp')}" width="1800" height="1350" alt="${pageCopy('guide', 'studioAlt', '画室作品墙')}" loading="lazy" decoding="async" /></picture><span class="image-loader" aria-hidden="true"><i></i><b>作品载入中</b></span></div>
    </section>
    <section class="guide-catalogue">
      <h2 class="section-title">${icons.diamond} ${pageCopy('guide', 'catalogHeading', '作品目录')}</h2>
      <div class="chapter-list">${catalogueRows()}</div>
      ${rule()}
    </section>
  </main>`;
}

function workCard(work) {
  return `<a href="#/work/${work.id}" class="work-card"><div class="work-card__image" data-image-frame><img src="${assetUrl(work.thumbnail || work.image)}" alt="${work.title}" loading="lazy" decoding="async" /><span class="image-loader" aria-hidden="true"><i></i><b>作品载入中</b></span><span class="work-card__action">${pageCopy('chapter', 'workCardAction', '点击观看作品')} ${icons.arrow}</span></div><div><h2>${work.title}</h2><p>${work.artist}</p></div></a>`;
}

function studentGroups(chapterWorks) {
  const names = [...new Set([...students.map((student) => student.name), ...chapterWorks.map((work) => work.artist)])];
  return `<div class="student-groups">${names.map((name) => {
    const student = students.find((item) => item.name === name) || { name, role: '参展学生', intro: '学生简介待补充。' };
    const studentWorks = chapterWorks.filter((work) => work.artist === name);
    const cover = studentWorks.length ? studentWorks[0].thumbnail || studentWorks[0].image : '';
    return `<details class="student-group">
      <summary class="student-group__banner">
        ${cover ? `<span class="student-group__cover" data-image-frame><img src="${assetUrl(cover)}" alt="" loading="lazy" decoding="async" /><span class="image-loader" aria-hidden="true"><i></i><b>载入中</b></span></span>` : `<span class="student-group__cover student-group__cover--empty" aria-hidden="true"><b>${name.slice(0, 1)}</b></span>`}
        <span class="student-group__identity"><small>${student.role}</small><strong>${student.name}</strong><em>${studentWorks.length} 件作品</em></span>
        <span class="student-group__action"><b>展开简介与作品</b>${icons.chevron}</span>
      </summary>
      <div class="student-group__panel">
        <section class="student-profile"><small>学生简介</small><h2>${student.name}</h2><p>${student.intro}</p></section>
        ${studentWorks.length ? `<div class="work-grid">${studentWorks.map(workCard).join('')}</div>` : `<p class="student-group__empty">作品资料整理中</p>`}
      </div>
    </details>`;
  }).join('')}</div>`;
}

function chapterView(chapter) {
  const chapterWorks = works.filter((work) => work.chapter === chapter.id);
  const chapterContent = chapter.id === 'voices'
    ? studentGroups(chapterWorks)
    : `<div class="work-grid">${chapterWorks.map(workCard).join('') || `<p class="empty">${pageCopy('chapter', 'emptyText', '作品资料整理中')}</p>`}</div>`;
  return `<main class="page page--chapter">
    ${header({ title: chapter.title, back: '#/guide', detail: true })}
    ${guidePanel(chapter.id)}
    <section class="chapter-heading"><span>${chapter.number} / ${pageCopy('chapter', 'chapterLabel', 'CHAPTER')}</span><h1>${chapter.title}</h1><p>${chapter.short}</p><div class="chapter-intro">${chapter.intro}</div></section>
    <section class="work-section"><div class="work-section__label"><span>${pageCopy('chapter', 'worksHeading', '本章作品')}</span></div>
    ${chapterContent}</section>
  </main>`;
}

function articleView(article) {
  const renderParagraph = (paragraph) => {
    if (/^[一二三四五六七八九十]+、/.test(paragraph)) return `<h2>${paragraph}</h2>`;
    if (/^（[一二三四五六七八九十]+）/.test(paragraph)) return `<h3>${paragraph}</h3>`;
    if (paragraph.startsWith('• ')) return `<p class="article-list-item">${paragraph.slice(2)}</p>`;
    if (paragraph.startsWith('“') && paragraph.endsWith('”')) return `<blockquote>${paragraph}</blockquote>`;
    return `<p>${paragraph}</p>`;
  };
  return `<main class="page page--article">
    ${header({ title: article.title, back: '#/guide', detail: true })}
    ${guidePanel(article.id)}
    <article class="article-page">
      <header><span>${article.number} / ARTICLE</span><h1>${article.title}</h1><p class="article-label">${article.label}</p><p>${article.summary}</p><div class="article-byline">${article.byline || ''}${article.date ? `<time>${article.date}</time>` : ''}</div></header>
      <div class="article-paper">
        ${article.content.map(renderParagraph).join('')}
        ${article.signatureImage ? `<figure class="article-signature"><img src="${assetUrl(article.signatureImage)}" alt="${article.signatureAlt || ''}" loading="lazy" decoding="async" /></figure>` : ''}
      </div>
      ${rule()}
    </article>
  </main>`;
}

function detailView(work) {
  const chapter = chapters.find((item) => item.id === work.chapter);
  const index = works.indexOf(work);
  const previous = works[(index - 1 + works.length) % works.length];
  const next = works[(index + 1) % works.length];
  return `<main class="page page--detail">
    ${header({ title: pageCopy('detail', 'headerTitle', '作品详情'), detail: true, back: `#/chapter/${work.chapter}` })}
    ${guidePanel(work.chapter)}
    <div class="detail-art" data-image-frame><img src="${assetUrl(work.image)}" alt="${work.title}" fetchpriority="high" decoding="async" /><span class="image-loader" aria-hidden="true"><i></i><b>作品载入中</b></span><canvas class="detail-paint-reveal" data-detail-paint data-artwork="${assetUrl(work.image)}" aria-hidden="true"></canvas></div>
    <article class="detail-copy">
      <p class="detail-chapter">${chapter.title}</p>
      <h1>${work.title}</h1>
      <h2>${work.artist}</h2>
      <div class="detail-info-card">
        <dl class="metadata"><div><dt>${pageCopy('detail', 'yearLabel', '创作年份')}</dt><dd>${work.year}</dd></div><div><dt>${pageCopy('detail', 'sizeLabel', '尺寸')}</dt><dd>${work.size}</dd></div><div><dt>${pageCopy('detail', 'mediumLabel', '材料')}</dt><dd>${work.medium}</dd></div></dl>
        <section class="work-description"><h3>${pageCopy('detail', 'descriptionHeading', '作品简介')}</h3><p>${work.description}</p></section>
      </div>
      <nav class="work-pagination"><a href="#/work/${previous.id}">‹　${pageCopy('detail', 'previousLabel', '上一件')}</a><i></i><a href="#/work/${next.id}">${pageCopy('detail', 'nextLabel', '下一件')}　›</a></nav>
    </article>
  </main>`;
}

function render() {
  disposePage();
  disposePage = () => {};
  const route = location.hash.slice(2).split('/').filter(Boolean);
  if (route[0] === 'guide') app.innerHTML = guideView();
  else if (route[0] === 'article') app.innerHTML = articleView(articles.find((item) => item.id === route[1]) || articles[0]);
  else if (route[0] === 'chapter') app.innerHTML = chapterView(chapters.find((item) => item.id === route[1]) || chapters[0]);
  else if (route[0] === 'work') app.innerHTML = detailView(works.find((item) => item.id === route[1]) || works[0]);
  else app.innerHTML = homeView();
  bindChrome(app);
  const studentGroups = [...app.querySelectorAll('.student-group')];
  studentGroups.forEach((group) => group.addEventListener('toggle', () => {
    if (!group.open) return;
    studentGroups.forEach((other) => { if (other !== group) other.open = false; });
  }));
  app.querySelectorAll('[data-image-frame]').forEach((frame) => {
    const image = frame.querySelector('img');
    if (!image) return;
    const finish = () => frame.classList.add('is-image-ready');
    const fail = () => {
      frame.classList.add('is-image-error');
      const label = frame.querySelector('.image-loader b');
      if (label) label.textContent = '图片暂未载入';
    };
    if (image.complete && image.naturalWidth) finish();
    else {
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', fail, { once: true });
    }
  });
  const homeDepthRoot = app.querySelector('[data-home-depth-root]');
  if (homeDepthRoot) {
    let cancelled = false;
    let disposeDepth = () => {};
    disposePage = () => { cancelled = true; disposeDepth(); };
    importWithRetry(() => import('./components/depthTransition.js')).then(({ mountHomeDepthExperience }) => {
      if (cancelled) return;
      disposeDepth = mountHomeDepthExperience(homeDepthRoot, {
        artwork: assetUrl('/artworks/home-swans-1080.webp'),
        depthMap: assetUrl('/prototype/swans-depth-1080.webp'),
        backdrop: assetUrl('/prototype/gray-blue-impasto-1080.webp'),
        guideAssets: [
          assetUrl('/decor/guide-impasto-background-v1.webp'),
          assetUrl(matchMedia('(max-width: 600px)').matches ? '/artworks/studio-thumb.webp' : '/artworks/studio-large.webp'),
          ...chapters.map((chapter) => assetUrl(chapter.image)),
        ],
        dimensions: { width: 1080, height: 867 },
      });
    }).catch(() => {
      const page = homeDepthRoot.closest('.page--home');
      page?.classList.remove('is-home-loading');
      page?.classList.add('is-home-ready');
    });
  }
  const detailCanvas = app.querySelector('[data-detail-paint]');
  if (detailCanvas) {
    disposePage = mountPaintReveal(detailCanvas, {
      artwork: detailCanvas.dataset.artwork,
      impasto: assetUrl('/prototype/brush-impasto.webp'),
      dry: assetUrl('/prototype/brush-dry.webp'),
      impastoRelief: assetUrl('/prototype/brush-impasto-relief.webp'),
      dryRelief: assetUrl('/prototype/brush-dry-relief.webp'),
    }, { fit: 'contain' });
  }
  window.scrollTo(0, 0);
}
addEventListener('hashchange', render);
render();
