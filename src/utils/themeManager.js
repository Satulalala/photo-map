/**
 * 主题管理工具
 * 支持 light / dark / system 三种模式
 * 通过 data-theme 属性切换 tokens.css 中定义的 CSS 变量
 */

const THEME_KEY = 'photomap-theme';

export function getTheme() {
  const theme = localStorage.getItem(THEME_KEY);
  return ['light', 'dark', 'system'].includes(theme) ? theme : 'system';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  document.documentElement.setAttribute('data-theme', resolved);
}

/**
 * 初始化主题：在应用启动时调用
 */
export function initTheme() {
  const saved = getTheme();
  applyTheme(saved);

  // 监听系统主题变化
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    if (getTheme() === 'system') {
      applyTheme('system');
    }
  };
  query.addEventListener('change', handleChange);
  return () => query.removeEventListener('change', handleChange);
}

/**
 * 切换主题（light ↔ dark）
 */
export function toggleTheme() {
  const current =
    document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
