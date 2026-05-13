import React, { useState, useEffect, useCallback } from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    this.setState({
      error,
      errorInfo
    });

    // 发送错误报告
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      props: this.props.context || {}
    };

    // 发送到错误监控服务
    if (window.errorReporting) {
      window.errorReporting.captureException(error, {
        tags: {
          component: 'ErrorBoundary',
          boundary: this.props.name || 'Unknown'
        },
        extra: errorReport
      });
    }

    // 发送到分析服务
    if (window.analytics) {
      window.analytics.trackError(error, {
        errorBoundary: this.props.name,
        componentStack: errorInfo.componentStack
      });
    }

    // 开发环境下打印详细错误
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Props:', this.props);
      console.groupEnd();
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // 跟踪重试事件
    if (window.analytics) {
      window.analytics.trackEvent('error_boundary_retry', {
        boundary: this.props.name,
        errorId: this.state.errorId
      });
    }
  };

  handleReload = () => {
    // 跟踪重新加载事件
    if (window.analytics) {
      window.analytics.trackEvent('error_boundary_reload', {
        boundary: this.props.name,
        errorId: this.state.errorId
      });
    }

    window.location.reload();
  };

  handleReport = () => {
    const errorDetails = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      component: this.props.name,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // 复制错误信息到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
        .then(() => {
          alert('错误信息已复制到剪贴板');
        })
        .catch(() => {
          // 降级方案
          const textArea = document.createElement('textarea');
          textArea.value = JSON.stringify(errorDetails, null, 2);
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('错误信息已复制到剪贴板');
        });
    }

    // 跟踪报告事件
    if (window.analytics) {
      window.analytics.trackEvent('error_boundary_report', {
        boundary: this.props.name,
        errorId: this.state.errorId
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误UI
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo,
          this.handleRetry
        );
      }

      // 默认错误UI
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            
            <h2 className="error-title">
              {this.props.title || '出现了一些问题'}
            </h2>
            
            <p className="error-message">
              {this.props.message || '应用遇到了意外错误，请尝试刷新页面或联系技术支持。'}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>错误详情 (开发模式)</summary>
                <div className="error-stack">
                  <h4>错误信息:</h4>
                  <pre>{this.state.error?.message}</pre>
                  
                  <h4>错误堆栈:</h4>
                  <pre>{this.state.error?.stack}</pre>
                  
                  <h4>组件堆栈:</h4>
                  <pre>{this.state.errorInfo?.componentStack}</pre>
                </div>
              </details>
            )}

            <div className="error-actions">
              <button 
                className="error-button error-button-primary"
                onClick={this.handleRetry}
              >
                🔄 重试
              </button>
              
              <button 
                className="error-button error-button-secondary"
                onClick={this.handleReload}
              >
                🔃 刷新页面
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button 
                  className="error-button error-button-tertiary"
                  onClick={this.handleReport}
                >
                  📋 复制错误信息
                </button>
              )}
            </div>

            <div className="error-info">
              <p className="error-id">错误ID: {this.state.errorId}</p>
              <p className="error-time">
                时间: {new Date().toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 高阶组件：为组件添加错误边界
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = props => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook：在函数组件中使用错误边界
export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error, errorInfo = {}) => {
    setError({ error, errorInfo });
    
    // 报告错误
    if (window.errorReporting) {
      window.errorReporting.captureException(error, {
        tags: { component: 'useErrorHandler' },
        extra: errorInfo
      });
    }

    if (window.analytics) {
      window.analytics.trackError(error, errorInfo);
    }
  }, []);

  // 如果有错误，抛出它以便被错误边界捕获
  if (error) {
    throw error.error;
  }

  return { captureError, resetError };
};

// 异步错误边界组件
export const AsyncErrorBoundary = ({ children, fallback, onError }) => {
  const [asyncError, setAsyncError] = useState(null);

  useEffect(() => {
    const handleUnhandledRejection = event => {
      setAsyncError(event.reason);
      if (onError) {
        onError(event.reason, { type: 'unhandledRejection' });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  if (asyncError) {
    if (fallback) {
      return fallback(asyncError, { type: 'async' }, () => setAsyncError(null));
    }
    
    throw asyncError;
  }

  return children;
};

// 网络错误边界组件
export const NetworkErrorBoundary = ({ children, fallback }) => {
  const [networkError, setNetworkError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkError(new Error('网络连接已断开'));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (networkError && !isOnline) {
    if (fallback) {
      return fallback(networkError, { type: 'network', isOnline }, () => {
        setNetworkError(null);
      });
    }

    return (
      <div className="network-error-boundary">
        <div className="network-error-content">
          <div className="network-error-icon">📡</div>
          <h3>网络连接已断开</h3>
          <p>请检查您的网络连接，然后重试。</p>
          <button 
            onClick={() => window.location.reload()}
            className="error-button error-button-primary"
          >
            重新连接
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ErrorBoundary;