import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import { initTheme } from './utils/themeManager.js';

const disposeTheme = initTheme();
if (import.meta.hot) import.meta.hot.dispose(disposeTheme);

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
