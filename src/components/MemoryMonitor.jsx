import { useState, useEffect } from 'react';
import { getCacheStats, getMemoryInfo, formatBytes } from '../utils/memoryManager.ts';

/**
 * 内存监控面板 - 仅开发模式显示
 * 显示实时内存占用和缓存统计
 */
function MemoryMonitor() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState(null);
  const [memory, setMemory] = useState(null);

  useEffect(() => {
    if (!visible) return;

    const update = () => {
      setStats(getCacheStats());
      setMemory(getMemoryInfo());
    };

    update();
    const timer = setInterval(update, 2000);
    return () => clearInterval(timer);
  }, [visible]);

  // 仅开发模式显示
  if (import.meta.env.PROD) return null;

  return (
    <>
      {/* 触发按钮 */}
      <button
        className="memory-monitor-toggle"
        onClick={() => setVisible(!visible)}
        title="内存监控"
      >
        📊
      </button>

      {/* 监控面板 */}
      {visible && (
        <div className="memory-monitor-panel">
          <div className="mm-header">
            <span>内存监控</span>
            <button onClick={() => setVisible(false)}>×</button>
          </div>
          
          <div className="mm-section">
            <div className="mm-title">JS 堆内存</div>
            {memory ? (
              <>
                <div className="mm-row">
                  <span>已用</span>
                  <span className="mm-value">{formatBytes(memory.usedJSHeapSize)}</span>
                </div>
                <div className="mm-row">
                  <span>总计</span>
                  <span className="mm-value">{formatBytes(memory.totalJSHeapSize)}</span>
                </div>
                <div className="mm-row">
                  <span>限制</span>
                  <span className="mm-value">{formatBytes(memory.jsHeapSizeLimit)}</span>
                </div>
                <div className="mm-bar">
                  <div 
                    className="mm-bar-fill"
                    style={{ width: `${(memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="mm-row">不可用</div>
            )}
          </div>

          <div className="mm-section">
            <div className="mm-title">图片缓存</div>
            {stats && (
              <>
                <div className="mm-row">
                  <span>原图</span>
                  <span className="mm-value">{stats.photoUrl} / 15</span>
                </div>
                <div className="mm-row">
                  <span>缩略图</span>
                  <span className="mm-value">{stats.thumbnail} / 50</span>
                </div>
                <div className="mm-row">
                  <span>占位图</span>
                  <span className="mm-value">{stats.placeholder} / 100</span>
                </div>
                <div className="mm-row mm-total">
                  <span>总计</span>
                  <span className="mm-value">{stats.total}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default MemoryMonitor;
