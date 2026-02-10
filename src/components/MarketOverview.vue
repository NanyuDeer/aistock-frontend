<template>
  <div class="market-overview">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="1" animated />
    </div>
    <div v-else class="market-cards">
      <div class="market-card" v-for="(data, index) in marketData" :key="index">
        <div class="index-name">
          <a :href="getIndexUrl(index)" target="_blank" class="index-link">
            {{ getIndexDisplayName(index) }}
          </a>
        </div>
        <div class="index-value" :class="data.change >= 0 ? 'change-up' : 'change-down'">{{ formatValue(data.value) }}</div>
        <div class="change-row" :class="data.change >= 0 ? 'change-up' : 'change-down'">
          <span>{{ formatChangeAmount(data.changeAmount) }}</span>
          <span>{{ formatChange(data.change) }}</span>
        </div>
        <span class="index-code">{{ data.indexCode }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'; // ✅ 加入 onBeforeUnmount
import { useStore } from 'vuex';

export default {
  name: 'MarketOverview',
  setup() {
    const store = useStore();
    const marketData = ref({});
    const loading = ref(true);
    let timer = null; // ✅ 声明定时器变量

    const fetchMarketData = async () => {
      try {
        loading.value = true;
        const data = await store.dispatch('fetchMarketOverview');
        if (data) {
          marketData.value = data;
        }
      } catch (error) {
        console.error('获取市场概览失败:', error);
      } finally {
        loading.value = false;
      }
    };

    const getIndexDisplayName = (code) => {
      return marketData.value[code]?.name || code;
    };

    const getIndexUrl = (code) => {
      const indexCode = marketData.value[code]?.indexCode;
      if (!indexCode) return '#';
      // 国内指数为纯数字代码，全球指数为字母代码
      if (/^\d+$/.test(indexCode)) {
        return `https://quote.eastmoney.com/zs${indexCode}.html`;
      }
      return `https://quote.eastmoney.com/gb/zs${indexCode}.html`;
    };

    const formatValue = (value) => {
      return Number(value).toFixed(2);
    };

    const formatChange = (change) => {
      const sign = change >= 0 ? '+' : '';
      return `${sign}${Number(change).toFixed(2)}%`;
    };

    const formatChangeAmount = (amount) => {
      const num = Number(amount);
      if (isNaN(num)) return '--';
      const sign = num >= 0 ? '+' : '';
      return `${sign}${num.toFixed(2)}`;
    };

    onMounted(() => {
      fetchMarketData();

      // ✅ 每 60 秒刷新一次
      timer = setInterval(() => {
        console.log('刷新市场数据...');
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
      getIndexDisplayName,
      getIndexUrl,
      formatValue,
      formatChange,
      formatChangeAmount
    };
  }
};
</script>


<style lang="scss" scoped>
.market-overview {
  .loading-container {
    margin: 10px 0;
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
