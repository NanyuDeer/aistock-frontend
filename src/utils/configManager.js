/**
 * 配置管理器 - 从后端获取公共配置
 */

import { configApi } from '@/services/api';

let cachedConfig = null;
let fetchPromise = null;

export async function getPublicConfig() {
  // 如果已有缓存，直接返回
  if (cachedConfig) {
    return cachedConfig;
  }

  // 如果正在获取，返回同一个 Promise
  if (fetchPromise) {
    return fetchPromise;
  }

  // 发起请求
  fetchPromise = configApi.getPublicConfig()
    .then(response => {
      cachedConfig = response?.data?.data || {};
      return cachedConfig;
    })
    .catch(err => {
      console.error('[configManager] 获取公共配置失败:', err);
      return {};
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export async function getFeishuAppId() {
  const config = await getPublicConfig();
  return config.feishuAppId || process.env.VUE_APP_FEISHU_APP_ID || '';
}
