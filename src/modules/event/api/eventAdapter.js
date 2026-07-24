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

/** 已知媒体域名 → 中文显示名映射 */
const MEDIA_NAME_BY_DOMAIN = {
  'theguardian.com': '英国《卫报》',
}

/**
 * 从后端 source 字段构建 sourceInfo（来源展示信息）
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
    return { name: MEDIA_NAME_BY_DOMAIN[domain] ?? domain, url: source }
  } catch {
    return { name: source }
  }
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
    publishTime: backendEvent.publishTime,

    // 来源信息：从后端 source 构建真实 sourceInfo
    sourceInfo: buildSourceInfo(backendEvent.source),

    // 字段名映射
    aiSummary: backendEvent.summary,

    // 降级字段（后端暂不返回）
    eventType: EVENT_TYPES[0], // 降级默认值
    importance: 3,
    affectedIndustries: [],
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

  return {
    // 事件ID
    eventId: content.eventId,

    // 事件基本信息
    event: {
      eventId: content.eventId,
      title: content.title,
      source: content.source,
      sourceInfo: buildSourceInfo(content.source),
      publishTime: content.publishTime,

      // 降级字段
      eventType: EVENT_TYPES[0],
      importance: 3,
      affectedIndustries: extractAffectedIndustries(analysis.event_transmission),
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