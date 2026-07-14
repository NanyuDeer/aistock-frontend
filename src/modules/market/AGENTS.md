# Market 模块 - 行情

## 职责
提供板块龙头、十倍股评分、个股异动等行情相关功能。

## 文件结构
```
market/
├── views/
│   ├── TagView.vue            # 板块龙头页
│   ├── TenxScoreView.vue      # 十倍股评分页
│   ├── TrendScoreView.vue     # 趋势股评分页（/trend，单文件内嵌 ECharts 图表，无子组件）
│   └── StockMonitorView.vue   # 个股异动页
├── components/                  # 模块专属组件（待抽取）
└── AGENTS.md
```

## 依赖的共享层
- `@/shared/api/api` — stockApi, tenxApi, trendHotspotApi
- `@/shared/components/` — StockCardList, CycleSelect, StockMonitorList
- `@/shared/utils/` — stockCycle
- `@/shared/mock/` — curatedStocks
- **注意**：TheNavbar 由 App.vue 全局渲染，模块视图不需要自行引入

## API 接口
- `stockApi.getTagLeaders()` — 板块龙头
- `tenxApi.getScore()` / `refreshScore()` / `batchRefresh()` / `checkVeto()` / `getTopStocks()` — 十倍股评分
- `trendApi.getTopStocks()` / `getDetail()` / `batchRefresh()` — 趋势股评分（后端 aistock-app-api）
- `trendHotspotApi.getEvents()` — 个股异动事件

## 开发注意事项
- TenxScoreView 使用复杂的评分维度系统（6维度18指标）
- TagView 需要验证板块代码格式（BK+4位数字）
- StockMonitorView 复用 StockMonitorList 共享组件
- TrendScoreView 为单文件组件，内嵌全部 ECharts 图表逻辑（K线/概念指数/赛道柱状图），
  不依赖 TrendRadarChart / TrendKlineCompare / TrendDimCard 等共享子组件；
  评级映射 S(>=85)/A(>=75)/B(>=65)/C(>=55)/D(<55)，K线日期为 YYYYMMDD 需转 M/D 展示
