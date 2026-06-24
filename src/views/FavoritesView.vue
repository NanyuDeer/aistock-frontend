<template>
  <div class="favorites-page">
    <div class="page-container">
      <div class="favorites-header">
        <h1>自选股</h1>
        <div class="favorites-actions">
          <el-button 
            type="primary" 
            @click="refreshCurrentTab" 
            :loading="refreshing"
            class="refresh-button">
            <img v-if="!refreshing" src="@/assets/refresh.svg" alt="刷新" class="button-icon" />
            刷新数据
          </el-button>
          <el-button 
            type="success" 
            @click="goToSearch" 
            class="add-button">
            <img src="@/assets/add.svg" alt="添加" class="button-icon" />
            添加股票
          </el-button>
        </div>
      </div>

      <!-- Tab 切换：行情 / 资讯 -->
      <div class="favorites-tabs">
        <button
          :class="['tab-btn', { 'is-active': activeTab === 'quotes' }]"
          @click="activeTab = 'quotes'"
        >行情</button>
        <button
          :class="['tab-btn', { 'is-active': activeTab === 'news' }]"
          @click="activeTab = 'news'"
        >资讯</button>
      </div>
      
      <!-- 行情 Tab -->
      <div v-show="activeTab === 'quotes'" v-loading="loading" class="favorites-content">
        <!-- 表格显示模式 -->
        <el-table 
          v-if="favoriteStocks.length > 0" 
          :data="favoriteStocks" 
          border 
          stripe 
          class="stock-table"
          style="table-layout: auto; width: 100%;">
          <el-table-column prop="code" label="代码" min-width="120" align="center">
            <template #default="scope">
              <span class="market-code">{{ scope.row.market }}</span>
              <span>{{ scope.row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="名称" min-width="100" align="center" />
          <el-table-column label="最新价" align="center" min-width="100">
            <template #default="scope">
              <span class="price-value">{{ formatPrice(scope.row.price) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="涨跌幅" align="center" min-width="100">
            <template #default="scope">
              <span :class="scope.row.change >= 0 ? 'stock-up change-value' : 'stock-down change-value'">
                {{ scope.row.change >= 0 ? '+' : '' }}{{ formatPercent(scope.row.change) }}%
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="industry" label="所属行业" min-width="140" align="center" />
          <el-table-column label="操作" fixed="right" width="320" align="center">
            <template #default="scope">
              <div class="action-buttons">
                <el-button 
                  type="primary" 
                  size="small" 
                  @click="viewStockDetail(scope.row)">
                  <img src="@/assets/search.svg" alt="详情" class="button-icon" />
                  详情
                </el-button>
                <el-popconfirm
                  title="确定取消关注该股票吗？"
                  @confirm="removeFromFavorite(scope.row)"
                >
                  <template #reference>
                    <el-button 
                      type="danger" 
                      size="small">
                      <img src="@/assets/unfollow.svg" alt="取消关注" class="button-icon" />
                      取消关注
                    </el-button>
                  </template>
                </el-popconfirm>
                <CycleSelect
                  :model-value="getCycle(scope.row.code)"
                  @update:model-value="(val) => setCycle(scope.row.code, val)"
                />
              </div>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 卡片显示模式 (适用于移动设备) -->
        <div v-if="favoriteStocks.length > 0" class="stock-cards">
          <div 
            v-for="stock in favoriteStocks" 
            :key="stock.code" 
            class="stock-card">
            <div class="card-header">
              <div class="stock-name-code">
                <h3>{{ stock.name }}</h3>
                <span class="stock-code">{{ stock.code }}</span>
              </div>
              <div class="stock-price-change">
                <div class="price">{{ formatPrice(stock.price) }}</div>
                <div :class="stock.change >= 0 ? 'change-up' : 'change-down'">
                  {{ stock.change >= 0 ? '+' : '' }}{{ formatPercent(stock.change) }}%
                </div>
              </div>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">行业</span>
                <span class="value">{{ stock.industry || '未知' }}</span>
              </div>
            </div>
            <div class="card-footer">
              <el-button 
                type="primary" 
                size="small" 
                @click="viewStockDetail(stock)">
                <img src="@/assets/view.svg" alt="详情" class="button-icon" />
                详情
              </el-button>
              <CycleSelect
                :model-value="getCycle(stock.code)"
                @update:model-value="(val) => setCycle(stock.code, val)"
              />
              <el-popconfirm
                title="确定取消关注该股票吗？"
                @confirm="removeFromFavorite(stock)"
              >
                <template #reference>
                  <el-button 
                    type="danger" 
                    size="small">
                    <img src="@/assets/unfollow.svg" alt="取消关注" class="button-icon" />
                    取消关注
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty 
          v-if="favoriteStocks.length === 0 && !loading" 
          description="您还没有添加自选股" 
          class="empty-state">
          <el-button type="primary" @click="goToSearch">去添加</el-button>
        </el-empty>
      </div>

      <!-- 资讯 Tab -->
      <div v-show="activeTab === 'news'" v-loading="newsLoading" class="favorites-content">
        <!-- 周期筛选 -->
        <div class="news-filter">
          <button
            v-for="opt in CYCLE_OPTIONS"
            :key="opt.key"
            :class="['cycle-btn', { 'is-active': newsCycle === opt.key }]"
            @click="newsCycle = opt.key"
          >{{ opt.label }}</button>
        </div>

        <!-- 资讯列表 -->
        <div v-if="filteredNewsEvents.length > 0" class="news-list">
          <div
            v-for="event in filteredNewsEvents"
            :key="event.event_id"
            class="news-item"
            @click="viewStockDetail({ code: event.stock_code })"
          >
            <div class="news-item-header">
              <div class="news-stock-info">
                <span class="news-stock-name">{{ event.stock_name }}</span>
                <span class="news-stock-code">{{ event.stock_code }}</span>
              </div>
              <div class="news-item-tags">
                <span class="news-info-type" :style="{ color: getInfoTypeColor(event.change_type), borderColor: getInfoTypeColor(event.change_type) + '60' }">
                  {{ getInfoTypeLabel(event.change_type) }}
                </span>
                <span class="news-impact-tag" :style="{ color: getImpactColor(event.level) }">
                  {{ event.level }}
                </span>
                <span class="news-horizon-tag">{{ event.ai_horizon }}</span>
              </div>
            </div>
            <div class="news-item-title">{{ event.title }}</div>
            <!-- 关键词标签 -->
            <div v-if="event.ai_keywords && event.ai_keywords.length > 0" class="news-keywords">
              <span
                v-for="kw in filterDecisiveKeywords(event.ai_keywords)"
                :key="kw"
                class="keyword-tag"
                :style="{ backgroundColor: getKeywordColor(kw) + '15', color: getKeywordColor(kw), borderColor: getKeywordColor(kw) + '40' }"
              >{{ kw }}</span>
            </div>
            <div class="news-item-footer">
              <span class="news-source">{{ event.source }}</span>
              <span class="news-time">{{ formatEventTime(event.event_time) }}</span>
            </div>
          </div>
        </div>

        <el-empty
          v-if="filteredNewsEvents.length === 0 && !newsLoading"
          description="暂无自选股资讯"
          class="empty-state"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import CycleSelect from '@/components/CycleSelect.vue';
import { useStockCycle } from '@/utils/stockCycle';
import { useScrollReset } from '@/utils/scrollUtils';
import { trendHotspotApi } from '@/services/api';
import {
  CYCLE_OPTIONS,
  filterEventsByCycle,
  getInfoTypeColor,
  getInfoTypeLabel,
  getImpactColor,
  getKeywordColor,
  filterDecisiveKeywords,
} from '@/utils/trendHotspotConstants';

export default {
  name: 'FavoritesView',
  components: { CycleSelect },
  setup() {
    const store = useStore();
    const router = useRouter();
    const { getCycle, setCycle } = useStockCycle();
    
    const loading = ref(true);
    const refreshing = ref(false);
    const favoriteStocks = ref([]);
    const refreshTimer = ref(null);

    // Tab 切换
    const activeTab = ref('quotes');

    // 资讯相关
    const newsLoading = ref(false);
    const newsEvents = ref([]);
    const newsCycle = ref('all');

    const filteredNewsEvents = computed(() => {
      return filterEventsByCycle(newsEvents.value, newsCycle.value);
    });

    // 获取自选股资讯
    const fetchFavoritesNews = async () => {
      try {
        newsLoading.value = true;
        const res = await trendHotspotApi.getFavoritesNews({ cycle: 'all', limit: 50 });
        if (res?.code === 200 && res?.data) {
          newsEvents.value = (res.data.events || []).map(e => ({
            ...e,
            event_time_display: formatEventTime(e.event_time),
          }));
        }
      } catch (error) {
        console.error('获取自选股资讯失败:', error);
      } finally {
        newsLoading.value = false;
      }
    };

    // 格式化事件时间
    const formatEventTime = (time) => {
      if (!time) return '--';
      const d = new Date(time);
      if (isNaN(d.getTime())) return '--';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      if (isToday) return `${hh}:${mm}`;
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${MM}-${dd} ${hh}:${mm}`;
    };

    // 切换到资讯tab时自动加载
    watch(activeTab, (val) => {
      if (val === 'news' && newsEvents.value.length === 0) {
        fetchFavoritesNews();
      }
    });

    // 获取自选股数据。默认复用短时缓存，手动/定时刷新时强制拉取最新价格。
    const fetchFavoriteStocks = async ({ forceRefresh = false } = {}) => {
      try {
        loading.value = true;
        
        // 获取自选股列表
        const stocks = store.getters.favoriteStocks || [];
        
        if (stocks.length === 0) {
          favoriteStocks.value = [];
          return;
        }
        
        const stocksWithPrices = await store.dispatch('fetchBatchStockPrices', {
          stocks,
          forceRefresh
        });
        
        // 格式化数据以匹配表格显示
        favoriteStocks.value = stocksWithPrices.map(stock => ({
          ...stock,
          price: stock.latest_price || stock.price || 0,
          change: stock.change_percent || stock.change || 0,
          marketCap: 0,
          industry: stock.industry || '未知行业'
        }));
      } catch (error) {
        console.error('获取自选股失败:', error);
        ElMessage.error('获取自选股数据失败');
      } finally {
        loading.value = false;
      }
    };
    
    // 手动刷新当前tab
    const refreshCurrentTab = async () => {
      if (refreshing.value) return;
      try {
        refreshing.value = true;
        if (activeTab.value === 'quotes') {
          await fetchFavoriteStocks({ forceRefresh: true });
        } else {
          await fetchFavoritesNews();
        }
        ElMessage.success('数据刷新成功');
      } catch (error) {
        console.error('刷新数据失败:', error);
        ElMessage.error('刷新数据失败');
      } finally {
        refreshing.value = false;
      }
    };
    
    // 移除自选股
    const removeFromFavorite = async (stock) => {
      try {
        loading.value = true;
        const result = await store.dispatch('removeFavoriteStocks', [stock.code]);
        if (result) {
          await fetchFavoriteStocks({ forceRefresh: true });
          ElMessage.success(`已将 ${stock.name} 从自选股中移除`);
        } else {
          ElMessage.error('移除自选股失败');
        }
      } catch (error) {
        console.error('移除自选股失败:', error);
        ElMessage.error('移除自选股失败');
      } finally {
        loading.value = false;
      }
    };
    
    // 查看股票详情
    const viewStockDetail = (stock) => {
      router.push(`/stock/${stock.code}`);
    };
    
    // 跳转到搜索页
    const goToSearch = () => {
      router.push('/search');
    };
    
    // 格式化价格
    const formatPrice = (price) => {
      if (price === undefined || price === null) return '--';
      return Number(price).toFixed(2);
    };
    
    // 格式化百分比
    const formatPercent = (percent) => {
      if (percent === undefined || percent === null) return '--';
      return Number(percent).toFixed(2);
    };
    
    onMounted(async () => {
      // 重置滚动位置到顶部
      useScrollReset();
      
      if (!store.getters.isLoggedIn) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }
      
      await fetchFavoriteStocks();
      
      // 设置自动刷新定时器 (每3分钟刷新一次价格)
      refreshTimer.value = setInterval(() => {
        console.log('[FavoritesView] 定时刷新自选股价格');
        fetchFavoriteStocks({ forceRefresh: true });
      }, 3 * 60 * 1000);
    });
    
    onBeforeUnmount(() => {
      // 清除定时器
      if (refreshTimer.value) {
        clearInterval(refreshTimer.value);
      }
    });
    
    return {
      activeTab,
      loading,
      refreshing,
      favoriteStocks,
      refreshCurrentTab,
      removeFromFavorite,
      viewStockDetail,
      goToSearch,
      formatPrice,
      formatPercent,
      getCycle,
      setCycle,
      // 资讯相关
      newsLoading,
      newsEvents,
      newsCycle,
      filteredNewsEvents,
      formatEventTime,
      // 常量和方法
      CYCLE_OPTIONS,
      getInfoTypeColor,
      getInfoTypeLabel,
      getImpactColor,
      getKeywordColor,
      filterDecisiveKeywords,
    };
  }
};
</script>

<style lang="scss" scoped>
.favorites-page {
  padding-top: 80px;
  
  .favorites-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h1 {
      font-size: 1.75rem;
      color: var(--text-primary);
    }
    
    .favorites-actions {
      display: flex;
      gap: 10px;
      
      .button-icon {
        width: 16px;
        height: 16px;
        margin-right: 5px;
        vertical-align: middle;
      }
    }
  }

  // Tab 切换
  .favorites-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 20px;
    border-bottom: 2px solid #e5e7eb;

    .tab-btn {
      padding: 10px 28px;
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: var(--primary-color);
      }

      &.is-active {
        color: var(--primary-color);
        border-bottom-color: var(--primary-color);
      }
    }
  }
  
  .favorites-content {
    margin-bottom: 20px;
    min-height: 200px;
    
    .stock-table {
      table-layout: auto;
      width: 100%;
      margin-bottom: 20px;
      display: block;
      
      @media (max-width: 992px) {
        display: none;
      }
    }
    
    .stock-cards {
      display: none;
      
      @media (max-width: 992px) {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        gap: 15px;
      }
      
      .stock-card {
        background: #fff;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          
          .stock-name-code {
            h3 {
              margin: 0;
              font-size: 1.1rem;
            }
            
            .stock-code {
              font-size: 0.9rem;
              color: var(--text-secondary);
            }
          }
          
          .stock-price-change {
            text-align: right;
            
            .price {
              font-size: 1.1rem;
              font-weight: bold;
            }
            
            .change-up {
              color: var(--danger-color);
            }
            
            .change-down {
              color: var(--success-color);
            }
          }
        }
        
        .card-body {
          margin-bottom: 15px;
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            
            .label {
              color: var(--text-secondary);
            }
            
            .value {
              font-weight: 500;
            }
          }
        }
        
        .card-footer {
          display: flex;
          justify-content: space-between;
        }
      }
    }
    
    .empty-state {
      padding: 40px 0;
    }
  }

  // 资讯筛选
  .news-filter {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;

    .cycle-btn {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background: #fff;
      color: var(--text-secondary);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      &.is-active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: #fff;
      }
    }
  }

  // 资讯列表
  .news-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .news-item {
    padding: 14px 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: box-shadow 0.2s, transform 0.15s;

    &:hover {
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .news-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;

      .news-stock-info {
        display: flex;
        align-items: center;
        gap: 6px;

        .news-stock-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .news-stock-code {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
      }

      .news-item-tags {
        display: flex;
        align-items: center;
        gap: 6px;

        .news-info-type {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
          font-weight: 500;
          border: 1px solid;
          white-space: nowrap;
        }

        .news-impact-tag {
          font-size: 0.72rem;
          font-weight: 600;
        }

        .news-horizon-tag {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          padding: 1px 6px;
          border: 1px solid #cbd5e1;
          border-radius: 3px;
        }
      }
    }

    .news-item-title {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    // 关键词标签
    .news-keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;

      .keyword-tag {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 12px;
        font-size: 0.76rem;
        font-weight: 600;
        border: 1px solid;
        white-space: nowrap;
      }
    }

    .news-item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .news-source {
        font-size: 0.75rem;
        color: var(--text-tertiary);
      }

      .news-time {
        font-size: 0.75rem;
        color: var(--text-tertiary);
      }
    }
  }
}

.el-table {
  width: 100%;
}

.stock-up {
  color: var(--danger-color);
}

.stock-down {
  color: var(--success-color);
}

.button-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  vertical-align: middle;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  position: relative;
  z-index: 1;
  overflow: visible;
  padding: 8px;
}

.action-buttons .el-button:last-child {
  margin-left: auto;
}

.market-code {
  display: inline-block;
  padding: 2px 6px;
  margin-right: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  color: #1677ff;
  background-color: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 12px;
}

.price-value {
  font-size: 1.1rem;
  font-weight: bold;
}

.change-value {
  font-size: 1.1rem;
  font-weight: bold;
}
</style>
