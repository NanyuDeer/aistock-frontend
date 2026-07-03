# Market 模块 - 行情

## 职责
提供板块龙头、十倍股评分、个股异动等行情相关功能。

## 文件结构
```
market/
├── views/
│   ├── TagView.vue            # 板块龙头页
│   ├── TenxScoreView.vue      # 十倍股评分页
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
- `trendHotspotApi.getEvents()` — 个股异动事件

## 开发注意事项
- TenxScoreView 使用复杂的评分维度系统（6维度18指标）
- TagView 需要验证板块代码格式（BK+4位数字）
- StockMonitorView 复用 StockMonitorList 共享组件
