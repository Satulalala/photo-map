# 地图相册 Photo Map

一个基于 Electron + React 的桌面应用，让你在世界地图上标记旅行足迹并管理照片记忆。

![应用截图](https://via.placeholder.com/800x500/4A90E2/FFFFFF?text=Photo+Map+Screenshot)

## ✨ 主要功能

- 🗺️ **交互式世界地图** - 基于 Mapbox GL，支持缩放、拖拽、搜索
- 📍 **智能标记管理** - 点击地图创建标记，自动获取地名
- 📷 **照片管理** - 每个标记可添加多张照片，支持备注
- ✂️ **照片编辑** - 内置裁剪和旋转功能，类似手机相册体验
- 🔍 **强大搜索** - 支持地名搜索和照片备注搜索
- 🔥 **热力图模式** - 可视化显示照片密度分布
- 💾 **本地存储** - 数据完全存储在本地，保护隐私
- ⚡ **性能优化** - 虚拟滚动、懒加载、内存管理等多项优化

## 🚀 快速开始

### 🌐 在线体验

部署后将获得免费域名，如：
- `https://photo-map-你的名字.netlify.app` (Netlify)
- `https://photo-map-你的名字.vercel.app` (Vercel)
- `https://你的用户名.github.io/photo-map` (GitHub Pages)

### 💻 下载桌面版

- **Windows**: [下载 .exe 安装包](https://github.com/你的用户名/photo-map/releases/latest)
- **macOS**: [下载 .dmg 安装包](https://github.com/你的用户名/photo-map/releases/latest)
- **Linux**: [下载 .AppImage 文件](https://github.com/你的用户名/photo-map/releases/latest)

> 💡 **提示**: 将上面链接中的"你的用户名"替换为你的 GitHub 用户名

### 🛠️ 本地开发

#### 快速开始（推荐）
```bash
# 克隆项目（替换为你的 GitHub 用户名）
git clone https://github.com/你的用户名/photo-map.git
cd photo-map

# 安装依赖
npm install

# 图形化启动菜单
# Windows: 双击 run.bat
# PowerShell: .\run.ps1  
# Linux/macOS: ./run.sh

# 或使用命令行
npm run setup        # 配置向导
npm run dev          # Electron 版本
npm run web:dev      # Web 版本
```

📖 **详细说明**: 
- 快速测试: [QUICK_START.md](./QUICK_START.md)
- 完整部署: [LAUNCH_GUIDE.md](./LAUNCH_GUIDE.md)

## 📖 使用说明

### 🌐 Web 版 vs 💻 桌面版

| 功能 | Web 版 | 桌面版 |
|------|--------|--------|
| 基础地图操作 | ✅ | ✅ |
| 照片上传查看 | ✅ | ✅ |
| 照片编辑 | ✅ | ✅ |
| 数据存储 | 浏览器本地 | 本地文件系统 |
| 离线使用 | ❌ | ✅ |
| 性能 | 良好 | 优秀 |
| 存储空间 | 有限 | 无限 |
| 系统集成 | ❌ | ✅ |

### 基本操作

1. **创建标记** - 点击地图任意位置，应用会自动获取地名
2. **添加照片** - 在标记菜单中选择"添加照片"，支持多选
3. **查看照片** - 点击标记或照片缩略图进入全屏查看模式
4. **编辑照片** - 在照片查看器中点击编辑按钮，支持裁剪和旋转
5. **搜索功能** - 使用顶部搜索框搜索地名或照片备注

### 快捷键（桌面版）

- `F` - 聚焦搜索框
- `M` - 打开标记列表
- `H` - 切换热力图模式
- `S` - 打开设置面板
- `R` - 测量模式
- `Esc` - 关闭当前弹窗
- `←/→` - 照片查看器中切换照片

## 🛠️ 技术架构

- **前端框架**: React 18 + Vite
- **桌面框架**: Electron 27
- **地图引擎**: Mapbox GL JS
- **数据库**: SQLite (better-sqlite3)
- **图片处理**: Sharp
- **状态管理**: Zustand
- **类型检查**: TypeScript
- **样式**: CSS + CSS Modules

## 📊 性能指标

- 启动时间: 冷启动 ~1.2s，热启动 ~0.8s
- 内存占用: 正常使用 200-300MB，目标优化到 300MB 以下
- 地图性能: 流畅显示 200+ 标记，60fps 缩放拖拽
- 图片加载: 缩略图 ~20ms，支持懒加载和三级缓存

## 🔧 开发

### 项目结构

```
photo-map/
├── src/                    # 渲染进程代码
│   ├── components/         # React 组件
│   ├── utils/             # 工具函数
│   ├── store/             # 状态管理
│   └── types/             # TypeScript 类型定义
├── main.cjs               # 主进程代码
├── preload.cjs            # 预加载脚本
├── database.cjs           # 数据库操作
└── public/                # 静态资源
```

### 开发命令

```bash
npm run dev          # 开发模式
npm run build        # 构建前端
npm run electron     # 运行 Electron
npm run test         # 运行测试
npm run lint         # 代码检查
```

## 📝 更新日志

查看 [TODO.md](./TODO.md) 了解开发进度和计划功能。

查看 [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md) 了解详细技术文档。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 AGPL-3.0 许可证进行开源。

- ✅ **个人使用**: 完全免费
- ✅ **学习研究**: 完全免费  
- ✅ **非商业使用**: 完全免费
- ⚠️ **商业使用**: 需要购买商业许可证

如需商业许可证，请联系：[你的邮箱]

查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Mapbox](https://www.mapbox.com/) - 提供优秀的地图服务
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [React](https://reactjs.org/) - 用户界面库
- [Sharp](https://sharp.pixelplumbing.com/) - 高性能图像处理库

---

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！