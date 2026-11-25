import useUIStore from '../../store/uiStore.js';

const THEME_OPTIONS = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
];

export default function ThemeControl() {
  const theme = useUIStore(state => state.theme);
  const changeTheme = useUIStore(state => state.changeTheme);

  return (
    <div className="setting-group-block">
      <p className="setting-group-caption">界面主题</p>
      <div className="setting-group hairline-group">
        <div className="setting-row">
          <div className="setting-label">
            <strong>明暗模式</strong>
            <span>即时切换浅色、深色，或跟随系统外观</span>
          </div>
          <div className="theme-seg-group" role="group" aria-label="明暗模式">
            {THEME_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                className="theme-seg-btn"
                aria-pressed={theme === option.value}
                onClick={() => changeTheme(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
