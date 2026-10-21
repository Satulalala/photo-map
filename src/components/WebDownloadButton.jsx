import { useState } from 'react';
import { createPortal } from 'react-dom';
import MapIcon from './map/MapIcon.jsx';
import { useDialogFocus } from '../hooks/useDialogFocus.js';

const DESKTOP_INSTALLER_URL =
  'https://video.satula.top/downloads/photomap/v1.3.0/PhotoMap-1.3.0-win-x64-setup.exe?release=1.3.0-r1';

export default function WebDownloadButton({ label = '桌面版' }) {
  const [open, setOpen] = useState(false);
  useDialogFocus(open, '.desktop-download-dialog', () => setOpen(false));
  return (
    <>
      <button
        type="button"
        className="web-dl-btn"
        aria-haspopup="dialog"
        title="获取桌面版"
        onClick={() => setOpen(true)}
      >
        <span className="web-dl-btn-icon" aria-hidden="true">
          <MapIcon name="desktopDownload" />
        </span>
        <span className="web-dl-btn-label">{label}</span>
      </button>
      {open &&
        createPortal(
          <div className="desktop-download-overlay" onClick={() => setOpen(false)}>
            <div
              className="desktop-download-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="获取桌面版"
              tabIndex={-1}
              onClick={event => event.stopPropagation()}
            >
              <header>
                <h2>地图相册桌面版</h2>
                <button type="button" aria-label="关闭下载窗口" onClick={() => setOpen(false)}>
                  <MapIcon name="close" />
                </button>
              </header>
              <p className="desktop-download-intro">
                把照片和地点记录留在自己的电脑里，用地图整理旅程，也能直接管理本地照片。
              </p>
              <div className="desktop-download-features">
                <div>
                  <MapIcon name="photo" />
                  <span>
                    <strong>照片保存在本机</strong>
                    <small>桌面版使用本地数据库整理照片与地点记录。</small>
                  </span>
                </div>
                <div>
                  <MapIcon name="edit" />
                  <span>
                    <strong>直接管理电脑里的照片</strong>
                    <small>导入本地照片，查看并编辑照片信息。</small>
                  </span>
                </div>
                <div>
                  <MapIcon name="map" />
                  <span>
                    <strong>照片与地点放在一起</strong>
                    <small>在地图上查看照片、地点和备注。</small>
                  </span>
                </div>
              </div>
              <p className="download-note">Windows 10+ · 64 位 · 安装包约 261 MB</p>
              <a
                className="desktop-download-link"
                href={DESKTOP_INSTALLER_URL}
                download="PhotoMap-Setup-win-x64.exe"
              >
                <MapIcon name="download" />
                下载 Windows 安装包
              </a>
              <p className="download-signature-note">
                安装包尚未进行代码签名，Windows 可能显示“未知发布者”提示。
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
