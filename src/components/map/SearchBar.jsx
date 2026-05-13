/**
 * 根据搜索结果类型返回对应的图标
 */
function getResultIcon(result) {
  const type = result.type || '';
  if (type.includes('餐饮')) return '🍽️';
  if (type.includes('酒店') || type.includes('住宿')) return '🏨';
  if (type.includes('风景') || type.includes('公园') || type.includes('旅游')) return '🏞️';
  if (type.includes('医疗') || type.includes('医院')) return '🏥';
  if (type.includes('学校') || type.includes('教育')) return '🏫';
  if (type.includes('购物') || type.includes('商场')) return '🛒';
  if (type.includes('交通') || type.includes('站') || type.includes('地铁')) return '🚉';
  if (type.includes('银行') || type.includes('金融')) return '🏦';
  if (type.includes('政府') || type.includes('机关')) return '🏛️';
  if (type.includes('小区') || type.includes('住宅')) return '🏘️';
  if (type.includes('写字楼') || type.includes('公司')) return '🏢';
  if (type.includes('地名') || type === 'region') return '🗺️';
  return '📍';
}

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
  onClear,
  onClearHistory,
  onSelectedResultIndexChange,
}) {
  return (
    <div className="search-bar-wrapper">
      <label className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索地点..."
          value={searchQuery}
          onChange={e => onInputChange(e.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          ref={searchInputRef}
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear"
            onClick={e => {
              e.preventDefault();
              onClear();
              searchInputRef.current?.focus();
            }}
          >✕</button>
        )}
      </label>

      {/* 搜索结果/历史 */}
      {showSearchResults && (
        <div className="search-results">
          {isSearching ? (
            <div className="search-loading">
              <span className="loading-spinner" />搜索中...
            </div>
          ) : searchQuery && searchResults.length > 0 ? (
            searchResults.map((result, i) => (
              <div
                key={i}
                className={`search-result-item ${selectedResultIndex === i ? 'selected' : ''}`}
                onClick={() => onSelectResult(result)}
                onMouseEnter={() => onSelectedResultIndexChange(i)}
              >
                <span className="result-icon">{getResultIcon(result)}</span>
                <div className="result-info">
                  <div className="result-name">{result.name}</div>
                  <div className="result-address">{result.address}</div>
                </div>
                <span className="result-distance">{result.distance}</span>
              </div>
            ))
          ) : searchQuery ? (
            <div className="search-empty">未找到 &ldquo;{searchQuery}&rdquo; 相关地点</div>
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
                  onMouseEnter={() => onSelectedResultIndexChange(i)}
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
  );
}
