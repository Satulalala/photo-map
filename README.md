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
├─ main.cjs                # Electron 主进程
├─ preload.cjs             # Electron 预加载
├─ database.cjs            # 桌面端本地数据逻辑
├─ start.bat               # 启动脚本
└─ upload-github.bat       # 提交 / 上传脚本
```

## 本地运行

### 安装依赖

```bash
npm install
```

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

默认端口：
- 前端开发环境：`http://localhost:3000` 或 `http://localhost:3001`
- Java 后端：`http://localhost:8080`

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
