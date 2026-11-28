import LoginButtons from '../LoginButtons.jsx';

export function formatBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = bytes / 1024;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDate(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function AdminGate({ status, user, error, onLogin, onLogout, onRetry }) {
  if (status === 'checking') {
    return <main className="admin-gate"><p role="status">正在验证管理权限…</p></main>;
  }

  const title = status === 'forbidden' ? '此账号没有管理权限' : 'PhotoMap 管理后台';
  const description = status === 'forbidden'
    ? `当前账号 ${user?.email || ''} 不能访问管理后台。`
    : '请使用管理员账号登录。';

  return (
    <main className="admin-gate">
      <section className="admin-gate-card" aria-labelledby="admin-gate-title">
        <a className="admin-gate-brand" href="/" aria-label="返回 PhotoMap">
          <span className="admin-brand-mark" aria-hidden="true">P</span>
          <span>PhotoMap</span>
        </a>
        <h1 id="admin-gate-title">{title}</h1>
        <p>{error || description}</p>
        {status === 'error' && (
          <button type="button" className="admin-button secondary" onClick={onRetry}>
            重试
          </button>
        )}
        <div className="admin-gate-login">
          <LoginButtons
            onLogin={onLogin}
            onLogout={onLogout}
            isLoggedIn={Boolean(user)}
            showButtons={!user}
            user={user}
          />
        </div>
        <a className="admin-back-link" href="/">返回照片地图</a>
      </section>
    </main>
  );
}

export function SummaryCard({ label, value, detail, tone = '' }) {
  return (
    <article className={`admin-summary-card ${tone}`}>
      <span className="admin-summary-label">{label}</span>
      <strong className="admin-summary-value">{value}</strong>
      <span className="admin-summary-detail">{detail}</span>
    </article>
  );
}
