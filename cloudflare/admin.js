const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;
const MAX_REASON_LENGTH = 300;

function parsePageSize(rawValue) {
  const value = rawValue || '25';
  if (!/^\d{1,3}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_PAGE_SIZE) : null;
}

function parseCursor(rawValue) {
  if (rawValue === null) return null;
  if (!/^[1-9]\d{0,15}$/.test(rawValue)) return NaN;
  const parsed = Number(rawValue);
  return Number.isSafeInteger(parsed) ? parsed : NaN;
}

function getPage(requestUrl, cursorName = 'cursor') {
  const limit = parsePageSize(requestUrl.searchParams.get('limit'));
  const cursor = parseCursor(requestUrl.searchParams.get(cursorName));
  if (!limit || Number.isNaN(cursor)) return null;
  return { limit, cursor };
}

function accountSummary(row, quotaBytes) {
  return {
    id: Number(row.id),
    email: row.email,
    username: row.username,
    role: row.role,
    status: row.account_status,
    createdAt: Number(row.created_at),
    usedBytes: Number(row.used_bytes || 0),
    reservedBytes: Number(row.reserved_bytes || 0),
    quotaBytes,
  };
}

async function getSummary(env, quotaBytes) {
  const [users, storage] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) AS active, " +
        "SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) AS suspended, " +
        "SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins FROM users"
    ).first(),
    env.DB.prepare(
      'SELECT COALESCE(SUM(used_bytes), 0) AS used, COALESCE(SUM(reserved_bytes), 0) AS reserved ' +
        'FROM cloud_storage_usage'
    ).first(),
  ]);

  return {
    totalUsers: Number(users?.total || 0),
    activeUsers: Number(users?.active || 0),
    suspendedUsers: Number(users?.suspended || 0),
    adminUsers: Number(users?.admins || 0),
    usedBytes: Number(storage?.used || 0),
    reservedBytes: Number(storage?.reserved || 0),
    quotaPerUserBytes: quotaBytes,
  };
}

async function listUsers(env, requestUrl, quotaBytes) {
  const page = getPage(requestUrl);
  const query = (requestUrl.searchParams.get('q') || '').trim();
  if (!page || query.length > MAX_SEARCH_LENGTH) return { error: '查询参数无效' };

  const conditions = [];
  const bindings = [];
  if (query) {
    const numericId = /^[1-9]\d{0,15}$/.test(query) && Number.isSafeInteger(Number(query))
      ? Number(query)
      : -1;
    conditions.push('(u.id = ? OR instr(lower(u.email), lower(?)) > 0 OR instr(lower(u.username), lower(?)) > 0)');
    bindings.push(numericId, query, query);
  }
  if (page.cursor !== null) {
    conditions.push('u.id < ?');
    bindings.push(page.cursor);
  }

  const result = await env.DB.prepare(
    'SELECT u.id, u.email, u.username, u.role, u.account_status, u.created_at, ' +
      'COALESCE(s.used_bytes, 0) AS used_bytes, COALESCE(s.reserved_bytes, 0) AS reserved_bytes ' +
      'FROM users u LEFT JOIN cloud_storage_usage s ON s.user_id = u.id ' +
      `${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ` +
      'ORDER BY u.id DESC LIMIT ?'
  )
    .bind(...bindings, page.limit + 1)
    .all();
  const rows = result.results || [];
  const hasMore = rows.length > page.limit;
  const visibleRows = hasMore ? rows.slice(0, page.limit) : rows;
  return {
    users: visibleRows.map(row => accountSummary(row, quotaBytes)),
    nextCursor: hasMore ? String(visibleRows[visibleRows.length - 1].id) : null,
  };
}

async function listAuditEvents(env, requestUrl) {
  const page = getPage(requestUrl);
  if (!page) return { error: '查询参数无效' };
  const cursorCondition = page.cursor === null ? '' : 'WHERE id < ?';
  const statement = env.DB.prepare(
    'SELECT id, actor_user_id, actor_email, target_user_id, target_email, action, ' +
      'previous_status, new_status, reason, created_at FROM admin_audit_events ' +
      `${cursorCondition} ORDER BY id DESC LIMIT ?`
  );
  const result = await (page.cursor === null
    ? statement.bind(page.limit + 1).all()
    : statement.bind(page.cursor, page.limit + 1).all());
  const rows = result.results || [];
  const hasMore = rows.length > page.limit;
  const visibleRows = hasMore ? rows.slice(0, page.limit) : rows;
  return {
    events: visibleRows.map(row => ({
      id: Number(row.id),
      actorUserId: row.actor_user_id === null ? null : Number(row.actor_user_id),
      actorEmail: row.actor_email,
      targetUserId: row.target_user_id === null ? null : Number(row.target_user_id),
      targetEmail: row.target_email,
      action: row.action,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      reason: row.reason,
      createdAt: Number(row.created_at),
    })),
    nextCursor: hasMore ? String(visibleRows[visibleRows.length - 1].id) : null,
  };
}

async function updateAccountStatus(request, env, actor, targetId, dependencies) {
  const { json, readJson } = dependencies;
  const parsed = await readJson(request);
  if (parsed.error) return json({ ok: false, error: parsed.error }, 400);
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return json({ ok: false, error: '请求格式错误' }, 400);
  }

  const status = parsed.value.status;
  const reason = typeof parsed.value.reason === 'string' ? parsed.value.reason.trim() : '';
  if (!['active', 'suspended'].includes(status)) {
    return json({ ok: false, error: '账号状态无效' }, 400);
  }
  if (reason.length < 3 || reason.length > MAX_REASON_LENGTH) {
    return json({ ok: false, error: '操作原因需为 3 至 300 个字符' }, 400);
  }

  const target = await env.DB.prepare(
    'SELECT id, email, role, account_status FROM users WHERE id = ?'
  ).bind(targetId).first();
  if (!target) return json({ ok: false, error: '账号不存在' }, 404);
  if (target.role !== 'user' || Number(target.id) === Number(actor.id)) {
    return json({ ok: false, error: '此账号不能由后台修改状态' }, 409);
  }

  const currentStatus = target.account_status;
  if (currentStatus === status) {
    return json({ ok: true, changed: false, user: { id: Number(target.id), status } });
  }

  const action = status === 'suspended' ? 'suspend' : 'restore';
  const now = Date.now();
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE users SET account_status = ?, auth_version = auth_version + 1 " +
        "WHERE id = ? AND role = 'user' AND account_status = ?"
    ).bind(status, target.id, currentStatus),
    env.DB.prepare(
      'INSERT INTO admin_audit_events ' +
        '(actor_user_id, actor_email, target_user_id, target_email, action, previous_status, new_status, reason, created_at) ' +
        'SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1'
    ).bind(
      actor.id,
      actor.email,
      target.id,
      target.email,
      action,
      currentStatus,
      status,
      reason,
      now
    ),
  ]);

  if (Number(results[0]?.meta?.changes || 0) !== 1) {
    return json({ ok: false, error: '账号状态已变化，请刷新后重试' }, 409);
  }
  return json({ ok: true, changed: true, user: { id: Number(target.id), status } });
}

export async function handleAdminRequest(request, env, actor, dependencies) {
  const { json, hasTrustedOrigin, photoQuotaBytes } = dependencies;
  const requestUrl = new URL(request.url);
  const { pathname } = requestUrl;

  if (request.method !== 'GET' && !hasTrustedOrigin(request)) {
    return json({ ok: false, error: '请求来源无效' }, 403);
  }
  if (pathname === '/api/v1/admin/summary' && request.method === 'GET') {
    return json({ ok: true, summary: await getSummary(env, photoQuotaBytes(env)) });
  }
  if (pathname === '/api/v1/admin/users' && request.method === 'GET') {
    const result = await listUsers(env, requestUrl, photoQuotaBytes(env));
    return result.error ? json({ ok: false, error: result.error }, 400) : json({ ok: true, ...result });
  }
  if (pathname === '/api/v1/admin/audit' && request.method === 'GET') {
    const result = await listAuditEvents(env, requestUrl);
    return result.error ? json({ ok: false, error: result.error }, 400) : json({ ok: true, ...result });
  }

  const statusMatch = /^\/api\/v1\/admin\/users\/([1-9]\d{0,15})\/status$/.exec(pathname);
  if (statusMatch && request.method === 'POST') {
    const targetId = Number(statusMatch[1]);
    if (!Number.isSafeInteger(targetId)) return json({ ok: false, error: '账号 ID 无效' }, 400);
    return updateAccountStatus(request, env, actor, targetId, dependencies);
  }
  return json({ ok: false, error: '接口不存在' }, 404);
}
