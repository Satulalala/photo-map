# Photo Map 环境与界面维护（2026-10-06）

## 项目阅读结论

同一套 React 界面通过 `src/api/` 调用桌面 IPC 或 WebAdapter；Vite 根据 `BUILD_TARGET`
选择入口。桌面层实际位于
`electron/`，SQLite 与照片处理依赖原生模块，升级 Electron 后必须在实际运行时验证加载。Java 服务提供登录、同步和 AI 接口，当前默认使用 H2 内存数据库。

本次保留原有地图、左右工具栏和右下角相册入口布局，搜索框位于顶部中间；登录、设置、相册、照片查看与编辑、生活和地球村界面统一为白色、浅灰和蓝色的简约样式，并提供深色主题。
`App.jsx`
仍承担较多编排工作，本次把搜索和相册入口拆为小组件，保持现有地图、相册和同步调用路径。工作开始前仓库已有未提交改动，保留这些改动，没有创建提交或推送。

## 更新内容

- `.nvmrc`、Node engines、CI 与 Docker 统一到 Node 22；提供 `npm run env:check`。
- 更新 Vite、Vitest、Electron、原生模块重建工具和相关依赖；React 保持 18.3，类型包与其对应。
- Vite 配置迁移到 Rolldown/Oxc；声明原本缺失的 PostCSS 插件，生产环境才进行 CSS 压缩。
- ESLint 使用 flat config 兼容原规则；Husky 使用当前初始化方式。
- Spring Boot 更新到 3.5.16，增加 Windows JDK/Maven 检测与后端启动脚本。
- 地图搜索和工具栏采用中性浮层、统一的线性 SVG 图标和清晰焦点提示；相册入口显示实际照片及地点数量。结构图标使用
  `currentColor`、统一 viewBox 和描边，品牌图标保留原有填充。
- 明暗主题通过 Zustand 管理并保存；跟随系统主题时响应系统变化。
- 搜索支持键盘选择及空结果 Esc 收起；设置弹窗支持焦点循环、Esc 关闭和焦点恢复。
- 补充移动端布局、动态视口高度、安全区域和减少动画设置。
- 修复 SDK 下载失败时进入按钮无效的问题：加载进度完成后仍可选择游客进入相册，地图相关按钮保持禁用并提供重新加载提示；SDK 后续加载成功时自动初始化地图。入口动画的定时任务会在卸载时清理，减少动画模式下先监听完成事件再执行零时长移动，避免卡住。
- 重写照片查看和编辑界面；修复方向键重复切换、借用 Blob
  URL 被提前释放和异步照片加载覆盖新选择的问题。旋转、裁剪和导出副本使用实际图片尺寸计算，保存期间阻止重复操作。
- 相册列表与网格共用照片展开组件，支持键盘操作、加载状态和错误反馈。生活面板直接切换视图，移除多层延迟；弹窗统一处理嵌套焦点、Tab、Esc 和关闭后的焦点恢复。
- 表单与合并操作增加忙碌状态及失败反馈；设置关闭入口统一处理未保存修改。新拆分的 UI 组件和样式文件均不超过 400 行。
- GitHub 登录、密码找回和地球村发布/加入/创建尚未接入实际服务，界面明确禁用或说明。桌面版入口指向项目发布页面，不再提供虚构安装包链接。
- 2026-10-07 收尾检查修正 WebAdapter 照片读取与写入使用不同数据库的问题，统一使用项目存储；兼容读取旧库且不删除旧数据。照片信息请求忽略过期结果并处理读取失败，浏览器测试同时检查未捕获异常。
- 2026-10-07 按反馈调整界面密度：缩小设置与生活页标题、卡片间距和统计字号，设置弹窗固定为桌面 760×600px（小屏随视口适配），内容区独立滚动且切换导航回到顶部。相册入口缩为 176×48px，生活入口使用罗盘 SVG 并移到相册左侧；浏览器测试覆盖按钮位置、尺寸及四个设置导航的稳定布局。
- 2026-10-07 改进生活页：加入按地点创建时间整理的最近地点和最多三张照片片段，使用实际照片而非装饰图片；统计卡片保持两列，移除重复间距。桌面端仅含照片 ID 的记录通过缩略图 IPC 读取，失败后尝试原图并显示明确状态；组件切换或卸载时忽略过期结果。
- 海外列表改为带地球 SVG、代码、完整名称、到访状态和实际记录数量的紧凑列表。搜索、筛选和排序直接可用，每次显示更多 20 项；窄屏使用单列。目录标为“常见目的地”，不冒充完整全球目录；有效代码的目录外到访记录会自动补入。
- 国家统计优先读取明确国家字段，再匹配中英文地点文本；支持中文连写、英文别名和 UK→GB，排除无效代码和宏观区域。国内标记单独统计，不再包含海外地点。海报以照片记录替代原先按有限目录估算的全球覆盖率；文本不足以判断的地点不会被编造为某个国家。
- 国家代码校验采用明确白名单，来源为 [Unicode CLDR 区域有效性数据](https://github.com/unicode-org/cldr/blob/main/common/validity/region.xml) 中的常规区域，排除额外特殊代码；名称使用运行环境的 `Intl.DisplayNames`。别名归一化在首次建立索引时缓存，本机 1,000 条未分类地点的识别对比由约 1,092ms 降至 126ms（单次本地测量，非性能保证）。

## 验证记录

后端 `mvn verify`
已成功，编译 16 个 Java 源文件并生成可启动 JAR；仓库目前没有 Java 测试。在临时端口 18080 启动后，`/actuator/health`
返回 HTTP 200、`{"status":"UP"}`，验证后已停止。后端现在默认使用 `dev` 配置；`prod`
配置要求外部 PostgreSQL、环境变量 JWT 密钥和明确的 CORS 来源，并关闭 H2 控制台。

2026-10-07 前端收尾验证：`npm test` 为 9 个测试文件、19 个测试通过；Edge 下 `npm run test:e2e`
为 10 个测试通过，覆盖搜索、相册、下载弹窗、主题、嵌套弹窗焦点、减少动画、SDK 加载失败、照片存储/查看/旋转/导出和 320/375/414/768/1440px 布局。E2E 隔离外部地图服务，真实底图另在本地浏览器确认；桌面、移动端与明暗主题截图位于
`.codex/ui-previews/`。 `npm run type-check`、`npm run lint`、`npm run build:all` 和
`npm run native:check` 均通过；原生检查确认 Electron
44.5.1、SQLite、sqlite-vec、Sharp、ONNX 和 Chinese CLIP 导出可加载。当前 `npm audit`
为 8 项 moderate 传递依赖问题，high 和 critical 均为 0；剩余问题来自 Electron 构建链路，强制修复可能改变构建工具版本，因此保留当前兼容版本并记录在此。

## 使用方法

2026-10-07 生活页专项收尾：全套 28 项单元测试、15 条 Playwright 浏览器测试、lint、类型检查和 Electron/Web 前端构建均通过。新增检查覆盖中英文地点、目录外有效代码、国内独立统计、空库、照片实际解码、统计卡两列排布、导航尺寸稳定和 320/768/1440px 明暗主题；截图在 `.codex/ui-previews/life-*.png`，使用隔离测试数据。

```powershell
npm run env:check
npm run web:dev
# 桌面端
npm run dev
# Windows 后端
npm run server:dev
```

构建与测试命令见 [README](../README.md)。`npm run lint`
检查错误；历史 warning 仍可通过 ESLint 直接查看。

参考：[Vite 8](https://vite.dev/blog/announcing-vite8)、[Electron 原生模块](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules/)、[Spring Boot 3.5 环境要求](https://docs.spring.io/spring-boot/3.5/system-requirements.html)。

## 2026-10-07 Codex 本地效率配置

- 全局 `C:/Users/Administrator/.codex/AGENTS.md` 和项目规则统一为 Sol high 规划、Sol low 监督与验收、Luna xhigh 执行。全局 `agents/task-{planner,supervisor,executor}.toml` 保存实际模型和档位；新会话加载角色定义。简单任务不强行开代理，已完成的规划不重复委派。
- `config.toml` 保留原主模型 Sol high，设置 `tool_output_token_limit = 2000`，限制最多同时两个子代理，未指定模型的子代理默认 Luna xhigh。按官方 [配置参考](https://learn.chatgpt.com/docs/config-file/config-reference) 和 [子代理说明](https://learn.chatgpt.com/docs/agent-configuration/subagents) 配置，不改权限、凭据、其他插件或项目。
- fresh context、限定文件职责、关键节点监督、针对性验证加一轮必要完整验证，写入全局规则；这些是协作指引，并非后台自动调度保证。工具输出预算限制进入历史的输出，不是整个任务的 token 上限；精确诊断仍需按范围读取原文。
- 安装官方 RTK 0.51.0 Windows 二进制到 `C:/Users/Administrator/.local/bin/rtk.exe`，下载文件的 SHA256 与 GitHub 发布资产 digest 一致；用户 PATH 添加此目录，注册 Codex PreToolUse hook，保留现有 SessionStart hook。hook 使用绝对路径，原始命令可用 `rtk proxy`。
- 实测 `git log -8` 输出字符数由 2,329 降到 1,253，减少 46.2%；当前大型脏工作树的 status 输出没有明显缩短。这些只是本地命令输出测量，不能当作总额度节省比例。RTK 自带 151 项过滤器校验通过；模拟 Codex hook 输入验证了命令重写。`rtk verify/gain` 的默认 hook 提示针对 Claude 安装检测，不证明已注册的 Codex hook 缺失。
- 用 skill-installer 安装已检查内容的社区 [codex-token-optimizer](https://github.com/HelloWorld668/codex-token-optimizer)，固定安装时的仓库提交，作为 RTK 与 Headroom 使用指引。官方 skills 采用按需加载，见 [说明](https://learn.chatgpt.com/docs/build-skills)。Headroom 后续配置和验证见下方记录。
- TOML/JSON 和保留其他配置的比较校验通过。应用自带 Codex CLI 0.160.1 的 `--strict-config doctor` 确认配置成功加载；整体 doctor 仍报告既有 Windows sandbox provisioning 失败、WebSocket 探测超时等健康问题，HTTP 可达，因此不能声称全部环境诊断通过，也不能仅凭探测认定它们是本次耗时原因。
- 原配置备份在 `C:/Users/Administrator/.codex/tmp/cost-config-backup-20261007/`。重启应用一次以刷新 PATH 和自动 hook；不需要改写或删除聊天历史。
- 按高 star 要求额外选装三项：Vercel 的 `vercel-react-best-practices`（React 性能）与 `web-design-guidelines`（UI/可用性审查），Anthropic 的 `webapp-testing`（Playwright 实际浏览器验证）。2026-10-07 GitHub API 实测来源仓库 star 分别为 32,008 与 179,934，数量属于整个仓库，不是单独技能。每个安装目录的 `INSTALL-SOURCE.json` 固定记录提交与路径；SKILL 文件逐字校验来自对应固定提交，Python 示例通过语法解析与 helper `--help` 检查。
- 未安装 Superpowers 整套流程（仓库 296,056 star），避免与现有规划、调试和多代理协作重复。新增技能按需加载；React 规则按当前版本选择，已有 Node Playwright 测试优先复用，不因 Python 示例另建测试体系。此次没有修改 PhotoMap 功能或增加项目依赖。

### 按输入输出与 token 优化需求调整

- 用户明确主要需要 Codex 输入输出优化。上述三个前端技能已在全局 `skills.config` 中停用，保留安装文件。全局技能目录上下文预算设置为 `skills.max_context_tokens = 3000`，保留工具输出预算 2000；这些预算不限制整个任务的总 token。
- 安装 [Caveman](https://github.com/JuliusBrussee/caveman) 的基础 `skills/caveman`，固定提交 `99aafe151a1be72be783e662858e8a0955add59f`。只安装文字输出技能，不安装代理服务或代码转图片方案。全局规则采用精简中文原则，先给结果并保留技术事实、否定词和验证信息；教学或复杂问题允许展开。
- 2026-10-07 GitHub API 核验：Caveman 110,237 star、[RTK](https://github.com/rtk-ai/rtk) 82,568 star、[Headroom](https://github.com/headroomlabs-ai/headroom) 74,529 star，均为来源仓库星数。codex-token-optimizer 为 3 star，仅作为已有辅助工作流，不列为高 star 项目。
- 显式启用 `features.hooks = true`。RTK 用专用过滤器减少命令结果噪声；精确诊断才用 `rtk proxy` 保留原文。自动 hook 的覆盖取决于实际工具事件，不能把所有命令都视为已压缩。
- 复用本机已有 headroom-ai 0.32.1，注册本地 stdio MCP：`C:/Program Files/Python312/Scripts/headroom.EXE mcp serve`，只开放 `headroom_compress`、`headroom_retrieve` 和 `headroom_stats`。未修改 API 凭据、模型服务地址或增加流量代理。
- Python MCP 客户端实际初始化成功并发现三个工具；对合成重复日志，工具估算 token 从 3,105 压到 37，按返回键取回后逐字等于原文。该测量仅代表合成日志压缩，不代表实际会话额度节省。Codex CLI 能读取新 MCP 配置；当前聊天尚未加载 MCP 工具，需重启 Codex。
- TOML 解析与配置保留比较通过。调整前备份在 `C:/Users/Administrator/.codex/tmp/token-focused-backup-20261007/`。Headroom 仅用于必要的长内容并保留取回键，短文本不额外压缩；压缩统计不作为整个会话节省比例。

## 2026-10-07 登录入口按钮调整

- 邮箱与游客入口改为紧凑双列，统一 44px 高度、14px 字号及 18px SVG；GitHub 保留“未接入”说明和原生禁用状态，缩为居中的 36px 次级项。进入地图按钮保持两步流程，统一就绪状态样式。
- 在最终样式入口 `ui-auth.css` 修正旧游客按钮的 padding/hover 层叠；减少动画时保留容器居中，取消按钮 hover/active 位移。深色背景与邮箱弹窗分别使用合适的键盘焦点轮廓，弹窗内侧轮廓避免被滚动容器裁剪。
- 地球、星空、背景动画和地图流程未修改；执行前后对 App、MinimalLoader、loader/core/extras 样式和 useMap 共 6 个文件核验 SHA256 一致。真实 Mapbox 背景截图位于 `.codex/ui-previews/login-desktop.png`、`login-mobile-375.png`、`login-mobile-320.png`、`login-email-dialog.png`；真实页面无未捕获异常，弹窗关闭恢复焦点，游客选择后地图入口可用。
- 新增 4 项登录专项浏览器测试，覆盖 320px 窄屏及矮屏、按钮与 SVG 尺寸、GitHub 禁用、焦点恢复、注册/密码显隐、游客进入相册，以及减少动画模式的实际 hover。28 项单元测试、19 项浏览器测试、lint、类型检查和双端构建通过；相关文件格式检查通过。专项测试隔离外部地图服务，真实背景另行浏览器检查。

### 登录入口反馈后的调整

- 用户认为两层居中按钮组更丑；改为右上角轻量账号入口，去掉大块白底，邮箱用细边框，游客与 GitHub 使用低强调文字样式。窄屏紧凑换行，保留触达尺寸、禁用状态和原有登录流程，背景未改。更新了桌面与 320px 真实背景截图。
- 用户要求自行衡量多代理成本。全局与项目规则改为默认主代理独立完成，只在复杂任务有独立子任务且收益超过交接成本时按需委派，不再固定凑齐所有角色。本次直接实施，复用已有验证，只运行登录专项与 Web 构建。
- 按用户要求移除生活页“生成海报”和“复制应用链接”入口，删除空的“快捷操作”区块、复制反馈及关联状态/引用；相应浏览器场景改为验证入口缺席和生活页正常导航。
- 修复搜索框内层输入焦点矩形与外层圆角边框重叠不齐：搜索输入取消自身 outline/box-shadow，由外层 focus-within 显示整体焦点。相关浏览器场景和 Web 构建通过；截图为 `.codex/ui-previews/search-focus.png`。
