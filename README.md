# AIStock Frontend

股票资讯AI智能分析平台 - Web 前端

## 技术栈
- Vue 3 + Vue Router 4 + Vuex 4
- Element Plus
- ECharts
- Axios
- JavaScript

## 快速开始
```bash
pnpm install
npm run serve
```

## 项目结构
```
src/
├── shared/              # 共享层（组长维护）
│   ├── api/             # API 接口（axios 实例 + 所有 API 模块）
│   ├── store/           # Vuex 全局 Store
│   ├── styles/          # 全局样式
│   ├── components/      # 共享组件（TheNavbar, TheFooter, StockCardList 等）
│   ├── utils/           # 工具函数（cacheManager, stockCycle 等）
│   └── mock/            # Mock 数据
├── modules/             # 业务模块层
│   ├── home/            # 首页 - 市场概览、新闻、风口爆发、龙头、AI图谱
│   ├── favorites/       # 自选股 - 自选股列表、个股详情
│   ├── market/          # 行情 - 板块龙头、十倍股、个股异动
│   ├── news/            # 资讯 - 微信推送、机构调研热门股
│   ├── user/            # 用户 - 登录、个人信息、搜索
│   └── analytics/       # 分析 - 业绩预测、龙头历史、更新日志
├── router/              # 路由配置
├── assets/              # 静态资源
├── App.vue              # 根组件
└── main.js              # 入口文件
```

## 模块说明
| 模块 | 路由 | 说明 |
|------|------|------|
| home | `/` | 首页，综合信息展示 |
| favorites | `/favorites`, `/stock/:code` | 自选股管理、个股详情 |
| market | `/tags/:tagCode`, `/tenx`, `/stock-monitor` | 行情分析 |
| news | `/wechat/:msgid`, `/hot-burst` | 资讯查看 |
| user | `/login`, `/profile`, `/search` | 用户认证与搜索 |
| analytics | `/forecast`, `/potential-push-history`, `/update-logs` | 数据分析 |
