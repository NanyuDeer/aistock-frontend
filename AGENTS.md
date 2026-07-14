# AGENTS.md - aistock-frontend

> 本文档是 **AI 开发助手的入口地图**，开发时 AI 必读。
>
> **与 README.md 的分工**：
> - `README.md` 面向人类开发者，介绍项目全貌、快速开始、技术栈（"是什么、怎么跑起来"）
> - `AGENTS.md`（本文件）面向 AI 开发助手，聚焦模块架构地图、开发规范、硬约束、扩展流程和 API 契约（"怎么开发、开发时必须遵守什么"）
>
> **新增模块 / 页面 / API 时必读**：本文件第 4 节（开发规范）和第 5 节（关键约束）。
> 各子模块有独立的 `AGENTS.md`（`src/modules/<模块>/AGENTS.md`、`src/shared/AGENTS.md`），说明该模块的功能、组件和依赖。

## 1. 项目概述

AiStock PC Web 前端，基于 Vue 2（Composition API 兼容模式）+ JavaScript，提供股票资讯 AI 智能分析平台的 Web 界面。后端为 aistock-api（原 PC Web 后端），正向 aistock-app-api 迁移。

## 2. 模块架构地图

### 三层结构

| 层 | 目录 | 职责 | 维护规则 |
|----|------|------|---------|
| 共享层 | `src/shared/` | API 接口、Vuex Store、全局组件、工具函数、全局样式、Mock 数据 | 组长维护，模块只读引用 |
| 业务模块层 | `src/modules/` | 各业务功能模块，每人负责一个 | 模块间解耦，禁止互相引用 |
| 路由层 | `src/router/` | 路由配置（懒加载） | 组长维护 |

### 业务模块

| 模块 | 目录 | 功能范围 | 路由 | 子模块 AGENTS.md |
|------|------|---------|------|-----------------|
| 首页 | `modules/home` | 市场概览、新闻轮播、风口爆发、龙头、AI 图谱 | `/` | [home/AGENTS.md](./src/modules/home/AGENTS.md) |
| 自选股 | `modules/favorites` | 自选股列表、个股详情（K 线、AI 评估、资金流向） | `/favorites`, `/stock/:code` | [favorites/AGENTS.md](./src/modules/favorites/AGENTS.md) |
| 行情 | `modules/market` | 板块龙头、十倍股评分、趋势股评分、个股异动 | `/tags/:tagCode`, `/tenx`, `/trend`, `/stock-monitor` | [market/AGENTS.md](./src/modules/market/AGENTS.md) |
| 资讯 | `modules/news` | 微信推送详情、机构调研热门股 | `/wechat/:msgid`, `/hot-burst` | [news/AGENTS.md](./src/modules/news/AGENTS.md) |
| 用户 | `modules/user` | 登录、个人信息、搜索 | `/login`, `/profile`, `/search` | [user/AGENTS.md](./src/modules/user/AGENTS.md) |
| 分析 | `modules/analytics` | 业绩预测、龙头历史、更新日志 | `/forecast`, `/potential-push-history`, `/update-logs` | [analytics/AGENTS.md](./src/modules/analytics/AGENTS.md) |

> 共享层文档见 [shared/AGENTS.md](./src/shared/AGENTS.md)。
> 新增模块时，必须创建对应的 `src/modules/<模块名>/AGENTS.md`。

## 3. 目录结构速览

```
src/
├── main.js              # 入口文件
├── App.vue              # 根组件
├── router/
│   └── index.js         # 路由配置（懒加载，所有路由定义在此）
├── shared/              # 共享层（组长维护）
│   ├── api/
│   │   └── api.js       # API 接口层（axios 实例 + 所有 API 模块统一导出）
│   ├── store/
│   │   └── index.js     # Vuex 全局 Store
│   ├── components/      # 全局组件（TheNavbar, TheFooter, StockCardList, StockChart 等）
│   ├── utils/           # 工具函数（cacheManager, configManager, stockCycle 等）
│   ├── styles/
│   │   └── global.scss  # 全局样式
│   ├── mock/
│   │   └── curatedStocks.js  # 精选股票 Mock 数据（未登录用户展示）
│   └── AGENTS.md
├── modules/             # 业务模块层（每人负责一个）
│   ├── home/            # 首页
│   │   ├── views/HomeView.vue
│   │   └── components/  # MarketOverview, NewsSlider, HotBurstPanel, WindLeaderPanel, AiGraph
│   ├── favorites/       # 自选股
│   │   ├── views/       # FavoritesView, StockDetailView
│   │   └── AGENTS.md
│   ├── market/          # 行情
│   │   └── views/       # StockMonitorView, TagView, TenxScoreView, TrendScoreView
│   ├── news/            # 资讯
│   │   └── views/       # HotBurstView, WechatMessageView
│   ├── user/            # 用户
│   │   └── views/       # LoginView, ProfileView, SearchView
│   └── analytics/       # 分析
│       └── views/       # PerformanceForecastView, PotentialStockPushHistoryView, UpdateLogsView
└── assets/              # 静态资源（SVG 图标、图片）
```

## 4. 开发规范

### 4.1 模块依赖规则

- ✅ `modules/*` → `shared/`（允许）
- ❌ `modules/A` → `modules/B`（禁止，模块间解耦）
- 共享层修改需审慎：`shared/` 下的代码被多个模块依赖，修改前需评估影响范围

### 4.2 import 路径规范

| 引用对象 | 路径格式 |
|---------|---------|
| 共享层 API | `@/shared/api/api` |
| 共享层组件 | `@/shared/components/XXX` |
| 共享层工具 | `@/shared/utils/XXX` |
| 模块内组件 | 相对路径引用 |
| 跨模块共享组件 | 放到 `@/shared/components/` |

### 4.3 新增模块流程

1. 在 `src/modules/` 下新建目录，包含 `views/` 和 `components/`（如需要）
2. 创建 `src/modules/<模块名>/AGENTS.md`，说明功能、页面、组件、依赖
3. 在 `src/router/index.js` 中添加路由（懒加载 `@/modules/xxx/views/`）
4. 更新本文件第 2 节的模块表

### 4.4 新增页面流程

1. 在对应模块的 `views/` 下新建 `.vue` 文件
2. 在 `src/router/index.js` 中添加路由配置
3. 更新对应模块的 `AGENTS.md`

### 4.5 新增 API 流程

1. 在 `src/shared/api/api.js` 中添加 API 函数
2. 导出对应的 API 模块
3. 更新 `src/shared/AGENTS.md` 的 API 模块导出列表
4. 组件中通过 `import { xxxApi } from '@/shared/api/api'` 引用

### 4.6 路由配置规范

- 所有路由定义在 `src/router/index.js`
- 懒加载使用 `@/modules/xxx/views/` 路径
- 路由守卫在 `router/index.js` 中配置

## 5. 关键约束（硬约束）

| 约束 | 说明 |
|------|------|
| 股票数据获取 | 必须通过后端 API，禁止前端直连第三方数据源 |
| A 股涨跌色 | 红涨绿跌（红色 `#f43f5e` / 绿色 `#22c55e`） |
| 禁用 emoji | 禁止使用 emoji 图标，统一用 SVG |
| 未登录用户 | 展示 Mock 精选股票数据（贵州茅台、宁德时代、平安银行、中国平安、五粮液） |
| 模块解耦 | 模块间禁止互相引用，组件必须解耦可插拔 |
| 共享层修改 | 修改前需评估对所有依赖模块的影响 |
| 浅色主题 | 遵循浅色主题设计（背景 `#f5f7fb`，卡片白色 `#ffffff`） |
| JavaScript | 非 TypeScript 项目，但 Composition API 通过 `@vue/composition-api` 兼容 |

## 6. API 契约（与后端）

### 6.1 API 模块导出（shared/api/api.js）

| 导出名 | 说明 |
|--------|------|
| `api` (default) | axios 实例 |
| `authApi` | 认证相关（登录、用户信息） |
| `stockApi` | 股票核心 API（行情、K 线、新闻、预测等） |
| `ttsApi` | 语音合成 |
| `configApi` | 配置 |
| `trendHotspotApi` | 风口爆发 |
| `tenxApi` | 十倍股评分 |
| `trendApi` | 趋势股评分（getTopStocks / getDetail / batchRefresh） |
| `windLeaderApi` | 风口龙头 |
| `aiGraphApi` | AI 产业链图谱 |
| `industryKGApi` | 行业知识图谱 |
| `WECHAT_OAUTH_LOGIN_URL` | 微信 OAuth 登录地址 |

### 6.2 后端接口对应

| 前端 API 模块 | 后端路径 | 后端仓库 |
|--------------|---------|---------|
| stockApi | `/api/cn/stock-quote/*` | aistock-api / aistock-app-api |
| windLeaderApi | `/api/cn/wind-leaders` | aistock-app-api |
| trendHotspotApi | `/api/cn/trend-hotspots/*` | aistock-app-api |
| tenxApi | `/api/cn/stocks/tenx-score/*` | aistock-app-api |
| trendApi | `/api/cn/stocks/trend-score/*` | aistock-app-api |
| aiGraphApi | `/api/aigraph/*` | aistock-app-api |
| industryKGApi | `/api/kg/*` | aistock-app-api |
| authApi | `/api/auth/wechat/*` | aistock-app-api |

> **注意**：后端正从 aistock-api 迁移到 aistock-app-api，aistock-app-api 保持端点完全兼容。

## 7. 共享组件速查

| 组件 | 说明 |
|------|------|
| `TheNavbar.vue` | 顶部导航栏 |
| `TheFooter.vue` | 底部栏 |
| `Analytics.vue` | 埋点分析组件 |
| `LoginQrCode.vue` | 微信扫码登录二维码 |
| `StockCardList.vue` | 股票卡片列表 |
| `StockChart.vue` | K 线图表 |
| `StockDetailTable.vue` | 股票详情表格 |
| `StockMonitorList.vue` | 个股异动列表 |
| `CycleSelect.vue` | 周期选择器 |

## 8. 常用命令

```bash
pnpm install       # 安装依赖
npm run serve      # 开发服务器
npm run build      # 生产构建
```

## 9. 相关项目

- [aistock-api](../aistock-api) — 原 PC Web 后端
- [aistock-app-api](../aistock-app-api) — App 后端（兼容替代 aistock-api）
- [aistock-app-frontend](../aistock-app-frontend) — App 前端（uni-app）
