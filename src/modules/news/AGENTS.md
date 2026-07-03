# News 模块 - 资讯

## 职责
提供微信推送消息详情和机构调研推荐热门股（爆发信号）展示。

## 文件结构
```
news/
├── views/
│   ├── WechatMessageView.vue  # 微信推送消息详情页
│   └── HotBurstView.vue       # 机构调研推荐热门股（爆发信号）页
├── components/                  # 模块专属组件（待抽取）
└── AGENTS.md
```

## 依赖的共享层
- `@/shared/api/api` — stockApi, windLeaderApi
- **注意**：TheNavbar 由 App.vue 全局渲染，模块视图不需要自行引入

## API 接口
- `stockApi.getWechatMessage()` — 微信推送消息
- `windLeaderApi.getHotBurst()` / `getHotBurstHistory()` / `getHotKeywords()` — 机构调研热门股

## 开发注意事项
- WechatMessageView 通过路由参数 msgid 获取消息
- HotBurstView 展示机构调研推荐热门股的三源共振信号
