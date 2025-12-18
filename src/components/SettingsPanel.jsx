import { useState } from 'react';

/**
 * 设置面板组件 - 懒加载
 */
function SettingsPanel({
  showSettings,
  setShowSettings,
  mapSettings,
  setMapSettings,
  markers,
  totalPhotos,
  cacheStats,
  setCacheStats,
  setMarkers
}) {
  const [settingsTab, setSettingsTab] = useState('map');
  const [tempSettings, setTempSettings] = useState(mapSettings);

  const handleClose = () => {
    const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(mapSettings);
    if (hasChanges) {
      if (window.confirm('设置已更改但未保存，是否保存？')) {
        setMapSettings(tempSettings);
        localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
      } else {
        setTempSettings(mapSettings);
      }
    }
    setShowSettings(false);
  };

  if (!showSettings) return null;

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        {/* 左侧导航 */}
        <div className="settings-nav">
          <div className="settings-nav-header">
            <span className="nav-icon">⚙️</span>
            <span className="nav-title">设置</span>
          </div>
          <div className="settings-nav-items">
            <button className={settingsTab === 'map' ? 'active' : ''} onClick={() => setSettingsTab('map')}>
              <span>🗺️</span> 地图显示
            </button>
            <button className={settingsTab === 'performance' ? 'active' : ''} onClick={() => setSettingsTab('performance')}>
              <span>🚀</span> 性能优化
            </button>
            <button className={settingsTab === 'storage' ? 'active' : ''} onClick={() => setSettingsTab('storage')}>
              <span>💾</span> 存储管理
            </button>
            <button className={settingsTab === 'about' ? 'active' : ''} onClick={() => setSettingsTab('about')}>
              <span>ℹ️</span> 关于
            </button>
          </div>
        </div>
        
        {/* 右侧内容 */}
        <div className="settings-content">
          <button className="settings-close" onClick={handleClose}>✕</button>
          
          {settingsTab === 'map' && (
            <div className="settings-page">
              <h2>🗺️ 地图显示</h2>
              <p className="page-desc">调整地图的显示效果和交互方式</p>
              
              <div className="setting-group">
                <h3>画质设置</h3>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>抗锯齿</strong>
                    <span>平滑地图边缘，提升画质但会增加GPU负担</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={tempSettings.antialias} onChange={e => setTempSettings(s => ({...s, antialias: e.target.checked}))} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="setting-group">
                <h3>交互设置</h3>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>允许旋转</strong>
                    <span>右键拖动可旋转地图视角</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={tempSettings.dragRotate} onChange={e => setTempSettings(s => ({...s, dragRotate: e.target.checked}))} />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>世界副本</strong>
                    <span>左右无限滚动，显示多个地球副本</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={tempSettings.renderWorldCopies} onChange={e => setTempSettings(s => ({...s, renderWorldCopies: e.target.checked}))} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="setting-group">
                <h3>缩放范围</h3>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>最小缩放级别</strong>
                    <span>数值越小可以看到越大范围</span>
                  </div>
                  <div className="range-control">
                    <input type="range" min="0" max="5" step="1" value={tempSettings.minZoom} onChange={e => setTempSettings(s => ({...s, minZoom: Number(e.target.value)}))} />
                    <span className="range-value">{tempSettings.minZoom}</span>
                  </div>
                </div>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>最大缩放级别</strong>
                    <span>数值越大可以看到越详细</span>
                  </div>
                  <div className="range-control">
                    <input type="range" min="15" max="22" step="1" value={tempSettings.maxZoom} onChange={e => setTempSettings(s => ({...s, maxZoom: Number(e.target.value)}))} />
                    <span className="range-value">{tempSettings.maxZoom}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {settingsTab === 'performance' && (
            <div className="settings-page">
              <h2>🚀 性能优化</h2>
              <p className="page-desc">调整性能参数以获得更流畅的体验</p>
              
              <div className="setting-group">
                <h3>渲染设置</h3>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>瓦片淡入时间</strong>
                    <span>地图瓦片加载时的淡入动画时长，0为立即显示</span>
                  </div>
                  <div className="range-control wide">
                    <input type="range" min="0" max="500" step="50" value={tempSettings.fadeDuration} onChange={e => setTempSettings(s => ({...s, fadeDuration: Number(e.target.value)}))} />
                    <span className="range-value">{tempSettings.fadeDuration}ms</span>
                  </div>
                </div>
              </div>
              
              <div className="setting-group">
                <h3>缓存设置</h3>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>瓦片缓存数量</strong>
                    <span>内存中缓存的地图瓦片数量，越大越流畅但占用更多内存</span>
                  </div>
                  <div className="range-control wide">
                    <input type="range" min="1000" max="6000" step="500" value={tempSettings.maxTileCacheSize} onChange={e => setTempSettings(s => ({...s, maxTileCacheSize: Number(e.target.value)}))} />
                    <span className="range-value">{tempSettings.maxTileCacheSize}</span>
                  </div>
                </div>
              </div>
              
              <div className="setting-tip">
                <span>💡</span>
                <p>性能设置修改后需要重启应用才能生效。如果地图卡顿，可以尝试降低瓦片缓存数量。</p>
              </div>
            </div>
          )}
          
          {settingsTab === 'storage' && (
            <div className="settings-page">
              <h2>💾 存储管理</h2>
              <p className="page-desc">查看和管理应用数据</p>
              
              <div className="storage-cards">
                <div className="storage-card">
                  <div className="storage-icon">📍</div>
                  <div className="storage-value">{markers.length}</div>
                  <div className="storage-label">标记点</div>
                </div>
                <div className="storage-card">
                  <div className="storage-icon">📷</div>
                  <div className="storage-value">{totalPhotos}</div>
                  <div className="storage-label">照片</div>
                </div>
                <div className="storage-card">
                  <div className="storage-icon">🗺️</div>
                  <div className="storage-value">{cacheStats.count}</div>
                  <div className="storage-label">缓存瓦片</div>
                </div>
                <div className="storage-card">
                  <div className="storage-icon">📦</div>
                  <div className="storage-value">{(cacheStats.size / 1024 / 1024).toFixed(1)}</div>
                  <div className="storage-label">MB 缓存</div>
                </div>
              </div>
              
              <div className="setting-group">
                <h3>数据操作</h3>
                <div className="action-buttons">
                  <button className="action-btn" onClick={async () => {
                    if (window.confirm('确定清除所有瓦片缓存？这不会影响你的标记和照片。')) {
                      await window.electronAPI?.clearTileCache();
                      const stats = await window.electronAPI?.getCacheStats();
                      if (stats) setCacheStats(stats);
                    }
                  }}>
                    <span>🧹</span>
                    <div>
                      <strong>清除瓦片缓存</strong>
                      <small>释放磁盘空间，不影响标记数据</small>
                    </div>
                  </button>
                  <button className="action-btn danger" onClick={async () => {
                    if (window.confirm('⚠️ 确定删除所有标记和照片？此操作不可恢复！')) {
                      for (const m of markers) await window.electronAPI?.deleteMarker(m.id);
                      setMarkers([]);
                    }
                  }}>
                    <span>🗑️</span>
                    <div>
                      <strong>清除所有数据</strong>
                      <small>删除所有标记和照片，不可恢复</small>
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="setting-group">
                <h3>调试工具</h3>
                <div className="action-buttons">
                  <button className="action-btn" onClick={async () => {
                    await window.electronAPI?.openLogFolder();
                  }}>
                    <span>📋</span>
                    <div>
                      <strong>查看日志文件</strong>
                      <small>打开日志文件夹，用于问题排查</small>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {settingsTab === 'about' && (
            <div className="settings-page about-page">
              <div className="about-header">
                <div className="about-icon">📍</div>
                <h1>地图相册</h1>
                <p className="version">版本 1.0.0</p>
              </div>
              <p className="about-desc">在地图上记录你的旅行回忆，用照片标记每一个值得纪念的地点。</p>
              <div className="about-features">
                <div className="feature">
                  <span>🗺️</span>
                  <div>
                    <strong>交互式地图</strong>
                    <small>基于 Mapbox GL 的流畅地图体验</small>
                  </div>
                </div>
                <div className="feature">
                  <span>📷</span>
                  <div>
                    <strong>照片管理</strong>
                    <small>为每个地点添加多张照片和备注</small>
                  </div>
                </div>
                <div className="feature">
                  <span>🔍</span>
                  <div>
                    <strong>智能搜索</strong>
                    <small>快速搜索全球任意地点</small>
                  </div>
                </div>
                <div className="feature">
                  <span>💾</span>
                  <div>
                    <strong>本地存储</strong>
                    <small>数据安全存储在本地</small>
                  </div>
                </div>
              </div>
              <div className="about-footer">
                <p>使用 Electron + React + Mapbox GL 构建</p>
              </div>
            </div>
          )}
          
          {/* 底部保存按钮 */}
          {(settingsTab === 'map' || settingsTab === 'performance') && (
            <div className="settings-footer">
              <button 
                className="save-btn"
                disabled={JSON.stringify(tempSettings) === JSON.stringify(mapSettings)}
                onClick={() => {
                  setMapSettings(tempSettings);
                  localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
                  setShowSettings(false);
                }}
              >
                保存设置
              </button>
              <p className="save-hint">
                {JSON.stringify(tempSettings) !== JSON.stringify(mapSettings) 
                  ? '* 设置已更改，点击保存生效' 
                  : '部分设置需要重启应用后生效'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
