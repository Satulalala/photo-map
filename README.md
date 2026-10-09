# Photo Map

一个把照片、地点和备注放回地图上的项目。

最初做它是因为普通相册更擅长按时间整理照片，但不太适合回答这些问题：
- 这张照片是在哪拍的？
- 同一个地方我去过几次？
- 某段时间里都留下了哪些地点和记录？

所以这个项目把“照片管理”变成了“地点记录”。你可以在地图上创建标记、挂照片、写备注、搜索地点，也可以把数据同步到后端，再基于已有内容做检索、问答和摘要。

## 现在有什么

### 地图与标记
- 在地图上创建地点标记
- 为标记绑定多张照片和备注
- 支持按地点名、备注内容搜索
- 支持热力图查看照片分布
- 支持批量管理和标记列表视图

### 照片管理
- 照片查看器
- 缩略图预览
- 基础编辑能力（如旋转、裁剪）
- 桌面端本地数据存储

### 同步与检索
- Java 后端提供增量同步接口
- 支持 `push / pull` 同步模型
- 支持基于地点、备注、时间范围的内容检索
- 预留了问答与摘要接口，方便继续往更完整的检索链路扩展

## 技术栈

### 前端
- React
- Vite
- Electron
- Mapbox GL JS
- IndexedDB / LocalStorage

### 后端
- Java
- Spring Boot
- RESTful API

### 目前的检索能力
- 基于地点名称、备注文本、时间范围组织上下文
- 支持搜索、问答、摘要三类接口
- 当前实现更偏应用层整合，后续可以继续接向量库或独立检索服务

## 目录结构

```text
photo-map-main/
├─ src/                    # 前端主应用
├─ src-web/                # Web 入口
├─ server-java/            # Java 后端
├─ electron/               # 主进程、预加载、SQLite 和 IPC
├─ scripts/                # 启动 / 环境检查 / 上传脚本
├─ e2e/                    # 浏览器 UI 测试
└─ .nvmrc                  # 本地与 CI 使用的 Node 版本
```

## 本地运行

### 安装依赖

使用 Node **22.23.2**（版本记录在 `.nvmrc`）和 npm 10+。Java 服务需要 JDK 17+、Maven 3.6.3+。
React 保持在 18.3 系列，类型包与运行库同步；构建工具升级到 Vite 8，Electron 升级到 44。

```bash
npm ci
npm run env:check
```

复制 `.env.example` 为 `.env`，配置自己的 `VITE_MAPBOX_TOKEN`。已有 `.env` 无需覆盖。
完整安装会下载 Electron，并在 Electron 运行时检查 SQLite、向量扩展、Sharp 和 ONNX；仅开发 Web 时可以用 `npm ci --ignore-scripts`。
better-sqlite3 13 使用随包提供的 Node-API 二进制，无需为 Electron ABI 强制编译。
如果之后启动桌面端，请运行 `npm rebuild` 恢复安装脚本，再运行 `npm run native:check`。
相关依据：[Vite 8 环境要求](https://vite.dev/blog/announcing-vite8)、[Electron 原生模块说明](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules/)。

### 启动前端

```bash
npm run dev
```

启动 Web 版本：

```bash
npm run web:dev
```

### 启动 Java 后端

```bash
cd server-java
mvn spring-boot:run
```

Windows 也可运行 `powershell -ExecutionPolicy Bypass -File scripts/backend.ps1`。
这个脚本优先使用 `JAVA_HOME` 和 PATH 中的 Maven；未配置 PATH 时尝试检测已有 Windows 安装及 IntelliJ 内置 Maven。
运行 `powershell -ExecutionPolicy Bypass -File scripts/backend.ps1 verify` 验证后端构建。
默认使用 `dev` 配置和 H2 内存数据库。正式环境使用 PostgreSQL，并在服务器环境变量中设置 `SPRING_PROFILES_ACTIVE=prod`、`PHOTOMAP_DB_URL`、`PHOTOMAP_DB_USERNAME`、`PHOTOMAP_DB_PASSWORD`、`PHOTOMAP_JWT_SECRET` 和 `PHOTOMAP_CORS_ALLOWED_ORIGINS`。
生产配置不会启用 H2 控制台，也不会使用仓库中的开发 JWT 密钥；变量示例见 `.env.example`。

默认端口：
- 前端开发环境：`http://localhost:3000` 或 `http://localhost:3001`
- Java 后端：`http://localhost:8080`

### 界面与验证

地图主界面采用简约中性色：白色浮层、浅灰边界、蓝色交互提示。
搜索支持键盘选择和 Esc 关闭，左下角相册入口显示真实照片与地点数量。
设置 → 显示设置 → 界面主题，可选择浅色、深色或跟随系统。

```bash
npm run lint
npm run type-check
npm test
npm run build:all
npx playwright install chromium
npm run test:e2e
```

Windows 已安装 Edge 时，可设置 `$env:PLAYWRIGHT_CHANNEL='msedge'` 后运行 E2E，免下载 Chromium。
E2E 将地图外部接口隔离，验证 UI 操作与 320/375/414/768/1440px 布局；地图底图需使用有效 token 单独验证。

## 上传脚本

仓库根目录提供了一个 Windows 下可直接使用的上传脚本：

```bash
upload-github.bat
```

它会做几件事：
- 让你输入本次更新主题
- 自动暂存、提交并推送到 GitHub
- 如果上传失败，会尽量用中文说明原因

## 目前的一些想法

接下来我更想继续打磨这些部分：
- 把同步服务从内存存储换成真正的持久化存储
- 把现在的检索接口继续接到更完整的向量检索链路上
- 把 Web 端和桌面端的体验再做统一
- 补更多测试和发布流程

## License

MIT
