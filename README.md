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

- 双击 `tools/launch_manager.bat` 可打开本地作品管理器，增删改作品或批量导入图片。
- 网站内容存放在 `src/data/exhibition.json`；管理器保存前会自动创建带时间戳的备份。
- 推荐图片名：`作者_作品名_材料_年份_尺寸.jpg`，例如 `陈致远_庙埕午后_布面油画_2026_80x100cm.jpg`。
- 管理器会自动生成 720px 缩略图与 1800px 展示图，并按作者自动归入章节；导入前可校对识别结果。
- 调整展览色彩和字体：修改 `src/styles/tokens.css`。
- 所有作品图使用原始比例；首页与详情页通过独立媒体容器裁切画布外环境。

## 动效预留

当前版本已按要求移除油画笔触和 Three.js 转场代码。后续动效应作为独立模块接入，不改变页面数据、路由和内容组件。展览图片版权归图片提供者及作品作者所有，不随本项目代码授权。
