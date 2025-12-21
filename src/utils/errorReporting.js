import * as Sentry from '@sentry/electron/renderer';
import { captureException, captureMessage, addBreadcrumb } from '@sentry/electron/renderer';

class ErrorReporting {
  constructor() {
    this.isInitialized = false;
    this.isDevelopment = import.meta.env?.DEV ?? false;
  }

  init(config = {}) {
    if (this.isInitialized || this.isDevelopment) {
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn || import.meta.env?.VITE_SENTRY_DSN || '',
        environment: import.meta.env?.MODE || 'production',
        release: config.version || '1.0.0',
        
        // 性能监控
        tracesSampleRate: 0.1,
        
        // 错误过滤
        beforeSend(event, hint) {
          // 过滤掉开发环境的错误
          if (import.meta.env?.DEV) {
            return null;
          }
          
          // 过滤掉网络错误
          if (hint.originalException?.name === 'NetworkError') {
            return null;
          }
          
          return event;
        },
        
        // 集成配置
        integrations: [
          new Sentry.Integrations.Breadcrumbs({
            console: true,
            dom: true,
            fetch: true,
            history: true,
            sentry: true,
            xhr: true
          })
        ],
        
        // 隐私设置
        beforeBreadcrumb(breadcrumb) {
          // 过滤敏感信息
          if (breadcrumb.category === 'console' && breadcrumb.data?.logger === 'console') {
            const message = breadcrumb.message || '';
            if (message.includes('password') || message.includes('token')) {
              return null;
            }
          }
          return breadcrumb;
        }
      });

      this.isInitialized = true;
      console.log('✅ Sentry initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Sentry:', error);
    }
  }

  // 捕获异常
  captureError(error, context = {}) {
    if (this.isDevelopment) {
      console.error('Development Error:', error, context);
      return;
    }

    try {
      Sentry.withScope((scope) => {
        // 添加上下文信息
        Object.keys(context).forEach(key => {
          scope.setContext(key, context[key]);
        });
        
        // 添加用户信息
        scope.setUser({
          id: this.getUserId(),
          platform: process.platform,
          version: this.getAppVersion()
        });
        
        captureException(error);
      });
    } catch (sentryError) {
      console.error('Failed to report error to Sentry:', sentryError);
    }
  }

  // 捕获消息
  captureInfo(message, level = 'info', extra = {}) {
    if (this.isDevelopment) {
      console.log(`[${level.toUpperCase()}] ${message}`, extra);
      return;
    }

    try {
      Sentry.withScope((scope) => {
        scope.setLevel(level);
        Object.keys(extra).forEach(key => {
          scope.setExtra(key, extra[key]);
        });
        captureMessage(message);
      });
    } catch (error) {
      console.error('Failed to report message to Sentry:', error);
    }
  }

  // 添加面包屑
  addBreadcrumb(message, category = 'custom', data = {}) {
    try {
      addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
        timestamp: Date.now() / 1000
      });
    } catch (error) {
      console.error('Failed to add breadcrumb:', error);
    }
  }

  // 设置用户上下文
  setUser(userInfo) {
    if (this.isDevelopment) return;
    
    try {
      Sentry.setUser({
        id: userInfo.id || this.getUserId(),
        email: userInfo.email,
        username: userInfo.username,
        platform: process.platform,
        version: this.getAppVersion()
      });
    } catch (error) {
      console.error('Failed to set user context:', error);
    }
  }

  // 设置标签
  setTag(key, value) {
    if (this.isDevelopment) return;
    
    try {
      Sentry.setTag(key, value);
    } catch (error) {
      console.error('Failed to set tag:', error);
    }
  }

  // 性能监控
  startTransaction(name, operation = 'navigation') {
    if (this.isDevelopment) return null;
    
    try {
      return Sentry.startTransaction({
        name,
        op: operation
      });
    } catch (error) {
      console.error('Failed to start transaction:', error);
      return null;
    }
  }

  // 获取用户ID（匿名）
  getUserId() {
    let userId = localStorage.getItem('anonymous_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('anonymous_user_id', userId);
    }
    return userId;
  }

  // 获取应用版本
  getAppVersion() {
    try {
      return require('../../package.json').version;
    } catch {
      return '1.0.0';
    }
  }

  // React 错误边界集成
  createErrorBoundary() {
    return class SentryErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true };
      }

      componentDidCatch(error, errorInfo) {
        errorReporting.captureError(error, {
          errorInfo,
          componentStack: errorInfo.componentStack
        });
      }

      render() {
        if (this.state.hasError) {
          return this.props.fallback || (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center',
              background: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '8px',
              margin: '20px'
            }}>
              <h2>出现了一个错误</h2>
              <p>我们已经记录了这个问题，请刷新页面重试。</p>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                刷新页面
              </button>
            </div>
          );
        }

        return this.props.children;
      }
    };
  }
}

// 创建全局实例
const errorReporting = new ErrorReporting();

// 全局错误处理
window.addEventListener('error', (event) => {
  errorReporting.captureError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorReporting.captureError(event.reason, {
    type: 'unhandledrejection'
  });
});

export default errorReporting;