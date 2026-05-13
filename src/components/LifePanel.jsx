import { useMemo, useState } from 'react';
import { PROVINCES, ALL_COUNTRIES, TOP_20_HOT_COUNTRIES, extractProvince, extractCountry } from './lifePanelData.js';
import usePoster from './usePoster.js';

function useStats(markers, totalPhotos) {
  return useMemo(() => {
    const provinceCounts = {};
    const countryCounts = {};

    markers.forEach(m => {
      const place = m.name || m.placeName || '';
      const p = extractProvince(place);
      if (p) provinceCounts[p] = (provinceCounts[p] || 0) + 1;

      const c = extractCountry(place);
      if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
    });

    const visitedCount = Object.keys(provinceCounts).length;
    const visitedCountryCount = Object.keys(countryCounts).length;
    const homelandCoverage = ((visitedCount / PROVINCES.length) * 100).toFixed(1);
    const globalCoverage = ((visitedCountryCount / ALL_COUNTRIES.length) * 100).toFixed(1);

    return {
      totalMarkers: markers.length,
      totalPhotos,
      visitedCount,
      visitedCountryCount,
      homelandCoverage,
      globalCoverage,
      provinceCounts,
      sortedProvinces: Object.entries(provinceCounts).sort((a, b) => b[1] - a[1]),
      unvisited: PROVINCES.filter(p => !provinceCounts[p]),
      countryCounts,
    };
  }, [markers, totalPhotos]);
}

function viewClass(viewAnim) {
  return `life-view ${viewAnim === 'enter' ? 'life-view-enter' : ''} ${viewAnim === 'exit' ? 'life-view-exit' : ''}`;
}

export default function LifePanel({ markers, totalPhotos, user, onClose }) {
  const [view, setView] = useState('global');
  const [viewAnim, setViewAnim] = useState('enter');
  const [customQuery, setCustomQuery] = useState('');
  const [customCountInput, setCustomCountInput] = useState('20');
  const [sortMode, setSortMode] = useState('heat');
  const [filterMode, setFilterMode] = useState('all');
  const [isEditingOverseas, setIsEditingOverseas] = useState(false);
  const stats = useStats(markers, totalPhotos);

  const poster = usePoster({ markers, user, stats });

  const goView = target => {
    setViewAnim('exit');
    setTimeout(() => {
      setView(target);
      setViewAnim('enter');
      setTimeout(() => setViewAnim(''), 220);
    }, 180);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}?invite=${encodeURIComponent(user?.username || 'friend')}`;
    navigator.clipboard?.writeText(link).then(() => alert('邀请链接已复制！'));
  };

  const customCount = useMemo(() => {
    const parsed = Number(customCountInput);
    if (!Number.isFinite(parsed) || parsed <= 0) return 1;
    return Math.min(300, Math.floor(parsed));
  }, [customCountInput]);

  const overseasDisplay = useMemo(() => {
    const visitedMap = stats.countryCounts;

    const nonTopVisited = ALL_COUNTRIES
      .filter(c => !TOP_20_HOT_COUNTRIES.some(t => t.key === c.key) && visitedMap[c.key])
      .sort((a, b) => visitedMap[b.key] - visitedMap[a.key]);

    const baseTop = TOP_20_HOT_COUNTRIES.filter(c => !nonTopVisited.some(v => v.key === c.key));
    const untouched = ALL_COUNTRIES.filter(c => !nonTopVisited.some(v => v.key === c.key) && !baseTop.some(t => t.key === c.key));

    const basePool = [...nonTopVisited, ...baseTop, ...untouched];

    const query = customQuery.trim();
    let list = query ? basePool.filter(c => c.name.includes(query)) : basePool;

    if (filterMode === 'visited') list = list.filter(c => visitedMap[c.key]);
    if (filterMode === 'unvisited') list = list.filter(c => !visitedMap[c.key]);

    if (sortMode === 'alpha') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    if (sortMode === 'heat') list = [...list].sort((a, b) => {
      const byVisited = (visitedMap[b.key] || 0) - (visitedMap[a.key] || 0);
      return byVisited || b.heat - a.heat;
    });

    list = list.slice(0, customCount);

    return list.map(c => ({ ...c, visited: !!visitedMap[c.key], count: visitedMap[c.key] || 0 }));
  }, [stats.countryCounts, customQuery, customCount, sortMode, filterMode]);

  const overseasVisitedCount = stats.visitedCountryCount;

  if (view === 'china') {
    return (
      <div className={viewClass(viewAnim)}>
        <div className="life-panel-header">
          <button className="life-back-btn" onClick={() => goView('global')}>← 返回</button>
          <h3>🇨🇳 中国</h3>
          <div style={{ width: 32 }} />
        </div>
        <div className="life-panel-content">
          <div className="social-overview-cards">
            <div className="soc-card"><div className="soc-card-icon">✅</div><div className="soc-card-value">{stats.visitedCount}</div><div className="soc-card-label">已到访</div></div>
            <div className="soc-card"><div className="soc-card-icon">⭕</div><div className="soc-card-value">{stats.unvisited.length}</div><div className="soc-card-label">未到访</div></div>
            <div className="soc-card"><div className="soc-card-icon">📍</div><div className="soc-card-value">{stats.totalMarkers}</div><div className="soc-card-label">总标记</div></div>
            <div className="soc-card"><div className="soc-card-icon">🌏</div><div className="soc-card-value">{stats.homelandCoverage}%</div><div className="soc-card-label">覆盖率</div></div>
          </div>
          <div className="social-section">
            <h3>🏆 已到访省份</h3>
            <div className="province-drill-list">
              {stats.sortedProvinces.map(([p, count], i) => (
                <div key={p} className="province-drill-item no-arrow">
                  <span className="pdl-rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                  <span className="pdl-name">{p}</span>
                  <div className="pdl-bar-wrap"><div className="pdl-bar" style={{ width: `${Math.min(100, count / stats.sortedProvinces[0][1] * 100)}%` }} /></div>
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
      <div className={viewClass(viewAnim)}>
        <div className="life-panel-header">
          <button className="life-back-btn" onClick={() => goView('global')}>← 返回</button>
          <h3>🌏 海外</h3>
          <div style={{ width: 32 }} />
        </div>
        <div className="life-panel-content">
          <div className="social-section life-note-card">
            <div className="life-note-top">
              <h3>🔥 热门国家（动态优先）</h3>
              <button className={`life-edit-btn ${isEditingOverseas ? 'active' : ''}`} onClick={() => setIsEditingOverseas(v => !v)}>
                {isEditingOverseas ? '完成' : '编辑'}
              </button>
            </div>

            {isEditingOverseas && (
              <div className="overseas-controls">
                <input className="overseas-input" value={customQuery} onChange={e => setCustomQuery(e.target.value)} placeholder="搜索国家（如 瑞士）" />
                <div className="overseas-count-wrap">
                  <input
                    className="overseas-input overseas-count-input"
                    type="number"
                    min="1"
                    max="300"
                    value={customCountInput}
                    onChange={e => setCustomCountInput(e.target.value)}
                    placeholder="显示数量"
                  />
                  <span className="overseas-count-tip">输入要显示的国家数量（1-300）</span>
                </div>
                <select className="overseas-select" value={sortMode} onChange={e => setSortMode(e.target.value)}>
                  <option value="heat">热度排序</option>
                  <option value="alpha">字母排序</option>
                </select>
                <select className="overseas-select" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                  <option value="all">全部</option>
                  <option value="visited">仅去过</option>
                  <option value="unvisited">仅未去过</option>
                </select>
              </div>
            )}

            <div className="overseas-result-line">当前显示 {overseasDisplay.length} 个国家</div>

            <div className="overseas-grid">
              {overseasDisplay.map(c => (
                <div key={c.key} className={`overseas-item ${c.visited ? 'visited' : 'unvisited'}`}>
                  <span className="overseas-flag">{c.flag}</span>
                  <span className="overseas-name">{c.name}</span>
                  {c.visited && <span className="overseas-count">{c.count}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={viewClass(viewAnim)}>
      <div className="life-panel-header">
        <h3>🌟 生活</h3>
        <button className="life-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="life-panel-content">
        <div className="life-global-cards">
          <div className="life-globe-card" onClick={() => goView('china')}>
            <div className="lgc-icon">🇨🇳</div>
            <div className="lgc-info"><strong>中国</strong><span>{stats.visitedCount} 个省份 · {stats.totalMarkers} 个标记</span></div>
            <span className="lgc-arrow">›</span>
          </div>
          <div className="life-globe-card" onClick={() => goView('overseas')}>
            <div className="lgc-icon">🌏</div>
            <div className="lgc-info"><strong>海外</strong><span>{overseasVisitedCount} 个国家已到访</span></div>
            <span className="lgc-arrow">›</span>
          </div>
        </div>

        <div className="social-section">
          <h3>🌐 全球数据</h3>
          <div className="social-overview-cards">
            <div className="soc-card"><div className="soc-card-icon">📍</div><div className="soc-card-value">{stats.totalMarkers}</div><div className="soc-card-label">标记点</div></div>
            <div className="soc-card"><div className="soc-card-icon">📷</div><div className="soc-card-value">{stats.totalPhotos}</div><div className="soc-card-label">照片</div></div>
            <div className="soc-card"><div className="soc-card-icon">🗺️</div><div className="soc-card-value">{stats.visitedCount}</div><div className="soc-card-label">到访省份</div></div>
            <div className="soc-card"><div className="soc-card-icon">🌍</div><div className="soc-card-value">{stats.visitedCountryCount}</div><div className="soc-card-label">到访国家</div></div>
            <div className="soc-card"><div className="soc-card-icon">🏞️</div><div className="soc-card-value">{stats.homelandCoverage}%</div><div className="soc-card-label">国土覆盖</div></div>
            <div className="soc-card"><div className="soc-card-icon">🌐</div><div className="soc-card-value">{stats.globalCoverage}%</div><div className="soc-card-label">全球覆盖</div></div>
          </div>
        </div>

        <div className="social-section">
          <h3>🔗 分享与邀请</h3>
          <div className="social-actions">
            <button className="social-action-btn" onClick={() => poster.setShowPoster(true)}><span>🖼️</span><div><strong>生成海报</strong><small>多风格全球数据海报</small></div></button>
            <button className="social-action-btn" onClick={handleCopyLink}><span>🔗</span><div><strong>邀请好友</strong><small>复制邀请链接</small></div></button>
          </div>
        </div>

        {poster.showPoster && (
          <div className="poster-overlay" onClick={poster.closePoster}>
            <div className={`poster-page poster-style-${poster.posterStyle}`} onClick={e => e.stopPropagation()}>
              <aside className="poster-sidebar">
                <h4>海报设置</h4>
                <div className="poster-side-group">
                  <label>风格</label>
                  <div className="poster-pills">
                    <button className={poster.posterStyle === 'note' ? 'active' : ''} onClick={() => poster.setPosterStyle('note')}>便签</button>
                    <button className={poster.posterStyle === 'film' ? 'active' : ''} onClick={() => poster.setPosterStyle('film')}>胶片</button>
                    <button className={poster.posterStyle === 'postcard' ? 'active' : ''} onClick={() => poster.setPosterStyle('postcard')}>明信片</button>
                  </div>
                </div>

                <div className="poster-side-group">
                  <label>尺寸</label>
                  <div className="poster-pills">
                    <button className={poster.posterOrientation === 'portrait' ? 'active' : ''} onClick={() => poster.setPosterOrientation('portrait')}>手机 9:16</button>
                    <button className={poster.posterOrientation === 'landscape' ? 'active' : ''} onClick={() => poster.setPosterOrientation('landscape')}>电脑 16:9</button>
                  </div>
                </div>

                <div className="poster-side-group">
                  <label>照片库（最多 5 张）</label>
                  <div className="poster-photo-list-panel">
                    {poster.bgPhotoOptions.length === 0 && <div className="poster-photo-empty">暂无可选照片</div>}
                    {poster.bgPhotoOptions.map(item => (
                      <button
                        key={item.id}
                        draggable
                        onDragStart={e => poster.handlePhotoDragStart(e, item.url)}
                        onDragEnd={() => {}}
                        className={`poster-photo-thumb ${poster.selectedPosterPhotos.includes(item.url) || poster.postcardDroppedPhoto === item.url ? 'active' : ''}`}
                        onClick={() => poster.handleTogglePosterPhoto(item.url)}
                        title={item.label}
                      >
                        <img src={item.url} alt={item.label} />
                      </button>
                    ))}
                  </div>
                  <small>便签/胶片：点击添加到相框；明信片：拖拽到海报中心</small>
                  {poster.posterStyle === 'postcard' && poster.postcardDroppedPhoto && (
                    <button className="poster-link-btn" onClick={() => poster.setPostcardDroppedPhoto('')}>清除明信片主图</button>
                  )}
                </div>

                <div className="poster-side-actions">
                  <button className="poster-action primary" onClick={poster.handleSavePoster}>保存海报(PNG)</button>
                  <button className="poster-action" onClick={() => poster.setShowPoster(false)}>关闭</button>
                </div>
              </aside>

              <main className="poster-canvas-wrap">
                <div className={`poster-preview ${poster.posterTemplate.bgClass} ${poster.posterSizeClass}`}>
                  {poster.posterStyle === 'postcard' ? (
                    <div
                      className={`postcard-dropzone ${poster.isPostcardDragOver ? 'drag-over' : ''}`}
                      onDragOver={e => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                        poster.setIsPostcardDragOver(true);
                      }}
                      onDragLeave={() => poster.setIsPostcardDragOver(false)}
                      onDrop={poster.handlePostcardDrop}
                    >
                      {poster.postcardDroppedPhoto ? (
                        <img src={poster.postcardDroppedPhoto} alt="postcard" className="postcard-main-photo" />
                      ) : (
                        <div className="postcard-drop-hint">拖拽一张照片到这里</div>
                      )}
                    </div>
                  ) : (
                    <div className="poster-frames-layer">
                      {poster.posterTemplate.slots.map((slot, idx) => {
                        const photo = poster.selectedPosterPhotos[idx];
                        return (
                          <div
                            key={idx}
                            className={`poster-frame-slot ${poster.dragOverFrameIndex === idx ? 'drag-over' : ''}`}
                            onDragOver={e => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'copy';
                              poster.setDragOverFrameIndex(idx);
                            }}
                            onDragLeave={() => poster.setDragOverFrameIndex(-1)}
                            onDrop={e => poster.handleFrameDrop(e, idx)}
                            style={{
                              left: `${slot.x}%`,
                              top: `${slot.y}%`,
                              width: `${slot.w}%`,
                              height: `${slot.h}%`,
                              transform: `rotate(${slot.r}deg)`,
                            }}
                          >
                            {photo ? <img src={photo} alt="poster" /> : <div className="poster-frame-placeholder">+</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="poster-mask">
                    <h2>{user?.username || user?.email || '我的'} · 全球足迹海报</h2>
                    <div className="poster-stats-row-top">
                      <span>国土覆盖 {stats.homelandCoverage}%</span>
                      <span>全球覆盖 {stats.globalCoverage}%</span>
                      <span>到访国家 {stats.visitedCountryCount}</span>
                    </div>
                    <div className="poster-stats-grid">
                      <div><strong>{stats.totalMarkers}</strong><span>标记点</span></div>
                      <div><strong>{stats.totalPhotos}</strong><span>照片</span></div>
                      <div><strong>{stats.visitedCount}</strong><span>到访省份</span></div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
