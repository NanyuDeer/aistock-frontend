# AIStock Frontend

> 股票资讯AI智能分析平台 - Web 前端（Vue 2）

## 快速开始

```bash
pnpm install
npm run serve     # 开发服务器
npm run build     # 生产构建
```

## 技术栈

- Vue 2 (Composition API via `@vue/composition-api` 兼容模式) + Vue Router 4 + Vuex 4
- Element Plus UI 库
- ECharts 图表库
- Axios HTTP 客户端
- JavaScript（非 TypeScript）

## 项目架构

```
src/
├── shared/              # 共享层（组长维护）
│   ├── api/             # API 接口（axios 实例 + 所有 API 模块）
│   ├── store/           # Vuex 全局 Store
│   ├── styles/          # 全局样式
│   ├── components/      # 共享组件（TheNavbar, TheFooter, StockCardList 等）
│   ├── utils/           # 工具函数（cacheManager, stockCycle 等）
│   └── mock/            # Mock 数据
├── modules/             # 业务模块层（每人负责一个模块）
│   ├── home/            # 首页 - 市场概览、新闻、风口爆发、龙头、AI图谱
│   ├── favorites/       # 自选股 - 自选股列表、个股详情
│   ├── market/          # 行情 - 板块龙头、十倍股、个股异动
│   ├── news/            # 资讯 - 微信推送、机构调研热门股
│   ├── user/            # 用户 - 登录、个人信息、搜索
│   └── analytics/       # 分析 - 业绩预测、龙头历史、更新日志
├── router/              # 路由配置
├── assets/              # 静态资源（图片、SVG）
├── App.vue              # 根组件
└── main.js              # 入口文件
```

### 模块负责人

| 模块 | 目录 | 说明 |
|------|------|------|
| 首页 | modules/home/ | 市场概览、新闻、风口爆发、龙头、AI图谱 |
| 自选股 | modules/favorites/ | 自选股列表、个股详情（K线、AI评估、资金流向） |
| 行情 | modules/market/ | 板块龙头、十倍股评分、个股异动 |
| 资讯 | modules/news/ | 微信推送详情、机构调研热门股 |
| 用户 | modules/user/ | 登录、个人信息、搜索 |
| 分析 | modules/analytics/ | 业绩预测、龙头历史、更新日志 |

### 模块路由

| 模块 | 路由 | 说明 |
|------|------|------|
| home | `/` | 首页，综合信息展示 |
| favorites | `/favorites`, `/stock/:code` | 自选股管理、个股详情 |
| market | `/tags/:tagCode`, `/tenx`, `/stock-monitor` | 行情分析 |
| news | `/wechat/:msgid`, `/hot-burst` | 资讯查看 |
| user | `/login`, `/profile`, `/search` | 用户认证与搜索 |
| analytics | `/forecast`, `/potential-push-history`, `/update-logs` | 数据分析 |

## 开发规范

### 模块依赖规则
- ✅ modules/* → shared/（允许）
- ❌ modules/A → modules/B（禁止）
- 共享层修改需审慎：`shared/` 下的代码被多个模块依赖，修改前需评估影响范围

### import 路径规范
- 共享层：`@/shared/api/api`, `@/shared/components/XXX`, `@/shared/utils/XXX`
- 模块内：相对路径引用模块内组件
- 跨模块共享组件：放到 `@/shared/components/`

### 路由配置
- 所有路由定义在 `src/router/index.js`
- 懒加载使用 `@/modules/xxx/views/` 路径

## Vibecoding 工作流

本项目使用 aistock-workflow rules 规范 AI 辅助开发流程。在 Trae IDE 中开发时，AI 自动执行 9 步流程：上下文加载→需求确认→编码→跨端同步检查→验证→文档维护→用户验收→技能缺口记录→修改记录。

详见：[Vibecoding 工作流文档](../docs/vibecoding-workflow.md)

## 相关项目

- [aistock-api](../aistock-api) — PC Web 后端
- [aistock-app-frontend](../aistock-app-frontend) — App 前端
- [aistock-app-api](../aistock-app-api) — App 后端