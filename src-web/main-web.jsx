import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../src/App.jsx';
import WebAdapter from './WebAdapter.js';
import '../src/index.css';
import './web-styles.css';
import { initTheme } from '../src/utils/themeManager.js';

const AdminPage = React.lazy(() => import('../src/components/admin/AdminPage.jsx'));

const disposeTheme = initTheme();
if (import.meta.hot) import.meta.hot.dispose(disposeTheme);

const isAdminRoute = /^\/admin\/?$/.test(window.location.pathname);

// 管理页只使用服务端管理 API，不初始化照片地图的数据适配器。
if (!isAdminRoute) new WebAdapter();
if (isAdminRoute) document.title = 'PhotoMap 管理后台';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAdminRoute ? (
      <React.Suspense fallback={<main role="status">正在加载管理后台…</main>}>
        <AdminPage />
      </React.Suspense>
    ) : <App />}
  </React.StrictMode>
);
