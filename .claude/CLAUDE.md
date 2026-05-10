# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Photo Map 是一个"照片+地点"管理应用，支持桌面端（Electron）和 Web 端双模式。核心功能是在地图上创建标记、绑定照片和备注，并支持同步与检索。

## 开发命令

```bash
# 安装依赖
npm install

# Electron 桌面端开发（端口 3000）
npm run dev

# Web 端开发（端口 3001）
npm run web:dev

# 构建
npm run build          # Electron 构建 → build/
npm run web:build      # Web 构建 → dist-web/
npm run build:all      # 两者都构建

# 代码质量
npm run lint           # ESLint 检查
npm run lint:fix       # ESLint 自动修复
npm run format         # Prettier 格式化
npm run type-check     # TypeScript 类型检查

# 测试
npm run test           # Vitest 单次运行
npm run test:watch     # Vitest 监听模式
npm run test:e2e       # Playwright E2E 测试

# Java 后端
cd server-java && mvn spring-boot:run   # 端口 8080
```

## 架构概览

### 双模式构建

项目通过 `BUILD_TARGET` 环境变量区分 Electron 和 Web 两种构建模式：
- **Electron 模式**（默认）：`main.cjs` 为主进程入口，通过 `preload.cjs` 暴露 `window.electronAPI`，本地 SQLite 存储
- **Web 模式**：`index-web.html` 为入口，`src-web/WebAdapter.js` 适配 Electron API 为 Web 实现，`src-web/main-web.jsx` 启动

Vite 中通过 `__IS_WEB__` / `__IS_ELECTRON__` 编译常量区分运行时逻辑。

### Electron 层

- `main.cjs` — 主进程，窗口管理、IPC 注册、延迟加载模块
- `preload.cjs` — 预加载脚本，暴露 `electronAPI` 到渲染进程
- `database.cjs` — 桌面端 SQLite 本地数据库（better-sqlite3）
- `ipc-handlers/` — IPC 处理器按功能拆分：`database-handlers.cjs`、`photo-handlers.cjs`、`search-handlers.cjs`、`ai-handlers.cjs`、`cache-handlers.cjs`、`system-handlers.cjs`
- `embeddingService.cjs` — 本地向量嵌入服务（ONNX Runtime）

### 前端（src/）

- `App.jsx` — 主组件，包含地图初始化、标记管理、登录状态、面板控制等核心逻辑（文件较大）
- `components/` — UI 组件：`PhotoViewer`、`PhotoEditor`、`SettingsPanel`、`SocialPanel`、`LifePanel`、`LoginButtons` 等
- `api/` — 数据层抽象，统一 Electron IPC 和 Web API 调用（`api/index.js` 为入口）
- `services/syncService.js` — 前端同步服务（push/pull 模型）
- `utils/` — 工具模块：`LRUCache.ts`（缓存）、`memoryManager.ts`（内存管理）、`mapUtils.js`（地图工具）、`searchUtils.js`（搜索）、`pwaManager.js`（PWA）等
- `styles/` — CSS 按组件拆分，基础样式在 `styles/base.css`

### 路径别名（Vite）

- `@` → `src/`
- `@components` → `src/components/`
- `@utils` → `src/utils/`
- `@store` → `src/store/`
- `@types` → `src/types/`

### 后端（server-java/）

Java Spring Boot RESTful API，提供增量同步、搜索、问答和摘要接口。

## 代码规范

- 文件不超过 400 行，超过就拆分
- 嵌套不超过 4 层
- 优先编辑现有文件，不随意新建
- 状态管理使用 Zustand
- React 组件使用函数式组件 + Hooks
- ESLint 规则：2 空格缩进、单引号、分号、PascalCase 组件命名
- Electron 主进程文件使用 `.cjs` 扩展名（CommonJS），前端使用 `.js`/`.jsx`（ESM）
