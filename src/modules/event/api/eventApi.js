/**
 * 事件传导模块 - API 封装
 *
 * 已接入真实后端 Agent 接口。
 * 通过 eventAdapter 处理数据映射和降级逻辑。
 *
 * 复用 shared/api 实例：生产环境 baseURL 为 https://gupiao-api.yaozhineng.com，
 * 开发环境为空（经 dev server proxy 转发），并统一提供重试与响应拦截器。
 */

import api from '@/shared/api/api'
import { adaptEventList, adaptEventDetail } from './eventAdapter'

// API 基础路径：shared/api 的 baseURL 为纯域名（生产）或空（开发），故此处需带 /api/agent 前缀
const API_BASE = '/api/agent'

// 事件读接口失败收敛配置：
// shared/api 全局默认 timeout=15000 + retries=4（axios-retry，延迟 n×1000ms）。
// 冷连接偶发丢包（~20%）时，重试次数直接决定失败率：4 次→0.03%、1 次→4%。
// 这里「缩短超时到 10s（快速识别丢包、不长时间转圈）+ 保留 3 次重试（把失败率压到 ~0.16%）」，
// 在「不转圈」与「不加载失败」之间取平衡。
const READ_CONFIG = {
  timeout: 10000,
  'axios-retry': { retries: 3 },
}

/**
 * 提取后端响应中的 data 字段
 *
 * Web 端 axios 拦截器返回完整响应体 { code, data, message }，
 * 而 eventAdapter 期望接收 data 字段内容（与 APP 端 luch-request 拦截器行为一致）。
 * 此函数兼容两种情况：已提取 data 或未提取 data。
 *
 * @param {*} response - axios 响应
 * @returns {*} data 字段内容
 */
function extractData(response) {
  if (response && typeof response === 'object' && 'code' in response && 'data' in response) {
    // 失败信封：后端约定 code === 0 为成功。
    // shared/api 对「请求被取消」会 resolve 成 { code: -1, data: null, message: 'Request canceled' }
    // （见 shared/api/api.js 响应拦截器），此处必须抛错，交由调用方 catch 呈现「加载失败」错误态；
    // 否则会把 null 传给 adaptEventList 触发 TypeError 这类技术性报错。
    if (response.code !== 0) {
      throw new Error(response.message || '请求失败')
    }
    return response.data
  }
  // 非预期响应（空响应体、上游异常等导致 api.get() 解析为 undefined 等）：
  // 同样抛友好错误，避免把非对象传给 adaptEventList 再次抛 TypeError 技术性报错
  if (!response || typeof response !== 'object') {
    throw new Error('加载失败，请重试')
  }
  return response
}

/**
 * 获取事件列表（分页）
 *
 * @param {Object} params - 请求参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数，默认10
 * @returns {Promise<Object>} 事件列表响应
 */
export async function getEventList(params = {}) {
  const response = await api.get(`${API_BASE}/event/list`, {
    ...READ_CONFIG,
    params: {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      // 事件类型由服务端筛选 + 分页；"全部"不传 eventType（对齐 APP getEventList）
      ...(params.eventType ? { eventType: params.eventType } : {}),
    },
  })

  // Web 端 axios 拦截器返回完整响应体，需提取 data 字段（兼容 APP 端行为）
  return adaptEventList(extractData(response))
}

/**
 * 获取事件详情（含传导链路、图谱、AI分析）
 *
 * @param {string} eventId - 事件ID
 * @returns {Promise<Object>} 事件详情响应
 */
export async function getEventDetail(eventId) {
  const response = await api.get(`${API_BASE}/event/${eventId}`, READ_CONFIG)
  return adaptEventDetail(extractData(response))
}

/**
 * 获取事件产业链图谱
 *
 * 注意：图谱数据已包含在详情接口中，通过 eventAdapter 生成。
 * 此函数保留供后续独立调用使用。
 *
 * @param {string} eventId - 事件ID
 * @returns {Promise<Object>} 图谱数据
 */
export async function getEventGraph(eventId) {
  const response = await api.get(`${API_BASE}/event/${eventId}`, READ_CONFIG)
  const adapted = adaptEventDetail(extractData(response))
  return adapted.graph
}

/**
 * 关注事件
 *
 * 注意：功能暂未实现，后端需要新增接口。
 *
 * @param {string} eventId - 事件ID
 * @returns {Promise<void>}
 */
export async function followEvent(eventId) {
  // TODO: 需要后端新增关注接口
  console.warn('[eventApi] followEvent 功能暂未实现:', eventId)
}

/**
 * 取消关注事件
 *
 * 注意：功能暂未实现，后端需要新增接口。
 *
 * @param {string} eventId - 事件ID
 * @returns {Promise<void>}
 */
export async function unfollowEvent(eventId) {
  // TODO: 需要后端新增取消关注接口
  console.warn('[eventApi] unfollowEvent 功能暂未实现:', eventId)
}

/**
 * 设置事件盯盘
 *
 * 注意：功能暂未实现，后端需要新增接口。
 *
 * @param {string} eventId - 事件ID
 * @returns {Promise<void>}
 */
export async function watchEvent(eventId) {
  // TODO: 需要后端新增盯盘接口
  console.warn('[eventApi] watchEvent 功能暂未实现:', eventId)
}

/**
 * 获取新闻原文
 *
 * 注意：功能暂未实现，需要后端提供新闻详情接口。
 *
 * @param {string} newsId - 新闻ID
 * @returns {Promise<Object>} 新闻文章
 */
export async function getNewsArticle(newsId) {
  // TODO: 需要后端新增新闻详情接口
  throw new Error(`新闻功能暂未实现: ${newsId}`)
}