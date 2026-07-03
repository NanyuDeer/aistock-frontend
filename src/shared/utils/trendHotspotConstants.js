export const CYCLE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'short', label: '短期' },
  { key: 'mid', label: '中期' },
  { key: 'long', label: '长期' },
]

export const INFO_TYPE_LABELS = {
  announcement: '公告研判',
  news: '新闻研判',
}

const INFO_TYPE_COLORS = {
  announcement: '#2563eb',
  news: '#0f766e',
}

const IMPACT_COLORS = {
  重大利好: '#dc2626',
  利好: '#ef4444',
  中性: '#64748b',
  利空: '#16a34a',
  重大利空: '#15803d',
}

/**
 * AI研判关键词体系 - 9维度（用于检测匹配）
 * 展示时只取2个决定性关键词（利好/利空相关）
 */
export const KEYWORD_DIMENSIONS = {
  supply_demand: {
    label: '供需关系',
    color: '#dc2626',
    keywords: ['缺货', '断供', '无货', '库存告急', '库存见底', '供不应求', '需求旺盛', '订单积压', '排产紧张', '产能满载', '产能利用率', '扩产', '新增产能', '产能瓶颈', '去库存', '库存下降', '低库存', '补库存'],
  },
  order_level: {
    label: '订单级别',
    color: '#ea580c',
    keywords: ['百亿订单', '十亿订单', '重大合同', '战略订单', '十年订单', '长期框架', '长单锁定', '订单爆发', '订单翻倍', '订单激增', '中标', '签约', '大客户', '头部客户', '导入客户', '验证通过'],
  },
  price_change: {
    label: '价格变动',
    color: '#ca8a04',
    keywords: ['涨价', '提价', '调价', '价格上调', '价格高位', '持续上涨', '价格创新高', '降价', '价格战', '价格下行'],
  },
  tech_breakthrough: {
    label: '技术突破',
    color: '#7c3aed',
    keywords: ['量产', '规模化', '批产', '小批量产', '独家', '独家供应', '唯一', '独家合作', '首发', '率先', '首发产品', '首发认证', '通过验证', '客户认证', '验厂通过', '导入阶段'],
  },
  policy_catalyst: {
    label: '政策催化',
    color: '#0891b2',
    keywords: ['政策利好', '补贴', '纳入目录', '国家战略', '获批'],
  },
  earnings_verify: {
    label: '业绩验证',
    color: '#059669',
    keywords: ['业绩超预期', '净利翻倍', '扭亏', '预告增长'],
  },
  industry_cycle: {
    label: '行业景气',
    color: '#4f46e5',
    keywords: ['景气度上行', '行业拐点', '周期反转'],
  },
  capital_action: {
    label: '股权/资本',
    color: '#9333ea',
    keywords: ['回购', '增持', '定增', '员工持股', '机构调研'],
  },
  risk_signal: {
    label: '风险信号',
    color: '#64748b',
    keywords: ['减持', '商誉减值', '诉讼', '被调查', '退市风险'],
  },
}

/**
 * 决定性关键词集合 - 展示时只保留这些关键词（最多2个）
 * 只包含对利好/利空有直接决定性影响的关键词
 */
export const DECISIVE_KEYWORDS = new Set([
  // 利好决定性
  '缺货', '断供', '供不应求', '百亿订单', '十亿订单', '十年订单', '重大合同', '战略订单',
  '涨价', '提价', '价格上调', '量产', '独家供应', '首发', '政策利好',
  '业绩超预期', '净利翻倍', '行业拐点', '回购', '增持',
  // 利空决定性
  '降价', '价格战', '减持', '商誉减值', '诉讼', '被调查', '退市风险', '业绩变脸',
  '产能过剩', '需求下滑',
])

/**
 * 从关键词列表中筛选决定性关键词，最多返回2个
 */
export function filterDecisiveKeywords(keywords) {
  if (!keywords || keywords.length === 0) return []
  return keywords.filter(kw => DECISIVE_KEYWORDS.has(kw)).slice(0, 2)
}

/**
 * 关键词 → 维度映射（用于快速查找关键词所属维度）
 */
const _keywordToDimension = {}
for (const [dimKey, dim] of Object.entries(KEYWORD_DIMENSIONS)) {
  for (const kw of dim.keywords) {
    _keywordToDimension[kw] = dimKey
  }
}

/**
 * 获取关键词所属维度信息
 */
export function getKeywordDimension(keyword) {
  const dimKey = _keywordToDimension[keyword]
  if (!dimKey) return null
  return { key: dimKey, ...KEYWORD_DIMENSIONS[dimKey] }
}

/**
 * 获取关键词标签颜色
 */
export function getKeywordColor(keyword) {
  const dim = getKeywordDimension(keyword)
  return dim ? dim.color : '#64748b'
}

export function filterEventsByCycle(events, cycle) {
  if (!cycle || cycle === 'all') return events
  return events.filter(e => e.cycle === cycle)
}

export function getInfoTypeColor(type) {
  return INFO_TYPE_COLORS[type] || '#64748b'
}

export function getImpactColor(impact) {
  return IMPACT_COLORS[impact] || '#64748b'
}

export function getInfoTypeLabel(type) {
  return INFO_TYPE_LABELS[type] || type || '资讯研判'
}
