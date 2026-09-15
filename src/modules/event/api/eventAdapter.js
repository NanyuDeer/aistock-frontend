/**
 * 事件传导模块 - 数据适配层
 *
 * 职责：
 * 1. 将后端 Agent 接口返回的数据结构转换为前端组件使用的类型
 * 2. 处理字段名映射（event_understanding → eventUnderstanding）
 * 3. 处理数据路径转换（content.analysis_reports.* → 顶层字段）
 * 4. 为缺失字段提供降级默认值
 *
 * 设计原则：
 * - 不修改 Agent 输出结构
 * - 不修改后端接口
 * - 不修改前端组件
 * - AI投资机会继续使用 event_investment 字段
 *
 * 注意：从 TypeScript 迁移，移除了类型定义，保留 JSDoc 注释
 */

import { EVENT_TYPES } from '../constants'

// ==================== 列表接口适配 ====================

/**
 * 列表接口适配器
 * 将后端数据转换为前端使用的格式
 *
 * @param {Object} backend - 后端返回的数据
 * @returns {Object} 前端使用的事件列表响应
 */
export function adaptEventList(backend) {
  return {
    events: backend.events.map(adaptEventItem),
    total: backend.total,
    page: backend.page,
    pageSize: backend.pageSize,
    hasMore: backend.hasMore,
  }
}

/** 事件类型白名单校验，缺失/非法值回退到默认，保证旧数据正常展示 */
function normalizeEventType(raw) {
  return EVENT_TYPES.includes(raw) ? raw : EVENT_TYPES[0]
}

/**
 * 从 impactStrength 列表计算事件重要程度星级（1~5）。
 * 取最大 impactStrength（0~1）映射 round(max×5)，clamp 到 1~5；
 * 无有效强度（空/非正数/非数值）→ undefined（前端隐藏星级，不显示假评分）。
 * 对齐 APP eventAdapter.ts 的 computeImportanceFromStrengths。
 */
function computeImportanceFromStrengths(strengths) {
  const valid = (strengths || []).filter(
    (n) => typeof n === 'number' && Number.isFinite(n) && n > 0
  )
  if (valid.length === 0) return undefined
  const max = Math.max(...valid)
  return Math.min(5, Math.max(1, Math.round(max * 5)))
}

/** 从 chain_summary 列表计算事件重要程度星级 */
function computeImportance(summary) {
  if (!Array.isArray(summary) || summary.length === 0) return undefined
  return computeImportanceFromStrengths(summary.map((s) => s?.impactStrength))
}

/**
 * 从 chain_summary 提取 affectedIndustries（列表/详情接口直出路径）。
 * chain_summary 结构：[{ industry, direction, impactStrength, reason }]（后端已降序 Top5）。
 * 对齐 APP extractAffectedIndustriesFromSummary。
 */
function extractAffectedIndustriesFromSummary(summary) {
  if (!Array.isArray(summary) || summary.length === 0) return []
  return summary
    .filter((item) => item && typeof item.industry === 'string' && item.industry.trim() !== '')
    .map((item) => ({
      name: item.industry,
      impactLevel: Math.round(item.impactStrength * 5),
      sentiment: (item.direction === 'bullish' || item.direction === 'bearish') ? item.direction : 'neutral',
      impactStrength: item.impactStrength,
      impactPercentage: item.impactStrength * 15,
      reason: item.reason || '',
    }))
    .sort((a, b) => b.impactStrength - a.impactStrength)
    .slice(0, 5)
}

/**
 * 已知媒体域名 → 中文显示名映射
 *
 * 与后端 aistock-app-api `SOURCE_NAME_BY_HOST`（internal.ts）保持一致，
 * 覆盖生产 event_conduction.source 真实出现的域名 + 常见财经媒体。
 * 仅在 source_name 缺失时作为兜底，避免前端把英文域名直接展示给用户。
 */
const MEDIA_NAME_BY_DOMAIN = {
  'cls.cn': '财联社',
  'eastmoney.com': '东方财富',
  '163.com': '网易',
  'sina.com.cn': '新浪',
  'sina.cn': '新浪',
  'stcn.com': '证券时报',
  'sfccn.com': '南方财经全媒体集团',
  '21jingji.com': '21财经',
  'dahecube.com': '大河财立方',
  'toutiao.com': '今日头条',
  'investing.com': '英为财情',
  'sohu.com': '搜狐',
  'ycnews.cn': '盐城新闻网',
  'qzwb.com': '泉州晚报',
  'theguardian.com': '英国《卫报》',
}

/**
 * 从后端 source 字段构建 sourceInfo（来源展示信息）
 *
 * source 为 URL 时解析 hostname，按域名后缀命中中文媒体名（覆盖 m. / finance. 等子域），
 * 未命中才回退规范化域名；非 URL 直接作为 name。
 *
 * @param {string} source - 后端返回的来源字段
 * @returns {Object|undefined} 来源信息对象
 */
function buildSourceInfo(source) {
  if (!source) return undefined
  if (!/^https?:\/\//i.test(source)) return { name: source }
  try {
    const url = new URL(source)
    const domain = url.hostname.toLowerCase().replace(/^www\./, '')
    return { name: resolveMediaName(domain), url: source }
  } catch {
    return { name: source }
  }
}

/** 域名 → 中文媒体名（支持子域后缀匹配，如 m.sohu.com → 搜狐） */
function resolveMediaName(domain) {
  if (MEDIA_NAME_BY_DOMAIN[domain]) return MEDIA_NAME_BY_DOMAIN[domain]
  for (const [suffix, label] of Object.entries(MEDIA_NAME_BY_DOMAIN)) {
    if (domain.endsWith('.' + suffix)) return label
  }
  return domain
}

/**
 * 构建来源展示信息（source_name 优先）
 *
 * 后端 agent_analysis_reports.content.source_name 为中文媒体名（生产已全覆盖），
 * 优先消费；缺失时回退旧的 URL/域名解析逻辑。对齐 APP buildSourceInfoWithName。
 *
 * @param {string} sourceName - 后端返回的中文来源名
 * @param {string} source - 后端返回的来源字段（URL 或文本）
 * @returns {Object|undefined} 来源信息对象
 */
function buildSourceInfoWithName(sourceName, source) {
  const name = String(sourceName ?? '').trim()
  if (name && name !== '未知来源') {
    const info = { name }
    if (/^https?:\/\//i.test(source || '')) info.url = source
    return info
  }
  return buildSourceInfo(source)
}

/**
 * 单个事件适配
 * 将后端事件字段转换为前端 EventItem
 *
 * @param {Object} backendEvent - 后端返回的事件对象
 * @returns {Object} 前端使用的事件对象
 */
function adaptEventItem(backendEvent) {
  return {
    // 直接映射字段
    eventId: backendEvent.eventId,
    title: backendEvent.title,
    source: backendEvent.source,
    sourceName: backendEvent.source_name,
    publishTime: backendEvent.publishTime,

    // 来源信息：优先后端中文 source_name，缺失时回退 URL/域名解析
    sourceInfo: buildSourceInfoWithName(backendEvent.source_name, backendEvent.source),

    // 字段名映射：AI一句话总结 = 投资判断结论（conclusion）优先，旧数据回退事件理解摘要（summary）
    aiSummary: backendEvent.conclusion || backendEvent.summary,

    // 事件类型：真实值（白名单校验），缺失/非法回退默认
    eventType: normalizeEventType(backendEvent.event_type),

    // 重要程度星级：由 chain_summary 最大 impactStrength 映射（0~1 → 1~5 星）；无 chain → undefined（前端隐藏星级）
    importance: computeImportance(backendEvent.chain_summary),

    // 受影响行业：优先消费后端直出的 chain_summary，旧数据缺失回退 []
    affectedIndustries: extractAffectedIndustriesFromSummary(backendEvent.chain_summary),

    // 透传 Global Importance 字段（供焦点事件筛选/方向一致性兜底）
    chain_summary: backendEvent.chain_summary,
    globalImportanceRank: backendEvent.globalImportanceRank,
    globalImportanceDirection: backendEvent.globalImportanceDirection,
    globalImportanceLevel: backendEvent.globalImportanceLevel,
    isFollowed: false,
  }
}

// ==================== 详情接口适配 ====================

/**
 * 详情接口适配器
 * 将后端数据转换为前端使用的详情格式
 *
 * @param {Object} backend - 后端返回的详情数据
 * @returns {Object} 前端使用的详情对象
 */
export function adaptEventDetail(backend) {
  const content = backend.content
  const analysis = content.analysis_reports

  // 优先消费顶层 chain_summary（详情接口已直出），旧数据缺失回退 chain 解析
  const chainSummary = backend.chain_summary
  const affectedIndustries = chainSummary && chainSummary.length > 0
    ? extractAffectedIndustriesFromSummary(chainSummary)
    : extractAffectedIndustries(analysis.event_transmission)

  return {
    // 事件ID
    eventId: content.eventId,

    // 事件基本信息
    event: {
      eventId: content.eventId,
      title: content.title,
      source: content.source,
      sourceName: content.source_name,
      // 来源信息：优先后端中文 source_name，缺失时回退 URL/域名解析
      sourceInfo: buildSourceInfoWithName(content.source_name, content.source),
      publishTime: content.publishTime,

      // 事件类型真实值
      eventType: normalizeEventType(content.event_type),

      // 重要程度星级：优先 chain_summary，旧数据回退 transmission.chain 计算；均无 → undefined（前端隐藏）
      importance: computeImportance(chainSummary)
        ?? computeImportanceFromStrengths((analysis.event_transmission?.chain ?? []).map((n) => n.impactStrength)),
      affectedIndustries,
      aiSummary: analysis.event_understanding?.summary || '',
      isFollowed: false,
    },

    // AI 分析模块（直接映射）
    eventUnderstanding: analysis.event_understanding,
    transmissionAnalysis: analysis.event_transmission,
    historyEvents: (analysis.event_history || []).map(h => ({
      ...h,
      eventType: h.eventType,
    })),
    investmentSummary: analysis.event_investment,

    // 生成字段
    graph: generateGraphFromChain(analysis.event_transmission?.chain || []),
  }
}

// ==================== 复杂字段生成函数 ====================

/**
 * 从 transmissionAnalysis.chain[] 提取 affectedIndustries
 *
 * @param {Object} transmission - 传导分析数据
 * @returns {Array} 受影响行业列表
 */
function extractAffectedIndustries(transmission) {
  if (!transmission?.chain) return []

  return transmission.chain
    .map(node => ({
      name: node.industry,
      impactLevel: Math.round(node.impactStrength * 5),
      sentiment: node.direction,
      impactStrength: node.impactStrength,
      impactPercentage: node.impactStrength * 15,
      reason: node.reason,
    }))
    .sort((a, b) => b.impactStrength - a.impactStrength)
    .slice(0, 5)
}

/**
 * 从 transmissionAnalysis.chain[] 生成 EventGraph
 *
 * @param {Array} chain - 传导链数组
 * @returns {Object} 图谱数据
 */
function generateGraphFromChain(chain) {
  if (!chain || chain.length === 0) {
    return { nodes: [], connections: [] }
  }

  const nodes = []
  const connections = []

  // 1. 创建事件节点
  nodes.push({
    nodeId: 'node_event',
    name: '事件',
    type: 'event',
    position: { x: 200, y: 20 },
  })

  // 2. 创建行业节点
  chain.forEach((node, index) => {
    let type = 'core'
    if (node.relation?.includes('上游')) {
      type = 'upstream'
    } else if (node.relation?.includes('下游')) {
      type = 'downstream'
    } else if (node.relation?.includes('核心')) {
      type = 'core'
    }

    nodes.push({
      nodeId: `node_${index}`,
      name: node.industry,
      type,
      position: calculateNodePosition(node.level, type, index),
    })
  })

  // 3. 创建连线
  let coreIndex = chain.findIndex(n => n.relation?.includes('核心'))
  if (coreIndex < 0 && chain.length > 0) {
    coreIndex = 0
  }

  chain.forEach((node, index) => {
    if (node.relation?.includes('核心')) {
      connections.push({
        fromNodeId: 'node_event',
        toNodeId: `node_${index}`,
        strength: node.impactStrength,
      })
    } else if (node.relation?.includes('上游')) {
      if (coreIndex >= 0) {
        connections.push({
          fromNodeId: `node_${index}`,
          toNodeId: `node_${coreIndex}`,
          strength: node.impactStrength,
        })
      }
    } else if (node.relation?.includes('下游')) {
      if (coreIndex >= 0) {
        connections.push({
          fromNodeId: `node_${coreIndex}`,
          toNodeId: `node_${index}`,
          strength: node.impactStrength,
        })
      }
    }
  })

  return { nodes, connections }
}

/**
 * 计算节点坐标（简化版布局）
 *
 * @param {number} _level - 层级（未使用）
 * @param {string} type - 节点类型
 * @param {number} index - 索引
 * @returns {Object} 坐标对象
 */
function calculateNodePosition(_level, type, index) {
  const x = type === 'upstream' ? 50 : type === 'downstream' ? 350 : 200
  const y = 100 + index * 70
  return { x, y }
}