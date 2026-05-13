import { useState, useMemo } from 'react';

const PROVINCES = [
  '北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江',
  '上海','江苏','浙江','安徽','福建','江西','山东','河南',
  '湖北','湖南','广东','广西','海南','重庆','四川','贵州',
  '云南','西藏','陕西','甘肃','青海','宁夏','新疆'
];

function extractProvince(name) {
  if (!name) return null;
  for (const p of PROVINCES) { if (name.includes(p)) return p; }
  return null;
}

function extractCity(name) {
  if (!name) return null;
  const m = name.match(/([\u4e00-\u9fa5]{2,4}[市县区])/);
  return m ? m[1] : null;
}

function useLifeStats(markers, totalPhotos) {
  return useMemo(() => {
    const provinceCounts = {}, provincePhotos = {}, provinceCities = {};
    markers.forEach(m => {
      const p = extractProvince(m.name || m.placeName || '');
      const c = extractCity(m.name || m.placeName || '');
      if (p) {
        provinceCounts[p] = (provinceCounts[p] || 0) + 1;
        provincePhotos[p] = (provincePhotos[p] || 0) + (m.photoCount || 0);
        if (c) {
          if (!provinceCities[p]) provinceCities[p] = {};
          provinceCities[p][c] = (provinceCities[p][c] || 0) + 1;
        }
      }
    });
    const visitedProvinces = Object.keys(provinceCounts);
    const unvisited = PROVINCES.filter(p => !provinceCounts[p]);
    const coverage = Math.round((visitedProvinces.length / PROVINCES.length) * 100);
    return {
      totalMarkers: markers.length, totalPhotos,
      visitedCount: visitedProvinces.length, coverage,
      provinceCounts, provincePhotos, provinceCities,
      sortedProvinces: Object.entries(provinceCounts).sort((a,b) => b[1] - a[1]),
      unvisited,
    };
  }, [markers, totalPhotos]);
}

function Breadcrumb({ drillLevel, selectedProvince, onGlobal, onProvince }) {
  return (
    <div className="life-breadcrumb">
      <span className={drillLevel === 'global' ? 'bc-active' : 'bc-link'} onClick={onGlobal}>🌍 全球</span>
      {(drillLevel === 'province' || drillLevel === 'city') && (<><span className="bc-sep">›</span><span className={drillLevel === 'province' ? 'bc-active' : 'bc-link'} onClick={onProvince}>🇨🇳 中国</span></>)}
      {drillLevel === 'city' && selectedProvince && (<><span className="bc-sep">›</span><span className="bc-active">{selectedProvince}</span></>)}
    </div>
  );
}

const OVERSEAS_REGIONS = [
  { flag: '🇺🇸', name: '美国', key: 'us' },
  { flag: '🇯🇵', name: '日本', key: 'jp' },
  { flag: '🇰🇷', name: '韩国', key: 'kr' },
  { flag: '🇬🇧', name: '英国', key: 'gb' },
  { flag: '🇫🇷', name: '法国', key: 'fr' },
  { flag: '🇩🇪', name: '德国', key: 'de' },
  { flag: '🇮🇹', name: '意大利', key: 'it' },
  { flag: '🇪🇸', name: '西班牙', key: 'es' },
  { flag: '🇦🇺', name: '澳大利亚', key: 'au' },
  { flag: '🇨🇦', name: '加拿大', key: 'ca' },
  { flag: '🇸🇬', name: '新加坡', key: 'sg' },
  { flag: '🇹🇭', name: '泰国', key: 'th' },
  { flag: '🇻🇳', name: '越南', key: 'vn' },
  { flag: '🇲🇾', name: '马来西亚', key: 'my' },
  { flag: '🇮🇩', name: '印尼', key: 'id' },
  { flag: '🇳🇿', name: '新西兰', key: 'nz' },
  { flag: '🇵🇹', name: '葡萄牙', key: 'pt' },
  { flag: '🇨🇭', name: '瑞士', key: 'ch' },
  { flag: '🇳🇱', name: '荷兰', key: 'nl' },
  { flag: '🇧🇷', name: '巴西', key: 'br' },
  { flag: '🇲🇽', name: '墨西哥', key: 'mx' },
  { flag: '🇦🇪', name: '阿联酋', key: 'ae' },
  { flag: '🇮🇳', name: '印度', key: 'in' },
  { flag: '🇷🇺', name: '俄罗斯', key: 'ru' },
];

function extractOverseasCountry(name) {
  if (!name) return null;
  for (const r of OVERSEAS_REGIONS) {
    if (name.includes(r.name)) return r.key;
  }
  return null;
}

function GlobalView({ stats, bc, onChina, showPoster, setShowPoster, handleCopyLink, user }) {
  const [showOverseas, setShowOverseas] = useState(false);

  // 统计海外标记
  const overseasStats = useMemo(() => {
    const countryCounts = {};
    stats.overseasMarkers?.forEach(m => {
      const k = extractOverseasCountry(m.name || m.placeName || '');
      if (k) countryCounts[k] = (countryCounts[k] || 0) + 1;
    });
    return countryCounts;
  }, [stats.overseasMarkers]);

  const visitedOverseas = OVERSEAS_REGIONS.filter(r => overseasStats[r.key]);
  const unvisitedOverseas = OVERSEAS_REGIONS.filter(r => !overseasStats[r.key]);
  return (
    <div className="social-page">
      {bc}
      <div className="life-global-cards">
        <div className="life-globe-card" onClick={onChina}>
          <div className="lgc-icon">🇨🇳</div>
          <div className="lgc-info"><strong>中国</strong><span>{stats.visitedCount} 个省份 · {stats.totalMarkers} 个标记</span></div>
          <span className="lgc-arrow">›</span>
        </div>
        <div className="life-globe-card" onClick={() => setShowOverseas(v => !v)}>
          <div className="lgc-icon">🌏</div>
          <div className="lgc-info"><strong>海外</strong><span>{visitedOverseas.length} 个国家已到访</span></div>
          <span className="lgc-arrow" style={{ transform: showOverseas ? 'rotate(90deg)' : 'none', transition:'0.2s' }}>›</span>
        </div>
      </div>

      {showOverseas && (
        <div className="social-section">
          <h3>🌍 海外足迹</h3>
          <div className="overseas-grid">
            {OVERSEAS_REGIONS.map(r => (
              <div key={r.key} className={`overseas-item ${overseasStats[r.key] ? 'visited' : 'unvisited'}`}>
                <span className="overseas-flag">{r.flag}</span>
                <span className="overseas-name">{r.name}</span>
                {overseasStats[r.key] && <span className="overseas-count">{overseasStats[r.key]}</span>}
              </div>
            ))}
          </div>
          {visitedOverseas.length === 0 && (
            <div className="empty-hint" style={{ paddingTop:8 }}><span>✈️</span><p>还没有海外标记，出发探索世界吧！</p></div>
          )}
        </div>
      )}

      <div className="social-section">
        <h3>🌐 全球数据</h3>
        <div className="social-overview-cards">
          <div className="soc-card"><div className="soc-card-icon">📍</div><div className="soc-card-value">{stats.totalMarkers}</div><div className="soc-card-label">标记点</div></div>
          <div className="soc-card"><div className="soc-card-icon">📷</div><div className="soc-card-value">{stats.totalPhotos}</div><div className="soc-card-label">照片</div></div>
          <div className="soc-card"><div className="soc-card-icon">🗺️</div><div className="soc-card-value">{stats.visitedCount}</div><div className="soc-card-label">到访省份</div></div>
          <div className="soc-card"><div className="soc-card-icon">🌏</div><div className="soc-card-value">{stats.coverage}%</div><div className="soc-card-label">国土覆盖</div></div>
        </div>
      </div>
      <div className="social-section">
        <h3>🔗 分享与邀请</h3>
        <div className="social-actions">
          <button className="social-action-btn" onClick={() => setShowPoster(true)}><span>🎨</span><div><strong>生成旅行海报</strong><small>一键生成精美海报</small></div></button>
          <button className="social-action-btn" onClick={handleCopyLink}><span>🔗</span><div><strong>邀请好友</strong><small>复制邀请链接</small></div></button>
        </div>
      </div>
      {showPoster && (
        <div className="poster-overlay" onClick={() => setShowPoster(false)}>
          <div className="poster-card" onClick={e => e.stopPropagation()}>
            <div className="poster-header"><h2>🌍 我的旅行地图</h2><p>{user?.username || user?.email || '旅行者'} 的足迹</p></div>
            <div className="poster-stats">
              <div className="poster-stat"><span>{stats.totalMarkers}</span><small>个标记点</small></div>
              <div className="poster-stat"><span>{stats.totalPhotos}</span><small>张照片</small></div>
              <div className="poster-stat"><span>{stats.visitedCount}</span><small>个省份</small></div>
              <div className="poster-stat"><span>{stats.coverage}%</span><small>国土覆盖</small></div>
            </div>
            {stats.sortedProvinces.length > 0 && (<p className="poster-highlight">最常去<strong>{stats.sortedProvinces[0][0]}</strong>，有<strong>{stats.sortedProvinces[0][1]}</strong>个足迹</p>)}
            <div className="poster-footer"><p>📍 地图相册 · 记录每一个值得纪念的地方</p></div>
            <button className="poster-close" onClick={() => setShowPoster(false)}>✕ 关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProvinceView({ stats, bc, onCity }) {
  return (
    <div className="social-page">
      {bc}
      <div className="social-section">
        <h3>🇨🇳 中国省份</h3>
        <div className="social-overview-cards">
          <div className="soc-card"><div className="soc-card-icon">✅</div><div className="soc-card-value">{stats.visitedCount}</div><div className="soc-card-label">已到访</div></div>
          <div className="soc-card"><div className="soc-card-icon">⭕</div><div className="soc-card-value">{stats.unvisited.length}</div><div className="soc-card-label">未到访</div></div>
          <div className="soc-card"><div className="soc-card-icon">📍</div><div className="soc-card-value">{stats.totalMarkers}</div><div className="soc-card-label">总标记</div></div>
          <div className="soc-card"><div className="soc-card-icon">🌏</div><div className="soc-card-value">{stats.coverage}%</div><div className="soc-card-label">覆盖率</div></div>
        </div>
      </div>
      {stats.sortedProvinces.length > 0 && (
        <div className="social-section">
          <h3>🏆 已到访省份（点击查看城市）</h3>
          <div className="province-drill-list">
            {stats.sortedProvinces.map(([p,count],i) => (
              <div key={p} className="province-drill-item" onClick={() => onCity(p)}>
                <span className="pdl-rank">{i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span>
                <span className="pdl-name">{p}</span>
                <div className="pdl-bar-wrap"><div className="pdl-bar" style={{ width:`${Math.min(100,count / stats.sortedProvinces[0][1] * 100)}%` }}/></div>
                <span className="pdl-count">{count}个</span>
                <span className="pdl-arrow">›</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.unvisited.length > 0 && (
        <div className="social-section">
          <h3>🗺️ 未到访省份</h3>
          <div className="province-tags">{stats.unvisited.map(p => <span key={p} className="province-tag unvisited">{p}</span>)}</div>
        </div>
      )}
    </div>
  );
}

function CityView({ stats, province, bc }) {
  const cities = stats.provinceCities[province] || {};
  const sorted = Object.entries(cities).sort((a,b) => b[1] - a[1]);
  return (
    <div className="social-page">
      {bc}
      <div className="social-section">
        <h3>📍 {province} 概览</h3>
        <div className="social-overview-cards">
          <div className="soc-card"><div className="soc-card-icon">📍</div><div className="soc-card-value">{stats.provinceCounts[province] || 0}</div><div className="soc-card-label">标记点</div></div>
          <div className="soc-card"><div className="soc-card-icon">📷</div><div className="soc-card-value">{stats.provincePhotos[province] || 0}</div><div className="soc-card-label">照片</div></div>
          <div className="soc-card"><div className="soc-card-icon">🏙️</div><div className="soc-card-value">{sorted.length}</div><div className="soc-card-label">城市</div></div>
        </div>
      </div>
      {sorted.length > 0 ? (
        <div className="social-section">
          <h3>🏙️ 城市分布</h3>
          <div className="province-drill-list">
            {sorted.map(([city,count],i) => (
              <div key={city} className="province-drill-item no-arrow">
                <span className="pdl-rank">{i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span>
                <span className="pdl-name">{city}</span>
                <div className="pdl-bar-wrap"><div className="pdl-bar" style={{ width:`${Math.min(100,count / sorted[0][1] * 100)}%` }}/></div>
                <span className="pdl-count">{count}个</span>
              </div>
            ))}
          </div>
        </div>
      ) : (<div className="social-section"><div className="empty-hint"><span>🏙️</span><p>暂无城市级数据</p></div></div>)}
    </div>
  );
}

function LifePage({ markers, totalPhotos, user }) {
  const [drillLevel, setDrillLevel] = useState('global');
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [showPoster, setShowPoster] = useState(false);
  const stats = useLifeStats(markers, totalPhotos);
  const goGlobal = () => { setDrillLevel('global'); setSelectedProvince(null); };
  const goProvince = () => setDrillLevel('province');
  const goCity = p => { setSelectedProvince(p); setDrillLevel('city'); };
  const handleCopyLink = () => {
    const link = `${window.location.origin}?invite=${encodeURIComponent(user?.username || 'friend')}`;
    navigator.clipboard?.writeText(link).then(() => alert('邀请链接已复制！'));
  };
  const bc = <Breadcrumb drillLevel={drillLevel} selectedProvince={selectedProvince} onGlobal={goGlobal} onProvince={goProvince}/>;
  if (drillLevel === 'global') return <GlobalView stats={stats} bc={bc} onChina={goProvince} showPoster={showPoster} setShowPoster={setShowPoster} handleCopyLink={handleCopyLink} user={user}/>;
  if (drillLevel === 'province') return <ProvinceView stats={stats} bc={bc} onCity={goCity}/>;
  if (drillLevel === 'city' && selectedProvince) return <CityView stats={stats} province={selectedProvince} bc={bc}/>;
  return null;
}

function VillagePage({ onBack, villageMembers }) {
  return (
    <div className="village-page">
      <div className="village-page-hero">
        <div className="village-globe-anim">🌍</div>
        <h2>我的地球村</h2>
        <p>与好友共同标记这个世界</p>
      </div>

      <div className="village-page-body">
        <div className="village-map-full">
          <div className="village-map-inner">
            <div className="village-map-dots">
              {[...Array(12)].map((_,i) => (
                <div key={i} className="vmap-dot" style={{ left:`${10 + Math.random() * 80}%`,top:`${15 + Math.random() * 70}%`,animationDelay:`${i * 0.3}s` }}/>
              ))}
            </div>
            <div className="village-map-hint-inner">
              <span>🗺️</span>
              <p>共享地图</p>
              <small>村民的标记将实时显示在这里</small>
            </div>
          </div>
        </div>

        <div className="village-stats-row">
          <div className="vstat"><span>{villageMembers.length}</span><small>位村民</small></div>
          <div className="vstat"><span>0</span><small>个共享标记</small></div>
          <div className="vstat"><span>0</span><small>个国家</small></div>
        </div>

        <div className="village-members-section">
          <div className="village-members-header">
            <span>👥 村民 ({villageMembers.length})</span>
            <button className="village-invite-btn">+ 邀请好友</button>
          </div>
          {villageMembers.length === 0 ? (
            <div className="village-empty">
              <div className="village-empty-icons">
                <span>🌱</span>
              </div>
              <p>还没有村民加入</p>
              <small>邀请好友，一起在地图上留下你们的足迹</small>
              <button className="village-invite-big-btn">🔗 生成邀请链接</button>
            </div>
          ) : (
            <div className="friend-list">
              {villageMembers.map(m => (
                <div key={m.id} className="friend-item">
                  <div className="friend-avatar">{m.name[0]}</div>
                  <div className="friend-info"><strong>{m.name}</strong><small>{m.markers || 0} 个标记</small></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="village-back-btn" onClick={onBack}>← 返回好友页</button>
    </div>
  );
}

function FriendsPage() {
  const [showVillage, setShowVillage] = useState(false);
  const [entering, setEntering] = useState(false);
  const [friends] = useState([]);
  const [villageMembers] = useState([]);

  const handleEnterVillage = () => {
    setEntering(true);
    setTimeout(() => { setShowVillage(true); setEntering(false); }, 350);
  };

  if (showVillage) return <VillagePage onBack={() => setShowVillage(false)} villageMembers={villageMembers} />;

  return (
    <div className={`social-page ${entering ? 'page-exit' : ''}`}>
      <div className="village-entry-card" onClick={handleEnterVillage}>
        <div className="village-entry-globe">🌍</div>
        <div className="village-entry-info"><strong>我的地球村</strong><small>与好友共享标记 · {villageMembers.length} 位村民</small></div>
        <span className="village-entry-arrow">→</span>
      </div>
      <div className="social-section">
        <div className="social-section-header"><h3>👥 我的好友 ({friends.length})</h3><button className="add-friend-btn">+ 添加好友</button></div>
        <div className="empty-hint"><span>👋</span><p>还没有好友，通过邀请链接添加吧</p></div>
      </div>
    </div>
  );
}

function SocialPanel({ onClose }) {
  return (
    <div className="social-overlay" onClick={onClose}>
      <div className="social-panel" onClick={e => e.stopPropagation()}>
        <div className="social-header social-header-single">
          <h3 className="social-single-title">👥 好友</h3>
          <button className="social-close-inner" onClick={onClose}>✕</button>
        </div>
        <div className="social-content">
          <FriendsPage/>
        </div>
      </div>
    </div>
  );
}

export default SocialPanel;