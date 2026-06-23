<template>
  <div class="home-page">
    <TheNavbar />
    
    <div class="page-container">
      <div class="main-content">
        <div class="container">
          <!-- 市场资讯 -->
          <div class="market-news-section">
            <h3 class="section-title">市场资讯</h3>
            
            <!-- 头条新闻 -->
            <div class="headline-news-section">
              <NewsSlider 
                title="头条新闻"
                :news="headlineNews"
                :headline-style="true"
                @show-detail="showNewsDetail"
                @tag-click="navigateToTag"
              />
            </div>
            
            <div class="news-columns">
              <div class="news-column">
                <div class="news-card">
                  <NewsSlider 
                    title="国内资讯"
                    :news="domesticNews"
                    @show-detail="showNewsDetail"
                    @tag-click="navigateToTag"
                  />
                </div>
              </div>
              <div class="news-column">
                <div class="news-card">
                  <NewsSlider 
                    title="外围资讯"
                    :news="foreignNews"
                    @show-detail="showNewsDetail"
                    @tag-click="navigateToTag"
                  />
                </div>
              </div>
            </div>
            
            <!-- 自选股资讯 - 修改为单独一行 -->
            <!-- <div v-if="isLoggedIn" class="favorite-news-row">
              <div class="news-card">
                <div v-if="favoriteStockNews.length > 0">
                  <NewsSlider
                    title="个股资讯推送"
                    :news="favoriteStockNews"
                    @show-detail="showNewsDetail"
                    @tag-click="navigateToTag"
                  />
                </div>
                <div v-else class="empty-push-news">
                  <h4 class="news-section-title">个股资讯推送</h4>
                  <div class="empty-content">
                    <p>暂无推送资讯，您可以添加自选股后在"<span class="profile-link" @click="goToProfile">个人信息</span>"中开启推送</p>
                  </div>
                </div>
              </div>
            </div> -->
            
            <!-- 新闻详情弹窗 -->
            <el-dialog
              v-model="newsDetailVisible"
              :title="'新闻详情'"
              width="600px"
              :before-close="closeNewsDetail"
              class="news-detail-dialog"
              :modal-append-to-body="true"
              :close-on-click-modal="true"
              :destroy-on-close="true"
              style="border-radius: 18px; box-shadow: 0 8px 32px rgba(0,0,0,0.18);"
            >
              <div v-if="loadingNewsDetail" class="loading-container">
                <el-skeleton :rows="5" animated />
              </div>
              
              <div v-else-if="newsDetail" class="news-detail-content">
                <!-- 标题 -->
                <h2 class="news-detail-title">{{ newsDetail.title }}</h2>
                
                <!-- 标签 -->
                <div v-if="newsDetail.tag && (newsDetail.tag.positive.length > 0 || newsDetail.tag.negative.length > 0)" class="news-detail-tags">
                  <span v-for="tag in newsDetail.tag.positive" :key="`pos-${tag}`" 
                        class="news-tag positive"
                        @click="navigateToTag(tag)">{{ tag }}</span>
                  <span v-for="tag in newsDetail.tag.negative" :key="`neg-${tag}`" 
                        class="news-tag negative"
                        @click="navigateToTag(tag)">{{ tag }}</span>
                </div>
                
                <!-- 总结 -->
                <div v-if="newsDetail.summary" class="news-detail-summary">
                  <h4>内容摘要</h4>
                  <p>{{ newsDetail.summary }}</p>
                </div>
                
                <!-- 正文内容 -->
                <div class="news-detail-content-body">
                  <h4>正文内容</h4>
                  <div class="news-content" v-html="newsDetail.content"></div>
                </div>
                
                <!-- 底部信息 -->
                <div class="news-detail-footer">
                  <span class="news-detail-time">发布时间：{{ newsDetail.publish_time }}</span>
                  <el-divider direction="vertical" />
                  <a v-if="newsDetail.url" :href="newsDetail.url" target="_blank" class="news-detail-link">
                    查看原文 <span class="external-link-icon">↗</span>
                  </a>
                </div>
              </div>
              
              <div v-else class="error-message">
                <p>加载新闻详情失败，请稍后重试</p>
                <el-button @click="retryLoadNewsDetail" type="primary" size="small">重试</el-button>
              </div>
            </el-dialog>
          </div>

          <!-- 国内市场概览 -->
          <div class="market-overview-section">
            <h3 class="section-title">市场概览</h3>
            <MarketOverview />
          </div>

          <!-- 长线风口龙头 -->
          <WindLeaderPanel
            :sectors="hotSectors"
            :loading="loadingHotSectors"
            :error="hotSectorError"
            :update-time="hotSectorUpdateTime"
            :quote-map="hotSectorQuoteMap"
            @retry="fetchHotSectors(true)"
          />

          <!-- 机构调研推荐热门股 -->
          <div class="hot-burst-section">
            <HotBurstPanel />
          </div>

          <!-- AI产业链知识图谱（已隐藏） -->
          <AiGraph v-if="false" />

          <!-- 近期风口龙头板块（已隐藏，数据已迁移至风口龙头） -->
          <div class="curated-stock-sections" style="display: none;">
            <section class="curated-panel trend-leader-panel">
              <div class="curated-panel-header">
                <h3 class="section-title">近期风口板块及龙头个股</h3>
              </div>
              <div
                class="curated-list trend-leader-list scrollable"
                v-loading="loadingTrendLeaderQuotes"
                element-loading-text="行情加载中..."
              >
                <div class="curated-list-head">
                  <span>股票</span>
                  <span>行情数据</span>
                  <span>龙头依据</span>
                  <span>操作</span>
                </div>
                <div
                  v-for="stock in trendLeaderStocks"
                  :key="stock.code"
                  class="curated-list-row trend-leader-row"
                  @click="viewCuratedStock(stock)"
                >
                  <div class="stock-identity">
                    <div class="stock-title-wrap">
                      <h4>{{ stock.name }}</h4>
                      <span class="industry-tag">{{ stock.track }}</span>
                      <span class="stock-code-line">{{ stock.code }}</span>
                    </div>
                  </div>
                  <div class="stock-metrics">
                    <span class="stock-price">{{ stock.latestPrice }}</span>
                    <span :class="['change-rate', stock.changeRate >= 0 ? 'up' : 'down']">
                      {{ stock.changeText }}
                    </span>
                  </div>
                  <div class="leader-basis-wrap">
                    <el-tooltip
                      :content="stock.leaderBasis"
                      placement="top"
                      effect="light"
                      :show-after="200"
                    >
                      <p class="leader-basis">{{ stock.leaderBasis }}</p>
                    </el-tooltip>
                  </div>
                  <el-button
                    class="curated-follow-btn"
                    size="small"
                    :type="isCuratedFavorite(stock) ? 'info' : 'primary'"
                    :plain="!isCuratedFavorite(stock)"
                    :loading="curatedFavoriteLoading[stock.code]"
                    @click.stop="toggleCuratedFavorite(stock)"
                  >
                    {{ isCuratedFavorite(stock) ? '已关注' : '加关注' }}
                  </el-button>
                </div>
              </div>
            </section>
          </div>
          
          <!-- 我的自选股 + 预测盈利排行榜 -->
          <div class="hot-stocks-row">
            <div class="hot-stocks-section">
              <h3 v-if="!isLoggedIn" class="section-title">我的自选股</h3>
              <div v-if="isLoggedIn">
                <StockCardList
                  title="我的自选股"
                  :stocks="displayedFavoriteStocks"
                  :loading="loadingFavorites"
                  :show-view-more="myFavoriteStocks.length > 6"
                  empty-text="暂无自选股数据"
                  @view-detail="viewStockDetail"
                  @toggle-favorite="handleToggleFavorite"
                  @view-more="goToFavoritesPage"
                >
                  <template #empty>
                    <div class="empty-state">
                      <p>您还没有添加自选股</p>
                      <router-link to="/search">
                        <el-button type="primary" size="small">添加股票</el-button>
                      </router-link>
                    </div>
                  </template>
                  <template #view-more>
                    <router-link to="/favorites">
                      <el-button type="primary" plain>查看全部自选股</el-button>
                    </router-link>
                  </template>
                </StockCardList>
              </div>
              <div v-else class="login-prompt">
                <p>登录后可查看您的自选股</p>
                <router-link to="/login">
                  <el-button type="primary" size="small">去登录</el-button>
                </router-link>
              </div>
            </div>

            <div class="forecast-ranking-section" ref="forecastRankingSectionRef">
              <h3 class="section-title ranking-title" @click="goToForecastPage">预测盈利排行榜</h3>
              <div
                class="forecast-ranking-card"
                ref="forecastRankingCardRef"
                :style="forecastRankingCardStyle"
              >
                <el-table
                  :data="forecastRanking"
                  :loading="loadingForecastRanking"
                  :max-height="forecastTableMaxHeight"
                  table-layout="fixed"
                  stripe
                  size="small"
                  empty-text="暂无排行榜数据"
                  class="forecast-ranking-table"
                  @row-click="onForecastRowClick"
                >
                  <el-table-column prop="rankLabel" label="排名" align="center" show-overflow-tooltip />
                  <el-table-column label="股票简称(股票代码)" show-overflow-tooltip>
                    <template #default="{ row }">
                      <span class="ranking-stock-link" @click.stop="goToStockDetailByCode(row.code)">
                        {{ row.name }}({{ row.code }})
                      </span>
                    </template>
                  </el-table-column>
                  <el-table-column label="净利润同比" align="center" show-overflow-tooltip>
                    <template #default="{ row }">
                      <span class="ranking-yoy" :class="row.yoy === null ? '' : (row.yoy >= 0 ? 'up' : 'down')">
                        {{ row.yoyText }}
                      </span>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { stockApi } from '@/services/api';
import TheNavbar from '@/components/TheNavbar.vue';
import MarketOverview from '@/components/MarketOverview.vue';
import NewsSlider from '@/components/NewsSlider.vue';
import StockCardList from '@/components/StockCardList.vue';
import StockMonitorCard from '@/components/StockMonitorCard.vue';
import HotBurstPanel from '@/components/HotBurstPanel.vue';
import WindLeaderPanel from '@/components/WindLeaderPanel.vue';
import AiGraph from '@/components/AiGraph.vue';
import { trendHotspotApi, windLeaderApi } from '@/services/api';
import 'element-plus/es/components/message/style/css';

export default {
  name: 'HomeView',
  components: {
    TheNavbar,
    MarketOverview,
    NewsSlider,
    StockCardList,
    StockMonitorCard,
    HotBurstPanel
  },
  setup() {
    const store = useStore();
    const router = useRouter();

    // 趋势风口数据
    const monitorEvents = ref([]);
    const loadingMonitor = ref(false);

    const fetchMonitorEvents = async () => {
      loadingMonitor.value = true;
      try {
        const res = await trendHotspotApi.getEvents({ cycle: 'all', limit: 8 });
        const events = res?.data?.events || [];
        monitorEvents.value = events.map(e => ({
          ...e,
          stock_code: (e.stock_code || e.symbol || '').replace(/^(SH|SZ)/, ''),
          industry: e.industry || '',
          change_type: e.change_type || '',
          change_type_name: e.change_type_name || e.summary || '',
          price: e.price ?? 0,
          change_pct: e.change_pct ?? 0,
          event_time_display: e.event_time_display || formatEventTime(e.event_time),
        }));
      } catch (err) {
        console.warn('[HomeView] 获取趋势风口数据失败，使用空列表:', err);
        monitorEvents.value = [];
      } finally {
        loadingMonitor.value = false;
      }
    };

    const formatEventTime = (timeStr) => {
      if (!timeStr) return '';
      try {
        const d = new Date(timeStr);
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        return timeStr;
      }
    };

    fetchMonitorEvents();

    // -------------------- 风口龙头部分 --------------------
    const hotSectors = ref([]);
    const loadingHotSectors = ref(false);
    const hotSectorUpdateTime = ref('');
    const hotSectorError = ref('');
    const hotSectorQuoteMap = ref({}); // 风口龙头股票实时行情

    const fetchHotSectors = async (forceRefresh = false) => {
      loadingHotSectors.value = true;
      hotSectorError.value = '';
      try {
        // 如果是手动重试，先触发后端刷新
        if (forceRefresh) {
          try {
            await windLeaderApi.refreshAnalysis();
          } catch (e) {
            console.warn('[HomeView] 风口龙头刷新请求失败，仍尝试读取缓存:', e);
          }
        }
        const res = await windLeaderApi.getWindLeaders(8);
        if (res?.code === 200 && res?.data) {
          hotSectors.value = res.data.hot_sectors || [];
          hotSectorUpdateTime.value = res.data.update_time || '';
        } else if (res?.code === 404) {
          hotSectorError.value = '暂无风口龙头数据，请稍后再试';
          hotSectors.value = [];
        } else {
          hotSectorError.value = res?.message || '获取风口龙头数据失败';
          hotSectors.value = [];
        }
      } catch (err) {
        console.warn('[HomeView] 获取风口龙头数据失败:', err);
        hotSectorError.value = '网络异常，无法获取风口龙头数据';
        hotSectors.value = [];
      } finally {
        loadingHotSectors.value = false;
      }
    };

    fetchHotSectors();

    // -------------------- 市场资讯部分 --------------------
    const domesticNews = ref([]);
    const foreignNews = ref([]);
    const headlineNews = ref([]);
    const favoriteStockNews = ref([]); // 添加自选股相关新闻

    const toFiniteNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      const text = String(value).replace(/,/g, '').replace('%', '').trim();
      if (!text || text === '-' || text === '--' || text === '—') return null;
      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const isValidStockPrice = (value) => {
      const price = toFiniteNumber(value);
      return price !== null && price > 0;
    };

    const mergeStocksWithPrevious = (nextStocks, previousStocks) => {
      const previousMap = new Map(
        (previousStocks || []).map(stock => [stock.code, stock])
      );

      return nextStocks.map(stock => {
        const previous = previousMap.get(stock.code);
        const latestPrice = toFiniteNumber(stock.latest_price ?? stock.price);
        const previousPrice = toFiniteNumber(previous?.latest_price ?? previous?.price);
        const hasValidPrice = isValidStockPrice(latestPrice);
        const latestChange = toFiniteNumber(stock.change_percent ?? stock.change);
        const previousChange = toFiniteNumber(previous?.change_percent ?? previous?.change);

        return {
          ...stock,
          latest_price: hasValidPrice
            ? latestPrice
            : previousPrice,
          change_percent: latestChange ?? previousChange
        };
      });
    };

    // 定时器引用，需要在 onUnmounted 中清除
    let domesticRefreshInterval = null;
    let foreignRefreshInterval = null;
    let headlineRefreshInterval = null;
    let favoriteNewsRefreshInterval = null; // 新增自选股资讯刷新定时器
    let trendLeaderQuotesRefreshInterval = null; // 趋势龙头股行情刷新定时器
    let favoriteStocksPriceRefreshInterval = null; // 自选股价格刷新定时器
    let realtimeQuoteInterval = null; // 盘中行情3秒实时刷新
    let rankingLayoutObserver = null;

    const FORECAST_RANKING_FETCH_LIMIT = 30;

    // 判断当前是否为A股盘中时间（工作日 9:30-11:30, 13:00-15:00）
    const isTradingHours = () => {
      const now = new Date();
      const day = now.getDay();
      if (day === 0 || day === 6) return false;
      const h = now.getHours();
      const m = now.getMinutes();
      const t = h * 60 + m;
      return (t >= 570 && t <= 690) || (t >= 780 && t <= 900); // 9:30-11:30, 13:00-15:00
    };

    // 盘中实时行情刷新：只刷新首页可见股票的价格
    const refreshRealtimeQuotes = async () => {
      if (!isTradingHours()) return;

      // 收集所有需要刷新行情的股票代码
      const codes = new Set();

      // 自选股
      myFavoriteStocks.value.forEach(s => { if (s.code) codes.add(s.code); });

      // 风口龙头
      hotSectors.value.forEach(sector => {
        (sector.main_stocks || []).forEach(s => { if (s.code) codes.add(s.code); });
        (sector.upstream_stocks || []).forEach(s => { if (s.code) codes.add(s.code); });
        (sector.downstream_stocks || []).forEach(s => { if (s.code) codes.add(s.code); });
      });

      if (codes.size === 0) return;

      const codeArr = [...codes];
      // 每批最多20个（后端限制）
      const groups = [];
      for (let i = 0; i < codeArr.length; i += 20) {
        groups.push(codeArr.slice(i, i + 20).join(','));
      }

      const quoteMap = {};
      await Promise.allSettled(groups.map(group =>
        stockApi.getStockCoreQuotes(group)
          .then(res => {
            if (res?.code !== 200) return;
            (res?.data?.行情 || []).forEach(q => {
              const code = q?.股票代码;
              if (!code) return;
              quoteMap[code] = {
                latest_price: toFiniteNumber(q?.最新价),
                change_percent: toFiniteNumber(q?.涨跌幅),
              };
            });
          })
          .catch(() => {})
      ));

      if (Object.keys(quoteMap).length === 0) return;

      // 更新自选股价格
      if (myFavoriteStocks.value.length > 0) {
        myFavoriteStocks.value = myFavoriteStocks.value.map(s => {
          const q = quoteMap[s.code];
          if (!q) return s;
          return {
            ...s,
            latest_price: q.latest_price ?? s.latest_price,
            change_percent: q.change_percent ?? s.change_percent,
          };
        });
      }

      // 更新风口龙头行情
      hotSectorQuoteMap.value = { ...hotSectorQuoteMap.value, ...quoteMap };
    };

    const startRealtimeQuoteRefresh = () => {
      stopRealtimeQuoteRefresh();
      if (!isTradingHours()) return;
      console.log('[HomeView] 盘中行情1分钟实时刷新已启动');
      // 立即刷新一次
      refreshRealtimeQuotes();
      realtimeQuoteInterval = setInterval(refreshRealtimeQuotes, 60 * 1000);
    };

    const stopRealtimeQuoteRefresh = () => {
      if (realtimeQuoteInterval) {
        clearInterval(realtimeQuoteInterval);
        realtimeQuoteInterval = null;
      }
    };

    const normalizeTagCode = (value) => {
      const text = String(value || '').trim().toUpperCase();
      return /^BK\d{4}$/.test(text) ? text : '';
    };

    // --- 标签导航功能 ---
    const navigateToTag = (tag) => {
      // 关闭新闻详情弹窗(如果是从弹窗点击的标签)
      if (newsDetailVisible.value) {
        closeNewsDetail();
      }

      const tagCode = normalizeTagCode(tag);
      if (!tagCode) {
        ElMessage.warning('当前标签缺少板块ID，暂不支持跳转');
        return;
      }

      router.push({
        name: 'TagView',
        params: { tagCode },
        query: { name: String(tag || '').trim() }
      });
    };

    // 国内资讯
    const fetchDomesticNews = async () => {
      try {
        const news = await store.dispatch('fetchCnNews');
        if (Array.isArray(news) && news.length > 0) {
          domesticNews.value = news;
        } else if (domesticNews.value.length === 0) {
          domesticNews.value = Array.isArray(news) ? news : [];
        } else {
          console.warn('[HomeView] 国内资讯刷新为空，保留当前数据');
        }
      } catch (error) {
        console.error('获取国内资讯失败:', error);
      }
    };

    // 外围资讯
    const fetchForeignNews = async () => {
      try {
        const news = await store.dispatch('fetchForeignNews');
        if (Array.isArray(news) && news.length > 0) {
          foreignNews.value = news;
        } else if (foreignNews.value.length === 0) {
          foreignNews.value = Array.isArray(news) ? news : [];
        } else {
          console.warn('[HomeView] 外围资讯刷新为空，保留当前数据');
        }
      } catch (error) {
        console.error('获取外围资讯失败:', error);
      }
    };

    // 头条新闻
    const fetchHeadlineNews = async () => {
      try {
        const news = await store.dispatch('fetchHeadlineNews');
        if (news.length > 0) {
          headlineNews.value = news;
        }
      } catch (error) {
        console.error('获取头条新闻失败:', error);
      }
    };

    // 自选股相关新闻 - 更新为使用推送新闻API
    const fetchFavoriteStockNews = async () => {
      if (!isLoggedIn.value) {
        favoriteStockNews.value = [];
        return;
      }
      
      try {
        // 调用获取推送新闻的 action
        const response = await store.dispatch('fetchPushNews', { 
          page: 1, 
          limit: 5
        });
        
        if (response && Array.isArray(response.news)) {
          favoriteStockNews.value = response.news;
        } else {
          console.log('未找到自选股相关新闻或接口返回为空，保留当前资讯');
        }
      } catch (error) {
        console.error('获取自选股相关新闻失败:', error);
        console.warn('[HomeView] 自选股相关新闻刷新失败，已静默保留上一批资讯');
      }
    };

    // 新闻详情弹窗相关
    const newsDetailVisible = ref(false);
    const newsDetail = ref(null);
    const loadingNewsDetail = ref(false);
    const currentNewsId = ref(null);

    const showNewsDetail = async (newsId) => {
      try {
        newsDetailVisible.value = true;
        loadingNewsDetail.value = true;
        newsDetail.value = null;
        currentNewsId.value = newsId;

        console.log(`[DEBUG] 开始获取新闻详情: ${newsId}`);
        const detail = await store.dispatch('fetchNewsDetail', newsId);
        if (detail) {
          newsDetail.value = detail;
          console.log(`[DEBUG] 成功获取新闻详情:`, detail);
        } else {
          ElMessage.error('获取新闻详情失败');
        }
      } catch (error) {
        console.error('获取新闻详情失败:', error);
        if (error.code === 'ECONNABORTED') {
          ElMessage.error('网络请求超时，请检查网络连接后重试');
        } else if (error.response) {
          ElMessage.error(`服务器错误：${error.response.status}`);
        } else {
          ElMessage.error('获取新闻详情失败，请稍后重试');
        }
      } finally {
        loadingNewsDetail.value = false;
      }
    };

    const retryLoadNewsDetail = () => {
      if (currentNewsId.value) {
        showNewsDetail(currentNewsId.value);
      }
    };

    const closeNewsDetail = () => {
      newsDetailVisible.value = false;
      newsDetail.value = null;
      currentNewsId.value = null;
    };

    // -------------------- 股票部分 --------------------
    const forecastRanking = ref([]);
    const loadingForecastRanking = ref(true);
    const forecastRankingSectionRef = ref(null);
    const forecastRankingCardRef = ref(null);
    const forecastRankingCardHeight = ref(null);
    const forecastTableMaxHeight = ref(320);

    // 自选股相关
    const myFavoriteStocks = ref([]);
    const loadingFavorites = ref(false);
    const curatedFavoriteLoading = ref({});
    const isLoggedIn = computed(() => store.getters.isLoggedIn);

    // 显示前 8 条自选股
    const displayedFavoriteStocks = computed(() => {
      return myFavoriteStocks.value.slice(0, 8);
    });

    const forecastRankingCardStyle = computed(() => (
      forecastRankingCardHeight.value
        ? { height: `${forecastRankingCardHeight.value}px` }
        : {}
    ));

    const trendLeaderQuoteMap = ref({});
    const loadingTrendLeaderQuotes = ref(true);

    const formatPriceText = (value) => {
      const num = toFiniteNumber(value);
      if (num === null || num <= 0) return '--';
      return num.toFixed(2);
    };

    const formatChangeText = (value) => {
      const num = toFiniteNumber(value);
      if (num === null) return '--';
      return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    };

    // 从后端风口数据中提取龙头股种子
    const trendLeaderStockSeeds = computed(() => {
      const stocks = [];
      for (const sector of hotSectors.value) {
        const leadInfo = sector.leading_stock_info;
        if (leadInfo && leadInfo.code) {
          stocks.push({
            code: leadInfo.code,
            name: leadInfo.name,
            track: sector.name,
            leaderBasis: leadInfo.reason || '',
            latestPrice: '--',
            changeRate: 0,
            changeText: '--',
          });
        }
      }
      return stocks;
    });

    const trendLeaderStocks = computed(() => trendLeaderStockSeeds.value.map(stock => {
      const quote = trendLeaderQuoteMap.value[stock.code] || {};
      const realPrice = toFiniteNumber(quote.latest_price);
      const realChange = toFiniteNumber(quote.change_percent);
      return {
        ...stock,
        latestPrice: formatPriceText(realPrice),
        changeRate: realChange ?? 0,
        changeText: formatChangeText(realChange)
      };
    }));

    const applyForecastLayout = () => {
      if (typeof window === 'undefined') return;

      const rankingSection = forecastRankingSectionRef.value;
      const rankingCard = forecastRankingCardRef.value;

      // 小屏下改为纵向堆叠，不强制等高
      if (!rankingSection || !rankingCard || window.innerWidth <= 992) {
        forecastRankingCardHeight.value = null;
        forecastTableMaxHeight.value = 320;
        return;
      }

      const titleEl = rankingSection.querySelector('.ranking-title');
      const sectionStyle = window.getComputedStyle(rankingSection);
      const titleStyle = titleEl ? window.getComputedStyle(titleEl) : null;

      const sectionPaddingTop = Number.parseFloat(sectionStyle.paddingTop) || 0;
      const sectionPaddingBottom = Number.parseFloat(sectionStyle.paddingBottom) || 0;
      const titleHeight = titleEl?.offsetHeight || 0;
      const titleMarginBottom = titleStyle ? (Number.parseFloat(titleStyle.marginBottom) || 0) : 0;
      const availableHeight = rankingSection.offsetHeight - sectionPaddingTop - sectionPaddingBottom - titleHeight - titleMarginBottom;

      if (!Number.isFinite(availableHeight) || availableHeight <= 0) {
        forecastRankingCardHeight.value = null;
        forecastTableMaxHeight.value = 320;
        return;
      }

      const cardHeight = Math.max(220, Math.floor(availableHeight));
      forecastRankingCardHeight.value = cardHeight;

      const cardStyle = window.getComputedStyle(rankingCard);
      const cardPaddingTop = Number.parseFloat(cardStyle.paddingTop) || 0;
      const cardPaddingBottom = Number.parseFloat(cardStyle.paddingBottom) || 0;
      forecastTableMaxHeight.value = Math.max(140, cardHeight - cardPaddingTop - cardPaddingBottom);
    };

    const updateForecastLayout = () => {
      nextTick(() => {
        applyForecastLayout();
      });
    };

    const fetchTrendLeaderQuotes = async ({ showLoading = false } = {}) => {
      const codes = trendLeaderStockSeeds.value.map(stock => stock.code).filter(Boolean);
      if (codes.length === 0) return;
      const hadData = Object.keys(trendLeaderQuoteMap.value).length > 0;
      const shouldShowLoading = showLoading || !hadData;

      if (shouldShowLoading) {
        loadingTrendLeaderQuotes.value = true;
      }

      const nextQuoteMap = {};
      const groups = [];
      const groupSize = 4;
      for (let i = 0; i < codes.length; i += groupSize) {
        groups.push(codes.slice(i, i + groupSize).join(','));
      }

      await Promise.allSettled(groups.map(group => (
        stockApi.getStockCoreQuotes(group)
          .then((response) => {
            if (response?.code !== 200) return;
            const quotes = response?.data?.行情 || [];
            quotes.forEach(quote => {
              const code = quote?.股票代码;
              if (!code) return;
              const latestPrice = toFiniteNumber(quote?.最新价);
              const changePercent = toFiniteNumber(quote?.涨跌幅);
              nextQuoteMap[code] = {
                latest_price: latestPrice,
                change_percent: changePercent
              };
            });
          })
          .catch((error) => {
            console.warn('[HomeView] 获取趋势龙头股真实行情失败:', error);
          })
      )));

      const hasNewQuotes = Object.keys(nextQuoteMap).length > 0;
      if (hasNewQuotes) {
        trendLeaderQuoteMap.value = {
          ...trendLeaderQuoteMap.value,
          ...nextQuoteMap
        };
      }

      loadingTrendLeaderQuotes.value = !(hasNewQuotes || hadData);
    };

    const parseYoy = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(String(value).replace('%', '').trim());
      return Number.isFinite(num) ? num : null;
    };

    const formatYoy = (yoy) => {
      if (yoy === null) return '--';
      return `${yoy >= 0 ? '+' : ''}${yoy.toFixed(2)}%`;
    };

    const getRankLabel = (rank) => {
      if (rank === 1) return '🥇';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return String(rank);
    };

    const mapForecastRanking = (item, index) => {
      const code = item.symbol || item['股票代码'] || item.code || '';
      const name = item.name || item['股票简称'] || item['股票名称'] || '--';
      const yoy = parseYoy(item.forecast_netprofit_yoy ?? item['净利润同比(%)'] ?? item['净利润同比']);
      const rank = index + 1;

      return {
        rank,
        rankLabel: getRankLabel(rank),
        code,
        name,
        yoy,
        yoyText: formatYoy(yoy)
      };
    };

    const fetchForecastRanking = async ({ showLoading = false } = {}) => {
      const hadData = forecastRanking.value.length > 0;
      const shouldShowLoading = showLoading && !hadData;

      try {
        if (shouldShowLoading) {
          loadingForecastRanking.value = true;
        }

        const response = await stockApi.getProfitForecastList({
          page: 1,
          pageSize: FORECAST_RANKING_FETCH_LIMIT,
          sortBy: 'forecast_netprofit_yoy',
          sortOrder: 'desc'
        });

        const list = response?.data?.['盈利预测列表'] || response?.data?.list || response?.data?.items || [];
        const normalized = Array.isArray(list)
          ? list.slice(0, FORECAST_RANKING_FETCH_LIMIT).map(mapForecastRanking).filter(item => item.code)
          : [];

        if (normalized.length > 0) {
          forecastRanking.value = normalized;
        } else if (!hadData) {
          forecastRanking.value = [];
        } else {
          console.warn('[HomeView] 盈利预测榜刷新为空，保留当前数据');
        }
      } catch (error) {
        console.error('获取盈利预测排行榜失败:', error);
      } finally {
        if (shouldShowLoading || !hadData) {
          loadingForecastRanking.value = false;
        }
      }
    };

    // 获取自选股价格。默认优先使用短时缓存，自动刷新时可强制拉取最新报价。
    const fetchMyFavoriteStocks = async ({ showLoading = false, forceRefresh = false } = {}) => {
      if (!isLoggedIn.value) return;
      const hadData = myFavoriteStocks.value.length > 0;
      const shouldShowLoading = showLoading && !hadData;

      try {
        if (shouldShowLoading) {
          loadingFavorites.value = true;
        }

        const stocks = store.getters.favoriteStocks || [];
        
        // 自动刷新时跳过本地价格缓存，避免首页长期停留后价格不更新
        if (stocks.length > 0) {
          const stocksWithPrices = await store.dispatch('fetchBatchStockPrices', {
            stocks,
            forceRefresh
          });

          if (Array.isArray(stocksWithPrices) && stocksWithPrices.length > 0) {
            myFavoriteStocks.value = mergeStocksWithPrevious(stocksWithPrices, myFavoriteStocks.value);
          } else if (!hadData) {
            myFavoriteStocks.value = stocks;
          } else {
            console.warn('[HomeView] 自选股价格刷新为空，保留当前数据');
          }
          
          // 在获取自选股后，立即获取相关新闻
          fetchFavoriteStockNews();
        } else {
          myFavoriteStocks.value = [];
        }
      } catch (error) {
        console.error('获取自选股失败:', error);
      } finally {
        if (shouldShowLoading || !hadData) {
          loadingFavorites.value = false;
        }
      }
    };

    // 监听自选股变化，自动刷新自选股资讯
    watch(myFavoriteStocks, (newVal) => {
      if (newVal.length > 0 && isLoggedIn.value) {
        fetchFavoriteStockNews();
      }
    }, { deep: true });

    watch(
      [forecastRanking, loadingForecastRanking],
      () => {
        updateForecastLayout();
      },
      { deep: true }
    );

    const stopFavoriteAutoRefresh = () => {
      clearInterval(favoriteNewsRefreshInterval);
      clearInterval(favoriteStocksPriceRefreshInterval);
      favoriteNewsRefreshInterval = null;
      favoriteStocksPriceRefreshInterval = null;
    };

    const startFavoriteAutoRefresh = ({ showLoading = false } = {}) => {
      if (!isLoggedIn.value) return;

      fetchMyFavoriteStocks({ showLoading });
      fetchFavoriteStockNews();

      stopFavoriteAutoRefresh();

      // 自选股资讯每 10 分钟刷新一次
      favoriteNewsRefreshInterval = setInterval(() => {
        fetchFavoriteStockNews();
      }, 10 * 60 * 1000);

      // 自选股价格每 3 分钟刷新一次
      favoriteStocksPriceRefreshInterval = setInterval(() => {
        console.log('[HomeView] 定时刷新自选股价格');
        fetchMyFavoriteStocks({ forceRefresh: true });
      }, 3 * 60 * 1000);
    };

    watch(isLoggedIn, (loggedIn) => {
      if (loggedIn) {
        startFavoriteAutoRefresh({ showLoading: true });
        return;
      }
      stopFavoriteAutoRefresh();
      myFavoriteStocks.value = [];
      favoriteStockNews.value = [];
      loadingFavorites.value = false;
    });

    // 查看股票详情
    const viewStockDetail = (stock) => {
      router.push(`/stock/${stock.code}`);
    };

    const goToStockDetailByCode = (code) => {
      if (!code) return;
      router.push(`/stock/${code}`);
    };

    const onForecastRowClick = (row) => {
      goToStockDetailByCode(row?.code);
    };

    const viewCuratedStock = (stock) => {
      if (!stock?.code) return;
      router.push(`/stock/${stock.code}`);
    };

    const isCuratedFavorite = (stock) => {
      if (!stock?.code) return false;
      return (store.getters.favoriteStocks || []).some(item => String(item.code) === String(stock.code));
    };

    const toggleCuratedFavorite = async (stock) => {
      if (!stock?.code) return;
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录后才能添加自选股');
        router.push('/login');
        return;
      }

      curatedFavoriteLoading.value = {
        ...curatedFavoriteLoading.value,
        [stock.code]: true
      };

      try {
        if (isCuratedFavorite(stock)) {
          const result = await store.dispatch('removeFavoriteStocks', [stock.code]);
          if (result) {
            ElMessage.success(`已将 ${stock.name} 从自选股中移除`);
          } else {
            ElMessage.error(`移除 ${stock.name} 失败`);
          }
        } else {
          const result = await store.dispatch('addFavoriteStocks', [
            { code: stock.code, name: stock.name }
          ]);
          if (result) {
            ElMessage.success(`成功添加 ${stock.name} 到自选股`);
          } else {
            ElMessage.error(`添加 ${stock.name} 到自选股失败`);
          }
        }
        await fetchMyFavoriteStocks({ forceRefresh: true });
      } catch (error) {
        console.error('操作精选股票关注失败:', error);
        ElMessage.error('操作失败，请稍后再试');
      } finally {
        curatedFavoriteLoading.value = {
          ...curatedFavoriteLoading.value,
          [stock.code]: false
        };
      }
    };

    const getPotentialClass = (value) => {
      const multiple = Number(String(value || '').replace('倍', '').trim());
      if (multiple >= 10) return 'multiple-10';
      if (multiple >= 5) return 'multiple-5';
      if (multiple >= 3) return 'multiple-3';
      if (multiple >= 2) return 'multiple-2';
      return 'multiple-1';
    };

    const goToForecastPage = () => {
      router.push('/forecast');
    };

    // 处理自选股操作
    const handleToggleFavorite = (stock, loadingStates) => {
      removeFromFavorite(stock, loadingStates);
    };

    // 删除自选股
    const removeFromFavorite = async (stock, loadingStates = {}) => {
      try {
        const result = await store.dispatch('removeFavoriteStocks', [stock.code]);
        if (result) {
          ElMessage.success(`已将 ${stock.name} 从自选股中移除`);
          await fetchMyFavoriteStocks({ forceRefresh: true });
        } else {
          ElMessage.error('移除自选股失败');
        }
      } catch (error) {
        console.error('移除自选股失败:', error);
        ElMessage.error('移除自选股失败');
      } finally {
        if (loadingStates[stock.code]) {
          loadingStates[stock.code] = false;
        }
      }
    };
    
    const goToFavoritesPage = () => {
      router.push('/favorites');
    };

    const goToProfile = () => {
      router.push('/profile');
    };

    // ---- onMounted 与 onUnmounted ----
    onMounted(() => {
      // 重置滚动位置到顶部
      window.scrollTo(0, 0);
      
      // 新闻数据拉取
      fetchDomesticNews();
      fetchForeignNews();
      fetchHeadlineNews();

      // 自动刷新定时器
      // 头条新闻每 1 分钟刷新一次
      headlineRefreshInterval = setInterval(() => {
        fetchHeadlineNews();
      }, 60 * 1000);

      // 国内资讯每 10 分钟刷新一次
      domesticRefreshInterval = setInterval(() => {
        fetchDomesticNews();
      }, 10 * 60 * 1000);

      // 外围资讯每 10 分钟刷新一次
      foreignRefreshInterval = setInterval(() => {
        fetchForeignNews();
      }, 10 * 60 * 1000);

      fetchTrendLeaderQuotes({ showLoading: true });
      fetchForecastRanking({ showLoading: true });
      updateForecastLayout();

      window.addEventListener('resize', updateForecastLayout);
      if (typeof ResizeObserver !== 'undefined') {
        rankingLayoutObserver = new ResizeObserver(() => {
          updateForecastLayout();
        });
        if (forecastRankingSectionRef.value) {
          rankingLayoutObserver.observe(forecastRankingSectionRef.value);
        }
      }
      
      trendLeaderQuotesRefreshInterval = setInterval(() => {
        console.log('[HomeView] 定时刷新趋势龙头股真实行情');
        fetchTrendLeaderQuotes();
      }, 5 * 60 * 1000);
      
      // 登录态可能在挂载后才恢复（Cookie 认证异步），所以这里仅处理当前已登录场景
      if (isLoggedIn.value) {
        startFavoriteAutoRefresh({ showLoading: true });
      }

      // 盘中行情3秒实时刷新
      startRealtimeQuoteRefresh();
    });

    onUnmounted(() => {
      // 清除自动刷新定时器
      clearInterval(domesticRefreshInterval);
      clearInterval(foreignRefreshInterval);
      clearInterval(headlineRefreshInterval);
      clearInterval(trendLeaderQuotesRefreshInterval); // 清除趋势龙头股行情刷新定时器
      stopFavoriteAutoRefresh();
      stopRealtimeQuoteRefresh();

      window.removeEventListener('resize', updateForecastLayout);
      if (rankingLayoutObserver) {
        rankingLayoutObserver.disconnect();
        rankingLayoutObserver = null;
      }
    });

    return {
      // 趋势风口
      monitorEvents,

      // 风口龙头
      hotSectors,
      loadingHotSectors,
      hotSectorUpdateTime,
      hotSectorError,
      hotSectorQuoteMap,

      // 市场资讯相关
      domesticNews,
      foreignNews,
      headlineNews,
      favoriteStockNews, // 添加返回自选股资讯数据
      newsDetailVisible,
      newsDetail,
      loadingNewsDetail,
      showNewsDetail,
      closeNewsDetail,
      retryLoadNewsDetail,
      navigateToTag,
      
      // 预测排行榜相关
      forecastRanking,
      loadingForecastRanking,
      onForecastRowClick,
      goToStockDetailByCode,
      goToForecastPage,
      forecastRankingSectionRef,
      forecastRankingCardRef,
      forecastRankingCardStyle,
      forecastTableMaxHeight,
      trendLeaderStocks,
      loadingTrendLeaderQuotes,
      viewCuratedStock,
      isCuratedFavorite,
      toggleCuratedFavorite,
      curatedFavoriteLoading,
      getPotentialClass,
      
      // 自选股相关
      myFavoriteStocks,
      displayedFavoriteStocks,
      loadingFavorites,
      isLoggedIn,
      fetchMyFavoriteStocks,
      removeFromFavorite,
      handleToggleFavorite,
      
      // 共用
      viewStockDetail,
      goToFavoritesPage,
      goToProfile,
    };
  }
};
</script>

<style lang="scss" scoped>
.home-page {
  .hot-burst-section {
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .stock-monitor-section {
    margin-top: 20px;
    margin-bottom: 20px;
    padding: 16px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .market-overview-section {
    margin-top: 20px; // 调整位置
    margin-bottom: 20px;

    .market-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 10px; // 减少间距以节省空间
      
      .market-card {
        padding: 10px; // 减少卡片内边距
        flex: 1 0 calc(50% - 10px); // 每行显示2个，适配手机屏幕
        min-width: 120px; // 调整最小宽度
      }
    }
  }

  .main-content {
    flex: 1;
    background-color: var(--background-color);
  }
  
  .section-title {
    font-size: 1.4rem;
    margin-bottom: 20px;
    color: var(--text-primary);
    font-weight: 500;
  }
  
  .features-section {
    margin-top: 30px;
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      
      @media (max-width: 992px) {
        grid-template-columns: repeat(2, 1fr);
      }
      
      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }
      
      .feature-card {
        background: #fff;
        border-radius: 8px;
        padding: 30px 20px;
        text-align: center;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        transition: transform 0.3s ease;
        
        &:hover {
          transform: translateY(-5px);
        }
        
        i {
          font-size: 40px;
          color: var(--primary-color);
          margin-bottom: 15px;
        }
        
        h4 {
          font-size: 1.1rem;
          margin-bottom: 10px;
          color: var(--text-primary);
        }
        
        p {
          color: var(--text-tertiary);
          font-size: 0.9rem;
        }
      }
    }
  }

  .hot-stocks-row {
    margin-top: 20px;
    display: flex;
    gap: 20px;
    align-items: stretch;

    .hot-stocks-section {
      flex: 2;
      display: flex;
      flex-direction: column;

      :deep(.stock-card-list) {
        margin-top: 0;
      }

      :deep(.stock-card-list .stock-cards .stock-card) {
        flex: 1 1 calc(33.333% - 10px);
        max-width: calc(33.333% - 10px);
      }

      .login-prompt {
        background: #fff;
        border-radius: 8px;
        padding: 30px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);

        p {
          margin-bottom: 15px;
          color: var(--text-secondary);
        }
      }

      .empty-state {
        background: #fff;
        border-radius: 8px;
        padding: 30px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);

        p {
          margin-bottom: 15px;
          color: var(--text-secondary);
        }
      }
    }

    .forecast-ranking-section {
      flex: 1;
      min-width: 320px;
      display: flex;
      flex-direction: column;
      min-height: 0;

      .section-title {
        margin: 0 0 15px 0;
      }

      .ranking-title {
        font-size: 1.4rem;
        font-weight: 500;
        line-height: 1.4;
        color: var(--text-primary);
        cursor: pointer;
        transition: color 0.2s ease;

        &:hover {
          color: var(--primary-color);
        }
      }

      .forecast-ranking-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        padding: 10px;
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }

      .forecast-ranking-table {
        width: 100%;
        flex: 1;
        min-height: 0;

        :deep(.el-table__header colgroup col:nth-child(-n + 3)),
        :deep(.el-table__body colgroup col:nth-child(-n + 3)) {
          width: 33.333% !important;
        }

        :deep(.el-table__cell) {
          padding: 8px 6px;
        }

        :deep(.cell) {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        :deep(.el-table__row) {
          cursor: pointer;
        }

        :deep(.el-table__body-wrapper),
        :deep(.el-scrollbar__wrap) {
          overflow-x: hidden !important;
        }
      }

      .ranking-stock-link {
        color: var(--primary-color);
        font-weight: 500;
        cursor: pointer;
        display: block;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &:hover {
          text-decoration: underline;
        }
      }

      .ranking-yoy {
        font-weight: 600;

        &.up {
          color: #f56c6c;
        }

        &.down {
          color: #67c23a;
        }
      }
    }

    @media (max-width: 1200px) {
      .forecast-ranking-section {
        min-width: 280px;
      }
    }

    @media (max-width: 992px) {
      flex-direction: column;

      .hot-stocks-section,
      .forecast-ranking-section {
        width: 100%;
      }

      .forecast-ranking-section {
        min-width: 0;
        display: block;
      }

      .hot-stocks-section :deep(.stock-card-list .stock-cards .stock-card) {
        flex: 1 1 calc(50% - 8px);
        max-width: calc(50% - 8px);
      }
    }

    @media (max-width: 640px) {
      .hot-stocks-section :deep(.stock-card-list .stock-cards .stock-card) {
        flex: 1 1 100%;
        max-width: 100%;
      }

      .forecast-ranking-section .forecast-ranking-card {
        padding: 6px;

        .forecast-ranking-table {
          :deep(.el-table__cell) {
            padding: 6px 2px;
          }

          :deep(.cell) {
            font-size: 12px;
          }
        }
      }
    }
  }

  .curated-stock-sections {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    margin: 24px 0 26px;

    .curated-panel {
      background: #fff;
      border-radius: 12px;
      padding: 18px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      min-width: 0;
    }

    .curated-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;

      .section-title {
        margin: 0;
      }
    }

    .curated-list {
      border: 1px solid #edf1f7;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }

    .curated-list.scrollable {
      max-height: 460px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #c1c9d4 transparent;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background-color: #c1c9d4;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb:hover {
        background-color: #a0aab5;
      }
    }

    .curated-list-head,
    .curated-list-row {
      display: grid;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .trend-leader-list .curated-list-head,
    .trend-leader-row {
      grid-template-columns: minmax(116px, 0.8fr) minmax(112px, 0.7fr) minmax(170px, 1.35fr) 78px;
    }

    .trend-leader-row .stock-identity {
      display: block;
    }

    .trend-leader-row .stock-title-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 6px;
      min-width: 0;
    }

    .trend-leader-row .stock-title-wrap h4 {
      margin: 0;
      min-width: 0;
      flex: 0 1 auto;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trend-leader-row .stock-title-wrap .stock-code-line {
      flex: 0 0 100%;
    }

    .tenbagger-list .curated-list-head,
    .tenbagger-row {
      grid-template-columns: minmax(76px, 0.75fr) minmax(96px, 0.9fr) minmax(98px, 0.9fr) 72px;
    }

    .curated-list-head {
      min-height: 34px;
      padding: 0 12px;
      background: #f8fafc;
      border-bottom: 1px solid #edf1f7;
      color: var(--text-tertiary);
      font-size: 0.74rem;
      font-weight: 700;
    }

    .curated-list-row {
      min-height: 58px;
      padding: 9px 12px;
      background: #fff;
      cursor: pointer;
      border-bottom: 1px solid #f0f3f8;
      transition: background 0.2s ease, box-shadow 0.2s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: #fbfdff;
        box-shadow: inset 3px 0 0 #4f7cff;
      }
    }

    .stock-identity,
    .stock-metrics,
    .tenbagger-factor {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
    }

    .stock-identity {
      .stock-title-wrap {
        min-width: 0;
      }

      h4 {
        margin: 0 0 3px;
        color: var(--text-primary);
        font-size: 0.92rem;
        line-height: 1.3;
      }

      .stock-code-line {
        display: block;
        color: var(--text-tertiary);
        font-size: 0.72rem;
      }
    }

    .industry-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: 98px;
      min-height: 22px;
      padding: 2px 9px;
      border-radius: 999px;
      background: #eaf2ff;
      color: #1d4ed8;
      border: 1px solid #bcd2ff;
      font-size: 0.72rem;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-shrink: 0;

      &.is-emphasis {
        max-width: 86px;
        min-width: 64px;
        background: #e6f7f1;
        color: #047857;
        border-color: #a7f3d0;
      }
    }

    .tenbagger-industry {
      min-width: 0;
    }

    .stock-multiple {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 42px;
      height: 21px;
      padding: 0 7px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .multiple-1 {
      color: #9a6700;
      background: #fff8d6;
      border: 1px solid #ffe58f;
    }

    .multiple-2 {
      color: #ad4e00;
      background: #fff1d6;
      border: 1px solid #ffd591;
    }

    .multiple-3 {
      color: #d4380d;
      background: #fff2e8;
      border: 1px solid #ffbb96;
    }

    .multiple-5 {
      color: #c41d7f;
      background: #fff0f6;
      border: 1px solid #ffadd2;
    }

    .multiple-10 {
      color: #cf1322;
      background: #fff1f0;
      border: 1px solid #ffa39e;
      box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.06);
    }

    .stock-price {
      color: var(--text-primary);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .change-rate {
      font-weight: 700;
      font-size: 0.74rem;

      &.up { color: #f56c6c; }
      &.down { color: #67c23a; }
    }

    .signal-tag,
    .stock-ai-score {
      display: inline-flex;
      align-items: center;
      min-height: 21px;
      padding: 0 7px;
      border-radius: 999px;
      background: #f1f5f9;
      color: var(--text-secondary);
      font-size: 0.72rem;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .tenbagger-factor {
      justify-content: flex-start;
      overflow: hidden;
    }

    .leader-basis {
      margin: 0;
      min-width: 0;
      color: var(--text-secondary);
      font-size: 0.76rem;
      line-height: 1.45;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .leader-basis-wrap {
      min-width: 0;
    }

    .curated-follow-btn {
      width: 64px;
      justify-self: end;
      padding: 5px 8px;
      white-space: nowrap;
    }

    @media (max-width: 1180px) {
      grid-template-columns: 1fr;
    }

    @media (max-width: 720px) {
      .curated-panel {
        padding: 14px;
      }

      .curated-panel-header {
        align-items: flex-start;
        flex-direction: column;
        gap: 4px;
      }

      .curated-list-head {
        display: none;
      }

      .trend-leader-row {
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
          "info action"
          "metrics metrics"
          "basis basis";
        gap: 6px 8px;
        align-items: center;
      }

      .trend-leader-row .stock-identity {
        grid-area: info;
        display: block;
        min-width: 0;
      }

      .trend-leader-row .stock-title-wrap {
        width: 100%;
        justify-content: flex-start;
      }

      .trend-leader-row .curated-follow-btn {
        grid-area: action;
        justify-self: end;
        margin-left: 0;
      }

      .trend-leader-row .stock-metrics {
        grid-area: metrics;
        flex-wrap: nowrap;
      }

      .trend-leader-row .leader-basis-wrap {
        grid-area: basis;
      }

      .tenbagger-row {
        grid-template-columns: minmax(56px, 0.65fr) minmax(0, 0.95fr) minmax(0, 1.3fr) auto;
        gap: 6px 8px;
        align-items: center;
      }

      .tenbagger-row .tenbagger-industry,
      .tenbagger-row .stock-identity,
      .tenbagger-row .tenbagger-factor {
        min-width: 0;
      }

      .tenbagger-row .stock-identity {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .tenbagger-row .tenbagger-factor {
        flex-wrap: nowrap;
        overflow: hidden;
      }

      .curated-follow-btn {
        justify-self: end;
      }

    }
  }

  .button-icon {
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: middle;
  }
  
  // 以下是从 MarketNews.vue 合并来的样式
  .market-news-section {
    margin-top: 20px;
    margin-bottom: 30px;

    .headline-news-section {
      margin-bottom: 20px;
      padding: 15px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .news-columns {
      display: flex;
      gap: 20px;
      
      @media (max-width: 768px) {
        flex-direction: column;
      }

      .news-column {
        flex: 1;
        
        .news-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          padding: 15px;
          height: 100%;
        }
      }
    }
    
    // 添加自选股资讯行样式
    .favorite-news-row {
      margin-top: 20px;
      
      .news-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        padding: 15px;
        height: 100%;
        
        .empty-push-news {
          .news-section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 15px;
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 8px;
          }
          
          .empty-content {
            text-align: center;
            padding: 20px 0;
            color: var(--text-secondary);
            
            p {
              margin: 0;
              line-height: 1.6;
              
              .profile-link {
                color: var(--primary-color);
                cursor: pointer;
                text-decoration: underline;
                font-weight: 500;
                
                &:hover {
                  color: #337ecc;
                }
              }
            }
          }
        }
      }
    }

    // 新闻详情弹窗样式
    .news-detail-dialog {
      border-radius: 18px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
      overflow: hidden;

      :deep(.el-dialog__header) {
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 10px;
        background: #f7f9fb;
        border-radius: 18px 18px 0 0;
      }
      :deep(.el-dialog__body) {
        padding: 0;
        background: #f7f9fb;
        border-radius: 0 0 18px 18px;
      }
      .news-detail-content {
        background: #fff;
        border-radius: 4px;
        padding: 10px 10px 6px 10px;
        margin: 0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);

        .news-detail-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: var(--primary-color);
          margin-bottom: 18px;
          line-height: 1.35;
          letter-spacing: 0.5px;
          text-align: center;
        }
        .news-detail-tags {
          margin-bottom: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;

          .news-tag {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 500;
            letter-spacing: 0.2px;
            cursor: pointer;
            &.positive {
              background: #fff1f0;
              color: #d4380d;
              border: 1px solid #ffccc7;
            }
            &.negative {
              background: #f6ffed;
              color: #389e0d;
              border: 1px solid #b7eb8f;
            }
          }
        }
        .news-detail-summary {
          background: #e6f7ff;
          border-left: 4px solid var(--primary-color);
          padding: 15px 18px;
          margin-bottom: 20px;
          border-radius: 6px;
          h4 {
            margin: 0 0 8px 0;
            color: var(--primary-color);
            font-size: 1.05rem;
          }
          p {
            margin: 0;
            color: var(--text-secondary);
            line-height: 1.6;
          }
        }
        .news-detail-content-body {
          margin-bottom: 22px;
          h4 {
            margin: 0 0 10px 0;
            color: var(--text-primary);
            font-size: 1rem;
          }
          .news-content {
            color: var(--text-secondary);
            line-height: 1.8;
            font-size: 1rem;
            max-height: 38vh;
            overflow-y: auto;
            padding: 8px 4px 8px 0;
            background: #f8f9fa;
            border-radius: 6px;
            scrollbar-width: thin;
            scrollbar-color: var(--primary-color) #f8f9fa;

            :deep(img) {
              max-width: 100%;
              height: auto;
              border-radius: 4px;
            }
          }
          .news-content::-webkit-scrollbar {
            width: 6px;
          }
          .news-content::-webkit-scrollbar-thumb {
            background: var(--primary-color);
            border-radius: 6px;
          }
        }
        .news-detail-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
          gap: 12px;
          .news-detail-time {
            color: var(--text-tertiary);
            font-size: 0.95rem;
          }
          .news-detail-link {
            color: var(--primary-color);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 4px;
            .external-link-icon {
              font-size: 0.9rem;
              font-weight: bold;
            }
            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
      .loading-container {
        padding: 40px 0;
        background: #fff;
        border-radius: 12px;
        margin: 12px 0;
      }
      .error-message {
        text-align: center;
        padding: 40px 0;
        color: var(--text-tertiary);
        background: #fff;
        border-radius: 12px;
        margin: 12px 0;
        p {
          margin-bottom: 15px;
        }
      }
    }

    // 使用更具体的全局样式来覆盖 Element Plus 的默认样式
    :deep(.el-overlay-dialog) {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: hidden !important;
      top: auto !important;
      
      .el-dialog.news-detail_dialog {
        margin: 0 !important;
        transform: none !important;
        position: relative !important;
      }
    }
  }
}
</style>
