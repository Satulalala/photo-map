import useUIStore from '../../store/uiStore.js';

export default function ThemeControl() {
  const theme = useUIStore(state => state.theme);
  const changeTheme = useUIStore(state => state.changeTheme);

  return (
    <div className="setting-group">
      <h3>界面主题</h3>
      <div className="setting-row">
        <label className="setting-label" htmlFor="interface-theme">
          <strong>明暗模式</strong>
          <span>选择浅色、深色，或跟随系统设置</span>
        </label>
        <select
          id="interface-theme"
          className="theme-select"
          value={theme}
          onChange={event => changeTheme(event.target.value)}
        >
          <option value="system">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>
    </div>
  );
}
