import { createStore } from 'vuex'
import { authApi, stockApi } from '@/services/api'
import cacheManager from '@/utils/cacheManager'

const KLINE_TOTAL_LIMIT = 100;
const KLINE_MAX_PAGES = 3;

function parseKlineTime(rawTime) {
  const text = String(rawTime || '').trim();
  if (!text) return null;
  const digits = text.replace(/\D/g, '');
  if (digits.length < 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
  const second = digits.length >= 14 ? Number(digits.slice(12, 14)) : 0;
  return new Date(year, month, day, hour, minute, second);
}

function buildKlineEndCursor(rawTime, klt) {
  const source = String(rawTime || '').trim();
  const digits = source.replace(/\D/g, '');
  const base = parseKlineTime(source);
  if (!base || digits.length < 8) return '';

  const next = new Date(base.getTime());
  if (klt >= 100) {
    if (klt === 102) {
      next.setDate(next.getDate() - 7);
    } else if (klt === 103) {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 1);
    }
  } else {
    const stepMinutes = Math.max(1, Number(klt) || 1);
    next.setMinutes(next.getMinutes() - stepMinutes);
  }

  const pad2 = n => String(n).padStart(2, '0');
  const y = next.getFullYear();
  const m = pad2(next.getMonth() + 1);
  const d = pad2(next.getDate());
  const h = pad2(next.getHours());
  const mm = pad2(next.getMinutes());
  const s = pad2(next.getSeconds());

  if (digits.length >= 14) return `${y}${m}${d}${h}${mm}${s}`;
  if (digits.length >= 12) return `${y}${m}${d}${h}${mm}`;
  return `${y}${m}${d}`;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeOcrImages(images) {
  if (!Array.isArray(images)) return [];

  return images
    .map((item) => {
      if (typeof item === 'string') {
        const content = item.trim();
        return content ? content : null;
      }
      if (!item || typeof item !== 'object') {
        return null;
      }

      const url = typeof item.url === 'string' ? item.url.trim() : '';
      if (url) {
        return { url };
      }

      const data = typeof item.data === 'string' ? item.data.trim() : '';
      if (!data) return null;

      const normalized = { data };
      const mime = typeof item.mime === 'string' ? item.mime.trim() : '';
      if (mime) normalized.mime = mime;
      return normalized;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function formatDateTime(dateText) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return String(dateText || '');
  }
  const pad2 = (value) => String(value).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

export default createStore({
  state: {
    user: JSON.parse(localStorage.getItem('user')) || null, // 从 localStorage 恢复用户信息
    isAuthenticated: !!JSON.parse(localStorage.getItem('user')), // 刷新后从 localStorage 恢复，checkCookieAuth 后台校验
    stockList: [],
    marketOverview: {},
    favoriteStocks: JSON.parse(localStorage.getItem('favoriteStocks')) || [] // 自选股列表
  },
  getters: {
    isLoggedIn: state => state.isAuthenticated,
    currentUser: state => state.user,
    stockList: state => state.stockList,
    marketOverview: state => state.marketOverview,
    favoriteStocks: state => state.favoriteStocks
  },
  mutations: {
    setUser(state, user) {
      state.user = user
      state.isAuthenticated = !!user
      // 将用户信息存储到 localStorage
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },
    setStockList(state, stocks) {
      state.stockList = stocks
    },
    setMarketOverview(state, overview) {
      state.marketOverview = overview
    },
    setFavoriteStocks(state, stocks) {
      state.favoriteStocks = stocks;
      localStorage.setItem('favoriteStocks', JSON.stringify(stocks)); // 更新缓存
    },
    logout(state) {
      state.user = null
      state.isAuthenticated = false
      state.favoriteStocks = []
      // 清除所有localStorage数据
      localStorage.removeItem('user'); // 清除用户信息
      localStorage.removeItem('favoriteStocks'); // 清除自选股
      // 清除所有sessionStorage
      sessionStorage.clear();
      // 清除版本缓存，强制下次重新检查
      localStorage.removeItem('app_version');
    }
  },
  actions: {
    async login({ commit }, userData) {
      try {
        commit('setUser', userData);
        return true;
      } catch (error) {
        console.error('登录失败:', error);
        return false;
      }
    },
    async fetchUserInfo({ commit }) {
      try {
        const response = await authApi.getUserInfo();
        if (response.code === 0) {
          const user = {
            id: response.data.user_id,
            name: response.data.nickname,
            avatar: response.data.avatar_url,
            role: response.data.role,
            createdAt: response.data.created_at,
            stocksCount: response.data.stocks_count
          };
          commit('setUser', user);
          return true;
        }
        return false;
      } catch (error) {
        console.error('获取用户信息失败:', error);
        commit('logout'); // 如果获取失败，清除登录状态
        return false;
      }
    },

    // 通过 Cookie 检测微信网页授权登录状态（OAuth 回调后使用）
    async checkCookieAuth({ commit, dispatch }) {
      try {
        const response = await authApi.getAuthMe();
        // 适配新版 API 返回格式 (code 200)
        if (response.code === 200 && response.data) {
          const userData = response.data;
          const user = {
            id: userData.openid,
            name: userData.nickname,
            avatar: userData.avatar_url,
            createdAt: userData.created_at,
            stocksCount: userData['自选股'] ? userData['自选股'].length : 0
          };
          
          commit('setUser', user);
          
          // 同步自选股数据
          if (userData['自选股'] && Array.isArray(userData['自选股'])) {
            const stocks = userData['自选股'].map(s => ({
              code: s['股票代码'],
              name: s['股票简称'],
              market: s['市场代码'],
              added_at: s['添加时间']
            }));
            commit('setFavoriteStocks', stocks);
          }

          console.log('[Store] Cookie 认证成功，用户:', user.name);
          return true;
        }
        return false;
      } catch (error) {
        console.log('[Store] Cookie 认证未检测到登录状态');
        return false;
      }
    },

    async addFavoriteStocks({ commit, state }, stocks) {
      try {
        // 转换为股票代码数组
        const symbols = stocks.map(s => s.code || s);
        console.log('[DEBUG] 发起添加自选股请求:', symbols);
        const response = await stockApi.addStocks(symbols);
        console.log('[DEBUG] 添加自选股响应:', response);
        
        if (response.code === 200 && response.data) {
          // 新 API 返回完整用户信息 + 自选股列表，直接更新
          const userData = response.data;
          if (userData['自选股'] && Array.isArray(userData['自选股'])) {
            const favoriteStocks = userData['自选股'].map(s => ({
              code: s['股票代码'],
              name: s['股票简称'],
              market: s['市场代码']
            }));
            commit('setFavoriteStocks', favoriteStocks);
            
            // 同时更新用户的自选股计数
            const user = {
              ...state.user,
              stocksCount: favoriteStocks.length
            };
            commit('setUser', user);
          }
          return true;
        } else {
          console.error('添加自选股失败，服务器返回错误:', response);
          return false;
        }
      } catch (error) {
        console.error('添加自选股失败:', error);
        return false;
      }
    },
    async removeFavoriteStocks({ commit, state }, stockCodes) {
      try {
        // 确保是数组格式
        const symbols = Array.isArray(stockCodes) ? stockCodes : [stockCodes];
        console.log('[DEBUG] 发起删除自选股请求:', symbols);
        const response = await stockApi.removeStocks(symbols);
        console.log('[DEBUG] 删除自选股响应:', response);
        
        if (response.code === 200 && response.data) {
          // 新 API 返回完整用户信息 + 自选股列表，直接更新
          const userData = response.data;
          if (userData['自选股'] && Array.isArray(userData['自选股'])) {
            const favoriteStocks = userData['自选股'].map(s => ({
              code: s['股票代码'],
              name: s['股票简称'],
              market: s['市场代码']
            }));
            commit('setFavoriteStocks', favoriteStocks);
            
            // 同时更新用户的自选股计数
            const user = {
              ...state.user,
              stocksCount: favoriteStocks.length
            };
            commit('setUser', user);
          }
          return true;
        } else {
          console.error('删除自选股失败，服务器返回错误:', response);
          return false;
        }
      } catch (error) {
        console.error('删除自选股失败:', error);
        return false;
      }
    },
    async addStocksFromImage(_, payload) {
      try {
        const requestPayload = typeof payload === 'string'
          ? { images: [payload] }
          : (payload || {});

        const normalizedImages = normalizeOcrImages(requestPayload.images);
        if (normalizedImages.length === 0) {
          throw new Error('未获取到有效图片数据');
        }

        const imageCount = normalizedImages.length;
        const defaultTimeoutMs = Math.min(120000, Math.max(45000, 30000 + imageCount * 15000));
        const defaultBatchConcurrency = imageCount >= 6 ? 3 : 2;
        const defaultMaxImagesPerRequest = imageCount >= 4
          ? 2
          : Math.max(1, Math.min(4, imageCount));

        const hint = typeof requestPayload.hint === 'string' ? requestPayload.hint.trim() : '';
        const ocrHint = typeof requestPayload.ocrHint === 'string' ? requestPayload.ocrHint.trim() : '';
        const batchConcurrency = clampInteger(requestPayload.batchConcurrency, 1, 4, defaultBatchConcurrency);
        const maxImagesPerRequest = clampInteger(requestPayload.maxImagesPerRequest, 1, 4, defaultMaxImagesPerRequest);
        const timeoutMs = clampInteger(requestPayload.timeoutMs, 10000, 120000, defaultTimeoutMs);

        const response = await stockApi.ocrStocksFromImages({
          images: normalizedImages,
          hint,
          ocrHint,
          batchConcurrency,
          maxImagesPerRequest,
          timeoutMs
        });

        if (response?.code !== 200) {
          throw new Error(response?.message || 'OCR 接口返回失败');
        }
        if (!Array.isArray(response.data)) {
          throw new Error('OCR 响应格式异常');
        }

        const merged = [];
        response.data.forEach(batch => {
          if (Array.isArray(batch)) {
            merged.push(...batch);
          } else if (batch && typeof batch === 'object') {
            merged.push(batch);
          }
        });

        const stockMap = new Map();
        merged.forEach((item) => {
          if (!item || typeof item !== 'object') return;
          const code = String(item['股票代码'] || '').trim();
          const name = String(item['股票简称'] || '').trim();
          if (!code) return;
          if (!stockMap.has(code)) {
            stockMap.set(code, { code, name: name || code });
            return;
          }
          if (name && !stockMap.get(code).name) {
            stockMap.set(code, { code, name });
          }
        });

        return { stocks: Array.from(stockMap.values()) };
      } catch (error) {
        console.error('图片识别失败:', error);
        const serverMessage = error?.response?.data?.message;
        return {
          stocks: [],
          error: true,
          message: serverMessage || error?.message || '图片识别失败'
        };
      }
    },
    async searchStocks(_, { keyword, limit }) {
      try {
        const response = await stockApi.searchStocks(keyword, limit || 20);
        if (response.code === 200 && response.data?.股票列表) {
          return response.data.股票列表.map(item => ({
            code: item.股票代码,
            name: item.股票简称,
            market: item.市场代码,
            industry: item.所属行业 || ''
          }));
        }
        return [];
      } catch (error) {
        console.error('搜索股票失败:', error);
        return [];
      }
    },
    
    /**
     * 批量获取股票价格（优先使用新鲜缓存，过期时自动刷新）
     * @param {Array|Object} payload - 股票数组，或 { stocks, forceRefresh, maxAge }
     * @returns {Array} 包含价格的股票列表
     */
    async fetchBatchStockPrices(_, payload) {
      let stocks = [];
      try {
        const request = Array.isArray(payload)
          ? { stocks: payload }
          : (payload || {});
        stocks = Array.isArray(request.stocks) ? request.stocks : [];
        const forceRefresh = !!request.forceRefresh;
        const maxAge = Number.isFinite(request.maxAge) ? request.maxAge : undefined;

        if (!stocks || stocks.length === 0) return [];
        
        const codes = Array.from(new Set(
          stocks
            .map(stock => stock?.code)
            .filter(Boolean)
        ));
        if (codes.length === 0) return [];
        
        // 1. 从缓存获取价格，过期数据仅作为失败时的回退
        const cacheOptions = { forceRefresh };
        if (maxAge !== undefined) {
          cacheOptions.maxAge = maxAge;
        }
        const { found, missing, stale } = cacheManager.getBatchStockPrices(codes, cacheOptions);
        
        // 2. 如果有缺失的，分批请求
        let fetchedStocks = [];
        if (missing.length > 0) {
          console.log(`[Store] 需要请求 ${missing.length} 支股票的价格`);
          
          // 每批最多10支股票
          const batchSize = 10;
          const batches = [];
          for (let i = 0; i < missing.length; i += batchSize) {
            batches.push(missing.slice(i, i + batchSize));
          }
          
          // 并发请求所有批次
          const batchRequests = batches.map(batch => {
            const symbols = batch.join(',');
            return Promise.allSettled([
              stockApi.getStockInfos(symbols),
              stockApi.getStockActivityQuotes(symbols)
            ]);
          });
          
          const batchResults = await Promise.all(batchRequests);
          
          // 解析结果
          const allInfos = [];
          const allQuotes = [];
          
          batchResults.forEach(results => {
            // results 是一个包含 [infoResult, quoteResult] 的数组
            const [infoResult, quoteResult] = results;
            
            if (infoResult.status === 'fulfilled' && infoResult.value?.code === 200) {
              allInfos.push(...(infoResult.value.data?.股票信息 || []));
            }
            
            if (quoteResult.status === 'fulfilled' && quoteResult.value?.code === 200) {
              allQuotes.push(...(quoteResult.value.data?.行情 || []));
            }
          });
          
          // 组装数据
          const stockMap = {};
          allInfos.forEach(info => {
            stockMap[info.股票代码] = {
              code: info.股票代码,
              name: info.股票简称,
              market: info.市场代码,
              industry: info.所属行业
            };
          });
          
          allQuotes.forEach(quote => {
            if (stockMap[quote.股票代码]) {
              stockMap[quote.股票代码].latest_price = quote.最新价;
              stockMap[quote.股票代码].change_percent = quote.涨跌幅;
            }
          });
          
          fetchedStocks = Object.values(stockMap);
          
          // 保存到缓存
          if (fetchedStocks.length > 0) {
            cacheManager.saveStockPrices(fetchedStocks);
            console.log(`[Store] 已缓存 ${fetchedStocks.length} 支新股票价格`);
          }
        }
        
        // 3. 合并缓存和新请求的数据。优先级：新请求 > 新鲜缓存 > 过期缓存
        const stockPriceMap = new Map();
        [...stale, ...found, ...fetchedStocks].forEach(stock => {
          if (stock?.code) {
            stockPriceMap.set(stock.code, stock);
          }
        });
        
        // 4. 按原始顺序返回，并补充原始股票的name和market信息
        return stocks.map(stock => {
          const priceData = stockPriceMap.get(stock.code);
          return {
            code: stock.code,
            name: priceData?.name || stock.name,
            market: priceData?.market || stock.market,
            industry: priceData?.industry || stock.industry,
            latest_price: priceData?.latest_price || 0,
            change_percent: priceData?.change_percent || 0
          };
        });
      } catch (error) {
        console.error('[Store] 批量获取股票价格失败:', error);
        // 出错时返回带空价格的股票列表
        return stocks.map(stock => ({
          ...stock,
          latest_price: 0,
          change_percent: 0
        }));
      }
    },
    
    async fetchStockKline(_, {
      symbol,
      klt = 101,
      fqt = 1,
      limit = KLINE_TOTAL_LIMIT,
      startDate = '',
      endDate = ''
    }) {
      if (!symbol) {
        return null;
      }
      try {
        const targetLimit = Math.min(
          KLINE_TOTAL_LIMIT,
          Math.max(1, Number.parseInt(limit, 10) || KLINE_TOTAL_LIMIT)
        );
        const pageCount = targetLimit <= 60 ? 2 : KLINE_MAX_PAGES;
        const pageSize = Math.ceil(targetLimit / pageCount);

        let cursorEndDate = endDate;
        let meta = null;
        const mergedItems = [];
        const seenTimes = new Set();

        for (let page = 0; page < pageCount && mergedItems.length < targetLimit; page += 1) {
          const remain = targetLimit - mergedItems.length;
          const response = await stockApi.getStockKline({
            symbol,
            klt,
            fqt,
            limit: Math.min(pageSize, remain),
            startDate,
            endDate: cursorEndDate
          });

          if (response.code !== 200 || !response.data) {
            break;
          }

          if (!meta) {
            meta = response.data;
          }

          const items = Array.isArray(response.data['K线']) ? response.data['K线'] : [];
          if (items.length === 0) {
            break;
          }

          for (const item of items) {
            const key = String(item?.['时间'] || '');
            if (!key || seenTimes.has(key)) continue;
            seenTimes.add(key);
            mergedItems.push(item);
            if (mergedItems.length >= targetLimit) break;
          }

          if (mergedItems.length >= targetLimit) {
            break;
          }

          let oldestRawTime = '';
          let oldestTime = null;
          for (const item of items) {
            const raw = String(item?.['时间'] || '');
            const parsed = parseKlineTime(raw);
            if (!parsed) continue;
            if (!oldestTime || parsed < oldestTime) {
              oldestTime = parsed;
              oldestRawTime = raw;
            }
          }

          const nextEndDate = buildKlineEndCursor(oldestRawTime, klt);
          if (!nextEndDate || String(nextEndDate) === String(cursorEndDate || '')) {
            break;
          }
          cursorEndDate = nextEndDate;
        }

        if (meta) {
          return {
            symbol: meta['股票代码'] || symbol,
            period: meta['K线周期'] || '',
            adjustment: meta['复权类型'] || '',
            count: mergedItems.length,
            items: mergedItems.slice(0, targetLimit)
          };
        }
        return null;
      } catch (error) {
        console.error('获取股票K线数据失败:', error);
        return null;
      }
    },
    async fetchStockSnapshot(_, code) {
      try {
        const [infoRes, quoteRes] = await Promise.allSettled([
          stockApi.getStockInfos(code),
          stockApi.getStockActivityQuotes(code)
        ]);

        const infoData = infoRes.status === 'fulfilled' && infoRes.value?.code === 200
          ? infoRes.value.data
          : null;
        const quoteData = quoteRes.status === 'fulfilled' && quoteRes.value?.code === 200
          ? quoteRes.value.data
          : null;

        const infoList = infoData?.股票信息 || [];
        const quoteList = quoteData?.行情 || [];
        const info = infoList.find(item => item.股票代码 === code) || infoList[0] || null;
        const quote = quoteList.find(item => item.股票代码 === code) || quoteList[0] || null;

        if (!info && !quote) {
          return null;
        }

        return {
          info,
          quote,
          source: infoData?.来源 || '东方财富',
          infoUpdatedAt: infoData?.更新时间 || '',
          quoteUpdatedAt: quoteData?.更新时间 || ''
        };
      } catch (error) {
        console.error('获取股票快照失败:', error);
        return null;
      }
    },
    async fetchStockNews(_, { stockCode, limit = 5, lastTime = 0 }) {
      try {
        console.log('[DEBUG] 发起获取股票新闻请求:', { stockCode, limit, lastTime });
        const response = await stockApi.getStockNews(stockCode, limit, lastTime);
        console.log('[DEBUG] 获取股票新闻响应:', response);

        if (response.code === 200 && response.data) {
          const data = response.data;
          const newsList = data['个股新闻'] || [];
          return {
            list: newsList,
            total: data['总数量'] || newsList.length,
            lastTime: data.lastTime || lastTime,
            stockName: data['股票简称'] || '',
            keyword: data['查询关键词'] || '',
            updatedAt: data['更新时间'] || ''
          };
        }
        return { list: [], total: 0, lastTime, stockName: '', keyword: '', updatedAt: '' };
      } catch (error) {
        console.error('获取股票新闻失败:', error);
        return { list: [], total: 0, lastTime, stockName: '', keyword: '', updatedAt: '' };
      }
    },
    async fetchNewsDetail(_, newsId) {
      try {
        const response = await stockApi.getNewsFullText(newsId);
        if (response.code === 200 && response.data) {
          const item = response.data;
          return {
            title: item.标题 || '',
            summary: item.摘要 || '',
            content: item.正文 || item.摘要 || '',
            publish_time: item.时间 || '',
            url: item.链接 || '',
            tag: { positive: [], negative: [] }
          };
        }
        return null;
      } catch (error) {
        console.error('获取新闻详情失败:', error);
        throw error;
      }
    },
    // 获取头条新闻（新版 API）
    async fetchHeadlineNews() {
      try {
        const response = await stockApi.getHeadlineNews();
        if (response.code === 200 && response.data) {
          return (response.data.头条新闻 || []).map(item => ({
            id: item.ID,
            title: item.标题,
            content: item.摘要,
            publish_time: item.时间,
            url: item.链接,
            author: item.作者,
            tag: { positive: [], negative: [] }
          }));
        }
        return [];
      } catch (error) {
        console.error('获取头条新闻失败:', error);
        return [];
      }
    },
    // 获取国内资讯（新版 API）
    async fetchCnNews() {
      try {
        const response = await stockApi.getCnNews();
        if (response.code === 200 && response.data) {
          return (response.data.头条新闻 || []).map(item => ({
            id: item.ID,
            title: item.标题,
            content: item.摘要,
            publish_time: item.时间,
            url: item.链接,
            author: item.作者,
            tag: { positive: [], negative: [] }
          }));
        }
        return [];
      } catch (error) {
        console.error('获取国内资讯失败:', error);
        return [];
      }
    },
    // 获取外围资讯（混合港股+美股，取最新5条）
    async fetchForeignNews() {
      try {
        const [hkRes, gbRes] = await Promise.allSettled([
          stockApi.getHkNews(),
          stockApi.getGbNews()
        ]);
        let allNews = [];
        const mapItem = item => ({
          id: item.ID,
          title: item.标题,
          content: item.摘要,
          publish_time: item.时间,
          url: item.链接,
          author: item.作者,
          tag: { positive: [], negative: [] }
        });
        if (hkRes.status === 'fulfilled' && hkRes.value?.code === 200) {
          allNews.push(...(hkRes.value.data?.头条新闻 || []).map(mapItem));
        }
        if (gbRes.status === 'fulfilled' && gbRes.value?.code === 200) {
          allNews.push(...(gbRes.value.data?.头条新闻 || []).map(mapItem));
        }
        // 按时间倒序排列，取前5条
        allNews.sort((a, b) => new Date(b.publish_time) - new Date(a.publish_time));
        return allNews.slice(0, 5);
      } catch (error) {
        console.error('获取外围资讯失败:', error);
        return [];
      }
    },
    // 获取自选股推送新闻
    async fetchPushNews(_, { page = 1, limit = 5 } = {}) {
      try {
        const response = await stockApi.getPushNews(page, limit);
        if (response?.code === 200) {
          return {
            news: response?.data?.['推送新闻'] || []
          };
        }
        return { news: [] };
      } catch (error) {
        console.error('获取自选股推送新闻失败:', error);
        return { news: [] };
      }
    },
    
    // 获取板块下的龙头股票（仅支持 BK 板块代码）
    async fetchTagStocks(_, payload) {
      const rawTagCode = typeof payload === 'string' ? payload : payload?.tagCode;
      const rawTagName = typeof payload === 'object' ? (payload?.tagName || '') : '';
      const safeCount = Math.min(100, Math.max(1, Number.parseInt(payload?.count, 10) || 10));

      const normalizeTagCode = (value) => {
        const text = String(value || '').trim().toUpperCase();
        return /^BK\d{4}$/.test(text) ? text : '';
      };
      const toFiniteNumber = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        const text = String(value).replace(/,/g, '').trim();
        if (!text || text === '-' || text === '--' || text === '—') return null;
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const inferMarketCode = (symbol) => {
        const code = String(symbol || '').trim();
        if (/^(60|68|90|50|51|52|56|58)/.test(code)) return 'SH';
        if (/^(00|30|20)/.test(code)) return 'SZ';
        if (/^(43|83|87|92)/.test(code)) return 'BJ';
        return '';
      };

      const normalizedTagCode = normalizeTagCode(rawTagCode);
      if (!normalizedTagCode) {
        throw new Error('无效的板块代码，仅支持 BK+4位数字');
      }

      try {
        console.log('[DEBUG] 发起获取标签龙头股票请求:', {
          tagCode: normalizedTagCode,
          count: safeCount
        });
        const response = await stockApi.getTagLeaders(normalizedTagCode, safeCount);
        console.log('[DEBUG] 获取标签龙头股票响应:', response);

        if (response?.code === 200 && response?.data) {
          const data = response.data;
          const leaders = Array.isArray(data['龙头个股']) ? data['龙头个股'] : [];
          const stocks = leaders
            .map((item) => {
              const code = String(item['股票代码'] || item.f12 || item.code || '').trim();
              const name = String(item['股票名称'] || item['股票简称'] || item.f14 || item.name || '').trim();
              const latestPrice = toFiniteNumber(item['最新价'] ?? item.f2 ?? item.price ?? item.latest_price);
              const changePercent = toFiniteNumber(item['涨跌幅'] ?? item.f3 ?? item.change ?? item.change_percent);
              const mainFundInflow = toFiniteNumber(item['主力净流入'] ?? item.f62 ?? item.main_fund_inflow);
              if (!code) return null;
              return {
                code,
                name: name || code,
                market: inferMarketCode(code),
                price: latestPrice,
                change: changePercent,
                mainFundInflow,
                mainFundInflowValue: mainFundInflow
              };
            })
            .filter(Boolean)
            .sort((a, b) => {
              const left = Number.isFinite(a.mainFundInflowValue) ? a.mainFundInflowValue : Number.NEGATIVE_INFINITY;
              const right = Number.isFinite(b.mainFundInflowValue) ? b.mainFundInflowValue : Number.NEGATIVE_INFINITY;
              return right - left;
            });

          return {
            description: data['来源'] || '',
            stocks,
            tagCode: data['板块ID'] || normalizedTagCode,
            tagName: rawTagName || normalizedTagCode
          };
        }

        throw new Error(response?.message || '获取板块龙头股票失败');
      } catch (error) {
        console.error('获取标签股票失败:', error);
        throw error; // 抛出错误，让组件可以捕获并处理
      }
    },
    
    async fetchStockForecast(_, payload) {
      const stockCode = typeof payload === 'string' ? payload : payload?.stockCode;
      const refresh = typeof payload === 'object' ? !!payload.refresh : false;
      if (!stockCode) return [];
      try {
        const response = refresh
          ? await stockApi.createForecast(stockCode)
          : await stockApi.getForecast(stockCode);
        if (response.code === 200) {
          return response.data;
        }
        return [];
      } catch (error) {
        console.error('获取股票业绩预测失败:', error);
        return [];
      }
    },

    async fetchStockEvaluation(_, payload = {}) {
      const stockCode = typeof payload === 'string' ? payload : payload?.stockCode;
      const refresh = typeof payload === 'object' ? !!payload.refresh : false;
      const stream = typeof payload === 'object' ? !!payload.stream : false;
      const onStreamEvent = typeof payload?.onStreamEvent === 'function'
        ? payload.onStreamEvent
        : null;
      if (!stockCode) return null;
      try {
        let response;
        if (refresh) {
          response = stream
            ? await stockApi.createStockAnalysisStream(stockCode, { onEvent: onStreamEvent })
            : await stockApi.createStockAnalysis(stockCode);
        } else {
          try {
            response = await stockApi.getStockAnalysis(stockCode);
          } catch (error) {
            const status = error?.response?.status;
            if (status === 404) {
              console.warn(`[Store] 股票 ${stockCode} 暂无历史AI评估，自动触发创建`);
              response = stream
                ? await stockApi.createStockAnalysisStream(stockCode, { onEvent: onStreamEvent })
                : await stockApi.createStockAnalysis(stockCode);
            } else {
              throw error;
            }
          }
        }

        if (response.code === 200 && response.data) {
          const data = response.data;
          return {
            source: data['来源'] || '',
            model: data['模型'] || '',
            analysisId: data['分析ID'] || '',
            stockCode: data['股票代码'] || stockCode,
            stockName: data['股票简称'] || '',
            analysisTime: data['分析时间'] || '',
            conclusion: data['结论'] || '未知',
            coreLogic: data['核心逻辑'] || '',
            riskWarning: data['风险提示'] || '',
            inputSummary: data['输入摘要'] || null
          };
        }
        throw new Error(response?.message || '获取AI评估失败');
      } catch (error) {
        console.error('获取股票AI评估失败:', error);
        const serverMessage = error?.response?.data?.message;
        const message = serverMessage || error?.message || '获取AI评估结果时发生错误，请稍后再试。';
        throw new Error(message);
      }
    },

    async fetchStockEvaluationHistory(_, payload = {}) {
      const stockCode = typeof payload === 'string' ? payload : payload?.stockCode;
      const page = typeof payload === 'object' ? Number(payload.page) || 1 : 1;
      const pageSize = typeof payload === 'object' ? Number(payload.pageSize) || 20 : 20;
      if (!stockCode) return null;

      try {
        const response = await stockApi.getStockAnalysisHistory(stockCode, { page, pageSize });
        if (response.code !== 200 || !response.data) {
          throw new Error(response?.message || '获取历史评价失败');
        }

        const data = response.data;
        const historyList = Array.isArray(data['历史评价']) ? data['历史评价'] : [];

        return {
          source: data['来源'] || '',
          stockCode: data['股票代码'] || stockCode,
          stockName: data['股票简称'] || '',
          page: Number(data['当前页']) || page,
          pageSize: Number(data['每页数量']) || pageSize,
          total: Number(data['总数量']) || historyList.length,
          totalPages: Number(data['总页数']) || 1,
          history: historyList.map(item => ({
            stockCode: item['股票代码'] || stockCode,
            stockName: item['股票简称'] || '',
            analysisTime: item['分析时间'] || '',
            conclusion: item['结论'] || '未知',
            coreLogic: item['核心逻辑'] || '',
            riskWarning: item['风险提示'] || ''
          }))
        };
      } catch (error) {
        const status = error?.response?.status;
        if (status === 404) {
          return {
            source: 'D1 历史分析',
            stockCode,
            stockName: '',
            page,
            pageSize,
            total: 0,
            totalPages: 1,
            history: []
          };
        }
        console.error('获取股票历史AI评估失败:', error);
        const serverMessage = error?.response?.data?.message;
        const message = serverMessage || error?.message || '获取历史评价失败，请稍后再试。';
        throw new Error(message);
      }
    },

    async fetchCapitalFlow(_, stockCode) {
      if (!stockCode) return null;
      try {
        const response = await stockApi.getCapitalFlow(stockCode);
        if (response.code === 200 && response.data) {
          return response.data;
        }
        return null;
      } catch (error) {
        console.error('获取资金流向失败:', error);
        return null;
      }
    },

    async fetchMarketOverview({ commit }) {
      try {
        // 并行请求国内和全球指数行情
        const [cnResponse, gbResponse] = await Promise.allSettled([
          stockApi.getCnIndexQuotes('000001,399001,399006'),
          stockApi.getGbIndexQuotes('HSI,HSTECH,HXC')
        ]);

        const marketData = {};

        const processQuotes = (response) => {
          if (response.status === 'fulfilled' && response.value?.code === 200) {
            const quotes = response.value.data?.行情 || [];
            quotes.forEach(item => {
              marketData[item.指数代码] = {
                value: item.最新价,
                change: item.涨跌幅,
                changeAmount: item.涨跌额,
                name: item.指数简称,
                indexCode: item.指数代码
              };
            });
          }
        };

        processQuotes(cnResponse);
        processQuotes(gbResponse);

        commit('setMarketOverview', marketData);
        return marketData;
      } catch (error) {
        console.error('获取市场概览数据失败:', error);
        return null;
      }
    },
    async fetchWechatMessage(_, msgId) {
      if (!msgId || typeof msgId !== 'string' || msgId.trim() === '') {
        console.error('[ERROR] fetchWechatMessage: 无效的消息ID');
        return {};
      }
      
      try {
        console.log(`[DEBUG] Store action - 获取微信推送消息: msgId=${msgId}`);
        const response = await stockApi.getWechatMessage(msgId);
        console.log('[DEBUG] 微信推送消息响应:', response);
        
        if (response) {
          if (response.stock_id && response.stock_name) {
            return response;
          }
          if (response.code === 0 && response.data) {
            return response.data;
          }
          if (response.top_news || response.hk_us_news || response.good_news || response.bad_news) {
            return response;
          }
          console.warn('[WARN] 未知的微信推送消息格式，返回空数据:', response);
          return { date: '', top_news: [], hk_us_news: [] };
        } else {
          return { date: '', top_news: [], hk_us_news: [] };
        }
      } catch (error) {
        console.error('[ERROR] 获取微信推送消息异常:', error);
        return { date: '', top_news: [], hk_us_news: [] };
      }
    },
    async fetchUpdateLogs(_, params = {}) {
      try {
        console.log('[DEBUG] 发起获取更新日志请求:', params);
        const response = await stockApi.getUpdateLogs(params);
        console.log('[DEBUG] 获取更新日志响应:', response);
        
        if (response.code === 0 && response.data) {
          return {
            logs: response.data.logs || [],
            pagination: response.data.pagination || {}
          };
        }
        return null;
      } catch (error) {
        console.error('获取更新日志失败:', error);
        throw error;
      }
    },
    async fetchUpdateTypes(_) {
      try {
        console.log('[DEBUG] 发起获取更新类型请求');
        const response = await stockApi.getUpdateTypes();
        console.log('[DEBUG] 获取更新类型响应:', response);
        
        if (response.code === 0 && response.data) {
          return response.data.types || [];
        }
        return [];
      } catch (error) {
        console.error('获取更新类型失败:', error);
        return [];
      }
    },
    async fetchGithubCommits(_, params = {}) {
      const owner = String(params.owner || '').trim();
      const repo = String(params.repo || '').trim();
      const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
      const perPage = Math.min(100, Math.max(1, Number.parseInt(params.per_page, 10) || 10));

      if (!owner || !repo) {
        throw new Error('GitHub 仓库参数缺失');
      }

      try {
        console.log('[DEBUG] 发起获取 GitHub 提交记录请求:', { owner, repo, page, per_page: perPage });
        const response = await stockApi.getGithubRepoCommits({
          owner,
          repo,
          page,
          per_page: perPage
        });
        console.log('[DEBUG] 获取 GitHub 提交记录响应:', response);

        if (response?.code !== 200 || !response?.data) {
          throw new Error(response?.message || '获取 GitHub 提交记录失败');
        }

        const commits = Array.isArray(response.data.commits) ? response.data.commits : [];
        const logs = commits.map((item) => {
          const fullMessage = String(item?.commit?.message || '').trim();
          const [titleLine, ...restLines] = fullMessage.split('\n');
          const body = restLines.join('\n').trim();
          const sha = String(item?.sha || '').trim();

          return {
            id: sha || `${item?.html_url || ''}-${item?.commit?.author?.date || ''}`,
            created_at: formatDateTime(item?.commit?.author?.date),
            update_type: 'github',
            title: titleLine || '(无提交说明)',
            body,
            author: item?.commit?.author?.name || item?.author?.login || 'unknown',
            sha,
            short_sha: sha ? sha.slice(0, 7) : '',
            html_url: item?.html_url || ''
          };
        });

        const hasNext = !!response.data.pagination?.has_next;
        const hasPrev = !!response.data.pagination?.has_prev;
        const lastPage = Number.parseInt(response.data.pagination?.last_page, 10);
        const knownTotal = Number.isFinite(lastPage) ? lastPage * perPage : null;
        const fallbackTotal = hasNext
          ? page * perPage + 1
          : (page - 1) * perPage + logs.length;
        const total = knownTotal || fallbackTotal;

        return {
          logs,
          pagination: {
            total,
            pages: Math.max(1, Math.ceil(total / perPage)),
            has_prev: hasPrev,
            has_next: hasNext
          }
        };
      } catch (error) {
        console.error('获取 GitHub 提交记录失败:', error);
        throw error;
      }
    },
    // 添加获取推送设置的action
    async fetchPushSettings(_, userId) {
      try {
        console.log('[DEBUG] 发起获取推送设置请求:', userId);
        const response = await stockApi.getUserPushSettings(userId);
        console.log('[DEBUG] 获取推送设置响应:', response);

        if (response?.code === 200) {
          // 新版接口: data.settings 为数组；空/缺失表示全部关闭
          const settingsList = Array.isArray(response?.data?.settings)
            ? response.data.settings
            : [];

          const isEnabled = (type) =>
            settingsList.some(item => item?.setting_type === type && item?.enabled === true);

          return {
            settings: {
              stock_push: isEnabled('stock_push'),
              morning_report: isEnabled('daily_news_push'),
              push_tag_short_term: settingsList.length === 0 ? true : isEnabled('push_tag_short_term'),
              push_tag_mid_term: settingsList.length === 0 ? true : isEnabled('push_tag_mid_term'),
              push_tag_long_term: settingsList.length === 0 ? true : isEnabled('push_tag_long_term')
            }
          };
        }
        return { settings: {} };
      } catch (error) {
        console.error('获取推送设置失败:', error);
        return { settings: {} };
      }
    },
    
    // 添加更新推送设置的action
    async updatePushSettings(_, { type, enabled }) {
      try {
        const settingTypeMap = {
          stock_push: 'stock_push',
          morning_report: 'daily_news_push',
          push_tag_short_term: 'push_tag_short_term',
          push_tag_mid_term: 'push_tag_mid_term',
          push_tag_long_term: 'push_tag_long_term'
        };
        const targetSettingType = settingTypeMap[type];
        if (!targetSettingType) {
          return false;
        }

        console.log('[DEBUG] 发起更新推送设置请求:', targetSettingType, enabled);
        const response = await stockApi.updateUserPushSettings(targetSettingType, enabled);
        console.log('[DEBUG] 更新推送设置响应:', response);

        return response?.code === 200;
      } catch (error) {
        console.error('更新推送设置失败:', error);
        return false;
      }
    },
    async logout({ commit }) {
      try {
        await authApi.logout();
      } catch (err) {
        console.warn('[Store] 退出登录调用失败，忽略继续清理本地状态:', err);
      }
      commit('logout');
    }
  }
})
