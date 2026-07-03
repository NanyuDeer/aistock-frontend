# Analytics 模块 - 分析

## 职责
提供业绩预测、长线风口龙头历史表现、更新日志等分析类功能。

## 文件结构
```
analytics/
├── views/
│   ├── PerformanceForecastView.vue        # 业绩预测页
│   ├── PotentialStockPushHistoryView.vue  # 长线风口龙头历史表现页
│   └── UpdateLogsView.vue                 # 更新日志页
├── components/                              # 模块专属组件（待抽取）
└── AGENTS.md
```

## 依赖的共享层
- `@/shared/api/api` — stockApi
- **注意**：TheNavbar 由 App.vue 全局渲染，模块视图不需要自行引入

## API 接口
- `stockApi.getProfitForecastList()` / `searchProfitForecast()` — 业绩预测
- `stockApi.getPotentialPushHistory()` / `getPotentialPushRanking()` — 长线风口龙头
- `stockApi.getUpdateLogs()` / `getUpdateTypes()` — 更新日志
- `stockApi.getGithubRepoCommits()` — GitHub 提交记录

## 开发注意事项
- PerformanceForecastView 支持排序和搜索
- PotentialStockPushHistoryView 使用图表展示历史收益
- UpdateLogsView 同时展示自有更新日志和 GitHub 提交记录
