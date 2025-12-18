# 🚀 地图相册部署上线详细步骤

> � **分天完（成建议**: 这个部署过程可以分 3-4 天完成，每天 30-60 分钟，轻松无压力！

## 📋 准备工作（必须完成）

### ✅ 检查清单
- [ ] 项目在本地能正常运行
- [ ] 已有 GitHub 账号
- [ ] 已有 Mapbox Token
- [ ] Node.js 18+ 已安装

---

## 🔧 第一步：准备项目文件

### 1.1 更新项目信息

编辑 `package.json`，替换以下信息：
```json
{
  "name": "photo-map",
  "description": "你的项目描述",
  "author": "你的姓名 <your-email@example.com>",
  "homepage": "https://你的GitHub用户名.github.io/photo-map"
}
```

### 1.2 更新 README.md

打开 `README.md`，替换所有占位符：
- `你的用户名` → 你的实际 GitHub 用户名
- `你的域名.com` → 部署后会自动获得免费域名
- `your-email@example.com` → 你的邮箱

**注意：** 域名会在部署完成后自动分配，比如：`https://你的项目名.netlify.app`

### 1.3 检查 .env 文件

确保 `.env` 文件包含正确的 Mapbox Token：
```
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA
```

---

## 📤 第二步：上传到 GitHub

### 2.1 创建 GitHub 仓库

1. **登录 GitHub**
   - 打开 https://github.com
   - 用你的账号登录

2. **创建新仓库**
   - 点击右上角的 "+" 号
   - 选择 "New repository"

3. **填写仓库信息**
   ```
   Repository name: photo-map
   Description: 一个基于 Electron + React 的地图相册应用
   
   ✅ Public（选择公开）
   ❌ Add a README file（不要勾选）
   ❌ Add .gitignore（不要勾选）
   ❌ Choose a license（不要勾选）
   ```

4. **点击 "Create repository"**

### 2.2 上传代码到 GitHub

打开命令行，进入 `photo-map` 目录：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件
git add .

# 3. 提交代码
git commit -m "feat: 初始化地图相册项目

✨ 功能特性:
- 交互式世界地图 (Mapbox GL)
- 照片标记和管理
- 照片编辑 (裁剪/旋转)
- 搜索和热力图
- 双版本架构 (Web + Desktop)

🚀 技术栈:
- Electron 27 + React 18
- Vite + TypeScript
- SQLite + Sharp
- 内存优化和性能优化"

# 4. 添加远程仓库（替换 YOUR_USERNAME 为你的用户名）
git remote add origin https://github.com/YOUR_USERNAME/photo-map.git

# 5. 推送到 GitHub
git branch -M main
git push -u origin main
```

**⚠️ 重要：** 把 `YOUR_USERNAME` 替换成你的实际 GitHub 用户名！

---

## 🌐 第三步：部署 Web 版本

### 方案 A：Netlify 部署（推荐，最简单）

#### 3.1 注册 Netlify 账号

1. 打开 https://netlify.com
2. 点击 "Sign up"
3. 选择 "GitHub" 登录（使用你的 GitHub 账号）

#### 3.2 部署网站

1. **连接 GitHub**
   - 登录后点击 "New site from Git"
   - 选择 "GitHub"
   - 授权 Netlify 访问你的 GitHub

2. **选择仓库**
   - 在列表中找到 `photo-map`
   - 点击选择

3. **配置构建设置**
   ```
   Branch to deploy: main
   Build command: npm run web:build
   Publish directory: dist-web
   ```

4. **添加环境变量**
   - 点击 "Advanced build settings"
   - 点击 "New variable"
   - 添加：
     ```
     Key: VITE_MAPBOX_TOKEN
     Value: pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA
     ```

5. **开始部署**
   - 点击 "Deploy site"
   - 等待 3-5 分钟构建完成

6. **获取网站地址**
   - 构建完成后，你会得到一个免费网址，类似：
   - `https://amazing-name-123456.netlify.app`

#### 3.3 自定义 Netlify 域名（可选）

1. 在 Netlify 控制台点击 "Domain settings"
2. 点击 "Options" → "Edit site name"
3. 修改为你喜欢的名字，比如：`photo-map-张三`
4. 新域名：`https://photo-map-张三.netlify.app`

**免费域名选项：**
- Netlify: `https://你的项目名.netlify.app`
- Vercel: `https://photo-map-用户名.vercel.app`
- GitHub Pages: `https://用户名.github.io/photo-map`

### 方案 B：Vercel 部署

#### 3.1 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 3.2 部署

```bash
# 登录 Vercel
vercel login

# 部署项目
vercel --prod

# 按提示配置：
# ? Set up and deploy "photo-map"? [Y/n] y
# ? Which scope do you want to deploy to? [你的用户名]
# ? Link to existing project? [y/N] n
# ? What's your project's name? photo-map
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] y
# ? Which settings would you like to overwrite? 
#   ✅ Build Command
#   ✅ Output Directory
#   ✅ Development Command
# ? What's your Build Command? npm run web:build
# ? What's your Output Directory? dist-web
# ? What's your Development Command? npm run web:dev
```

#### 3.3 添加环境变量

```bash
# 添加 Mapbox Token
vercel env add VITE_MAPBOX_TOKEN
# 输入: pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA
# 选择: Production

# 重新部署
vercel --prod
```

---

## 💻 第四步：发布桌面版

### 4.1 自动构建（推荐）

GitHub Actions 已经配置好了，会自动构建桌面版：

1. **触发构建**
   ```bash
   # 创建一个 release 提交
   git add .
   git commit -m "release: v1.0.0 - 首个正式版本

   🎉 正式发布地图相册 v1.0.0
   
   ✨ 主要功能:
   - 完整的地图照片管理
   - 照片编辑和搜索
   - 内存优化
   - 双版本支持
   
   📦 包含平台:
   - Windows (.exe)
   - macOS (.dmg) 
   - Linux (.AppImage)"
   
   git push
   ```

2. **查看构建进度**
   - 在 GitHub 仓库页面点击 "Actions"
   - 查看构建状态

3. **下载构建文件**
   - 构建完成后，在 "Actions" 页面下载 artifacts
   - 或等待自动创建 Release

### 4.2 手动构建（如果需要）

如果你想在本地构建：

```bash
# Windows 版本（需要在 Windows 系统上）
npm run build
npm run electron-build

# 构建文件在 dist/ 目录
```

---

## 🎯 第五步：创建 Release

### 5.1 创建 GitHub Release

1. **进入 Releases 页面**
   - 在 GitHub 仓库页面点击 "Releases"
   - 点击 "Create a new release"

2. **填写 Release 信息**
   ```
   Tag version: v1.0.0
   Release title: 地图相册 v1.0.0 - 首个正式版本
   
   描述:
   ## 🎉 地图相册 v1.0.0 正式发布！
   
   ### ✨ 主要功能
   - 🗺️ 交互式世界地图，支持标记和照片管理
   - 📷 照片编辑功能（裁剪、旋转）
   - 🔍 强大的搜索功能
   - 🔥 热力图模式
   - 📱 响应式设计
   
   ### 🚀 双版本支持
   - **Web 版本**: [在线体验](你的网站地址)
   - **桌面版本**: 下载下方对应系统的安装包
   
   ### 📦 下载
   - **Windows**: photo-map-setup-1.0.0.exe
   - **macOS**: photo-map-1.0.0.dmg
   - **Linux**: photo-map-1.0.0.AppImage
   
   ### 🔧 系统要求
   - Windows 10 或更高版本
   - macOS 10.15 或更高版本
   - Ubuntu 18.04+ 或同等 Linux 发行版
   ```

3. **上传安装包**
   - 如果有手动构建的文件，拖拽到 "Attach binaries" 区域
   - 或等待 GitHub Actions 自动上传

4. **发布 Release**
   - 点击 "Publish release"

---

## 📊 第六步：验证部署

### 6.1 测试 Web 版本

访问你的网站地址，测试：
- [ ] 地图正常显示
- [ ] 可以创建标记
- [ ] 可以上传照片
- [ ] 照片编辑功能正常
- [ ] 搜索功能正常
- [ ] 下载桌面版按钮正常

### 6.2 测试桌面版

下载并安装桌面版，测试：
- [ ] 应用正常安装
- [ ] 所有功能正常运行
- [ ] 数据持久化正常
- [ ] 性能表现良好

---

## 🎨 第七步：完善项目

### 7.1 添加项目截图

1. **创建截图文件夹**
   ```bash
   mkdir screenshots
   ```

2. **添加应用截图**
   - 拍摄应用的主要功能截图
   - 保存为 `screenshots/main.png` 等

3. **更新 README.md**
   ```markdown
   ![应用截图](screenshots/main.png)
   ```

### 7.2 设置仓库信息

1. **在 GitHub 仓库页面**
   - 点击仓库名下方的齿轮图标 ⚙️
   - 添加描述：`一个基于 Electron + React 的地图相册桌面应用`
   - 添加网站：你的部署地址
   - 添加标签：`electron`, `react`, `mapbox`, `photo-management`, `desktop-app`

### 7.3 添加 README 徽章

在 README.md 顶部添加：
```markdown
![GitHub release](https://img.shields.io/github/v/release/YOUR_USERNAME/photo-map)
![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/photo-map)
![GitHub license](https://img.shields.io/github/license/YOUR_USERNAME/photo-map)
```

---

## 🔄 第八步：后续更新

### 8.1 更新 Web 版本

```bash
# 修改代码后
git add .
git commit -m "feat: 添加新功能"
git push

# Netlify/Vercel 会自动重新部署
```

### 8.2 更新桌面版

```bash
# 1. 更新版本号
# 编辑 package.json 中的 version

# 2. 提交并推送
git add .
git commit -m "release: v1.1.0 - 新版本发布"
git push

# 3. 创建新的 Git Tag
git tag v1.1.0
git push origin v1.1.0

# GitHub Actions 会自动构建新版本
```

---

## 🎉 完成！

恭喜！你的地图相册应用已经成功上线：

### 🌐 Web 版本
- 用户可以直接在浏览器中使用
- 自动部署，更新即时生效

### 💻 桌面版
- 用户可以下载安装包
- 功能更完整，性能更好

### 📈 推广建议
- 在社交媒体分享
- 提交到开源项目目录
- 写技术博客介绍
- 收集用户反馈持续改进

---

## 🆘 遇到问题？

### 常见问题
1. **地图不显示** → 检查 Mapbox Token 配置
2. **构建失败** → 检查 Node.js 版本和依赖
3. **部署失败** → 检查环境变量配置

### 获取帮助
- 查看 [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md)
- 在 GitHub 创建 Issue
- 邮箱：your-email@example.com

记得把文档中的占位符替换成你的实际信息！🚀