export default function SettingsContent({
  settingsTab,
  user,
  mapSettings,
  tempSettings,
  cacheStats,
  markersCount,
  totalPhotos,
  isOnline,
  syncQueueSize,
  cloudSyncEnabled,
  syncingNow,
  syncApiBase,
  onLogout,
  onTempSettingsChange,
  onSaveSettings,
  onCloseSettings,
  onCloudSyncChange,
  onSyncApiBaseChange,
  onRunCloudSync,
  onClearTileCache,
}) {
  return (
    <div className="settings-content">
      <button className="settings-close" onClick={() => {
        const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(mapSettings);
        if (hasChanges) {
          if (window.confirm('设置已更改但未保存，是否保存？')) {
            onSaveSettings(tempSettings);
          } else {
            onTempSettingsChange(mapSettings);
          }
        }
        onCloseSettings();
      }}>✕</button>

      {settingsTab === 'user' && (
        <div className="settings-page">
          <h2>👤 个人信息</h2>
          <p className="page-desc">查看和管理您的账号信息及数据</p>

          {user ? (
            <>
              {/* 用户信息卡片 */}
              <div className="user-profile-card">
                <div className="user-avatar">
                  {user.type === 'github' ? (
                    <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                  ) : user.type === 'email' ? (
                    <span className="user-avatar-text">
                      {user.email ? user.email[0].toUpperCase() : 'U'}
                    </span>
                  ) : (
                    <span style={{fontSize:'28px'}}>👤</span>
                  )}
                </div>
                <div className="user-info">
                  <h3 className="user-name">
                    {user.username || user.email || '用户'}
                  </h3>
                  <div className="user-type">
                    {user.type === 'github' && <span className="badge badge-github">GitHub 账号</span>}
                    {user.type === 'email' && <span className="badge badge-email">📧 邮箱账号</span>}
                    {(!user.type || user.type === 'guest') && <span className="badge" style={{background:'#f3f4f6',color:'#6b7280'}}>👤 游客</span>}
                  </div>
                  {user.email && <div className="user-email">{user.email}</div>}
                  {user.type === 'github' && user.username && <div className="user-email">@{user.username}</div>}
                </div>
              </div>

              {/* 数据统计 */}
              <div className="setting-group">
                <h3>数据统计</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-icon">📍</div>
                    <div className="stat-value">{markersCount}</div>
                    <div className="stat-label">标记点</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">📷</div>
                    <div className="stat-value">{totalPhotos}</div>
                    <div className="stat-label">照片</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon">📅</div>
                    <div className="stat-value">
                      {user.loginTime ? new Date(user.loginTime).toLocaleDateString('zh-CN') : '今天'}
                    </div>
                    <div className="stat-label">加入时间</div>
                  </div>
                </div>
              </div>

              {/* 存储管理 */}
              <div className="setting-group">
                <h3>💾 存储管理</h3>
                <div className="storage-cards">
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
                <div className="action-buttons">
                  <button className="action-btn" onClick={onClearTileCache}>
                    <span>🧹</span>
                    <div><strong>清除瓦片缓存</strong><small>释放磁盘空间，不影响标记数据</small></div>
                  </button>
                </div>
              </div>

              {/* 账号操作 */}
              <div className="setting-group">
                <h3>账号操作</h3>
                <div className="action-buttons">
                  <button className="action-btn danger" onClick={onLogout}>
                    <span>🚪</span>
                    <div>
                      <strong>退出登录</strong>
                      <small>退出当前账号</small>
                    </div>
                  </button>
                </div>
              </div>

              {/* 云同步控制 */}
              <div className="setting-group">
                <h3>☁️ 云端同步</h3>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>同步状态</strong>
                    <span>当前网络：{isOnline ? '在线' : '离线'}，队列：{syncQueueSize} 条</span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={cloudSyncEnabled}
                      onChange={e => onCloudSyncChange(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="setting-row">
                  <div className="setting-label">
                    <strong>云端 API 地址</strong>
                    <span>默认：Java 服务 `http://localhost:8080`</span>
                  </div>
                  <input
                    style={{ width: '280px', maxWidth: '42%', minWidth: '180px', height: '34px', borderRadius: '8px', border: '1px solid #ddd', padding: '0 10px' }}
                    value={syncApiBase}
                    onChange={(e) => onSyncApiBaseChange(e.target.value)}
                  />
                </div>
                <div className="action-buttons">
                  <button className="action-btn" disabled={!cloudSyncEnabled || !isOnline || syncingNow} onClick={onRunCloudSync}>
                    <span>🔄</span>
                    <div>
                      <strong>{syncingNow ? '同步中...' : '立即同步'}</strong>
                      <small>将本地标记与照片元数据同步到云端并拉取最新数据</small>
                    </div>
                  </button>
                </div>
              </div>

              {/* 数据同步提示 */}
              <div className="setting-tip">
                <span>💡</span>
                <p>离线时数据仍保存在本地，可继续使用。联网后自动同步；地球村功能需联网。</p>
              </div>
            </>
          ) : (
            <>
              {/* 未登录状态 */}
              <div className="guest-card">
                <div className="guest-icon">👤</div>
                <h3>游客模式</h3>
                <p>您当前以游客身份使用，数据仅保存在本地设备。</p>
                <button className="login-prompt-btn" onClick={onCloseSettings}>
                  <span>🔐</span>
                  <span>登录账号</span>
                </button>
              </div>

              {/* 登录优势 */}
              <div className="setting-group">
                <h3>登录后可以</h3>
                <div className="benefits-list">
                  <div className="benefit-item">
                    <span className="benefit-icon">☁️</span>
                    <div className="benefit-text">
                      <strong>云端同步</strong>
                      <small>在多个设备间同步数据</small>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🔒</span>
                    <div className="benefit-text">
                      <strong>数据备份</strong>
                      <small>自动备份，永不丢失</small>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🌐</span>
                    <div className="benefit-text">
                      <strong>跨平台访问</strong>
                      <small>随时随地访问您的相册</small>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {settingsTab === 'appearance' && (
        <div className="settings-page">
          <h2>🎨 个性化&显示效果</h2>
          <p className="page-desc">统一调整视觉风格与地图显示体验</p>

          <div className="setting-group">
            <h3>画质设置</h3>
            <div className="setting-row">
              <div className="setting-label">
                <strong>抗锯齿</strong>
                <span>平滑地图边缘，提升画质但会增加GPU负担</span>
              </div>
              <label className="switch">
                <input type="checkbox" checked={tempSettings.antialias} onChange={e => onTempSettingsChange(s => ({...s, antialias: e.target.checked}))} />
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
                <input type="checkbox" checked={tempSettings.dragRotate} onChange={e => onTempSettingsChange(s => ({...s, dragRotate: e.target.checked}))} />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <strong>世界副本</strong>
                <span>左右无限滚动，显示多个地球副本</span>
              </div>
              <label className="switch">
                <input type="checkbox" checked={tempSettings.renderWorldCopies} onChange={e => onTempSettingsChange(s => ({...s, renderWorldCopies: e.target.checked}))} />
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
                <input type="range" min="0" max="5" step="1" value={tempSettings.minZoom} onChange={e => onTempSettingsChange(s => ({...s, minZoom: Number(e.target.value)}))} />
                <span className="range-value">{tempSettings.minZoom}</span>
              </div>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <strong>最大缩放级别</strong>
                <span>数值越大可以看到越详细</span>
              </div>
              <div className="range-control">
                <input type="range" min="15" max="22" step="1" value={tempSettings.maxZoom} onChange={e => onTempSettingsChange(s => ({...s, maxZoom: Number(e.target.value)}))} />
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
                <input type="range" min="0" max="500" step="50" value={tempSettings.fadeDuration} onChange={e => onTempSettingsChange(s => ({...s, fadeDuration: Number(e.target.value)}))} />
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
                <input type="range" min="1000" max="6000" step="500" value={tempSettings.maxTileCacheSize} onChange={e => onTempSettingsChange(s => ({...s, maxTileCacheSize: Number(e.target.value)}))} />
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

      {settingsTab === 'about' && (
        <div className="settings-page">
          <h2>ℹ️ 关于</h2>
          <p className="page-desc">地图相册 - 在地图上记录你的旅行回忆</p>

          <div className="setting-group">
            <h3>应用信息</h3>
            <div className="setting-row">
              <div className="setting-label"><strong>应用名称</strong></div>
              <span style={{color:'var(--text-secondary)',fontSize:'14px'}}>地图相册</span>
            </div>
            <div className="setting-row">
              <div className="setting-label"><strong>当前版本</strong></div>
              <span style={{color:'var(--text-secondary)',fontSize:'14px'}}>v1.0.0</span>
            </div>
          </div>

          <div className="setting-group">
            <h3>核心功能</h3>
            <div className="feature-inline-grid">
              <div className="feature-inline-item"><span className="fi-icon">🗺️</span><span className="fi-name">交互式地图</span></div>
              <div className="feature-inline-item"><span className="fi-icon">📷</span><span className="fi-name">照片管理</span></div>
              <div className="feature-inline-item"><span className="fi-icon">🔍</span><span className="fi-name">智能搜索</span></div>
              <div className="feature-inline-item"><span className="fi-icon">💾</span><span className="fi-name">本地存储</span></div>
              <div className="feature-inline-item"><span className="fi-icon">🔥</span><span className="fi-name">热力图</span></div>
              <div className="feature-inline-item"><span className="fi-icon">📏</span><span className="fi-name">距离测量</span></div>
            </div>
          </div>

          <div className="setting-tip">
            <span>❤️</span>
            <p>感谢使用地图相册！如有问题或建议，欢迎反馈。</p>
          </div>
        </div>
      )}

      {/* 底部保存按钮 - 仅在地图和性能设置页显示 */}
      {(settingsTab === 'performance' || settingsTab === 'appearance') && (
        <div className="settings-footer">
          <button
            className="save-btn"
            disabled={JSON.stringify(tempSettings) === JSON.stringify(mapSettings)}
            onClick={() => {
              onSaveSettings(tempSettings);

              // 提示用户设置已保存，需要刷新页面
              if (window.confirm('设置已保存！需要刷新页面以应用新设置，是否立即刷新？')) {
                window.location.reload();
              }
            }}
          >
            保存设置
          </button>
        </div>
      )}
    </div>
  );
}
