import { useState, useEffect } from 'react';

/**
 * 桌面版下载组件
 * 检测用户操作系统并提供对应的下载链接
 */
function DownloadApp() {
  const [os, setOs] = useState('');
  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    // 检测操作系统
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) setOs('windows');
    else if (userAgent.includes('Mac')) setOs('mac');
    else if (userAgent.includes('Linux')) setOs('linux');
    else setOs('windows'); // 默认 Windows
  }, []);

  const downloadLinks = {
    windows: {
      name: 'Windows 版本',
      icon: '🪟',
      file: 'photo-map-setup-1.0.0.exe',
      size: '~85 MB'
    },
    mac: {
      name: 'macOS 版本',
      icon: '🍎',
      file: 'photo-map-1.0.0.dmg',
      size: '~90 MB'
    },
    linux: {
      name: 'Linux 版本',
      icon: '🐧',
      file: 'photo-map-1.0.0.AppImage',
      size: '~88 MB'
    }
  };

  const currentDownload = downloadLinks[os];
  const otherDownloads = Object.entries(downloadLinks).filter(([key]) => key !== os);

  return (
    <>
      {/* 浮动下载按钮 */}
      <button 
        className="download-float-btn"
        onClick={() => setShowDownload(true)}
        title="下载桌面版应用"
      >
        📱 下载应用
      </button>

      {/* 下载弹窗 */}
      {showDownload && (
        <div className="download-modal-overlay" onClick={() => setShowDownload(false)}>
          <div className="download-modal" onClick={e => e.stopPropagation()}>
            <div className="download-header">
              <h2>下载桌面版应用</h2>
              <button 
                className="download-close"
                onClick={() => setShowDownload(false)}
              >
                ×
              </button>
            </div>

            <div className="download-content">
              <div className="download-benefits">
                <h3>桌面版优势</h3>
                <ul>
                  <li>✅ 更快的性能和响应速度</li>
                  <li>✅ 本地存储，数据更安全</li>
                  <li>✅ 离线使用，无需网络</li>
                  <li>✅ 更大的存储空间</li>
                  <li>✅ 更好的图片处理能力</li>
                  <li>✅ 系统集成（文件关联等）</li>
                </ul>
              </div>

              {/* 推荐下载 */}
              <div className="download-primary">
                <h3>推荐下载</h3>
                <div className="download-card primary">
                  <div className="download-info">
                    <span className="download-icon">{currentDownload.icon}</span>
                    <div>
                      <div className="download-name">{currentDownload.name}</div>
                      <div className="download-size">{currentDownload.size}</div>
                    </div>
                  </div>
                  <a 
                    href={`/downloads/${currentDownload.file}`}
                    className="download-btn primary"
                    download
                  >
                    立即下载
                  </a>
                </div>
              </div>

              {/* 其他版本 */}
              <div className="download-others">
                <h3>其他版本</h3>
                {otherDownloads.map(([key, download]) => (
                  <div key={key} className="download-card">
                    <div className="download-info">
                      <span className="download-icon">{download.icon}</span>
                      <div>
                        <div className="download-name">{download.name}</div>
                        <div className="download-size">{download.size}</div>
                      </div>
                    </div>
                    <a 
                      href={`/downloads/${download.file}`}
                      className="download-btn"
                      download
                    >
                      下载
                    </a>
                  </div>
                ))}
              </div>

              {/* 系统要求 */}
              <div className="download-requirements">
                <h3>系统要求</h3>
                <div className="requirements-grid">
                  <div>
                    <strong>Windows:</strong> Windows 10 或更高版本
                  </div>
                  <div>
                    <strong>macOS:</strong> macOS 10.15 或更高版本
                  </div>
                  <div>
                    <strong>Linux:</strong> Ubuntu 18.04+ 或同等版本
                  </div>
                </div>
              </div>

              {/* GitHub 链接 */}
              <div className="download-github">
                <p>
                  开源项目，查看源代码：
                  <a 
                    href="https://github.com/你的用户名/photo-map" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    GitHub 仓库
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DownloadApp;