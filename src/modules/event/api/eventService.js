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