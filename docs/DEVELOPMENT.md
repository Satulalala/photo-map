# 开发指南

本文档记录项目的开发流程、规范和最佳实践。

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/photo-map.git
cd photo-map

# 安装依赖
npm install

# 设置 Git Hooks
npm run setup:hooks
```

### 启动开发

```bash
# Electron 桌面版
npm run dev

# Web 版本
npm run web:dev

# Storybook 组件文档
npm run storybook
```

---

## 项目结构

```
photo-map/
├── .github/            # GitHub 配置
│   └── workflows/      # CI/CD 工作流
├── .husky/             # Git Hooks
├── .storybook/         # Storybook 配置
├── .vscode/            # VS Code 配置
├── build/              # 构建资源
├── config/             # 环境配置
├── docs/               # 项目文档
├── public/             # 静态资源
├── scripts/            # 脚本工具
├── src/                # 源代码
│   ├── api/            # API 层
│   ├── components/     # React 组件
│   ├── constants/      # 常量定义
│   ├── mocks/          # Mock 数据
│   ├── store/          # 状态管理
│   ├── types/          # TypeScript 类型
│   └── utils/          # 工具函数
├── src-web/            # Web 版本入口
└── __mocks__/          # 测试 Mock
```

---

## 开发规范

### 代码风格

项目使用 ESLint + Prettier 保证代码风格一致：

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型说明：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具

示例：
```bash
git commit -m "feat(map): 添加标记聚合功能"
git commit -m "fix(photo): 修复图片加载失败问题"
git commit -m "docs: 更新 README 安装说明"
```

### 分支管理

- `main`: 主分支，保持稳定
- `develop`: 开发分支
- `feature/*`: 功能分支
- `fix/*`: 修复分支
- `release/*`: 发布分支

---

## 开发工具

### VS Code 推荐配置

项目已配置 `.vscode/` 目录，包含：
- `settings.json`: 编辑器设置
- `extensions.json`: 推荐扩展
- `launch.json`: 调试配置
- `tasks.json`: 任务配置

### 调试方法

1. **Electron 主进程调试**
   - 使用 VS Code 的 "Electron: Main" 配置

2. **渲染进程调试**
   - 使用 Chrome DevTools (Ctrl+Shift+I)
   - 或 VS Code 的 "Chrome" 配置

3. **React 组件调试**
   - 安装 React Developer Tools 扩展
   - 使用 Profiler 分析性能

### Mock 数据

开发环境可使用 Mock 数据：

```javascript
import { mockMarkers, mockApi } from '@mocks';

// 使用预定义数据
const markers = mockMarkers;

// 使用 Mock API
const data = await mockApi.markers.getAll();

// 生成随机数据
import { generateMockMarkers } from '@mocks';
const randomMarkers = generateMockMarkers(10);
```

控制台访问：
```javascript
window.__MOCK__.markers  // 查看标记数据
window.__MOCK__.api      // 使用 Mock API
```

---

## 测试

### 单元测试

```bash
# 运行测试
npm run test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

### E2E 测试

```bash
# 运行 E2E 测试
npm run test:e2e

# UI 模式
npm run test:e2e:ui
```

---

## 构建发布

### 构建命令

```bash
# 构建前端
npm run build

# 构建 Web 版本
npm run web:build

# 打包桌面应用
npm run dist

# 分析包体积
npm run build:analyze
```

### 发布流程

1. 更新版本号
   ```bash
   npm run version:bump
   ```

2. 生成更新日志
   ```bash
   npm run version:generate
   ```

3. 创建发布
   ```bash
   npm run release
   ```

---

## 常见问题

### Q: 原生模块编译失败？

```bash
npm run rebuild
```

### Q: 开发服务器启动慢？

清理缓存后重启：
```bash
npm run clean
npm run dev
```

### Q: ESLint 报错太多？

先自动修复：
```bash
npm run lint:fix
```

---

## 相关文档

- [README.md](../README.md) - 项目介绍
- [CHANGELOG.md](./CHANGELOG.md) - 更新日志
- [CODE_SIGNING.md](./CODE_SIGNING.md) - 代码签名指南
- [DEPLOY_STEP_BY_STEP.md](../DEPLOY_STEP_BY_STEP.md) - 部署指南

---

最后更新: 2024-12-21
