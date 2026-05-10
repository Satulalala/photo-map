import React from 'react';

export default function Toolbar({
  measureMode,
  heatmapMode,
  showLife,
  onLocate,
  onRefresh,
  onZoomIn,
  onZoomOut,
  onToggleHeatmap,
  onOpenLife,
  onOpenSettings,
}) {
  return (
    <>
      {/* 左上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-left">
          <button onClick={onLocate} data-tooltip="定位">
            <span className="main-tool-icon">🧭</span>
          </button>
          <button onClick={onRefresh} data-tooltip="刷新">
            <span className="main-tool-icon">🔄</span>
          </button>
        </div>
      )}

      {/* 右上角工具栏 */}
      {!measureMode && (
        <div className="toolbar toolbar-right">
          <button onClick={onZoomIn} data-tooltip="放大">
            <span className="main-tool-icon">➕</span>
          </button>
          <button onClick={onZoomOut} data-tooltip="缩小">
            <span className="main-tool-icon">➖</span>
          </button>
          <button
            onClick={onToggleHeatmap}
            className={heatmapMode ? 'active' : ''}
            data-tooltip="热力图"
          >
            <span className="main-tool-icon">🔥</span>
          </button>
          <button
            onClick={onOpenLife}
            className={showLife ? 'active' : ''}
            data-tooltip="生活"
          >
            <span className="main-tool-icon">🌟</span>
          </button>
          <button onClick={onOpenSettings} className="settings-btn" data-tooltip="设置">
            <span className="main-tool-icon">⚙️</span>
          </button>
        </div>
      )}
    </>
  );
}
