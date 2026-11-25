import { useMemo, useState } from 'react';
import { PROVINCES, extractProvince, extractCountry, isDomesticLocation } from './lifePanelData.js';
import OverseasCountriesView from './OverseasCountriesView.jsx';
import LifeFootprintSection from './LifeFootprintSection.jsx';
import MapIcon from '../map/MapIcon.jsx';
import { useDialogFocus } from '../../hooks/useDialogFocus.js';

function useStats(markers, totalPhotos) {
  return useMemo(() => {
    const provinceCounts = {};
    const countryCounts = {};

    markers.forEach(m => {
      const p = extractProvince(m);
      if (p) provinceCounts[p] = (provinceCounts[p] || 0) + 1;

      const c = extractCountry(m);
      if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
    });

    const visitedCount = Object.keys(provinceCounts).length;
    const visitedCountryCount = Object.keys(countryCounts).length;
    const homelandCoverage = ((visitedCount / PROVINCES.length) * 100).toFixed(1);
    const domesticMarkerCount = markers.filter(isDomesticLocation).length;

    return {
      totalMarkers: markers.length,
      domesticMarkerCount,
      totalPhotos,
      visitedCount,
      visitedCountryCount,
      homelandCoverage,
      provinceCounts,
      sortedProvinces: Object.entries(provinceCounts).sort((a, b) => b[1] - a[1]),
      unvisited: PROVINCES.filter(p => !provinceCounts[p]),
      countryCounts,
    };
  }, [markers, totalPhotos]);
}

function viewClass(direction) {
  if (direction === 'back') return 'life-view life-view-back';
  if (direction === 'forward') return 'life-view life-view-forward';
  return 'life-view life-view-enter';
}

export default function LifePanel({
  open = true,
  markers,
  totalPhotos,
  onClose,
  onSelectMarker,
  onPreviewPhoto,
}) {
  useDialogFocus(open, '.life-panel', onClose);
  const [view, setView] = useState('global');
  const [direction, setDirection] = useState('enter');
  const stats = useStats(markers, totalPhotos);

  const goView = (target, dir = 'forward') => {
    setDirection(dir);
    setView(target);
  };
  if (view === 'china') {
    return (
      <div key={view} className={viewClass(direction)}>
        <div className="life-panel-header">
          <button className="life-back-btn" onClick={() => goView('global', 'back')}>
            <MapIcon name="left" />
            返回
          </button>
          <h3>
            <MapIcon name="map" />
            中国
          </h3>
          <div className="life-header-spacer" aria-hidden="true" />
        </div>
        <div className="life-panel-content">
          <div className="social-overview-cards">
            <div className="soc-card">
              <div className="soc-card-icon">
                <MapIcon name="check" />
              </div>
              <div className="soc-card-value">{stats.visitedCount}</div>
              <div className="soc-card-label">已到访</div>
            </div>
            <div className="soc-card">
              <div className="soc-card-icon">
                <MapIcon name="globe" />
              </div>
              <div className="soc-card-value">{stats.unvisited.length}</div>
              <div className="soc-card-label">未到访</div>
            </div>
            <div className="soc-card">
              <div className="soc-card-icon">
                <MapIcon name="pin" />
              </div>
              <div className="soc-card-value">{stats.domesticMarkerCount}</div>
              <div className="soc-card-label">国内标记</div>
            </div>
            <div className="soc-card">
              <div className="soc-card-icon">
                <MapIcon name="globe" />
              </div>
              <div className="soc-card-value">{stats.homelandCoverage}%</div>
              <div className="soc-card-label">覆盖率</div>
            </div>
          </div>
          <div className="social-section">
            <h3>
              <MapIcon name="pin" />
              已到访省份
            </h3>
            <div className="province-drill-list">
              {stats.sortedProvinces.map(([p, count], i) => (
                <div key={p} className="province-drill-item no-arrow">
                  <span className="pdl-rank">{i + 1}</span>
                  <span className="pdl-name">{p}</span>
                  <div className="pdl-bar-wrap">
                    <div
                      className="pdl-bar"
                      style={{
                        '--stagger-index': Math.min(i, 9),
                        width: `${Math.min(100, (count / stats.sortedProvinces[0][1]) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="pdl-count">{count}个</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'overseas') {
    return (
      <OverseasCountriesView
        key={view}
        countryCounts={stats.countryCounts}
        transitionClass={viewClass(direction)}
        onBack={() => goView('global', 'back')}
      />
    );
  }

  return (
    <div key={view} className={viewClass(direction)}>
      <div className="life-panel-header">
        <h3>
          <MapIcon name="life" />
          生活
        </h3>
        <button className="life-close-btn" aria-label="关闭生活面板" onClick={onClose}>
          <MapIcon name="close" />
        </button>
      </div>
      <div className="life-panel-content">
        <div className="life-metrics-strip" aria-label="足迹统计">
          <div className="life-metric-cell">
            <strong>{stats.totalMarkers}</strong>
            <span>标记地点</span>
          </div>
          <div className="life-metric-cell">
            <strong>{stats.totalPhotos}</strong>
            <span>照片存档</span>
          </div>
          <div className="life-metric-cell">
            <strong>{stats.visitedCount}</strong>
            <span>国内省份</span>
          </div>
          <div className="life-metric-cell">
            <strong>{stats.visitedCountryCount}</strong>
            <span>海外地区</span>
          </div>
        </div>

        <div className="life-global-cards">
          <button type="button" className="life-globe-card" onClick={() => goView('china')}>
            <div className="lgc-icon" aria-hidden="true">
              <MapIcon name="map" />
            </div>
            <div className="lgc-info">
              <strong>中国</strong>
              <span>
                {stats.visitedCount} 省 · {stats.homelandCoverage}%
              </span>
              <div className="lgc-progress" aria-hidden="true">
                <i
                  style={{
                    width: `${stats.visitedCount ? Math.max(8, Number(stats.homelandCoverage)) : 0}%`,
                  }}
                />
              </div>
            </div>
            <MapIcon name="right" className="lgc-arrow" />
          </button>
          <button type="button" className="life-globe-card" onClick={() => goView('overseas')}>
            <div className="lgc-icon">
              <MapIcon name="globe" />
            </div>
            <div className="lgc-info">
              <strong>海外</strong>
              <span>{stats.visitedCountryCount} 个国家/地区</span>
              <div className="lgc-progress" aria-hidden="true">
                <i
                  style={{
                    width: `${stats.visitedCountryCount ? Math.max(8, Math.min(100, stats.visitedCountryCount * 5)) : 0}%`,
                  }}
                />
              </div>
            </div>
            <MapIcon name="right" className="lgc-arrow" />
          </button>
        </div>

        <LifeFootprintSection
          markers={markers}
          onSelectMarker={onSelectMarker}
          onPreviewPhoto={onPreviewPhoto}
        />
      </div>
    </div>
  );
}
