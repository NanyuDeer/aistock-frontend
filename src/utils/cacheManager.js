// 版本管理和缓存清理工具
class CacheManager {
  constructor() {
    this.VERSION_KEY = 'app_version';
    this.CURRENT_VERSION = process.env.VUE_APP_VERSION || Date.now().toString();
    this.STOCK_PRICES_KEY = 'stock_prices_cache';
    this.HOT_STOCKS_KEY = 'hot_stocks_cache';
    this.STOCK_PRICES_TIMESTAMP_KEY = 'stock_prices_timestamp';
  }

  // 检查是否需要清理缓存
  checkAndClearCache() {
    const storedVersion = localStorage.getItem(this.VERSION_KEY);
    
    if (storedVersion !== this.CURRENT_VERSION) {
      this.clearCache();
      localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
      console.log(`应用版本已更新: ${storedVersion} -> ${this.CURRENT_VERSION}`);
      return true;
    }
    return false;
  }

  // ==================== 股票价格缓存管理 ====================
  
  /**
   * 保存股票价格到缓存
   * @param {Array} stocks - 股票列表，格式: [{code, name, market, latest_price, change_percent, ...}]
   */
  saveStockPrices(stocks) {
    try {
      const cache = this.getStockPricesCache();
      const timestamp = Date.now();
      
      stocks.forEach(stock => {
        if (stock.code) {
          cache[stock.code] = {
            code: stock.code,
            name: stock.name,
            market: stock.market,
            latest_price: stock.latest_price,
            change_percent: stock.change_percent,
            industry: stock.industry,
            timestamp: timestamp
          };
        }
      });
      
      localStorage.setItem(this.STOCK_PRICES_KEY, JSON.stringify(cache));
      localStorage.setItem(this.STOCK_PRICES_TIMESTAMP_KEY, timestamp.toString());
      console.log(`[CacheManager] 已保存 ${stocks.length} 支股票价格到缓存`);
    } catch (error) {
      console.error('[CacheManager] 保存股票价格失败:', error);
    }
  }

  /**
   * 从缓存获取股票价格
   * @param {String} code - 股票代码
   * @returns {Object|null} 股票价格数据
   */
  getStockPrice(code) {
    try {
      const cache = this.getStockPricesCache();
      return cache[code] || null;
    } catch (error) {
      console.error('[CacheManager] 获取股票价格失败:', error);
      return null;
    }
  }

  /**
   * 批量获取股票价格
   * @param {Array} codes - 股票代码数组
   * @returns {Object} {found: [...], missing: [...]}
   */
  getBatchStockPrices(codes) {
    try {
      const cache = this.getStockPricesCache();
      const found = [];
      const missing = [];
      
      codes.forEach(code => {
        const stockData = cache[code];
        if (stockData) {
          found.push(stockData);
        } else {
          missing.push(code);
        }
      });
      
      console.log(`[CacheManager] 批量获取价格: 找到 ${found.length}/${codes.length}, 缺失 ${missing.length}`);
      return { found, missing };
    } catch (error) {
      console.error('[CacheManager] 批量获取股票价格失败:', error);
      return { found: [], missing: codes };
    }
  }

  /**
   * 获取完整的股票价格缓存
   * @returns {Object} 股票价格缓存对象
   */
  getStockPricesCache() {
    try {
      const cacheStr = localStorage.getItem(this.STOCK_PRICES_KEY);
      return cacheStr ? JSON.parse(cacheStr) : {};
    } catch (error) {
      console.error('[CacheManager] 读取股票价格缓存失败:', error);
      return {};
    }
  }

  /**
   * 保存热门股票列表
   * @param {Array} stocks - 热门股票列表
   */
  saveHotStocks(stocks) {
    try {
      const data = {
        stocks: stocks,
        timestamp: Date.now()
      };
      localStorage.setItem(this.HOT_STOCKS_KEY, JSON.stringify(data));
      console.log(`[CacheManager] 已保存热门股票列表 (${stocks.length}支)`);
    } catch (error) {
      console.error('[CacheManager] 保存热门股票失败:', error);
    }
  }

  /**
   * 获取热门股票列表
   * @returns {Array} 热门股票列表
   */
  getHotStocks() {
    try {
      const dataStr = localStorage.getItem(this.HOT_STOCKS_KEY);
      if (!dataStr) return null;
      
      const data = JSON.parse(dataStr);
      return data.stocks || [];
    } catch (error) {
      console.error('[CacheManager] 获取热门股票失败:', error);
      return null;
    }
  }

  /**
   * 清除股票价格缓存
   */
  clearStockPricesCache() {
    try {
      localStorage.removeItem(this.STOCK_PRICES_KEY);
      localStorage.removeItem(this.HOT_STOCKS_KEY);
      localStorage.removeItem(this.STOCK_PRICES_TIMESTAMP_KEY);
      console.log('[CacheManager] 已清除股票价格缓存');
    } catch (error) {
      console.error('[CacheManager] 清除股票价格缓存失败:', error);
    }
  }

  // 清理各种缓存
  async clearCache() {
    try {
      // 清理 localStorage 中的旧数据（保留用户信息、自选股和股票价格缓存）
      const preserveKeys = [
        'user', 
        'favoriteStocks', 
        'stock_prices_cache', 
        'hot_stocks_cache',
        'stock_prices_timestamp'
      ];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!preserveKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // 清理 sessionStorage
      sessionStorage.clear();

      // 清理浏览器缓存 (需要用户交互)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      console.log('缓存清理完成');
    } catch (error) {
      console.error('缓存清理失败:', error);
    }
  }

  // 完全清理缓存（退出登录时使用）
  async clearAllCache() {
    try {
      // 清理所有 localStorage
      localStorage.clear();

      // 清理 sessionStorage
      sessionStorage.clear();

      // 清理浏览器缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      console.log('所有缓存已清理');
    } catch (error) {
      console.error('缓存清理失败:', error);
    }
  }

  // 强制重新加载页面（如果需要）
  forceReload() {
    if (this.checkAndClearCache()) {
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    }
  }
}

export default new CacheManager();
