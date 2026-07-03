<template>
  <div class="tag-page">
    <div class="page-container">
      <div class="main-content">
        <div class="container">
          <div class="tag-header">
            <h1 class="tag-title">
              <span class="tag-name">#{{ displayTagName }}</span>
              <span v-if="normalizedTagCode" class="tag-code">{{ normalizedTagCode }}</span>
            </h1>
            <p class="tag-description">
              <img src="@/assets/deepseek-color.svg" alt="DeepSeek Logo" />
              <span>{{ pageDescription }}</span>
            </p>
            <p v-if="sourceText" class="tag-source">数据源：{{ sourceText }}</p>
            <div class="powered-by">
              <img src="@/assets/siliconflow-logo.svg" alt="SiliconFlow Logo" class="powered-by-logo" />
              <span class="powered-by-text">Powered by SiliconFlow</span>
            </div>
          </div>

          <!-- 使用StockCardList组件显示股票 -->
          <StockCardList
            :stocks="stocks"
            :loading="loading"
            :emptyText="emptyText"
            @view-detail="viewStockDetail"
            @toggle-favorite="toggleFavorite"
          >
            <!-- 空状态自定义 -->
            <template #empty>
              <el-empty :description="emptyText">
                <router-link to="/">
                  <el-button type="primary">返回首页</el-button>
                </router-link>
              </el-empty>
            </template>
            
            <template #item-content="{ stock }">
              <div class="stock-reason">
                <span v-if="stock.mainFundInflow !== null && stock.mainFundInflow !== undefined">
                  主力净流入：{{ formatFundFlow(stock.mainFundInflow) }}
                </span>
                <span v-else>{{ stock.reason || '暂无主力净流入数据' }}</span>
              </div>
            </template>

            <template #extra-actions="{ stock }">
              <CycleSelect
                v-if="isFavorite(stock.code)"
                :model-value="getCycle(stock.code)"
                @update:model-value="(val) => setCycle(stock.code, val)"
              />
            </template>
          </StockCardList>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import StockCardList from '@/shared/components/StockCardList.vue';
import CycleSelect from '@/shared/components/CycleSelect.vue';
import { useStockCycle } from '@/shared/utils/stockCycle';
import 'element-plus/es/components/message/style/css';

const TAG_CODE_PATTERN = /^BK\d{4}$/i;

export default {
  name: 'TagView',
  components: {
    StockCardList,
    CycleSelect
  },
  setup() {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();
    const { getCycle, setCycle } = useStockCycle();

    const stocks = ref([]);
    const loading = ref(true);
    const error = ref(false);
    const sourceText = ref('');

    const normalizeTagCode = (value) => {
      const text = String(value || '').trim().toUpperCase();
      return TAG_CODE_PATTERN.test(text) ? text : '';
    };

    const toText = (value) => {
      if (Array.isArray(value)) return String(value[0] || '').trim();
      return String(value || '').trim();
    };
    
    const routeTagCode = computed(() => toText(route.params.tagCode));
    const normalizedTagCode = computed(() => normalizeTagCode(routeTagCode.value));
    const queryTagName = computed(() => toText(route.query.name));
    const displayTagName = computed(() => (
      queryTagName.value || normalizedTagCode.value || routeTagCode.value || '板块'
    ));
    const emptyText = computed(() => `暂无${displayTagName.value}相关个股推荐`);
    const pageDescription = computed(() => `${displayTagName.value} 板块龙头个股（按主力净流入降序）`);
    
    const fetchTagStocks = async () => {
      const tagCode = normalizedTagCode.value;
      if (!tagCode) {
        error.value = true;
        stocks.value = [];
        sourceText.value = '';
        loading.value = false;
        document.title = `${displayTagName.value} - 板块龙头 | AI StockLink`;
        return;
      }
      
      loading.value = true;
      error.value = false;
      
      try {
        const result = await store.dispatch('fetchTagStocks', {
          tagCode,
          tagName: queryTagName.value || tagCode,
          count: 10
        });

        if (result) {
          stocks.value = result.stocks || [];
          sourceText.value = result.description || '';
        } else {
          stocks.value = [];
          sourceText.value = '';
          console.error('获取标签股票返回格式不正确', result);
        }
      } catch (err) {
        console.error('获取标签股票失败:', err);
        error.value = true;
        stocks.value = [];
        sourceText.value = '';
        ElMessage.error('获取标签股票失败，请稍后再试');
      } finally {
        loading.value = false;
        document.title = `${displayTagName.value} - 板块龙头 | AI StockLink`;
      }
    };

    watch(
      () => [route.params.tagCode, route.query.name],
      () => {
        window.scrollTo(0, 0);
        fetchTagStocks();
      },
      { immediate: true }
    );

    const formatFundFlow = (value) => {
      const num = Number(value);
      if (!Number.isFinite(num)) return '--';
      const sign = num > 0 ? '+' : '';
      const abs = Math.abs(num);
      if (abs >= 1e8) return `${sign}${(num / 1e8).toFixed(2)}亿元`;
      if (abs >= 1e4) return `${sign}${(num / 1e4).toFixed(2)}万元`;
      return `${sign}${num.toFixed(0)}元`;
    };
    
    const isFavorite = (code) => {
      const favoriteStocks = store.getters.favoriteStocks || [];
      return favoriteStocks.some(stock => stock.code === code);
    };
    
    const toggleFavorite = async (stock, loadingState) => {
      if (!store.getters.isLoggedIn) {
        ElMessage.warning('请先登录后才能添加自选股');
        router.push('/login');
        return;
      }
      
      try {
        if (isFavorite(stock.code)) {
          // 取消关注
          const result = await store.dispatch('removeFavoriteStocks', [stock.code]);
          if (result) {
            ElMessage.success(`已将 ${stock.name} 从自选股中移除`);
          } else {
            ElMessage.error(`移除 ${stock.name} 失败`);
          }
        } else {
          // 添加关注
          const result = await store.dispatch('addFavoriteStocks', [
            { code: stock.code, name: stock.name }
          ]);
          
          if (result) {
            ElMessage.success(`成功添加 ${stock.name} 到自选股`);
          } else {
            ElMessage.error(`添加 ${stock.name} 到自选股失败`);
          }
        }
      } catch (error) {
        console.error('操作自选股失败:', error);
        ElMessage.error('操作失败，请稍后再试');
      } finally {
        if (loadingState) {
          loadingState[stock.code] = false;
        }
      }
    };
    
    const viewStockDetail = (stock) => {
      router.push(`/stock/${stock.code}`);
    };
    
    return {
      displayTagName,
      normalizedTagCode,
      emptyText,
      pageDescription,
      sourceText,
      stocks,
      loading,
      error,
      formatFundFlow,
      isFavorite,
      toggleFavorite,
      viewStockDetail,
      fetchTagStocks,
      getCycle,
      setCycle
    };
  }
};
</script>

<style lang="scss" scoped>
.tag-page {
  .tag-header {
    position: relative;
    margin-bottom: 30px;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    
    .tag-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      
      .tag-name {
        color: var(--primary-color);
        font-size: 2rem;
        font-weight: 700;
      }

      .tag-code {
        font-size: 0.95rem;
        color: #64748b;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 2px 8px;
      }
    }
    
    .tag-description {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-tertiary);
      font-size: 1rem;

      img {
        height: 1.6rem;
        width: auto;
        vertical-align: middle;
      }
    }

    .tag-source {
      margin-top: 8px;
      color: #94a3b8;
      font-size: 0.8rem;
    }
    
    .powered-by {
      position: absolute;
      bottom: 8px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0.4;
      
      .powered-by-logo {
        height: 12px;
        width: auto;
      }
      
      .powered-by-text {
        font-size: 0.8rem;
        color: #999;
        font-weight: 500;
      }
    }
  }
  
  .loading-container,
  .error-container,
  .empty-container {
    padding: 40px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  // 移除之前的reason-metric样式，添加新的stock-reason样式
  .stock-reason {
    padding: 6px 0;
    margin: 10px 0;
    border-top: 1px dashed #ebeef5;
    border-bottom: 1px dashed #ebeef5;
    background-color: rgba(245, 247, 250, 0.5);
    
    span {
      font-size: 0.80rem;
      color: #a7a7a7;
      line-height: 1.4;
      display: block;
      text-align: left;
      padding: 0 2px;
      font-weight: bold;
    }
  }
}
</style>
