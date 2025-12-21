/**
 * 地图相册 - 通用工具函数
 * 
 * 本文件包含常用的工具函数，采用语义化命名，
 * 每个函数都有详细的中文注释和使用示例。
 */

import {
  SUPPORTED_IMAGE_FORMATS,
  SUPPORTED_IMAGE_EXTENSIONS,
  MAX_PHOTO_SIZE,
  SEARCH_DEBOUNCE_DELAY
} from '../constants';

// ========== 类型检查函数 ==========

/**
 * 检查值是否为空（null、undefined、空字符串、空数组、空对象）
 * 
 * @param {*} value - 要检查的值
 * @returns {boolean} 是否为空
 * 
 * @example
 * isEmpty(null)        // true
 * isEmpty('')          // true
 * isEmpty([])          // true
 * isEmpty({})          // true
 * isEmpty('hello')     // false
 * isEmpty([1, 2, 3])   // false
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 检查值是否为有效数字
 * 
 * @param {*} value - 要检查的值
 * @returns {boolean} 是否为有效数字
 * 
 * @example
 * isValidNumber(123)       // true
 * isValidNumber('123')     // true
 * isValidNumber(NaN)       // false
 * isValidNumber(Infinity)  // false
 */
export function isValidNumber(value) {
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * 检查值是否为有效的经纬度坐标
 * 
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @returns {boolean} 是否为有效坐标
 * 
 * @example
 * isValidCoordinate(39.9, 116.4)   // true (北京)
 * isValidCoordinate(91, 180)       // false (纬度超出范围)
 */
export function isValidCoordinate(lat, lng) {
  return (
    isValidNumber(lat) &&
    isValidNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * 检查文件是否为支持的图片格式
 * 
 * @param {File|string} file - 文件对象或文件名
 * @returns {boolean} 是否为支持的图片格式
 * 
 * @example
 * isValidImageFile(file)           // true (如果是 jpg/png/webp/gif)
 * isValidImageFile('photo.jpg')    // true
 * isValidImageFile('document.pdf') // false
 */
export function isValidImageFile(file) {
  if (file instanceof File) {
    return SUPPORTED_IMAGE_FORMATS.includes(file.type);
  }
  if (typeof file === 'string') {
    const ext = file.toLowerCase().split('.').pop();
    return SUPPORTED_IMAGE_EXTENSIONS.includes(`.${ext}`);
  }
  return false;
}

/**
 * 检查文件大小是否在限制范围内
 * 
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大大小（字节），默认为 MAX_PHOTO_SIZE
 * @returns {boolean} 是否在限制范围内
 * 
 * @example
 * isFileSizeValid(file)                    // true (如果小于 50MB)
 * isFileSizeValid(file, 10 * 1024 * 1024)  // true (如果小于 10MB)
 */
export function isFileSizeValid(file, maxSize = MAX_PHOTO_SIZE) {
  return file instanceof File && file.size <= maxSize;
}

// ========== 格式化函数 ==========

/**
 * 格式化文件大小为人类可读格式
 * 
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数，默认为 2
 * @returns {string} 格式化后的大小字符串
 * 
 * @example
 * formatFileSize(1024)         // '1 KB'
 * formatFileSize(1048576)      // '1 MB'
 * formatFileSize(1073741824)   // '1 GB'
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * 格式化日期为本地化字符串
 * 
 * @param {Date|string|number} date - 日期对象、日期字符串或时间戳
 * @param {string} format - 格式类型：'date'|'time'|'datetime'|'relative'
 * @returns {string} 格式化后的日期字符串
 * 
 * @example
 * formatDate(new Date(), 'date')      // '2024年12月21日'
 * formatDate(new Date(), 'time')      // '14:30:00'
 * formatDate(new Date(), 'datetime')  // '2024年12月21日 14:30:00'
 * formatDate(new Date(), 'relative')  // '刚刚' 或 '5分钟前'
 */
export function formatDate(date, format = 'datetime') {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return '无效日期';
  }
  
  const options = {
    date: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
    datetime: { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }
  };
  
  if (format === 'relative') {
    return formatRelativeTime(d);
  }
  
  return d.toLocaleString('zh-CN', options[format] || options.datetime);
}

/**
 * 格式化相对时间
 * 
 * @param {Date} date - 日期对象
 * @returns {string} 相对时间字符串
 * 
 * @example
 * formatRelativeTime(new Date())                    // '刚刚'
 * formatRelativeTime(new Date(Date.now() - 60000))  // '1分钟前'
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  if (months < 12) return `${months}个月前`;
  return `${years}年前`;
}

/**
 * 格式化坐标为字符串
 * 
 * @param {number} lat - 纬度
 * @param {number} lng - 经度
 * @param {number} precision - 小数位数，默认为 6
 * @returns {string} 格式化后的坐标字符串
 * 
 * @example
 * formatCoordinate(39.9042, 116.4074)  // '39.904200, 116.407400'
 * formatCoordinate(39.9042, 116.4074, 2)  // '39.90, 116.41'
 */
export function formatCoordinate(lat, lng, precision = 6) {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
}

/**
 * 格式化距离为人类可读格式
 * 
 * @param {number} meters - 距离（米）
 * @returns {string} 格式化后的距离字符串
 * 
 * @example
 * formatDistance(500)    // '500 米'
 * formatDistance(1500)   // '1.5 公里'
 * formatDistance(10000)  // '10 公里'
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} 米`;
  }
  return `${(meters / 1000).toFixed(1)} 公里`;
}

// ========== 字符串处理函数 ==========

/**
 * 截断字符串并添加省略号
 * 
 * @param {string} str - 原始字符串
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀，默认为 '...'
 * @returns {string} 截断后的字符串
 * 
 * @example
 * truncateString('这是一段很长的文字', 5)  // '这是一段很...'
 */
export function truncateString(str, maxLength, suffix = '...') {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + suffix;
}

/**
 * 将字符串首字母大写
 * 
 * @param {string} str - 原始字符串
 * @returns {string} 首字母大写的字符串
 * 
 * @example
 * capitalizeFirst('hello world')  // 'Hello world'
 */
export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 将字符串转换为驼峰命名
 * 
 * @param {string} str - 原始字符串（可以是 kebab-case 或 snake_case）
 * @returns {string} 驼峰命名的字符串
 * 
 * @example
 * toCamelCase('hello-world')   // 'helloWorld'
 * toCamelCase('hello_world')   // 'helloWorld'
 */
export function toCamelCase(str) {
  return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
}

/**
 * 将字符串转换为短横线命名
 * 
 * @param {string} str - 原始字符串（驼峰命名）
 * @returns {string} 短横线命名的字符串
 * 
 * @example
 * toKebabCase('helloWorld')  // 'hello-world'
 */
export function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ========== 数组处理函数 ==========

/**
 * 数组去重
 * 
 * @param {Array} arr - 原始数组
 * @param {string|Function} key - 去重依据的键名或函数
 * @returns {Array} 去重后的数组
 * 
 * @example
 * uniqueArray([1, 2, 2, 3])                    // [1, 2, 3]
 * uniqueArray([{id: 1}, {id: 1}, {id: 2}], 'id')  // [{id: 1}, {id: 2}]
 */
export function uniqueArray(arr, key) {
  if (!key) {
    return [...new Set(arr)];
  }
  
  const seen = new Set();
  return arr.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * 数组分组
 * 
 * @param {Array} arr - 原始数组
 * @param {string|Function} key - 分组依据的键名或函数
 * @returns {Object} 分组后的对象
 * 
 * @example
 * groupBy([{type: 'a', v: 1}, {type: 'b', v: 2}, {type: 'a', v: 3}], 'type')
 * // { a: [{type: 'a', v: 1}, {type: 'a', v: 3}], b: [{type: 'b', v: 2}] }
 */
export function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    (groups[value] = groups[value] || []).push(item);
    return groups;
  }, {});
}

/**
 * 数组排序（支持多字段）
 * 
 * @param {Array} arr - 原始数组
 * @param {Array<{key: string, order: 'asc'|'desc'}>} sortBy - 排序规则
 * @returns {Array} 排序后的数组
 * 
 * @example
 * sortArray(users, [{key: 'age', order: 'desc'}, {key: 'name', order: 'asc'}])
 */
export function sortArray(arr, sortBy) {
  return [...arr].sort((a, b) => {
    for (const { key, order = 'asc' } of sortBy) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
    }
    return 0;
  });
}

/**
 * 数组分块
 * 
 * @param {Array} arr - 原始数组
 * @param {number} size - 每块大小
 * @returns {Array<Array>} 分块后的二维数组
 * 
 * @example
 * chunkArray([1, 2, 3, 4, 5], 2)  // [[1, 2], [3, 4], [5]]
 */
export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ========== 函数工具 ==========

/**
 * 防抖函数
 * 
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒），默认为 SEARCH_DEBOUNCE_DELAY
 * @returns {Function} 防抖后的函数
 * 
 * @example
 * const debouncedSearch = debounce(search, 300);
 * input.addEventListener('input', debouncedSearch);
 */
export function debounce(func, wait = SEARCH_DEBOUNCE_DELAY) {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流函数
 * 
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 * 
 * @example
 * const throttledScroll = throttle(handleScroll, 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function throttled(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 延迟执行函数
 * 
 * @param {number} ms - 延迟时间（毫秒）
 * @returns {Promise} Promise 对象
 * 
 * @example
 * await delay(1000);  // 等待 1 秒
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * 
 * @param {Function} func - 要重试的异步函数
 * @param {number} retries - 重试次数
 * @param {number} delayMs - 重试间隔（毫秒）
 * @returns {Promise} Promise 对象
 * 
 * @example
 * const result = await retry(() => fetchData(), 3, 1000);
 */
export async function retry(func, retries = 3, delayMs = 1000) {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await func();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
}

// ========== 地理计算函数 ==========

/**
 * 计算两点之间的距离（Haversine 公式）
 * 
 * @param {number} lat1 - 第一点纬度
 * @param {number} lng1 - 第一点经度
 * @param {number} lat2 - 第二点纬度
 * @param {number} lng2 - 第二点经度
 * @returns {number} 距离（米）
 * 
 * @example
 * calculateDistance(39.9, 116.4, 31.2, 121.5)  // 约 1068 公里
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径（米）
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 角度转弧度
 * 
 * @param {number} degrees - 角度
 * @returns {number} 弧度
 */
export function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 弧度转角度
 * 
 * @param {number} radians - 弧度
 * @returns {number} 角度
 */
export function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * 计算边界框
 * 
 * @param {Array<{lat: number, lng: number}>} points - 坐标点数组
 * @returns {{minLat: number, maxLat: number, minLng: number, maxLng: number}} 边界框
 * 
 * @example
 * calculateBounds([{lat: 39.9, lng: 116.4}, {lat: 31.2, lng: 121.5}])
 * // { minLat: 31.2, maxLat: 39.9, minLng: 116.4, maxLng: 121.5 }
 */
export function calculateBounds(points) {
  if (!points || points.length === 0) {
    return null;
  }
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  
  for (const { lat, lng } of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  
  return { minLat, maxLat, minLng, maxLng };
}

// ========== DOM 工具函数 ==========

/**
 * 安全地获取 DOM 元素
 * 
 * @param {string} selector - CSS 选择器
 * @param {Element} parent - 父元素，默认为 document
 * @returns {Element|null} DOM 元素或 null
 */
export function getElement(selector, parent = document) {
  try {
    return parent.querySelector(selector);
  } catch {
    return null;
  }
}

/**
 * 安全地获取多个 DOM 元素
 * 
 * @param {string} selector - CSS 选择器
 * @param {Element} parent - 父元素，默认为 document
 * @returns {Array<Element>} DOM 元素数组
 */
export function getElements(selector, parent = document) {
  try {
    return Array.from(parent.querySelectorAll(selector));
  } catch {
    return [];
  }
}

/**
 * 复制文本到剪贴板
 * 
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 * 
 * @example
 * await copyToClipboard('Hello World');
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
}

// ========== 随机生成函数 ==========

/**
 * 生成随机 ID
 * 
 * @param {number} length - ID 长度，默认为 8
 * @returns {string} 随机 ID
 * 
 * @example
 * generateId()     // 'a1b2c3d4'
 * generateId(16)   // 'a1b2c3d4e5f6g7h8'
 */
export function generateId(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机颜色
 * 
 * @param {string} format - 格式：'hex'|'rgb'|'hsl'
 * @returns {string} 随机颜色
 * 
 * @example
 * generateColor('hex')  // '#a1b2c3'
 * generateColor('rgb')  // 'rgb(161, 178, 195)'
 */
export function generateColor(format = 'hex') {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  
  switch (format) {
    case 'rgb':
      return `rgb(${r}, ${g}, ${b})`;
    case 'hsl':
      const h = Math.floor(Math.random() * 360);
      const s = Math.floor(Math.random() * 100);
      const l = Math.floor(Math.random() * 100);
      return `hsl(${h}, ${s}%, ${l}%)`;
    default:
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// ========== 导出所有函数 ==========

export default {
  // 类型检查
  isEmpty,
  isValidNumber,
  isValidCoordinate,
  isValidImageFile,
  isFileSizeValid,
  
  // 格式化
  formatFileSize,
  formatDate,
  formatRelativeTime,
  formatCoordinate,
  formatDistance,
  
  // 字符串处理
  truncateString,
  capitalizeFirst,
  toCamelCase,
  toKebabCase,
  
  // 数组处理
  uniqueArray,
  groupBy,
  sortArray,
  chunkArray,
  
  // 函数工具
  debounce,
  throttle,
  delay,
  retry,
  
  // 地理计算
  calculateDistance,
  toRadians,
  toDegrees,
  calculateBounds,
  
  // DOM 工具
  getElement,
  getElements,
  copyToClipboard,
  
  // 随机生成
  generateId,
  generateColor
};