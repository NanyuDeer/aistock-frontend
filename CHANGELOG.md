# Changelog — aistock-frontend

> 所有修改记录按时间倒序排列。每条记录标注分支、时间区间、开发者。

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
