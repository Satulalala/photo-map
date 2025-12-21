/**
 * React 性能分析工具
 * 
 * 集成 React DevTools Profiler，提供组件渲染性能分析
 * 
 * @example
 * // 在组件中使用
 * import { withProfiler, useRenderCount } from './utils/performanceProfiler';
 * 
 * // 方式1：高阶组件
 * export default withProfiler(MyComponent, 'MyComponent');
 * 
 * // 方式2：Hook
 * function MyComponent() {
 *   useRenderCount('MyComponent');
 *   return <div>...</div>;
 * }
 */

import { Profiler, useRef, useEffect, useCallback } from 'react';

// ========== 配置 ==========

/** 是否启用性能分析（仅开发环境） */
const PROFILER_ENABLED = import.meta.env?.DEV ?? false;

/** 渲染时间警告阈值（毫秒） */
const RENDER_WARNING_THRESHOLD = 16; // 60fps = 16.67ms

/** 是否记录所有渲染（否则只记录慢渲染） */
const LOG_ALL_RENDERS = false;

/** 性能数据存储 */
const performanceData = {
  renders: [],
  components: new Map(),
  slowRenders: [],
};

// ========== Profiler 回调 ==========

/**
 * Profiler onRender 回调函数
 * 
 * @param {string} id - 组件标识
 * @param {string} phase - 渲染阶段 ('mount' | 'update')
 * @param {number} actualDuration - 实际渲染时间
 * @param {number} baseDuration - 基准渲染时间
 * @param {number} startTime - 开始时间
 * @param {number} commitTime - 提交时间
 */
function onRenderCallback(
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) {
  const renderInfo = {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    timestamp: Date.now(),
  };

  // 存储渲染数据
  performanceData.renders.push(renderInfo);

  // 更新组件统计
  if (!performanceData.components.has(id)) {
    performanceData.components.set(id, {
      renderCount: 0,
      totalDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      avgDuration: 0,
    });
  }

  const stats = performanceData.components.get(id);
  stats.renderCount++;
  stats.totalDuration += actualDuration;
  stats.maxDuration = Math.max(stats.maxDuration, actualDuration);
  stats.minDuration = Math.min(stats.minDuration, actualDuration);
  stats.avgDuration = stats.totalDuration / stats.renderCount;

  // 检查慢渲染
  const isSlow = actualDuration > RENDER_WARNING_THRESHOLD;
  
  if (isSlow) {
    performanceData.slowRenders.push(renderInfo);
    
    console.warn(
      `⚠️ 慢渲染检测: ${id}`,
      `\n  阶段: ${phase}`,
      `\n  耗时: ${actualDuration.toFixed(2)}ms`,
      `\n  基准: ${baseDuration.toFixed(2)}ms`
    );
  } else if (LOG_ALL_RENDERS) {
    console.log(
      `📊 渲染: ${id}`,
      `| ${phase}`,
      `| ${actualDuration.toFixed(2)}ms`
    );
  }
}

// ========== 高阶组件 ==========

/**
 * 性能分析高阶组件
 * 
 * @param {React.Component} WrappedComponent - 要包装的组件
 * @param {string} id - 组件标识（用于分析报告）
 * @returns {React.Component} 包装后的组件
 * 
 * @example
 * const ProfiledComponent = withProfiler(MyComponent, 'MyComponent');
 */
export function withProfiler(WrappedComponent, id) {
  if (!PROFILER_ENABLED) {
    return WrappedComponent;
  }

  const displayName = id || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function ProfiledComponent(props) {
    return (
      <Profiler id={displayName} onRender={onRenderCallback}>
        <WrappedComponent {...props} />
      </Profiler>
    );
  }

  ProfiledComponent.displayName = `withProfiler(${displayName})`;

  return ProfiledComponent;
}

// ========== Hooks ==========

/**
 * 渲染计数 Hook
 * 
 * 在开发环境中记录组件渲染次数
 * 
 * @param {string} componentName - 组件名称
 * 
 * @example
 * function MyComponent() {
 *   useRenderCount('MyComponent');
 *   return <div>...</div>;
 * }
 */
export function useRenderCount(componentName) {
  const renderCount = useRef(0);

  useEffect(() => {
    if (PROFILER_ENABLED) {
      renderCount.current++;
      console.log(`🔄 ${componentName} 渲染次数: ${renderCount.current}`);
    }
  });
}

/**
 * 渲染原因追踪 Hook
 * 
 * 追踪导致组件重新渲染的 props 变化
 * 
 * @param {string} componentName - 组件名称
 * @param {Object} props - 组件 props
 * 
 * @example
 * function MyComponent(props) {
 *   useWhyDidYouRender('MyComponent', props);
 *   return <div>...</div>;
 * }
 */
export function useWhyDidYouRender(componentName, props) {
  const previousProps = useRef();

  useEffect(() => {
    if (!PROFILER_ENABLED) return;

    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps = {};

      allKeys.forEach(key => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`🔍 ${componentName} 重新渲染原因:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * 性能测量 Hook
 * 
 * 测量特定操作的执行时间
 * 
 * @returns {Object} 包含 startMeasure 和 endMeasure 方法
 * 
 * @example
 * function MyComponent() {
 *   const { startMeasure, endMeasure } = usePerformanceMeasure();
 *   
 *   const handleClick = () => {
 *     startMeasure('expensiveOperation');
 *     // ... 耗时操作
 *     endMeasure('expensiveOperation');
 *   };
 * }
 */
export function usePerformanceMeasure() {
  const measures = useRef(new Map());

  const startMeasure = useCallback((name) => {
    if (!PROFILER_ENABLED) return;
    measures.current.set(name, performance.now());
  }, []);

  const endMeasure = useCallback((name) => {
    if (!PROFILER_ENABLED) return;
    
    const startTime = measures.current.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      measures.current.delete(name);
      return duration;
    }
    return null;
  }, []);

  return { startMeasure, endMeasure };
}

// ========== 报告生成 ==========

/**
 * 获取性能报告
 * 
 * @returns {Object} 性能报告数据
 */
export function getPerformanceReport() {
  const componentStats = Array.from(performanceData.components.entries())
    .map(([id, stats]) => ({
      id,
      ...stats,
      minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration);

  return {
    summary: {
      totalRenders: performanceData.renders.length,
      slowRenders: performanceData.slowRenders.length,
      uniqueComponents: performanceData.components.size,
      slowRenderPercentage: performanceData.renders.length > 0
        ? ((performanceData.slowRenders.length / performanceData.renders.length) * 100).toFixed(2)
        : 0,
    },
    componentStats,
    slowRenders: performanceData.slowRenders.slice(-20), // 最近 20 次慢渲染
    timestamp: new Date().toISOString(),
  };
}

/**
 * 打印性能报告到控制台
 */
export function printPerformanceReport() {
  if (!PROFILER_ENABLED) {
    console.log('性能分析仅在开发环境可用');
    return;
  }

  const report = getPerformanceReport();

  console.group('📊 性能分析报告');
  
  console.log('📈 总览:');
  console.table(report.summary);
  
  console.log('\n🏆 组件渲染统计（按平均耗时排序）:');
  console.table(report.componentStats.slice(0, 10));
  
  if (report.slowRenders.length > 0) {
    console.log('\n⚠️ 最近的慢渲染:');
    console.table(report.slowRenders.slice(-5).map(r => ({
      组件: r.id,
      阶段: r.phase,
      耗时: `${r.actualDuration.toFixed(2)}ms`,
      时间: new Date(r.timestamp).toLocaleTimeString(),
    })));
  }
  
  console.groupEnd();
}

/**
 * 清除性能数据
 */
export function clearPerformanceData() {
  performanceData.renders = [];
  performanceData.components.clear();
  performanceData.slowRenders = [];
  console.log('🗑️ 性能数据已清除');
}

// ========== 全局暴露（开发环境） ==========

if (PROFILER_ENABLED && typeof window !== 'undefined') {
  window.__PERF__ = {
    getReport: getPerformanceReport,
    printReport: printPerformanceReport,
    clearData: clearPerformanceData,
    data: performanceData,
  };
  
  console.log(
    '📊 性能分析工具已启用\n' +
    '  - window.__PERF__.printReport() 打印报告\n' +
    '  - window.__PERF__.getReport() 获取数据\n' +
    '  - window.__PERF__.clearData() 清除数据'
  );
}

// ========== 导出 ==========

export default {
  withProfiler,
  useRenderCount,
  useWhyDidYouRender,
  usePerformanceMeasure,
  getPerformanceReport,
  printPerformanceReport,
  clearPerformanceData,
  PROFILER_ENABLED,
};