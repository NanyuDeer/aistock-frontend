# Favorites 模块 - 自选股

## 职责
管理用户自选股列表和个股详情页，包括自选股的添加/删除、行情展示、AI评估、K线图、资讯、资金流向等。

## 文件结构
```
favorites/
├── views/
│   ├── FavoritesView.vue       # 自选股列表页（含风口爆发事件）
│   └── StockDetailView.vue     # 个股详情页（K线、AI评估、资金流向、十倍股评分）
├── components/                  # 模块专属组件（待抽取）
└── AGENTS.md
```

## 依赖的共享层
- `@/shared/api/api` — stockApi, trendHotspotApi, ttsApi, tenxApi
- `@/shared/components/` — CycleSelect, StockChart, StockMonitorList
- `@/shared/utils/` — stockCycle, scrollUtils, trendHotspotConstants
- `@/shared/mock/` — curatedStocks

## API 接口
- `trendHotspotApi.getFavoritesNews()` — 自选股风口事件
- `stockApi.getStockKline()` — K线数据
- `stockApi.getStockAnalysis()` / `createStockAnalysisStream()` — AI评估
- `ttsApi.synthesize()` — 语音播报
- `tenxApi.getScore()` / `refreshScore()` — 十倍股评分
- `stockApi.getCapitalFlow()` — 资金流向
- `stockApi.getStockNews()` — 个股新闻

## 开发注意事项
- StockDetailView 是最复杂的视图之一，涉及大量 API 调用和交互
- 需要登录才能访问（路由守卫 requiresAuth: true）
- 风口爆发事件使用 CycleSelect 组件切换周期
