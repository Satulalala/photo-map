# 🚀 项目上线完整指南

## 📋 准备工作检查清单

### 1. 环境准备
- [ ] Node.js 18+ 已安装
- [ ] Git 已安装并配置
- [ ] GitHub 账号已创建
- [ ] Mapbox 账号已创建并获取 Token

### 2. 项目配置
- [ ] 更新 package.json 中的项目信息
- [ ] 配置 Mapbox Token
- [ ] 检查所有功能正常运行
- [ ] 准备项目图标和截图

---

## 🔧 第一步：项目配置

### 1.1 更新项目信息

编辑 `package.json`：
```json
{
  "name": "photo-map",
  "version": "1.0.0",
  "description": "你的项目描述",
  "author": "你的姓名 <your-email@example.com>",
  "homepage": "https://你的用户名.github.io/photo-map"
}
```

### 1.2 配置 Mapbox Token

1. 访问 [Mapbox](https://mapbox.com) 注册账号
2. 创建 Access Token
3. 创建 `.env` 文件：
```bash
# 在项目根目录创建 .env 文件
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGV4YW1wbGUifQ.example
```

### 1.3 测试本地运行

```bash
# 安装依赖
npm install

# 测试 Electron 版本
npm run dev

# 测试 Web 版本
npm run web:dev
```

---

## 📤 第二步：上传到 GitHub

### 2.1 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击 "New repository"
3. 填写信息：
   - Repository name: `photo-map`
   - Description: `一个基于 Electron + React 的地图相册应用`
   - 选择 Public
   - 不要勾选任何初始化选项

### 2.2 初始化本地仓库

```bash
# 进入项目目录
cd photo-map

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交初始版本
git commit -m "feat: 初始化地图相册项目

- 完整的 Electron + React 应用
- 支持地图标记和照片管理
- 照片编辑功能（裁剪、旋转）
- 内存优化和性能优化
- 双版本架构（Web + Desktop）"

# 添加远程仓库（替换为你的用户名）
git remote add origin https://github.com/你的用户名/photo-map.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

---

## 🌐 第三步：部署 Web 版本

### 方案 A：Netlify 部署（推荐）

#### 3.1 自动部署设置

1. 访问 [Netlify](https://netlify.com)
2. 点击 "New site from Git"
3. 选择 GitHub 并授权
4. 选择你的 `photo-map` 仓库
5. 配置构建设置：
   - Build command: `npm run web:build`
   - Publish directory: `dist-web`
   - Environment variables: 添加 `VITE_MAPBOX_TOKEN`

#### 3.2 自定义域名（可选）

1. 在 Netlify 控制台点击 "Domain settings"
2. 添加自定义域名
3. 配置 DNS 记录

### 方案 B：Vercel 部署

#### 3.1 使用 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod

# 按提示配置：
# - Build Command: npm run web:build
# - Output Directory: dist-web
# - Environment Variables: VITE_MAPBOX_TOKEN
```

### 方案 C：GitHub Pages

#### 3.1 配置 GitHub Actions

GitHub Actions 已配置好，推送代码即可自动部署。

#### 3.2 启用 GitHub Pages

1. 在 GitHub 仓库设置中找到 "Pages"
2. Source 选择 "GitHub Actions"
3. 等待部署完成

---

## 💻 第四步：发布桌面版

### 4.1 配置 GitHub Secrets

在 GitHub 仓库设置中添加 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 添加以下 Secrets：
   - `VITE_MAPBOX_TOKEN`: 你的 Mapbox Token

### 4.2 触发自动构建

```bash
# 创建 release 提交
git add .
git commit -m "release: v1.0.0 - 首个正式版本"
git push

# 或者创建 Git Tag
git tag v1.0.0
git push origin v1.0.0
```

### 4.3 手动构建（可选）

```bash
# Windows 版本（在 Windows 系统上）
npm run build
npm run electron-build

# macOS 版本（在 macOS 系统上）
npm run build
npm run electron-build

# Linux 版本（在 Linux 系统上）
npm run build
npm run electron-build
```

---

## 📝 第五步：完善项目信息

### 5.1 更新 README.md

替换以下占位符：
- `你的用户名` → 实际 GitHub 用户名
- `你的域名.com` → 实际部署域名
- `your-email@example.com` → 你的邮箱

### 5.2 添加项目截图

1. 创建 `screenshots` 文件夹
2. 添加应用截图
3. 更新 README.md 中的图片链接

### 5.3 创建 Release

1. 在 GitHub 仓库页面点击 "Releases"
2. 点击 "Create a new release"
3. 填写信息：
   - Tag version: `v1.0.0`
   - Release title: `地图相册 v1.0.0 - 首个正式版本`
   - 描述主要功能和特性

---

## 🔍 第六步：测试和验证

### 6.1 Web 版本测试

访问部署的网站，测试：
- [ ] 地图正常显示
- [ ] 可以创建标记
- [ ] 可以上传照片
- [ ] 照片编辑功能正常
- [ ] 下载桌面版按钮正常

### 6.2 桌面版测试

下载构建的安装包，测试：
- [ ] 应用正常安装
- [ ] 所有功能正常运行
- [ ] 数据持久化正常
- [ ] 性能表现良好

---

## 📊 第七步：监控和优化

### 7.1 添加分析工具

在 `.env` 中添加：
```bash
# Google Analytics（可选）
VITE_GA_ID=G-XXXXXXXXXX

# 错误监控（可选）
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 7.2 性能监控

使用以下工具监控性能：
- Lighthouse（网页性能）
- Web Vitals（用户体验指标）
- Netlify Analytics（访问统计）

---

## 🎯 第八步：推广和维护

### 8.1 推广渠道

- [ ] 在 GitHub 上添加 Topics 标签
- [ ] 提交到开源项目目录
- [ ] 社交媒体分享
- [ ] 技术博客介绍

### 8.2 持续维护

- [ ] 定期更新依赖
- [ ] 修复用户反馈的问题
- [ ] 添加新功能
- [ ] 优化性能

---

## 🆘 常见问题解决

### Q1: 地图不显示
**A:** 检查 Mapbox Token 是否正确配置，确保在环境变量中设置了 `VITE_MAPBOX_TOKEN`

### Q2: 构建失败
**A:** 检查 Node.js 版本是否 18+，删除 `node_modules` 重新安装依赖

### Q3: 部署后功能异常
**A:** 检查环境变量是否在部署平台正确配置

### Q4: Electron 打包失败
**A:** 确保在对应操作系统上构建，检查 electron-builder 配置

---

## 📞 获取帮助

- GitHub Issues: 在仓库中创建 Issue
- 文档: 查看 `TECHNICAL_GUIDE.md`
- 邮箱: your-email@example.com

---

## 🎉 完成！

恭喜！你的地图相册应用已经成功上线。用户现在可以：

1. **在线体验**: 访问你的网站直接使用 Web 版本
2. **下载应用**: 从 GitHub Releases 下载桌面版本
3. **查看源码**: 在 GitHub 上查看和贡献代码

记得定期更新和维护你的项目！p