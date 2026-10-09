import React, { Suspense, lazy } from 'react';
import SearchBar from '../map/SearchBar.jsx';
import Toolbar from '../map/Toolbar.jsx';
import LoginButtons from '../LoginButtons.jsx';
import WebDownloadButton from '../WebDownloadButton.jsx';
import MarkerListPanel from '../panels/MarkerListPanel.jsx';
import MergeDialog from '../panels/MergeDialog.jsx';
import MarkerContextMenu from '../MarkerContextMenu.jsx';
import PhotoViewer from '../photos/PhotoViewer.jsx';
import PhotoEditor from '../photos/PhotoEditor.jsx';
import NoteEditor from '../panels/NoteEditor.jsx';
import NotesPanel from '../panels/NotesPanel.jsx';
import Toast from '../Toast.jsx';

const SettingsPanel = lazy(() => import('../panels/SettingsPanel.jsx'));
const SocialPanel = lazy(() => import('../panels/SocialPanel.jsx'));
const LifePanel = lazy(() => import('../panels/LifePanel.jsx'));
const VillageModal = lazy(() => import('../panels/VillageModal.jsx'));

/**
 * MapOverlay —— 地图上层所有 UI 覆盖
 * 包含：搜索栏、工具栏、面板、对话框、Toast
 * 职责：UI 编排，不管理业务状态
 */
const MapOverlay = ({
  // ---- 地图引用 ----
  mapContainerRef,
  mapRef,
  mapMarkersRef,
  userLocationRef,

  // ---- 搜索 ----
  searchQuery,
  searchResults,
  showSearchResults,
  selectedResultIndex,
  isSearching,
  searchHistory,
  searchInputRef,
  handleSearchInput,
  handleSearchFocus,
  handleSearchKeyDown,
  selectSearchResult,
  handleClearSearch,
  clearSearchHistory,
  setSelectedResultIndex,
  setShowSearchResults,

  // ---- 认证 ----
  isLoggedIn,
  user,
  showButtons,
  onLogin,
  onSkip,
  onLogout,
  isWebVersion,

  // ---- 工具栏 ----
  measureMode,
  heatmapMode,
  showLife,
  goToMyLocation,
  zoomIn,
  zoomOut,
  toggleHeatmap,
  openLife,
  openSettings,

  // ---- 标记列表 ----
  showMarkerList,
  markerManageBtnRef,
  markerBtnReveal,
  totalPhotos,
  markers,
  markerListProps,

  // ---- 合并对话框 ----
  mergeDialogProps,

  // ---- 右键菜单 ----
  contextMenuProps,

  // ---- 照片查看/编辑 ----
  photoViewer,
  photoViewerProps,
  photoEditor,
  photoEditorProps,
  noteEditor,
  noteEditorProps,
  notesPanel,
  notesPanelProps,

  // ---- 面板 ----
  showSettings,
  settingsProps,
  showSocial,
  socialProps,
  lifePanelProps,

  // ---- 村庄 ----
  villageProps,

  // ---- 测量模式 ----
  measureStart,
  measureLines,
  clearMeasureLines,
  exitMeasureMode,

  // ---- Toast ----
  toast,
}) => {
  return (
    <>
      {/* 搜索栏 + 登录按钮 */}
      {!measureMode && (
        <div className="search-bar-container">
          {!isLoggedIn && showButtons ? (
            <LoginButtons
              onLogin={onLogin}
              onSkip={onSkip}
              onLogout={onLogout}
              isLoggedIn={isLoggedIn}
              showButtons={showButtons}
              user={user}
            />
          ) : (
            <SearchBar
              searchQuery={searchQuery}
              searchResults={searchResults}
              showSearchResults={showSearchResults}
              selectedResultIndex={selectedResultIndex}
              isSearching={isSearching}
              searchHistory={searchHistory}
              searchInputRef={searchInputRef}
              onInputChange={handleSearchInput}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              onSelectResult={selectSearchResult}
              onClear={handleClearSearch}
              onClearHistory={clearSearchHistory}
              onSelectedResultIndexChange={setSelectedResultIndex}
            />
          )}

          {isWebVersion && isLoggedIn && (
            <div className="web-download-beside-search">
              <WebDownloadButton />
            </div>
          )}
        </div>
      )}

      {/* 搜索结果关闭遮罩 */}
      {showSearchResults && (
        <div className="search-overlay" onClick={() => setShowSearchResults(false)} />
      )}

      {/* 工具栏 */}
      <Toolbar
        measureMode={measureMode}
        heatmapMode={heatmapMode}
        showLife={showLife}
        onLocate={goToMyLocation}
        onRefresh={() => window.location.reload()}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleHeatmap={toggleHeatmap}
        onOpenLife={openLife}
        onOpenSettings={openSettings}
      />

      {/* 标记管理按钮 */}
      {!measureMode && (
        <button
          ref={markerManageBtnRef}
          className={`marker-count-btn ${showMarkerList ? 'active origin-hidden' : ''} ${markerBtnReveal ? 'reveal-on-close' : ''}`}
          onClick={markerListProps?.onOpen}
        >
          <div className="marker-stats">
            <div className="stat-item">
              <span className="stat-icon">&#x1F5BC;</span>
              <span className="stat-num">{totalPhotos}</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">&#x1F4CD;</span>
              <span className="stat-num">{markers.length}</span>
            </div>
          </div>
        </button>
      )}

      {/* 标记列表面板 */}
      <MarkerListPanel {...markerListProps} />

      {/* 合并对话框 */}
      <MergeDialog {...mergeDialogProps} />

      {/* 测量模式 UI */}
      {measureMode && (
        <>
          <div className="measure-hint">
            &#x1F4CF; 测量模式 - {measureStart ? '点击选择终点' : '点击选择起点'}
          </div>
          <div className="measure-toolbar">
            {measureLines.length > 0 && (
              <button onClick={clearMeasureLines} className="measure-btn">
                &#x1F5D1; 清除测量
              </button>
            )}
            <button onClick={exitMeasureMode} className="measure-btn exit">
              &#x2715; 退出测量模式
            </button>
          </div>
        </>
      )}

      {/* 村庄弹窗 */}
      {villageProps?.show && (
        <Suspense fallback={null}>
          <VillageModal {...villageProps} />
        </Suspense>
      )}

      {/* 生活面板 */}
      {showLife && (
        <Suspense fallback={null}>
          <div className="life-panel-overlay" onClick={() => lifePanelProps?.onClose()}>
            <div
              className={`life-panel themed-floating-panel theme-${lifePanelProps?.uiThemeStyle || 'default'}`}
              onClick={e => e.stopPropagation()}
            >
              <LifePanel {...lifePanelProps?.lifeProps} />
            </div>
          </div>
        </Suspense>
      )}

      {/* 好友面板 */}
      {showSocial && (
        <Suspense fallback={null}>
          <SocialPanel onClose={socialProps?.onClose} />
        </Suspense>
      )}

      {/* 设置面板 */}
      {showSettings && settingsProps && (
        <Suspense fallback={null}>
          <SettingsPanel {...settingsProps} />
        </Suspense>
      )}

      {/* 右键菜单 */}
      <MarkerContextMenu {...contextMenuProps} />

      {/* 照片查看器 */}
      {photoViewer && <PhotoViewer {...photoViewerProps} />}

      {/* 照片编辑器 */}
      {photoEditor && <PhotoEditor {...photoEditorProps} />}

      {/* 备注编辑器 */}
      {noteEditor && <NoteEditor {...noteEditorProps} />}

      {/* 备注面板 */}
      {notesPanel && <NotesPanel {...notesPanelProps} />}

      {/* Toast */}
      <Toast toast={toast} />
    </>
  );
};

export default MapOverlay;
