import { useCallback, useEffect, useRef, useState } from 'react';
import './admin.css';
import './admin-details.css';
import { getSessionUser, logout } from '../../api/auth.js';
import {
  getAdminAudit,
  getAdminSummary,
  getAdminUsers,
  setAdminUserStatus,
} from '../../api/admin.js';
import { AdminGate, formatBytes, formatDate, SummaryCard } from './AdminPageParts.jsx';

const PAGE_SIZE = 25;

export default function AdminPage() {
  const [sessionStatus, setSessionStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [section, setSection] = useState('overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [usersCursor, setUsersCursor] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditCursor, setAuditCursor] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [targetAccount, setTargetAccount] = useState(null);
  const [reason, setReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const reasonInputRef = useRef(null);
  const modalReturnFocusRef = useRef(null);

  useEffect(() => {
    if (targetAccount) {
      reasonInputRef.current?.focus();
    } else if (modalReturnFocusRef.current?.isConnected) {
      modalReturnFocusRef.current.focus();
      modalReturnFocusRef.current = null;
    }
  }, [targetAccount]);

  const checkDashboardAccess = useCallback(async account => {
    setUser(account);
    setSessionStatus('checking');
    setError('');
    try {
      setSummary(await getAdminSummary());
      setSessionStatus('ready');
    } catch (failure) {
      if (failure.status === 401) {
        setUser(null);
        setSessionStatus('signed-out');
      } else if (failure.status === 403) {
        setSessionStatus('forbidden');
      } else {
        setError(failure.message || '管理服务暂时不可用');
        setSessionStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    getSessionUser()
      .then(account => {
        if (active) void checkDashboardAccess(account);
      })
      .catch(() => {
        if (active) setSessionStatus('signed-out');
      });
    return () => {
      active = false;
    };
  }, [checkDashboardAccess]);

  const loadUsers = useCallback(async (search = query, cursor = null, append = false) => {
    setUsersLoading(true);
    setError('');
    try {
      const result = await getAdminUsers({ query: search, cursor, limit: PAGE_SIZE });
      setUsers(current => append ? [...current, ...result.users] : result.users);
      setUsersCursor(result.nextCursor);
    } catch (failure) {
      setError(failure.message || '无法读取账号列表');
    } finally {
      setUsersLoading(false);
    }
  }, [query]);

  const loadAudit = useCallback(async (cursor = null, append = false) => {
    setAuditLoading(true);
    setError('');
    try {
      const result = await getAdminAudit({ cursor, limit: PAGE_SIZE });
      setAuditEvents(current => append ? [...current, ...result.events] : result.events);
      setAuditCursor(result.nextCursor);
    } catch (failure) {
      setError(failure.message || '无法读取操作记录');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'ready') return;
    if (section === 'users') void loadUsers(query, null, false);
    if (section === 'audit') void loadAudit(null, false);
  }, [sessionStatus, section, query, loadUsers, loadAudit]);

  const refreshSummary = async () => {
    try {
      setSummary(await getAdminSummary());
    } catch (failure) {
      setError(failure.message || '无法刷新概览');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setSummary(null);
      setSessionStatus('signed-out');
    }
  };

  const handleSearch = event => {
    event.preventDefault();
    setQuery(queryDraft.trim());
  };

  const handleStatusChange = async event => {
    event.preventDefault();
    if (!targetAccount || savingStatus) return;
    const nextStatus = targetAccount.status === 'active' ? 'suspended' : 'active';
    setSavingStatus(true);
    setError('');
    setNotice('');
    try {
      await setAdminUserStatus(targetAccount.id, nextStatus, reason);
      setTargetAccount(null);
      setReason('');
      setNotice(nextStatus === 'suspended' ? '账号已停用，现有云端会话已撤销。' : '账号已恢复。');
      await Promise.all([refreshSummary(), loadUsers(query, null, false)]);
    } catch (failure) {
      setError(failure.message || '账号状态更新失败');
    } finally {
      setSavingStatus(false);
    }
  };

  const closeStatusDialog = () => {
    if (!savingStatus) setTargetAccount(null);
  };

  if (sessionStatus !== 'ready') {
    return (
      <AdminGate
        status={sessionStatus}
        user={user}
        error={error}
        onLogin={checkDashboardAccess}
        onLogout={handleLogout}
        onRetry={() => user ? void checkDashboardAccess(user) : setSessionStatus('signed-out')}
      />
    );
  }

  const navigation = [
    { id: 'overview', label: '概览', icon: '◫' },
    { id: 'users', label: '账号管理', icon: '♙' },
    { id: 'audit', label: '操作记录', icon: '≡' },
  ];

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <a className="admin-sidebar-brand" href="/" aria-label="返回 PhotoMap">
          <span className="admin-brand-mark" aria-hidden="true">P</span>
          <span><strong>PhotoMap</strong><small>管理后台</small></span>
        </a>
        <nav className="admin-navigation" aria-label="管理后台">
          <span className="admin-nav-heading">管理</span>
          {navigation.map(item => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${section === item.id ? 'active' : ''}`}
              aria-current={section === item.id ? 'page' : undefined}
              onClick={() => {
                setSection(item.id);
                setError('');
                setNotice('');
              }}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-avatar" aria-hidden="true">
            {(user?.username || user?.email || 'A')[0].toUpperCase()}
          </span>
          <span className="admin-sidebar-user">
            <strong>{user?.username || '管理员'}</strong>
            <small>{user?.email}</small>
          </span>
          <button type="button" className="admin-logout" onClick={handleLogout} aria-label="退出登录" title="退出登录">
            ↗
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">PHOTOMAP / ADMIN</span>
            <h1>{section === 'overview' ? '服务概览' : section === 'users' ? '账号管理' : '操作记录'}</h1>
          </div>
          <a href="/" className="admin-button secondary">返回照片地图</a>
        </header>

        {error && <div className="admin-alert error" role="alert">{error}</div>}
        {notice && <div className="admin-alert success" role="status">{notice}</div>}

        {section === 'overview' && summary && (
          <section aria-label="服务概览" className="admin-content">
            <div className="admin-section-intro">
              <div><h2>账号与云存储</h2><p>显示账号状态和照片云存储汇总。</p></div>
              <button type="button" className="admin-button secondary" onClick={() => void refreshSummary()}>
                刷新数据
              </button>
            </div>
            <div className="admin-summary-grid">
              <SummaryCard label="全部账号" value={summary.totalUsers.toLocaleString('zh-CN')} detail={`${summary.adminUsers} 位管理员`} />
              <SummaryCard label="正常使用" value={summary.activeUsers.toLocaleString('zh-CN')} detail="可登录并使用云同步" tone="positive" />
              <SummaryCard label="已停用" value={summary.suspendedUsers.toLocaleString('zh-CN')} detail="云端访问已暂停" tone="caution" />
              <SummaryCard label="云存储已用" value={formatBytes(summary.usedBytes)} detail={`预留空间 ${formatBytes(summary.reservedBytes)}`} />
            </div>
            <article className="admin-info-card">
              <div><span className="admin-info-dot" aria-hidden="true" /><strong>单账号照片存储上限</strong></div>
              <span>{formatBytes(summary.quotaPerUserBytes)}</span>
            </article>
          </section>
        )}

        {section === 'users' && (
          <section className="admin-content" aria-label="账号列表">
            <div className="admin-section-intro">
              <div><h2>账号</h2><p>按邮箱、用户名或账号 ID 查找，可停用或恢复普通账号。</p></div>
              <form className="admin-search" onSubmit={handleSearch} role="search">
                <label className="admin-visually-hidden" htmlFor="admin-user-search">搜索账号</label>
                <input
                  id="admin-user-search"
                  value={queryDraft}
                  maxLength={100}
                  onChange={event => setQueryDraft(event.target.value)}
                  placeholder="邮箱、用户名或 ID"
                />
                <button type="submit" className="admin-button primary">搜索</button>
              </form>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>账号</th><th>权限</th><th>状态</th><th>云存储</th><th>注册时间</th><th>操作</th></tr></thead>
                <tbody>
                  {users.map(account => {
                    const used = account.usedBytes + account.reservedBytes;
                    const percent = account.quotaBytes ? Math.min(100, (used / account.quotaBytes) * 100) : 0;
                    return (
                      <tr key={account.id}>
                        <td><strong>{account.email}</strong><small>ID {account.id} · {account.username}</small></td>
                        <td><span className={`admin-role ${account.role}`}>{account.role === 'admin' ? '管理员' : '普通用户'}</span></td>
                        <td><span className={`admin-status ${account.status}`}>{account.status === 'active' ? '正常' : '已停用'}</span></td>
                        <td>
                          <div className="admin-usage-label">{formatBytes(used)} <span>/ {formatBytes(account.quotaBytes)}</span></div>
                          <div className="admin-usage-track" aria-label={`云存储使用 ${Math.round(percent)}%`}><span style={{ width: `${percent}%` }} /></div>
                        </td>
                        <td>{formatDate(account.createdAt)}</td>
                        <td>
                          {account.role === 'user' ? (
                            <button
                              type="button"
                              className={`admin-button small ${account.status === 'active' ? 'danger' : 'secondary'}`}
                              onClick={event => {
                                setReason('');
                                modalReturnFocusRef.current = event.currentTarget;
                                setTargetAccount(account);
                              }}
                            >
                              {account.status === 'active' ? '停用' : '恢复'}
                            </button>
                          ) : <span className="admin-muted">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {!usersLoading && users.length === 0 && <tr><td className="admin-empty" colSpan="6">没有找到账号</td></tr>}
                </tbody>
              </table>
            </div>
            {usersLoading && <p className="admin-loading-inline" role="status">正在读取账号…</p>}
            {usersCursor && (
              <div className="admin-pagination">
                <button type="button" className="admin-button secondary" disabled={usersLoading} onClick={() => void loadUsers(query, usersCursor, true)}>
                  加载更多
                </button>
              </div>
            )}
          </section>
        )}

        {section === 'audit' && (
          <section className="admin-content" aria-label="账号操作记录">
            <div className="admin-section-intro">
              <div><h2>账号状态变更</h2><p>记录管理员对账号执行的停用和恢复操作。</p></div>
              <button type="button" className="admin-button secondary" disabled={auditLoading} onClick={() => void loadAudit()}>
                刷新记录
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table admin-audit-table">
                <thead><tr><th>操作</th><th>目标账号</th><th>操作人</th><th>原因</th><th>时间</th></tr></thead>
                <tbody>
                  {auditEvents.map(event => (
                    <tr key={event.id}>
                      <td><span className={`admin-audit-action ${event.action}`}>{event.action === 'suspend' ? '停用账号' : '恢复账号'}</span></td>
                      <td><strong>{event.targetEmail}</strong><small>ID {event.targetUserId ?? '已删除'}</small></td>
                      <td>{event.actorEmail}</td>
                      <td className="admin-reason-cell">{event.reason}</td>
                      <td>{formatDate(event.createdAt)}</td>
                    </tr>
                  ))}
                  {!auditLoading && auditEvents.length === 0 && <tr><td className="admin-empty" colSpan="5">暂无操作记录</td></tr>}
                </tbody>
              </table>
            </div>
            {auditLoading && <p className="admin-loading-inline" role="status">正在读取记录…</p>}
            {auditCursor && (
              <div className="admin-pagination">
                <button type="button" className="admin-button secondary" disabled={auditLoading} onClick={() => void loadAudit(auditCursor, true)}>
                  加载更多
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {targetAccount && (
        <div className="admin-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeStatusDialog(); }}>
          <form
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
            onSubmit={handleStatusChange}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeStatusDialog();
                return;
              }
              if (event.key !== 'Tab') return;
              const focusable = event.currentTarget.querySelectorAll('textarea:not(:disabled), button:not(:disabled)');
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <span className={`admin-modal-icon ${targetAccount.status === 'active' ? 'warning' : 'success'}`} aria-hidden="true">
              {targetAccount.status === 'active' ? '!' : '✓'}
            </span>
            <h2 id="admin-modal-title">{targetAccount.status === 'active' ? '停用账号' : '恢复账号'}</h2>
            <p className="admin-modal-account">{targetAccount.email}</p>
            <p>{targetAccount.status === 'active'
              ? '停用后，该账号的云同步和照片云端访问将暂停，现有云端会话会立即失效。'
              : '恢复后，该账号可以重新登录并继续使用云同步。'}</p>
            <label htmlFor="admin-action-reason">操作原因</label>
            <textarea
              ref={reasonInputRef}
              id="admin-action-reason"
              value={reason}
              minLength={3}
              maxLength={300}
              required
              onChange={event => setReason(event.target.value)}
              placeholder="填写 3 至 300 个字符"
            />
            <div className="admin-modal-actions">
              <button type="button" className="admin-button secondary" disabled={savingStatus} onClick={closeStatusDialog}>
                取消
              </button>
              <button type="submit" className={`admin-button ${targetAccount.status === 'active' ? 'danger' : 'primary'}`} disabled={savingStatus || reason.trim().length < 3}>
                {savingStatus ? '正在提交…' : targetAccount.status === 'active' ? '确认停用' : '确认恢复'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
