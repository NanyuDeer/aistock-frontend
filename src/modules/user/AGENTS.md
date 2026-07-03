# User 模块 - 用户

## 职责
用户认证（微信扫码登录、OAuth）、个人信息管理、股票搜索等功能。

## 文件结构
```
user/
├── views/
│   ├── LoginView.vue      # 登录页（微信扫码 + OAuth）
│   ├── ProfileView.vue    # 个人信息页（自选股管理、推送设置）
│   └── SearchView.vue     # 股票搜索页（OCR 图片识别）
├── components/              # 模块专属组件（待抽取）
└── AGENTS.md
```

## 依赖的共享层
- `@/shared/api/api` — authApi, stockApi, WECHAT_OAUTH_LOGIN_URL
- `@/shared/components/` — LoginQrCode, CycleSelect
- `@/shared/utils/` — stockCycle, configManager

## API 接口
- `authApi.getScanLoginUrl()` / `checkScanLoginStatus()` / `logout()` — 登录认证
- `stockApi.searchStocks()` — 搜索股票
- `stockApi.ocrStocksFromImages()` — OCR 图片识别
- `stockApi.getUserPushSettings()` / `updateUserPushSettings()` — 推送设置

## 开发注意事项
- LoginView 和 ProfileView 需要与 Vuex Store 的认证状态交互
- ProfileView 需要登录才能访问（路由守卫 requiresAuth: true）
- SearchView 支持关键词搜索和 OCR 图片识别两种模式
- configManager 中包含飞书相关配置的动态获取
