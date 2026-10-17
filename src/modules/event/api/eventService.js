/**
 * 事件传导模块 - 数据补充服务（Web 端）
 *
 * 对齐 APP 端 eventService.ts：提供真实 Global Importance 双榜单焦点事件，
 * 直接消费列表接口直出的 chain_summary（adapter 已转换为 affectedIndustries），零详情请求。
 */

import { getEventList } from './eventApi'

/**
 * 计算受影响行业主导方向（impactStrength 加权 + 1.5 倍阈值，与后端 chain_dominant_direction 一致）。
 */
function getIndustryDominantDirection(industries) {
  let bullishW = 0
  let bearishW = 0
  for (const ind of industries) {
    const strength = typeof ind.impactStrength === 'number' ? ind.impactStrength : 0
    if (ind.sentiment === 'bullish') bullishW += strength
    else if (ind.sentiment === 'bearish') bearishW += strength
  }
  if (bullishW >= bearishW * 1.5) return 'bullish'
  if (bearishW >= bullishW * 1.5) return 'bearish'
  return 'neutral'
}

/**
 * GI 方向与受影响行业主导方向是否明显冲突（前端历史数据防御，仅兜底）。
 * GI 非 bullish/bearish、行业缺失或主导为 neutral → 不判定冲突（fail-open，不误杀）。
 */
function isFocusDirectionConflict(event) {
  const giDir = event.globalImportanceDirection
  if (giDir !== 'bullish' && giDir !== 'bearish') return false
  const industries = event.affectedIndustries ?? []
  if (industries.length === 0) return false
  const dominant = getIndustryDominantDirection(industries)
  if (dominant === 'neutral') return false
  return dominant !== giDir
}

/**
 * 获取 Global Importance 双榜单焦点事件（真实数据）。
 *
 * Step 1: getEventList() 获取列表（已含 globalImportanceRank + chain_summary）
 * Step 2: 筛选 rank=1（当前焦点）/ rank=2（持续影响）并剔除方向冲突历史脏数据
 * Step 3: 直接消费 adapter 已转换的 affectedIndustries
 *
 * 异常/无数据 → 返回 []，不影响原有事件列表。
 *
 * @returns {Promise<Array<Object>>} 焦点事件视图模型数组
 */
export async function getFocusEvents() {
  try {
    const response = await getEventList({ page: 1, pageSize: 100 })
    const events = response.events ?? []

    if (events.length === 0) return []

    const focusEvents = events.filter((e) =>
      (e.globalImportanceRank === 1 || e.globalImportanceRank === 2)
      && !isFocusDirectionConflict(e)
    )

    if (focusEvents.length === 0) return []

    return focusEvents.map((event) => {
      const giDir = event.globalImportanceDirection
      const direction =
        giDir === 'bullish' ? 'positive' :
        giDir === 'bearish' ? 'negative' :
        'mixed'

      // GI 焦点事件（rank=1/2）即当日最大机会/最大风险，所在区域标题恒为「重大事件」，
      // 统一按 major 展示；不再依赖 importance_level——notable 事件同样可能当选当日焦点，
      // 否则卡片标题会丢「重大」前缀（2026-09-24 与 APP 端同步修复）。
      const importance = 'major'

      const industries = event.affectedIndustries ?? []

      return {
        type: event.globalImportanceRank === 1 ? 'current_focus' : 'ongoing_significant',
        eventId: event.eventId,
        title: event.title,
        summary: event.aiSummary || '',
        direction,
        importance,
        selectionReason: '基于 Global Importance 排序结果',
        industries: industries.map((i) => i.name),
        // 完整行业对象（含涨跌方向），供重大事件卡箭头/颜色展示
        affectedIndustries: industries,
        // 转发来源信息（含原文 URL），供重大事件卡标题跳转原文
        sourceInfo: event.sourceInfo,
      }
    })
  } catch (err) {
    console.error('[eventService] getFocusEvents 失败', err)
    return []
  }
}

// ==================== 时间线（历史段：事件传导源；未来段：实体源） ====================
// 对齐 APP eventService.ts 时间线历史段/实体段实现（buildTimelineHistoryRows/getTimelineHistoryRows/getEntityRows）。

/** 纯行情"现象/表象"词（与 APP constants.ts / 后端 is_driving_event 口径一致） */
const MARKET_PHENOMENON_PATTERN = /收评|收盘|午评|早评|复盘|盘点|盘面|涨停分析|异动|拉升|走高|走强|走弱|震荡|反弹|回调|冲高|涨停|跌停|连板|隔夜收|隔夜涨|隔夜跌|三大指数|双创指数|创业板指|沪指|深证成指|两市|成交额|净流入|净申购|飘绿|涨超|跌超|大涨|大跌|涨近|活跃/

/** 事件"驱动原因"词（命中其一即判定已讲清原因，放行不剔除） */
const DRIVING_CAUSE_PATTERN = /政策|监管|部委|公告|披露|预案|中标|订单|签约|招标|获批|并购|重组|收购|增持|回购|立案|调查|涨价|提价|降价|减产|扩产|投产|量产|关税|补贴|试点|技术突破|首发|合作|战略|投资|纳入|上调|下修|签署|成立|落地|规划|目标/

/**
 * 是否纯行情事件：仅看 title。
 * 命中现象词 且 不命中任何原因词 → true（历史段剔除）。
 * 空 title 不判为纯行情（不误杀缺失数据）。
 */
function isPureMarketEvent(title) {
  const t = String(title ?? '').trim()
  if (!t) return false
  if (!MARKET_PHENOMENON_PATTERN.test(t)) return false
  if (DRIVING_CAUSE_PATTERN.test(t)) return false
  return true
}

/** 本地 Date → YYYY-MM-DD（历史段上界"今天"用，历史段是过去事件，时区偏差可接受） */
function localTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * publishTime → 日期分组键 YYYY-MM-DD。
 * 后端可能给 ISO 带时区（"2026-09-29T15:06:07.939323+08:00"）或纯日期（"2026-09-29"），
 * 统一取字符串前 10 位即可健壮兼容两种格式；异常短串原样返回。
 */
function publishDateOf(publishTime) {
  const s = String(publishTime ?? '').trim()
  return s.length >= 10 ? s.slice(0, 10) : s
}

/** 取最核心行业（chain_summary[0].industry + direction 归一）；缺失 → null（页面不渲染胶囊） */
function sectorOf(item) {
  const first = item.chain_summary?.[0]
  if (!first || !first.industry?.trim()) return null
  const direction = first.direction === 'bullish' || first.direction === 'bearish' ? first.direction : 'neutral'
  return { name: first.industry, direction }
}

/**
 * 从事件传导列表项构建历史段时间线行（纯函数）。
 *
 * 准入：**同时满足** ① importance ≥ 4（星级 1~5，由 chain 最大 impactStrength 映射，adapter 已算好），
 *              ② 非纯行情（现象词命中且无原因词则剔除），
 *              ③ date ≤ today。
 *
 * 字段口径：
 * - date = publishTime 前 10 位（后端为带 +08:00 的上海时间字符串，前端禁止自行时区换算）
 * - eventStartTime = publishTime（页面按它做同日组内排序）
 * - summary 恒空串（历史行不渲染摘要行）
 * - sectorName/sectorDirection = chain_summary[0]（#1 核心行业）
 * - isGi = globalImportanceRank 有值
 * - isFuture = false
 *
 * @param {Array} items - 事件传导列表项（已按 eventId 去重）
 * @param {string} today - 历史段右边界 YYYY-MM-DD（date ≤ today 才收录）
 * @returns {Array} TimelineRow 数组
 */
function buildTimelineHistoryRows(items, today) {
  const rows = []
  for (const item of items) {
    if (!item || !item.eventId) continue

    // ① 重要性 ≥4（undefined / <4 剔除）
    const importance = item.importance
    if (typeof importance !== 'number' || importance < 4) continue

    // ② 非纯行情（现象词命中且无原因词 → 剔除；讲清原因必须放行）
    if (isPureMarketEvent(item.title)) continue

    const date = publishDateOf(item.publishTime)
    // publishTime 缺失/异常（长度 <10）→ 跳过，避免形成空日期分组
    if (date.length < 10) continue
    // 历史段上界：date ≤ 今天
    if (date > today) continue

    const sector = sectorOf(item)
    rows.push({
      eventId: item.eventId,
      date,
      eventStartTime: item.publishTime,
      title: item.title,
      // 历史行恒无摘要（用户明确不要"XX行业受益"这类 conclusion）
      summary: '',
      sectorName: sector?.name ?? null,
      sectorDirection: sector?.direction ?? null,
      // 进了当日 GI 双榜单（rank 非空）→ 历史行标题加粗
      isGi: item.globalImportanceRank != null,
      // 星级保留（1~5）：importance===5（最高星）→ 时间线「重大」徽标
      importance: typeof item.importance === 'number' ? item.importance : null,
      isFuture: false,
    })
  }
  return rows
}

/**
 * 翻页拉取事件传导历史源行：星级 ≥4 且非纯行情，date ∈ [earliestDate, 今天]。
 *
 * 后端 /api/agent/event/list 实为 `ORDER BY created_at DESC`，与 publishTime 只是近似，
 * 故只能用「本页最新日仍早于下界 → 整页已出窗」判停；绝不能用最旧（错序会提前 break、静默漏行）。
 *
 * 停止条件（任一满足即停止）：本页最新日 < earliestDate / hasMore===false / 达到 maxPages。
 * 异常处理：getEventList 抛错 → 返回 []（历史段失败不能让整个时间轴白屏）。
 *
 * @param {Object} opts - { earliestDate, maxPages=5, pageSize=100, today }
 * @returns {Promise<Array>} TimelineRow 数组
 */
export async function getTimelineHistoryRows(opts = {}) {
  const earliestDate = opts.earliestDate
  const maxPages = opts.maxPages ?? 5
  const pageSize = opts.pageSize ?? 100
  const todayStr = opts.today ?? localTodayStr()

  // 先按 eventId 去重收集原始事件（列表源可能跨页重复）
  const seen = new Set()
  const deduped = []

  try {
    for (let page = 1; page <= maxPages; page++) {
      const res = await getEventList({ page, pageSize })
      const events = res.events ?? []

      // 本页最新日期（判停）
      let pageNewest = null
      for (const ev of events) {
        const d = publishDateOf(ev.publishTime)
        if (pageNewest === null || d > pageNewest) pageNewest = d
        // 只收集窗口内项（星级/纯行情等准入由下方纯函数再过滤）
        if (d < earliestDate) continue
        if (d > todayStr) continue
        if (!seen.has(ev.eventId)) {
          seen.add(ev.eventId)
          deduped.push(ev)
        }
      }

      // 停判：整页已出窗（本页最新日仍早于下界）或显式 hasMore=false
      if (pageNewest === null || pageNewest < earliestDate) break
      if (res.hasMore === false) break
    }
  } catch (err) {
    console.warn('[eventService] 时间线历史段拉取失败，返回空', err)
    return []
  }

  return buildTimelineHistoryRows(deduped, todayStr)
}

/**
 * 实体源行（未来段）：GET /timeline 项 → TimelineRow（isFuture=true）。
 * 实体源无 GI 排名与行业方向信息，故 isGi=false、sectorDirection=null
 * （sectorName 仍取 impactSectors[0]）；摘要保留（未来行展示摘要）。
 *
 * @param {Array} items - GET /timeline 返回的 items
 * @returns {Array} TimelineRow 数组
 */
function getEntityRows(items) {
  return (items || []).map((it) => ({
    eventId: it.eventId,
    date: it.date,
    eventStartTime: it.eventStartTime,
    title: it.title,
    summary: it.summary || '',
    // 实体源只给板块名（KG 预计算 impact_sectors 名字列），无方向 → 恒 null（页面回退中性灰）
    sectorName: it.impactSectors?.[0] ?? null,
    sectorDirection: null,
    isGi: false,
    // 未来行无传导报告 → 无星级（恒 null，不触发「重大」徽标）
    importance: null,
    isFuture: true,
  }))
}

export { buildTimelineHistoryRows, getEntityRows }