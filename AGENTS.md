# PhotoMap 项目工作规范

## 工作方式

- 默认简体中文，简洁说明结果、涉及文件、验证情况和遗留问题。
- 默认单 Agent，自主完成已授权的普通开发、修复和验证。
- 只有用户明确同意后才使用子 Agent；不自动执行规划、监工、验收三套流程。
- 如授权多 Agent，按需使用 Sol high 规划、Luna xhigh 执行、Sol low 审查，不固定凑齐角色。
- 常规可逆选择自行处理；关键歧义、破坏性操作或明显扩大范围时才确认。
- 精确搜索和按需读取，避免全仓扫描、重复加载规则、大型日志、依赖目录与构建产物。
- Skills 按任务需要使用；不强制启动某个插件或固定工作流。

## 修改与验证

- 遵循最小必要修改，复用现有组件、函数和依赖，保留用户已有修改。
- 不做无关重构、格式化、重命名，不擅自引入依赖或改变数据库、公共接口。
- 新增或修改的模块尽量保持约 400 行以内、嵌套不超过 4 层；不为满足行数拆分无关旧代码。
- React 使用函数组件与 Hooks；共享状态使用 Zustand，局部 UI 状态沿用现有 Hooks。
- 遵循现有 ESLint：2 空格、单引号、分号、组件 PascalCase。
- Electron 使用 `.cjs`（CommonJS），前端使用 `.js` / `.jsx` / `.ts`（ESM）。
- UI 沿用项目样式，兼顾桌面、手机、键盘操作和减少动画设置；验证实际交互。
- 验证按风险选择：相关测试 → 必要静态检查 / 构建 → 核心交互实测。
- 不机械运行全套测试或双端构建；修改共享入口、依赖或双端功能时才验证两端。
- 不通过删除测试、绕过检查或隐藏错误完成任务；无法验证时明确说明。

## 项目入口

PhotoMap 管理照片、地点、备注，支持 Electron 本地 SQLite 和 Web IndexedDB 两种模式。

- `electron/main.cjs` / `electron/preload.cjs`：主进程与 IPC 桥接。
- `electron/database.cjs` / `electron/ipc-handlers/`：桌面数据库与功能处理器。
- `electron/embeddingService.cjs`：桌面照片内容搜索模型。
- `src/App.jsx` / `src/hooks/`：页面组合、地图、登录与交互状态。
- `src/components/` / `src/styles/`：UI 组件和样式，基础样式在 `styles/base.css`。
- `src/api/index.js`：统一数据接口；`src-web/`：Web 启动与适配。
- `src/services/syncService.js`：同步；`server-java/`：Spring Boot 后端。
- `vite.config.mjs`：`BUILD_TARGET=web` 使用 `index-web.html`，否则使用 `index.html`。
- 编译常量 `__IS_WEB__` / `__IS_ELECTRON__`；路径别名 `@`、`@components`、`@utils`、`@store`、`@types`。

## 常用命令（项目根目录）

```powershell
npm.cmd run dev                  # Electron + Vite，3000
npm.cmd run web:dev              # Web，3001
npm.cmd run server:dev           # 后端，8080；自动查找 JDK / Maven
npm.cmd run server:verify        # 后端构建验证
npm.cmd test -- <测试文件>       # 相关 Vitest 测试
npm.cmd run test:e2e -- <测试文件> # 相关 Playwright 测试
npx.cmd eslint <修改文件> --quiet
npm.cmd run type-check
npm.cmd run build                # Electron 前端 → build/
npm.cmd run web:build            # Web → dist-web/
```

## 命令输出

- RTK 可用时使用实际压缩命令，例如 `rtk git status`、`rtk rg`、`rtk test npm.cmd test -- <测试文件>`、`rtk err npm.cmd run web:build`。
- PATH 未刷新时使用 `C:/Users/Administrator/.local/bin/rtk.exe`；不创建同名透传函数。
- 精确诊断、不支持的命令或需要完整原文时直接执行，或使用 `rtk proxy` / `rtk recall`。
- 压缩只影响工具输出，不承诺固定的总 Token 节省比例。
