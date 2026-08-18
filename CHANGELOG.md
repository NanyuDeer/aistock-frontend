# Changelog — aistock-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

## [main] 2026-08-18 — Web 页脚 ICP 备案号更新
**开发者**: Aria

### 修复
- `src/shared/components/TheFooter.vue`：备案号由「冀ICP备2025113956号」改为「粤ICP备2026026873号-2」（链接仍指向工信部 beian.miit.gov.cn）

---

## [main] 2026-08-18 — Web 端 App 下载入口 + 安装包托管
**开发者**: Aria

### 新增
- `public/download/version.json`：App 版本信息文件（appName/versionName/versionCode/downloadUrl/features 等），供下载页与 App 内更新读取
- `public/download/.gitignore`：排除 APK 大文件不入库
- `src/modules/user/views/DownloadView.vue`：下载页，含下载按钮（指向 `/download/{apk}`）、版本元信息、二维码扫码、功能亮点、安装提示
- `src/router/index.js`：新增路由 `/download`（DownloadView）
- `src/shared/components/TheNavbar.vue`：桌面导航 + 移动菜单新增「下载 App」入口
- `src/shared/components/TheFooter.vue`：页脚新增「下载 App」链接
- `package.json` / `pnpm-lock.yaml`：新增 qrcode、@types/qrcode 依赖

### 验证
- `node scripts/build.js` 构建成功，dist/download/version.json 已复制

---

## [main] 2026-08-14 — 风口龙头面板：弹窗统计格去"领涨股" + 龙头股数据源分档（优先 long_leader）
**开发者**: Aria

### 改进
- `src/modules/home/components/WindLeaderPanel.vue`：
  - 二级弹窗统计格移除第 4 格"领涨股"（`currentSector.leading_stock`），保留今日涨幅/均涨幅/净流入 3 格
  - `extractTopStocksFromSectors` 候选数据源分档：第一候选改为长线趋势龙头 `sector.long_leader`（trend_scores 评分最高），第二候选 `leading_stock_info`（去重），再补充 `main_stocks`

---

## [main] 2026-07-25 — PR #38 review 修复 + StockMonitor→stockIntel 改名
**开发者**: Aria

### 修复
- PR #38 review：StockDetailView tenx→trend 命名统一（20个标识符重命名）、dimScores 硬编码修复
- StockMonitor → stockIntel（自选股情报，原个股情报）全面改名，与 App 端对齐
- 后端 API 路径 /api/cn/stock-monitors/* 与路由路径 /stock-monitor 保留不变

---

## [main] 2026-07-17 — 跨仓库一致性修复（排序优化/emoji清理/主题变量/端口冲突/环境变量模板）
**开发者**: Aria

### 修复
- `vue.config.js`：`devServer` 新增 `port: 8081`（原未配置端口，webpack-dev-server 默认 8080 与 aistock-agent-py 端口冲突）

### 改进
- `PerformanceForecastView.vue`：默认排序从 `forecast_netprofit_yoy` 改为 `update_time` 降序；排序下拉新增"更新时间"选项；更新时间列新增 `sortable="custom"`
- `HomeView.vue`：首页盈利预测更新榜默认排序改为 `update_time` 降序
- emoji/字符图标清理：`AiGraph.vue`（✓→el-icon Check）、`ProfileView.vue`（✓→el-icon Check）、`SearchView.vue`（移除🎉emoji）
- CSS 主题变量统一：`HotBurstPanel.vue`、`WindLeaderPanel.vue`、`HotBurstView.vue` 移除 CSS fallback 颜色（`#4f7cff`/`#1a56db`），统一引用 `var(--primary-color)`
- `.env.example`：新建环境变量模板

---

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
