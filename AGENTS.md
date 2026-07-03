# AIStock Frontend - 项目指南

## 技术栈
- Vue 2 (Composition API via `@vue/composition-api` 兼容模式) + Vue Router 4 + Vuex 4
- Element Plus UI 库
- ECharts 图表库
- Axios HTTP 客户端
- JavaScript（非 TypeScript）

## 目录架构
```
src/
├── shared/              # 共享层（组长维护）
│   ├── api/             # API 接口层
│   ├── store/           # 全局 Vuex Store
│   ├── styles/          # 全局样式
│   ├── components/      # 全局共享组件
│   ├── utils/           # 工具函数
│   └── mock/            # Mock 数据
├── modules/             # 业务模块层（每人负责一个）
│   ├── home/            # 首页模块
│   ├── favorites/       # 自选股模块
│   ├── market/          # 行情模块
│   ├── news/            # 资讯模块
│   ├── user/            # 用户模块
│   └── analytics/       # 分析模块
├── router/              # 路由配置
├── assets/              # 静态资源（图片、SVG）
├── App.vue              # 根组件
└── main.js              # 入口文件
```

## 开发规范
1. **共享层修改需审慎**：`shared/` 下的代码被多个模块依赖，修改前需评估影响范围
2. **模块间禁止直接引用**：模块之间不得直接 import，公共逻辑必须抽到 shared 层
3. **import 路径规范**：
   - 共享层：`@/shared/api/api`, `@/shared/components/XXX`, `@/shared/utils/XXX`
   - 模块内：相对路径引用模块内组件
   - 跨模块共享组件：放到 `@/shared/components/`
4. **路由配置**：所有路由定义在 `src/router/index.js`，懒加载使用 `@/modules/xxx/views/` 路径

## 构建与运行
```bash
npm run serve     # 开发服务器
npm run build     # 生产构建
```

## 模块负责人
| 模块 | 目录 | 说明 |
|------|------|------|
| 首页 | modules/home/ | 市场概览、新闻、风口爆发、龙头、AI图谱 |
| 自选股 | modules/favorites/ | 自选股列表、个股详情（K线、AI评估、资金流向） |
| 行情 | modules/market/ | 板块龙头、十倍股评分、个股异动 |
| 资讯 | modules/news/ | 微信推送详情、机构调研热门股 |
| 用户 | modules/user/ | 登录、个人信息、搜索 |
| 分析 | modules/analytics/ | 业绩预测、龙头历史、更新日志 |
