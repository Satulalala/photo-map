import { useState } from 'react';
import { createPortal } from 'react-dom';

const WebDownloadButton = () => {
  const [show, setShow] = useState(false);
  const os = navigator.userAgent.includes('Mac') ? 'mac' : navigator.userAgent.includes('Linux') ? 'linux' : 'windows';
  const dl = {
    windows: { name: 'Windows', file: 'photo-map-setup-1.0.0.exe', size: '~85MB' },
    mac: { name: 'macOS', file: 'photo-map-1.0.0.dmg', size: '~90MB' },
    linux: { name: 'Linux', file: 'photo-map-1.0.0.AppImage', size: '~88MB' }
  };

  const features = [
    { icon: '⚡', text: '更快的性能和响应速度' },
    { icon: '💾', text: '本地存储，数据更安全' },
    { icon: '📴', text: '离线使用，无需网络' },
    { icon: '🖼️', text: '更好的图片处理能力' }
  ];

  const modal = show ? createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}
      onClick={() => setShow(false)}
    >
      <div
        style={{ background: '#fff', borderRadius: '12px', width: '360px', maxWidth: '90vw', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#111' }}>下载桌面版</h2>
            <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#9ca3af', cursor: 'pointer', padding: 0 }}>×</button>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>获得更好的使用体验</p>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: '16px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', fontSize: '13px', color: '#374151' }}>
                <span>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px', color: '#111' }}>{dl[os].name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{dl[os].size}</div>
              </div>
              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '11px', padding: '3px 6px', borderRadius: '4px', fontWeight: 500 }}>推荐</span>
            </div>
            <a
              href={`/downloads/${dl[os].file}`}
              download
              style={{ display: 'block', background: '#111', color: '#fff', textAlign: 'center', padding: '10px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
            >
              立即下载
            </a>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {Object.entries(dl).filter(([k]) => k !== os).map(([k, v]) => (
              <a key={k} href={`/downloads/${v.file}`} download style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'underline' }}>
                {v.name}
              </a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 20px', textAlign: 'center' }}>
          <a href="https://github.com/Satulalala/photo-map" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#6b7280', textDecoration: 'none' }}>
            GitHub →
          </a>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <style>{`
        @keyframes subtle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .web-dl-btn-dark {
          background: #111;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          animation: subtle-pulse 3s ease-in-out infinite;
          transition: transform 0.15s, opacity 0.15s;
        }
        .web-dl-btn-dark:hover {
          transform: scale(1.03);
          opacity: 0.9;
        }
      `}</style>
      <button onClick={() => setShow(true)} className="web-dl-btn-dark">⬇ 桌面版</button>
      {modal}
    </>
  );
};

export default WebDownloadButton;
