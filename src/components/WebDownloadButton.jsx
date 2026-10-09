import { useState } from 'react';
import { createPortal } from 'react-dom';
import MapIcon from './map/MapIcon.jsx';
import { useDialogFocus } from '../hooks/useDialogFocus.js';

export default function WebDownloadButton() {
  const [open, setOpen] = useState(false);
  useDialogFocus(open, '.desktop-download-dialog', () => setOpen(false));
  return (
    <>
      <button type="button" className="web-dl-btn" onClick={() => setOpen(true)}>
        <MapIcon name="download" />
        桌面版
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
              <p>在桌面端使用本地照片存储和图片处理工具。</p>
              <div className="desktop-download-features">
                <span>
                  <MapIcon name="photo" />
                  本地照片管理
                </span>
                <span>
                  <MapIcon name="map" />
                  地图与地点记录
                </span>
              </div>
              <p className="download-note">当前站点未提供安装包，请到项目发布页面查看可用版本。</p>
              <a
                className="desktop-download-link"
                href="https://github.com/Satulalala/photo-map/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapIcon name="download" />
                查看发布页面
              </a>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
