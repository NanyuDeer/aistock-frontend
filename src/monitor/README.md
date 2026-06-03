# 个股异动监测系统

## 概述

个股异动监测系统用于实时追踪全市场个股的异常波动，包括涨停/跌停、火箭发射/加速下跌、快速反弹/高台跳水等 20+ 种异动类型，并通过微信模板消息推送给关注相关股票的用户。

## 当前状态

**前端先行，使用模拟数据**。后端 API 接口已预留，当前从数据库 `stock_monitor_events` 表查询，但主动监测引擎尚未实现，数据依赖外部爬虫通过 `POST /api/internal/monitor-events` 推送。

## 文件清单

### 前端（aistock-frontend）

| 文件 | 说明 | 替换数据源后操作 |
|------|------|-----------------|
| `src/mock/monitorEvents.js` | 模拟数据 + 异动类型定义 + 工具函数 | **替换为 API 调用后删除此文件** |
| `src/components/StockMonitorCard.vue` | 首页异动表格组件（含周期筛选） | 将 `import from '@/mock/monitorEvents'` 改为 `import from '@/services/api'` |
| `src/components/StockMonitorList.vue` | 异动列表组件（详情页/独立页使用） | 同上 |
| `src/views/MonitorView.vue` | 个股异动独立页面 | 将 `import from '@/mock/monitorEvents'` 改为 API 调用 |
| `src/views/HomeView.vue` | 首页（已集成异动模块） | 将 `mockHomeEvents` 替换为 API 返回数据 |
| `src/views/StockDetailView.vue` | 股票详情页（已集成异动模块） | 将 `getMockEventsByCode` 替换为 API 调用 |
| `src/services/api.js` | 已添加 `monitorApi` 对象 | 无需修改，直接使用 |

### 后端（aistock-api）

| 文件 | 说明 | 替换数据源后操作 |
|------|------|-----------------|
| `src/controllers/StockMonitorController.ts` | 前端查询 API 控制器 | **保留**，这是正式接口 |
| `src/services/StockMonitorService.ts` | 异动监测服务（当前从 DB 查询） | **保留并扩展**，实现 `scanAndDispatch()` |
| `src/controllers/MonitorEventController.ts` | 内部推送接口（接收外部爬虫数据） | **保留**，与主动监测引擎互补 |
| `src/services/WechatPushService.ts` | 微信推送服务 | **保留** |
| `crawlers/schemas/stock_monitor_events.sql` | 数据库建表 SQL | **保留** |

## API 接口

### 前端查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cn/monitor/events` | 查询异动事件列表 |
| GET | `/api/cn/monitor/events/:stockCode` | 查询指定股票的异动事件 |
| GET | `/api/cn/monitor/stats` | 获取异动统计概览 |

#### GET /api/cn/monitor/events

Query 参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| cycle | string | all | 周期筛选：all / short / mid / long |
| change_type | string | - | 异动类型代码，如 4=涨停 |
| stock_code | string | - | 指定股票代码 |
| limit | number | 20 | 每页条数（最大 100） |
| offset | number | 0 | 偏移量 |

响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 15,
    "events": [
      {
        "event_id": "evt_20260603_300308_abcd1234",
        "symbol": "SZ300308",
        "stock_code": "300308",
        "stock_name": "中际旭创",
        "change_type": "8193",
        "change_type_name": "火箭发射",
        "level": "L3",
        "cycle": "short",
        "price": 184.62,
        "change_pct": 3.18,
        "volume_ratio": 5.2,
        "turnover_rate": 8.3,
        "event_time": "2026-06-03T10:30:00+08:00"
      }
    ]
  }
}
```

### 内部推送接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/internal/monitor-events` | 接收外部爬虫推送的异动事件 |

需要 `x-internal-token` 鉴权。

## 异动类型定义

| 代码 | 名称 | 级别 | 周期 |
|------|------|------|------|
| 4 | 封涨停板 | L4 | 短线 |
| 8 | 封跌停板 | L4 | 短线 |
| 16 | 打开涨停板 | L4 | 短线 |
| 32 | 打开跌停板 | L4 | 短线 |
| 64 | 快速反弹 | L3 | 短线 |
| 128 | 高台跳水 | L3 | 短线 |
| 8193 | 火箭发射 | L3 | 短线 |
| 8194 | 加速下跌 | L3 | 短线 |
| 8201 | 大笔买入 | L2 | 短线 |
| 8202 | 大笔卖出 | L2 | 短线 |
| 8203 | 有大买盘 | L2 | 短线 |
| 8204 | 有大卖盘 | L2 | 短线 |
| 8207 | 高开5日线 | L1 | 中线 |
| 8208 | 低开5日线 | L1 | 中线 |
| 8209 | 向上缺口 | L1 | 中线 |
| 8210 | 向下缺口 | L1 | 中线 |
| 8211 | 60日新高 | L1 | 中线 |
| 8212 | 60日新低 | L1 | 中线 |
| 8213 | 60日大幅上涨 | L3 | 长线 |
| 8214 | 60日大幅下跌 | L3 | 长线 |
| 8215 | 竞价上涨 | L2 | 短线 |
| 8216 | 竞价下跌 | L2 | 短线 |

## 升级指南：替换模拟数据为 API 数据

### 步骤 1：确认后端 API 可用

```bash
curl http://localhost:3000/api/cn/monitor/events?limit=5
curl http://localhost:3000/api/cn/monitor/stats
```

### 步骤 2：修改前端组件

将以下文件中的 `import from '@/mock/monitorEvents'` 替换为 `import { monitorApi } from '@/services/api'`：

1. **`src/components/StockMonitorCard.vue`**
   - 删除 `import { CYCLE_OPTIONS, getChangeTypeColor, getLevelColor, filterEventsByCycle } from '@/mock/monitorEvents'`
   - 保留 `CYCLE_OPTIONS`、`getChangeTypeColor`、`getLevelColor`、`filterEventsByCycle` 的定义在组件内部或移到独立 utils 文件
   - 将 `props.events` 改为组件内部通过 `monitorApi.getEvents()` 获取

2. **`src/components/StockMonitorList.vue`**
   - 同上处理

3. **`src/views/MonitorView.vue`**
   - 删除 `import { mockAllEvents, CHANGE_TYPES, CHANGE_LEVELS } from '@/mock/monitorEvents'`
   - 改为调用 `monitorApi.getEvents()` 和 `monitorApi.getStats()`

4. **`src/views/HomeView.vue`**
   - 删除 `import { mockHomeEvents } from '@/mock/monitorEvents'`
   - 删除 `const monitorEvents = ref(mockHomeEvents)`
   - 改为在 `onMounted` 中调用 `monitorApi.getEvents({ limit: 8 })`

5. **`src/views/StockDetailView.vue`**
   - 删除 `import { getMockEventsByCode } from '@/mock/monitorEvents'`
   - 删除 `const stockMonitorEvents = ref(getMockEventsByCode(...))`
   - 改为调用 `monitorApi.getEventsByStock(code)`

### 步骤 3：删除模拟数据文件

```bash
rm src/mock/monitorEvents.js
```

### 步骤 4：将异动类型定义移到独立文件

`monitorEvents.js` 中的 `CHANGE_TYPES`、`CHANGE_LEVELS`、`CHANGE_TYPE_CYCLES`、`CHANGE_TYPE_COLORS`、`LEVEL_COLORS`、`CYCLE_OPTIONS` 等常量定义是前后端共用的，建议移到 `src/utils/monitorConstants.js` 中保留。

## 后续升级计划

### P0：主动监测引擎

在 `StockMonitorService.scanAndDispatch()` 中实现：

1. 调用东方财富全市场行情批量接口（`push2.eastmoney.com/api/qt/clist/get`）
2. 逐股计算异动指标
3. 命中规则生成 MonitorEvent
4. 存库 + 推送微信

在 `src/index.ts` 中添加定时任务：

```typescript
cron.schedule('*/30 * 9-14 * * 1-5', async () => {
    const isTrading = await isAShareTradingTime();
    if (!isTrading) return;
    await StockMonitorService.scanAndDispatch();
});
```

### P1：Redis 缓存层

- 异动事件写入时同步写入 Redis（key: `monitor:events:today`，TTL: 当日收盘后过期）
- 查询接口优先从 Redis 读取，减少数据库压力

### P2：去重与防骚扰

- 同股同类型冷却期：Redis key `monitor_cooldown:{symbol}:{type}`，TTL 300s
- 异动升级合并：先触发"快速反弹"后触发"涨停"，合并为一条升级消息

### P3：数据库扩展

```sql
ALTER TABLE stock_monitor_events ADD COLUMN IF NOT EXISTS
    price NUMERIC,
    change_pct NUMERIC,
    volume_ratio NUMERIC,
    turnover_rate NUMERIC,
    prev_close NUMERIC;
```
