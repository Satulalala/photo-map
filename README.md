# 地图相册 · PhotoMap

把照片留在地图上，让每一段旅程都有迹可循。

PhotoMap 是一个基于 React、Electron 和 Mapbox 的照片地图项目。你可以在地图上添加地点、上传照片、记录备注，再通过相册、搜索和生活足迹回看自己的记录。项目同时提供桌面版和 Web 版。

## 获取桌面版

在 [GitHub Releases](https://github.com/Satulalala/photo-map/releases/latest) 下载最新版本。Windows x64 提供安装版和免安装版；macOS 提供 Intel 与 Apple 芯片安装包；Linux 提供 AppImage、deb 和 rpm。GitHub Actions 通过仓库 Secret `MAPBOX_TOKEN` 为各平台桌面包注入地图访问令牌；未配置时地图无法加载。macOS 版本目前未签名，首次打开时需在系统安全设置中手动允许。

## 功能

- **地图与地点**：可拖动旋转的地球入口、中文地图标签、地点搜索、定位、缩放、标记与照片热力图。
- **照片与备注**：一个地点关联多张照片，支持预览、旋转、裁剪、备注编辑及批量管理。
- **我的相册**：查看照片与地点数量，通过标记列表跳转到拍摄位置并打开详情。
- **生活足迹**：按国内地区、海外国家整理已有地点记录。
- **图片描述搜索**：桌面版使用 Chinese CLIP 将中文描述与照片匹配，例如“海边的日落”；首次使用需要下载模型并生成照片索引。
- **账号与同步**：邮箱注册、登录与暂不登录入口，后端提供地点和照片备注等元数据的增量同步。
- **界面与交互**：浅色、深色及跟随系统主题，响应式浮层、键盘操作和减少动画支持。

地图默认优先显示中文；未提供中文名称的地点仍可能显示当地语言。进入地图使用设备定位或默认坐标，拖动登录页地球用于浏览，不会改变进入地图的定位目标。

## 桌面版与 Web 版

| 能力 | 桌面版 | Web 版 |
| --- | --- | --- |
| 地图、标记、照片与备注 | 支持 | 支持 |
| 本地存储 | SQLite 与本地照片文件 | 浏览器 IndexedDB |
| 照片旋转、裁剪 | 支持 | 支持 |
| 地名、备注文字搜索 | 支持 | 支持 |
| 图片描述搜索 | Chinese CLIP + sqlite-vec | 暂不支持 |
| 地点元数据同步 | 默认 Cloudflare Worker + D1；也可连接 Java 服务 | Cloudflare Worker + D1 持久化 |

桌面照片和地点仍存放在本机 SQLite 与照片目录；登录后可将地点、照片 ID 与备注同步到 Cloudflare D1。默认服务为 `https://photomap.satula.top`，也可在设置中改为自建 Java API。选择“暂不登录”仍可使用本地相册；进入地图后刷新会保留地图页面，在登录页刷新则仍停留在登录页。

## 技术栈

| 部分 | 当前实现 |
| --- | --- |
| 前端 | React 18、Vite 8、Zustand、CSS |
| 桌面运行时 | Electron 44、IPC |
| 地图 | Mapbox GL JS 3.32.0 |
| 桌面数据与图像处理 | better-sqlite3、sqlite-vec、Sharp |
| 图片描述搜索 | Transformers.js、Chinese CLIP、ONNX Runtime |
| Web 数据 | IndexedDB、LocalStorage |
| 后端 | Web 生产：Cloudflare Workers + D1；桌面/本地：Java 17+、Spring Boot 3.5、JWT、Spring Data JPA |
| 验证工具 | Vitest、Testing Library、Playwright、ESLint、TypeScript |

具体依赖版本以 [package.json](package.json)、[package-lock.json](package-lock.json) 和 [后端 pom.xml](server-java/pom.xml) 为准。

## 本地运行

以下命令均从项目根目录执行，除非另有说明。

### 1. 准备环境

- Node.js：推荐使用 [.nvmrc](.nvmrc) 指定的 **22.23.2**；其他受支持版本见 `package.json` 中的 `engines`。
- npm：10 或以上。
- Java 后端可选：需要 JDK 17+、Maven 3.6.3+。本地地图和相册不要求启动后端，邮箱登录和同步需要后端。

```bash
npm ci
npm run env:check
```

安装过程会下载 Electron，并检查桌面运行时的原生模块。仅开发 Web 时可使用 `npm ci --ignore-scripts`；之后切换到桌面开发，应运行 `npm rebuild` 和 `npm run native:check`。

### 2. 配置地图 Token

复制 [.env.example](.env.example) 为 `.env`，填写自己的 Mapbox 公共访问令牌，已有 `.env` 无需覆盖：

```dotenv
VITE_MAPBOX_TOKEN=你的_Mapbox_公共访问令牌
```

令牌可在 [Mapbox 账号页面](https://account.mapbox.com/access-tokens/) 创建。前端环境变量会进入浏览器代码，因此这里应使用公共令牌。修改后需要重启开发服务器；发布时需要在构建环境中设置该变量。

### 3. 启动应用

桌面版：

```bash
npm run dev
```

Web 版：

```bash
npm run web:dev
```

| 服务 | 默认地址 |
| --- | --- |
| 桌面版 Vite 开发服务 | `http://localhost:3000` |
| Web 版 | `http://localhost:3001` |
| Java 后端 | `http://localhost:8080` |

首次启动桌面版会加载图片搜索模型，下载时间取决于网络。模型未就绪时描述搜索会显示加载提示；首次检索还会补建缺失的照片索引。

### 4. 启动后端（可选）

Windows 推荐使用项目脚本，避免直接执行 `mvn` 时找不到命令：

```powershell
npm run server:dev
npm run server:verify
```

脚本会优先使用 `JAVA_HOME` 和 PATH 中的 Maven，也会尝试查找已有 Windows JDK 与 IntelliJ 内置 Maven。若仍未找到，请安装 JDK / Maven 并配置环境变量。

Linux / macOS 或已配置 Maven 的环境：

```bash
mvn -f server-java/pom.xml spring-boot:run
mvn -f server-java/pom.xml verify
```

开发配置使用 H2 内存数据库。生产配置使用 PostgreSQL，需要在后端进程环境中设置：

```text
SPRING_PROFILES_ACTIVE=prod
PHOTOMAP_DB_URL
PHOTOMAP_DB_USERNAME
PHOTOMAP_DB_PASSWORD
PHOTOMAP_JWT_SECRET
PHOTOMAP_CORS_ALLOWED_ORIGINS
```

取值示例见 `.env.example`。根目录 `.env` 用于前端构建，不会自动注入 Java 后端。生产配置默认校验数据库结构，不会自动创建业务表。

### 部署到 Cloudflare

当前线上站点为 [photomap.satula.top](https://photomap.satula.top)，健康检查为 [`/api/health`](https://photomap.satula.top/api/health)。一个 Cloudflare Worker 同时提供 `dist-web` 静态文件和 `/api/v1` API，D1 持久保存账号与按账号隔离的同步元数据。

Web 版使用同源 HttpOnly Cookie。打包桌面版通过固定的 `photomap://app` 安全源访问 Cloudflare API；Worker 只允许这个桌面源进行带凭据 CORS，并为其设置 24 小时有效的 `HttpOnly; Secure; SameSite=None` 会话 Cookie。桌面端仍将原始照片与 SQLite 数据保留在本机，云端只接收同步元数据。不要把 `JWT_SECRET` 或 Cloudflare API Token 放进前端配置。

1. 使用 Cloudflare CLI 登录，并为自己的部署准备 D1 数据库：

   ```bash
   npx wrangler login
   npx wrangler d1 create photo-map-prod
   ```

   将返回的数据库 ID 与名称填入 `wrangler.jsonc`。本仓库配置指向项目当前线上账户；使用自己的账户时必须替换 D1 ID 和 `routes` 域名。

2. 把 D1 表结构应用到远端数据库：

   ```bash
   npm run cloudflare:migrate
   ```

3. 在 Cloudflare Workers Builds 中连接仓库 `Satulalala/photo-map`，生产分支设为 `master`，并配置公开 Mapbox 访问令牌构建变量 `VITE_MAPBOX_TOKEN`。构建命令使用 `npm ci --ignore-scripts && npm run cloudflare:build`，部署命令使用 `npm run cloudflare:deploy`。如果启用预览部署，应为预览环境单独配置 D1 数据库和域名。

4. 在 Worker 的 **Settings → Variables and Secrets** 设置 `JWT_SECRET`，使用随机生成的至少 32 字节密钥；也可运行 `npx wrangler secret put JWT_SECRET`。不要把该密钥写入 Git、`.env` 或 Wrangler 普通变量。缺少该密钥时 API 会返回 503，不会创建半成品账号。

5. 检查 `https://<域名>/api/health`，确认 `ok` 与 `authReady` 为 `true`，然后将自定义域名路由绑定到 Worker。改动 D1 表结构后先运行 `npm run cloudflare:migrate`，再部署 Worker。

Worker 登录使用 Web Crypto PBKDF2（600,000 次迭代）。Cloudflare Workers Free 每请求 CPU 限额为 10 ms；请在真实部署后检查 CPU 用量，若触发 1102 资源限制，需要启用 Workers Paid 计划。不要为了适配免费 CPU 限额而降低密码哈希强度。[Cloudflare Workers 限额说明](https://developers.cloudflare.com/workers/platform/limits/)

本地联调 Cloudflare Worker 与本地 D1 可运行 `npm run cloudflare:dev`；需要先在被忽略的 `.dev.vars` 中配置本地 `JWT_SECRET`。一般 Web 本地开发仍可运行 `npm run web:dev`，它会把 `/api` 代理到本机 Java 服务。

## 构建与验证

按修改范围选择命令；纯文档修改不需要重新构建应用。

```bash
npm run lint
npm run type-check
npm test
node --test electron/ipc-handlers/ai-handlers.test.cjs
npm run test:e2e
npm run build          # 桌面前端，输出到 build/
npm run web:build      # Web，输出到 dist-web/
npm run dist -- --win --x64 --publish never # Windows x64 安装与免安装包
npm run dist          # 按当前操作系统构建桌面包
```

推送 `v*` 版本标签会触发 `.github/workflows/build-release.yml`，在 Windows、macOS、Linux 构建桌面包并创建 GitHub Release。Windows 文件名以 `-setup.exe`（安装版）和 `-portable.exe`（免安装版）区分。

Playwright 在 Windows 本地会优先使用已安装的 Edge；其他环境可运行 `npx playwright install chromium`，也可通过 `PLAYWRIGHT_CHANNEL` 指定浏览器。UI 测试会隔离地图外部接口，真实底图加载仍需有效 Token 和网络。

## 目录结构

```text
PhotoMap/
├─ electron/              # 桌面主进程、SQLite、IPC 与图片搜索
├─ src/
│  ├─ api/                # 统一接口、浏览器存储与同步
│  ├─ components/         # 地图、相册、生活与设置 UI
│  ├─ hooks/              # 地图、登录、搜索及交互逻辑
│  ├─ store/              # Zustand 状态
│  └─ styles/             # 组件样式与布局
├─ src-web/               # Web 入口与适配
├─ server-java/           # Spring Boot 后端
├─ scripts/               # 启动、环境检查和 UI 截图工具
├─ e2e/                   # Playwright UI 测试
├─ .github/workflows/     # 自动构建与发布配置
├─ AGENTS.md              # 项目协作规则
└─ .env.example           # 环境变量示例
```

## 当前限制

- 图片描述搜索目前仅在桌面版实现，结果受模型与照片内容影响；Web 版仍可搜索地名和备注。
- 同步传输地点、照片 ID 和备注等元数据，尚未上传照片原文件。Cloudflare Web 部署使用 D1 持久保存并按账号隔离；本地 Java 服务的同步记录仍保存在进程内存中，重启会丢失。
- 后端的 `/api/v1/ai/search`、`ask`、`summarize` 使用文本匹配、规则和统计生成结果，尚未接入大语言模型；它们与桌面图片向量搜索是两条独立链路。
- Cloudflare Web 部署将 API 与页面放在同一域名；上线前需要创建 D1、设置 `JWT_SECRET` 和 Mapbox 公共令牌。已有 Java/PostgreSQL 账号不会自动迁移到新的 D1 数据库。
- 地图使用 Mapbox 的数据和网络服务，加载速度与数据时效取决于服务及连接情况。当前使用原生视口缓存与进入地图前预加载，不提供完整离线地图。
- 本地照片、数据库、模型缓存、个人权限配置与测试截图不纳入 Git。Web 数据随浏览器站点数据保存，清除站点数据会影响本地相册。

## License

[MIT](LICENSE)
