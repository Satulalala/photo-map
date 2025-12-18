/**
 * 输入校验工具 - 防止注入攻击
 * 
 * 安全原则：
 * 1. 所有用户输入都需要校验
 * 2. 白名单优于黑名单
 * 3. 限制输入长度
 * 4. 转义特殊字符
 */

// ========== 常量配置 ==========

/** 最大输入长度限制 */
export const MAX_LENGTHS = {
  markerName: 100,      // 标记名称
  photoNote: 500,       // 照片备注
  searchKeyword: 50,    // 搜索关键词
  filePath: 260,        // 文件路径（Windows MAX_PATH）
} as const;

/** 危险字符正则 */
const DANGEROUS_PATTERNS = {
  // SQL 注入关键词（better-sqlite3 使用参数化查询，这是额外防护）
  sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b)/gi,
  // 路径遍历
  pathTraversal: /(\.\.[/\\]|[/\\]\.\.|^[/\\])/g,
  // HTML/JS 注入
  htmlInjection: /<[^>]*>|javascript:|on\w+\s*=/gi,
  // 控制字符（除了换行和制表符）
  controlChars: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
};

// ========== 校验函数 ==========

/**
 * 校验并清理文本输入
 * @param input 用户输入
 * @param maxLength 最大长度
 * @returns 清理后的安全文本
 */
export function sanitizeText(input: unknown, maxLength: number = 500): string {
  if (input === null || input === undefined) return '';
  
  let text = String(input);
  
  // 1. 移除控制字符
  text = text.replace(DANGEROUS_PATTERNS.controlChars, '');
  
  // 2. 限制长度
  if (text.length > maxLength) {
    text = text.slice(0, maxLength);
  }
  
  // 3. 去除首尾空白
  text = text.trim();
  
  return text;
}

/**
 * 校验标记名称
 */
export function validateMarkerName(name: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeText(name, MAX_LENGTHS.markerName);
  
  if (!sanitized) {
    return { valid: false, value: '', error: '标记名称不能为空' };
  }
  
  if (sanitized.length < 1) {
    return { valid: false, value: sanitized, error: '标记名称至少需要1个字符' };
  }
  
  return { valid: true, value: sanitized };
}

/**
 * 校验照片备注
 */
export function validatePhotoNote(note: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeText(note, MAX_LENGTHS.photoNote);
  // 备注可以为空
  return { valid: true, value: sanitized };
}

/**
 * 校验搜索关键词
 */
export function validateSearchKeyword(keyword: unknown): { valid: boolean; value: string; error?: string } {
  const sanitized = sanitizeText(keyword, MAX_LENGTHS.searchKeyword);
  // 搜索可以为空（显示全部）
  return { valid: true, value: sanitized };
}

/**
 * 校验坐标值
 */
export function validateCoordinate(
  value: unknown,
  type: 'lat' | 'lng'
): { valid: boolean; value: number; error?: string } {
  const num = Number(value);
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: '坐标必须是数字' };
  }
  
  if (type === 'lat') {
    if (num < -90 || num > 90) {
      return { valid: false, value: num, error: '纬度必须在 -90 到 90 之间' };
    }
  } else {
    if (num < -180 || num > 180) {
      return { valid: false, value: num, error: '经度必须在 -180 到 180 之间' };
    }
  }
  
  return { valid: true, value: num };
}

/**
 * 校验 UUID 格式
 */
export function validateUUID(id: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof id !== 'string') {
    return { valid: false, value: '', error: 'ID 必须是字符串' };
  }
  
  // UUID v4 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return { valid: false, value: id, error: '无效的 ID 格式' };
  }
  
  return { valid: true, value: id };
}

/**
 * 校验文件路径（防止路径遍历攻击）
 */
export function validateFilePath(filePath: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof filePath !== 'string') {
    return { valid: false, value: '', error: '路径必须是字符串' };
  }
  
  // 检查路径遍历
  if (DANGEROUS_PATTERNS.pathTraversal.test(filePath)) {
    return { valid: false, value: '', error: '检测到非法路径' };
  }
  
  // 检查长度
  if (filePath.length > MAX_LENGTHS.filePath) {
    return { valid: false, value: '', error: '路径过长' };
  }
  
  return { valid: true, value: filePath };
}

/**
 * 校验照片 ID（文件名格式）
 */
export function validatePhotoId(photoId: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof photoId !== 'string') {
    return { valid: false, value: '', error: '照片 ID 必须是字符串' };
  }
  
  // 允许 base64 数据 URL
  if (photoId.startsWith('data:image/')) {
    return { valid: true, value: photoId };
  }
  
  // 文件名格式：UUID.扩展名
  const photoIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|gif|webp)$/i;
  
  if (!photoIdRegex.test(photoId)) {
    return { valid: false, value: '', error: '无效的照片 ID 格式' };
  }
  
  return { valid: true, value: photoId };
}

/**
 * 校验数组索引
 */
export function validateIndex(index: unknown, maxIndex: number): { valid: boolean; value: number; error?: string } {
  const num = Number(index);
  
  if (!Number.isInteger(num)) {
    return { valid: false, value: 0, error: '索引必须是整数' };
  }
  
  if (num < 0 || num > maxIndex) {
    return { valid: false, value: 0, error: '索引超出范围' };
  }
  
  return { valid: true, value: num };
}

// ========== HTML 转义 ==========

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * HTML 转义（防止 XSS）
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"'/]/g, char => HTML_ESCAPE_MAP[char] || char);
}

/**
 * 反转义 HTML
 */
export function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

// ========== 导出类型 ==========

export type ValidationResult<T> = {
  valid: boolean;
  value: T;
  error?: string;
};
