# 项目结构说明

```
photo-map/
├── 📁 src/                     # 共享源代码
│   ├── 📁 components/          # React 组件
│   ├── 📁 utils/              # 工具函数
│   ├── 📁 store/              # 状态管理
│   ├── 📁 types/              # TypeScript 类型
│   ├── App.jsx                # 主应用组件
│   ├── main.jsx               # Electron 版本入口
│   └── index.css              # 全局样式
│
├── 📁 src-web/                # Web 版本特定代码
│   ├── DownloadApp.jsx        # 下载桌面版组件
│   ├── WebAdapter.js          # Web API 适配器
│   ├── main-web.jsx           # Web 版本入口
│   └── web-styles.css         # Web 版本样式
│
├── 📁 public/                 # 静态资源
│   └── 📁 cesium/             # Cesium 地图库
│
├── 📁 .github/workflows/      # CI/CD 配置
│   └── build.yml              # 自动构建部署
│
├── 📄 index.html              # Electron 版本 HTML
├── 📄 index-web.html          # Web 版本 HTML
├── 📄 main.cjs                # Electron 主进程
├── 📄 preload.cjs             # Electron 预加载脚本
├── 📄 database.cjs            # 数据库操作
├── 📄 vite.config.js          # 统一构建配置
├── 📄 package.json            # 项目配置
├── 📄 .gitignore              # Git 忽略文件
├── 📄 netlify.toml            # Netlify 部署配置
├── 📄 vercel.json             # Vercel 部署配置
├── 📄 README.md               # 项目说明
├── 📄 TODO.md                 # 开发计划
├── 📄 TECHNICAL_GUIDE.md      # 技术文档
└── 📄 DEPLOYMENT.md           # 部署指南
```

## 构建输出

```
photo-map/
├── 📁 build/                  # Electron 版本构建输出
├── 📁 dist-web/              # Web 版本构建输出
└── 📁 dist/                  # Electron 打包输出
```

## 核心文件说明

### 🔧 配置文件
- `vite.config.js` - 统一的构建配置，支持双版本
- `package.json` - 项目依赖和脚本
- `netlify.toml` / `vercel.json` - 部署配置

### 🚀 入口文件
- `src/main.jsx` - Electron 版本入口
- `src-web/main-web.jsx` - Web 版本入口
- `main.cjs` - Electron 主进程

### 🎨 样式文件
- `src/index.css` - 共享样式
- `src-web/web-styles.css` - Web 版本特定样式

### 📱 适配层
- `src-web/WebAdapter.js` - Web API 适配器
- `src-web/DownloadApp.jsx` - 下载桌面版组件

## 开发命令

```bash
# Electron 版本开发
npm run dev

# Web 版本开发  
npm run web:dev

# 构建 Electron 版本
npm run build

# 构建 Web 版本
npm run web:build

# 同时构建两个版本
npm run build:all
```