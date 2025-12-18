# 🌐 Netlify 部署配置说明

## 📋 配置项详解

当你在 Netlify 部署时，会看到这些配置项：

### 1. Base directory（基础目录）
**这是什么？** 项目代码所在的目录

**如何填写？**
- 如果你的 GitHub 仓库结构是这样：
  ```
  你的仓库/
  ├── photo-map/          ← 项目在子目录
  │   ├── package.json
  │   ├── src/
  │   └── ...
  ```
  填写：`photo-map`

- 如果你的 GitHub 仓库结构是这样：
  ```
  你的仓库/
  ├── package.json        ← 项目在根目录
  ├── src/
  └── ...
  ```
  留空或填写：`.`

**推荐做法：** 直接把 photo-map 文件夹作为仓库根目录上传，这样就不需要填写 base directory

### 2. Build command（构建命令）
**这是什么？** 用来构建项目的命令

**填写：** `npm run web:build`

**作用：** 
- 安装依赖
- 编译 React 代码
- 打包成静态文件
- 输出到 dist-web 目录

### 3. Publish directory（发布目录）
**这是什么？** 构建完成后，要发布的文件夹

**填写：** `dist-web`

**说明：** 这是相对于 base directory 的路径

### 4. Environment variables（环境变量）
**这是什么？** 应用运行需要的配置

**必须添加：**
- Key: `VITE_MAPBOX_TOKEN`
- Value: `pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA`

---

## 🎯 推荐配置（最简单）

### 方案 A：项目在根目录（推荐）

**GitHub 仓库结构：**
```
photo-map/                    ← 这就是仓库根目录
├── package.json
├── src/
├── public/
└── ...
```

**Netlify 配置：**
```
Base directory:     (留空)
Build command:      npm run web:build
Publish directory:  dist-web
```

### 方案 B：项目在子目录

**GitHub 仓库结构：**
```
my-repo/
└── photo-map/               ← 项目在子目录
    ├── package.json
    ├── src/
    └── ...
```

**Netlify 配置：**
```
Base directory:     photo-map
Build command:      npm run web:build
Publish directory:  dist-web
```

---

## 📝 完整配置示例

### 网页界面配置

1. **Site settings**
   ```
   Site name: photo-map-你的名字
   ```

2. **Build settings**
   ```
   Base directory:     (留空或 photo-map)
   Build command:      npm run web:build
   Publish directory:  dist-web
   ```

3. **Environment variables**
   ```
   VITE_MAPBOX_TOKEN = pk.eyJ1IjoiZm43cXAiLCJhIjoiY21peTUyd3B5MGJqMTNjcTU4aDVtdnNqNiJ9.TadVpAbhvEATQxuflxmqdA
   ```

### netlify.toml 文件配置

项目已经包含了 `netlify.toml` 配置文件，内容如下：

```toml
[build]
  command = "npm run web:build"
  publish = "dist-web"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**好处：** 有了这个文件，Netlify 会自动读取配置，你只需要添加环境变量即可！

---

## ❓ 常见问题

### Q1: Base directory 应该填什么？
**A:** 看你的仓库结构：
- 项目在根目录 → 留空
- 项目在 photo-map 子目录 → 填 `photo-map`

### Q2: 为什么构建失败？
**A:** 检查：
1. Base directory 是否正确
2. 是否添加了 VITE_MAPBOX_TOKEN 环境变量
3. package.json 是否在正确的目录

### Q3: 网站打开是空白页？
**A:** 检查：
1. Publish directory 是否是 `dist-web`
2. 浏览器控制台是否有错误
3. Mapbox token 是否正确

### Q4: 如何修改配置？
**A:** 
1. 进入 Netlify 网站
2. 选择你的站点
3. Site settings → Build & deploy → Build settings
4. 点击 "Edit settings" 修改

---

## 🚀 快速开始

**最简单的方式：**

1. 把 photo-map 文件夹内容直接作为 GitHub 仓库
2. 在 Netlify 选择仓库
3. Base directory 留空
4. 添加环境变量 VITE_MAPBOX_TOKEN
5. 点击 Deploy

**就这么简单！** 🎉

---

## 💡 提示

- 有 netlify.toml 文件后，构建命令和发布目录会自动配置
- 只需要手动添加环境变量
- 每次 git push 都会自动重新部署
- 部署通常需要 2-5 分钟

---

**需要更多帮助？** 查看 [DEPLOY_NO_DOMAIN.md](./DEPLOY_NO_DOMAIN.md) 获取详细步骤！
