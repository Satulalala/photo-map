import MapIcon from '../map/MapIcon.jsx';
function MenuCheck({ active }) {
  return active ? <MapIcon name="check" className="menu-check" /> : null;
}
const TIME_LABELS = {
  all: '全部时间',
  week: '最近一周',
  month: '最近一月',
  year: '最近一年',
  custom: '自定义时间',
};

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
        placeholder="搜索地点或备注..."
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
            type="button"
            aria-label="排序方式"
            className={`toolbar-btn ${showSortMenu ? 'active' : ''}`}
            onClick={e => {
              e.stopPropagation();
              onSortMenuToggle(!showSortMenu);
              onLayoutMenuToggle(false);
              onTimeFilterMenuToggle(false);
            }}
          >
            <span>{markerListSort === 'time' ? '按时间' : '按地名'}</span>
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
            type="button"
            aria-label="时间范围"
            className={`toolbar-btn ${showTimeFilterMenu ? 'active' : ''}`}
            onClick={e => {
              e.stopPropagation();
              onTimeFilterMenuToggle(!showTimeFilterMenu);
              onSortMenuToggle(false);
              onLayoutMenuToggle(false);
            }}
          >
            <span>{TIME_LABELS[markerListTimeFilter] || '全部时间'}</span>
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
        <div className="layout-seg-group" role="group" aria-label="布局方式">
          <button
            type="button"
            className="layout-seg-btn"
            aria-label="画廊布局"
            aria-pressed={markerListLayout === 'grid'}
            onClick={() => {
              onLayout('grid');
              onSortMenuToggle(false);
              onLayoutMenuToggle(false);
              onTimeFilterMenuToggle(false);
            }}
          >
            <MapIcon name="grid" />
            <span>画廊</span>
          </button>
          <button
            type="button"
            className="layout-seg-btn"
            aria-label="列表布局"
            aria-pressed={markerListLayout === 'list'}
            onClick={() => {
              onLayout('list');
              onSortMenuToggle(false);
              onLayoutMenuToggle(false);
              onTimeFilterMenuToggle(false);
            }}
          >
            <MapIcon name="list" />
            <span>列表</span>
          </button>
        </div>
      </div>
    </div>
  );
}
