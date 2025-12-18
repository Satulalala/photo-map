# 部署指南

本项目支持双版本部署：Web 版本和桌面版本。

## 🌐 Web 版本部署

### 方案一：Netlify（推荐）

1. **准备工作**
   ```bash
   # 构建 Web 版本
   npm run web:build
   ```

2. **手动部署**
   - 登录 [Netlify](https://netlify.com)
   - 拖拽 `dist-web` 文件夹到部署区域
   - 设置自定义域名（可选）

3. **自动部署**
   - 连接 GitHub 仓库
   - 设置构建命令：`npm run web:build`
   - 设置发布目录：`dist-web`
   - 配置环境变量（如果需要）

### 方案二：Vercel

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **部署**
   ```bash
   # 登录
   vercel login
   
   # 部署
   vercel --prod
   ```

### 方案三：GitHub Pages

1. **配置 GitHub Actions**
   - 已包含在 `.github/workflows/build.yml` 中
   - 推送到 main 分支自动部署

2. **手动部署**
   ```bash
   # 构建
   npm run web:build
   
   # 部署到 gh-pages 分支
   npx gh-pages -d dist-web
   ```

## 💻 桌面版本发布

### 自动构建（GitHub Actions）

1. **设置 Secrets**
   在 GitHub 仓库设置中添加：
   - `NETLIFY_AUTH_TOKEN`（如果使用 Netlify）
   - `NETLIFY_SITE_ID`（如果使用 Netlify）

2. **触发构建**
   ```bash
   # 推送代码触发构建
   git add .
   git commit -m "release: v1.0.0"
   git push
   ```

3. **下载构建产物**
   - 在 GitHub Actions 页面下载 artifacts
   - 或等待自动创建 Release

### 手动构建

1. **Windows 版本**
   ```bash
   # 在 Windows 系统上
   npm run build
   npm run electron-build
   ```

2. **macOS 版本**
   ```bash
   # 在 macOS 系统上
   npm run build
   npm run electron-build
   ```

3. **Linux 版本**
   ```bash
   # 在 Linux 系统上
   npm run build
   npm run electron-build
   ```

## 🔧 配置说明

### 环境变量

创建 `.env` 文件：

```env
# Mapbox API Token（必需）
VITE_MAPBOX_TOKEN=your_mapbox_token_here

# 应用配置
VITE_APP_NAME=地图相册
VITE_APP_VERSION=1.0.0

# Web 版本特定配置
VITE_WEB_MODE=true
VITE_API_BASE_URL=https://your-api.com

# 分析工具（可选）
VITE_GA_ID=your_google_analytics_id
```

### Mapbox 配置

1. **获取 Token**
   - 注册 [Mapbox](https://mapbox.com) 账号
   - 创建 Access Token
   - 设置域名限制（生产环境）

2. **配置域名**
   ```javascript
   // 在 Mapbox 控制台添加允许的域名
   https://your-domain.com
   https://your-netlify-app.netlify.app
   ```

## 📦 文件结构

```
photo-map/
├── dist-web/              # Web 版本构建输出
├── dist/                  # Electron 版本构建输出
├── src/                   # 共享源代码
├── src-web/              # Web 版本特定代码
├── public/               # 静态资源
├── downloads/            # 桌面版安装包（部署时创建）
└── .github/workflows/    # CI/CD 配置
```

## 🚀 部署检查清单

### Web 版本上线前

- [ ] 更新 Mapbox Token
- [ ] 配置 CSP 安全策略
- [ ] 测试所有主要功能
- [ ] 检查移动端适配
- [ ] 设置错误监控
- [ ] 配置 CDN（可选）

### 桌面版发布前

- [ ] 在三个平台测试
- [ ] 更新版本号
- [ ] 准备 Release Notes
- [ ] 签名应用（macOS/Windows）
- [ ] 测试自动更新
- [ ] 准备用户文档

## 🔄 更新流程

### Web 版本更新

1. 修改代码
2. 推送到 main 分支
3. 自动部署到生产环境
4. 用户刷新页面即可获得更新

### 桌面版更新

1. 更新版本号（package.json）
2. 推送代码并创建 Release
3. 用户下载新版本安装包
4. 或通过应用内更新（如果配置了）

## 🐛 常见问题

### Web 版本

**Q: 地图不显示**
A: 检查 Mapbox Token 是否正确配置

**Q: 照片上传失败**
A: 检查浏览器是否支持 File API

**Q: 数据丢失**
A: Web 版本数据存储在浏览器本地，清除浏览器数据会丢失

### 桌面版

**Q: 应用无法启动**
A: 检查系统是否满足最低要求

**Q: 照片处理慢**
A: 确保有足够的内存和存储空间

**Q: 数据库错误**
A: 检查应用是否有写入权限

## 📞 技术支持

- GitHub Issues: [项目地址/issues](https://github.com/你的用户名/photo-map/issues)
- 邮箱: your-email@example.com
- 文档: [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md)