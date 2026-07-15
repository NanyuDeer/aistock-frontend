# Changelog — aistock-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

## [main] 2026-07-15 — 删除趋势评分页模拟数据
**开发者**: Aria

### 删除
- `src/modules/market/views/TrendScoreView.vue`：删除全部模拟数据（MOCK_STOCKS/MOCK_NEWS/genMockScoreData/genMockKlineData/genMockConceptKline）和 usingMock 回退逻辑，API 不可用时显示错误提示而非假数据

---

## [main] 2026-07-15 — 趋势评分页完全重写 + 自选股双向同步合并
**开发者**: Aria

### 合并
- 合并 PR #35《网页端自选股与 App 双向同步》：GET /api/users/me 完整列表覆盖、窗口聚焦/路由切换自动同步、请求复用防重复

### 重构
- `src/modules/market/views/TrendScoreView.vue`：基于设计模板完全重写（419 行 → 1633 行），左侧栏 + 评分总览 + 4 个可展开面板，ECharts 5 tree-shaking，全 scoped CSS
- `index.html`：新增 Google Fonts（Noto Sans SC / JetBrains Mono / Orbitron）
- `src/modules/market/AGENTS.md`：补充 TrendScoreView 文件结构与 trendApi 接口说明

---

## [main] 2026-07-14 — 趋势评分页 4 项 UI 修复
**开发者**: NanyuDeer

### 修复
- `TrendScoreView.vue`：因子行收起时仍泄漏一条指标 — 为 `.factor-detail-wrapper` 增加 `overflow: hidden`，确保 `grid-template-rows: 0fr` 折叠时内容完全隐藏
- `TrendScoreView.vue`：全局字体回退为衬线 — 将 15 处 `'JetBrains Mono', monospace` 替换为 `'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif`，避免 Windows 下 JetBrains Mono 未加载时回退到 Courier New（衬线）
- `TrendScoreView.vue`：趋势页背景与首页不一致 — `--bg-page` 由 `#eef3fb` 改为 `#f5f7fa`，渐变由 `#eef3fb→#e6eef9` 改为 `#f5f7fa→#f0f2f5`，与首页 `--background-color: #f5f7fa` 对齐
- `TrendScoreView.vue`：维度卡片缺少默认阴影 — 为 `.dim-card` 增加 `box-shadow: 0 2px 8px -2px rgba(0,0,0,0.06)` 默认阴影（hover 阴影保持不变）

---

## [main] 2026-07-10 — 新增 AGENTS.md + README 补充
**开发者**: Aria

### 新增
- `AGENTS.md`：面向 AI 开发助手的入口地图（模块架构地图、开发规范、硬约束、API 契约、共享组件速查）

### 文档
- `README.md`：顶部添加 AGENTS.md 引用说明；补充环境变量说明（VUE_APP_API_TARGET）；补充部署说明（deploy.sh + 域名）

---

## [main] 2026-07-02 — 项目模块化重组
**开发者**: 尹辰

### 重构
- 全项目从扁平结构重组为 shared/ + modules/ 模块化架构
- 新增 6 个业务模块目录（home/favorites/market/news/user/analytics）
- 新增 shared/ 共享层（api/store/styles/components/utils/mock）
- 更新 router/index.js 路由路径
- 新增各模块 AGENTS.md
- 新增 README.md

---
