# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [未发布]

### 新增
- Storybook 组件文档系统
- 开发环境 Mock 数据模块
- VS Code 任务配置

### 变更
- 优化开发体验配置

---

## [1.0.0] - 2024-12-21

### 🎉 首次发布

#### 核心功能
- 地图标记系统 - 在地图上添加、编辑、删除标记
- 照片管理 - 每个标记支持多张照片
- 照片编辑 - 裁剪、旋转功能
- 搜索功能 - 按备注内容搜索标记
- 热力图模式 - 照片密度可视化

#### 性能优化
- 虚拟滚动 - react-window 优化长列表
- 图片懒加载 - IntersectionObserver 精确控制
- WebP 缩略图 - 体积减少 50%
- LRU 缓存系统 - 智能内存管理
- 代码分割 - 懒加载组件

#### 双版本架构
- Electron 桌面版 - Windows/macOS/Linux
- Web 版本 - 浏览器访问，IndexedDB 存储

#### 部署配置
- GitHub Actions CI/CD
- Netlify 自动部署
- electron-updater 自动更新
- 多平台构建支持

#### 代码质量
- ESLint + Prettier 代码规范
- Husky + lint-staged 提交检查
- TypeScript 类型定义
- JSDoc 文档注释
- Zustand 状态管理

#### 开发体验
- Vite 构建工具
- VS Code 配置
- Mock 数据模块
- 性能分析工具

---

## 版本规划

### v1.1.0 - 部署优化
- [ ] 完善自动更新机制
- [ ] 代码签名配置
- [ ] PWA 离线支持增强

### v1.2.0 - 功能增强
- [ ] 批量导入 GPS 照片
- [ ] EXIF 信息展示
- [ ] 数据备份/导出
- [ ] 深色模式

### v1.3.0 - 高级功能
- [ ] 离线地图下载
- [ ] 标记分组/标签
- [ ] 轨迹绘制
- [ ] AI 智能功能

---

## 贡献者

感谢所有为项目做出贡献的开发者！

---

[未发布]: https://github.com/your-username/photo-map/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-username/photo-map/releases/tag/v1.0.0
