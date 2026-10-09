# Field Notes — PhotoMap 前端视觉设计规范

> 版本 2.0 | 2026-06-07
> 设计方向：地质田野笔记（Geological Field Notes）
> 核心隐喻：一本地质学家的野外速写本，摊开在桌面上——左边是等高线地图，右边是标本卡片

---

## 一、色彩

### 亮色主题（Field Notes Daylight）

```
--paper-white:    #fefdf7   奶油纸白
--paper-card:     #faf8f0   略深的纸卡色
--paper-border:   #d4cfc4   铅笔灰线
--paper-border-light: #e5e0d8
--paper-tear:     #ede8dc   撕纸毛边色

--ink-primary:    #2c2416   温暖的墨水黑
--ink-secondary:  #6b5e4e   干涸的墨水色
--ink-muted:      #9b8e7e   褪色铅笔迹
--ink-faint:      #c4bcae   极淡铅笔

--darkroom-red:   #c73e1d   冲印店安全灯红（整个应用唯一的饱和色）
--darkroom-red-hover: #a33217
--darkroom-red-light:  #fef0ec
--darkroom-red-glow: rgba(199, 62, 29, 0.12)

--specimen-green: #4a7c59   标本标签松绿色
--map-brass:      #d4a017   旧地图泛黄铜色

--shadow-sm:      0 1px 2px rgba(44, 36, 22, 0.06)
--shadow-md:      0 4px 8px rgba(44, 36, 22, 0.08)
--shadow-lg:      0 8px 24px rgba(44, 36, 22, 0.10)
--shadow-crease:  0 2px 1px rgba(44, 36, 22, 0.04),
                  inset 0 1px 0 rgba(255, 255, 255, 0.6)
```

**约束**：一屏内 `--darkroom-red` 出现次数 ≤ 3。红色仅用于焦点态、选中态、危险操作。

### 暗色主题（Darkroom Night）

```
--paper-white:    #1a1612
--paper-card:     #221e18
--paper-border:   #3a342c

--ink-primary:    #e8e0d5
--ink-secondary:  #b0a594
--ink-muted:      #706656

--darkroom-red:   #f05030
--darkroom-red-hover: #d04020

--shadow-sm:      0 1px 2px rgba(0, 0, 0, 0.25)
--shadow-crease:  0 2px 1px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.04)
```

---

## 二、字体

| 角色 | 字族 | 字重 | ≥16px 用途 | ≤14px 回退 |
|------|------|------|-----------|-----------|
| 标题 | Noto Serif SC / Lora | 400/600 | 面板标题、地点名、章节头 | — |
| 正文 | Noto Sans SC / Source Sans 3 | 400/500 | 描述段落 | 标签、列表、按钮 |
| 等宽 | JetBrains Mono | 400/500 | — | 坐标、日期、计数 |
| 斜体 | Crimson Text | 400 italic | — | 照片备注（13px） |

**关键规则**：衬线体仅用于 ≥16px。按钮和标签永远用无衬线体。

---

## 三、空间布局

### 根本原则：不对称、对角线、重叠

这不是一个干净的 Grid 系统。这是摊在桌面上的笔记本——纸张可以歪斜、重叠、从地图边缘探出一角。

### 搜索栏——左上角斜贴标签

```
不居中。贴在左上角，向下微倾 1.5 度。
像一个匆忙贴上的标签，左端压住了地图的一小块。

CSS:
  position: fixed;
  top: 16px;
  left: 68px;           /* 给工具栏留位置 */
  transform: rotate(-1.5deg);
  transform-origin: top left;
  z-index: 600;
```

标签的右端微微翘起（box-shadow 右侧比左侧深，模拟纸片不平整）。当搜索栏获得焦点时，旋转归零（回到水平），暗示"准备认真书写"。

### 工具栏——垂直排列，有间距

```
左上角，4 个按钮垂直排列，间距不等：
第 1 个和第 2 个间距 8px（定位+刷新是一组）
第 2 个和第 3 个间距 16px（分隔缩放组）
每个按钮右侧 12px 处有一条极淡的竖线（--ink-faint, 1px, 从按钮顶部延伸到底部），
像笔记本的标尺线。
```

### 标记管理按钮——右下角，一半嵌入地图

```
不漂浮。右下角，底边贴屏幕底部，右边贴屏幕右边。
像一个从地图下方伸出的书签标签。
只有上半部分可见（clip 或 translateY 隐藏下半部分），
hover 时完整滑出。
```

### 标记列表——左侧抽屉 + 留缝

```
宽度：380px（不是 360 或 400——故意取一个非标准值）
背景：--paper-white，比地图背景略亮
右边：不在屏幕最左端，留 12px 缝隙
      这意味着左侧 12px 可以看到地图
      抽屉的右边缘有一个暖灰阴影，看起来像纸张的厚度
抽屉内侧：顶部有横线（CSS repeating-linear-gradient），像笔记本撕下的活页
```

### 照片查看器——地图从不完全消失

```
全屏覆盖时，背景不是纯黑，是 darkroom 暖黑(#1a1612)
但 opacity 只到 0.92——透过那 8% 的透明能看到地图的轮廓
关闭时，照片缩回原位的动画和地图重新出现同步
```

### 设置/生活面板——右侧，地图边缘之外

```
不居中弹窗。从右侧边缘滑入，占屏幕 60% 宽度（最大 640px）。
左侧边缘和地图之间有一条红灯色竖线（2px），
像笔记本封底的红色书签绳，暗示"这里还有内容"。
面板内部左侧有 24px 的空白——红线不紧贴内容。
```

---

## 四、背景与材质

### 全局噪点纹理

整个应用覆盖一层 SVG 噪点。不是覆盖整个屏幕，而是用 `pointer-events: none` 的伪元素：

```css
.app::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,..."); /* 2px 灰度噪点 */
}
```

噪点透明度在暗色模式下提高到 0.04（暗背景下噪点更明显，模拟相纸颗粒）。

### 纸张边缘效果

卡片和面板的边缘不是纯色圆角。有一个极其微妙的"纸张毛边"：

```css
.paper-card {
  border: 1px solid var(--paper-border);
  /* 模拟纸张厚度的内阴影 */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6), /* 顶面反光 */
    0 2px 1px rgba(44, 36, 22, 0.04),
    0 4px 8px rgba(44, 36, 22, 0.06);
  /* 右下角有轻微折痕 */
  position: relative;
}

.paper-card::after {
  content: '';
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 24px;
  height: 24px;
  background: linear-gradient(
    135deg,
    transparent 50%,
    rgba(44, 36, 22, 0.03) 50%,
    rgba(44, 36, 22, 0.05) 100%
  );
  /* 模拟纸张右下角翻起的折痕阴影 */
}
```

### 地图上的等高线肌理

Mapbox 样式从 `streets-v12` 改为 `outdoors-v12`（带地形等高线）。地图上始终有半透明的地形线条——它们和界面的横线纹理形成呼应。

### 暗角效果

照片查看器的覆盖层有一个 CSS radial-gradient 的暗角：

```css
.photo-viewer {
  background: radial-gradient(
    ellipse at center,
    rgba(26, 22, 18, 0.85) 0%,
    rgba(26, 22, 18, 0.95) 70%,
    rgba(26, 22, 18, 1) 100%
  );
}
```

照片在视觉中心更亮，四周渐暗——像在暗房里用放大机看底片。

---

## 五、动效：页面加载编排

### 完整时间线

```
t=0ms     地图开始淡入（fadeIn, 1200ms ease-out）
            不是从黑到亮——是从暗房暖黑背景逐渐变亮到地图。
            用 opacity 0.3 → 1，不是 0 → 1。

t=200ms   搜索标签出现（slideFromTop + rotate -1.5deg, 600ms ease-out）
            从上方滑入时带一个微小的左右摆动（±2px x 偏移），
            模拟标签"啪"地贴到纸上的回弹。

t=300ms   工具栏按钮逐个落下：
            定位  t=300ms
            刷新  t=360ms
            缩放  t=440ms
            热力  t=520ms
            生活  t=580ms
            设置  t=640ms
          每个落下：translateY(-24px) → 0, 400ms ease-out,
          带一个 15% 的过冲然后回弹到最终位置

t=600ms   右下角标记管理标签从下方升起
            translateY(100%) → 0, 500ms ease-out,
            延迟 200ms 开始显示内部数字（数字淡入，300ms）

t=800ms   标记逐个浮现（如果存在）：
            每个标记 scale(0.3) → scale(1), 300ms,
            带 markerDrop 回弹效果
            每个之间 delay 40ms
            最多 15 个标记做这个动画，其余的直接显示

t=1200ms  全部就绪。搜索标签的微倾斜保留，直到用户交互。
```

### 关键帧代码

```css
/* 标签贴纸入场 */
@keyframes labelStick {
  0%   { opacity: 0; transform: translateY(-28px) rotate(-8deg); }
  60%  { opacity: 1; transform: translateY(2px) rotate(-2deg); }
  80%  { transform: translateY(-2px) rotate(-1.2deg); }
  100% { transform: translateY(0) rotate(-1.5deg); }
}

/* 工具栏图标落下 */
@keyframes toolDrop {
  0%   { opacity: 0; transform: translateY(-24px); }
  75%  { opacity: 1; transform: translateY(3px); }   /* 过冲 */
  85%  { transform: translateY(-1px); }               /* 回弹 */
  100% { transform: translateY(0); }
}

/* 书签标签从下方升起 */
@keyframes bookmarkRise {
  0%   { transform: translateY(100%); opacity: 0; }
  70%  { transform: translateY(-4px); opacity: 1; }  /* 轻微过冲 */
  100% { transform: translateY(0); }
}

/* 标记按入地图 */
@keyframes pinPress {
  0%   { opacity: 0; transform: scale(0.3); }
  50%  { opacity: 1; transform: scale(1.18); }         /* 过冲 */
  70%  { transform: scale(0.95); }                     /* 回缩 */
  85%  { transform: scale(1.02); }
  100% { transform: scale(1); }
}
```

### 其他动效

**标记列表抽屉**
```
滑入：transform translateX(calc(-100% + 12px)) → 0
      （起始位置留 12px 缝隙，让地图从缝里透出）
      400ms cubic-bezier(0.22, 0.61, 0.36, 1)
      遮罩：opacity 0 → 0.3，同持续时间，color: rgba(26,22,18,0.3)

滑出：反向，280ms cubic-bezier(0.55, 0.06, 0.68, 0.19)
```

**设置面板红线揭示**
```
面板从右侧滑入时，左边的红线不是一开始就出现——
它在面板完全到位后 150ms 才开始从透明变为红色
（opacity 0 → 1, 200ms），
像一个延迟的视觉提示"看到我了吗？"
```

**照片查看器打开**
```
当前动画保留（scaleIn + fadeIn）
新增：底部工具栏延迟出现（delay 200ms，slideUp）
新增：照片切换改为水平滑动替代当前淡入淡出
      滑动方向跟随箭头方向，300ms ease-out
      旧照片向左滑出，新照片从右侧滑入
      中间有一个极短的停顿（100ms）让用户感知到"翻页"
```

---

## 六、组件

### 地图标记
```
默认态：纸白图钉头 + 墨色边框 + drop-shadow(0 1px 3px rgba(44,36,22,0.2))
选中态：红灯色填充 + 放大 1.15x + 外发光 (box-shadow: 0 0 8px var(--darkroom-red-glow))
新添加：pinPress 动画
```

### 搜索栏（标签贴纸）
```
基础态：rotate(-1.5deg)，左端有不对称阴影
focus态：rotate(0deg)，边框变红灯色，阴影归正
       transition: transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1),
                   box-shadow 300ms ease
placeholder：淡墨 italic，"搜索地点..."
清除按钮：hover 旋转 15deg + 颜色变红，transition 200ms
```

### 照片卡片
```
结构：
  [照片：3px 纸白边框，像相纸白边 + 右下角微折痕]
  [地点名：Noto Serif SC 14px --ink-primary]
  [日期  坐标：JetBrains Mono 12px --ink-muted，用 · 分隔]
  [备注：Crimson Text italic 13px --ink-secondary，超过 2 行截断]

hover：整卡 translateY(-2px)，阴影从 sm 变为 md，transition 200ms
       折痕阴影同时微微加深
选中：红灯边框替代纸白边框
      左侧出现 3px 红灯竖条（absolute 定位在卡片左边）
```

### 按钮体系
```
主按钮：纸白底 + 1px 红灯边框 + 墨色文字，border-radius 4px
        hover: 红灯填满背景 + 文字变白, 200ms
        active: translateY(1px) + 阴影变浅
        focus-visible: 2px off 红灯环

次要按钮：透明底 + 铅笔灰边框
          hover: 边框→墨色, 文字→ink-primary
          active: 同上

危险按钮：透明底 + 红灯文字 + 红灯边框
          hover: 红灯背景 15% opacity

禁用态：opacity 0.4, cursor not-allowed, 无 hover 效果

最小触摸：44×44px
文字按钮最小高度：36px
```

### 设置面板 toggle 开关
```
样式：暖灰轨道 28×14px，墨色圆点 12px，border-radius 7px
active：轨道变红灯色
切换动画：圆点 translateX(14px), 250ms ease-in-out
         同时轨道颜色过渡 200ms
hover：轨道阴影加深
```

### 自定义滚动条
```
窄轨：4px 宽，暖灰（--paper-border），圆角 2px
hover：变红灯色（--darkroom-red），transition 200ms
暗色模式轨道颜色加深
```

---

## 七、空状态与加载

### 首次进入（无标记）
```
地图全出血，无遮罩。
中心区域：
  ├─ 虚线圆（stroke-dasharray: 5 5, stroke: --ink-faint, fill: none）
  ├─ MapPin 图标居中，红灯色，opacity 0.25
  └─ 文字 "点击地图任意位置，钉下第一个标记"
     Noto Serif SC 16px, --ink-secondary, text-align: center
     opacity 脉动: 0.4 → 1 → 0.4, 周期 4s, ease-in-out
没有弹窗，没有遮罩——用户看到的是"摊开的空白笔记本"。
```

### 空搜索
```
Pencil 图标（--ink-muted, 24px）
+ "地图上还没有这个地方"（--ink-secondary, 14px）
+ 灰色建议文字："试试搜索：附近的咖啡馆 · 书店 · 公园"
保留搜索历史列表（如果有）
```

### 空标记列表
```
面板展开后居中显示：
├─ 笔记本横线背景（repeating-linear-gradient,
│   0deg, transparent 0, transparent 23px, --ink-faint 23px, --ink-faint 24px）
├─ MapPin 图标（--ink-muted, 32px）
└─ "你的笔记本是空的"（Noto Serif SC 18px, --ink-secondary）
   + "在地图上钉下第一个标记吧"（Noto Sans SC 14px, --ink-muted）
```

### 启动加载动画
```
描述：铅笔图标画圆
实现：
  SVG 圆，stroke: --darkroom-red, fill: none, stroke-width: 2
  stroke-dasharray: 283（圆的周长），stroke-dashoffset: 283
  动画：stroke-dashoffset 283 → 0, 1200ms ease-in-out
  画完后圆瞬间变虚线（stroke-dasharray: 4 4）然后淡出
  同时地图 fadeIn
寓意：在笔记本上画个圈，标记探索的起点
```

### 照片加载占位
```
容器：--paper-border 背景 + 笔记本横线纹理
尺寸：与照片容器相同的 aspect-ratio
图片 loaded 后：占位 opacity 0 → 照片 opacity 1,
              crossfade 400ms
```

### 数据同步指示
```
小罗盘图标（Compass, lucide），12px
旋转：animation: spin 2s linear infinite
颜色：--darkroom-red
位于工具栏刷新按钮旁边，不独立占位
```

---

## 八、实现阶段

### Phase 1：色彩替换（预计 1-2h）
- 更新 `tokens.css` 为 Field Notes 完整色板（含暗色模式）
- 替换 `base.css` 中旧版 CSS 变量引用
- 更新 `index-web.html` 中 meta theme-color

### Phase 2：全局材质（预计 1.5h）
- SVG 噪点纹理（CSS ::after 全局层）
- 纸张卡片类（`.paper-card` 基础样式 + 折痕伪元素）
- 自定义滚动条样式
- 暗角效果（照片查看器 radial-gradient）

### Phase 3：布局重构（预计 3-4h）
- 搜索栏从左中改为左上斜贴（rotate + transform-origin + focus 动画）
- 标记列表改为左侧带缝抽屉（重构 MarkerListPanel 定位和动画）
- 标记管理按钮移到右下角书签式
- 设置面板改为右侧滑入 + 左边红线
- 工具栏间距和标尺线

### Phase 4：加载编排（预计 1.5h）
- 全局 CSS 关键帧（labelStick / toolDrop / bookmarkRise / pinPress）
- 页面加载序列（animation-delay 编排）
- 启动加载铅笔画圆动画
- 标记出现 stagger

### Phase 5：组件材质升级（预计 2-3h）
- 按钮体系重建（颜色/边框/hover/active/focus）
- 照片卡片白边 + 折痕 + 选中红灯条
- 设置面板 toggle 开关
- 照片查看器底部 toolbar 延迟出现

### Phase 6：空状态与加载态（预计 1h）
- 首次进入引导（虚线圆 + 脉动文字）
- 空搜索
- 空列表（笔记本横线背景）
- 照片占位 crossfade
- 同步罗盘
