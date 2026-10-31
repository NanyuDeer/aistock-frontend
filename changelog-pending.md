## 2026-10-31 删除体积过大的 favicon.svg 并清理引用

背景：`public/favicon.svg` 为 1.66 MB（内部以 base64 内嵌 PNG，含亮/暗两套），是浏览器标签页图标；业务代码零引用，`site.webmanifest` 只用 PNG 图标（192/512）。

改动：
- 删除 `public/favicon.svg`。
- `index.html`：移除第 13 行 `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`，避免请求 404；标签页图标保留 `favicon.ico` 与 16×16 / 32×32 PNG 三项兜底。

影响面：仅浏览器标签页图标与静态资源体积（-1.66 MB 部署产物），路由与业务逻辑零改动。

## 2026-10-14 Web 个股详情页接入后端（对齐 App）

需求：Web 个股详情页很多区块数据由前端本地拼装，需像 App 一样接入后端。

改动：
- `src/shared/api/api.js`：新增 `stockApi.getMidLongAnalysis(symbol, timeframe)`（GET `/api/cn/stocks/:symbol/mid-long/{mid|long}`，读缓存）与 `createMidLongAnalysis`（POST，触发后端 LLM 生成，需登录）。
- `src/modules/favorites/views/StockDetailView.vue`：
  - 中/长线 AI 洞见 `midAiAnalysis`/`longAiAnalysis` 改为「后端优先（`convertMidLongApiToAiAnalysis` 映射后端的 结论/核心逻辑/风险提示/投资建议）+ 本地兜底」。原本地逻辑抽为 `buildMidAiAnalysisLocal`/`buildLongAiAnalysisLocal`。
  - 新增 `midAnalysisData`/`longAnalysisData`、`midAnalysisLoading`/`longAnalysisLoading`、`midAnalysisDate`/`longAnalysisDate`、`loadMidLongAnalysis`/`refreshMidAnalysis`/`refreshLongAnalysis`。
  - 在 `onMounted` 与 `watch(route.params.code)` 中按 symbol 加载中/长线洞见；切换股票时重置。
  - 中/长线 AI 洞见卡片头部新增「分析时间 + 刷新按钮」（登录用户可触发刷新）。
  - `longMockData.policies` 改为优先取后端趋势评分 `dimensions[].detail.policyItems`（`buildPoliciesFromTrend`），为空时回退原本地政策文案。
- 文档：更新 `AGENTS.md`（§6.2 后端接口对应）、`src/modules/favorites/AGENTS.md`（API 接口列表）。

范围外（App 端同为本地计算，无接口可接）：综合决策卡 `overallDecision`、中/长线行动项、护城河 `moats`。
