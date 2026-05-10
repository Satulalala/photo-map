# 文件管理重构设计

## 背景

PhotoMap 项目当前存在以下问题：
- `src/App.jsx` 有 4431 行，严重超标
- 根目录有 21 个配置/脚本文件，混乱
- CSS 文件命名不统一（`batch-1.css` vs `life-panel-xxx.css`）
- 组件职责不清

## 目标

1. 将 `App.jsx` 拆分到 200-300 行
2. 建立清晰的目录结构
3. 保持对外接口不变（入口文件、构建配置路径不变）
4. 渐进式改进，不影响开发进度

## 方案选择

采用**方案 A：自定义 Hooks + 子组件**

理由：
1. 渐进式改进，可以逐步提取
2. 保持现有业务逻辑不变
3. 符合 React 最佳实践
4. 适合个人开源项目

---

## 详细设计

### 0. 根目录文件整理

#### 必须留在根目录的配置文件（不能移动）
- `package.json`, `package-lock.json` - npm 配置
- `vite.config.js` - Vite 构建配置
- `tsconfig.json` - TypeScript 配置
- `.eslintrc.cjs`, `.prettierrc`, `.prettierignore` - 代码规范
- `.gitignore`, `.dockerignore` - 忽略规则
- `.env` - 环境变量
- `Dockerfile.frontend`, `Dockerfile.backend`, `docker-compose.yml`, `nginx.conf` - Docker 配置
- `vercel.json`, `netlify.toml` - 部署配置

#### Electron 主进程文件（需要留在根目录）
- `main.cjs` - Electron 主进程入口
- `preload.cjs` - 预加载脚本
- `database.cjs` - 数据库主文件
- `db-cache.cjs` - 数据库缓存
- `db-migrate.cjs` - 数据库迁移
- `db-vector.cjs` - 向量数据库
- `embeddingService.cjs` - 嵌入服务

#### HTML 入口文件（需要留在根目录）
- `index.html` - Electron 入口
- `index-web.html` - Web 入口

#### 移动到 `scripts/` 目录
- `append_social.js` → `scripts/append_social.js`
- `upload-github.bat` → `scripts/upload-github.bat`
- `upload-github.ps1` → `scripts/upload-github.ps1`
- `start.bat` → `scripts/start.bat`

#### 移动到 `docs/` 目录
- `RELEASE_NOTES_v1.0.0.md` → `docs/RELEASE_NOTES_v1.0.0.md`

#### 保留在根目录的文档
- `README.md` - 项目说明（必须在根目录）

#### 移动到 `.claude/` 目录
- `CLAUDE.md` → `.claude/CLAUDE.md`（Claude 配置文件）

#### 整理后的根目录结构
```
PhotoMap/
├── .claude/                    # Claude 配置
│   ├── CLAUDE.md
│   └── skills/
├── .github/                    # GitHub 配置
├── .husky/                     # Git Hooks
├── build/                      # Electron 构建产物
├── docs/                       # 文档
│   ├── superpowers/            # Superpowers 设计文档
│   ├── RELEASE_NOTES_v1.0.0.md
│   └── ...
├── ipc-handlers/               # Electron IPC 处理器
├── public/                     # 静态资源
├── scripts/                    # 工具脚本
│   ├── append_social.js
│   ├── start.bat
│   ├── upload-github.bat
│   └── upload-github.ps1
├── server-java/                # Java 后端
├── src/                        # 前端源码
├── src-web/                    # Web 适配层
├── .dockerignore
├── .env
├── .eslintrc.cjs
├── .gitignore
├── .prettierignore
├── .prettierrc
├── database.cjs                # Electron 主进程
├── db-cache.cjs
├── db-migrate.cjs
├── db-vector.cjs
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── embeddingService.cjs
├── index.html                  # Electron 入口
├── index-web.html              # Web 入口
├── main.cjs                    # Electron 主进程入口
├── netlify.toml
├── nginx.conf
├── package-lock.json
├── package.json
├── preload.cjs
├── README.md
├── tsconfig.json
├── vercel.json
└── vite.config.js
```

---

### 1. 自定义 Hooks

#### hooks/useMarkers.js

管理标记相关的状态和逻辑。

**状态：**
- `markers` - 标记列表
- `markersLoading` - 加载状态
- `newMarkerIds` - 新添加的标记 ID

**方法：**
- `refreshMarkers()` - 刷新标记列表
- `deleteMarkerById(id)` - 删除标记
- `createMarkerWithPhoto(photoId, photoCount)` - 创建标记
- `createMarkerElement(m, isNew)` - 创建标记元素
- `renderMarkers()` - 渲染标记到地图

**返回：**
```javascript
{
  markers, loading, newMarkerIds,
  refresh, deleteById, createWithPhoto, createElement, render
}
```

#### hooks/usePhotos.js

管理照片查看和编辑的状态和逻辑。

**状态：**
- `photoViewer` - 照片查看器状态
- `currentPhotoUrl` - 当前照片 URL
- `photoInfo` - 照片详细信息
- `photoEditor` - 照片编辑器状态
- `noteEditor` - 备注编辑器状态
- `notesPanel` - 备注管理面板状态

**方法：**
- `getPhotoUrl(photo)` - 获取照片 URL（异步）
- `getPhotoUrlSync(photo)` - 获取照片 URL（同步）
- `handlePhotoSelect(markerId, photoId, photoIndex)` - 选择照片
- `rotatePhoto(photoId, degrees)` - 旋转照片
- `cropPhoto(photoId, crop)` - 裁剪照片
- `savePhotoNote(markerId, photoIndex, note)` - 保存备注

**返回：**
```javascript
{
  viewer, currentUrl, info, editor, noteEditor, notesPanel,
  getUrl, getUrlSync, select, rotate, crop, saveNote,
  setViewer, setEditor, setNoteEditor, setNotesPanel
}
```

#### hooks/useSearch.js

管理搜索功能的状态和逻辑。

**状态：**
- `searchQuery` - 搜索关键词
- `searchResults` - 搜索结果
- `showSearchResults` - 是否显示结果
- `searchHistory` - 搜索历史
- `selectedResultIndex` - 键盘选中的索引

**方法：**
- `searchPlace(query)` - 搜索地点
- `selectSearchResult(result)` - 选择搜索结果
- `clearSearchHistory()` - 清除历史
- `handleSearchInput(value)` - 输入变化
- `handleSearchFocus()` - 输入框聚焦
- `handleSearchKeyDown(e)` - 键盘事件

**返回：**
```javascript
{
  query, results, show, history, selectedIndex,
  search, select, clear, inputChange, focus, keyDown,
  setQuery, setShow, setSelectedIndex
}
```

#### hooks/useVillage.js

管理社交功能的状态和逻辑。

**状态：**
- `villageMembers` - 地球村成员
- `manualFriends` - 手动添加的好友
- `hiddenFriendIds` - 隐藏的好友 ID
- `pinnedFriendIds` - 置顶的好友 ID
- `friendSearchQuery` - 好友搜索关键词
- `pendingFriendId` - 待添加的好友 ID

**方法：**
- `handleAddFriend()` - 添加好友
- `handleChatFriend(friendId)` - 聊天（暂未实现）
- `handleOpenVillage()` - 打开地球村

**返回：**
```javascript
{
  members, manualFriends, hiddenFriendIds, pinnedFriendIds,
  friendSearchQuery, pendingFriendId, hasVillage, villageStats, villageFeeds,
  addFriend, chatFriend, openVillage,
  setFriendSearchQuery, setPendingFriendId, setHiddenFriendIds, setPinnedFriendIds
}
```

#### hooks/useSync.js

管理云同步的状态和逻辑。

**状态：**
- `cloudSyncEnabled` - 是否启用云同步
- `syncingNow` - 是否正在同步
- `syncQueueSize` - 同步队列大小
- `isOnline` - 是否在线

**方法：**
- `runCloudSync()` - 执行云同步

**返回：**
```javascript
{
  enabled, syncing, queueSize, online,
  sync, setEnabled
}
```

---

### 2. 子组件设计

#### components/map/SearchBar.jsx

搜索栏组件。

**Props：**
```javascript
{
  searchQuery,          // string - 搜索关键词
  searchResults,        // array - 搜索结果
  showSearchResults,    // boolean - 是否显示结果
  selectedResultIndex,  // number - 键盘选中索引
  isSearching,          // boolean - 是否正在搜索
  searchHistory,        // array - 搜索历史
  searchInputRef,       // ref - 输入框引用
  onInputChange,        // function - 输入变化
  onFocus,              // function - 聚焦
  onKeyDown,            // function - 键盘事件
  onSelectResult,       // function - 选择结果
  onClearHistory,       // function - 清除历史
  onCloseResults        // function - 关闭结果
}
```

#### components/map/Toolbar.jsx

工具栏组件。

**Props：**
```javascript
{
  measureMode,    // boolean - 测量模式
  heatmapMode,    // boolean - 热力图模式
  showLife,       // boolean - 生活面板
  showSettings,   // boolean - 设置面板
  onLocate,       // function - 定位
  onRefresh,      // function - 刷新
  onZoomIn,       // function - 放大
  onZoomOut,      // function - 缩小
  onToggleHeatmap,// function - 切换热力图
  onOpenLife,     // function - 打开生活面板
  onOpenSettings  // function - 打开设置面板
}
```

#### components/panels/MarkerListPanel.jsx

标记列表面板。

**Props：**
```javascript
{
  markers,            // array - 标记列表
  show,               // boolean - 是否显示
  batchMode,          // boolean - 批量模式
  selectedPhotos,     // array - 选中的照片
  markerListSearch,   // string - 搜索关键词
  markerListSort,     // string - 排序方式
  markerListLayout,   // string - 布局方式
  markerListTimeFilter, // string - 时间过滤
  markerListTimeRange,  // object - 时间范围
  uiThemeStyle,       // string - 主题样式
  onClose,            // function - 关闭
  onSearch,           // function - 搜索
  onSort,             // function - 排序
  onLayout,           // function - 布局
  onTimeFilter,       // function - 时间过滤
  onBatchToggle,      // function - 切换批量
  onPhotoSelect,      // function - 选择照片
  onSetCover,         // function - 设置封面
  onDeletePhoto,      // function - 删除照片
  onAddPhoto          // function - 添加照片
}
```

#### components/panels/NotesPanel.jsx

备注管理面板。

**Props：**
```javascript
{
  markerId,      // string - 标记 ID
  marker,        // object - 标记数据
  show,          // boolean - 是否显示
  editing,       // boolean - 是否编辑模式
  editingNotes,  // array - 编辑中的备注
  onClose,       // function - 关闭
  onEdit,        // function - 进入编辑
  onSave,        // function - 保存
  onCancel       // function - 取消
}
```

#### components/panels/NoteEditor.jsx

备注编辑器。

**Props：**
```javascript
{
  markerId,        // string - 标记 ID
  photoIndex,      // number - 照片索引
  note,            // string - 备注内容
  returnToViewer,  // object - 返回查看器
  returnToMenu,    // object - 返回菜单
  onClose,         // function - 关闭
  onSave           // function - 保存
}
```

#### components/markers/MarkerContextMenu.jsx

右键菜单和标记菜单。

**Props：**
```javascript
{
  contextMenu,    // object - 右键菜单状态
  markerMenu,     // object - 标记菜单状态
  markers,        // array - 标记列表
  batchMode,      // boolean - 批量模式
  onClose,        // function - 关闭
  onDelete,       // function - 删除标记
  onAddPhoto,     // function - 添加照片
  onSetCover,     // function - 设置封面
  onOpenNotes,    // function - 打开备注
  onOpenViewer    // function - 打开查看器
}
```

---

### 3. 目录结构

```
src/
├── hooks/                    # 自定义 Hooks
│   ├── useMarkers.js
│   ├── usePhotos.js
│   ├── useSearch.js
│   ├── useVillage.js
│   └── useSync.js
├── components/
│   ├── map/                  # 地图相关
│   │   ├── SearchBar.jsx
│   │   └── Toolbar.jsx
│   ├── markers/              # 标记相关
│   │   ├── MarkerListItem.jsx
│   │   ├── MarkerGridItem.jsx
│   │   └── MarkerContextMenu.jsx
│   ├── photos/               # 照片相关
│   │   ├── PhotoViewer.jsx
│   │   ├── PhotoEditor.jsx
│   │   └── LazyPhoto.jsx
│   ├── panels/               # 面板组件
│   │   ├── MarkerListPanel.jsx
│   │   ├── NotesPanel.jsx
│   │   ├── NoteEditor.jsx
│   │   ├── SettingsPanel.jsx
│   │   ├── SocialPanel.jsx
│   │   └── LifePanel.jsx
│   ├── ErrorBoundary.jsx
│   ├── LoginButtons.jsx
│   ├── MinimalLoader.jsx
│   └── WebDownloadButton.jsx
├── api/                      # API 层（保持）
├── services/                 # 服务层（保持）
├── utils/                    # 工具函数（保持）
├── styles/                   # 样式（稍后优化）
├── App.jsx                   # 精简到 200-300 行
└── main.jsx
```

---

### 4. 拆分顺序

#### 第一批：提取 Hooks（不影响 UI）

1. `src/hooks/useMarkers.js`
2. `src/hooks/usePhotos.js`
3. `src/hooks/useSearch.js`

#### 第二批：提取简单组件

1. `src/components/map/SearchBar.jsx`
2. `src/components/map/Toolbar.jsx`
3. `src/components/panels/NoteEditor.jsx`

#### 第三批：提取复杂组件

1. `src/components/panels/MarkerListPanel.jsx`
2. `src/components/panels/NotesPanel.jsx`
3. `src/components/markers/MarkerContextMenu.jsx`

#### 第四批：整理目录结构

1. 移动现有组件到对应子目录
2. 更新所有 import 路径
3. 删除旧文件

---

### 5. 验证方式

1. 每次提取后运行 `npm run web:dev` 确认功能正常
2. 检查浏览器控制台无报错
3. 测试核心功能：
   - 地图加载
   - 标记创建/删除
   - 照片查看/编辑
   - 搜索功能
   - 云同步
4. 最终确认 `App.jsx` 行数 < 300

---

### 6. 风险控制

1. **渐进式改进** — 每次只提取一个 Hook 或组件，确认无误后再继续
2. **保持功能不变** — 重构不改变任何业务逻辑，只改变代码组织方式
3. **可回滚** — 每批改动都可以通过 git revert 回滚
4. **测试覆盖** — 重构后运行现有测试确保无回归
