import axios from 'axios';
import axiosRetry from 'axios-retry';

const RETRY_TIMES = 4;
const DEFAULT_KLINE_LIMIT = 100;
const MAX_KLINE_LIMIT = 100;
const AI_ANALYSIS_TIMEOUT = 120000;
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

// 全局 axios 响应拦截器 - 静默处理取消错误
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_CANCELED' || error.__CANCEL__ || error.name === 'CanceledError' || error.name === 'AbortError') {
      return Promise.resolve({ data: { code: -1, data: null, message: 'Request canceled' } });
    }
    return Promise.reject(error);
  }
);

// 开发模式下使用相对路径（通过 webpack dev server 代理转发），生产模式下使用完整URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://gupiao-api.yaozhineng.com' 
  : '';
const EXT_API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://gupiao-api.yaozhineng.com'
  : '';
const PREDICTION_API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://yingfeng64-kronos-api.hf.space'
  : '/prediction-api';
const TTS_API_BASE_URL = process.env.VUE_APP_TTS_API_BASE_URL || 'https://tts.102465.xyz';

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
    if (error.code === 'ERR_CANCELED' || error.__CANCEL__ || error.name === 'CanceledError' || error.name === 'AbortError') {
      return Promise.resolve({ code: -1, data: null, message: 'Request canceled' });
    }
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

const parseMaybeJson = (text) => {
  if (!text || typeof text !== 'string') return text;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
};

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

const parseSseLine = (line) => {
  if (!line) return { field: '', value: '' };
  const index = line.indexOf(':');
  if (index === -1) return { field: line, value: '' };
  const field = line.slice(0, index);
  let value = line.slice(index + 1);
  if (value.startsWith(' ')) value = value.slice(1);
  return { field, value };
};

const readSseStream = async (stream, onEvent) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let currentEvent = 'message';
  let dataLines = [];
  let finalResult = null;
  let streamError = null;

  const emitEvent = () => {
    if (!currentEvent && dataLines.length === 0) return;
    const raw = dataLines.join('\n');
    const data = parseMaybeJson(raw);
    const payload = {
      event: currentEvent || 'message',
      data,
      raw
    };
    if (typeof onEvent === 'function') {
      onEvent(payload);
    }
    if (payload.event === 'result' && data && typeof data === 'object') {
      finalResult = data;
    }
    if (payload.event === 'error') {
      streamError = data || { message: raw || '流式处理失败' };
    }
    currentEvent = 'message';
    dataLines = [];
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let lineEnd = buffer.indexOf('\n');
    while (lineEnd !== -1) {
      let line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);

      if (line === '') {
        emitEvent();
      } else if (!line.startsWith(':')) {
        const { field, value: parsedValue } = parseSseLine(line);
        if (field === 'event') {
          currentEvent = parsedValue || 'message';
        } else if (field === 'data') {
          dataLines.push(parsedValue);
        }
      }

      lineEnd = buffer.indexOf('\n');
    }

    if (done) break;
  }

  if (buffer.trim()) {
    const { field, value } = parseSseLine(buffer.trim());
    if (field === 'event') currentEvent = value || currentEvent;
    if (field === 'data') dataLines.push(value);
  }
  emitEvent();

  return { finalResult, streamError };
};

const requestStockAnalysisStream = async (symbol, { onEvent } = {}) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = setTimeout(() => {
    controller?.abort();
  }, AI_ANALYSIS_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}/api/cn/stocks/${encodeURIComponent(symbol)}/analysis`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream'
      },
      signal: controller?.signal
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let message = `请求失败(${response.status})`;
      try {
        if (contentType.includes('application/json')) {
          const body = await response.json();
          message = body?.message || message;
        } else {
          const text = await response.text();
          if (text) message = text;
        }
      } catch (_) {
        // ignore parse errors
      }
      throw new Error(message);
    }

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    if (!response.body) {
      throw new Error('未接收到流式响应内容');
    }

    const { finalResult, streamError } = await readSseStream(response.body, onEvent);
    if (streamError) {
      const message = streamError?.message || '流式生成失败';
      throw new Error(message);
    }
    if (!finalResult) {
      throw new Error('流式任务未返回最终结果');
    }

    return {
      code: 200,
      message: 'success',
      data: finalResult
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('AI评估流式请求超时，请稍后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

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

export const ttsApi = {
  synthesize: async (payload = {}, options = {}) => {
    const text = String(payload.text || '').trim();
    if (!text) {
      throw new Error('语音播报内容不能为空');
    }

    try {
      const response = await axios.post(`${TTS_API_BASE_URL}/api/tts`, {
        text,
        voice: payload.voice || '晓晓',
        emotion: payload.emotion || '温柔',
        rate: Number.isFinite(Number(payload.rate)) ? Number(payload.rate) : 0,
        pitch: Number.isFinite(Number(payload.pitch)) ? Number(payload.pitch) : 0,
        provider: payload.provider || 'azure'
      }, {
        timeout: 60000,
        responseType: 'blob',
        signal: options.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const audioBlob = response.data;
      if (
        typeof Blob !== 'undefined'
        && audioBlob instanceof Blob
        && audioBlob.type
        && !audioBlob.type.startsWith('audio/')
      ) {
        const textBody = await audioBlob.text();
        const parsed = parseMaybeJson(textBody);
        if (parsed && typeof parsed === 'object') {
          throw new Error(parsed.message || parsed.detail || parsed.error || '语音合成失败');
        }
        throw new Error(typeof parsed === 'string' && parsed.trim() ? parsed.trim() : '语音合成失败');
      }

      return audioBlob;
    } catch (error) {
      let message = error?.message || '语音合成失败';
      const responseData = error?.response?.data;

      if (typeof Blob !== 'undefined' && responseData instanceof Blob) {
        try {
          const textBody = await responseData.text();
          const parsed = parseMaybeJson(textBody);
          if (parsed && typeof parsed === 'object') {
            message = parsed.message || parsed.detail || parsed.error || message;
          } else if (typeof parsed === 'string' && parsed.trim()) {
            message = parsed.trim();
          }
        } catch (_) {
          // ignore blob parse errors
        }
      } else if (responseData && typeof responseData === 'object') {
        message = responseData.message || responseData.detail || responseData.error || message;
      }

      throw new Error(message);
    }
  }
};

// 微信网页授权登录地址（用于微信浏览器内跳转）
export const WECHAT_OAUTH_LOGIN_URL = 'https://gupiao-api.yaozhineng.com/api/auth/wechat/login';

// 股票相关API
export const stockApi = {
  // 批量添加自选股票（新版 API）
  addStocks: (symbols) => api.post('/api/users/me/favorites', { symbols }),

  // 获取长线风口龙头推送历史
  getPotentialPushHistory: (params = {}) => api.get(`/api/potential-stocks/push-history${buildQueryString(params)}`),

  // 获取长线风口龙头收益榜单
  getPotentialPushRanking: (params = {}) => api.get(`/api/potential-stocks/push-ranking${buildQueryString(params)}`),

  // 批量删除自选股票（用户态 API；优先 DELETE，失败回退兼容 POST）
  removeStocks: async (symbols) => {
    try {
      return await api.delete('/api/users/me/favorites', {
        data: { symbols }
      });
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        return api.post('/api/users/me/favorites/delete', { symbols });
      }
      throw error;
    }
  },

  // 自选股图片 OCR（VLM 批量识别）
  ocrStocksFromImages: ({
    images = [],
    hint = '',
    ocrHint = '',
    batchConcurrency = 2,
    maxImagesPerRequest = 4,
    timeoutMs = 90000
  } = {}) => {
    const payload = {
      images,
      batchConcurrency,
      maxImagesPerRequest,
      timeoutMs
    };
    if (hint) payload.hint = hint;
    if (ocrHint) payload.ocrHint = ocrHint;

    return api.post('/api/cn/stocks/ocr', payload, {
      timeout: timeoutMs + 10000,
      'axios-retry': { retries: 0 }
    });
  },

  // 根据关键词搜索股票（新版extapi）
  searchStocks: (keyword, pageSize = 20) => {
    return api.get(`/api/cn/stocks?keyword=${encodeURIComponent(keyword)}&pageSize=${pageSize}`, {
      timeout: 8000
    });
  },


  // 批量获取股票基本信息
  getStockInfos: (symbols) => {
    return api.get(`/api/cn/stock/infos?symbols=${symbols}`, {
      timeout: 8000
    });
  },

  // 批量获取股票成交活跃行情（含价格与交易数据）
  getStockActivityQuotes: (symbols) => {
    return api.get(`/api/cn/stock/quotes/activity?symbols=${symbols}`, {
      timeout: 8000
    });
  },

  // 批量获取股票核心行情（首页榜单用）
  getStockCoreQuotes: (symbols) => {
    return api.get(`/api/cn/stock/quotes/core?symbols=${symbols}`, {
      timeout: 8000
    });
  },

  // 批量获取股票实时行情（历史表现页用）
  getStockRealtimeQuotes: (symbols) => {
    return api.get(`/api/cn/stock/quotes/realtime?symbols=${symbols}`, {
      timeout: 8000
    });
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
    return api.get(`/api/cn/stock/quotes/kline?${params.toString()}`, {
      timeout: 8000
    });
  },

  // 查询股票价格预测缓存（新版 symbol 参数）
  getPricePredictionCache: (symbol) => {
    const safeSymbol = String(symbol || '').trim();
    if (!safeSymbol) {
      return Promise.reject(new Error('缺少 symbol 参数'));
    }
    return axios.get(`${PREDICTION_API_BASE_URL}/api/v1/cache`, {
      timeout: 8000,
      params: {
        symbol: safeSymbol
      }
    }).then(res => res.data);
  },

  // 提交/读取股票价格预测任务（命中缓存时会快速返回）
  createPricePrediction: ({
    symbol,
    lookback = 256,
    predLen = 5,
    sampleCount = 30,
    mode = 'simple',
    includeVolume = false
  } = {}) => {
    const safeSymbol = String(symbol || '').trim();
    if (!safeSymbol) {
      return Promise.reject(new Error('缺少 symbol 参数'));
    }
    return axios.post(`${PREDICTION_API_BASE_URL}/api/v1/predict`, {
      symbol: safeSymbol,
      lookback,
      pred_len: predLen,
      sample_count: sampleCount,
      mode,
      include_volume: includeVolume
    }, {
      timeout: 45000
    }).then(res => res.data);
  },

  // 查询价格预测任务状态
  getPricePredictionTask: (taskId) => {
    const safeTaskId = String(taskId || '').trim();
    if (!safeTaskId) {
      return Promise.reject(new Error('缺少 task_id 参数'));
    }
    return axios.get(`${PREDICTION_API_BASE_URL}/api/v1/predict/${encodeURIComponent(safeTaskId)}`, {
      timeout: 12000
    }).then(res => res.data);
  },

  // 获取单只股票业绩预测（只读，不触发抓取）
  getForecast: (code) => {
    return api.get(`/api/cn/stock/${code}/profit-forecast`, {
      timeout: 8000
    });
  },

  // 触发更新单只股票业绩预测并写入 D1
  createForecast: (code) => {
    return api.post(`/api/cn/stock/${code}/profit-forecast`, null, {
      timeout: 30000
    });
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
    return api.get(`/api/cn/stocks/profit-forecast?${params.toString()}`, {
      timeout: 8000
    });
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
    return api.get(`/api/cn/stocks/profit-forecast/search?${params.toString()}`, {
      timeout: 8000
    });
  },

  // 获取个股新闻（财联社）
  getStockNews: (symbol, limit = 5, lastTime = 0) => {
    return api.get(`/api/cn/stocks/${encodeURIComponent(symbol)}/news?limit=${limit}&lastTime=${lastTime}`);
  },

  // 获取个股资金流向
  getCapitalFlow: (symbol) => {
    return api.get(`/api/cn/stocks/${encodeURIComponent(symbol)}/capital-flow`, {
      timeout: 10000
    });
  },
  
  // 获取自选股推送新闻
  getPushNews: (_page = 1, _limit = 5) => {
    // 新版占位接口：当前只返回空列表
    return api.get('/api/users/me/news/push');
  },
  
  // --- 新版资讯 API（主页用） ---
  // 头条新闻
  getHeadlineNews: () => {
    return api.get('/api/news/headlines', {
      timeout: 8000
    });
  },

  // 国内资讯
  getCnNews: () => {
    return api.get('/api/news/cn', {
      timeout: 8000
    });
  },

  // 港股资讯
  getHkNews: () => {
    return api.get('/api/news/hk', {
      timeout: 8000
    });
  },

  // 美股资讯
  getGbNews: () => {
    return api.get('/api/news/gb', {
      timeout: 8000
    });
  },

  // 新版新闻全文
  getNewsFullText: (newsId) => {
    return api.get(`/api/news/${newsId}`, {
      timeout: 15000
    });
  },
  
  // 获取板块龙头个股（仅支持 BK 板块代码）
  getTagLeaders: (tagCode, count = 10) => {
    const rawTag = String(tagCode || '').trim().toUpperCase();
    const safeCount = Math.min(100, Math.max(1, Number.parseInt(count, 10) || 10));
    if (!/^BK\d{4}$/.test(rawTag)) {
      return Promise.reject(new Error('无效的板块代码，仅支持 BK+4位数字'));
    }
    const params = new URLSearchParams({
      count: String(safeCount)
    });
    return api.get(`/api/cn/tags/${encodeURIComponent(rawTag)}/leaders?${params.toString()}`, {
      timeout: 8000
    });
  },

  // 获取个股最近一次AI评价（只读，不触发新评价）
  getStockAnalysis: (symbol) => {
    return api.get(`/api/cn/stocks/${encodeURIComponent(symbol)}/analysis`, {
      timeout: AI_ANALYSIS_TIMEOUT,
      'axios-retry': { retries: 0 }
    });
  },

  // 触发一次新的个股AI评价
  createStockAnalysis: (symbol) => {
    return api.post(`/api/cn/stocks/${encodeURIComponent(symbol)}/analysis`, null, {
      timeout: AI_ANALYSIS_TIMEOUT,
      'axios-retry': { retries: 0 }
    });
  },

  // 触发一次新的个股AI评价（SSE 流式）
  createStockAnalysisStream: (symbol, options = {}) => {
    return requestStockAnalysisStream(symbol, options);
  },

  // 获取个股历史AI评价（分页只读）
  getStockAnalysisHistory: (symbol, params = {}) => {
    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const pageSizeRaw = Number(params.pageSize) > 0 ? Number(params.pageSize) : 20;
    const pageSize = Math.min(100, pageSizeRaw);
    return api.get(`/api/cn/stocks/${encodeURIComponent(symbol)}/analysis/history`, {
      params: {
        page,
        pageSize
      },
      timeout: AI_ANALYSIS_TIMEOUT,
      'axios-retry': { retries: 0 }
    });
  },

  // 获取市场概览数据
  getMarketOverview: () => api.get('/api/market/overview'),

  // 获取国内指数行情（新API）
  getCnIndexQuotes: (symbols = '000001,399001,399006') => {
    return api.get(`/api/cn/index/quotes?symbols=${symbols}`, {
      timeout: 8000
    });
  },

  // 获取全球指数行情（新API）
  getGbIndexQuotes: (symbols = 'HXC,XIN9,HSTECH') => {
    return api.get(`/api/gb/index/quotes?symbols=${symbols}`, {
      timeout: 8000
    });
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

  // 获取 GitHub 仓库提交记录（公开仓库）
  getGithubRepoCommits: ({ owner, repo, page = 1, per_page = 10 } = {}) => {
    const safeOwner = String(owner || '').trim();
    const safeRepo = String(repo || '').trim();
    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safePerPage = Math.min(100, Math.max(1, Number.parseInt(per_page, 10) || 10));

    if (!safeOwner || !safeRepo) {
      return Promise.reject(new Error('无效的 GitHub 仓库参数'));
    }

    return axios.get(`https://api.github.com/repos/${encodeURIComponent(safeOwner)}/${encodeURIComponent(safeRepo)}/commits`, {
      timeout: 12000,
      params: {
        page: safePage,
        per_page: safePerPage
      },
      headers: {
        Accept: 'application/vnd.github+json'
      }
    }).then((response) => {
      const linkHeader = response?.headers?.link || '';
      const hasNext = /rel="next"/.test(linkHeader);
      const hasPrev = /rel="prev"/.test(linkHeader);
      const lastMatch = linkHeader.match(/<[^>]*[?&]page=(\d+)[^>]*>; rel="last"/);
      const lastPage = lastMatch ? Number.parseInt(lastMatch[1], 10) : null;

      return {
        code: 200,
        data: {
          commits: Array.isArray(response.data) ? response.data : [],
          pagination: {
            has_next: hasNext,
            has_prev: hasPrev,
            last_page: Number.isFinite(lastPage) ? lastPage : null
          }
        }
      };
    });
  },
};

// 配置 API
export const configApi = {
  getPublicConfig: () => api.get('/api/config/public'),
};

// 风口爆发 API
export const trendHotspotApi = {
  /** 查询公告/新闻研判事件列表 */
  getEvents: ({ cycle = 'all', change_type, stock_code, limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams({ cycle, limit: String(limit), offset: String(offset) });
    if (change_type) params.append('change_type', change_type);
    if (stock_code) params.append('stock_code', stock_code);
    return api.get(`/api/cn/trend-hotspots/events?${params.toString()}`, { timeout: 8000 });
  },

  /** 查询指定股票的趋势风口事件 */
  getEventsByStock: (stockCode, { cycle = 'all', limit = 20 } = {}) => {
    return api.get(`/api/cn/trend-hotspots/events/${encodeURIComponent(stockCode)}?cycle=${cycle}&limit=${limit}`, { timeout: 8000 });
  },

  /** 获取趋势风口统计概览 */
  getStats: () => {
    return api.get('/api/cn/trend-hotspots/stats', { timeout: 8000 });
  },

  /** 查询用户自选股资讯（需登录） */
  getFavoritesNews: ({ cycle = 'all', change_type, limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams({ cycle, limit: String(limit), offset: String(offset) });
    if (change_type) params.append('change_type', change_type);
    return api.get(`/api/cn/favorites/news?${params.toString()}`, { timeout: 8000 });
  },
};

// 十倍股评分 API
export const tenxApi = {
  /** 获取股票最新十倍股评分(从D1缓存) */
  getScore: (symbol) => api.get(`/api/cn/stocks/${symbol}/tenx-score`, {
    timeout: 90000,
    'axios-retry': { retries: 0 },
    validateStatus: (status) => status < 500,
  }),

  /** 获取股票历史评分 */
  getScoreHistory: (symbol, page = 1, pageSize = 20) =>
    api.get(`/api/cn/stocks/${symbol}/tenx-score/history`, { params: { page, pageSize } }),

  /** 强制刷新评分（重新获取数据并计算）
   *  mode: 'quick' → 只重新获取动态数据(估值/质押/增减持)，复用缓存的财报数据
   *  mode: undefined → 全量重新获取所有数据
   */
  refreshScore: (symbol, mode = '') => api.post(`/api/cn/stocks/${symbol}/tenx-score/refresh${mode ? `?mode=${mode}` : ''}`, null, {
    timeout: 120000,
    'axios-retry': { retries: 0 }
  }),

  /** 批量刷新评分（带频率控制，串行处理）
   *  mode: 'quick' → 只重新获取动态数据，1秒间隔
   *  mode: undefined → 全量获取，2秒间隔
   */
  batchRefresh: (symbols, mode = '') => api.post(`/api/cn/stocks/tenx-score/batch`, { symbols, mode }, {
    timeout: 600000,
    'axios-retry': { retries: 0 }
  }),

  /** 一票否决检查 */
  checkVeto: (symbol) => api.get(`/api/cn/stocks/${symbol}/tenx-score/veto-check`, {
    timeout: 30000,
    'axios-retry': { retries: 0 },
  }),

  /** 获取评分Top30股票列表 */
  getTopStocks: (limit = 30) => api.get(`/api/cn/stocks/tenx-score/top`, {
    params: { limit },
    timeout: 15000,
  }),
};

// 趋势股评分 API
export const trendApi = {
  // 获取股票最新趋势股评分
  getScore: (symbol) => api.get(`/api/cn/stocks/${symbol}/trend-score`, {
    timeout: 90000,
    'axios-retry': { retries: 0 },
    validateStatus: (status) => status < 500,
  }),

  // 获取评分详情（含K线数据、新闻列表）
  getDetail: (symbol) => api.get(`/api/cn/stocks/${symbol}/trend-score/detail`, {
    timeout: 90000,
    'axios-retry': { retries: 0 },
  }),

  // 获取Top N评分列表
  getTopStocks: (limit = 30) => api.get(`/api/cn/stocks/trend-score/top`, {
    params: { limit },
    timeout: 15000,
  }),

  // 刷新评分
  refreshScore: (symbol) => api.post(`/api/cn/stocks/${symbol}/trend-score/refresh`, null, {
    timeout: 120000,
    'axios-retry': { retries: 0 },
  }),

  // 批量刷新评分
  batchRefresh: (symbols) => api.post(`/api/cn/stocks/trend-score/batch`, { symbols }, {
    timeout: 600000,
    'axios-retry': { retries: 0 },
  }),
};

// 风口龙头 API
export const windLeaderApi = {
  /** 获取风口龙头分析结果 */
  getWindLeaders: (limit = 8) => api.get('/api/cn/wind-leaders', {
    params: { limit },
    timeout: 10000,
  }),
  /** 手动触发风口龙头分析刷新 */
  refreshAnalysis: () => api.post('/api/cn/wind-leaders/refresh', {}, {
    timeout: 120000,
  }),
  /** 执行三步机构调研推荐热门股检测 */
  detectHotBurst: () => api.post('/api/cn/institution-research/detect', {}, {
    timeout: 60000,
  }),
  /** 获取机构调研推荐热门股检测结果（默认返回三源共振及以上的信号） */
  getHotBurst: (hours = 6, minResonance = 3) => api.get('/api/cn/institution-research', {
    params: { hours, min_resonance: minResonance },
    timeout: 10000,
  }),
  /** 获取机构调研推荐热门股历史记录（默认仅返回三源共振的记录） */
  getHotBurstHistory: (limit = 50, offset = 0) => api.get('/api/cn/institution-research/history', {
    params: { limit, offset, min_resonance_only: true },
    timeout: 10000,
  }),
  /** 从 DB 获取最新的机构调研推荐热门股（轻量查询，不触发检测） */
  getLatestRecords: (limit = 5) => api.get('/api/cn/institution-research/latest', {
    params: { limit },
    timeout: 10000,
  }),
  /** 获取爆发关键词 */
  getHotKeywords: (hours = 6, limit = 20) => api.get('/api/cn/hot-keywords', {
    params: { hours, limit },
    timeout: 10000,
  }),
  /** 手动触发关键词爆发检测 */
  detectHotKeywords: () => api.post('/api/cn/hot-keywords/detect', {}, {
    timeout: 30000,
  }),
};

// AI产业链知识图谱 API
export const aiGraphApi = {
  /** 获取所有概念列表 */
  getConcepts: () => api.get('/api/aigraph/concepts', { timeout: 10000 }),
  /** 根据概念代码获取图谱数据 */
  getGraphByConcept: (conceptCode) => api.get(`/api/aigraph/concept/${conceptCode}`, { timeout: 15000 }),
};

// 行业知识图谱 API
export const industryKGApi = {
  /** 获取完整知识图谱（594行业+边+概念） */
  getFullGraph: () => api.get('/api/kg/graph', { timeout: 30000 }),
  /** 获取AI产业链子图（关键词匹配+BFS扩展） */
  getAISubGraph: () => api.get('/api/kg/ai-graph', { timeout: 30000 }),
  /** 获取概念子图（用于层级流向图） */
  getSubGraph: (conceptId, depth = 1) => api.get('/api/kg/subgraph', { params: { concept: conceptId, depth }, timeout: 15000 }),
  /** 获取所有概念列表 */
  getConcepts: () => api.get('/api/kg/concepts', { timeout: 10000 }),
  /** 获取行业龙头股 */
  getIndustryStocks: (industryId) => api.get(`/api/kg/industry/${industryId}/stocks`, { timeout: 10000 }),
  /** 手动触发知识图谱重建 */
  refresh: () => api.post('/api/kg/refresh', {}, { timeout: 120000 }),
};

export default api;
