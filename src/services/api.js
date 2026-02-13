import axios from 'axios';
import axiosRetry from 'axios-retry';

const RETRY_TIMES = 4;
const DEFAULT_KLINE_LIMIT = 100;
const MAX_KLINE_LIMIT = 100;
const retryConfig = {
  retries: RETRY_TIMES,
  shouldResetTimeout: true,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => {
    const status = error?.response?.status;
    // 仅在网络抖动、超时、限流或服务端错误时重试
    // 401/403/404 等客户端错误不重试，避免页面被重试阻塞
    if (error.code === 'ECONNABORTED' || axiosRetry.isNetworkError(error)) {
      return true;
    }
    if (typeof status !== 'number') {
      return !error.response;
    }
    if (status === 408 || status === 429) {
      return true;
    }
    return status >= 500;
  }
};

// 配置 axios-retry（全局 axios）
axiosRetry(axios, retryConfig);

// 开发模式下使用相对路径，生产模式下使用完整URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://extapi.aistocklink.cn' 
  : 'http://localhost:18000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 超时时间改为 15 秒，避免长时间阻塞
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // 确保跨域请求时携带 cookie
});

// 配置 axios-retry（自定义实例 api）
axiosRetry(api, retryConfig);

// 请求拦截器
api.interceptors.request.use(
  config => {
    // Cookie 会自动携带，无需手动添加 Authorization header
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response && error.response.status === 401) {
      // 未授权，清除用户信息
      localStorage.removeItem('user');
      
      // 不强制重定向，让路由守卫和组件自己处理
      // 这样可以确保未登录用户仍能访问不需要登录的页面
    }
    return Promise.reject(error);
  }
);

// 扫码登录相关API
export const authApi = {
  // 获取扫码登录二维码
  getScanLoginUrl: () => api.get('/api/auth/wechat/login/scan'),
  
  // 轮询检查扫码登录状态
  checkScanLoginStatus: (state) => api.get(`/api/auth/wechat/login/scan/poll?state=${state}`),
  
  // 获取用户信息
  getUserInfo: () => api.get('/api/user/info'),

  // 通过 Cookie 获取当前登录用户信息和自选股
  getAuthMe: () => api.get('/api/users/me'),

  // 退出登录（清除后端 HttpOnly Cookie）
  logout: () => api.post('/api/auth/logout')
};

// 微信网页授权登录地址（用于微信浏览器内跳转）
export const WECHAT_OAUTH_LOGIN_URL = 'https://extapi.aistocklink.cn/api/auth/wechat/login';

// 股票相关API
export const stockApi = {
  // 批量添加自选股票（新版 API）
  addStocks: (symbols) => api.post('/api/users/me/favorites', { symbols }),

  // 批量删除自选股票（新版 API）
  removeStocks: (symbols) => api.post('/api/users/me/favorites/delete', { symbols }),

  // 根据关键词搜索股票（新版extapi）
  searchStocks: (keyword, pageSize = 20) => {
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stocks?keyword=${encodeURIComponent(keyword)}&pageSize=${pageSize}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 获取热门股票（旧版）
  getHotStocks: (symbol) => api.get(`/api/stocks/hot?symbol=${symbol || '国内人气榜'}`),

  // --- 新版热门股票API ---
  // 获取股票人气榜
  getStockRank: () => {
    return axios.get('https://extapi.aistocklink.cn/api/cn/market/stockrank/', {
      timeout: 18000
    }).then(res => res.data);
  },

  // 批量获取股票基本信息
  getStockInfos: (symbols) => {
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stock/infos?symbols=${symbols}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 批量获取股票成交活跃行情（含价格与交易数据）
  getStockActivityQuotes: (symbols) => {
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stock/quotes/activity?symbols=${symbols}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 批量获取股票核心行情（首页榜单用）
  getStockCoreQuotes: (symbols) => {
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stock/quotes/core?symbols=${symbols}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 获取历史K线
  getStockKline: ({ symbol, klt = 101, fqt = 1, limit = DEFAULT_KLINE_LIMIT, startDate, endDate }) => {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(Math.floor(parsedLimit), 1), MAX_KLINE_LIMIT)
      : DEFAULT_KLINE_LIMIT;
    const params = new URLSearchParams({
      symbol,
      klt: String(klt),
      fqt: String(fqt),
      limit: String(safeLimit)
    });
    if (startDate) params.append('startDate', String(startDate));
    if (endDate) params.append('endDate', String(endDate));
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stock/quotes/kline?${params.toString()}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 获取单只股票业绩预测（摘要 + 详细指标）
  getForecast: (code, { forceRefresh = false } = {}) => {
    const query = forceRefresh ? '?forceRefresh=1' : '';
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stock/${code}/profit-forecast${query}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 盈利预测分页列表
  getProfitForecastList: ({
    page = 1,
    pageSize = 50,
    sortBy = 'forecast_netprofit_yoy',
    sortOrder = ''
  } = {}) => {
    const finalSortOrder = sortOrder || (sortBy === 'symbol' ? 'asc' : 'desc');
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy: String(sortBy),
      sortOrder: String(finalSortOrder)
    });
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stocks/profit-forecast?${params.toString()}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 盈利预测检索
  searchProfitForecast: ({
    keyword = '',
    q = '',
    page = 1,
    pageSize = 50,
    sortBy = 'forecast_netprofit_yoy',
    sortOrder = ''
  } = {}) => {
    const queryKeyword = (keyword || q || '').trim();
    const finalSortOrder = sortOrder || (sortBy === 'symbol' ? 'asc' : 'desc');
    const params = new URLSearchParams({
      keyword: queryKeyword,
      page: String(page),
      pageSize: String(pageSize),
      sortBy: String(sortBy),
      sortOrder: String(finalSortOrder)
    });
    return axios.get(`https://extapi.aistocklink.cn/api/cn/stocks/profit-forecast/search?${params.toString()}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 获取个股新闻（财联社）
  getStockNews: (symbol, limit = 5, lastTime = 0) => {
    return api.get(`/api/cn/stocks/${encodeURIComponent(symbol)}/news?limit=${limit}&lastTime=${lastTime}`);
  },
  
  // 获取自选股推送新闻
  getPushNews: (_page = 1, _limit = 5) => {
    // 新版占位接口：当前只返回空列表
    return api.get('/api/users/me/news/push');
  },
  
  // --- 新版资讯 API（主页用） ---
  // 头条新闻
  getHeadlineNews: () => {
    return axios.get('https://extapi.aistocklink.cn/api/news/headlines', {
      timeout: 18000
    }).then(res => res.data);
  },

  // 国内资讯
  getCnNews: () => {
    return axios.get('https://extapi.aistocklink.cn/api/news/cn', {
      timeout: 18000
    }).then(res => res.data);
  },

  // 港股资讯
  getHkNews: () => {
    return axios.get('https://extapi.aistocklink.cn/api/news/hk', {
      timeout: 18000
    }).then(res => res.data);
  },

  // 美股资讯
  getGbNews: () => {
    return axios.get('https://extapi.aistocklink.cn/api/news/gb', {
      timeout: 18000
    }).then(res => res.data);
  },

  // 新版新闻全文
  getNewsFullText: (newsId) => {
    return axios.get(`https://extapi.aistocklink.cn/api/news/${newsId}`, {
      timeout: 15000
    }).then(res => res.data);
  },
  
  // 获取标签相关的龙头股票
  getTagLeaders: (tagName) => {
    return api.get(`/api/tags/leaders?tag=${encodeURIComponent(tagName)}`);
  },

  // 获取个股最近一次AI评价
  getStockAnalysis: (symbol, { forceRefresh = false } = {}) => {
    const query = forceRefresh ? '?forceRefresh=1' : '';
    return api.get(`/api/cn/stocks/${encodeURIComponent(symbol)}/analysis${query}`);
  },

  // 触发一次新的个股AI评价
  createStockAnalysis: (symbol, { forceRefresh = false } = {}) => {
    const query = forceRefresh ? '?forceRefresh=1' : '';
    return api.post(`/api/cn/stocks/${encodeURIComponent(symbol)}/analysis${query}`);
  },

  // 获取市场概览数据
  getMarketOverview: () => api.get('/api/market/overview'),

  // 获取国内指数行情（新API）
  getCnIndexQuotes: (symbols = '000001,399001,399006') => {
    return axios.get(`https://extapi.aistocklink.cn/api/cn/index/quotes?symbols=${symbols}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 获取全球指数行情（新API）
  getGbIndexQuotes: (symbols = 'HXC,XIN9,HSTECH') => {
    return axios.get(`https://extapi.aistocklink.cn/api/gb/index/quotes?symbols=${symbols}`, {
      timeout: 18000
    }).then(res => res.data);
  },

  // 获取用户推送设置
  getUserPushSettings: (_userId) => {
    return api.get('/api/users/me/settings');
  },
  
  // 更新用户推送设置
  updateUserPushSettings: (settingType, enabled) => {
    return api.put(`/api/users/me/settings/${encodeURIComponent(settingType)}`, {
      enabled: !!enabled
    });
  },
  
  // 获取微信推送消息详情
  getWechatMessage: (msgId) => {
    // 参数验证
    if (!msgId || typeof msgId !== 'string' || msgId.trim() === '') {
      return Promise.reject(new Error('无效的消息ID'));
    }
    
    console.log(`[DEBUG] 发起获取微信推送消息请求: msgId=${msgId}`);
    return api.get(`/api/wechat?msgid=${encodeURIComponent(msgId)}`)
      .then(response => {
        // 检查响应是否有效
        if (!response) {
          throw new Error('响应为空');
        }
        return response;
      })
      .catch(err => {
        console.error(`[ERROR] 获取微信推送消息失败:`, err);
        throw err;
      });
  },

  // 获取更新日志
  getUpdateLogs: (params = {}) => {
    const { page = 1, per_page = 10, update_type = '' } = params;
    let url = `/api/logs?page=${page}&per_page=${per_page}`;
    if (update_type) {
      url += `&update_type=${encodeURIComponent(update_type)}`;
    }
    return api.get(url);
  },

  // 获取更新类型列表
  getUpdateTypes: () => api.get('/api/logs/types'),
};

async function fetchMonitorData(startTime, endTime) {
  try {
    // 构建查询参数
    const params = {}
    if (startTime) params.start_time = startTime
    if (endTime) params.end_time = endTime
    
    // 调用我们自己的后端API，而不是直接调用1Panel API
    const response = await api.get('/api/monitor/server-status', { params })
    // 检查API响应
    if (response.code === 200 && response.data) {
      return response.data;
    } else {
      console.error('监控API返回错误:', response);
      return null;
    }
  } catch (err) {
    console.error('获取监控数据失败:', err);
    return null;
  }
}

export { fetchMonitorData };
export default api;
