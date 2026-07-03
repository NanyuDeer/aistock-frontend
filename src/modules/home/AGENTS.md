# Home 模块 - 首页

## 职责
首页是用户进入应用后的第一个页面，展示市场概览、新闻资讯、自选股卡片、个股异动、风口爆发、风口龙头、AI产业链图谱等综合信息。

## 文件结构
```
home/
├── views/
│   └── HomeView.vue        # 首页主视图
├── components/
│   ├── MarketOverview.vue   # 市场概览组件（国内+全球指数）
│   ├── NewsSlider.vue       # 新闻轮播组件
│   ├── HotBurstPanel.vue    # 机构调研热门股面板
│   ├── WindLeaderPanel.vue  # 风口龙头面板
│   └── AiGraph.vue          # AI产业链知识图谱
└── AGENTS.md
```

## 依赖的共享层
- `@/shared/api/api` — stockApi, trendHotspotApi, windLeaderApi, industryKGApi
- `@/shared/components/` — StockCardList, StockMonitorList
- **注意**：TheNavbar 由 App.vue 全局渲染，模块视图不需要自行引入

## API 接口
- `stockApi.getHeadlineNews()` / `getCnNews()` / `getHkNews()` / `getGbNews()` — 新闻
- `stockApi.getCnIndexQuotes()` / `getGbIndexQuotes()` — 指数行情
- `trendHotspotApi.getStats()` / `getEvents()` — 风口爆发
- `windLeaderApi.getWindLeaders()` — 风口龙头
- `industryKGApi.getConcepts()` / `getGraphByConcept()` — AI产业链图谱

## 开发注意事项
- HomeView 是信息密度最高的页面，组件均通过组合 API 加载数据
- 组件 MarketOverview、NewsSlider、HotBurstPanel、WindLeaderPanel、AiGraph 仅在首页使用，属于模块专属组件
