# v1.0.0 Release Notes

## 智能照片地图与 AI 知识检索平台首个开源版本

### 版本亮点
- 开源发布照片地图主应用（React + Vite + Electron）
- 增加 Spring Boot 同步服务
- 提供 AI 搜索、AI 问答、AI 摘要接口调用能力
- 支持基于地点名称、备注、时间范围的 RAG 检索思路
- 支持标记管理、照片查看、热力图、搜索与批量操作
- 支持桌面端与 Web 端双运行模式

### 主要能力
#### 1. 照片地图
- 地图标记创建与管理
- 照片挂载与地点归档
- 备注搜索、地点搜索、排序与布局切换
- 热力图与地图交互

#### 2. AI / RAG
- `POST /api/v1/ai/search`
- `POST /api/v1/ai/ask`
- `POST /api/v1/ai/summarize`

#### 3. 云同步
- `POST /api/v1/sync/push`
- `GET /api/v1/sync/pull?since=timestamp`
- 基于更新时间戳的增量拉取
- 基于最新版本覆盖的冲突处理策略

### 技术栈
- 前端：React、Vite、Electron、Mapbox GL JS
- 后端：Java、Spring Boot、RESTful API
- AI：RAG、LLM 应用接入
- 本地存储：IndexedDB / LocalStorage

### 后续计划
- 引入真实向量数据库与 Embedding 检索
- 增强同步服务持久化能力（MySQL / PostgreSQL / Redis）
- 增加用户系统、协作分享与权限管理
- 补充更完整的测试与自动化发布流程
