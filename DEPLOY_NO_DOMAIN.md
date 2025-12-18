# 🚀 无需域名的快速部署指南

## ✨ 好消息：完全免费，不需要域名！

部署平台会自动给你一个免费域名，比如：
- `https://photo-map-123.netlify.app`
- `https://photo-map-username.vercel.app`
- `https://username.github.io/photo-map`

## 📋 准备工作（5分钟）

### 1. 注册 GitHub 账号
- 访问 https://github.com
- 点击 "Sign up"
- 填写用户名、邮箱、密码
- 验证邮箱

### 2. 检查项目
```bash
# 确保项目能正常运行
npm run dev
```

## 🚀 部署步骤（15分钟）

### 第一步：上传到 GitHub

```bash
# 1. 打开命令行，进入项目目录
cd photo-map

# 2. 初始化 Git
git init

# 3. 添加所有文件
git add .

# 4. 提交代码
git commit -m "初始化地图相册项目"

# 5. 在 GitHub 创建仓库
# 访问 https://github.com/new
# Repository name: photo-map
# 选择 Public
# 点击 Create repository

# 6. 连接远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/photo-map.git

# 7. 推送代码
git branch -M main
git push -u origin main
```

### 第二步：Netlify 部署（最简单）

#### 方法 A：网页操作（推荐）

1. **访问 Netlify**
   - 打开 https://netlify.com
   - 点击 "Sign up"
   - 选择 "GitHub" 登录

2. **部署网站**
   - 点击 "New site from Git"
   - 选择 "GitHub"
   - 授权 Netlify 访问
   - 选择 `photo-map` 仓库

3. **配置构建**
   ```
   Build command: npm run web:build
   Publish directory: dist-web
   ```

4. **添加环境变量**
   - 点击 "Advanced build settings"
   - 点击 "New variable"
   - Key: `VITE_MAPBOX_TOKEN`
   - Value: `pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA`

5. **开始部署**
   - 点击 "Deploy site"
   - 等待 3-5 分钟

6. **获取网址**
   - 部署完成后，会显示网址
   - 类似：`https://amazing-name-123456.netlify.app`

7. **自定义域名（可选）**
   - 点击 "Domain settings"
   - 点击 "Options" → "Edit site name"
   - 改成：`photo-map-你的名字`
   - 新网址：`https://photo-map-你的名字.netlify.app`

#### 方法 B：命令行操作

```bash
# 1. 安装 Netlify CLI
npm install -g netlify-cli

# 2. 登录
netlify login

# 3. 初始化
netlify init

# 按提示选择：
# ? What would you like to do? Create & configure a new site
# ? Team: [你的团队名]
# ? Site name: photo-map-你的名字
# ? Build command: npm run web:build
# ? Directory to deploy: dist-web

# 4. 添加环境变量
netlify env:set VITE_MAPBOX_TOKEN "pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA"

# 5. 部署
netlify deploy --prod
```

### 第三步：测试网站

访问你的网站地址，测试：
- [ ] 地图正常显示
- [ ] 可以创建标记
- [ ] 可以上传照片
- [ ] 照片编辑功能正常

## 🎉 完成！

你现在有了：
- ✅ 一个在线网站（免费域名）
- ✅ 自动部署（推送代码自动更新）
- ✅ 全球 CDN 加速
- ✅ HTTPS 安全连接

## 📱 分享你的网站

把网址分享给朋友：
```
https://你的项目名.netlify.app
```

## 🔄 更新网站

以后修改代码后：
```bash
git add .
git commit -m "更新功能"
git push
```

Netlify 会自动重新部署，无需任何操作！

## 💡 其他免费部署选项

### Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
获得：`https://photo-map-username.vercel.app`

### GitHub Pages
在 GitHub 仓库设置中启用 Pages
获得：`https://username.github.io/photo-map`

## 🆓 免费额度

### Netlify 免费版
- ✅ 100GB 流量/月
- ✅ 300 分钟构建时间/月
- ✅ 无限网站数量
- ✅ 自动 HTTPS

### Vercel 免费版
- ✅ 100GB 流量/月
- ✅ 6000 分钟构建时间/月
- ✅ 无限网站数量
- ✅ 自动 HTTPS

**对于个人项目完全够用！**

## ❓ 常见问题

### Q: 免费域名能用多久？
A: 永久免费，只要你的账号存在

### Q: 可以换域名吗？
A: 可以，在平台设置中随时修改

### Q: 流量够用吗？
A: 100GB/月对个人项目绰绰有余

### Q: 以后想用自己的域名怎么办？
A: 买域名后在平台设置中添加即可

## 🎯 下一步

- [ ] 添加项目截图到 README
- [ ] 在 GitHub 仓库添加描述和标签
- [ ] 分享给朋友试用
- [ ] 收集反馈持续改进

---

**记住：不需要域名也能拥有一个专业的在线应用！** 🚀