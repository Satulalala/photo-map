import { Component } from 'react';

/**
 * 错误边界组件 - 防止白屏
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // 可以在这里上报错误
    console.error('应用错误:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😵</div>
          <h1 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 10px 0' }}>
            哎呀，出错了
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: '0 0 30px 0', maxWidth: '400px' }}>
            应用遇到了一个问题。你可以尝试重新加载，或者联系开发者。
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.target.style.background = '#2563eb'}
              onMouseOut={(e) => e.target.style.background = '#3b82f6'}
            >
              🔄 重新加载
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
              🔙 尝试恢复
            </button>
          </div>
          
          {this.state.error && (
            <details style={{
              marginTop: '30px',
              padding: '16px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
            }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                查看错误详情
              </summary>
              <pre style={{
                marginTop: '10px',
                fontSize: '11px',
                color: '#ef4444',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
