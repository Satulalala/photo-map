# ✅ 部署检查清单

## 📋 部署前准备

### 必须完成
- [ ] 项目在本地能正常运行 (`npm run dev`)
- [ ] 已有 GitHub 账号
- [ ] 已配置 Mapbox Token
- [ ] 更新了 package.json 中的个人信息
- [ ] 更新了 README.md 中的占位符

### 推荐完成
- [ ] 添加了项目截图
- [ ] 测试了所有主要功能
- [ ] 准备了项目描述

---

## 🚀 部署步骤

### 1️⃣ 上传到 GitHub
```bash
git init
git add .
git commit -m "feat: 初始化地图相册项目"
git remote add origin https://github.com/你的用户名/photo-map.git
git push -u origin main
```

### 2️⃣ 部署 Web 版本（选择一个）

#### 选项 A：Netlify（推荐）
1. 访问 https://netlify.com
2. 用 GitHub 账号登录
3. "New site from Git" → 选择你的仓库
4. 构建设置：
   - Build command: `npm run web:build`
   - Publish directory: `dist-web`
5. 环境变量：`VITE_MAPBOX_TOKEN`
6. 点击 "Deploy site"

#### 选项 B：Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
# 按提示配置
```

### 3️⃣ 发布桌面版
```bash
git commit -m "release: v1.0.0 - 首个正式版本"
git push
# GitHub Actions 自动构建
```

### 4️⃣ 创建 Release
1. GitHub 仓库 → "Releases" → "Create a new release"
2. Tag: `v1.0.0`
3. 填写发布说明
4. 发布

---

## 🔍 部署后验证

### Web 版本测试
- [ ] 网站能正常访问
- [ ] 地图正常显示
- [ ] 可以创建标记
- [ ] 可以上传照片
- [ ] 照片编辑功能正常
- [ ] 下载按钮正常

### 桌面版测试
- [ ] 能下载安装包
- [ ] 应用正常安装
- [ ] 所有功能正常
- [ ] 数据持久化正常

---

## 📝 需要替换的信息

在以下文件中替换占位符：

### package.json
```json
{
  "author": "你的姓名 <your-email@example.com>",
  "homepage": "https://你的用户名.github.io/photo-map"
}
```

### README.md
- `你的用户名` → 实际 GitHub 用户名
- `你的域名.com` → 实际网站域名
- `your-email@example.com` → 你的邮箱

### Git 命令
- `https://github.com/你的用户名/photo-map.git` → 实际仓库地址

---

## 🎯 完成标志

部署成功的标志：
- [ ] 有一个可访问的网站地址
- [ ] GitHub 上有完整的代码仓库
- [ ] 有可下载的桌面版安装包
- [ ] 所有功能都能正常使用

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 [DEPLOY_STEP_BY_STEP.md](./DEPLOY_STEP_BY_STEP.md) 详细步骤
2. 检查 GitHub Actions 构建日志
3. 在仓库创建 Issue 求助

🎉 **完成后你就有了一个完整的在线地图相册应用！**