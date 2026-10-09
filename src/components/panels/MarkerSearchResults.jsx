import LazyPhoto from '../photos/LazyPhoto.jsx';
import MarkerListItem, { highlightText } from './MarkerListItem.jsx';
import MapIcon from '../map/MapIcon.jsx';

export default function MarkerSearchResults({
  filteredMarkers,
  noteSearchResults,
  semanticResults,
  isNoteSearching,
  isSemanticSearching,
  markerListSearch,
  onSearchFocusIndexChange,
  searchResultsRef,
  searchFocusIndex,
  markers,
  batchMode,
  selectedPhotos,
  onPhotoSelect,
  onMarkerClick,
  onNoteClick,
  onSemanticClick,
}) {
  const hasMarkers = filteredMarkers.length > 0;
  const hasNotes = noteSearchResults.length > 0;
  // Filter out semantic results that already appear in keyword results
  const keywordMarkerIds = new Set(filteredMarkers.map(m => m.id));
  const noteMarkerIds = new Set(noteSearchResults.map(r => r.markerId));
  const dedupedSemantic = semanticResults.filter(
    r => !keywordMarkerIds.has(r.markerId) && !noteMarkerIds.has(r.markerId)
  );
  const hasSemantic = dedupedSemantic.length > 0;

  if (!hasMarkers && !hasNotes && !hasSemantic && !isNoteSearching && !isSemanticSearching) {
    return (
      <div className="marker-list-empty">未找到匹配 &ldquo;{markerListSearch}&rdquo; 的结果</div>
    );
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
          <div className="result-group-title">
            <MapIcon name="pin" />
            标记 ({filteredMarkers.length})
          </div>
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
          <div className="result-group-title">
            <MapIcon name="info" />
            备注
          </div>
          <div className="marker-list-empty">
            <span className="loading-spinner" /> 搜索中...
          </div>
        </div>
      ) : (
        hasNotes && (
          <div className="result-group">
            <div className="result-group-title">
              <MapIcon name="info" />
              备注 ({noteSearchResults.length})
            </div>
            {displayedNotes.map((result, i) => {
              const noteIdx = displayedMarkers.length + i;
              return (
                <div
                  key={`note-${i}`}
                  data-index={noteIdx}
                  className={`marker-list-item note-item ${searchFocusIndex === noteIdx ? 'focused' : ''}`}
                  onClick={() => onNoteClick(result)}
                >
                  <LazyPhoto
                    photo={result.data ? result : { id: result.fileId || result.id }}
                    className="marker-list-thumb"
                  />
                  <div className="marker-list-info">
                    <div className="marker-list-name">
                      &ldquo;{highlightText(result.note, markerListSearch)}&rdquo;
                    </div>
                    <div className="marker-list-meta">
                      <MapIcon name="pin" />{' '}
                      {highlightText(
                        result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`,
                        markerListSearch
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {noteSearchResults.length > 10 && (
              <div className="result-more">还有 {noteSearchResults.length - 10} 个结果...</div>
            )}
          </div>
        )
      )}

      {/* Semantic search results */}
      {isSemanticSearching ? (
        <div className="result-group">
          <div className="result-group-title">
            <MapIcon name="photo" />
            内容匹配
          </div>
          <div className="marker-list-empty">
            <span className="loading-spinner" /> 分析中...
          </div>
        </div>
      ) : (
        hasSemantic && (
          <div className="result-group">
            <div className="result-group-title">
              <MapIcon name="photo" />
              内容匹配 ({semanticResults.length})
            </div>
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
                      {result.note || result.markerName || '照片'}
                    </div>
                    <div className="marker-list-meta">
                      <MapIcon name="pin" />{' '}
                      {result.markerName || `${result.lat.toFixed(3)}°, ${result.lng.toFixed(3)}°`}
                      <span className="semantic-score">
                        {' '}
                        匹配度 {Math.round(result.score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {semanticResults.length > 10 && (
              <div className="result-more">还有 {semanticResults.length - 10} 个结果...</div>
            )}
          </div>
        )
      )}
    </div>
  );
}
