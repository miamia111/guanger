# 光而不耀｜画展电子导览

董日福、陈致远师生油画作品展的可维护网页 MVP。项目采用 Vite 与原生 ES Modules；没有框架运行时，页面内容、视觉组件彼此独立。动态视觉接口将在信息架构稳定后重新接入。

## 开发

需要 Node.js 20.19+ 或 22.12+。

```bash
pnpm install
pnpm run dev
pnpm run build
```

## 项目结构

```text
public/artworks/            展览图片
src/data/exhibition.js      展览、章节与作品数据
src/components/             导航、菜单、图标等可复用界面
src/styles/tokens.css       色彩、字体、尺寸等设计变量
src/styles/app.css          页面与响应式布局
src/main.js                 路由和页面组装
```

## 日常维护

- 增删作品：只修改 `src/data/exhibition.js` 并把图片放入 `public/artworks/`。
- 调整展览色彩和字体：修改 `src/styles/tokens.css`。
- 所有作品图使用原始比例；首页与详情页通过独立媒体容器裁切画布外环境。

## 动效预留

当前版本已按要求移除油画笔触和 Three.js 转场代码。后续动效应作为独立模块接入，不改变页面数据、路由和内容组件。展览图片版权归图片提供者及作品作者所有，不随本项目代码授权。
