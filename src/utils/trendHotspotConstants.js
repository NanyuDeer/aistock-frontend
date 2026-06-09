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
