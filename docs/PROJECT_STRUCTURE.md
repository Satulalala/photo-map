# 项目结构说明

## 📁 目录结构

```
photo-map/
├── config/                     # 配置文件目录
│   ├── development.json        # 开发环境配置
│   └── production.json         # 生产环境配置
│
├── docs/                       # 文档目录
│   ├── API.md                  # API 接口文档
│   ├── DEPLOY_CHECKLIST.md     # 部署检查清单
│   ├── DEPLOY_NO_DOMAIN.md     # 无域名部署指南
│   ├── DEPLOY_STEP_BY_STEP.md  # 详细部署步骤
│   ├── DEVELOPMENT.md          # 开发指南
│   ├── NETLIFY_CONFIG.md       # Netlify 配置说明
│   ├── PROJECT_STRUCTURE.md    # 项目结构说明（本文件）
│   └── TECHNICAL_GUIDE.md      # 技术指南
│
├── e2e/                        # 端到端测试
│   └── app.spec.js             # 应用测试用例
│
├── public/                     # 公共静态资源
│   ├── cesium/                 # Cesium 地图库资源
│   └── manifest.json           # PWA 配置文件
│
├── scripts/                    # 构建和工具脚本
│   ├── copy-cesium.js          # 复制 Cesium 资源
│   ├── dev-tools.js            # 开发工具集
│   ├── setup.js                # 项目初始化脚本
│   └── start/                  # 启动脚本目录
│
├── src/                        # 前端源代码
│   ├── assets/                 # 静态资源
│   │   ├── data/               # 数据文件
│   │   │   ├── mock/           # 模拟数据
│   │   │   │   └── photos.json # 示例照片数据
│   │   │   └── config/         # 配置数据
│   │   ├── images/             # 图片资源
│   │   │   ├── icons/          # 图标
│   │   │   ├── logos/          # Logo
│   │   │   └── backgrounds/    # 背景图
│   │   ├── fonts/              # 字体文件
│   │   └── README.md           # 资源使用说明
│   │
│   ├── components/             # React 组件
│   │   ├── common/             # 通用组件
│   │   ├── map/                # 地图相关组件
│   │   ├── photo/              # 照片相关组件
│   │   ├── ui/                 # UI 组件
│   │   ├── MinimalLoader.jsx   # 加载器组件
│   │   ├── PhotoEditor.jsx     # 照片编辑器
│   │   ├── PhotoViewer.jsx     # 照片查看器
│   │   └── MemoryMonitor.jsx   # 内存监控组件
│   │
│   ├── hooks/                  # 自定义 Hooks
│   │   ├── usePhotos.js        # 照片管理 Hook
│   │   ├── useMap.js           # 地图操作 Hook
│   │   └── useMemory.js        # 内存监控 Hook
│   │
│   ├── store/                  # 状态管理
│   │   ├── photoStore.js       # 照片状态
│   │   ├── mapStore.js         # 地图状态
│   │   └── uiStore.js          # UI 状态
│   │
│   ├── styles/                 # 样式文件（模块化）
│   │   ├── base/               # 基础样式
│   │   │   ├── reset.css       # CSS 重置
│   │   │   └── variables.css   # CSS 变量
│   │   ├── components/         # 组件样式
│   │   │   ├── loader.css      # 加载器样式
│   │   │   ├── progress.css    # 进度条样式
│   │   │   └── button.css      # 按钮样式
│   │   ├── layout/             # 布局样式
│   │   │   └── responsive.css  # 响应式布局
│   │   └── main.css            # 主样式文件（导入所有模块）
│   │
│   ├── types/                  # TypeScript 类型定义
│   │   ├── photo.ts            # 照片类型
│   │   ├── map.ts              # 地图类型
│   │   └── index.ts            # 类型导出
│   │
│   ├── utils/                  # 工具函数
│   │   ├── api.js              # API 请求
│   │   ├── imageProcessor.js   # 图像处理
│   │   ├── memoryManager.ts    # 内存管理
│   │   ├── LRUCache.ts         # LRU 缓存
│   │   └── logger.js           # 日志工具
│   │
│   ├── App.jsx                 # 主应用组件
│   ├── main.jsx                # 应用入口
│   ├── index.css               # 全局样式（待迁移）
│   ├── setupTests.js           # 测试配置
│   └── vite-env.d.ts           # Vite 类型定义
│
├── src-web/                    # Web 版本特定代码
│   ├── adapters/               # 适配器
│   │   └── storage.js          # 存储适配器
│   ├── web-styles.css          # Web 版本样式
│   └── index.html              # Web 版本入口
│
├── __mocks__/                  # 测试模拟
│   └── fileMock.js             # 文件模拟
│
├── .github/                    # GitHub 配置
│   └── workflows/              # CI/CD 工作流
│       └── build.yml           # 构建工作流
│
├── .gitignore                  # Git 忽略文件
├── .nvmrc                      # Node 版本配置
├── database.cjs                # 数据库操作
├── index.html                  # Electron 版本入口
├── index-web.html              # Web 版本入口
├── LICENSE                     # 许可证
├── main.cjs                    # Electron 主进程
├── netlify.toml                # Netlify 配置
├── package.json                # 项目配置
├── package-lock.json           # 依赖锁定文件
├── playwright.config.js        # Playwright 配置
├── preload.cjs                 # Electron 预加载脚本
├── README.md                   # 项目说明
├── start.bat                   # Windows 启动脚本
├── TODO.md                     # 待办事项
├── tsconfig.json               # TypeScript 配置
├── vercel.json                 # Vercel 配置
├── vite.config.js              # Vite 配置
└── vitest.config.js            # Vitest 配置
```

## 📋 文件说明

### 配置文件

| 文件 | 说明 |
|------|------|
| `config/development.json` | 开发环境配置：调试模式、本地数据库路径等 |
| `config/production.json` | 生产环境配置：性能优化、日志级别等 |
| `vite.config.js` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 编译配置 |
| `vitest.config.js` | 测试框架配置 |
| `playwright.config.js` | E2E 测试配置 |

### 核心文件

| 文件 | 说明 |
|------|------|
| `main.cjs` | Electron 主进程，负责窗口管理和系统交互 |
| `preload.cjs` | Electron 预加载脚本，提供安全的 IPC 通信 |
| `database.cjs` | SQLite 数据库操作封装 |
| `src/main.jsx` | React 应用入口 |
| `src/App.jsx` | 主应用组件 |

### 样式系统

新的模块化样式系统位于 `src/styles/` 目录：

- **base/**: 基础样式和 CSS 变量
- **components/**: 组件特定样式
- **layout/**: 布局和响应式样式
- **main.css**: 主样式文件，导入所有模块

### 文档系统

| 文档 | 说明 |
|------|------|
| `README.md` | 项目概述和快速开始 |
| `docs/API.md` | API 接口文档 |
| `docs/DEVELOPMENT.md` | 开发指南和规范 |
| `docs/TECHNICAL_GUIDE.md` | 技术实现细节 |
| `docs/DEPLOY_*.md` | 部署相关文档 |
| `docs/PROJECT_STRUCTURE.md` | 项目结构说明（本文件） |

## 🎯 关键目录说明

### src/components/
组件按功能分类：
- **common/**: 通用组件（按钮、输入框等）
- **map/**: 地图相关组件
- **photo/**: 照片管理组件
- **ui/**: UI 组件库

### src/utils/
工具函数库：
- **api.js**: API 请求封装
- **imageProcessor.js**: 图像处理工具
- **memoryManager.ts**: 内存管理
- **LRUCache.ts**: LRU 缓存实现
- **logger.js**: 日志记录

### src/store/
使用 Zustand 进行状态管理：
- **photoStore.js**: 照片数据和操作
- **mapStore.js**: 地图状态
- **uiStore.js**: UI 状态（弹窗、加载等）

### src/assets/
静态资源管理：
- **data/mock/**: 开发环境测试数据
- **images/**: 图片资源
- **fonts/**: 字体文件

## 🔄 迁移计划

### 样式迁移
当前 `src/index.css` 包含所有样式，计划迁移到模块化系统：

1. ✅ 创建模块化样式目录结构
2. ✅ 提取基础样式到 `base/`
3. ✅ 提取组件样式到 `components/`
4. ✅ 提取布局样式到 `layout/`
5. ⏳ 更新组件导入路径
6. ⏳ 删除旧的 `index.css`

### 组件重组
1. ⏳ 按功能分类现有组件
2. ⏳ 创建组件文档
3. ⏳ 统一组件接口

### 文档完善
1. ✅ API 文档
2. ✅ 开发指南
3. ✅ 项目结构说明
4. ⏳ 组件使用文档
5. ⏳ 常见问题文档

## 📝 命名规范

### 文件命名
- **组件**: PascalCase (e.g., `PhotoCard.jsx`)
- **工具函数**: camelCase (e.g., `imageProcessor.js`)
- **样式文件**: kebab-case (e.g., `photo-card.css`)
- **配置文件**: kebab-case (e.g., `vite.config.js`)

### 目录命名
- 使用 kebab-case
- 复数形式表示集合 (e.g., `components/`, `utils/`)
- 单数形式表示单一功能 (e.g., `store/`, `config/`)

## 🚀 快速导航

- 开始开发: 查看 [DEVELOPMENT.md](./DEVELOPMENT.md)
- API 文档: 查看 [API.md](./API.md)
- 部署应用: 查看 [DEPLOY_STEP_BY_STEP.md](./DEPLOY_STEP_BY_STEP.md)
- 技术细节: 查看 [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md)
- 待办事项: 查看 [TODO.md](../TODO.md)