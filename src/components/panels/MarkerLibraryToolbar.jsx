import MapIcon from '../map/MapIcon.jsx';
function MenuCheck({ active }) {
  return active ? <MapIcon name="check" className="menu-check" /> : null;
}
export default function MarkerLibraryToolbar({
  markerListSearch,
  onSearch,
  onSearchFocusIndexChange,
  searchResultsRef,
  showSortMenu,
  onSortMenuToggle,
  onLayoutMenuToggle,
  onTimeFilterMenuToggle,
  markerListSort,
  onSort,
  showLayoutMenu,
  markerListLayout,
  onLayout,
  showTimeFilterMenu,
  markerListTimeFilter,
  onTimeFilter,
  markerListTimeRange,
  onTimeRangeChange,
}) {
  return (
    <div className="marker-list-toolbar">
      <input
        type="search"
        aria-label="搜索相册"
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
            <span>排序方式</span>
            <MapIcon name="chevron" />
          </button>
          {showSortMenu && (
            <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className={`dropdown-item ${markerListSort === 'time' ? 'active' : ''}`}
                onClick={() => {
                  onSort('time');
                  onSortMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListSort === 'time'} />
                时间排序
              </button>
              <button
                type="button"
                className={`dropdown-item ${markerListSort === 'name' ? 'active' : ''}`}
                onClick={() => {
                  onSort('name');
                  onSortMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListSort === 'name'} />
                地名排序
              </button>
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
            <span>布局方式</span>
            <MapIcon name="chevron" />
          </button>
          {showLayoutMenu && (
            <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className={`dropdown-item ${markerListLayout === 'list' ? 'active' : ''}`}
                onClick={() => {
                  onLayout('list');
                  onLayoutMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListLayout === 'list'} />
                列表布局
              </button>
              <button
                type="button"
                className={`dropdown-item ${markerListLayout === 'grid' ? 'active' : ''}`}
                onClick={() => {
                  onLayout('grid');
                  onLayoutMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListLayout === 'grid'} />
                网格布局
              </button>
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
            <span>时间范围</span>
            <MapIcon name="chevron" />
          </button>
          {showTimeFilterMenu && (
            <div className="dropdown-menu time-filter-menu" onClick={e => e.stopPropagation()}>
              <button
                type="button"
                className={`dropdown-item ${markerListTimeFilter === 'all' ? 'active' : ''}`}
                onClick={() => {
                  onTimeFilter('all');
                  onTimeFilterMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListTimeFilter === 'all'} />
                全部时间
              </button>
              <button
                type="button"
                className={`dropdown-item ${markerListTimeFilter === 'week' ? 'active' : ''}`}
                onClick={() => {
                  onTimeFilter('week');
                  onTimeFilterMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListTimeFilter === 'week'} />
                最近一周
              </button>
              <button
                type="button"
                className={`dropdown-item ${markerListTimeFilter === 'month' ? 'active' : ''}`}
                onClick={() => {
                  onTimeFilter('month');
                  onTimeFilterMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListTimeFilter === 'month'} />
                最近一月
              </button>
              <button
                type="button"
                className={`dropdown-item ${markerListTimeFilter === 'year' ? 'active' : ''}`}
                onClick={() => {
                  onTimeFilter('year');
                  onTimeFilterMenuToggle(false);
                }}
              >
                <MenuCheck active={markerListTimeFilter === 'year'} />
                最近一年
              </button>
              <button
                type="button"
                className={`dropdown-item ${markerListTimeFilter === 'custom' ? 'active' : ''}`}
                onClick={() => {
                  onTimeFilter('custom');
                }}
              >
                <MenuCheck active={markerListTimeFilter === 'custom'} />
                自定义时间范围
              </button>
              {markerListTimeFilter === 'custom' && (
                <div className="custom-date-range" onClick={e => e.stopPropagation()}>
                  <div className="date-field">
                    <label htmlFor="marker-start-date">从</label>
                    <input
                      id="marker-start-date"
                      type="date"
                      value={markerListTimeRange.start}
                      onChange={e =>
                        onTimeRangeChange({ ...markerListTimeRange, start: e.target.value })
                      }
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                  <div className="date-field">
                    <label htmlFor="marker-end-date">至</label>
                    <input
                      id="marker-end-date"
                      type="date"
                      value={markerListTimeRange.end}
                      onChange={e =>
                        onTimeRangeChange({ ...markerListTimeRange, end: e.target.value })
                      }
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
  );
}
