<template>
  <div class="market-overview">
    <div v-if="loading && !hasMarketData" class="loading-container">
      <el-skeleton :rows="1" animated />
    </div>
    <div v-else-if="displayIndexes.length > 0" class="market-cards">
      <div class="market-card" v-for="data in displayIndexes" :key="data.indexKey">
        <div class="index-name">
          <a :href="getIndexUrl(data)" target="_blank" class="index-link">
            {{ getIndexDisplayName(data) }}
          </a>
        </div>
        <transition name="number-flip" mode="out-in">
          <div
            :key="getMetricDisplayKey(data.indexKey, 'value')"
            class="index-value"
            :class="getChangeTone(data.change)"
          >
            {{ formatValue(data.value) }}
          </div>
        </transition>
        <div class="change-row" :class="getChangeTone(data.change)">
          <transition name="number-flip" mode="out-in">
            <span :key="getMetricDisplayKey(data.indexKey, 'changeAmount')" class="metric-number">
              {{ formatChangeAmount(data.changeAmount) }}
            </span>
          </transition>
          <transition name="number-flip" mode="out-in">
            <span :key="getMetricDisplayKey(data.indexKey, 'change')" class="metric-number">
              {{ formatChange(data.change) }}
            </span>
          </transition>
        </div>
        <span class="index-code">{{ data.indexCode }}</span>
      </div>
    </div>
    <div v-else class="empty-container">
      <el-empty description="暂无市场指数数据" />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';

// 模块级缓存：组件销毁后仍存活
const MKT_CACHE_TTL = 60 * 1000;
let mktCache = { data: null, time: 0 };

export default {
  name: 'MarketOverview',
  setup() {
    const store = useStore();
    const marketData = ref({});
    const loading = ref(true);
    let timer = null;

    const INDEX_ORDER = ['000001', '399001', '399006', 'HSI', 'HSTECH', 'HXC'];
    const hasMarketData = computed(() => Object.keys(marketData.value).length > 0);
    const displayIndexes = computed(() => {
      const ordered = INDEX_ORDER
        .filter(code => marketData.value[code])
        .map(code => ({
          indexKey: code,
          ...marketData.value[code]
        }));

      if (ordered.length > 0) return ordered;

      return Object.entries(marketData.value).map(([code, data]) => ({
        indexKey: code,
        ...(data || {})
      }));
    });

    const fetchMarketData = async ({ showLoading = false } = {}) => {
      const hadData = hasMarketData.value;
      const shouldShowLoading = showLoading && !hadData;
      try {
        if (shouldShowLoading) {
          loading.value = true;
        }

        const data = await store.dispatch('fetchMarketOverview');
        const hasIncomingData = data && typeof data === 'object' && Object.keys(data).length > 0;

        if (hasIncomingData) {
          // 静默刷新：保留已有卡片，只更新变化的字段
          marketData.value = {
            ...marketData.value,
            ...data
          };
          mktCache.data = marketData.value;
          mktCache.time = Date.now();
        } else if (!hadData) {
          marketData.value = {};
        } else {
          console.warn('[MarketOverview] 市场数据刷新为空，保留当前数据');
        }
      } catch (error) {
        console.error('获取市场概览失败:', error);
      } finally {
        if (shouldShowLoading || !hadData) {
          loading.value = false;
        }
      }
    };

    const getIndexDisplayName = (item) => {
      if (!item) return '--';
      return item.name || item.indexCode || item.indexKey || '--';
    };

    const getIndexUrl = (item) => {
      const indexCode = item?.indexCode;
      if (!indexCode) return '#';
      // 国内指数为纯数字代码，全球指数为字母代码
      if (/^\d+$/.test(indexCode)) {
        return `https://quote.eastmoney.com/zs${indexCode}.html`;
      }
      return `https://quote.eastmoney.com/gb/zs${indexCode}.html`;
    };

    const toFiniteNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      const text = String(value).replace(/,/g, '').replace('%', '').trim();
      if (!text || text === '-' || text === '--' || text === '—') return null;
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const formatValue = (value) => {
      const num = toFiniteNumber(value);
      if (num === null) return '--';
      return num.toFixed(2);
    };

    const formatChange = (change) => {
      const num = toFiniteNumber(change);
      if (num === null) return '--';
      const sign = num >= 0 ? '+' : '';
      return `${sign}${num.toFixed(2)}%`;
    };

    const formatChangeAmount = (amount) => {
      const num = toFiniteNumber(amount);
      if (num === null) return '--';
      const sign = num >= 0 ? '+' : '';
      return `${sign}${num.toFixed(2)}`;
    };

    const getChangeTone = (change) => {
      const num = toFiniteNumber(change);
      if (num === null) return '';
      return num >= 0 ? 'change-up' : 'change-down';
    };

    const getMetricDisplayKey = (indexKey, metric) => {
      const item = marketData.value[indexKey] || {};
      if (metric === 'value') {
        return `${indexKey}-value-${formatValue(item.value)}`;
      }
      if (metric === 'changeAmount') {
        return `${indexKey}-changeAmount-${formatChangeAmount(item.changeAmount)}`;
      }
      return `${indexKey}-change-${formatChange(item.change)}`;
    };

    onMounted(() => {
      // 有缓存且未过期，直接恢复，不重新请求
      if (mktCache.data && Date.now() - mktCache.time < MKT_CACHE_TTL) {
        marketData.value = mktCache.data;
        loading.value = false;
      } else {
        fetchMarketData({ showLoading: true });
      }

      // 每 60 秒静默刷新一次
      timer = setInterval(() => {
        fetchMarketData();
      }, 60000);
    });

    onBeforeUnmount(() => {
      if (timer) {
        clearInterval(timer);
      }
    });

    return {
      marketData,
      loading,
      hasMarketData,
      displayIndexes,
      getIndexDisplayName,
      getIndexUrl,
      formatValue,
      formatChange,
      formatChangeAmount,
      getChangeTone,
      getMetricDisplayKey
    };
  }
};
</script>


<style lang="scss" scoped>
.market-overview {
  .loading-container {
    margin: 10px 0;
  }

  .empty-container {
    margin: 10px 0;
  }

  .number-flip-enter-active,
  .number-flip-leave-active {
    transition: transform 0.32s ease, opacity 0.32s ease;
    display: inline-block;
    backface-visibility: hidden;
    transform-style: preserve-3d;
  }

  .number-flip-enter-from {
    opacity: 0;
    transform: translateY(10px) rotateX(-65deg);
  }

  .number-flip-leave-to {
    opacity: 0;
    transform: translateY(-10px) rotateX(65deg);
  }
  
  .market-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    
    .market-card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
      padding: 10px;
      flex: 0 0 calc(33.333% - 10px);
      min-width: 60px;
      text-align: center;
      position: relative;

      .index-code {
        position: absolute;
        right: 4px;
        bottom: 4px;
        font-size: 0.7rem;
        color: var(--text-tertiary, #bbb);
        opacity: 0.6;
        font-weight: 400;
        letter-spacing: 0.5px;
      }

      .index-name {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        
        .index-link {
          color: inherit;
          text-decoration: none;
          
          &:hover {
            text-decoration: underline;
            color: var(--primary-color);
          }
        }
      }
      
      .index-value {
        font-size: 1rem; // 缩小字体
        font-weight: bold;
        margin-bottom: 5px; // 减少间距
      }
      
      .change-row {
        display: flex;
        justify-content: center;
        gap: 6px;
        font-size: 0.9rem;
        font-weight: 500;

        .metric-number {
          display: inline-block;
        }
      }

      .change-up {
        color: var(--danger-color);
      }
      
      .change-down {
        color: var(--success-color);
      }
    }
  }
}

/* 响应式处理 */
@media (max-width: 768px) {
  .market-overview .market-cards .market-card {
    flex: 0 0 calc(50% - 7.5px); /* 中等屏幕显示2个 */
  }
}

@media (max-width: 256px) {
  .market-overview .market-cards .market-card {
    flex: 0 0 100%; /* 小屏幕显示1个，占用所有列宽 */
  }
}
</style>
