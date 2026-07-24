/**
 * 事件传导模块 - API 封装
 *
 * 已接入真实后端 Agent 接口。
 * 通过 eventAdapter 处理数据映射和降级逻辑。
 *
 * 注意：从 TypeScript 迁移，使用 axios 替代 luch-request
 */

import axios from 'axios'
import { adaptEventList, adaptEventDetail } from './eventAdapter'

// API 基础路径（包含 /api 前缀，与 webpack 代理匹配）
// 当 baseURL 为空时，需要包含完整路径 /api/agent
const API_BASE = '/api/agent'

// 自建 axios 实例，不依赖 shared/api/api.js
// 请求通过 webpack dev server proxy 转发到生产 API
const eventApi = axios.create({
  baseURL: '',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// 提取 response.data，与 shared/api 行为一致
eventApi.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error)
)

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
    return response.data
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
  const response = await eventApi.get(`${API_BASE}/event/list`, {
    params: {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
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
  const response = await eventApi.get(`${API_BASE}/event/${eventId}`)
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
  const response = await eventApi.get(`${API_BASE}/event/${eventId}`)
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