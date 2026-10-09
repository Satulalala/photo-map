import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../src/App.jsx';
import WebAdapter from './WebAdapter.js';
import '../src/index.css';
import './web-styles.css';
import { initTheme } from '../src/utils/themeManager.js';

const disposeTheme = initTheme();
if (import.meta.hot) import.meta.hot.dispose(disposeTheme);

// 初始化 Web 适配器
new WebAdapter();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
