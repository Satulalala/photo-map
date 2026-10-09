# PhotoMap 前端全方位优化方案

> 基于 frontend-design skill 设计方法论，结合项目现状审计制定
> 审计日期：2026-06-07
> 项目规模：约 19,234 行前端代码（JS 9,998 + CSS 9,236），56 个 JS 文件，38 个 CSS 文件

---

## 一、现状审计摘要

| 维度 | 评分 | 核心问题 |
|------|------|----------|
| 架构 | D | App.jsx 1054 行单体组件，无 Zustand store 落地，状态散落在 hooks 间通过 props 传递 |
| 视觉设计 | C | 系统默认字体栈，通用蓝色调色板，emoji 替代图标，无暗色模式，无设计系统 |
| 性能 | C+ | 懒加载部分使用，CSS 9,236 行无 tree-shaking，vite 配置较好但仍有优化空间 |
| 代码质量 | C | .jsx 无类型安全，注释编码乱码，多处魔法字符串，CSS 文件过大 |
| 可访问性 | D | 无 aria 属性，emoji 图标无语义，键盘导航不完整，无 focus 管理 |

## 二、分级优化路线

---

### P0 — 架构重构（最高优先级，影响所有后续工作）

#### 2.1 拆分 App.jsx（1054 行 → 各模块 ≤ 200 行）

```
现状：App.jsx 承载了地图、标记、照片、搜索、同步、认证、设置 7 大领域的全部协调逻辑
目标：App.jsx 变为纯布局编排层（~150 行），业务逻辑下沉到 Zustand store + 自定义 hooks
```

**具体行动：**

1. **建立 Zustand Store 体系**
   - `store/mapStore.js` — 地图状态（measureMode, heatmapMode, mapLoaded 等）
   - `store/markerStore.js` — 标记 CRUD、选中态、右键菜单态
   - `store/photoStore.js` — 照片查看器/编辑器状态、当前照片索引
   - `store/uiStore.js` — 面板显隐、toast、全局 loading
   - `store/authStore.js` — 登录态、用户信息
   - `store/searchStore.js` — 搜索查询、结果、历史

2. **提取页面编排组件**
   - `components/layout/AppShell.jsx` — 顶层布局（地图容器 + 覆盖层）
   - `components/layout/MapOverlay.jsx` — 地图上层所有 UI（toolbar, search, panels）
   - `components/layout/PanelManager.jsx` — 面板路由/显隐管理

3. **App.jsx 瘦身目标结构**
   ```jsx
   function App() {
     return (
       <ErrorBoundary>
         <AuthGate>
           <AppShell />
         </AuthGate>
       </ErrorBoundary>
     );
   }
   ```

#### 2.2 建立设计系统（Design Tokens + 组件规范）

**行动：**
- 创建 `src/design-tokens/` 目录，定义：
  - `colors.css` — 扩展色彩变量（主色/语义色/中性色，含暗色模式变量）
  - `typography.css` — 字体阶梯（引入 Noto Sans SC + 等宽字体）
  - `spacing.css` — 间距阶梯（4px base）
  - `shadows.css` — 阴影层级
  - `radii.css` — 圆角统一规范
- 更新 `base.css` 引用 design tokens
- 建立暗色模式 `[data-theme="dark"]` 变量覆盖

---

### P1 — 视觉设计升级

#### 3.1 设计方向定位

当前项目是"照片+地图"工具应用，属于 **SaaS/工具型产品**。根据 frontend-design skill 的指导：

> SaaS、CRM 及运营工具应呈现沉静、实用、以工作为中心的观感——优先考虑密集但有序的信息、克制的视觉风格、可预测的导航，以及为扫描、对比和重复操作而构建的界面。

**选定方向：精致实用主义（Refined Utilitarian）**

- 色调：暖灰基底 + 琥珀色点缀（替换当前的蓝灰色系）
- 字体：Noto Sans SC（正文）+ Geist Mono（等宽/数据）
- 氛围：安静、专注、有温度的工具体验

#### 3.2 色彩体系重构

```
当前问题：蓝灰色调（#3b82f6 + slate），缺乏个性
目标方案：暖灰基底 + 琥珀色高亮

:root {
  --bg-primary: #faf9f7;       /* 暖白底 */
  --bg-secondary: #ffffff;
  --bg-tertiary: #f3f1ee;      /* 暖灰 */
  --border: #e7e4df;
  --text-primary: #1c1917;     /* 暖黑 */
  --text-secondary: #5c5652;
  --text-muted: #a8a29e;
  --accent: #d97706;           /* 琥珀色 */
  --accent-hover: #b45309;
  --danger: #dc2626;
  --success: #16a34a;
}

[data-theme="dark"] {
  --bg-primary: #1c1917;
  --bg-secondary: #292524;
  --bg-tertiary: #383432;
  --border: #44403c;
  --text-primary: #f5f5f4;
  --text-secondary: #d6d3d1;
  --text-muted: #78716c;
  --accent: #f59e0b;           /* 暗色下更亮的琥珀 */
}
```

#### 3.3 图标系统迁移

```
当前问题：全项目使用 emoji 作为功能图标（🔍🔄🔺🔻🔥📊⚙️ 等），不可控、不一致、无语义

目标：引入 lucide-react，统一替换所有功能性图标
```

**替换对照表（部分）：**

| 当前 emoji | 用途 | lucide 图标 |
|-----------|------|------------|
| 🔍 | 搜索 | `Search` |
| 🔄 | 刷新 | `RefreshCw` |
| 🔺 | 放大 | `ZoomIn` |
| 🔻 | 缩小 | `ZoomOut` |
| 🔥 | 热力图 | `Flame` |
| 📊 | 生活面板 | `ChartBar` |
| ⚙️ | 设置 | `Settings` |
| 📍 | 定位 | `MapPin` |
| ✏️ | 编辑 | `Pencil` |
| 📝 | 备注 | `FileText` |
| ✕ | 关闭 | `X` |
| 💾 | 保存 | `Save` |

#### 3.4 字体系统升级

```css
/* 当前 */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;

/* 方案：引入 Noto Sans SC（Google Fonts 子集） */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600&display=swap');

body {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* 等宽/数据场景 */
.font-mono {
  font-family: 'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace;
}
```

#### 3.5 圆角与间距规范化

```
当前问题：圆角值散布在 6px - 27px 之间，无明确层级
统一规范：
  --radius-sm: 4px    （标签、徽章、小按钮）
  --radius-md: 8px    （卡片、面板、输入框）
  --radius-lg: 12px   （模态框、大卡片）
  --radius-full: 9999px（药丸按钮、头像）

间距阶梯（4px base）：
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px;
```

---

### P2 — 性能优化

#### 4.1 CSS 治理

**当前问题：38 个 CSS 文件，9,236 行，无摇树，大量未使用样式**

行动：
1. **合并超大 CSS 文件**：life-panel 系列 6 个文件（39,000+ 字符）合并为 2-3 个
2. **使用 PostCSS + cssnano** 压缩生产构建
3. **关键 CSS 内联**：首屏必需样式（~2KB）通过 `vite-plugin-critical` 内联到 HTML
4. **按路由拆分 CSS**：使用 CSS Modules 或将样式与 lazy 组件绑定

#### 4.2 代码分割增强

```js
// 当前 vite.config.js manualChunks 仅拆了 react-vendor、utils-vendor、virtual-scroll
// 增强方案：

manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'map-vendor': ['mapbox-gl'],              // 新增：地图库独立
  'ui-vendor': ['lucide-react', 'gsap'],    // 新增：UI 库独立
  'data-vendor': ['zustand', 'uuid', 'supercluster'], // 扩展现有
},
```

#### 4.3 图片加载优化

1. **LazyPhoto 组件增强**：添加 BlurHash 占位符、渐进式加载
2. **缩略图策略**：列表使用 200px 缩略图，详情使用原图
3. **WebP 转码**：构建时通过 vite-plugin-imagemin 转换
4. **Intersection Observer** 驱动的视口内懒加载

#### 4.4 渲染性能

1. PhotoViewer 的 `will-change: transform` 改为动画期间动态设置（当前始终激活会占用 GPU 内存）
2. MarkerListPanel 使用 `react-window` 虚拟列表（已引入但需确认是否正确使用）
3. 大量 markers 时启用 Supercluster 聚合（已引入，需验证实际启用情况）

---

### P3 — 工程化提升

#### 5.1 TypeScript 迁移路线

```
阶段 1（低风险）：types/ 目录类型定义
阶段 2：utils/、api/ 工具模块迁移
阶段 3：新组件强制 .tsx，存量组件渐进迁移
阶段 4：hooks/ 迁移
```

#### 5.2 编码规范修复

- 修复所有 `.jsx` 文件中的注释编码乱码（当前 GBK/UTF-8 混用）
- 统一文件编码为 UTF-8
- 启用 ESLint `jsx-a11y` 规则（当前已安装但需确认配置）

#### 5.3 组件文档化

- 使用 Storybook（已配置 `storybook:dev`）为核心组件编写故事
- 优先覆盖：Toolbar、SearchBar、PhotoViewer、MarkerListPanel、LoginButtons

---

### P4 — 可访问性（a11y）

1. 所有图标按钮添加 `aria-label`
2. 模态框添加 `role="dialog"` + `aria-modal` + focus trap
3. 搜索输入框关联 `aria-autocomplete`、`aria-activedescendant`
4. Toast 通知使用 `role="alert"` + `aria-live`
5. 键盘导航：Tab 顺序、Escape 关闭面板、方向键在搜索结果中移动

---

### P5 — 暗色模式

基于 P1 已建立的 CSS 变量体系，实现暗色模式切换：

1. `SettingsPanel` 添加主题切换开关
2. 状态持久化到 localStorage（已通过 useSettings hook）
3. 系统主题跟随 `prefers-color-scheme` 媒体查询
4. Mapbox 地图样式随主题切换（`streets-v12` / `dark-v11`）

---

## 三、实施建议

### 阶段规划

| 阶段 | 内容 | 预估工期 | 风险 |
|------|------|---------|------|
| 第一阶段 | P0 架构重构 + Zustand Store | 3-5 天 | 高（影响全局） |
| 第二阶段 | P1 视觉升级（色彩/字体/图标） | 2-3 天 | 中（CSS 覆盖广） |
| 第三阶段 | P2 性能优化 + P3 工程化 | 2-3 天 | 低 |
| 第四阶段 | P4 可访问性 + P5 暗色模式 | 2 天 | 低 |

### 风险控制

- 每个阶段在独立分支进行
- 第一阶段完成后立即运行 E2E 测试验证
- 视觉升级使用 CSS 变量切换，保留回退能力
- 每完成一个 P 级别进行一次代码审查

---

## 四、对照 Frontend-Design Skill 检查清单

| 设计要求 | 当前状态 | 目标 |
|---------|---------|------|
| 有态度的美学方向 | 通用蓝灰 | 暖灰 + 琥珀色精致实用主义 |
| 独特的字体选择 | 系统默认字体栈 | Noto Sans SC + Geist Mono |
| 凝聚的配色方案 | 蓝灰调单色调 | 暖灰底 + 琥珀高亮，含暗色变体 |
| 有意义的动效 | 基础 fade/scale | 页面加载 staggered reveal + 微交互 |
| 非常规空间构图 | 标准居中布局 | 非对称面板、地图全出血、对角流动 |
| 氛围与纹理 | 纯色无纹理 | 地图雾气、细微噪点叠加、深度感 |
