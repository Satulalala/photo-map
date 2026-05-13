import React, { useRef } from 'react';
import LazyPhoto from '../photos/LazyPhoto.jsx';
import MarkerListItem, { highlightText } from './MarkerListItem.jsx';
import MarkerGridItem from './MarkerGridItem.jsx';
import { matchMarkerName } from '../../utils/searchUtils.js';

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
  embeddingProgress,
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
          const start = markerListTimeRange.start ? new Date(markerListTimeRange.start).getTime() : 0;
          const end = markerListTimeRange.end ? new Date(markerListTimeRange.end).getTime() : Infinity;
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
    <div className={`marker-list-overlay ${markerListReady ? 'open' : ''} ${markerListClosing ? 'closing' : ''}`} onClick={onClose}>
      <div
        className={`marker-list-panel themed-floating-panel theme-${uiThemeStyle} ${markerListReady ? 'open' : ''} ${markerListClosing ? 'closing' : ''} ${markerListContentHidden ? 'content-hidden' : ''}`}
        style={markerListRect ? {
          '--origin-x': `${markerListRect.x}px`,
          '--origin-y': `${markerListRect.y}px`,
          '--origin-size': `${markerListRect.size}px`,
          '--target-w': `${markerListRect.targetW}px`,
          '--target-h': `${markerListRect.targetH}px`,
          '--dx': `${markerListRect.dx}px`,
          '--dy': `${markerListRect.dy}px`,
          '--start-scale': markerListRect.startScale,
        } : undefined}
        onClick={e => {
          e.stopPropagation();
          onSortMenuToggle(false);
          onLayoutMenuToggle(false);
          onTimeFilterMenuToggle(false);
        }}
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
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  onSearchFocusIndexChange(0);
                  searchResultsRef.current?.focus();
                } else if (e.key === 'Enter' && markerListSearch.trim()) {
                  e.preventDefault();
                  onSearchFocusIndexChange(0);
                  searchResultsRef.current?.focus();
                }
              }}
              className="marker-search"
            />
            <div className="toolbar-actions">
              <div className="dropdown-wrapper">
                <button
                  className={`toolbar-btn ${showSortMenu ? 'active' : ''}`}
                  onClick={e => {
                    e.stopPropagation();
                    onSortMenuToggle(!showSortMenu);
                    onLayoutMenuToggle(false);
                    onTimeFilterMenuToggle(false);
                  }}
                >
                  排序方式 ▾
                </button>
                {showSortMenu && (
                  <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                    <div
                      className={`dropdown-item ${markerListSort === 'time' ? 'active' : ''}`}
                      onClick={() => { onSort('time'); onSortMenuToggle(false); }}
                    >
                      {markerListSort === 'time' ? '✓ ' : ''}时间排序
                    </div>
                    <div
                      className={`dropdown-item ${markerListSort === 'name' ? 'active' : ''}`}
                      onClick={() => { onSort('name'); onSortMenuToggle(false); }}
                    >
                      {markerListSort === 'name' ? '✓ ' : ''}地名排序
                    </div>
                  </div>
                )}
              </div>
              <div className="dropdown-wrapper">
                <button
                  className={`toolbar-btn ${showLayoutMenu ? 'active' : ''}`}
                  onClick={e => {
                    e.stopPropagation();
                    onLayoutMenuToggle(!showLayoutMenu);
                    onSortMenuToggle(false);
                    onTimeFilterMenuToggle(false);
                  }}
                >
                  布局方式 ▾
                </button>
                {showLayoutMenu && (
                  <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                    <div
                      className={`dropdown-item ${markerListLayout === 'list' ? 'active' : ''}`}
                      onClick={() => { onLayout('list'); onLayoutMenuToggle(false); }}
                    >
                      {markerListLayout === 'list' ? '✓ ' : ''}列表布局
                    </div>
                    <div
                      className={`dropdown-item ${markerListLayout === 'grid' ? 'active' : ''}`}
                      onClick={() => { onLayout('grid'); onLayoutMenuToggle(false); }}
                    >
                      {markerListLayout === 'grid' ? '✓ ' : ''}网格布局
                    </div>
                  </div>
                )}
              </div>
              <div className="dropdown-wrapper">
                <button
                  className={`toolbar-btn ${showTimeFilterMenu ? 'active' : ''}`}
                  onClick={e => {
                    e.stopPropagation();
                    onTimeFilterMenuToggle(!showTimeFilterMenu);
                    onSortMenuToggle(false);
                    onLayoutMenuToggle(false);
                  }}
                >
                  时间范围 ▾
                </button>
                {showTimeFilterMenu && (
                  <div className="dropdown-menu time-filter-menu" onClick={e => e.stopPropagation()}>
                    <div
                      className={`dropdown-item ${markerListTimeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => { onTimeFilter('all'); onTimeFilterMenuToggle(false); }}
                    >
                      {markerListTimeFilter === 'all' ? '✓ ' : ''}全部时间
                    </div>
                    <div
                      className={`dropdown-item ${markerListTimeFilter === 'week' ? 'active' : ''}`}
                      onClick={() => { onTimeFilter('week'); onTimeFilterMenuToggle(false); }}
                    >
                      {markerListTimeFilter === 'week' ? '✓ ' : ''}最近一周
                    </div>
                    <div
                      className={`dropdown-item ${markerListTimeFilter === 'month' ? 'active' : ''}`}
                      onClick={() => { onTimeFilter('month'); onTimeFilterMenuToggle(false); }}
                    >
                      {markerListTimeFilter === 'month' ? '✓ ' : ''}最近一月
                    </div>
                    <div
                      className={`dropdown-item ${markerListTimeFilter === 'year' ? 'active' : ''}`}
                      onClick={() => { onTimeFilter('year'); onTimeFilterMenuToggle(false); }}
                    >
                      {markerListTimeFilter === 'year' ? '✓ ' : ''}最近一年
                    </div>
                    <div
                      className={`dropdown-item ${markerListTimeFilter === 'custom' ? 'active' : ''}`}
                      onClick={() => { onTimeFilter('custom'); }}
                    >
                      {markerListTimeFilter === 'custom' ? '✓ ' : ''}自定义时间范围
                    </div>
                    {markerListTimeFilter === 'custom' && (
                      <div className="custom-date-range" onClick={e => e.stopPropagation()}>
                        <div className="date-field">
                          <label>从</label>
                          <input
                            type="date"
                            value={markerListTimeRange.start}
                            onChange={e => onTimeRangeChange({ ...markerListTimeRange, start: e.target.value })}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                        <div className="date-field">
                          <label>至</label>
                          <input
                            type="date"
                            value={markerListTimeRange.end}
                            onChange={e => onTimeRangeChange({ ...markerListTimeRange, end: e.target.value })}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {embeddingProgress && (
            <div className="embedding-progress">
              <div className="embedding-progress-bar">
                <div className="embedding-progress-fill" style={{ width: `${embeddingProgress.percent}%` }} />
              </div>
              <span className="embedding-progress-text">
                下载语义搜索模型 {embeddingProgress.percent}%
              </span>
            </div>
          )}

          <div className="marker-list-content">
            {markersLoading ? (
              [1,2,3,4].map(i => (
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
              (() => {
                const hasMarkers = filteredMarkers.length > 0;
                const hasNotes = noteSearchResults.length > 0;
                // Filter out semantic results that already appear in keyword results
                const keywordMarkerIds = new Set(filteredMarkers.map(m => m.id));
                const noteMarkerIds = new Set(noteSearchResults.map(r => r.markerId));
                const dedupedSemantic = semanticResults.filter(r =>
                  !keywordMarkerIds.has(r.markerId) && !noteMarkerIds.has(r.markerId)
                );
                const hasSemantic = dedupedSemantic.length > 0;

                if (!hasMarkers && !hasNotes && !hasSemantic && !isNoteSearching && !isSemanticSearching) {
                  return <div className="marker-list-empty">未找到匹配 "{markerListSearch}" 的结果</div>;
                }

                const displayedMarkers = filteredMarkers.slice(0, 10);
                const displayedNotes = noteSearchResults.slice(0, 10);
                const displayedSemantic = dedupedSemantic.slice(0, 10);
                const totalDisplayed = displayedMarkers.length + displayedNotes.length + displayedSemantic.length;

                const handleSearchKeyDown = e => {
                  if (totalDisplayed === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    onSearchFocusIndexChange(prev => {
                      const next = Math.min(prev + 1, totalDisplayed - 1);
                      const el = searchResultsRef.current?.querySelector(`[data-index="${next}"]`);
                      el?.scrollIntoView({ block: 'nearest' });
                      return next;
                    });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    onSearchFocusIndexChange(prev => {
                      if (prev <= 0) {
                        document.querySelector('.marker-search')?.focus();
                        return -1;
                      }
                      const next = prev - 1;
                      const el = searchResultsRef.current?.querySelector(`[data-index="${next}"]`);
                      el?.scrollIntoView({ block: 'nearest' });
                      return next;
                    });
                  } else if (e.key === 'Enter' && searchFocusIndex >= 0) {
                    e.preventDefault();
                    const el = searchResultsRef.current?.querySelector(`[data-index="${searchFocusIndex}"]`);
                    el?.click();
                  }
                };

                return (
                  <div
                    ref={searchResultsRef}
                    tabIndex={-1}
                    className="search-results-grouped"
                    onKeyDown={handleSearchKeyDown}
                  >
                    {/* Marker results */}
                    {hasMarkers && (
                      <div className="result-group">
                        <div className="result-group-title">📍 标记 ({filteredMarkers.length})</div>
                        {displayedMarkers.map((m, idx) => (
                          <MarkerListItem
                            key={m.id}
                            marker={m}
                            highlight={markerListSearch}
                            focused={searchFocusIndex === idx}
                            dataIndex={idx}
                            allMarkers={markers}
                            batchMode={batchMode}
                            selectedPhotos={selectedPhotos}
                            onPhotoSelect={onPhotoSelect}
                            onClick={() => onMarkerClick(m)}
                          />
                        ))}
                        {filteredMarkers.length > 10 && (
                          <div className="result-more">还有 {filteredMarkers.length - 10} 个结果...</div>
                        )}
                      </div>
                    )}

                    {/* Note results */}
                    {isNoteSearching ? (
                      <div className="result-group">
                        <div className="result-group-title">📝 备注</div>
                        <div className="marker-list-empty"><span className="loading-spinner" /> 搜索中...</div>
                      </div>
                    ) : hasNotes && (
                      <div className="result-group">
                        <div className="result-group-title">📝 备注 ({noteSearchResults.length})</div>
                        {displayedNotes.map((result, i) => {
                          const noteIdx = displayedMarkers.length + i;
                          return (
                            <div
                              key={`note-${i}`}
                              data-index={noteIdx}
                              className={`marker-list-item note-item ${searchFocusIndex === noteIdx ? 'focused' : ''}`}
                              onClick={() => onNoteClick(result)}
                            >
                              <LazyPhoto photo={result.data ? result : { id: result.fileId || result.id }} className="marker-list-thumb" />
                              <div className="marker-list-info">
                                <div className="marker-list-name">"{highlightText(result.note, markerListSearch)}"</div>
                                <div className="marker-list-meta">
                                  📍 {highlightText(result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`, markerListSearch)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {noteSearchResults.length > 10 && (
                          <div className="result-more">还有 {noteSearchResults.length - 10} 个结果...</div>
                        )}
                      </div>
                    )}

                    {/* Semantic search results */}
                    {isSemanticSearching ? (
                      <div className="result-group">
                        <div className="result-group-title">🖼️ 内容匹配</div>
                        <div className="marker-list-empty"><span className="loading-spinner" /> 分析中...</div>
                      </div>
                    ) : hasSemantic && (
                      <div className="result-group">
                        <div className="result-group-title">🖼️ 内容匹配 ({semanticResults.length})</div>
                        {displayedSemantic.map((result, i) => {
                          const noteIdx = displayedMarkers.length + displayedNotes.length + i;
                          return (
                            <div
                              key={`semantic-${i}`}
                              data-index={noteIdx}
                              className={`marker-list-item note-item ${searchFocusIndex === noteIdx ? 'focused' : ''}`}
                              onClick={() => onSemanticClick(result)}
                            >
                              <LazyPhoto photo={{ id: result.photoId }} className="marker-list-thumb" />
                              <div className="marker-list-info">
                                <div className="marker-list-name">
                                  🖼️ {result.note || result.markerName || '照片'}
                                </div>
                                <div className="marker-list-meta">
                                  📍 {result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`}
                                  <span className="semantic-score"> 匹配度 {Math.round(result.score * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {semanticResults.length > 10 && (
                          <div className="result-more">还有 {semanticResults.length - 10} 个结果...</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : filteredMarkers.length === 0 ? (
              <div className="marker-list-empty">暂无标记，点击地图添加</div>
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
                  🔗 整合
                </button>
                <button
                  className="batch-btn batch-delete"
                  onClick={onBatchDelete}
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
