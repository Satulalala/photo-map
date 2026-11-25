import { useId } from 'react';
import MapIcon from './MapIcon.jsx';

/**
 * 根据搜索结果类型返回对应的图标
 */
function getResultIcon(result) {
  const type = result.type || '';
  if (type.includes('餐饮')) return 'restaurant';
  if (type.includes('酒店') || type.includes('住宿')) return 'hotel';
  if (type.includes('风景') || type.includes('公园') || type.includes('旅游')) return 'park';
  if (type.includes('医疗') || type.includes('医院')) return 'medical';
  if (type.includes('学校') || type.includes('教育')) return 'school';
  if (type.includes('购物') || type.includes('商场')) return 'shopping';
  if (type.includes('交通') || type.includes('站') || type.includes('地铁')) return 'transit';
  if (type.includes('银行') || type.includes('金融')) return 'bank';
  if (type.includes('政府') || type.includes('机关')) return 'government';
  if (type.includes('小区') || type.includes('住宅')) return 'home';
  if (type.includes('写字楼') || type.includes('公司')) return 'office';
  if (type.includes('地名') || type === 'region') return 'map';
  return 'pin';
}

function findMatchedMarker(item, markers) {
  if (!markers?.length || !item) return null;
  const itemName = (item.name || '').trim().toLowerCase();
  return (
    markers.find(marker => {
      const markerName = (marker.name || '').trim().toLowerCase();
      if (
        itemName.length >= 2 &&
        markerName &&
        (markerName === itemName ||
          markerName.includes(itemName) ||
          itemName.includes(markerName))
      ) {
        return true;
      }
      if (
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng) &&
        Number.isFinite(marker.lat) &&
        Number.isFinite(marker.lng)
      ) {
        return Math.abs(marker.lat - item.lat) < 0.0025 && Math.abs(marker.lng - item.lng) < 0.0025;
      }
      return false;
    }) || null
  );
}

export default function SearchBar({
  searchQuery,
  searchResults,
  showSearchResults,
  selectedResultIndex,
  isSearching,
  searchHistory,
  searchInputRef,
  markers = [],
  onInputChange,
  onFocus,
  onKeyDown,
  onSelectResult,
  onClear,
  onClearHistory,
  onSelectedResultIndexChange,
}) {
  const id = useId();
  const items = searchQuery ? searchResults : searchHistory;
  const hasActiveOption =
    showSearchResults &&
    !isSearching &&
    selectedResultIndex >= 0 &&
    selectedResultIndex < items.length;
  return (
    <div className="search-bar-wrapper">
      <div className="search-bar">
        <span className="search-icon">
          <MapIcon name="search" />
        </span>
        <input
          type="text"
          role="combobox"
          aria-label="搜索地点或地址"
          aria-autocomplete="list"
          aria-expanded={showSearchResults}
          aria-controls={showSearchResults ? `${id}-results` : undefined}
          aria-activedescendant={
            hasActiveOption ? `${id}-option-${selectedResultIndex}` : undefined
          }
          autoComplete="off"
          placeholder="搜索地点或地址"
          value={searchQuery}
          onChange={e => onInputChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          ref={searchInputRef}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="清空搜索"
            className="search-clear"
            onClick={e => {
              e.preventDefault();
              onClear();
              searchInputRef.current?.focus();
            }}
          >
            <MapIcon name="close" />
          </button>
        )}
      </div>

      {/* 搜索结果/历史 */}
      {showSearchResults && (
        <div className="search-results" aria-busy={isSearching}>
          {isSearching ? (
            <div className="search-loading" id={`${id}-results`} role="status">
              <span className="loading-spinner" />
              搜索中...
            </div>
          ) : searchQuery && searchResults.length > 0 ? (
            <div id={`${id}-results`} role="listbox" aria-label="搜索结果">
              {searchResults.map((result, i) => {
                const matched = findMatchedMarker(result, markers);
                const photoCount = matched
                  ? matched.photoCount ?? matched.photos?.length ?? 0
                  : null;
                return (
                  <div
                    id={`${id}-option-${i}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={selectedResultIndex === i}
                    onMouseDown={event => event.preventDefault()}
                    key={i}
                    className={`search-result-item ${selectedResultIndex === i ? 'selected' : ''}`}
                    onClick={() => onSelectResult(result)}
                    onMouseEnter={() => onSelectedResultIndexChange(i)}
                  >
                    <span className="result-icon" aria-hidden="true">
                      <MapIcon name={getResultIcon(result)} />
                    </span>
                    <div className="result-info">
                      <div className="result-name">{result.name}</div>
                      <div className="result-address">{result.address}</div>
                    </div>
                    <div className="result-meta">
                      {matched && (
                        <span className="result-footprint-badge">
                          {photoCount > 0 ? `已有 ${photoCount} 张` : '已有标记'}
                        </span>
                      )}
                      {result.distance && <span className="result-distance">{result.distance}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : searchQuery ? (
            <div className="search-empty" id={`${id}-results`} role="status">
              未找到 &ldquo;{searchQuery}&rdquo; 相关地点，请尝试完整地址
            </div>
          ) : searchHistory.length > 0 ? (
            <>
              <div className="search-history-header">
                <span className="search-history-title">
                  <MapIcon name="history" />
                  搜索历史
                </span>
                <button type="button" onClick={onClearHistory} aria-label="清除搜索历史">
                  清除
                </button>
              </div>
              <div id={`${id}-results`} role="listbox" aria-label="搜索历史">
                {searchHistory.map((item, i) => {
                  const matched = findMatchedMarker(item, markers);
                  const photoCount = matched
                    ? matched.photoCount ?? matched.photos?.length ?? 0
                    : null;
                  return (
                    <div
                      id={`${id}-option-${i}`}
                      role="option"
                      tabIndex={-1}
                      aria-selected={selectedResultIndex === i}
                      onMouseDown={event => event.preventDefault()}
                      key={i}
                      className={`search-result-item history-item ${selectedResultIndex === i ? 'selected' : ''}`}
                      onClick={() => onSelectResult(item)}
                      onMouseEnter={() => onSelectedResultIndexChange(i)}
                    >
                      <span className="result-icon" aria-hidden="true">
                        <MapIcon name="history" />
                      </span>
                      <div className="result-info">
                        <div className="result-name">{item.name}</div>
                        <div className="result-address">{item.address}</div>
                      </div>
                      {matched && (
                        <div className="result-meta">
                          <span className="result-footprint-badge">
                            {photoCount > 0 ? `已有 ${photoCount} 张` : '已有标记'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="search-tip" id={`${id}-results`} role="status">
              输入地名、地址搜索
            </div>
          )}
        </div>
      )}
    </div>
  );
}
