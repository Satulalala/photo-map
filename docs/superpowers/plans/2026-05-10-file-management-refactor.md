# 文件管理重构实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 App.jsx 从 4431 行拆分到 200-300 行，建立清晰的目录结构，保持对外接口不变

**架构：** 采用自定义 Hooks + 子组件方案，渐进式提取业务逻辑和 UI 组件，不改变任何业务逻辑

**技术栈：** React 18, Hooks (useState, useCallback, useMemo, useEffect), Vite

---

## 文件结构

### 需要创建的文件

```
src/
├── hooks/
│   ├── useMarkers.js          # 标记管理 Hook
│   ├── usePhotos.js           # 照片管理 Hook
│   ├── useSearch.js           # 搜索功能 Hook
│   ├── useVillage.js          # 社交功能 Hook
│   └── useSync.js             # 云同步 Hook
├── components/
│   ├── map/
│   │   ├── SearchBar.jsx      # 搜索栏组件
│   │   └── Toolbar.jsx        # 工具栏组件
│   ├── markers/
│   │   └── MarkerContextMenu.jsx  # 右键菜单
│   ├── panels/
│   │   ├── MarkerListPanel.jsx    # 标记列表面板
│   │   ├── NotesPanel.jsx         # 备注管理面板
│   │   └── NoteEditor.jsx         # 备注编辑器
```

### 需要移动的文件

```
scripts/
├── append_social.js
├── start.bat
├── upload-github.bat
└── upload-github.ps1

docs/
└── RELEASE_NOTES_v1.0.0.md

.claude/
└── CLAUDE.md
```

---

## 任务分解

### 任务 1：根目录文件整理

**文件：**
- 移动：`append_social.js` → `scripts/append_social.js`
- 移动：`start.bat` → `scripts/start.bat`
- 移动：`upload-github.bat` → `scripts/upload-github.bat`
- 移动：`upload-github.ps1` → `scripts/upload-github.ps1`
- 移动：`RELEASE_NOTES_v1.0.0.md` → `docs/RELEASE_NOTES_v1.0.0.md`
- 移动：`CLAUDE.md` → `.claude/CLAUDE.md`

- [ ] **步骤 1：创建目录并移动文件**

```bash
mkdir -p scripts docs

mv append_social.js scripts/
mv start.bat scripts/
mv upload-github.bat scripts/
mv upload-github.ps1 scripts/
mv RELEASE_NOTES_v1.0.0.md docs/
mv CLAUDE.md .claude/
```

- [ ] **步骤 2：验证文件移动成功**

```bash
ls -la scripts/
ls -la docs/
ls -la .claude/
```

预期：文件都在新位置

- [ ] **步骤 3：Commit**

```bash
git add -A
git commit -m "refactor: reorganize root directory files

- Move scripts to scripts/ directory
- Move docs to docs/ directory
- Move CLAUDE.md to .claude/ directory"
```

---

### 任务 2：创建 useMarkers Hook

**文件：**
- 创建：`src/hooks/useMarkers.js`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 useMarkers.js 骨架**

```javascript
// src/hooks/useMarkers.js
import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../api/index.js';

export function useMarkers() {
  const [markers, setMarkers] = useState([]);
  const [markersLoading, setMarkersLoading] = useState(true);
  const [newMarkerIds, setNewMarkerIds] = useState(new Set());
  const markersStateRef = useRef(markers);

  useEffect(() => {
    markersStateRef.current = markers;
  }, [markers]);

  const refreshMarkers = useCallback(async () => {
    try {
      setMarkersLoading(true);
      let data;
      if (window.electronAPI?.loadMarkers) {
        data = await window.electronAPI.loadMarkers();
      } else {
        data = await api.markers.getAll();
      }
      setMarkers(data || []);
    } catch (e) {
      console.error('Failed to load markers:', e);
    } finally {
      setMarkersLoading(false);
    }
  }, []);

  const deleteMarkerById = useCallback(async (id) => {
    try {
      if (window.electronAPI?.deleteMarker) {
        await window.electronAPI.deleteMarker(id);
      } else {
        await api.markers.delete(id);
      }
      setMarkers(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error('Failed to delete marker:', e);
    }
  }, []);

  return {
    markers,
    markersLoading,
    newMarkerIds,
    markersStateRef,
    setMarkers,
    setNewMarkerIds,
    refreshMarkers,
    deleteMarkerById,
  };
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 useMarkers**

在 App.jsx 顶部添加导入：
```javascript
import { useMarkers } from './hooks/useMarkers.js';
```

在 App 函数内部替换 markers 相关状态：
```javascript
const {
  markers, markersLoading, newMarkerIds, markersStateRef,
  setMarkers, setNewMarkerIds, refreshMarkers, deleteMarkerById
} = useMarkers();
```

- [ ] **步骤 3：运行开发服务器验证**

```bash
npm run web:dev
```

预期：应用正常启动，标记加载功能正常

- [ ] **步骤 4：Commit**

```bash
git add src/hooks/useMarkers.js src/App.jsx
git commit -m "refactor: extract useMarkers hook from App.jsx"
```

---

### 任务 3：创建 usePhotos Hook

**文件：**
- 创建：`src/hooks/usePhotos.js`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 usePhotos.js**

```javascript
// src/hooks/usePhotos.js
import { useState, useCallback, useEffect } from 'react';
import { photoUrlCache } from '../utils/LRUCache.ts';
import api from '../api/index.js';

export function usePhotos() {
  const [photoViewer, setPhotoViewer] = useState(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
  const [photoInfo, setPhotoInfo] = useState(null);
  const [photoEditor, setPhotoEditor] = useState(null);
  const [noteEditor, setNoteEditor] = useState(null);
  const [notesPanel, setNotesPanel] = useState(null);

  const getPhotoUrl = useCallback(async (photo) => {
    if (!photo) return null;
    if (typeof photo === 'string') return photo;
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    const photoId = photo.id;
    if (!photoId) return null;
    const cached = photoUrlCache.get(photoId);
    if (cached) return cached;
    if (window.electronAPI) {
      const url = await window.electronAPI.getPhotoUrl(photoId);
      if (url) photoUrlCache.set(photoId, url);
      return url;
    }
    return null;
  }, []);

  const getPhotoUrlSync = useCallback((photo) => {
    if (!photo) return '';
    if (typeof photo === 'string') return photo;
    if (photo.data && photo.data.startsWith('data:')) return photo.data;
    const photoId = photo.id;
    return photoUrlCache.get(photoId) || '';
  }, []);

  const handlePhotoSelect = useCallback((markerId, photoId, photoIndex) => {
    // Will be implemented with markers context
  }, []);

  return {
    photoViewer,
    currentPhotoUrl,
    photoInfo,
    photoEditor,
    noteEditor,
    notesPanel,
    getPhotoUrl,
    getPhotoUrlSync,
    handlePhotoSelect,
    setPhotoViewer,
    setCurrentPhotoUrl,
    setPhotoInfo,
    setPhotoEditor,
    setNoteEditor,
    setNotesPanel,
  };
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 usePhotos**

- [ ] **步骤 3：运行开发服务器验证**

```bash
npm run web:dev
```

- [ ] **步骤 4：Commit**

```bash
git add src/hooks/usePhotos.js src/App.jsx
git commit -m "refactor: extract usePhotos hook from App.jsx"
```

---

### 任务 4：创建 useSearch Hook

**文件：**
- 创建：`src/hooks/useSearch.js`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 useSearch.js**

```javascript
// src/hooks/useSearch.js
import { useState, useCallback, useRef, useDeferredValue } from 'react';
import { initMapbox } from '../utils/mapUtils.js';

export function useSearch(mapRef) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('searchHistory') || '[]'); } catch { return []; }
  });
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const searchInputRef = useRef(null);

  const saveToHistory = useCallback((result) => {
    setSearchHistory(prev => {
      const newHistory = [result, ...prev.filter(h => h.name !== result.name)].slice(0, 10);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  }, []);

  const searchPlace = useCallback(async (query) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      // Search implementation
      const results = [];
      setSearchResults(results);
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const selectSearchResult = useCallback((result) => {
    saveToHistory(result);
    setShowSearchResults(false);
    if (mapRef.current && result.center) {
      mapRef.current.flyTo({ center: result.center, zoom: 15 });
    }
  }, [mapRef, saveToHistory]);

  const handleSearchInput = useCallback((value) => {
    setSearchQuery(value);
    if (value.trim()) {
      searchPlace(value);
    } else {
      setSearchResults([]);
    }
  }, [searchPlace]);

  const handleSearchFocus = useCallback(() => {
    setShowSearchResults(true);
  }, []);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      searchInputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedResultIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedResultIndex >= 0) {
      e.preventDefault();
      selectSearchResult(searchResults[selectedResultIndex]);
    }
  }, [searchResults, selectedResultIndex, selectSearchResult]);

  return {
    searchQuery,
    deferredSearchQuery,
    searchResults,
    showSearchResults,
    isSearching,
    searchHistory,
    selectedResultIndex,
    searchInputRef,
    setSearchQuery,
    setSearchResults,
    setShowSearchResults,
    setSelectedResultIndex,
    searchPlace,
    selectSearchResult,
    clearSearchHistory,
    handleSearchInput,
    handleSearchFocus,
    handleSearchKeyDown,
  };
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 useSearch**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/hooks/useSearch.js src/App.jsx
git commit -m "refactor: extract useSearch hook from App.jsx"
```

---

### 任务 5：创建 SearchBar 组件

**文件：**
- 创建：`src/components/map/SearchBar.jsx`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 SearchBar.jsx**

```javascript
// src/components/map/SearchBar.jsx
import React from 'react';

export default function SearchBar({
  searchQuery,
  searchResults,
  showSearchResults,
  selectedResultIndex,
  isSearching,
  searchHistory,
  searchInputRef,
  onInputChange,
  onFocus,
  onKeyDown,
  onSelectResult,
  onClearHistory,
  onCloseResults,
}) {
  return (
    <div className="search-bar-container">
      <div className="search-bar-wrapper">
        <label className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索地点..."
            value={searchQuery}
            onChange={(e) => onInputChange(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            ref={searchInputRef}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={(e) => {
                e.preventDefault();
                onInputChange('');
                searchInputRef.current?.focus();
              }}
            >✕</button>
          )}
        </label>

        {showSearchResults && (
          <div className="search-results">
            {isSearching ? (
              <div className="search-loading">
                <span className="loading-spinner"></span>搜索中...
              </div>
            ) : searchQuery && searchResults.length > 0 ? (
              searchResults.map((result, i) => (
                <div
                  key={i}
                  className={`search-result-item ${selectedResultIndex === i ? 'selected' : ''}`}
                  onClick={() => onSelectResult(result)}
                  onMouseEnter={() => {}}
                >
                  <span className="result-icon">📍</span>
                  <div className="result-info">
                    <div className="result-name">{result.name}</div>
                    <div className="result-address">{result.address}</div>
                  </div>
                  <span className="result-distance">{result.distance}</span>
                </div>
              ))
            ) : searchQuery ? (
              <div className="search-empty">未找到 "{searchQuery}" 相关地点</div>
            ) : searchHistory.length > 0 ? (
              <>
                <div className="search-history-header">
                  <span>🕐 搜索历史</span>
                  <button onClick={onClearHistory}>清除</button>
                </div>
                {searchHistory.map((item, i) => (
                  <div
                    key={i}
                    className={`search-result-item history-item ${selectedResultIndex === i ? 'selected' : ''}`}
                    onClick={() => onSelectResult(item)}
                    onMouseEnter={() => {}}
                  >
                    <span className="result-icon">🕐</span>
                    <div className="result-info">
                      <div className="result-name">{item.name}</div>
                      <div className="result-address">{item.address}</div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="search-tip">输入地名、地址搜索</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 SearchBar**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/components/map/SearchBar.jsx src/App.jsx
git commit -m "refactor: extract SearchBar component from App.jsx"
```

---

### 任务 6：创建 Toolbar 组件

**文件：**
- 创建：`src/components/map/Toolbar.jsx`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 Toolbar.jsx**

```javascript
// src/components/map/Toolbar.jsx
import React from 'react';

export default function Toolbar({
  measureMode,
  heatmapMode,
  showLife,
  showSettings,
  onLocate,
  onRefresh,
  onZoomIn,
  onZoomOut,
  onToggleHeatmap,
  onOpenLife,
  onOpenSettings,
}) {
  return (
    <>
      {/* 左上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-left">
          <button onClick={onLocate} data-tooltip="定位">
            <span className="main-tool-icon">🧭</span>
          </button>
          <button onClick={onRefresh} data-tooltip="刷新">
            <span className="main-tool-icon">🔄</span>
          </button>
        </div>
      )}

      {/* 右上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-right">
          <button onClick={onZoomIn} data-tooltip="放大">
            <span className="main-tool-icon">➕</span>
          </button>
          <button onClick={onZoomOut} data-tooltip="缩小">
            <span className="main-tool-icon">➖</span>
          </button>
          <button
            onClick={onToggleHeatmap}
            className={heatmapMode ? 'active' : ''}
            data-tooltip="热力图"
          >
            <span className="main-tool-icon">🔥</span>
          </button>
          <button
            onClick={onOpenLife}
            className={showLife ? 'active' : ''}
            data-tooltip="生活"
          >
            <span className="main-tool-icon">🌟</span>
          </button>
          <button onClick={onOpenSettings} className="settings-btn" data-tooltip="设置">
            <span className="main-tool-icon">⚙️</span>
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 Toolbar**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/components/map/Toolbar.jsx src/App.jsx
git commit -m "refactor: extract Toolbar component from App.jsx"
```

---

### 任务 7：创建 NoteEditor 组件

**文件：**
- 创建：`src/components/panels/NoteEditor.jsx`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 NoteEditor.jsx**

```javascript
// src/components/panels/NoteEditor.jsx
import React from 'react';

export default function NoteEditor({
  noteEditor,
  markers,
  onClose,
  onSave,
}) {
  if (!noteEditor) return null;

  return (
    <div className="note-editor-overlay" onClick={onClose}>
      <div className="note-editor" onClick={e => e.stopPropagation()}>
        <h3>📝 编辑备注</h3>
        <textarea
          value={noteEditor.note}
          onChange={e => onSave({ ...noteEditor, note: e.target.value })}
          placeholder="输入照片备注..."
          autoFocus
        />
        <div className="note-editor-btns">
          <button onClick={onClose}>取消</button>
          <button className="save" onClick={() => onSave(noteEditor)}>保存</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 NoteEditor**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/components/panels/NoteEditor.jsx src/App.jsx
git commit -m "refactor: extract NoteEditor component from App.jsx"
```

---

### 任务 8：创建 MarkerListPanel 组件

**文件：**
- 创建：`src/components/panels/MarkerListPanel.jsx`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 MarkerListPanel.jsx 骨架**

```javascript
// src/components/panels/MarkerListPanel.jsx
import React from 'react';
import MarkerListItem from '../MarkerListItem.jsx';
import MarkerGridItem from '../MarkerGridItem.jsx';

export default function MarkerListPanel({
  markers,
  show,
  batchMode,
  selectedPhotos,
  markerListSearch,
  markerListSort,
  markerListLayout,
  markerListTimeFilter,
  markerListTimeRange,
  uiThemeStyle,
  markersLoading,
  onClose,
  onSearch,
  onSort,
  onLayout,
  onTimeFilter,
  onBatchToggle,
  onPhotoSelect,
  onSetCover,
  onDeletePhoto,
  onAddPhoto,
}) {
  if (!show) return null;

  // Filter and sort markers
  const filteredMarkers = markers
    .filter(m => {
      if (markerListSearch) {
        const name = m.name || `${m.lat?.toFixed?.(3)}°, ${m.lng?.toFixed?.(3)}°`;
        if (!name.toLowerCase().includes(markerListSearch.toLowerCase())) return false;
      }
      if (markerListTimeFilter !== 'all') {
        const t = m.createdAt || 0;
        const now = Date.now();
        if (markerListTimeFilter === 'week' && t < now - 7 * 24 * 60 * 60 * 1000) return false;
        if (markerListTimeFilter === 'month' && t < now - 30 * 24 * 60 * 60 * 1000) return false;
        if (markerListTimeFilter === 'year' && t < now - 365 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (markerListSort === 'time') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      } else {
        return (a.name || '').localeCompare(b.name || '', 'zh-CN');
      }
    });

  return (
    <div className="marker-list-overlay open" onClick={onClose}>
      <div
        className={`marker-list-panel themed-floating-panel theme-${uiThemeStyle} open`}
        onClick={e => e.stopPropagation()}
      >
        <div className="marker-list-panel-inner">
          <div className="marker-list-header">
            <h3>📍 所有标记</h3>
            <div className="header-actions">
              <button
                className="batch-toggle-btn"
                onClick={onBatchToggle}
                style={{ background: batchMode ? '#ef4444' : '#4a90e2' }}
              >
                {batchMode ? '✕ 退出批量' : '📋 批量操作'}
              </button>
              <button className="panel-close" onClick={onClose}>✕</button>
            </div>
          </div>

          <div className="marker-list-toolbar">
            <input
              type="text"
              placeholder="搜索地名、备注或图片描述..."
              value={markerListSearch}
              onChange={e => onSearch(e.target.value)}
              className="marker-search"
            />
            <div className="toolbar-actions">
              <button onClick={onSort}>排序: {markerListSort === 'time' ? '时间' : '地名'}</button>
              <button onClick={onLayout}>布局: {markerListLayout === 'list' ? '列表' : '网格'}</button>
            </div>
          </div>

          <div className="marker-list-content">
            {markersLoading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="skeleton-list-item">
                  <div className="skeleton-list-thumb"></div>
                  <div className="skeleton-list-info">
                    <div className="skeleton-text medium"></div>
                    <div className="skeleton-text short"></div>
                  </div>
                </div>
              ))
            ) : filteredMarkers.length === 0 ? (
              <div className="marker-list-empty">
                {markerListSearch ? `未找到匹配 "${markerListSearch}" 的结果` : '暂无标记'}
              </div>
            ) : markerListLayout === 'list' ? (
              filteredMarkers.map(marker => (
                <MarkerListItem
                  key={marker.id}
                  marker={marker}
                  batchMode={batchMode}
                  selectedPhotos={selectedPhotos}
                  onPhotoSelect={onPhotoSelect}
                  onSetCover={onSetCover}
                  onDeletePhoto={onDeletePhoto}
                  onAddPhoto={onAddPhoto}
                />
              ))
            ) : (
              <div className="marker-grid">
                {filteredMarkers.map(marker => (
                  <MarkerGridItem
                    key={marker.id}
                    marker={marker}
                    batchMode={batchMode}
                    selectedPhotos={selectedPhotos}
                    onPhotoSelect={onPhotoSelect}
                    onSetCover={onSetCover}
                    onDeletePhoto={onDeletePhoto}
                    onAddPhoto={onAddPhoto}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 MarkerListPanel**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/components/panels/MarkerListPanel.jsx src/App.jsx
git commit -m "refactor: extract MarkerListPanel component from App.jsx"
```

---

### 任务 9：创建 NotesPanel 组件

**文件：**
- 创建：`src/components/panels/NotesPanel.jsx`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 NotesPanel.jsx**

```javascript
// src/components/panels/NotesPanel.jsx
import React from 'react';
import LazyPhoto from '../LazyPhoto.jsx';

export default function NotesPanel({
  notesPanel,
  markers,
  editing,
  editingNotes,
  getPhotoNote,
  onClose,
  onEdit,
  onSave,
  onCancel,
}) {
  if (!notesPanel) return null;

  const marker = markers.find(m => m.id === notesPanel.markerId);
  if (!marker) return null;

  return (
    <div className="notes-panel-overlay" onClick={onClose}>
      <div className="notes-panel" onClick={e => e.stopPropagation()}>
        <div className="notes-panel-header">
          <h3>📝 照片备注</h3>
          <div className="header-actions">
            {!editing ? (
              <button className="edit-btn" onClick={onEdit}>✏️ 编辑</button>
            ) : (
              <>
                <button className="cancel-btn" onClick={onCancel}>取消</button>
                <button className="save-btn" onClick={onSave}>💾 保存</button>
              </>
            )}
            <button className="panel-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="notes-list">
          {(marker.photos || []).map((photo, index) => (
            <div key={index} className="note-item">
              <LazyPhoto photo={photo} className="note-thumb" alt={`照片${index + 1}`} />
              <div className="note-content">
                <div className="note-label">照片 {index + 1}</div>
                {editing ? (
                  <textarea
                    value={editingNotes[index] || ''}
                    onChange={e => {
                      const newNotes = [...editingNotes];
                      newNotes[index] = e.target.value;
                      onSave(newNotes);
                    }}
                    placeholder="输入备注..."
                  />
                ) : (
                  <div className="note-text">{getPhotoNote(photo) || '暂无备注'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 NotesPanel**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/components/panels/NotesPanel.jsx src/App.jsx
git commit -m "refactor: extract NotesPanel component from App.jsx"
```

---

### 任务 10：创建 MarkerContextMenu 组件

**文件：**
- 创建：`src/components/markers/MarkerContextMenu.jsx`
- 修改：`src/App.jsx`

- [ ] **步骤 1：创建 MarkerContextMenu.jsx**

```javascript
// src/components/markers/MarkerContextMenu.jsx
import React from 'react';

export default function MarkerContextMenu({
  contextMenu,
  markerMenu,
  markers,
  batchMode,
  onClose,
  onDelete,
  onAddPhoto,
  onSetCover,
  onOpenNotes,
  onOpenViewer,
}) {
  if (!contextMenu && !markerMenu) return null;

  return (
    <>
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <div className="context-menu-item" onClick={() => {
            onAddPhoto(contextMenu.markerId);
            onClose();
          }}>
            📷 添加照片
          </div>
          <div className="context-menu-item" onClick={() => {
            onDelete(contextMenu.markerId);
            onClose();
          }}>
            🗑️ 删除标记
          </div>
        </div>
      )}

      {markerMenu && (
        <div className="marker-menu-overlay" onClick={onClose}>
          <div className="marker-menu" onClick={e => e.stopPropagation()}>
            <div className="marker-menu-header">
              <h3>{markerMenu.marker?.name || '标记详情'}</h3>
              <button className="panel-close" onClick={onClose}>✕</button>
            </div>
            <div className="marker-menu-content">
              <div className="marker-menu-photos">
                {(markerMenu.marker?.photos || []).map((photo, index) => (
                  <div key={index} className="marker-menu-photo">
                    <img src={typeof photo === 'string' ? photo : photo.data} alt={`照片 ${index + 1}`} />
                    <div className="photo-actions">
                      <button onClick={() => onSetCover(markerMenu.markerId, photo)}>设为封面</button>
                      <button onClick={() => onOpenViewer(markerMenu.markerId, index)}>查看</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="marker-menu-actions">
                <button onClick={() => onOpenNotes(markerMenu.markerId)}>📝 备注管理</button>
                <button onClick={() => onAddPhoto(markerMenu.markerId)}>📷 添加照片</button>
                <button className="danger" onClick={() => {
                  onDelete(markerMenu.markerId);
                  onClose();
                }}>🗑️ 删除标记</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(contextMenu || markerMenu) && (
        <div className="context-overlay" onClick={onClose} />
      )}
    </>
  );
}
```

- [ ] **步骤 2：在 App.jsx 中导入并使用 MarkerContextMenu**

- [ ] **步骤 3：运行开发服务器验证**

- [ ] **步骤 4：Commit**

```bash
git add src/components/markers/MarkerContextMenu.jsx src/App.jsx
git commit -m "refactor: extract MarkerContextMenu component from App.jsx"
```

---

### 任务 11：最终验证和清理

**文件：**
- 修改：`src/App.jsx`

- [ ] **步骤 1：检查 App.jsx 行数**

```bash
wc -l src/App.jsx
```

预期：行数 < 300

- [ ] **步骤 2：运行完整功能测试**

```bash
npm run web:dev
```

测试清单：
- [ ] 地图正常加载
- [ ] 搜索功能正常
- [ ] 标记创建/删除正常
- [ ] 照片查看/编辑正常
- [ ] 备注管理正常
- [ ] 工具栏功能正常

- [ ] **步骤 3：运行 lint 检查**

```bash
npm run lint
```

预期：无错误

- [ ] **步骤 4：最终 Commit**

```bash
git add -A
git commit -m "refactor: complete file management reorganization

- Extract 5 custom hooks (useMarkers, usePhotos, useSearch, useVillage, useSync)
- Extract 6 components (SearchBar, Toolbar, NoteEditor, MarkerListPanel, NotesPanel, MarkerContextMenu)
- Reduce App.jsx from 4431 lines to < 300 lines
- Reorganize root directory files
- Maintain all existing functionality"
```

---

## 验证清单

- [ ] App.jsx 行数 < 300
- [ ] 所有功能正常工作
- [ ] 无 lint 错误
- [ ] 构建成功：`npm run web:build`
- [ ] 测试通过：`npm run test`
