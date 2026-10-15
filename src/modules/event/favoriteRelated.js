/**
 * 事件传导 - 自选股相关事件筛选
 *
 * 数据源：
 * - GET /api/cn/favorites/industry-aliases → { [symbol]: { name, industry, aliases: string[] } }
 * - getEventList({ page, pageSize }) → 事件列表（事件项含 chain_summary）
 *
 * 逻辑：把每只自选股的 aliases（去罗马数字后缀）建成反向索引，
 * 遍历事件 chain_summary[].industry 命中索引即收集被影响的自选股。
 * 未登录 / 无自选股 / 接口失败 → 返回 []（卡片静默不渲染）。
 */
import { stockApi } from '@/shared/api/api'
import { getEventList } from '@/modules/event/api/eventApi'

const CACHE_KEY = 'fav_industry_aliases'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24h
const EVENT_PAGE_SIZE = 100
const MAX_ROWS = 20

/**
 * 去「Ⅰ/Ⅱ/Ⅲ/Ⅳ/Ⅴ…」罗马数字分级后缀（事件侧与索引侧比较时两侧都调用）
 * @param {string} name
 * @returns {string}
 */
export function stripRoman(name) {
  return String(name ?? '').trim().replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/, '')
}

/** 登录态判断：localStorage 中是否存在 user（与 Vuex state 初始化口径一致，本项目为 Cookie 鉴权） */
function isLoggedIn() {
  try {
    return !!JSON.parse(localStorage.getItem('user'))
  } catch (_) {
    return false
  }
}

/** 读取 24h 内有效的行业别名缓存；miss/过期/损坏返回 null */
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (Date.now() - Number(parsed.timestamp) > CACHE_TTL) return null
    return parsed.data ?? null
  } catch (_) {
    return null
  }
}

/** 写入行业别名缓存（localStorage 不可用时静默跳过，不影响业务） */
function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }))
  } catch (_) {
    // 隐私模式/配额超限等场景，忽略
  }
}

/** 拉取自选股行业别名；命中缓存直接返回，失败/空对象 → null */
async function fetchAliases() {
  const cached = readCache()
  if (cached) return cached
  try {
    const res = await stockApi.getFavoriteIndustryAliases()
    // shared/api 响应拦截器返回完整响应体 { code, data, message }，需取 data
    const data = res && res.code === 200 ? res.data : null
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return null
    writeCache(data)
    return data
  } catch (_) {
    return null
  }
}

/**
 * 行业名（去罗马数字后缀）→ MatchedStock[] 反向索引
 * @param {Record<string, {name?: string, industry?: string, aliases?: string[]}>} aliases
 * @returns {Map<string, Array<{symbol: string, name: string, industry: string}>>}
 */
function buildIndustryIndex(aliases) {
  const index = new Map()
  Object.entries(aliases).forEach(([symbol, info]) => {
    const name = String(info?.name || '').trim()
    const industry = String(info?.industry || '').trim()
    const list = Array.isArray(info?.aliases) ? info.aliases : []
    list.forEach((alias) => {
      const key = stripRoman(alias)
      if (!key) return
      if (!index.has(key)) index.set(key, [])
      const matched = index.get(key)
      if (!matched.some((s) => s.symbol === symbol)) {
        matched.push({ symbol, name, industry })
      }
    })
  })
  return index
}

/**
 * 加载与自选股相关的事件
 * @returns {Promise<Array<{ event: Object, matchedStocks: Array<{symbol: string, name: string, industry: string, matchedIndustry: string}> }>>}
 */
export async function loadFavoriteRelatedEvents() {
  if (!isLoggedIn()) return []

  const aliases = await fetchAliases()
  if (!aliases) return []

  let events = []
  try {
    const result = await getEventList({ page: 1, pageSize: EVENT_PAGE_SIZE })
    events = Array.isArray(result?.events) ? result.events : []
  } catch (_) {
    return []
  }

  const index = buildIndustryIndex(aliases)
  const rows = []
  for (const event of events) {
    const summary = Array.isArray(event?.chain_summary) ? event.chain_summary : []
    const matchedStocks = []
    summary.forEach((item) => {
      const key = stripRoman(item?.industry)
      if (!key) return
      const matched = index.get(key)
      if (!matched) return
      matched.forEach((stock) => {
        if (matchedStocks.some((s) => s.symbol === stock.symbol)) return
        // matchedIndustry：事件侧命中的行业名（去后缀后展示更规范），用于理由行「影响板块：X」
        matchedStocks.push({ ...stock, matchedIndustry: stripRoman(item.industry) })
      })
    })
    if (matchedStocks.length > 0) {
      rows.push({ event, matchedStocks })
      if (rows.length >= MAX_ROWS) break
    }
  }
  return rows
}
