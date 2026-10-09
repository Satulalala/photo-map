import { useMemo, useState } from 'react';
import {
  DEFAULT_COUNTRY_PAGE_SIZE,
  getCountryDirectory,
  getCountryList,
  getCountryPage,
} from './lifePanelData.js';
import MapIcon from '../map/MapIcon.jsx';

export default function OverseasCountriesView({ countryCounts, onBack }) {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [sortMode, setSortMode] = useState('frequency');
  const [visibleCount, setVisibleCount] = useState(DEFAULT_COUNTRY_PAGE_SIZE);

  const directoryCount = useMemo(() => getCountryDirectory(countryCounts).length, [countryCounts]);
  const countryList = useMemo(
    () => getCountryList(countryCounts, { query, filterMode, sortMode }),
    [countryCounts, query, filterMode, sortMode]
  );
  const visibleCountries = useMemo(
    () => getCountryPage(countryList, visibleCount),
    [countryList, visibleCount]
  );

  const updateQuery = event => {
    setQuery(event.target.value);
    setVisibleCount(DEFAULT_COUNTRY_PAGE_SIZE);
  };

  const updateFilter = event => {
    setFilterMode(event.target.value);
    setVisibleCount(DEFAULT_COUNTRY_PAGE_SIZE);
  };

  const updateSort = event => {
    setSortMode(event.target.value);
    setVisibleCount(DEFAULT_COUNTRY_PAGE_SIZE);
  };

  return (
    <div className="life-view life-view-enter">
      <div className="life-panel-header">
        <button className="life-back-btn" onClick={onBack}>
          <MapIcon name="left" />
          返回
        </button>
        <h3>
          <MapIcon name="globe" />
          海外
        </h3>
        <div className="life-header-spacer" aria-hidden="true" />
      </div>
      <div className="life-panel-content">
        <section className="overseas-section" aria-labelledby="overseas-title">
          <div className="overseas-heading">
            <h4 id="overseas-title">常见目的地</h4>
            <span>{directoryCount} 个国家/地区</span>
          </div>
          <div className="overseas-controls">
            <input
              aria-label="搜索国家"
              className="overseas-input overseas-search"
              type="search"
              value={query}
              onChange={updateQuery}
              placeholder="搜索中文名、English name 或代码"
            />
            <select
              aria-label="国家筛选"
              className="overseas-select"
              value={filterMode}
              onChange={updateFilter}
            >
              <option value="all">全部目的地</option>
              <option value="visited">仅已到访</option>
              <option value="unvisited">仅未到访</option>
            </select>
            <select
              aria-label="国家排序"
              className="overseas-select"
              value={sortMode}
              onChange={updateSort}
            >
              <option value="frequency">按标记数排序</option>
              <option value="name">按名称排序</option>
            </select>
          </div>
          <p className="overseas-result-line" role="status" aria-live="polite">
            {query || filterMode !== 'all'
              ? `匹配 ${countryList.length} 个国家/地区，已显示 ${visibleCountries.length} 个`
              : `收录 ${directoryCount} 个国家/地区，已显示 ${visibleCountries.length} 个`}
          </p>
          {visibleCountries.length > 0 ? (
            <div className="overseas-list" role="list" aria-label="海外国家与地区列表">
              {visibleCountries.map(country => (
                <div
                  key={country.key}
                  className={`overseas-item ${country.visited ? 'visited' : 'unvisited'}`}
                  data-country-code={country.key.toUpperCase()}
                  role="listitem"
                >
                  <span className="overseas-globe" aria-hidden="true">
                    <MapIcon name="globe" />
                  </span>
                  <div className="overseas-country-main">
                    <strong className="overseas-name">{country.name}</strong>
                    <span className="overseas-code">{country.key.toUpperCase()}</span>
                  </div>
                  <div className="overseas-country-meta">
                    <span className="overseas-status">{country.visited ? '已到访' : '未到访'}</span>
                    {country.visited && (
                      <span className="overseas-count">{country.count} 条记录</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overseas-empty" role="status">
              <MapIcon name="search" />
              <span>没有匹配的国家或地区。试试英文名称、中文名或代码。</span>
            </div>
          )}
          {visibleCountries.length < countryList.length && (
            <button
              className="overseas-more-button"
              onClick={() => setVisibleCount(count => count + DEFAULT_COUNTRY_PAGE_SIZE)}
            >
              显示更多国家/地区
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
