<template>
  <div class="stock-detail-page">
    <div class="page-container">
      <div class="stock-header">
        <div class="stock-title">
          <h1>{{ stockInfo?.name || '加载中...' }} 
            <span class="stock-code-container">
              <span class="market-code">{{ stockInfo?.market || '未知' }}</span><span class="code-separator">.</span>{{ stockInfo?.code }}
            </span>
          </h1>
          <div class="stock-price-info">
            <span class="current-price">{{ stockInfo.price }}</span>
            <span :class="stockInfo.change >= 0 ? 'stock-up' : 'stock-down'">
              {{ stockInfo.change >= 0 ? '+' : '' }}{{ stockInfo.change.toFixed(2) }}
              ({{ stockInfo.changePercent }}%)
            </span>
          </div>
          <el-button 
            :type="isFavorite ? 'danger' : 'primary'" 
            size="small" 
            @click="toggleFavorite" 
            :loading="addingToFavorites">
            <img 
              :src="isFavorite ? require('@/assets/unfollow.svg') : require('@/assets/follow.svg')" 
              alt="关注" 
              class="button-icon" 
            />
            {{ isLoggedIn ? (isFavorite ? '已关注' : '关注') : '登录后关注' }}
          </el-button>
        </div>
        <div class="stock-tags">
          <el-tag
            size="small"
            :type="stockInfo.industryTagId ? 'primary' : 'info'"
            :class="{ 'tag-item': true, 'is-clickable': !!stockInfo.industryTagId }"
            @click="goToTagBoard(stockInfo.industryTagId, stockInfo.industry)"
          >
            行业板块：{{ stockInfo.industry }}
          </el-tag>
          <el-tag
            size="small"
            :type="stockInfo.regionBoardTagId ? 'primary' : 'info'"
            :class="{ 'tag-item': true, 'is-clickable': !!stockInfo.regionBoardTagId }"
            @click="goToTagBoard(stockInfo.regionBoardTagId, stockInfo.regionBoard)"
          >
            地域板块：{{ stockInfo.regionBoard }}
          </el-tag>
          <el-tag size="small" type="info">上市日期：{{ stockInfo.listingDate }}</el-tag>
          <el-tag size="small" type="info">信息更新时间：{{ stockInfo.infoUpdatedAt }}</el-tag>
        </div>
        <div class="stock-capital-charts">
          <div class="capital-chart-card is-merged">
            <div class="capital-chart-head">
              <div class="capital-chart-title-wrap">
                <p class="capital-chart-title">流通结构</p>
              </div>
              <div class="capital-chart-badge">
                <span class="badge-label">流通占比</span>
                <transition name="number-flip" mode="out-in">
                  <span :key="`merged-${formatRatioText(mergedStructureChart.flowPercent)}`" class="badge-value">
                    {{ formatRatioText(mergedStructureChart.flowPercent) }}
                  </span>
                </transition>
              </div>
            </div>

            <div class="capital-stacked-track" role="img" :aria-label="`流通占比${formatRatioText(mergedStructureChart.flowPercent)}`">
              <div class="capital-stacked-segment is-flow" :style="{ width: `${mergedStructureChart.animatedFlowPercent}%` }"></div>
              <div class="capital-stacked-segment is-rest" :style="{ width: `${100 - mergedStructureChart.animatedFlowPercent}%` }"></div>
            </div>

            <div class="capital-chart-legend">
              <div class="legend-item">
                <span class="legend-dot is-flow"></span>
                <span class="legend-label">流通部分</span>
                <span class="legend-value">{{ formatRatioText(mergedStructureChart.flowPercent) }}</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot is-rest"></span>
                <span class="legend-label">非流通部分</span>
                <span class="legend-value">{{ formatRatioText(mergedStructureChart.restPercent) }}</span>
              </div>
            </div>

            <div class="capital-chart-metrics">
              <div class="metric-row">
                <span class="metric-kind">股本</span>
                <span class="metric-desc">{{ stockInfo.floatShares }} / {{ stockInfo.totalShares }}</span>
                <span class="metric-ratio">{{ formatRatioText(mergedStructureChart.shareFlowPercent) }}</span>
              </div>
              <div class="metric-row">
                <span class="metric-kind">市值</span>
                <span class="metric-desc">{{ stockInfo.floatMarketCap }} / {{ stockInfo.marketCap }}</span>
                <span class="metric-ratio">{{ formatRatioText(mergedStructureChart.marketCapFlowPercent) }}</span>
              </div>
            </div>

            <p v-if="mergedStructureChart.ratioDiffText" class="capital-chart-note">
              {{ mergedStructureChart.ratioDiffText }}
            </p>
          </div>
        </div>
      </div>

      <div class="stock-analysis-section stock-tabs-section">
        <h3 class="section-title">AI投资建议</h3>
        <div class="analysis-content" :class="{ 'is-loading': showEvaluationOverlay }">
          <div class="analysis-header">
            <div class="analysis-title">
              <div class="rating-display">
                <span :class="getEvaluationClass(displayedConclusion)">
                  {{ displayedConclusion }}
                </span>
              </div>
            </div>
            <div class="analysis-meta">
              <span class="analysis-date">分析日期：{{ analysisResult.date }}</span>
              <div class="analysis-actions">
                <el-button
                  size="small"
                  plain
                  class="history-capsule-btn"
                  @click="openHistoryDialog"
                  :loading="openingHistoryDialog"
                >
                  查看历史评价
                </el-button>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="refreshAIEvaluation" 
                  :loading="loadingEvaluation"
                  :disabled="loadingEvaluation"
                  class="refresh-btn">
                  <img v-if="!loadingEvaluation" src="@/assets/refresh.svg" alt="刷新" class="button-icon" />
                  刷新评测
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="evaluationErrorMessage" class="analysis-error-message">
            {{ evaluationErrorMessage }}
          </div>
          
          <div class="analysis-detail">
            <h4>核心逻辑</h4>
            <div class="markdown-content" v-html="displayedCoreLogic"></div>
          </div>

          <div class="analysis-detail">
            <h4>风险提示</h4>
            <div class="markdown-content" v-html="displayedRiskWarning"></div>
          </div>

          <div v-if="showEvaluationOverlay" class="analysis-loading-overlay" role="status" aria-live="polite" aria-label="AI投资建议生成中">
            <div class="star-loader" aria-hidden="true">
              <span class="star-core"></span>
              <span class="star-ring"></span>
              <span class="star-spark spark-one"></span>
              <span class="star-spark spark-two"></span>
              <span class="star-spark spark-three"></span>
              <span class="star-spark spark-four"></span>
            </div>
            <p class="analysis-loading-text">{{ evaluationProgressText || 'AI 正在生成投资建议...' }}</p>
          </div>

          <div v-if="loadingEvaluation && hasStreamDelta" class="analysis-stream-status" role="status" aria-live="polite">
            {{ evaluationProgressText || 'AI 正在生成投资建议...' }}
          </div>

          <a
            href="https://pollinations.ai/"
            target="_blank"
            rel="noopener noreferrer"
            class="analysis-powered-by"
          >
            <span>Powered by</span>
            <span class="analysis-powered-logo" aria-hidden="true">
              <img class="analysis-powered-logo-icon" src="/pollinations.svg" alt="" />
              <img class="analysis-powered-logo-text" src="/pollinations-text.svg" alt="" />
            </span>
          </a>
        </div>
      </div>

      <div class="stock-tabs-section">
        <h3 class="section-title">资讯汇聚</h3>
        <el-tabs v-model="activeTab">
          <el-tab-pane label="股票资讯" name="news">
            <div class="stock-news-list">
              <div v-for="(news, index) in stockNews" :key="index" class="news-item">
                <h4 @click="viewNewsDetail(news)" class="news-title">{{ news.title }}</h4>
                <p v-if="news.summary" class="news-summary">{{ news.summary }}</p>
                <div class="news-footer">
                  <a v-if="news.url" :href="news.url" target="_blank" rel="noopener noreferrer" class="news-link">
                    查看原文
                  </a>
                  <span class="news-time">{{ news.time }}</span>
                </div>
              </div>
              <el-empty v-if="stockNews.length === 0" description="暂无相关资讯" />
              <div v-if="stockNews.length > 0" class="news-actions">
                <el-button
                  type="primary"
                  plain
                  @click="loadMoreNews"
                  :disabled="!hasMoreNews"
                  :loading="loadingMoreNews"
                >
                  {{ hasMoreNews ? '加载更多' : '已加载全部' }}
                </el-button>
                <span class="news-total">已加载 {{ stockNews.length }}/{{ totalNews }}</span>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="业绩预测" name="forecast">
            <div class="forecast-content" v-loading="loadingForecast">
              <div class="forecast-toolbar">
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="refreshForecast"
                  :loading="loadingForecast"
                  :disabled="!isLoggedIn"
                  class="refresh-btn"
                >
                  <img v-if="!loadingForecast" src="@/assets/refresh.svg" alt="刷新" class="button-icon" />
                  刷新预测
                </el-button>
              </div>
              <div v-if="forecastData && (forecastData.symbol || forecastData['股票代码'])">
                
                <!-- 总结部分 -->
                <div class="forecast-summary-card">
                  <div class="summary-text">{{ forecastSummary }}</div>
                </div>

                <!-- 详细指标图表 -->
                <div v-if="hasForecastChartData" class="forecast-charts-container">
                   <div ref="forecastChartRef" class="forecast-chart"></div>
                </div>

                <!-- 机构预测详细列表 -->
                <!-- <div v-if="forecastData.业绩预测详表_机构 && forecastData.业绩预测详表_机构.length > 0">
                  <div class="forecast-list" :class="{ 'is-collapsed': !isForecastExpanded && forecastData.业绩预测详表_机构.length > 1 }">
                    <div v-for="(item, index) in forecastData.业绩预测详表_机构" :key="index" class="forecast-item">
                      <div class="forecast-header">
                        <div class="institution-info">
                          <span class="institution-name">{{ item.机构名称 }}</span>
                          <span class="researcher">{{ item.研究员 }}</span>
                        </div>
                        <span class="report-date">{{ item.报告日期 }}</span>
                      </div>
                      
                      <div class="forecast-details-grid">
                        <div class="forecast-col">
                          <div class="col-title">每股收益预测 (元)</div>
                          <div class="col-row" v-for="(val, key) in item['预测年报每股收益（元）']" :key="key">
                            <span class="year-label">{{ key.replace('预测', '') }}</span>
                            <span class="val-num">{{ val }}</span>
                          </div>
                        </div>
                        <div class="forecast-col">
                          <div class="col-title">净利润预测 (元)</div>
                          <div class="col-row" v-for="(val, key) in item['预测年报净利润（元）']" :key="key">
                            <span class="year-label">{{ key.replace('预测', '') }}</span>
                            <span class="val-num">{{ val }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div v-if="!isForecastExpanded && forecastData.业绩预测详表_机构.length > 1" class="expand-mask" @click="isForecastExpanded = true">
                       <span>展开全部 {{ forecastData.业绩预测详表_机构.length }} 家机构预测 <i class="el-icon-arrow-down"></i></span>
                    </div>
                  </div>
                  
                  <div v-if="isForecastExpanded" class="collapse-action" @click="isForecastExpanded = false">
                    <span>收起 <i class="el-icon-arrow-up"></i></span>
                  </div>
                </div>
                <el-empty v-else description="暂无机构预测详情"></el-empty> -->

              </div>
              <el-empty v-else-if="!loadingForecast" description="暂无业绩预测数据"></el-empty>
              
              <div class="forecast-footer">
                <a :href="`https://stockpage.10jqka.com.cn/${stockInfo.code}/worth/#forecast`" target="_blank" class="source-link">
                  <img src="https://s.thsi.cn/cd/news-p-fe-app-news-flow-home/home/_next/static/media/logo.1c8fc73f.png" alt="同花顺 Logo" class="source-logo">
                </a>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      
      <!-- 使用新的StockChart组件替代原来的股票图表部分 -->
      <StockChart :stockCode="stockInfo.code" />
      
      <div class="stock-data-section">
        <h3 class="section-title">交易数据</h3>
        <div class="data-grid">
          <div class="data-item is-key">
            <div class="metric-line">
              <span class="metric-label">最新价：</span>
              <span :class="['metric-value', priceTrendClass]">{{ stockInfo.price }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">均价：</span>
              <span class="metric-value">{{ stockInfo.avgPrice }}</span>
            </div>
          </div>
          <div class="data-item is-key">
            <div class="metric-line">
              <span class="metric-label">涨跌幅：</span>
              <span :class="['metric-value', priceTrendClass]">{{ formatSignedPercent(stockInfo.changePercent) }}</span>
            </div>
          </div>
          <div class="data-item is-key">
            <div class="metric-line">
              <span class="metric-label">涨跌额：</span>
              <span :class="['metric-value', priceTrendClass]">{{ formatSignedPrice(stockInfo.changeAmount) }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">成交量：</span>
              <span class="metric-value">{{ stockInfo.volume }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">成交额：</span>
              <span class="metric-value">{{ stockInfo.turnover }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">换手率：</span>
              <span class="metric-value">{{ stockInfo.turnoverRate }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">量比：</span>
              <span class="metric-value">{{ stockInfo.volumeRatio }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">最高价：</span>
              <span class="metric-value">{{ stockInfo.high }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">最低价：</span>
              <span class="metric-value">{{ stockInfo.low }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">今开价：</span>
              <span class="metric-value">{{ stockInfo.open }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">昨收价：</span>
              <span class="metric-value">{{ stockInfo.prevClose }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">涨停价：</span>
              <span class="metric-value">{{ stockInfo.limitUp }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">跌停价：</span>
              <span class="metric-value">{{ stockInfo.limitDown }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">外盘：</span>
              <span class="metric-value">{{ stockInfo.outerVolume }}</span>
            </div>
          </div>
          <div class="data-item">
            <div class="metric-line">
              <span class="metric-label">内盘：</span>
              <span class="metric-value">{{ stockInfo.innerVolume }}</span>
            </div>
          </div>
        </div>
        <div class="update-badge">最后更新：{{ stockInfo.lastUpdated }}</div>
      </div>
    </div>

    <el-dialog
      v-model="historyDialogVisible"
      :title="`${stockInfo.name || stockInfo.code} 历史AI评价`"
      width="min(860px, 96vw)"
      class="analysis-history-dialog"
    >
      <div class="analysis-history-content" v-loading="loadingHistory">
        <div v-if="historyErrorMessage" class="analysis-history-error">
          {{ historyErrorMessage }}
        </div>

        <template v-else>
          <div class="analysis-history-toolbar">
            <div class="analysis-history-summary">
              共 {{ historyPagination.total }} 条历史记录
            </div>
            <el-button size="small" plain @click="reloadHistoryPage" :loading="loadingHistory">
              重新加载
            </el-button>
          </div>

          <div class="analysis-history-timeline">
            <div class="history-timeline-head">
              <h4>评价强度时间轴</h4>
              <p>中性为 0，利好在上方，利空在下方，重大级别距离更远。</p>
            </div>
            <div v-if="historyRecords.length > 0" ref="historyTimelineChartRef" class="history-timeline-chart"></div>
            <el-empty v-else description="暂无时间轴数据" />
          </div>

          <div v-if="historyRecords.length > 0" class="analysis-history-list">
            <article
              v-for="(item, index) in historyRecords"
              :key="`${item.analysisTime}-${index}`"
              class="history-record-item"
            >
              <div class="history-record-head">
                <span class="history-record-time">{{ item.analysisTime || '--' }}</span>
                <div class="history-record-actions">
                  <span class="history-record-conclusion" :class="getHistoryConclusionClass(item.conclusion)">
                    {{ item.conclusion || '未知' }}
                  </span>
                  <el-button
                    size="small"
                    text
                    type="primary"
                    class="history-detail-btn"
                    @click="openHistoryDetail(item)"
                  >
                    查看详细
                  </el-button>
                </div>
              </div>
            </article>
          </div>

          <el-empty v-else description="暂无历史评价记录" />

          <div
            v-if="historyPagination.total > historyPagination.pageSize"
            class="analysis-history-pagination"
          >
            <el-pagination
              background
              layout="prev, pager, next"
              :current-page="historyPagination.page"
              :page-size="historyPagination.pageSize"
              :total="historyPagination.total"
              @current-change="handleHistoryPageChange"
            />
          </div>
        </template>
      </div>
    </el-dialog>

    <el-dialog
      v-model="historyDetailDialogVisible"
      title="历史AI评价详情"
      width="min(620px, 96vw)"
      class="analysis-history-detail-dialog"
    >
      <div v-if="selectedHistoryRecord" class="history-detail-content">
        <div class="history-detail-meta">
          <span class="history-detail-time">{{ selectedHistoryRecord.analysisTime || '--' }}</span>
          <span
            class="history-record-conclusion"
            :class="getHistoryConclusionClass(selectedHistoryRecord.conclusion)"
          >
            {{ selectedHistoryRecord.conclusion || '未知' }}
          </span>
        </div>
        <section class="history-detail-block">
          <h4>核心逻辑</h4>
          <p>{{ selectedHistoryRecord.coreLogic || '暂无核心逻辑' }}</p>
        </section>
        <section class="history-detail-block">
          <h4>风险提示</h4>
          <p>{{ selectedHistoryRecord.riskWarning || '暂无风险提示' }}</p>
        </section>
      </div>
      <el-empty v-else description="暂无评价详情" />
    </el-dialog>

    <el-dialog
      v-model="newsDetailDialogVisible"
      title="新闻详情"
      width="50%">
      <div v-if="currentNewsDetail">
        <h3>{{ currentNewsDetail.title }}</h3>
        <div class="news-detail-content">{{ currentNewsDetail.content }}</div>
        <div class="news-footer">
          <span class="news-source">{{ currentNewsDetail.source }}</span>
          <span class="news-time">{{ currentNewsDetail.publish_time }}</span>
        </div>
        <a
          v-if="currentNewsDetail.url"
          :href="currentNewsDetail.url"
          target="_blank"
          rel="noopener noreferrer"
          class="news-link"
        >
          查看原文
        </a>
      </div>
      <div v-else>
        <el-empty description="暂无新闻详情"></el-empty>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import MarkdownIt from 'markdown-it';
import StockChart from '@/components/StockChart.vue';
import 'element-plus/es/components/message/style/css';

// 引入 ECharts
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { 
  TitleComponent, 
  TooltipComponent, 
  LegendComponent, 
  GridComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册 ECharts 组件
echarts.use([
  LineChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
]);

export default {
  name: 'StockDetailView',
  components: {
    StockChart // 注册组件
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();

    // 确保stockInfo总是存在，即使默认值
    const stockInfo = ref({
      name: '加载中...',
      code: route.params.code || '',
      market: '', // 添加市场代码字段
      regionBoard: '--',
      regionBoardTagId: '',
      price: '--',
      avgPrice: '--',
      change: 0,
      changeAmount: '--',
      changePercent: '--',
      industry: '--',
      industryTagId: '',
      listingDate: '--',
      totalShares: '--',
      floatShares: '--',
      totalSharesValue: null,
      floatSharesValue: null,
      open: '--',
      prevClose: '--',
      high: '--',
      low: '--',
      limitUp: '--',
      limitDown: '--',
      volume: '--',
      turnover: '--',
      turnoverRate: '--',
      volumeRatio: '--',
      outerVolume: '--',
      innerVolume: '--',
      marketCap: '--',
      floatMarketCap: '--',
      marketCapValue: null,
      floatMarketCapValue: null,
      infoUpdatedAt: '--',
      lastUpdated: '--'
    });

    const activeTab = ref('news');
    const isLoggedIn = computed(() => store.getters.isLoggedIn);
    const isFavorite = ref(false);
    const addingToFavorites = ref(false);
    const stockNews = ref([]);
    const analysisResult = ref({
      conclusion: '',
      date: '',
      coreLogic: '',
      riskWarning: ''
    });

    const currentNewsDetail = ref(null);
    const newsDetailDialogVisible = ref(false);
    const forecastData = ref({});
    const forecastSummary = ref('');
    const loadingForecast = ref(false);
    const newsLimit = ref(5);
    const newsCursor = ref(0);
    const totalNews = ref(0);
    const loadingMoreNews = ref(false);

    const md = new MarkdownIt({
      breaks: true,
      linkify: true,
      typographer: true
    });

    const loadingEvaluation = ref(false);
    const evaluationErrorMessage = ref('');
    const evaluationProgressText = ref('');
    const evaluationStreamPreview = ref('');
    const streamedConclusion = ref('');
    const streamedCoreLogic = ref('');
    const streamedRiskWarning = ref('');
    const hasStreamDelta = ref(false);
    const showEvaluationOverlay = computed(() => loadingEvaluation.value && !hasStreamDelta.value);
    const isStreamingEvaluation = computed(() => loadingEvaluation.value && hasStreamDelta.value);

    const displayedConclusion = computed(() => {
      if (isStreamingEvaluation.value && streamedConclusion.value) {
        return streamedConclusion.value;
      }
      return analysisResult.value.conclusion || '加载中...';
    });

    const displayedCoreLogic = computed(() => {
      if (isStreamingEvaluation.value) {
        const streamText = streamedCoreLogic.value || 'AI 正在生成核心逻辑...';
        return md.render(streamText);
      }
      return analysisResult.value.coreLogic;
    });

    const displayedRiskWarning = computed(() => {
      if (isStreamingEvaluation.value) {
        const streamText = streamedRiskWarning.value || 'AI 正在生成风险提示...';
        return md.render(streamText);
      }
      return analysisResult.value.riskWarning;
    });

    const resetEvaluationStreamState = () => {
      evaluationProgressText.value = '';
      evaluationStreamPreview.value = '';
      streamedConclusion.value = '';
      streamedCoreLogic.value = '';
      streamedRiskWarning.value = '';
      hasStreamDelta.value = false;
    };

    const extractStreamField = (source, field, nextFields = []) => {
      if (!source) return '';
      const fieldPattern = new RegExp(`"${field}"\\s*:\\s*"`);
      const fieldMatch = fieldPattern.exec(source);
      if (!fieldMatch) return '';

      const start = fieldMatch.index + fieldMatch[0].length;
      let end = source.length;
      nextFields.forEach(nextField => {
        const nextIndex = source.indexOf(`"${nextField}"`, start);
        if (nextIndex !== -1 && nextIndex < end) {
          end = nextIndex;
        }
      });

      return source
        .slice(start, end)
        .replace(/",?\s*$/, '')
        .replace(/,\s*$/, '')
        .replace(/}\s*$/, '')
        .trim();
    };

    const syncStreamDraft = () => {
      const preview = evaluationStreamPreview.value;
      if (!preview) return;

      const jsonStart = preview.indexOf('{');
      const jsonEnd = preview.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const jsonText = preview.slice(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(jsonText);
          if (parsed && typeof parsed === 'object') {
            streamedConclusion.value = parsed['结论'] || streamedConclusion.value;
            streamedCoreLogic.value = parsed['核心逻辑'] || streamedCoreLogic.value;
            streamedRiskWarning.value = parsed['风险提示'] || streamedRiskWarning.value;
            return;
          }
        } catch (_) {
          // ignore JSON parse errors in partial stream chunks
        }
      }

      const conclusion = extractStreamField(preview, '结论', ['核心逻辑', '风险提示']);
      const coreLogic = extractStreamField(preview, '核心逻辑', ['风险提示']);
      const riskWarning = extractStreamField(preview, '风险提示', []);

      if (conclusion) streamedConclusion.value = conclusion;
      if (coreLogic) streamedCoreLogic.value = coreLogic;
      if (riskWarning) streamedRiskWarning.value = riskWarning;
    };

    const appendStreamPreview = (text) => {
      if (!text || typeof text !== 'string') return;
      const normalized = text
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      const merged = `${evaluationStreamPreview.value}${normalized}`;
      const maxLength = 3000;
      evaluationStreamPreview.value = merged.length > maxLength
        ? `...${merged.slice(-maxLength)}`
        : merged;
      syncStreamDraft();
    };

    const handleEvaluationStreamEvent = ({ event, data }) => {
      if (event === 'start') {
        evaluationProgressText.value = data?.message || '开始刷新个股评价...';
        return;
      }
      if (event === 'progress') {
        evaluationProgressText.value = data?.message || '正在生成投资建议...';
        return;
      }
      if (event === 'model.delta') {
        hasStreamDelta.value = true;
        evaluationProgressText.value = 'AI 正在生成投资建议...';
        const deltaText = typeof data === 'string' ? data : data?.content;
        appendStreamPreview(deltaText);
        return;
      }
      if (event === 'result') {
        evaluationProgressText.value = '正在整理评估结果...';
        return;
      }
      if (event === 'done') {
        evaluationProgressText.value = data?.message || '评估完成';
        return;
      }
      if (event === 'error') {
        evaluationProgressText.value = data?.message || '评估失败';
      }
    };

    const refreshAIEvaluation = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录后刷新评测');
        router.push('/login');
        return;
      }
      loadingEvaluation.value = true;
      await loadAIEvaluation(true); // 强制刷新时设置 refresh 为 true
      loadingEvaluation.value = false;
    };

    const formatDate = (date) => {
      if (!date) return '';
      try {
        const parsedDate = new Date(date);
        return parsedDate.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch (error) {
        console.error('日期格式化失败:', error);
        return date;
      }
    };

    const isForecastExpanded = ref(false);
    const forecastChartRef = ref(null);
    const historyTimelineChartRef = ref(null);
    const historyDialogVisible = ref(false);
    const historyDetailDialogVisible = ref(false);
    const openingHistoryDialog = ref(false);
    const loadingHistory = ref(false);
    const historyErrorMessage = ref('');
    const historyRecords = ref([]);
    const selectedHistoryRecord = ref(null);
    const historyPagination = ref({
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1
    });
    let forecastChartInstance = null;
    let historyTimelineChartInstance = null;

    const HISTORY_SCORE_MAP = Object.freeze({
      '重大利好': 2,
      '利好': 1,
      '中性': 0,
      '利空': -1,
      '重大利空': -2
    });

    const SCORE_LABEL_MAP = Object.freeze({
      2: '重大利好',
      1: '利好',
      0: '中性',
      '-1': '利空',
      '-2': '重大利空'
    });

    const normalizeAnalysisTimeText = (value) => {
      if (!value) return '';
      return String(value).replace('T', ' ').trim();
    };

    const formatHistoryAxisTime = (value) => {
      const normalized = normalizeAnalysisTimeText(value).replace(/\.\d+$/, '');
      if (!normalized) return '--';
      const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/);
      if (!match) return normalized;
      return `${match[2]}-${match[3]} ${match[4]}`;
    };

    const toAnalysisTimestamp = (value) => {
      const normalized = normalizeAnalysisTimeText(value).replace(/\.\d+$/, '');
      if (!normalized) return 0;
      const parsed = Date.parse(normalized.replace(' ', 'T'));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const getHistoryScore = (conclusion) => {
      const text = String(conclusion || '').trim();
      if (!text) return 0;
      if (Object.prototype.hasOwnProperty.call(HISTORY_SCORE_MAP, text)) {
        return HISTORY_SCORE_MAP[text];
      }
      if (text.includes('重大利好')) return 2;
      if (text.includes('利好')) return 1;
      if (text.includes('重大利空')) return -2;
      if (text.includes('利空')) return -1;
      if (text.includes('中性')) return 0;
      return 0;
    };

    const getHistoryScoreColor = (score) => {
      if (score >= 2) return '#b42318';
      if (score > 0) return '#dc2626';
      if (score <= -2) return '#166534';
      if (score < 0) return '#15803d';
      return '#64748b';
    };

    const getHistoryConclusionClass = (conclusion) => {
      const score = getHistoryScore(conclusion);
      if (score >= 2) return 'is-strong-bull';
      if (score > 0) return 'is-bull';
      if (score <= -2) return 'is-strong-bear';
      if (score < 0) return 'is-bear';
      return 'is-neutral';
    };

    const disposeHistoryTimelineChart = () => {
      if (historyTimelineChartInstance) {
        historyTimelineChartInstance.dispose();
        historyTimelineChartInstance = null;
      }
    };

    const renderHistoryTimelineChart = () => {
      if (!historyTimelineChartRef.value || historyRecords.value.length === 0) {
        disposeHistoryTimelineChart();
        return;
      }

      const timelineRows = [...historyRecords.value]
        .map(item => ({
          ...item,
          analysisTime: normalizeAnalysisTimeText(item.analysisTime),
          score: getHistoryScore(item.conclusion)
        }))
        .sort((a, b) => toAnalysisTimestamp(a.analysisTime) - toAnalysisTimestamp(b.analysisTime));

      disposeHistoryTimelineChart();
      historyTimelineChartInstance = echarts.init(historyTimelineChartRef.value);

      historyTimelineChartInstance.setOption({
        grid: {
          left: 58,
          right: 20,
          top: 18,
          bottom: 62
        },
        tooltip: {
          trigger: 'item',
          confine: true,
          formatter: (params) => {
            const data = params?.data || {};
            const score = Number(data.value) || 0;
            const scoreLabel = SCORE_LABEL_MAP[score] || data.conclusion || '中性';
            return [
              `<strong>${data.analysisTime || '--'}</strong>`,
              `评级：${data.conclusion || '未知'}`,
              `强度：${scoreLabel}`
            ].join('<br/>');
          }
        },
        xAxis: {
          type: 'category',
          data: timelineRows.map(item => formatHistoryAxisTime(item.analysisTime)),
          axisTick: { alignWithLabel: true },
          axisLabel: {
            color: '#64748b',
            interval: timelineRows.length > 12 ? 1 : 0,
            rotate: timelineRows.length > 6 ? 24 : 0
          },
          axisLine: {
            lineStyle: {
              color: '#cbd5e1'
            }
          }
        },
        yAxis: {
          type: 'value',
          min: -2,
          max: 2,
          interval: 1,
          axisLabel: {
            formatter: (value) => SCORE_LABEL_MAP[value] || value,
            color: '#64748b'
          },
          splitLine: {
            lineStyle: {
              color: '#e2e8f0',
              type: 'dashed'
            }
          },
          axisLine: {
            lineStyle: {
              color: '#cbd5e1'
            }
          }
        },
        series: [
          {
            type: 'line',
            smooth: false,
            symbol: 'circle',
            symbolSize: 10,
            lineStyle: {
              color: '#94a3b8',
              width: 2
            },
            data: timelineRows.map(item => ({
              value: item.score,
              analysisTime: item.analysisTime,
              conclusion: item.conclusion,
              itemStyle: {
                color: getHistoryScoreColor(item.score),
                borderColor: '#ffffff',
                borderWidth: 1.5
              }
            })),
            markLine: {
              symbol: 'none',
              silent: true,
              label: { show: false },
              lineStyle: {
                color: '#94a3b8',
                width: 1,
                type: 'dashed'
              },
              data: [{ yAxis: 0 }]
            }
          }
        ]
      });
    };

    const loadEvaluationHistory = async (page = 1) => {
      if (!stockInfo.value.code) return;
      loadingHistory.value = true;
      historyErrorMessage.value = '';

      try {
        const response = await store.dispatch('fetchStockEvaluationHistory', {
          stockCode: stockInfo.value.code,
          page,
          pageSize: historyPagination.value.pageSize
        });

        historyRecords.value = Array.isArray(response?.history) ? response.history : [];
        historyPagination.value = {
          page: Number(response?.page) || page,
          pageSize: Number(response?.pageSize) || historyPagination.value.pageSize,
          total: Number(response?.total) || historyRecords.value.length,
          totalPages: Number(response?.totalPages) || 1
        };

        await nextTick();
        renderHistoryTimelineChart();
      } catch (error) {
        console.error('加载历史评价失败:', error);
        historyRecords.value = [];
        historyErrorMessage.value = error?.message || '加载历史评价失败，请稍后重试。';
        disposeHistoryTimelineChart();
      } finally {
        loadingHistory.value = false;
      }
    };

    const openHistoryDialog = async () => {
      historyDialogVisible.value = true;
      historyDetailDialogVisible.value = false;
      selectedHistoryRecord.value = null;
      openingHistoryDialog.value = true;
      await loadEvaluationHistory(1);
      openingHistoryDialog.value = false;
    };

    const openHistoryDetail = (record) => {
      selectedHistoryRecord.value = record
        ? {
            analysisTime: record.analysisTime || '',
            conclusion: record.conclusion || '',
            coreLogic: record.coreLogic || '',
            riskWarning: record.riskWarning || ''
          }
        : null;
      historyDetailDialogVisible.value = !!record;
    };

    const reloadHistoryPage = async () => {
      await loadEvaluationHistory(historyPagination.value.page || 1);
    };

    const handleHistoryPageChange = async (page) => {
      await loadEvaluationHistory(page);
    };

    const hasForecastChartData = computed(() => {
      const details = forecastData.value?.['业绩预测详表_详细指标预测'];
      return Array.isArray(details) && details.length > 0;
    });

    const hasMoreNews = computed(() => totalNews.value > stockNews.value.length);

    const parseChinaTimeToUnix = (timeText) => {
      if (!timeText || typeof timeText !== 'string') return 0;
      const match = timeText.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (!match) return 0;
      const [, year, month, day, hour, minute, second] = match;
      return Math.floor(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour) - 8,
          Number(minute),
          Number(second)
        ) / 1000
      );
    };

    const normalizeStockNewsItem = (item) => {
      const content = item.内容 || item.content || '';
      return {
        id: item.ID || item.id || `${item.标题 || item.title || ''}-${item.时间 || item.time || ''}`,
        title: item.标题 || item.title || '',
        summary: content,
        content,
        url: item.链接 || item.url || '',
        time: item.时间 || item.time || ''
      };
    };

    const generateForecastSummary = () => {
      if (forecastData.value && forecastData.value.摘要) {
        forecastSummary.value = forecastData.value.摘要;
        return;
      }

      if (!forecastData.value || !forecastData.value['预测年报每股收益']) return;
      
      const epsList = forecastData.value['预测年报每股收益'];
      const profitList = forecastData.value['预测年报净利润'];
      const detailIndicators = forecastData.value['业绩预测详表_详细指标预测'];
      
      if (!epsList || epsList.length === 0) return;
      
      const firstYearEPS = epsList[0];
      const year = firstYearEPS['年度'];
      const orgCount = firstYearEPS['预测机构数'];
      const meanEPS = parseFloat(firstYearEPS['均值']);
      
      let profitMean = '--';
      let profitGrowth = '';
      let epsGrowth = '';

      // 获取净利润均值
      if (profitList && profitList.length > 0) {
        const pItem = profitList.find(p => p['年度'] === year);
        if (pItem) {
          profitMean = parseFloat(pItem['均值']);
        }
      }

      // 从详细指标预测中获取增长率
      if (detailIndicators && Array.isArray(detailIndicators)) {
         // 获取净利润增长率
         const profitGrowthItem = detailIndicators.find(item => item['预测指标'] === '净利润增长率');
         if (profitGrowthItem) {
             const key = `预测${year}-平均`;
             if (profitGrowthItem[key]) {
                 profitGrowth = parseFloat(profitGrowthItem[key].replace('%', ''));
             }
         }
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      let summary = `截至${today}，6个月以内共有 ${orgCount} 家机构对${stockInfo.value.name}的${year}年度业绩作出预测；预测${year}年每股收益 ${meanEPS} 元`;
      
      if (epsGrowth) {
        const epsGrowthNum = parseFloat(epsGrowth);
        const direction = epsGrowthNum >= 0 ? '增长' : '减少';
        summary += `，较去年同比${direction} ${Math.abs(epsGrowthNum)}%`;
      }
      
      summary += `，预测${year}年净利润 ${profitMean} 亿元`;
      
      if (profitGrowth !== '') {
         const profitGrowthNum = parseFloat(profitGrowth);
         const direction = profitGrowthNum >= 0 ? '增长' : '减少';
         summary += `，较去年同比${direction} ${Math.abs(profitGrowthNum)}%`;
      }

      forecastSummary.value = summary;
    };

    const renderForecastChart = () => {
      if (!forecastData.value || !forecastData.value['业绩预测详表_详细指标预测'] || !forecastChartRef.value) return;
      
      if (forecastChartInstance) {
        forecastChartInstance.dispose();
      }
      forecastChartInstance = echarts.init(forecastChartRef.value);
      
      const details = forecastData.value['业绩预测详表_详细指标预测'];
      if (!details || details.length === 0) return;
      
      // 解析年份
      const firstRow = details[0];
      const yearKeys = Object.keys(firstRow).filter(k => k.includes('实际值') || k.includes('平均')).sort();
      const years = yearKeys.map(k => {
        const match = k.match(/(\d{4})/);
        return match ? match[1] : k;
      });

      // 提取数据的辅助函数
      const getSeriesData = (indicatorName) => {
        const row = details.find(item => item['预测指标'].includes(indicatorName));
        if (!row) return new Array(years.length).fill(0);
        return yearKeys.map(key => {
          let val = row[key];
          if (!val || val === '--') return 0;
          
          // 移除逗号，处理数值
          let num = parseFloat(val.replace(/,/g, ''));
          
          // 统一转换为"亿"为单位
          if (val.includes('万')) {
            return num / 10000;
          }
          
          return num;
        });
      };

      const revenueData = getSeriesData('营业收入(元)');
      const netProfitData = getSeriesData('净利润(元)');
      const netProfitGrowthData = getSeriesData('净利润增长率');
      const revenueGrowthData = getSeriesData('营业收入增长率');
      const roeData = getSeriesData('净资产收益率');
      const peData = getSeriesData('市盈率(动态)');

      // 计算堆叠图的"剩余"部分 (营业收入 - 净利润)
      const revenueRemainderData = revenueData.map((rev, i) => {
        const profit = netProfitData[i] || 0;
        return Math.max(0, rev - profit);
      });

      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: function (params) {
            let res = params[0].name + '<br/>';
            params.forEach(param => {
              if (param.seriesName === '营业收入(剩余)') return; // 不显示辅助的剩余部分
              let val = param.value;
              if (param.seriesName.includes('增长率') || param.seriesName.includes('收益率')) {
                val = val + '%';
              } else if (param.seriesName.includes('利润') || param.seriesName.includes('收入')) {
                val = val + '亿';
              }
              // 如果是堆叠的净利润，显示出来
              // 如果是总营业收入，我们可以手动计算或者只显示净利润和"营业收入"（这里堆叠了所以需要特殊处理tooltip）
              // 为了简单，我们只显示净利润和营业收入（总额）
              
              if (param.seriesName === '净利润') {
                 res += `${param.marker} ${param.seriesName}: ${val}<br/>`;
                 // 找到对应的营业收入总额
                 const totalRev = revenueData[params[0].dataIndex];
                 res += `${param.marker} 营业收入: ${totalRev}亿<br/>`;
              } else {
                 res += `${param.marker} ${param.seriesName}: ${val}<br/>`;
              }
            });
            return res;
          }
        },
        legend: {
          data: ['净利润', '净利润增长率', '营业收入增长率', '净资产收益率', '市盈率'],
          bottom: 0
        },
        grid: [
          { left: '3%', right: '55%', top: '15%', bottom: '10%', containLabel: true },
          { left: '55%', right: '3%', top: '15%', bottom: '10%', containLabel: true }
        ],
        xAxis: [
          { type: 'category', data: years, gridIndex: 0 },
          { type: 'category', data: years, gridIndex: 1 }
        ],
        yAxis: [
          // 左图 Y轴
          { 
            type: 'value', 
            name: '金额(亿)', 
            gridIndex: 0,
            splitLine: { show: false }
          },
          { 
            type: 'value', 
            name: '增长率(%)', 
            gridIndex: 0,
            splitLine: { show: false }
          },
          // 右图 Y轴
          { 
            type: 'value', 
            gridIndex: 1,
            splitLine: { show: true, lineStyle: { type: 'dashed' } }
          }
        ],
        series: [
          // 左图
          {
            name: '净利润',
            type: 'bar',
            stack: 'revenue',
            data: netProfitData,
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: { color: '#409EFF' }
          },
          {
            name: '营业收入(剩余)',
            type: 'bar',
            stack: 'revenue',
            data: revenueRemainderData,
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: { color: '#a0cfff' },
            tooltip: { show: false } // 隐藏这个辅助系列的tooltip
          },
          {
            name: '净利润增长率',
            type: 'line',
            data: netProfitGrowthData,
            xAxisIndex: 0,
            yAxisIndex: 1,
            itemStyle: { color: '#E6A23C' }
          },
          // 右图
          {
            name: '营业收入增长率',
            type: 'line',
            data: revenueGrowthData,
            xAxisIndex: 1,
            yAxisIndex: 2,
            itemStyle: { color: '#67C23A' }
          },
          {
            name: '净资产收益率',
            type: 'line',
            data: roeData,
            xAxisIndex: 1,
            yAxisIndex: 2,
            itemStyle: { color: '#F56C6C' }
          },
          {
            name: '市盈率',
            type: 'line',
            data: peData,
            xAxisIndex: 1,
            yAxisIndex: 2,
            itemStyle: { color: '#909399' }
          }
        ]
      };
      
      forecastChartInstance.setOption(option);
    };

    const loadForecast = async (refresh = false) => {
      if (loadingForecast.value) return;
      loadingForecast.value = true;
      try {
        const responseList = await store.dispatch('fetchStockForecast', {
          stockCode: stockInfo.value.code,
          refresh
        });
        
        if (responseList && (responseList.symbol || responseList['股票代码'])) { 
           forecastData.value = responseList;
           generateForecastSummary();
           // 等待DOM更新后渲染图表
           setTimeout(() => {
             renderForecastChart();
           }, 0);
        } else {
           forecastData.value = {};
           forecastSummary.value = '';
        }
      } catch (error) {
        console.error('获取业绩预测失败:', error);
        forecastData.value = {};
      } finally {
        loadingForecast.value = false;
      }
    };

    const refreshForecast = async () => {
      if (!isLoggedIn.value) return;
      await loadForecast(true);
    };

    const loadNewsAndAnalysis = async (append = false) => {
      const requestLastTime = append ? newsCursor.value : 0;
      if (append) {
        loadingMoreNews.value = true;
      }

      try {
        const newsData = await store.dispatch('fetchStockNews', {
          stockCode: stockInfo.value.code,
          limit: newsLimit.value,
          lastTime: requestLastTime
        });

        const previousCount = stockNews.value.length;
        const incomingNews = (newsData?.list || []).map(normalizeStockNewsItem);
        if (!append) {
          stockNews.value = incomingNews;
        } else if (incomingNews.length > 0) {
          const merged = [...stockNews.value, ...incomingNews];
          const seen = new Set();
          stockNews.value = merged.filter(item => {
            const key = `${item.id}-${item.time}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }

        totalNews.value = Number(newsData?.total || stockNews.value.length);
        if (append && stockNews.value.length === previousCount) {
          totalNews.value = stockNews.value.length;
        }
        if (incomingNews.length > 0) {
          const lastItem = incomingNews[incomingNews.length - 1];
          const nextCursor = parseChinaTimeToUnix(lastItem.time);
          if (nextCursor > 0) {
            newsCursor.value = nextCursor;
          }
        }
        lastNewsUpdate.value = new Date();
      } catch (error) {
        console.error('获取股票新闻失败:', error);
        if (!append) {
          stockNews.value = [];
          totalNews.value = 0;
          newsCursor.value = 0;
        }
      } finally {
        if (append) {
          loadingMoreNews.value = false;
        }
      }
    };

    const loadMoreNews = async () => {
      if (!hasMoreNews.value || loadingMoreNews.value) return;
      await loadNewsAndAnalysis(true);
    };
    
    const loadAIEvaluation = async (refresh = false) => {
      evaluationErrorMessage.value = '';
      resetEvaluationStreamState();
      evaluationProgressText.value = refresh
        ? '正在连接流式评估服务...'
        : '正在获取AI评估结果...';
      try {
        const evaluation = await store.dispatch('fetchStockEvaluation', {
          stockCode: stockInfo.value.code,
          refresh,
          stream: true,
          onStreamEvent: handleEvaluationStreamEvent
        });

        if (evaluation) {
          analysisResult.value = {
            conclusion: evaluation.conclusion || '未知',
            date: evaluation.analysisTime || '--',
            coreLogic: md.render(evaluation.coreLogic || '暂无核心逻辑'),
            riskWarning: md.render(evaluation.riskWarning || '暂无风险提示')
          };
        } else {
          analysisResult.value = {
            conclusion: '未知',
            date: '--',
            coreLogic: '暂无AI评估数据',
            riskWarning: '无法获取AI评估结果，请稍后再试。'
          };
        }
      } catch (error) {
        console.error('获取股票AI评估失败:', error);
        evaluationErrorMessage.value = error?.message || '获取AI评估结果时发生错误，请稍后再试。';
        analysisResult.value = {
          conclusion: '获取失败',
          date: '--',
          coreLogic: 'AI评估数据获取失败',
          riskWarning: '获取AI评估结果时发生错误，请稍后再试。'
        };
      } finally {
        loadingEvaluation.value = false;
        resetEvaluationStreamState();
      }
    };

    const toNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      const normalized = String(value).replace(/,/g, '').trim();
      if (!normalized) return null;
      const unitMatch = normalized.match(/^(-?\d+(?:\.\d+)?)(?:\s*)(亿|万)?(?:股|元|%)?$/);
      if (unitMatch) {
        const base = Number(unitMatch[1]);
        if (!Number.isFinite(base)) return null;
        const unit = unitMatch[2];
        if (unit === '亿') return base * 1e8;
        if (unit === '万') return base * 1e4;
        return base;
      }
      const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    };

    const formatListingDate = (value) => {
      const text = value === null || value === undefined ? '' : String(value).trim();
      if (!text) return '--';
      if (/^\d{8}$/.test(text)) {
        return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
      }
      return text;
    };

    const formatScaledValue = (value, suffix = '') => {
      const num = toNumber(value);
      if (num === null) {
        return typeof value === 'string' && value.trim() ? value : '--';
      }
      const abs = Math.abs(num);
      if (abs >= 1e8) return `${(num / 1e8).toFixed(2)}亿${suffix}`;
      if (abs >= 1e4) return `${(num / 1e4).toFixed(2)}万${suffix}`;
      return `${num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}${suffix}`;
    };

    const formatPrice = (value) => {
      const num = toNumber(value);
      return num === null ? '--' : num.toFixed(2);
    };

    const formatPercentValue = (value) => {
      const num = toNumber(value);
      return num === null ? '--' : num.toFixed(2);
    };

    const formatPercentText = (value) => {
      const num = toNumber(value);
      return num === null ? '--' : `${num.toFixed(2)}%`;
    };

    const normalizeTagCode = (value) => {
      const code = String(value || '').trim().toUpperCase();
      return /^BK\d{4}$/.test(code) ? code : '';
    };

    const goToTagBoard = (tagCode, tagName = '') => {
      const normalizedTagCode = normalizeTagCode(tagCode);
      if (!normalizedTagCode) return;
      const query = {};
      const readableName = String(tagName || '').trim();
      if (readableName && readableName !== '--') {
        query.name = readableName;
      }
      router.push({
        name: 'TagView',
        params: { tagCode: normalizedTagCode },
        query
      });
    };

    const formatSignedPercent = (value) => {
      const num = toNumber(value);
      if (num === null) return '--';
      return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
    };

    const formatSignedPrice = (value) => {
      const num = toNumber(value);
      if (num === null) return '--';
      return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
    };

    const clampPercent = (value) => {
      if (!Number.isFinite(value)) return 0;
      return Math.min(100, Math.max(0, value));
    };

    const calcFlowPercent = (flowValue, totalValue) => {
      const total = toNumber(totalValue);
      const flow = toNumber(flowValue);
      if (total === null || total <= 0 || flow === null || flow < 0) return null;
      return clampPercent((Math.min(flow, total) / total) * 100);
    };

    const formatRatioText = (value) => {
      if (!Number.isFinite(value)) return '--';
      return `${clampPercent(value).toFixed(2)}%`;
    };

    const shareFlowPercent = computed(() => (
      calcFlowPercent(stockInfo.value.floatSharesValue, stockInfo.value.totalSharesValue)
    ));

    const marketCapFlowPercent = computed(() => (
      calcFlowPercent(stockInfo.value.floatMarketCapValue, stockInfo.value.marketCapValue)
    ));

    const mergedFlowPercent = computed(() => {
      const ratios = [shareFlowPercent.value, marketCapFlowPercent.value]
        .filter(value => Number.isFinite(value));
      if (ratios.length === 0) return null;
      if (ratios.length === 1) return ratios[0];
      return ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
    });

    const ratioDiffPercent = computed(() => {
      if (!Number.isFinite(shareFlowPercent.value) || !Number.isFinite(marketCapFlowPercent.value)) {
        return null;
      }
      return Math.abs(shareFlowPercent.value - marketCapFlowPercent.value);
    });

    const animatedFlowRatio = ref(0);
    const hasPlayedFlowAnimation = ref(false);
    let flowAnimationFrameA = null;
    let flowAnimationFrameB = null;

    const cancelFlowAnimationFrames = () => {
      if (typeof window === 'undefined' || typeof window.cancelAnimationFrame !== 'function') return;
      if (flowAnimationFrameA !== null) {
        window.cancelAnimationFrame(flowAnimationFrameA);
        flowAnimationFrameA = null;
      }
      if (flowAnimationFrameB !== null) {
        window.cancelAnimationFrame(flowAnimationFrameB);
        flowAnimationFrameB = null;
      }
    };

    const updateFlowAnimation = (percentValue) => {
      const nextValue = clampPercent(percentValue);
      cancelFlowAnimationFrames();

      if (!hasPlayedFlowAnimation.value) {
        animatedFlowRatio.value = 0;
        const applyTarget = () => {
          animatedFlowRatio.value = nextValue;
          hasPlayedFlowAnimation.value = true;
        };

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          flowAnimationFrameA = window.requestAnimationFrame(() => {
            flowAnimationFrameB = window.requestAnimationFrame(applyTarget);
          });
        } else {
          setTimeout(applyTarget, 16);
        }
        return;
      }

      animatedFlowRatio.value = nextValue;
    };

    watch(mergedFlowPercent, (nextPercent) => {
      updateFlowAnimation(Number.isFinite(nextPercent) ? nextPercent : 0);
    }, { immediate: true });

    const mergedStructureChart = computed(() => {
      const flowPercent = mergedFlowPercent.value;
      const restPercent = Number.isFinite(flowPercent) ? clampPercent(100 - flowPercent) : null;
      const diff = ratioDiffPercent.value;

      return {
        flowPercent,
        restPercent,
        animatedFlowPercent: animatedFlowRatio.value,
        shareFlowPercent: shareFlowPercent.value,
        marketCapFlowPercent: marketCapFlowPercent.value,
        ratioDiffText: Number.isFinite(diff) && diff >= 0.3
          ? `股本口径与市值口径占比偏差 ${diff.toFixed(2)}%，已按均值展示`
          : ''
      };
    });

    const priceTrendClass = computed(() => {
      if (stockInfo.value.change > 0) return 'trend-up';
      if (stockInfo.value.change < 0) return 'trend-down';
      return 'trend-flat';
    });

    const loadStockData = async () => {
      try {
        const snapshot = await store.dispatch('fetchStockSnapshot', stockInfo.value.code);

        if (snapshot) {
          const info = snapshot.info || {};
          const quote = snapshot.quote || {};

          const latestPriceNum = toNumber(quote.最新价 ?? quote.最新价格 ?? quote.price ?? quote.latest_price);
          const avgPriceNum = toNumber(quote.均价 ?? quote.avg_price);
          const changePercentNum = toNumber(quote.涨跌幅 ?? quote.change_percent);
          const changeAmountNum = toNumber(quote.涨跌额 ?? quote.change_amount);
          const changeNum = changeAmountNum !== null
            ? changeAmountNum
            : (latestPriceNum !== null && changePercentNum !== null ? latestPriceNum * changePercentNum / 100 : 0);

          stockInfo.value = {
            ...stockInfo.value,
            name: info.股票简称 || quote.股票简称 || stockInfo.value.name || '未知',
            code: info.股票代码 || quote.股票代码 || stockInfo.value.code,
            market: info.市场代码 || quote.市场代码 || stockInfo.value.market || '',
            regionBoard: info.地域板块 || '--',
            regionBoardTagId: normalizeTagCode(info.地域板块ID),
            price: formatPrice(latestPriceNum),
            avgPrice: formatPrice(avgPriceNum),
            change: changeNum,
            changeAmount: formatPrice(changeAmountNum),
            changePercent: formatPercentValue(changePercentNum),
            industry: info.所属行业 || '未知行业',
            industryTagId: normalizeTagCode(info.行业板块ID),
            listingDate: formatListingDate(info.上市时间),
            totalShares: formatScaledValue(info.总股本, '股'),
            floatShares: formatScaledValue(info.流通股, '股'),
            totalSharesValue: toNumber(info.总股本),
            floatSharesValue: toNumber(info.流通股),
            open: formatPrice(quote.今开价 ?? quote.今开 ?? quote.开盘价 ?? quote.open),
            prevClose: formatPrice(quote.昨收价 ?? quote.昨收 ?? quote.prev_close),
            high: formatPrice(quote.最高价 ?? quote.最高 ?? quote.high),
            low: formatPrice(quote.最低价 ?? quote.最低 ?? quote.low),
            limitUp: formatPrice(quote.涨停价 ?? quote.limit_up),
            limitDown: formatPrice(quote.跌停价 ?? quote.limit_down),
            volume: formatScaledValue(quote.成交量 ?? quote.volume),
            turnover: formatScaledValue(quote.成交额 ?? quote.turnover, '元'),
            turnoverRate: formatPercentText(quote.换手率 ?? quote.turnover_rate),
            volumeRatio: formatPrice(quote.量比 ?? quote.volume_ratio),
            outerVolume: formatScaledValue(quote.外盘 ?? quote.outer_volume),
            innerVolume: formatScaledValue(quote.内盘 ?? quote.inner_volume),
            marketCap: formatScaledValue(info.总市值, '元'),
            floatMarketCap: formatScaledValue(info.流通市值, '元'),
            marketCapValue: toNumber(info.总市值),
            floatMarketCapValue: toNumber(info.流通市值),
            infoUpdatedAt: snapshot.infoUpdatedAt || '--',
            lastUpdated: quote.更新时间 || quote.时间 || quote.update_time || snapshot.quoteUpdatedAt || '--'
          };

          document.title = `${stockInfo.value.name}(${stockInfo.value.market || '未知'}${stockInfo.value.code}) - AI StockLink`;

          // 更新最后价格更新时间
          lastPriceUpdate.value = new Date();
        } else {
          ElMessage.error('获取股票数据失败');
        }
      } catch (error) {
        console.error('加载股票数据异常:', error);
        ElMessage.error('获取股票数据失败');
      }
    };

    const checkIfFavorite = () => {
      const favoriteStocks = store.getters.favoriteStocks || [];
      isFavorite.value = favoriteStocks.some(stock => stock.code === stockInfo.value.code);
    };

    const toggleFavorite = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录');
        router.push('/login');
        return;
      }

      addingToFavorites.value = true;
      
      try {
        if (isFavorite.value) {
          // 取消关注
          const result = await store.dispatch('removeFavoriteStocks', [stockInfo.value.code]);
          if (result) {
            ElMessage.success(`已将 ${stockInfo.value.name} 从自选股中移除`);
            isFavorite.value = false;
          } else {
            ElMessage.error(`移除 ${stockInfo.value.name} 失败`);
          }
        } else {
          // 添加关注
          const result = await store.dispatch('addFavoriteStocks', [
            { code: stockInfo.value.code, name: stockInfo.value.name }
          ]);
          
          if (result) {
            ElMessage.success(`成功添加 ${stockInfo.value.name} 到自选股`);
            isFavorite.value = true;
          } else {
            ElMessage.error(`添加 ${stockInfo.value.name} 到自选股失败`);
          }
        }
        // 刷新自选股列表
      } catch (error) {
        console.error('操作自选股失败:', error);
        ElMessage.error('操作失败，请稍后再试');
      } finally {
        addingToFavorites.value = false;
      }
    };

    const getEvaluationClass = (conclusion) => {
      if (!conclusion) return '';
      
      if (['看多', '强烈看多', '买入', '利好'].includes(conclusion)) {
        return 'rating-buy';
      } else if (['重大利好'].includes(conclusion)) {
        return 'rating-strong-buy';
      } else if (['看空', '强烈看空', '卖出', '利空'].includes(conclusion)) {
        return 'rating-sell';
      } else if (['重大利空'].includes(conclusion)) {
        return 'rating-strong-sell';
      } else if (['中性', '观望', '持有'].includes(conclusion)) {
        return 'rating-hold';
      }
      return '';
    };

    const viewNewsDetail = (news) => {
      if (!news) return;
      currentNewsDetail.value = {
        title: news.title || '',
        content: news.content || news.summary || '',
        source: '财联社',
        publish_time: news.time || '',
        url: news.url || ''
      };
      newsDetailDialogVisible.value = true;
    };

    // 定时器相关
    const priceUpdateTimer = ref(null); // 价格更新定时器
    const newsUpdateTimer = ref(null);  // 新闻更新定时器
    const lastPriceUpdate = ref(new Date()); // 最后价格更新时间
    const lastNewsUpdate = ref(new Date()); // 最后新闻更新时间

    // 设置自动刷新定时器
    const setupAutoRefresh = () => {
      // 清除现有的定时器（如果有）
      clearAutoRefreshTimers();
      
      // 价格数据每5分钟更新一次（300000毫秒）
      priceUpdateTimer.value = setInterval(() => {
        console.log('[AUTO] 5分钟定时更新价格数据');
        loadStockData();
      }, 5 * 60 * 1000); // 5分钟
      
      // 新闻每10分钟更新一次（600000毫秒）
      newsUpdateTimer.value = setInterval(() => {
        console.log('[AUTO] 10分钟定时更新新闻数据');
        loadNewsAndAnalysis();
      }, 10 * 60 * 1000); // 10分钟
    };
    
    // 清除所有定时器
    const clearAllTimers = () => {
      clearAutoRefreshTimers();
    };
    
    // 清除自动刷新定时器
    const clearAutoRefreshTimers = () => {
      if (priceUpdateTimer.value) {
        clearInterval(priceUpdateTimer.value);
        priceUpdateTimer.value = null;
      }
      
      if (newsUpdateTimer.value) {
        clearInterval(newsUpdateTimer.value);
        newsUpdateTimer.value = null;
      }
    };

    const handleWindowResize = () => {
      if (forecastChartInstance) {
        forecastChartInstance.resize();
      }
      if (historyTimelineChartInstance) {
        historyTimelineChartInstance.resize();
      }
    };

    // 当路由中的股票代码改变时触发重新加载
    watch(() => route.params.code, (newCode) => {
      if (newCode && newCode !== stockInfo.value.code) {
        stockInfo.value.code = newCode;
        stockNews.value = [];
        totalNews.value = 0;
        newsCursor.value = 0;
        historyDialogVisible.value = false;
        historyDetailDialogVisible.value = false;
        historyErrorMessage.value = '';
        historyRecords.value = [];
        selectedHistoryRecord.value = null;
        historyPagination.value = {
          page: 1,
          pageSize: historyPagination.value.pageSize,
          total: 0,
          totalPages: 1
        };
        disposeHistoryTimelineChart();
        
        loadStockData();
        loadNewsAndAnalysis();
        loadingEvaluation.value = true;
        loadAIEvaluation(false);
        
        // 重新设置自动刷新定时器
        setupAutoRefresh();
        
        // 重置滚动位置到顶部
        window.scrollTo(0, 0);
      }
    });

    watch(activeTab, (newTab) => {
      if (newTab === 'forecast') {
        loadForecast();
      }
    });

    watch(isLoggedIn, async (loggedIn) => {
      if (loggedIn) {
        checkIfFavorite();
        loadingEvaluation.value = true;
        await loadAIEvaluation(false);
      }
    });

    watch(historyDialogVisible, async (visible) => {
      if (!visible) {
        historyDetailDialogVisible.value = false;
        selectedHistoryRecord.value = null;
        disposeHistoryTimelineChart();
        return;
      }
      await nextTick();
      renderHistoryTimelineChart();
      setTimeout(() => {
        if (historyTimelineChartInstance) {
          historyTimelineChartInstance.resize();
        }
      }, 80);
    });

    onMounted(() => {
      // 重置滚动位置到顶部
      window.scrollTo(0, 0);
      
      // 确保在挂载时stockInfo已经初始化
      if (!stockInfo.value || !stockInfo.value.code) {
        stockInfo.value = {
          name: '加载中...',
          code: route.params.code || '',
          market: '',
          regionBoard: '--',
          regionBoardTagId: '',
          price: '--',
          avgPrice: '--',
          change: 0,
          changeAmount: '--',
          changePercent: '--',
          industry: '--',
          industryTagId: '',
          listingDate: '--',
          totalShares: '--',
          floatShares: '--',
          totalSharesValue: null,
          floatSharesValue: null,
          open: '--',
          prevClose: '--',
          high: '--',
          low: '--',
          limitUp: '--',
          limitDown: '--',
          volume: '--',
          turnover: '--',
          turnoverRate: '--',
          volumeRatio: '--',
          outerVolume: '--',
          innerVolume: '--',
          marketCap: '--',
          floatMarketCap: '--',
          marketCapValue: null,
          floatMarketCapValue: null,
          infoUpdatedAt: '--',
          lastUpdated: '--'
        };
      }

      loadStockData();
      loadNewsAndAnalysis();
      // 加载时检查是否已在自选列表中
      if (isLoggedIn.value) {
        checkIfFavorite();
      }
      loadingEvaluation.value = true;
      loadAIEvaluation(false);
      
      // 设置自动刷新定时器
      setupAutoRefresh();

      window.addEventListener('resize', handleWindowResize);
      
      // 确保页面加载时滚动到顶部
      window.scrollTo(0, 0);
    });

    onBeforeUnmount(() => {
      // 使用新的清除所有定时器函数
      clearAllTimers();
      cancelFlowAnimationFrames();
      window.removeEventListener('resize', handleWindowResize);
      if (forecastChartInstance) {
        forecastChartInstance.dispose();
        forecastChartInstance = null;
      }
      disposeHistoryTimelineChart();
    });

    return {
      stockInfo,
      activeTab,
      isFavorite,
      addingToFavorites,
      stockNews,
      analysisResult,
      currentNewsDetail,
      newsDetailDialogVisible,
      totalNews,
      hasMoreNews,
      loadingMoreNews,
      loadNewsAndAnalysis,
      loadMoreNews,
      loadAIEvaluation,
      loadStockData,
      toggleFavorite,
      getEvaluationClass,
      formatDate,
      formatSignedPercent,
      formatSignedPrice,
      goToTagBoard,
      formatRatioText,
      priceTrendClass,
      mergedStructureChart,
      refreshAIEvaluation,
      openHistoryDialog,
      loadingEvaluation,
      openingHistoryDialog,
      evaluationErrorMessage,
      evaluationProgressText,
      hasStreamDelta,
      showEvaluationOverlay,
      displayedConclusion,
      displayedCoreLogic,
      displayedRiskWarning,
      historyDialogVisible,
      historyDetailDialogVisible,
      loadingHistory,
      historyErrorMessage,
      historyRecords,
      selectedHistoryRecord,
      historyPagination,
      historyTimelineChartRef,
      openHistoryDetail,
      reloadHistoryPage,
      handleHistoryPageChange,
      getHistoryConclusionClass,
      viewNewsDetail,
      lastPriceUpdate,
      lastNewsUpdate,
      forecastChartRef,
      isLoggedIn,
      forecastData,
      forecastSummary,
      loadingForecast,
      loadForecast,
      refreshForecast,
      isForecastExpanded,
      hasForecastChartData
    };
  },
};
</script>

<style lang="scss" scoped>
.stock-detail-page {
  padding-top: 80px;

  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;

    @media (max-width: 576px) {
      padding: 0 12px;
    }
  }

  .stock-header {
    margin-bottom: 20px;

    .stock-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;

      h1 {
        font-size: 2rem;
        margin: 0;

        .stock-code-container {
          display: inline-block;
          font-size: 1.2rem;
          color: var(--text-secondary);
          margin-left: 10px;
          border: 1px solid #ddd;
          padding: 2px 8px;
          border-radius: 4px;
          background-color: #f8f8f8;
        }

        .market-code {
          font-weight: bold;
          color: #409EFF;
          margin-right: 2px;
        }
        
        .code-separator {
          color: #999;
          margin: 0 2px;
        }
      }

      .stock-price-info {
        margin-left: auto;
        margin-right: 20px;

        .current-price {
          font-size: 1.5rem;
          font-weight: bold;
          margin-right: 10px;
        }

        .stock-up {
          color: var(--danger-color);
        }

        .stock-down {
          color: var(--success-color);
        }
      }

      @media (max-width: 576px) {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 8px;

        h1 {
          width: 100%;
          font-size: 1.4rem;
          line-height: 1.35;

          .stock-code-container {
            font-size: 0.95rem;
            margin-left: 6px;
            padding: 2px 6px;
          }
        }

        .stock-price-info {
          margin-left: 0;
          margin-right: 0;

          .current-price {
            font-size: 1.3rem;
          }
        }

        > .el-button {
          margin-left: auto;
        }
      }
    }

    .stock-tags {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;

      .tag-item.is-clickable {
        cursor: pointer;
        user-select: none;
      }
    }

    .number-flip-enter-active,
    .number-flip-leave-active {
      transition: transform 0.22s ease, opacity 0.22s ease;
      display: inline-block;
    }

    .number-flip-enter-from {
      opacity: 0;
      transform: translateY(3px);
    }

    .number-flip-leave-to {
      opacity: 0;
      transform: translateY(-3px);
    }

    .stock-capital-charts {
      display: block;

      .capital-chart-card {
        --flow-start: #1f4f8f;
        --flow-end: #2f6fb6;
        --rest-start: #e8edf5;
        --rest-end: #dbe4f1;
        border-radius: 12px;
        border: 1px solid #d7dee9;
        padding: 12px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:hover {
          border-color: #b9c6d7;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
        }
      }

      .capital-chart-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }

      .capital-chart-title-wrap {
        min-width: 0;
      }

      .capital-chart-title {
        margin: 0;
        font-size: 0.96rem;
        font-weight: 600;
        color: #111827;
        line-height: 1.3;
      }

      .capital-chart-badge {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid #d8e0ea;
        background: #f8fafc;
      }

      .badge-label {
        font-size: 0.66rem;
        color: #6b7280;
      }

      .badge-value {
        font-size: 0.86rem;
        font-weight: 600;
        color: #0f172a;
        font-variant-numeric: tabular-nums;
      }

      .capital-stacked-track {
        position: relative;
        display: flex;
        width: 100%;
        height: 12px;
        margin-bottom: 10px;
        border-radius: 999px;
        overflow: hidden;
        background: #eff3f8;
        border: 1px solid #e2e8f0;
      }

      .capital-stacked-segment {
        height: 100%;
        transition: width 0.68s ease;
      }

      .capital-stacked-segment.is-flow {
        background: linear-gradient(90deg, var(--flow-start) 0%, var(--flow-end) 100%);
      }

      .capital-stacked-segment.is-rest {
        background: linear-gradient(90deg, var(--rest-start) 0%, var(--rest-end) 100%);
      }

      .capital-chart-legend {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;

        @media (max-width: 576px) {
          grid-template-columns: 1fr;
        }
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        padding: 6px 8px;
        border-radius: 6px;
        background: #fafbfc;
        border: 1px solid #e5e9f0;
      }

      .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 2px;
        flex-shrink: 0;

        &.is-flow {
          background: linear-gradient(90deg, var(--flow-start) 0%, var(--flow-end) 100%);
        }

        &.is-rest {
          background: linear-gradient(90deg, var(--rest-start) 0%, var(--rest-end) 100%);
        }
      }

      .legend-label {
        font-size: 0.74rem;
        color: #6b7280;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .legend-value {
        margin-left: auto;
        font-size: 0.82rem;
        font-weight: 600;
        color: #111827;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .capital-chart-metrics {
        margin-top: 8px;
        border-top: 1px dashed #e2e8f0;
        padding-top: 8px;
      }

      .metric-row {
        display: grid;
        grid-template-columns: 56px 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        min-width: 0;
      }

      .metric-kind {
        font-size: 0.74rem;
        color: #6b7280;
      }

      .metric-desc {
        font-size: 0.8rem;
        color: #334155;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .metric-ratio {
        font-size: 0.8rem;
        font-weight: 600;
        color: #0f172a;
        font-variant-numeric: tabular-nums;
      }

      .capital-chart-note {
        margin: 8px 0 0;
        font-size: 0.74rem;
        color: #64748b;
      }
    }
  }

  .section-title {
    margin-top: 0;
    margin-bottom: 20px;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .stock-data-section,
  .stock-tabs-section {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    padding: 20px;
    margin-bottom: 20px;
  }

  .stock-data-section {
    background: #fff;
    position: relative;
    padding-bottom: 38px;

    .data-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;

      @media (max-width: 992px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 576px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
      }

      .data-item {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 12px;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        background: #fff;
        min-height: 42px;

        &.is-key {
          border-color: #d1d5db;
        }

        .metric-line {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 2px;
          flex-wrap: wrap;
          text-align: center;
          line-height: 1.4;
        }

        .metric-label {
          font-size: 0.84rem;
          color: #6b7280;
          letter-spacing: 0;
        }

        .metric-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
          word-break: break-word;
        }

        .metric-value.trend-up {
          color: var(--danger-color);
          font-weight: 700;
        }

        .metric-value.trend-down {
          color: var(--success-color);
          font-weight: 700;
        }

        .metric-value.trend-flat {
          color: #4b5563;
          font-weight: 700;
        }
      }
    }

    .update-badge {
      position: absolute;
      right: 20px;
      bottom: 12px;
      font-size: 0.74rem;
      color: #9ca3af;
      line-height: 1;
      white-space: nowrap;
      pointer-events: none;

      @media (max-width: 576px) {
        right: 12px;
        bottom: 10px;
        font-size: 0.7rem;
      }
    }
  }

  .stock-tabs-section {
    .stock-news-list {
      margin-top: 0;
      margin-bottom: 10px;

      .news-item {
        padding: 15px 0;
        border-bottom: 1px solid var(--border-color);

        &:last-child {
          border-bottom: none;
        }

        h4.news-title {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1.1rem;
          cursor: pointer;
          color: var(--primary-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          display: block;
        }

        .news-summary {
          color: var(--text-secondary);
          margin-bottom: 10px;
          line-height: 1.5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          display: block;
        }

        .news-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          color: var(--text-tertiary);

          .news-link {
            color: var(--primary-color);
            text-decoration: none;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .news-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 16px;

        @media (max-width: 576px) {
          flex-wrap: wrap;
          gap: 8px;
        }
      }

      .news-total {
        font-size: 0.9rem;
        color: var(--text-tertiary);
      }
    }

    .analysis-content {
      position: relative;
      padding-bottom: 34px;

      &.is-loading {
        .analysis-detail,
        .analysis-error-message {
          opacity: 0.35;
        }
      }

      .analysis-loading-overlay {
        position: absolute;
        inset: 0;
        z-index: 4;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.78);
        backdrop-filter: blur(1.5px);
        pointer-events: none;
      }

      .star-loader {
        position: relative;
        width: 68px;
        height: 68px;
      }

      .star-core {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 28px;
        height: 28px;
        transform: translate(-50%, -50%);
        clip-path: polygon(50% 0%, 62% 36%, 100% 36%, 69% 58%, 82% 96%, 50% 74%, 18% 96%, 31% 58%, 0% 36%, 38% 36%);
        background: linear-gradient(145deg, #94a3b8 0%, #475569 100%);
        animation: star-core-build 1.4s ease-in-out infinite;
      }

      .star-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 52px;
        height: 52px;
        transform: translate(-50%, -50%);
        border: 1px solid rgba(100, 116, 139, 0.35);
        border-radius: 50%;
        animation: star-ring-pulse 1.4s ease-in-out infinite;
      }

      .star-spark {
        --spark-angle: 0deg;
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6px;
        height: 6px;
        margin-left: -3px;
        margin-top: -3px;
        border-radius: 50%;
        background: #64748b;
        opacity: 0;
        animation: star-spark-trail 1.4s ease-in-out infinite;
      }

      .star-spark.spark-one {
        --spark-angle: 15deg;
        animation-delay: 0s;
      }

      .star-spark.spark-two {
        --spark-angle: 105deg;
        animation-delay: 0.2s;
      }

      .star-spark.spark-three {
        --spark-angle: 195deg;
        animation-delay: 0.4s;
      }

      .star-spark.spark-four {
        --spark-angle: 285deg;
        animation-delay: 0.6s;
      }

      .analysis-loading-text {
        margin: 0;
        font-size: 0.88rem;
        color: #475569;
        letter-spacing: 0.02em;
      }

      .analysis-stream-status {
        margin-bottom: 16px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #d8e1eb;
        background: #f8fafc;
        font-size: 0.8rem;
        color: #64748b;
      }

      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;

        @media (max-width: 576px) {
          flex-direction: column;
          gap: 10px;
        }

        .analysis-title {
          display: flex;
          align-items: center;
          gap: 15px;

          .rating-display {
            > span {
              font-weight: bold;
              font-size: 2.0rem;

              &.rating-buy {
                color: #f56c6c !important; // 明确的红色
              }

              &.rating-strong-buy {
                color: #ff0000 !important; // 更鲜艳的红色
                font-weight: 800;
              }

              &.rating-sell {
                color: #67c23a !important; // 明确的绿色
              }

              &.rating-strong-sell {
                color: #00cc00 !important; // 更鲜艳的绿色
                font-weight: 800;
              }

              &.rating-hold {
                color: #0066cc !important; // 明确的深蓝色
              }
            }
          }
        }

        .analysis-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;

          @media (max-width: 576px) {
            width: 100%;
            align-items: flex-start;
          }

          .analysis-actions {
            display: flex;
            align-items: center;
            gap: 8px;

            @media (max-width: 576px) {
              width: 100%;
              flex-wrap: wrap;
            }
          }

          .history-capsule-btn {
            border-radius: 999px;
            border-color: #cfd8e3;
            color: #334155;
            background: #f8fafc;

            &:hover,
            &:focus {
              border-color: #94a3b8;
              color: #1e293b;
              background: #f1f5f9;
            }
          }
        }

        .analysis-date {
          color: var(--text-tertiary);
        }

      }

      .analysis-detail {
        margin-bottom: 20px;

        h4 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 1.1rem;
        }

        .markdown-content {
          line-height: 1.6;
          color: var(--text-secondary);

          :deep(p) {
            margin-bottom: 10px;
          }

          :deep(ul),
          :deep(ol) {
            padding-left: 20px;
            margin-bottom: 10px;
          }

          :deep(h1),
          :deep(h2),
          :deep(h3),
          :deep(h4),
          :deep(h5),
          :deep(h6) {
            margin-top: 16px;
            margin-bottom: 10px;
          }

          :deep(code) {
            background-color: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
          }

          :deep(blockquote) {
            border-left: 4px solid #ddd;
            padding-left: 10px;
            color: #777;
            margin: 10px 0;
          }

          :deep(*) {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
        }
      }

      .analysis-error-message {
        margin-bottom: 16px;
        padding: 10px 12px;
        border-radius: 6px;
        background: #fff2f0;
        border: 1px solid #ffccc7;
        color: #cf1322;
        font-size: 0.92rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .analysis-powered-by {
        position: absolute;
        right: 0;
        bottom: 0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 999px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #374151;
        font-size: 11px;
        line-height: 1;
        text-decoration: none;
        transition: all 0.2s ease;

        .analysis-powered-logo {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .analysis-powered-logo-icon {
          height: 10px;
          width: 10px;
          display: block;
          filter: none;
        }

        .analysis-powered-logo-text {
          height: 9px;
          width: auto;
          display: block;
          filter: none;
        }

        &:hover {
          color: #111827;
          background: #f9fafb;
          border-color: #9ca3af;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
        }
      }

      @media (max-width: 576px) {
        padding-bottom: 30px;

        .analysis-powered-by {
          font-size: 10px;
          padding: 3px 7px;
          gap: 3px;

          .analysis-powered-logo {
            gap: 2px;
          }

          .analysis-powered-logo-icon {
            height: 9px;
            width: 9px;
          }

          .analysis-powered-logo-text {
            height: 9px;
          }
        }
      }

      .reference-news {
        margin-top: 20px;
        margin-bottom: 20px;

        h4 {
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 1.1rem;
        }

        .news-reference-list {
          list-style: none;
          padding: 0;
          margin: 0;

          .news-reference-item {
            padding: 6px 0;  // 降低行高
            border-bottom: 1px dashed #eee;
            display: flex;
            justify-content: flex-start;
            align-items: center;
            min-width: 0;
            
            &:last-child {
              border-bottom: none;
            }

            .news-number {
              width: 24px;
              color: #999;
              font-size: 0.85rem;
            }

            .news-reference-title {
              flex: 1;
              min-width: 0;
              font-size: 0.95rem;
              color: #999;  // 浅灰色
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              text-decoration: none;
              
              &:hover {
                text-decoration: underline;  // 鼠标悬停时显示下划线
                color: var(--primary-color);
              }
            }

            .news-reference-time {
              margin-left: 15px;
              font-size: 0.85rem;
              color: var(--text-tertiary);
              white-space: nowrap;
            }

            @media (max-width: 576px) {
              display: grid;
              grid-template-columns: 20px 1fr;
              row-gap: 4px;
              align-items: start;

              .news-number {
                width: 20px;
              }

              .news-reference-time {
                grid-column: 2;
                margin-left: 0;
                font-size: 0.78rem;
              }
            }
          }
        }
      }
    }
  }

  .analysis-history-content {
    min-height: 180px;
  }

  .analysis-history-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .analysis-history-summary {
    font-size: 0.9rem;
    color: #475569;
    font-weight: 500;
  }

  .analysis-history-error {
    margin-bottom: 12px;
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #b42318;
    font-size: 0.9rem;
  }

  .analysis-history-list {
    display: grid;
    gap: 10px;
    margin-bottom: 14px;
  }

  .history-record-item {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    background: #ffffff;
  }

  .history-record-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .history-record-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .history-detail-btn {
    padding: 0 6px;
    font-size: 0.82rem;
  }

  .history-record-time {
    font-size: 0.86rem;
    color: #475569;
    font-variant-numeric: tabular-nums;
  }

  .history-record-conclusion {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 62px;
    height: 24px;
    border-radius: 999px;
    padding: 0 10px;
    font-size: 0.78rem;
    line-height: 1;
    font-weight: 600;
    border: 1px solid transparent;

    &.is-strong-bull {
      color: #991b1b;
      background: #fee2e2;
      border-color: #fca5a5;
    }

    &.is-bull {
      color: #b91c1c;
      background: #fef2f2;
      border-color: #fecaca;
    }

    &.is-neutral {
      color: #334155;
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    &.is-bear {
      color: #166534;
      background: #f0fdf4;
      border-color: #bbf7d0;
    }

    &.is-strong-bear {
      color: #14532d;
      background: #dcfce7;
      border-color: #86efac;
    }
  }

  .history-detail-content {
    display: grid;
    gap: 12px;
  }

  .history-detail-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .history-detail-time {
    font-size: 0.9rem;
    color: #475569;
    font-variant-numeric: tabular-nums;
  }

  .history-detail-block {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    background: #ffffff;
  }

  .history-detail-block h4 {
    margin: 0;
    font-size: 0.9rem;
    color: #0f172a;
    font-weight: 600;
  }

  .history-detail-block p {
    margin: 6px 0 0;
    font-size: 0.88rem;
    line-height: 1.6;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .analysis-history-pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 6px;
  }

  .analysis-history-timeline {
    margin-bottom: 14px;
    border: 1px solid #dbe3ef;
    border-radius: 10px;
    padding: 12px;
    background: #f8fbff;
  }

  .history-timeline-head {
    margin-bottom: 10px;

    h4 {
      margin: 0;
      font-size: 1rem;
      color: #0f172a;
      font-weight: 600;
    }

    p {
      margin: 6px 0 0;
      font-size: 0.82rem;
      color: #64748b;
    }
  }

  .history-timeline-chart {
    height: 320px;
    width: 100%;
  }

  @media (max-width: 576px) {
    .history-record-head {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .history-record-actions {
      width: 100%;
      justify-content: space-between;
    }

    .history-detail-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .history-timeline-chart {
      height: 260px;
    }
  }

  @keyframes star-core-build {
    0% {
      opacity: 0.35;
      transform: translate(-50%, -50%) scale(0.72) rotate(-12deg);
    }

    45% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1.05) rotate(0deg);
    }

    100% {
      opacity: 0.68;
      transform: translate(-50%, -50%) scale(0.92) rotate(8deg);
    }
  }

  @keyframes star-ring-pulse {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.68);
    }

    40% {
      opacity: 0.55;
    }

    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.18);
    }
  }

  @keyframes star-spark-trail {
    0% {
      opacity: 0;
      transform: rotate(var(--spark-angle)) translateX(4px) scale(0.6);
    }

    35% {
      opacity: 0.72;
    }

    100% {
      opacity: 0;
      transform: rotate(var(--spark-angle)) translateX(28px) scale(0.3);
    }
  }

  .button-icon {
    width: 14px;
    height: 14px;
    margin-right: 4px;
    vertical-align: middle;
  }

  .refresh-btn {
    .button-icon {
      width: 16px;
      height: 16px;
    }
  }
  
  .news-detail-content {
    line-height: 1.7;
    color: var(--text-secondary);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    margin-bottom: 12px;
  }
}

.forecast-content {
  .forecast-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  .forecast-summary-card {
    background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
    border: 1px solid #bae7ff;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    
    .summary-text {
      font-size: 15px;
      line-height: 1.7;
      color: #003a8c;
      font-weight: 500;
      text-align: justify;
    }
  }

  .forecast-charts-container {
    background: #fff;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
    
    .forecast-chart {
      width: 100%;
      height: 350px;
    }
  }

  .forecast-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    
    &.is-collapsed {
      max-height: 280px; /* 调整此高度以展示第一个卡片及第二个卡片的一小部分 */
      overflow: hidden;
      
      .expand-mask {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        // height: 120px;
        background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95) 70%, #fff);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 10px;
        cursor: pointer;
        z-index: 10;
        
        span {
          color: #409EFF;
          font-size: 14px;
          background: #ecf5ff;
          padding: 8px 20px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(64,158,255,0.2);
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
          
          &:hover {
            background: #409EFF;
            color: #fff;
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(64,158,255,0.3);
          }
        }
      }
    }
  }

  .collapse-action {
    text-align: center;
    margin-top: 16px;
    cursor: pointer;
    
    span {
      color: #909399;
      font-size: 14px;
      padding: 6px 16px;
      border-radius: 16px;
      background-color: #f4f4f5;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: all 0.3s;
      
      &:hover {
        color: #409EFF;
        background-color: #ecf5ff;
      }
    }
  }

  .forecast-item {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    background-color: #fff;
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border-color: #d9ecff;
    }

    .forecast-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #ebeef5;

      .institution-info {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .institution-name {
          font-weight: 600;
          font-size: 16px;
          color: #303133;
        }
        
        .researcher {
          font-size: 13px;
          color: #409EFF;
          background-color: #ecf5ff;
          padding: 2px 8px;
          border-radius: 4px;
        }
      }

      .report-date {
        color: #909399;
        font-size: 13px;
        background-color: #f4f4f5;
        padding: 2px 6px;
        border-radius: 2px;
      }
    }
    
    .forecast-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      
      .forecast-col {
        .col-title {
           font-size: 13px;
           color: #909399;
           margin-bottom: 10px;
           font-weight: 500;
        }
        
        .col-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 14px;
          border-bottom: 1px solid #f5f7fa;
          
          &:last-child {
            border-bottom: none;
          }
          
          .year-label {
            color: #606266;
          }
          
          .val-num {
            font-weight: 500;
            color: #303133;
            font-family: 'Roboto', sans-serif;
          }
        }
      }
      @media (max-width: 600px) {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  }

  .forecast-footer {
     margin-top: 24px;
     display: flex;
     justify-content: flex-end;
     
     .source-link {
       display: flex;
       align-items: center;
       justify-content: center;
       color: #909399;
       font-size: 12px;
       text-decoration: none;
       background-color: #f4f4f5;
       padding: 4px 10px;
       border-radius: 12px;
       transition: all 0.2s;
       
       &:hover {
         color: var(--primary-color);
         background-color: #ecf5ff;
       }
       
       .source-logo {
         height: 14px;
         margin-right: 0;
         display: block;
       }
     }
  }
}
</style>
