import MapIcon from './MapIcon.jsx';

export default function Toolbar({
  mapReady = true,
  measureMode,
  heatmapMode,
  onLocate,
  onRefresh,
  onZoomIn,
  onZoomOut,
  onToggleHeatmap,
  onOpenSettings,
}) {
  return (
    <>
      {/* 左上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-left" role="group" aria-label="定位与刷新">
          <button
            disabled={!mapReady}
            type="button"
            onClick={onLocate}
            data-action="locate"
            data-tooltip="定位"
            aria-label="定位到我的位置"
            title="定位到我的位置"
          >
            <MapIcon name="locate" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            data-action="refresh"
            data-tooltip="刷新"
            aria-label="刷新地图"
            title="刷新地图"
          >
            <MapIcon name="refresh" />
          </button>
        </div>
      )}

      {/* 右上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-right" role="group" aria-label="地图工具">
          <button
            disabled={!mapReady}
            type="button"
            onClick={onZoomIn}
            data-action="zoom-in"
            data-tooltip="放大"
            aria-label="放大地图"
            title="放大地图"
          >
            <MapIcon name="plus" />
          </button>
          <button
            disabled={!mapReady}
            type="button"
            onClick={onZoomOut}
            data-action="zoom-out"
            data-tooltip="缩小"
            aria-label="缩小地图"
            title="缩小地图"
          >
            <MapIcon name="minus" />
          </button>
          <button
            disabled={!mapReady}
            onClick={onToggleHeatmap}
            type="button"
            aria-label="照片热力图"
            aria-pressed={heatmapMode}
            title={heatmapMode ? '关闭照片热力图' : '打开照片热力图'}
            data-action="heatmap"
            className={heatmapMode ? 'active' : ''}
            data-tooltip="热力图"
          >
            <MapIcon name="heatmap" />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="settings-btn"
            data-tooltip="设置"
            aria-label="打开设置"
            title="打开设置"
            data-action="settings"
          >
            <MapIcon name="settings" />
          </button>
        </div>
      )}
    </>
  );
}
