import MapIcon from './map/MapIcon.jsx';

function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '';
  if (bytesPerSecond >= 1024 * 1024) {
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}

export default function DesktopUpdateBanner({ updater }) {
  if (!updater?.isDesktop || !updater.bannerVisible) return null;

  const { state, downloadUpdate, quitAndInstall, dismissBanner } = updater;
  const percent = Math.max(0, Math.min(100, Math.round(state.percent || 0)));
  const speedText = formatSpeed(state.bytesPerSecond);

  let title = '';
  let subtitle = '';
  if (state.status === 'available') {
    title = `发现新版本 v${state.version}`;
    subtitle = state.releaseNotes || '点击更新后开始下载';
  } else if (state.status === 'downloading') {
    title = `正在下载 v${state.version}`;
    subtitle = speedText ? `${percent}% · ${speedText}` : `${percent}%`;
  } else if (state.status === 'downloaded') {
    title = `v${state.version} 已下载完成`;
    subtitle = '重启地图相册即可完成更新';
  }

  return (
    <aside className="desktop-update-banner" role="status" aria-live="polite" aria-label="桌面端更新通知">
      <div className="desktop-update-head">
        <span className="desktop-update-icon" aria-hidden="true">
          <MapIcon name={state.status === 'downloaded' ? 'check' : 'download'} />
        </span>
        <div className="desktop-update-copy">
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        {state.status !== 'downloading' && (
          <button
            type="button"
            className="desktop-update-close"
            aria-label="稍后提醒更新"
            onClick={dismissBanner}
          >
            <MapIcon name="close" />
          </button>
        )}
      </div>

      {state.status === 'downloading' && (
        <div className="desktop-update-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="desktop-update-progress-fill" style={{ width: `${percent}%` }} />
        </div>
      )}

      {state.status === 'available' && (
        <div className="desktop-update-actions">
          <button
            type="button"
            className="desktop-update-btn primary"
            onClick={downloadUpdate}
          >
            立即更新
          </button>
          <button type="button" className="desktop-update-btn secondary" onClick={dismissBanner}>
            稍后
          </button>
        </div>
      )}

      {state.status === 'downloaded' && (
        <div className="desktop-update-actions">
          <button type="button" className="desktop-update-btn primary" onClick={quitAndInstall}>
            立即重启安装
          </button>
          <button type="button" className="desktop-update-btn secondary" onClick={dismissBanner}>
            稍后
          </button>
        </div>
      )}
    </aside>
  );
}
