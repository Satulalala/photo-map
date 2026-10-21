import MarkerLibraryToolbar from './MarkerLibraryToolbar.jsx';
import React, { useRef } from 'react';
import MarkerListItem from './MarkerListItem.jsx';
import MarkerSearchResults from './MarkerSearchResults.jsx';
import MarkerGridItem from './MarkerGridItem.jsx';
import { matchMarkerName } from '../../utils/searchUtils.js';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';

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
  noteSearchResults,
  semanticResults,
  isNoteSearching,
  isSemanticSearching,
  searchFocusIndex,
  markerListReady,
  markerListClosing,
  markerListContentHidden,
  markerListRect,
  showSortMenu,
  showLayoutMenu,
  showTimeFilterMenu,
  onClose,
  onSearch,
  onSearchKeyDown,
  onSort,
  onLayout,
  onTimeFilter,
  onTimeRangeChange,
  onBatchToggle,
  onPhotoSelect,
  onSetCover,
  onDeletePhoto,
  onAddPhoto,
  onMarkerClick,
  onNoteClick,
  onSemanticClick,
  onSortMenuToggle,
  onLayoutMenuToggle,
  onTimeFilterMenuToggle,
  onSearchFocusIndexChange,
  onBatchDelete,
  onBatchMerge,
}) {
  const searchResultsRef = useRef(null);

  useDialogFocus(show, '.marker-list-panel', onClose);
  if (!show) return null;

  // Filter and sort markers
  const filteredMarkers = markers
    .filter(m => {
      // Search filter
      if (markerListSearch) {
        const name = m.name || `${m.lat.toFixed(3)}°, ${m.lng.toFixed(3)}°`;
        if (!matchMarkerName(markerListSearch, name)) return false;
      }
      // Time range filter
      if (markerListTimeFilter !== 'all') {
        const t = m.createdAt || 0;
        const now = Date.now();
        if (markerListTimeFilter === 'week' && t < now - 7 * 24 * 60 * 60 * 1000) return false;
        if (markerListTimeFilter === 'month' && t < now - 30 * 24 * 60 * 60 * 1000) return false;
        if (markerListTimeFilter === 'year' && t < now - 365 * 24 * 60 * 60 * 1000) return false;
        if (markerListTimeFilter === 'custom') {
          const start = markerListTimeRange.start
            ? new Date(markerListTimeRange.start).getTime()
            : 0;
          const end = markerListTimeRange.end
            ? new Date(markerListTimeRange.end).getTime()
            : Infinity;
          if (t < start || t > end) return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (markerListSort === 'time') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      } else {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'zh-CN');
      }
    });

  return (
    <div
      className={`marker-list-overlay ${markerListReady ? 'open' : ''} ${markerListClosing ? 'closing' : ''}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="我的相册"
        tabIndex={-1}
        className={`marker-list-panel themed-floating-panel theme-${uiThemeStyle} ${markerListReady ? 'open' : ''} ${markerListClosing ? 'closing' : ''} ${markerListContentHidden ? 'content-hidden' : ''}`}
        style={
          markerListRect
            ? {
                '--origin-x': `${markerListRect.x}px`,
                '--origin-y': `${markerListRect.y}px`,
                '--origin-size': `${markerListRect.size}px`,
                '--target-w': `${markerListRect.targetW}px`,
                '--target-h': `${markerListRect.targetH}px`,
                '--dx': `${markerListRect.dx}px`,
                '--dy': `${markerListRect.dy}px`,
                '--start-scale': markerListRect.startScale,
              }
            : undefined
        }
        onClick={e => {
          e.stopPropagation();
          onSortMenuToggle(false);
          onLayoutMenuToggle(false);
          onTimeFilterMenuToggle(false);
        }}
      >
        <div className="marker-list-panel-inner">
          <div className="marker-list-header">
            <h3>
              <MapIcon name="pin" />
              所有标记
            </h3>
            <div className="header-actions">
              <button className="batch-toggle-btn" onClick={onBatchToggle} aria-pressed={batchMode}>
                <MapIcon name={batchMode ? 'close' : 'layers'} />
                <span>{batchMode ? '退出批量' : '批量操作'}</span>
              </button>
              <button type="button" className="panel-close" onClick={onClose} aria-label="关闭相册">
                <MapIcon name="close" />
              </button>
            </div>
          </div>

          <MarkerLibraryToolbar
            markerListSearch={markerListSearch}
            onSearch={onSearch}
            onSearchFocusIndexChange={onSearchFocusIndexChange}
            searchResultsRef={searchResultsRef}
            showSortMenu={showSortMenu}
            onSortMenuToggle={onSortMenuToggle}
            onLayoutMenuToggle={onLayoutMenuToggle}
            onTimeFilterMenuToggle={onTimeFilterMenuToggle}
            markerListSort={markerListSort}
            onSort={onSort}
            showLayoutMenu={showLayoutMenu}
            markerListLayout={markerListLayout}
            onLayout={onLayout}
            showTimeFilterMenu={showTimeFilterMenu}
            markerListTimeFilter={markerListTimeFilter}
            onTimeFilter={onTimeFilter}
            markerListTimeRange={markerListTimeRange}
            onTimeRangeChange={onTimeRangeChange}
          />

          <div className="marker-list-content">
            {markersLoading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton-list-item">
                  <div className="skeleton-list-thumb" />
                  <div className="skeleton-list-info">
                    <div className="skeleton-text medium" />
                    <div className="skeleton-text short" />
                  </div>
                </div>
              ))
            ) : markerListSearch ? (
              // Search results display
              <MarkerSearchResults
                filteredMarkers={filteredMarkers}
                noteSearchResults={noteSearchResults}
                semanticResults={semanticResults}
                isNoteSearching={isNoteSearching}
                isSemanticSearching={isSemanticSearching}
                markerListSearch={markerListSearch}
                onSearchFocusIndexChange={onSearchFocusIndexChange}
                searchResultsRef={searchResultsRef}
                searchFocusIndex={searchFocusIndex}
                markers={markers}
                batchMode={batchMode}
                selectedPhotos={selectedPhotos}
                onPhotoSelect={onPhotoSelect}
                onMarkerClick={onMarkerClick}
                onNoteClick={onNoteClick}
                onSemanticClick={onSemanticClick}
              />
            ) : filteredMarkers.length === 0 ? (
              <div className="marker-list-empty empty-state">
                <MapIcon name="pin" />
                <span>暂无标记，点击地图添加</span>
              </div>
            ) : markerListLayout === 'grid' ? (
              // Grid layout
              <div className="marker-grid-container">
                {filteredMarkers.map(m => (
                  <MarkerGridItem
                    key={m.id}
                    marker={m}
                    allMarkers={markers}
                    batchMode={batchMode}
                    selectedPhotos={selectedPhotos}
                    onPhotoSelect={onPhotoSelect}
                    onSetCover={onSetCover}
                    onDeletePhoto={onDeletePhoto}
                    onAddPhoto={onAddPhoto}
                    onClick={() => onMarkerClick(m)}
                  />
                ))}
              </div>
            ) : (
              // List layout
              <div className="marker-list-scroll">
                {filteredMarkers.map(m => (
                  <MarkerListItem
                    key={m.id}
                    marker={m}
                    allMarkers={markers}
                    batchMode={batchMode}
                    selectedPhotos={selectedPhotos}
                    onPhotoSelect={onPhotoSelect}
                    onSetCover={onSetCover}
                    onDeletePhoto={onDeletePhoto}
                    onAddPhoto={onAddPhoto}
                    onClick={() => onMarkerClick(m)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Batch actions bar - fixed at bottom */}
          {batchMode && selectedPhotos.length > 0 && (
            <div className="batch-actions-bar">
              <span className="batch-count">已选 {selectedPhotos.length} 张</span>
              <div className="batch-buttons">
                <button
                  className="batch-btn batch-merge"
                  onClick={onBatchMerge}
                  disabled={selectedPhotos.length < 2}
                >
                  <MapIcon name="layers" />
                  整合
                </button>
                <button className="batch-btn batch-delete" onClick={onBatchDelete}>
                  <MapIcon name="trash" />
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
