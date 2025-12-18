# 🚀 快速开始测试

## 方法一：使用图形化脚本（推荐）

### Windows 用户
双击 `run.bat` 文件，选择对应选项：
- 选择 `1` 安装依赖
- 选择 `2` 启动 Electron 版本
- 选择 `3` 启动 Web 版本

### PowerShell 用户
```powershell
.\run.ps1
```

### Linux/macOS 用户
```bash
./run.sh
```

## 方法二：使用 npm 命令

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境（首次运行）
```bash
npm run setup
# 按提示输入 Mapbox Token
```

### 3. 启动开发服务器

#### Electron 版本（桌面应用）
```bash
npm run dev
```
应用会自动打开一个桌面窗口

#### Web 版本（浏览器）
```bash
npm run web:dev
```
然后访问 http://localhost:3001

## 方法三：手动配置

### 1. 创建 .env 文件
```bash
# 复制示例文件
copy .env.example .env

# 编辑 .env 文件，添加你的 Mapbox Token
VITE_MAPBOX_TOKEN=你的_mapbox_token
```

### 2. 启动项目
```bash
npm run dev      # Electron 版本
npm run web:dev  # Web 版本
```

## 🔧 获取 Mapbox Token

1. 访问 [Mapbox](https://mapbox.com)
2. 注册账号并登录
3. 进入 [Access Tokens](https://account.mapbox.com/access-tokens/) 页面
4. 复制默认的 Public Token
5. 粘贴到 `.env` 文件中

## 📋 测试功能

启动成功后，你可以测试：

### 基础功能
- [ ] 地图正常显示
- [ ] 可以拖拽和缩放地图
- [ ] 点击地图创建标记
- [ ] 标记显示地名

### 照片功能
- [ ] 点击标记打开菜单
- [ ] 添加照片功能
- [ ] 照片缩略图显示
- [ ] 点击照片查看大图

### 编辑功能
- [ ] 照片编辑器打开
- [ ] 裁剪功能
- [ ] 旋转功能
- [ ] 保存编辑结果

### 搜索功能
- [ ] 顶部搜索框
- [ ] 地名搜索
- [ ] 搜索结果显示

## 🐛 常见问题

### Q: 地图不显示
A: 检查 Mapbox Token 是否正确配置

### Q: 应用启动失败
A: 确保 Node.js 版本 18+，重新安装依赖

### Q: 端口被占用
A: 修改 vite.config.js 中的端口号

### Q: 照片上传失败
A: 检查浏览器是否支持 File API

## 📞 需要帮助？

- 查看 [LAUNCH_GUIDE.md](./LAUNCH_GUIDE.md) 获取详细指南
- 查看 [TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md) 了解技术细节
- 在 GitHub 上创建 Issue