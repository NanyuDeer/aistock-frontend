# Shared 共享层

## 职责
存放被多个业务模块共用的代码，由组长统一维护。修改此层代码需确保对所有依赖模块无破坏性影响。

## 文件结构
```
shared/
├── api/
│   └── api.js             # API 接口层（axios 实例、所有 API 模块导出）
├── store/
│   └── index.js           # Vuex 全局状态管理
├── styles/
│   └── global.scss        # 全局样式
├── components/
│   ├── TheNavbar.vue       # 顶部导航栏
│   ├── TheFooter.vue       # 底部栏
│   ├── Analytics.vue       # 埋点分析组件
│   ├── LoginQrCode.vue     # 微信扫码登录二维码
│   ├── StockCardList.vue   # 股票卡片列表
│   ├── CycleSelect.vue     # 周期选择器
│   ├── StockMonitorList.vue # 个股异动列表
│   ├── StockChart.vue      # K线图表
│   └── StockDetailTable.vue # 股票详情表格
├── utils/
│   ├── cacheManager.js     # 缓存管理器
│   ├── configManager.js    # 配置管理器
│   ├── scrollUtils.js      # 滚动工具
│   ├── stockCycle.js       # 股票周期 Hook
│   └── trendHotspotConstants.js # 风口爆发常量
├── mock/
│   └── curatedStocks.js    # 精选股票 Mock 数据
└── AGENTS.md
```

## API 模块导出
- `api` (default) — axios 实例
- `authApi` — 认证相关
- `stockApi` — 股票核心 API（行情、K线、新闻、预测等）
- `ttsApi` — 语音合成
- `configApi` — 配置
- `trendHotspotApi` — 风口爆发
- `tenxApi` — 十倍股评分
- `windLeaderApi` — 风口龙头
- `aiGraphApi` — AI产业链图谱
- `industryKGApi` — 行业知识图谱
- `WECHAT_OAUTH_LOGIN_URL` — 微信 OAuth 登录地址

## 开发注意事项
- 所有 import 路径使用 `@/shared/api/api` 而非 `@/services/api`
- Store 中使用 `@/shared/api/api` 和 `@/shared/utils/cacheManager`
- 全局组件被多个模块使用，修改时需评估影响范围
