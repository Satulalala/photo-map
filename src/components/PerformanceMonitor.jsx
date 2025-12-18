import { useState, useEffect, useCallback, memo } from 'react';

/**
 * 性能监控组件 - 显示 FPS、内存使用等信息
 * 仅在开发模式下显示
 */
const PerformanceMonitor = memo(function PerformanceMonitor({ enabled = true }) {
  const [stats, setStats] = useState({
    fps: 0,
    memory: 0,
    renderCount: 0,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || process.env.NODE_ENV === 'production') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId;

    const updateStats = () => {
      frameCount++;
      const now = performance.now();
      
      if (now - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (now - lastTime));
        
        // 获取内存使用（如果可用）
        let memory = 0;
        if (performance.memory) {
          memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }
        
        setStats(prev => ({
          fps,
          memory,
          renderCount: prev.renderCount + 1,
        }));
        
        frameCount = 0;
        lastTime = now;
      }
      
      animationId = requestAnimationFrame(updateStats);
    };

    animationId = requestAnimationFrame(updateStats);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [enabled]);

  // 快捷键切换显示 (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!enabled || process.env.NODE_ENV === 'production' || !visible) {
    return null;
  }

  const fpsColor = stats.fps >= 50 ? '#22c55e' : stats.fps >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      position: 'fixed',
      top: 50,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: 6,
      fontSize: 12,
      fontFamily: 'monospace',
      zIndex: 9999,
      minWidth: 120,
    }}>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>FPS: </span>
        <span style={{ color: fpsColor, fontWeight: 'bold' }}>{stats.fps}</span>
      </div>
      {stats.memory > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: '#94a3b8' }}>内存: </span>
          <span style={{ color: '#60a5fa' }}>{stats.memory} MB</span>
        </div>
      )}
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
        Ctrl+Shift+P 切换
      </div>
    </div>
  );
});

export default PerformanceMonitor;

/**
 * 性能分析 Hook - 用于测量组件渲染时间
 */
export function useRenderTime(componentName) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      if (duration > 16) { // 超过 16ms (60fps) 才记录
        console.warn(`[性能] ${componentName} 渲染耗时: ${duration.toFixed(2)}ms`);
      }
    };
  });
}

/**
 * 性能标记 - 用于 React DevTools Profiler
 */
export function onRenderCallback(
  id, // 组件 ID
  phase, // "mount" 或 "update"
  actualDuration, // 本次渲染耗时
  baseDuration, // 不使用 memo 时的预估耗时
  startTime, // 开始渲染时间
  commitTime, // 提交时间
) {
  if (process.env.NODE_ENV === 'production') return;
  
  if (actualDuration > 10) {
    console.log(`[Profiler] ${id} (${phase}): ${actualDuration.toFixed(2)}ms`);
  }
}
