# 🗺️ 地图相册 Photo Map

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-AGPL--3.0-green.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Web-lightgrey.svg)
![React](https://img.shields.io/badge/React-18.2-61dafb.svg)
![Electron](https://img.shields.io/badge/Electron-27-47848f.svg)

**一个优雅的照片地图应用，帮助您在地图上标记和管理照片，记录旅行足迹，分享美好回忆。**

[在线体验](https://photo-map.netlify.app) · [下载桌面版](https://github.com/your-repo/photo-map/releases) · [查看文档](./docs)

</div>

---

## ✨ 功能特性

### 🗺️ 交互式地图
- 基于 Mapbox GL JS 的高性能地图引擎
- 支持缩放、拖拽、旋转等手势操作
- 多种地图样式切换（街道、卫星、暗色等）
- 智能地名搜索和定位

### 📍 标记管理
- 点击地图任意位置创建标记
- 自动获取地名和地址信息
- 支持标记分组和标签管理
- 标记入场动画和悬停效果

### 📷 照片管理
- 每个标记支持多张照片
- 支持照片备注和描述
- 全屏照片查看器
- 照片缩略图预览

### ✂️ 照片编辑
- iOS 风格的照片编辑器
- 支持裁剪和旋转功能
- 实时预览编辑效果
- 一键保存修改

### 🔍 智能搜索
- 地名和地址搜索
- 照片备注内容搜索
- 搜索历史记录
- 搜索结果高亮

### 🔥 数据可视化
- 热力图模式显示照片密度
- 标记聚合优化显示
- 统计数据展示

### ⚡ 性能优化
- 虚拟滚动列表
- 图片懒加载
- LRU 缓存策略
- 内存自动清理

---

## 🚀 快速开始

### 在线体验

访问 Web 版本，无需安装：

- **Netlify**: `https://photo-map.netlify.app`
- **Vercel**: `https://photo-map.vercel.app`

### 下载桌面版

| 平台 | 下载链接 | 系统要求 |
|------|----------|----------|
| 🪟 Windows | [photo-map-setup.exe](https://github.com/your-repo/photo-map/releases) | Windows 10+ |
| 🍎 macOS | [photo-map.dmg](https://github.com/your-repo/photo-map/releases) | macOS 10.15+ |
| 🐧 Linux | [photo-map.AppImage](https://github.com/your-repo/photo-map/releases) | Ubuntu 18.04+ |

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/photo-map.git
cd photo-map

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 Mapbox Access Token

# 4. 启动开发服务器
npm run dev          # 桌面版开发
npm run web:dev      # Web 版开发
```

---

## 📖 使用指南

### 基本操作

| 操作 | 方法 |
|------|------|
| 创建标记 | 点击地图任意位置 |
| 添加照片 | 在标记菜单中选择"添加照片" |
| 查看照片 | 点击标记或照片缩略图 |
| 编辑照片 | 在查看器中点击编辑按钮 |
| 搜索 | 使用顶部搜索框 |
| 删除标记 | 在标记菜单中选择"删除" |

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `F` | 聚焦搜索框 |
| `M` | 打开标记列表 |
| `H` | 切换热力图模式 |
| `S` | 打开设置面板 |
| `R` | 测量模式 |
| `Esc` | 关闭当前弹窗 |
| `←` / `→` | 切换照片 |
| `+` / `-` | 缩放照片 |

### Web 版 vs 桌面版

| 功能 | Web 版 | 桌面版 |
|------|:------:|:------:|
| 地图操作 | ✅ | ✅ |
| 照片上传 | ✅ | ✅ |
| 照片编辑 | ✅ | ✅ |
| 离线使用 | ⚠️ PWA | ✅ |
| 数据存储 | IndexedDB | SQLite |
| 存储空间 | 有限 | 无限 |
| 性能 | 良好 | 优秀 |
| 系统集成 | ❌ | ✅ |

---

## 🛠️ 技术架构

### 技术栈

```
前端框架    React 18 + Vite
桌面框架    Electron 27
地图引擎    Mapbox GL JS
数据库      SQLite (better-sqlite3)
图片处理    Sharp
状态管理    Zustand
类型检查    TypeScript
样式方案    CSS + CSS Modules
测试框架    Vitest + Playwright
```

### 项目结构

```
photo-map/
├── src/                      # 源代码
│   ├── components/           # React 组件
│   │   ├── PhotoViewer.jsx   # 照片查看器
│   │   ├── PhotoEditor.jsx   # 照片编辑器
│   │   ├── MinimalLoader.jsx # 加载页面
│   │   └── ErrorBoundary.jsx # 错误边界
│   ├── utils/                # 工具函数
│   │   ├── helpers.js        # 通用工具
│   │   ├── LRUCache.ts       # LRU 缓存
│   │   ├── memoryManager.ts  # 内存管理
│   │   ├── seoManager.js     # SEO 管理
│   │   ├── pwaManager.js     # PWA 管理
│   │   └── webAnalytics.js   # 分析统计
│   ├── constants/            # 常量定义
│   │   └── index.js          # 全局常量
│   ├── styles/               # 样式文件
│   │   ├── variables.css     # CSS 变量
│   │   └── components/       # 组件样式
│   ├── store/                # 状态管理
│   └── types/                # TypeScript 类型
├── src-web/                  # Web 版专用代码
├── public/                   # 静态资源
│   ├── sw.js                 # Service Worker
│   ├── manifest.json         # PWA 配置
│   └── offline.html          # 离线页面
├── config/                   # 配置文件
│   ├── development.json      # 开发环境配置
│   └── production.json       # 生产环境配置
├── docs/                     # 文档
├── scripts/                  # 脚本工具
├── main.cjs                  # Electron 主进程
├── preload.cjs               # 预加载脚本
├── database.cjs              # 数据库操作
├── vite.config.js            # Vite 配置
└── package.json              # 项目配置
```

### 性能指标

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| 冷启动时间 | < 2s | ~1.2s |
| 热启动时间 | < 1s | ~0.8s |
| 内存占用 | < 300MB | ~250MB |
| 标记渲染 | 200+ | 500+ |
| 帧率 | 60fps | 60fps |

---

## 📦 开发命令

### 开发

```bash
npm run dev          # 启动 Electron 开发模式
npm run web:dev      # 启动 Web 开发模式
npm run vite-dev     # 仅启动 Vite 开发服务器
```

### 构建

```bash
npm run build        # 构建前端代码
npm run web:build    # 构建 Web 版本
npm run build:all    # 构建所有版本
npm run dist         # 打包 Electron 应用
```

### 测试

```bash
npm run test         # 运行单元测试
npm run test:watch   # 监听模式测试
npm run test:coverage # 测试覆盖率
npm run test:e2e     # 端到端测试
```

### 代码质量

```bash
npm run lint         # ESLint 检查
npm run lint:fix     # 自动修复
npm run format       # Prettier 格式化
npm run type-check   # TypeScript 类型检查
```

### 其他

```bash
npm run setup        # 运行配置向导
npm run clean        # 清理构建文件
npm run audit        # 安全审计
npm run release      # 发布新版本
```

---

## 📚 文档

| 文档 | 描述 |
|------|------|
| [TECHNICAL_GUIDE.md](./docs/TECHNICAL_GUIDE.md) | 技术实现详解 |
| [API.md](./docs/API.md) | API 接口文档 |
| [DEVELOPMENT.md](./docs/DEVELOPMENT.md) | 开发指南 |
| [DEPLOY_STEP_BY_STEP.md](./docs/DEPLOY_STEP_BY_STEP.md) | 部署教程 |
| [MONITORING_SETUP.md](./docs/MONITORING_SETUP.md) | 监控配置 |
| [WEB_OPTIMIZATION_GUIDE.md](./docs/WEB_OPTIMIZATION_GUIDE.md) | Web 优化指南 |
| [PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md) | 项目结构说明 |

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本项目
2. **创建** 功能分支 (`git checkout -b feature/AmazingFeature`)
3. **提交** 更改 (`git commit -m 'Add some AmazingFeature'`)
4. **推送** 到分支 (`git push origin feature/AmazingFeature`)
5. **打开** Pull Request

### 代码规范

- 使用 ESLint 和 Prettier 保持代码风格一致
- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 提交规范
- 为新功能编写测试用例
- 更新相关文档

### 问题反馈

- 使用 [GitHub Issues](https://github.com/your-repo/photo-map/issues) 报告 Bug
- 使用 [GitHub Discussions](https://github.com/your-repo/photo-map/discussions) 讨论功能建议

---

## 📄 许可证

本项目采用 **AGPL-3.0** 许可证。

| 使用场景 | 是否允许 |
|----------|:--------:|
| 个人使用 | ✅ 免费 |
| 学习研究 | ✅ 免费 |
| 非商业使用 | ✅ 免费 |
| 商业使用 | ⚠️ 需授权 |

如需商业许可证，请联系：[your-email@example.com]

查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

感谢以下开源项目和服务：

- [Mapbox](https://www.mapbox.com/) - 地图服务
- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [React](https://reactjs.org/) - UI 框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Sharp](https://sharp.pixelplumbing.com/) - 图像处理
- [SQLite](https://www.sqlite.org/) - 数据库

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！**

Made with ❤️ by Photo Map Team

</div>