/**
 * 个股异动模拟数据
 * 异动类型与后端 MonitorEventController.ts 中的 CHANGE_TYPES 对齐
 */

// 异动类型定义
export const CHANGE_TYPES = {
  '4': '封涨停板',
  '8': '封跌停板',
  '16': '打开涨停板',
  '32': '打开跌停板',
  '64': '快速反弹',
  '128': '高台跳水',
  '8193': '火箭发射',
  '8194': '加速下跌',
  '8201': '大笔买入',
  '8202': '大笔卖出',
  '8203': '有大买盘',
  '8204': '有大卖盘',
  '8207': '高开5日线',
  '8208': '低开5日线',
  '8209': '向上缺口',
  '8210': '向下缺口',
  '8211': '60日新高',
  '8212': '60日新低',
  '8213': '60日大幅上涨',
  '8214': '60日大幅下跌',
  '8215': '竞价上涨',
  '8216': '竞价下跌',
}

// 异动级别
export const CHANGE_LEVELS = {
  '8207': 'L1', '8208': 'L1', '8209': 'L1', '8210': 'L1',
  '8211': 'L1', '8212': 'L1',
  '8201': 'L2', '8202': 'L2', '8203': 'L2', '8204': 'L2',
  '8215': 'L2', '8216': 'L2',
  '64': 'L3', '128': 'L3', '8193': 'L3', '8194': 'L3',
  '8213': 'L3', '8214': 'L3',
  '4': 'L4', '8': 'L4', '16': 'L4', '32': 'L4',
}

// 异动类型对应的周期分类：短线/中线/长线
export const CHANGE_TYPE_CYCLES = {
  '4': 'short', '8': 'short', '16': 'short', '32': 'short',
  '64': 'short', '128': 'short', '8193': 'short', '8194': 'short',
  '8201': 'short', '8202': 'short', '8203': 'short', '8204': 'short',
  '8207': 'mid', '8208': 'mid', '8209': 'mid', '8210': 'mid',
  '8215': 'short', '8216': 'short',
  '8211': 'mid', '8212': 'mid', '8213': 'long', '8214': 'long',
}

// 异动类型对应的标签颜色
export const CHANGE_TYPE_COLORS = {
  '4': '#F56C6C', '8': '#67C23A', '16': '#E6A23C', '32': '#E6A23C',
  '64': '#F56C6C', '128': '#67C23A', '8193': '#F56C6C', '8194': '#67C23A',
  '8201': '#F56C6C', '8202': '#67C23A', '8203': '#F56C6C', '8204': '#67C23A',
  '8207': '#F56C6C', '8208': '#67C23A', '8209': '#F56C6C', '8210': '#67C23A',
  '8211': '#F56C6C', '8212': '#67C23A', '8213': '#F56C6C', '8214': '#67C23A',
  '8215': '#F56C6C', '8216': '#67C23A',
}

// 级别颜色
export const LEVEL_COLORS = {
  'L1': '#909399',
  'L2': '#E6A23C',
  'L3': '#F56C6C',
  'L4': '#F56C6C',
}

// 生成模拟异动事件
function generateMockEvents() {
  const now = new Date()
  const events = []

  const stockPool = [
    { code: '300308', name: '中际旭创', market: 'SZ', industry: '光通讯' },
    { code: '002371', name: '北方华创', market: 'SZ', industry: '半导体' },
    { code: '300058', name: '蓝色光标', market: 'SZ', industry: '营销服务' },
    { code: '600118', name: '中国卫星', market: 'SH', industry: '航天军工' },
    { code: '688017', name: '绿的谐波', market: 'SH', industry: '机器人' },
    { code: '300750', name: '宁德时代', market: 'SZ', industry: '锂电池' },
    { code: '600406', name: '国电南瑞', market: 'SH', industry: '电力设备' },
    { code: '688205', name: '德科立', market: 'SH', industry: '光通讯' },
    { code: '688008', name: '澜起科技', market: 'SH', industry: '芯片设计' },
    { code: '300136', name: '信维通讯', market: 'SZ', industry: '消费电子' },
    { code: '002050', name: '三花智控', market: 'SZ', industry: '热管理' },
    { code: '002015', name: '协鑫能科', market: 'SZ', industry: '新能源' },
    { code: '300438', name: '鹏辉能源', market: 'SZ', industry: '储能' },
    { code: '601138', name: '工业富联', market: 'SH', industry: 'AI服务器' },
    { code: '300502', name: '新易盛', market: 'SZ', industry: '光通讯' },
    { code: '603986', name: '兆易创新', market: 'SH', industry: '存储芯片' },
  ]

  const typeIds = Object.keys(CHANGE_TYPES)
  const prices = {
    '300308': 184.62, '002371': 789.30, '300058': 26.18, '600118': 111.66,
    '688017': 297.85, '300750': 453.80, '600406': 26.90, '688205': 68.45,
    '688008': 72.30, '300136': 38.56, '002050': 31.20, '002015': 12.85,
    '300438': 22.40, '601138': 28.90, '300502': 95.60, '603986': 138.50,
  }

  // 生成 20 条模拟异动
  for (let i = 0; i < 20; i++) {
    const stock = stockPool[i % stockPool.length]
    const typeId = typeIds[Math.floor(Math.random() * typeIds.length)]
    const basePrice = prices[stock.code] || 50
    const changePct = typeId === '4' ? 10 : typeId === '8' ? -10 : (Math.random() * 10 - 5)
    const price = +(basePrice * (1 + changePct / 100)).toFixed(2)
    const minutesAgo = Math.floor(Math.random() * 240)
    const eventTime = new Date(now.getTime() - minutesAgo * 60000)

    events.push({
      event_id: `evt_mock_${String(i + 1).padStart(3, '0')}`,
      symbol: `${stock.market}${stock.code}`,
      stock_code: stock.code,
      stock_name: stock.name,
      industry: stock.industry,
      change_type: typeId,
      change_type_name: CHANGE_TYPES[typeId],
      level: CHANGE_LEVELS[typeId] || 'L1',
      cycle: CHANGE_TYPE_CYCLES[typeId] || 'short',
      price,
      change_pct: +changePct.toFixed(2),
      volume_ratio: +(Math.random() * 8 + 0.5).toFixed(2),
      turnover_rate: +(Math.random() * 15 + 0.5).toFixed(2),
      event_time: eventTime.toISOString(),
      event_time_display: eventTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    })
  }

  // 按时间倒序
  events.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
  return events
}

// 首页异动模拟数据（取最近 8 条）
export const mockHomeEvents = generateMockEvents().slice(0, 8)

// 全量异动模拟数据
export const mockAllEvents = generateMockEvents()

// 根据股票代码获取该股的异动模拟数据
export function getMockEventsByCode(stockCode) {
  return generateMockEvents().filter(e => e.stock_code === stockCode)
}

// 根据周期筛选异动
export function filterEventsByCycle(events, cycle) {
  if (!cycle || cycle === 'all') return events
  return events.filter(e => e.cycle === cycle)
}

// 获取异动类型标签颜色
export function getChangeTypeColor(typeId) {
  return CHANGE_TYPE_COLORS[typeId] || '#909399'
}

// 获取级别标签颜色
export function getLevelColor(level) {
  return LEVEL_COLORS[level] || '#909399'
}

// 周期选项
export const CYCLE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'short', label: '短线' },
  { key: 'mid', label: '中线' },
  { key: 'long', label: '长线' },
]
