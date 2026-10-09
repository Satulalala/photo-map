# Field Notes — PhotoMap 前端视觉重构实现计划

> **面向 AI 代理的工作者：** 推荐使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 PhotoMap 前端从通用暖灰+琥珀色工具风格重构为"地质田野笔记"美学——非对称布局、纸张材质、编排动效。

**架构：** 以 `tokens.css` 色彩替换为起点，逐层叠加全局材质（噪点/折痕/暗角）→ 布局重组（搜索栏斜贴/抽屉留缝/书签按钮）→ 动效编排（加载序列/stagger）→ 组件升级（按钮/卡片/toggle）→ 空状态。

**技术栈：** React 18 + Vite 6 + Zustand + lucide-react + CSS 变量 + CSS 关键帧动画

**前置条件：** `design-tokens/tokens.css` 已存在，`base.css` 已引用 tokens，`AppShell`/`MapOverlay` 布局组件已创建。暗色模式 `themeManager.js` 和 `[data-theme]` 机制已就绪。

---

### 任务 1：Field Notes 色彩体系替换

**文件：**
- 修改：`src/design-tokens/tokens.css`（完整替换）
- 修改：`src/styles/base.css`（删除旧版 `:root` 兼容变量）
- 修改：`index-web.html`（meta theme-color + body 背景色）

- [ ] **步骤 1：替换 tokens.css 色板**
  用规范中定义的 Field Notes 完整色板替换当前 token 文件。保留 `:root` 和 `[data-theme="dark"]` 结构。关键变量：`--paper-white` / `--ink-primary` / `--darkroom-red` / `--shadow-crease`。

- [ ] **步骤 2：更新 base.css 引用**
  删除 `base.css` 中旧版 `:root` 变量块。确认 `font-family` 使用 `var(--font-sans)`。

- [ ] **步骤 3：更新 HTML 入口**
  `index-web.html` 的 body 背景从 `#faf9f7` 改为 `var(--paper-white, #fefdf7)`，meta theme-color 改为 `#fefdf7`。

- [ ] **步骤 4：验证构建**
  `npm run web:build`，确认 CSS 中所有 `var(--paper-*)` / `var(--ink-*)` / `var(--darkroom-*)` 引用正确解析。

---

### 任务 2：全局噪点纹理 + 暗角

**文件：**
- 修改：`src/styles/base.css`（追加全局层）

- [ ] **步骤 1：添加 SVG 噪点纹理**
  在 `base.css` 末尾添加 `.app::after` 伪元素——全屏固定 `z-index: 9999`，`pointer-events: none`，`opacity: 0.025`（暗色模式 0.04），背景用内联 SVG 噪点 data-URI。

- [ ] **步骤 2：添加暗角效果**
  为 `.photo-viewer` 的背景从纯色改为 `radial-gradient` 暗角（中心 0.85 → 边缘 1.0，暖黑 `#1a1612`）。

- [ ] **步骤 3：验证构建**
  `npm run web:build`，确认 SVG data-URI 没有破坏 CSS 解析。

---

### 任务 3：纸张卡片类 + 折痕

**文件：**
- 新建：`src/styles/components/paper.css`

- [ ] **步骤 1：创建 paper.css**
  定义 `.paper-card` 基础样式：边框 `--paper-border`、多层 `box-shadow`（包括 `--shadow-crease` 折痕）、`::after` 伪元素右下角折痕阴影。

- [ ] **步骤 2：注册导入**
  在 `index.css` 中添加 `@import './styles/components/paper.css';`

- [ ] **步骤 3：验证构建 + 类型检查**
  `npm run web:build && npm run type-check`

---

### 任务 4：自定义滚动条 + 焦点环

**文件：**
- 修改：`src/styles/base.css`（追加）

- [ ] **步骤 1：添加全局滚动条样式**
  `::-webkit-scrollbar` 4px 宽，`--paper-border` 轨道，`--darkroom-red` hover 态。Firefox 用 `scrollbar-width: thin` + `scrollbar-color`。

- [ ] **步骤 2：添加全局焦点环**
  `:focus-visible` 全局样式——`outline: 2px solid var(--darkroom-red)`，`outline-offset: 2px`，`border-radius: 2px`。

- [ ] **步骤 3：验证构建**

---

### 任务 5：搜索栏改为左上斜贴标签

**文件：**
- 修改：`src/styles/components/search.css`
- 修改：`src/components/map/SearchBar.jsx`（如果需要 JS 行为变更）

- [ ] **步骤 1：更新 search.css 定位**
  从居中定位（`left: 50%; transform: translateX(-50%)`）改为左上（`top: 16px; left: 68px`）。添加 `transform: rotate(-1.5deg); transform-origin: top left`。不对称阴影——左侧偏移小，右侧偏移大。

- [ ] **步骤 2：添加 focus 态动画**
  `.search-bar:focus-within` → `transform: rotate(0deg); transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease`。

- [ ] **步骤 3：添加 labelStick 关键帧到 base.css**

- [ ] **步骤 4：验证构建**

---

### 任务 6：标记列表面板改为左侧带缝抽屉

**文件：**
- 修改：`src/styles/components/info-panel.css`（或新建 drawer 样式）
- 可能修改：`src/components/panels/MarkerListPanel.jsx`（className 调整）
- 可能修改：`src/hooks/useMarkerListUI.js`（定位计算调整）

- [ ] **步骤 1：更新面板定位 CSS**
  `position: fixed; left: 12px; top: 0; bottom: 0;`（不是 left: 0）。宽度 380px。`transform: translateX(calc(-100% - 12px))` 用于隐藏状态。打开时 `translateX(0)`。

- [ ] **步骤 2：添加滑动动画**
  滑入：400ms `cubic-bezier(0.22, 0.61, 0.36, 1)`。滑出：280ms `cubic-bezier(0.55, 0.06, 0.68, 0.19)`。遮罩用 `rgba(26,22,18,0.3)`。

- [ ] **步骤 3：添加面板内部横线背景**
  面板顶部 48px 区域用 `repeating-linear-gradient` 模拟活页撕痕。

- [ ] **步骤 4：验证构建**

---

### 任务 7：标记管理按钮改为右下角书签

**文件：**
- 修改：`src/styles/components/marker.css`（或 batch CSS 文件）

- [ ] **步骤 1：更新 CSS 定位**
  `position: fixed; bottom: 0; right: 0;`，默认 `transform: translateY(40%)`（只露出上半），hover `translateY(0)`。

- [ ] **步骤 2：添加 bookmarkRise 关键帧到 base.css**

- [ ] **步骤 3：验证构建**

---

### 任务 8：设置面板改为右侧滑入 + 左边红线

**文件：**
- 修改：`src/styles/components/settings-nav.css` 和 `settings-content.css`

- [ ] **步骤 1：更新定位**
  面板 `position: fixed; right: 0; top: 0; bottom: 0; width: min(640px, 60vw)`。`transform: translateX(100%)` 隐藏，打开 `translateX(0)`。

- [ ] **步骤 2：添加左侧红线**
  面板 `border-left: 2px solid var(--darkroom-red)`。红线 `opacity` 在面板到位后 150ms 过渡到 1（`transition-delay: 150ms`）。

- [ ] **步骤 3：验证构建**

---

### 任务 9：工具栏间距 + 标尺线

**文件：**
- 修改：`src/styles/components/toolbar.css`

- [ ] **步骤 1：调整按钮间距**
  前 3 个按钮 `gap: 8px`，之后 `gap: 16px`（分组）。可以通过 `:nth-child` 或添加 `margin-bottom` 实现。

- [ ] **步骤 2：添加标尺线**
  每个按钮右侧用 `::after` 添加 1px `--ink-faint` 竖线，从按钮顶部延伸到底部。

- [ ] **步骤 3：验证构建**

---

### 任务 10：页面加载编排 + 关键帧

**文件：**
- 修改：`src/styles/base.css`（追加全部关键帧和 animation-delay）

- [ ] **步骤 1：写入全部关键帧**
  `@keyframes labelStick` / `@keyframes toolDrop` / `@keyframes bookmarkRise` / `@keyframes pinPress` / `@keyframes mapFadeIn`。使用规范中提供的精确代码。

- [ ] **步骤 2：编排 animation-delay**
  搜索栏：`animation: labelStick 600ms ease-out 200ms both`
  工具栏按钮：每个 `animation: toolDrop 400ms ease-out`，delay 300ms/360ms/440ms/520ms/580ms/640ms
  书签按钮：`animation: bookmarkRise 500ms ease-out 600ms both`
  地图：`animation: mapFadeIn 1200ms ease-out both`（起始 opacity 0.3）

- [ ] **步骤 3：标记 stagger（如存在 JS 标记渲染）**
  如果标记通过 JS 动态创建 DOM，暂用 CSS 方案：`.mapboxgl-marker { animation: pinPress 300ms both; }`，nth-child(1) delay 0ms, nth-child(2) 40ms…最多 15 个。

- [ ] **步骤 4：验证构建**

---

### 任务 11：启动加载铅笔画圆动画

**文件：**
- 修改：`src/components/MinimalLoader.jsx`（或新建 Loader 组件）

- [ ] **步骤 1：用 SVG 铅笔画圆替换当前加载动画**
  SVG circle，`stroke: var(--darkroom-red)`，`stroke-dasharray: 283; stroke-dashoffset: 283`。动画：`@keyframes drawCircle { to { stroke-dashoffset: 0; } }`，1200ms ease-in-out。画完后短暂显示虚线圆再淡出。

- [ ] **步骤 2：地图淡入衔接**
  圆圈动画完成后，地图 `opacity` 从 0.3 过渡到 1。

- [ ] **步骤 3：验证构建**

---

### 任务 12：按钮体系重建

**文件：**
- 修改：`src/styles/base.css`（追加按钮基础样式）

- [ ] **步骤 1：定义通用按钮类**
  `.btn-primary` / `.btn-secondary` / `.btn-danger`，使用规范中的颜色/边框/hover/active/focus-visible 规则。`border-radius: 4px`，最小 44×44px。

- [ ] **步骤 2：替换现有按钮类**
  在 Toolbar/SearchBar/NotesPanel/NoteEditor/MergeDialog/ErrorBoundary 中，将显式样式替换为 `.btn-*` 类引用（不破坏已有功能）。

- [ ] **步骤 3：验证构建**

---

### 任务 13：照片卡片白边 + 选中红灯条

**文件：**
- 修改：`src/styles/components/marker.css`（或 info-panel.css）

- [ ] **步骤 1：更新照片缩略图样式**
  添加 `border: 3px solid var(--paper-white)` + `box-shadow: var(--shadow-crease)`（模拟相纸白边+折痕）。

- [ ] **步骤 2：更新选中态**
  `.selected` → 边框变为 `--darkroom-red`，左侧添加 `::before` 伪元素 3px 红灯竖条。

- [ ] **步骤 3：添加到 paper.css 的卡片 hover**
  `translateY(-2px)` + 阴影 `sm → md`，`transition: 200ms`。

- [ ] **步骤 4：验证构建**

---

### 任务 14：设置面板 toggle 开关

**文件：**
- 修改：`src/styles/components/settings-content.css`

- [ ] **步骤 1：重写 toggle 样式**
  轨道 28×14px `border-radius: 7px`，圆点 12px。active 轨道变 `--darkroom-red`。圆点 `translateX(14px)` 动画 `250ms ease-in-out`。

- [ ] **步骤 2：应用到 SettingsContent 中的现有 toggle**
  确认 `label.switch` → `input[type=checkbox]` + `span.slider` 结构匹配新样式。

- [ ] **步骤 3：验证构建**

---

### 任务 15：照片查看器底部工具栏延迟

**文件：**
- 修改：`src/styles/components/photo-viewer.css`

- [ ] **步骤 1：添加延迟动画**
  `.pv-toolbar` → `animation: slideUp 300ms ease-out 200ms both`（在照片查看器打开后 200ms 才滑入）。

- [ ] **步骤 2：照片切换改为滑动**
  当前淡入淡出改为 `translateX` 滑动。`.photo-main-wrapper` 进入时从右侧滑入（`translateX(40px) → 0, 300ms ease-out`），退出时向左滑出。

- [ ] **步骤 3：验证构建**

---

### 任务 16：空状态 — 首次进入引导

**文件：**
- 修改：`src/App.jsx`（或条件渲染逻辑）
- 新建 CSS 规则在 `base.css` 或 `paper.css`

- [ ] **步骤 1：创建空状态 JSX 条件**
  在 `mapEntered && markers.length === 0` 条件下渲染引导元素（虚线圆 SVG + MapPin + 脉动文字）。

- [ ] **步骤 2：添加脉动 CSS**
  `@keyframes breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`，`animation: breathe 4s ease-in-out infinite`。

- [ ] **步骤 3：验证构建**

---

### 任务 17：空搜索 + 空列表

**文件：**
- 修改：`src/components/map/SearchBar.jsx`（空搜索 JSX）
- 修改：`src/components/panels/MarkerListPanel.jsx`（空列表 JSX）
- 新建 CSS 规则

- [ ] **步骤 1：更新空搜索 UI**
  当前"未找到"文案改为 Pencil 图标 + "地图上还没有这个地方" + 灰色建议文字。

- [ ] **步骤 2：更新空列表 UI**
  当前空列表文案替换为横线背景 + MapPin + "你的笔记本是空的"。CSS `repeating-linear-gradient` 模拟笔记本横线。

- [ ] **步骤 3：验证构建**

---

### 任务 18：照片占位 crossfade + 同步罗盘

**文件：**
- 修改：`src/components/photos/LazyPhoto.jsx`（或 PhotoViewer.jsx）
- 修改：`src/styles/components/photo-viewer.css`

- [ ] **步骤 1：照片加载占位**
  添加横线纹理背景 + `aspect-ratio`。loaded 后 `opacity` crossfade——占位 1→0、图片 0→1，同步 400ms。

- [ ] **步骤 2：添加同步罗盘**
  在工具栏或刷新按钮旁添加 Compass 图标，条件渲染 `syncingNow` 状态。`animation: spin 2s linear infinite`，颜色 `--darkroom-red`。

- [ ] **步骤 3：验证构建 + npm run type-check**

---

### 任务 19：最终验证

- [ ] **步骤 1：全量构建**
  `npm run web:build`，确认无 error，chunk 分布合理。

- [ ] **步骤 2：类型检查**
  `npm run type-check`，0 错误。

- [ ] **步骤 3：lint 检查**
  `npm run lint`，确认无新增 error。

- [ ] **步骤 4：视觉抽查**
  启动 `npm run web:dev`，验证：噪点纹理可见、搜索栏倾斜贴纸效果、按钮 hover/active 态、暗色模式切换、空状态引导。

---

> **实现完成后：** 运行 `verification-before-completion` 技能确认所有 19 个任务通过。

> **注意事项：**
> - 每个任务修改 CSS 后立即 `npm run web:build` 验证，不等到最后。
> - Phase 3-5 的 JSX 修改仅涉及 className/条件渲染调整，不改变业务逻辑。
> - 暗色模式 (`[data-theme="dark"]`) 变量已在 tokens.css 中定义，CSS 规则需同步编写亮/暗两组。
> - 如果某个 CSS 选择器优先级不足导致旧样式残留，用 `.themed-floating-panel` 等已有类名增加特异性。
