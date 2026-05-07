import { useState } from 'react';

function SettingsPanel({
  showSettings,
  setShowSettings,
  mapSettings,
  setMapSettings,
  cacheStats,
  user,
  onLogout,
}) {
  const [tempSettings, setTempSettings] = useState(mapSettings);

  if (!showSettings) return null;

  const handleClose = () => {
    const hasChanges = JSON.stringify(tempSettings) !== JSON.stringify(mapSettings);
    if (hasChanges && window.confirm('???????????????')) {
      setMapSettings(tempSettings);
      localStorage.setItem('mapSettings', JSON.stringify(tempSettings));
    }
    setShowSettings(false);
  };

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h1>??</h1>
          <button className="settings-close" onClick={handleClose}>?</button>
        </div>

        <div className="settings-body" style={{ padding: 20 }}>
          <div className="setting-group">
            <h3>????</h3>
            <div className="setting-row">
              <div className="setting-label">
                <strong>???</strong>
                <span>??????</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={tempSettings.antialias}
                  onChange={e => setTempSettings(s => ({ ...s, antialias: e.target.checked }))}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <h3>????</h3>
            <div className="setting-row">
              <div className="setting-label">
                <strong>{user?.username || user?.email || '????'}</strong>
                <span>?????{cacheStats?.count || 0}</span>
              </div>
              {onLogout && (
                <button className="save-btn" onClick={onLogout}>????</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
