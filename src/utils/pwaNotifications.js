/**
 * PWA 通知和 UI 元素
 */

export function showNetworkStatus(isOnline) {
  let statusEl = document.getElementById('network-status');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'network-status';
    statusEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 8px;
      text-align: center;
      font-size: 14px;
      z-index: 10000;
      transition: transform 0.3s ease;
      transform: translateY(-100%);
    `;
    document.body.appendChild(statusEl);
  }

  if (isOnline) {
    statusEl.textContent = '✅ 网络已连接';
    statusEl.style.backgroundColor = '#4CAF50';
    statusEl.style.color = 'white';
    setTimeout(() => {
      statusEl.style.transform = 'translateY(-100%)';
    }, 3000);
  } else {
    statusEl.textContent = '⚠️ 网络已断开，正在使用离线模式';
    statusEl.style.backgroundColor = '#FF9800';
    statusEl.style.color = 'white';
    statusEl.style.transform = 'translateY(0)';
  }
}

export function showUpdateBanner(onUpdate) {
  const updateBanner = document.createElement('div');
  updateBanner.id = 'update-banner';
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #2196F3;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: space-between;
    ">
      <span>🚀 新版本可用！</span>
      <div>
        <button id="update-btn" style="
          background: white;
          color: #2196F3;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          margin-right: 8px;
          cursor: pointer;
        ">更新</button>
        <button id="dismiss-btn" style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        ">稍后</button>
      </div>
    </div>
  `;

  document.body.appendChild(updateBanner);

  document.getElementById('update-btn').addEventListener('click', () => {
    onUpdate();
    updateBanner.remove();
  });

  document.getElementById('dismiss-btn').addEventListener('click', () => {
    updateBanner.remove();
  });
}

export function showInstallButton(onInstall) {
  let installBtn = document.getElementById('install-pwa-btn');

  if (!installBtn) {
    installBtn = document.createElement('button');
    installBtn.id = 'install-pwa-btn';
    installBtn.textContent = '📱 安装应用';
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
      transition: transform 0.3s ease;
    `;

    installBtn.addEventListener('click', onInstall);
    document.body.appendChild(installBtn);
  }

  installBtn.style.transform = 'scale(1)';
}

export function hideInstallButton() {
  const installBtn = document.getElementById('install-pwa-btn');
  if (installBtn) {
    installBtn.style.transform = 'scale(0)';
    setTimeout(() => installBtn.remove(), 300);
  }
}
