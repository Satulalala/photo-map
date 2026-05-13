import { pinyin } from 'pinyin-pro';

function getPinyinArray(text) {
  try {
    return pinyin(text, { toneType: 'none', type: 'array' });
  } catch {
    return [];
  }
}

function getPinyinInitials(text) {
  try {
    return pinyin(text, { pattern: 'first', toneType: 'none', type: 'array' }).join('');
  } catch {
    return '';
  }
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * 多策略搜索匹配：子串匹配、拼音全拼、拼音首字母、编辑距离容错
 * @param {string} query 用户输入的搜索词
 * @param {string} name  标记名称
 * @returns {boolean}
 */
/**
 * 获取搜索词在标记名中的匹配字符范围（用于高亮）
 * @param {string} query 用户输入的搜索词
 * @param {string} name  标记名称
 * @returns {Array<[number, number]>} [start, end] 范围数组（end 不包含）
 */
export function getMatchRanges(query, name) {
  if (!query || !name) return [];

  const q = String(query).toLowerCase().trim();
  const n = String(name).toLowerCase().trim();
  if (!q || !n) return [];

  const ranges = [];

  // 1. 直接子串匹配（所有出现位置）
  let searchFrom = 0;
  let idx;
  while ((idx = n.indexOf(q, searchFrom)) !== -1) {
    ranges.push([idx, idx + q.length]);
    searchFrom = idx + q.length;
  }
  if (ranges.length > 0) return ranges;

  const pyArray = getPinyinArray(name);
  if (!pyArray.length) return ranges;
  const fullPinyin = pyArray.join('');

  // 2. 拼音全拼匹配 → 定位对应的中文字符
  const pyIdx = fullPinyin.indexOf(q);
  if (pyIdx !== -1) {
    let start = 0, end = pyArray.length, accum = 0;
    for (let i = 0; i < pyArray.length; i++) {
      const nextAccum = accum + pyArray[i].length;
      if (accum <= pyIdx) start = i;
      accum = nextAccum;
      if (accum >= pyIdx + q.length) { end = i + 1; break; }
    }
    ranges.push([start, end]);
    return ranges;
  }

  // 3. 拼音首字母匹配
  const initials = getPinyinInitials(name);
  if (initials) {
    const iIdx = initials.indexOf(q);
    if (iIdx !== -1) {
      ranges.push([iIdx, iIdx + q.length]);
      return ranges;
    }
  }

  // 4. 拼音前缀匹配
  for (let i = 0; i < pyArray.length; i++) {
    if (pyArray[i].startsWith(q)) {
      ranges.push([i, i + 1]);
      return ranges;
    }
  }

  // 5. 编辑距离容错 → 高亮整个名称
  if (q.length >= 2 && [...q].every(c => /[一-鿿]/.test(c))) {
    const dist = levenshteinDistance(q, n);
    if (dist === 1 && q.length <= 4) {
      ranges.push([0, name.length]);
    }
  }

  return ranges;
}

export function matchMarkerName(query, name) {
  if (!query || !name) return false;

  const q = String(query).toLowerCase().trim();
  const n = String(name).toLowerCase().trim();
  if (!q || !n) return false;

  // 1. 子串匹配（保持原有行为）
  if (n.includes(q)) return true;

  // 2. 拼音全拼匹配：输入"xihu"匹配"西湖"
  const pyArray = getPinyinArray(name);
  if (pyArray.length > 0) {
    const fullPinyin = pyArray.join('');
    if (fullPinyin.includes(q)) return true;

    // 3. 拼音首字母匹配：输入"xh"匹配"西湖"
    const initials = getPinyinInitials(name);
    if (initials && initials.includes(q)) return true;

    // 4. 拼音前缀匹配：输入"xi"匹配"西湖"（拼音数组逐词前缀）
    for (const py of pyArray) {
      if (py.startsWith(q)) return true;
    }
  }

  // 5. 编辑距离容错：中文输入"夕湖"匹配"西湖"（距离≤1且查询长度≥2）
  if (q.length >= 2 && [...q].every(c => /[一-鿿]/.test(c))) {
    const dist = levenshteinDistance(q, n);
    if (dist === 1 && q.length <= 4) return true;
  }

  return false;
}
