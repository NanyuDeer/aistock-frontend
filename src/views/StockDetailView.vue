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
          <el-tag size="small" type="info">行业：{{ stockInfo.industry }}</el-tag>
          <el-tag size="small" type="info">板块：{{ stockInfo.board }}</el-tag>
          <el-tag size="small" type="info">上市日期：{{ stockInfo.listingDate }}</el-tag>
          <el-tag size="small" type="info">信息更新时间：{{ stockInfo.infoUpdatedAt }}</el-tag>
        </div>
        <div class="stock-meta-grid">
          <div class="meta-item">
            <span class="meta-label">总股本</span>
            <span class="meta-value">{{ stockInfo.totalShares }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">流通股</span>
            <span class="meta-value">{{ stockInfo.floatShares }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">总市值</span>
            <span class="meta-value">{{ stockInfo.marketCap }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">流通市值</span>
            <span class="meta-value">{{ stockInfo.floatMarketCap }}</span>
          </div>
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
          <el-tab-pane label="AI投资建议" name="analysis">
            <!-- 已登录用户显示AI投资建议 -->
            <div v-if="isLoggedIn" class="analysis-content">
              <div class="analysis-header">
                <div class="analysis-title">
                  <div class="rating-display">
                    <span :class="getEvaluationClass(analysisResult.conclusion)">
                      {{ analysisResult.conclusion || '加载中...' }}
                    </span>
                  </div>
                </div>
                <div class="analysis-meta">
                  <span class="analysis-date">分析日期：{{ analysisResult.date }}</span>
                  <el-button 
                    size="small" 
                    type="primary" 
                    @click="refreshAIEvaluation" 
                    :loading="loadingEvaluation"
                    class="refresh-btn">
                    <img v-if="!loadingEvaluation" src="@/assets/refresh.svg" alt="刷新" class="button-icon" />
                    刷新评测
                  </el-button>
                </div>
              </div>
              
              <div class="analysis-detail">
                <h4>分析依据</h4>
                <div class="markdown-content" v-html="analysisResult.detail"></div>
              </div>
              
              <div class="reference-news" v-if="analysisResult.newsList && analysisResult.newsList.length > 0">
                <h4>参考新闻</h4>
                <ul class="news-reference-list">
                  <li v-for="(news, index) in analysisResult.newsList" :key="index" class="news-reference-item">
                    <div class="news-number">{{ index + 1 }}.</div>
                    <a 
                      :href="news.link || '#'" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="news-reference-title"
                    >
                      {{ news.title }}
                    </a>
                    <div class="news-reference-time">{{ formatDate(news.publish_time) }}</div>
                  </li>
                </ul>
              </div>
            </div>
            
            <!-- 未登录用户显示登录提示 -->
            <div v-else class="login-required-content">
              <div class="login-prompt">
                <div class="prompt-icon">
                  🔒
                </div>
                <h3>需要登录才能查看AI投资建议</h3>
                <p>登录后可获得：</p>
                <ul class="feature-list">
                  <li>🤖 AI智能投资建议分析</li>
                  <li>📊 专业股票评级</li>
                  <li>📈 详细分析依据</li>
                  <li>📰 相关新闻参考</li>
                </ul>
                <el-button 
                  type="primary" 
                  size="large" 
                  @click="goToLogin"
                  class="login-button">
                  立即登录
                </el-button>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="业绩预测" name="forecast">
            <div class="forecast-content" v-loading="loadingForecast">
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
          <div class="data-item">
            <span class="label">开盘价</span>
            <span class="value">{{ stockInfo.open }}</span>
          </div>
          <div class="data-item">
            <span class="label">最高价</span>
            <span class="value">{{ stockInfo.high }}</span>
          </div>
          <div class="data-item">
            <span class="label">最低价</span>
            <span class="value">{{ stockInfo.low }}</span>
          </div>
          <div class="data-item">
            <span class="label">5分钟变化</span>
            <span class="value">{{ stockInfo.change5min }}</span>
          </div>
          <div class="data-item">
            <span class="label">成交量</span>
            <span class="value">{{ stockInfo.volume }}</span>
          </div>
          <div class="data-item">
            <span class="label">成交额</span>
            <span class="value">{{ stockInfo.turnover }}</span>
          </div>
          <div class="data-item">
            <span class="label">总市值</span>
            <span class="value">{{ stockInfo.marketCap }}</span>
          </div>
          <div class="data-item">
            <span class="label">流通市值</span>
            <span class="value">{{ stockInfo.floatMarketCap }}</span>
          </div>
          <div class="data-item">
            <span class="label">最后更新</span>
            <span class="value">{{ stockInfo.lastUpdated }}</span>
          </div>
        </div>
      </div>
    </div>
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
import { ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
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
      board: '--',
      price: '--',
      change: 0,
      changePercent: '--',
      industry: '--',
      listingDate: '--',
      totalShares: '--',
      floatShares: '--',
      open: '--',
      high: '--',
      low: '--',
      change5min: '--',
      volume: '--',
      turnover: '--',
      marketCap: '--',
      floatMarketCap: '--',
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
      rating: '',
      date: '',
      summary: '',
      detail: '',
      factors: [],
      newsList: []
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

    const refreshAIEvaluation = async () => {
      if (!isLoggedIn.value) {
        ElMessage.warning('请先登录后查看AI投资建议');
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
    let forecastChartInstance = null;

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
      
      // 监听窗口大小变化
      window.addEventListener('resize', () => {
        forecastChartInstance && forecastChartInstance.resize();
      });
    };

    const loadForecast = async () => {
      loadingForecast.value = true;
      try {
        const responseList = await store.dispatch('fetchStockForecast', stockInfo.value.code);
        
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
    
    const mapConclusionToRating = (conclusion) => {
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

    const loadAIEvaluation = async (refresh = false) => {
      if (!isLoggedIn.value) {
        console.log('[DEBUG] 用户未登录，跳过AI评估加载');
        return;
      }
      
      try {
        console.log('[DEBUG] 发起获取股票AI评估请求:', stockInfo.value.code, '刷新:', refresh);
        const evaluation = await store.dispatch('fetchStockEvaluation', {
          stockCode: stockInfo.value.code,
          refresh: refresh
        });

        console.log('[DEBUG] 接收到评估结果:', evaluation);

        if (evaluation) {
          analysisResult.value = {
            conclusion: evaluation.conclusion || '未知',
            rating: mapConclusionToRating(evaluation.conclusion),
            date: evaluation.evaluation_time || formatDate(new Date()),
            summary: md.render(evaluation.reason || '暂无分析内容'), 
            detail: md.render(evaluation.reason || '暂无分析内容'),
            newsList: evaluation.news_list || []
          };
          
          console.log('[DEBUG] 解析后的新闻列表:', analysisResult.value.newsList);
        } else {
          analysisResult.value = {
            conclusion: '未知',
            rating: '未知',
            date: formatDate(new Date()),
            summary: '暂无AI评估数据',
            detail: '无法获取AI评估结果，请稍后再试。',
            newsList: []
          };
        }
      } catch (error) {
        console.error('获取股票AI评估失败:', error);
        analysisResult.value = {
          conclusion: '获取失败',
          rating: '未知',
          date: formatDate(new Date()),
          summary: 'AI评估数据获取失败',
          detail: '获取AI评估结果时发生错误，请稍后再试。',
          newsList: []
        };
      } finally {
        loadingEvaluation.value = false;
      }
    };

    const toNumber = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      const normalized = String(value).replace(/,/g, '').trim();
      if (!normalized) return null;
      const parsed = Number(normalized);
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

    const loadStockData = async () => {
      try {
        const snapshot = await store.dispatch('fetchStockSnapshot', stockInfo.value.code);

        if (snapshot) {
          const info = snapshot.info || {};
          const quote = snapshot.quote || {};

          const latestPriceNum = toNumber(quote.最新价 ?? quote.最新价格 ?? quote.price ?? quote.latest_price);
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
            board: info.所属板块 || '--',
            price: formatPrice(latestPriceNum),
            change: changeNum,
            changePercent: formatPercentValue(changePercentNum),
            industry: info.所属行业 || '未知行业',
            listingDate: formatListingDate(info.上市时间),
            totalShares: formatScaledValue(info.总股本, '股'),
            floatShares: formatScaledValue(info.流通股, '股'),
            open: formatPrice(quote.今开 ?? quote.开盘价 ?? quote.open),
            high: formatPrice(quote.最高 ?? quote.最高价 ?? quote.high),
            low: formatPrice(quote.最低 ?? quote.最低价 ?? quote.low),
            change5min: formatPercentText(quote['5分钟涨跌幅'] ?? quote['5分钟涨跌'] ?? quote.change_5min),
            volume: formatScaledValue(quote.成交量 ?? quote.volume),
            turnover: formatScaledValue(quote.成交额 ?? quote.turnover, '元'),
            marketCap: formatScaledValue(info.总市值, '元'),
            floatMarketCap: formatScaledValue(info.流通市值, '元'),
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
      
      if (forecastChartInstance) {
        forecastChartInstance.dispose();
      }
      window.removeEventListener('resize', () => {
         forecastChartInstance && forecastChartInstance.resize();
      });
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

    // 当路由中的股票代码改变时触发重新加载
    watch(() => route.params.code, (newCode) => {
      if (newCode && newCode !== stockInfo.value.code) {
        stockInfo.value.code = newCode;
        stockNews.value = [];
        totalNews.value = 0;
        newsCursor.value = 0;
        
        loadStockData();
        loadNewsAndAnalysis();
        
        // 重新设置自动刷新定时器
        setupAutoRefresh();
        
        // 重置滚动位置到顶部
        window.scrollTo(0, 0);
      }
    });

    watch(activeTab, async (newTab) => {
      if (newTab === 'analysis' && isLoggedIn.value) {
        loadingEvaluation.value = true;
        await loadAIEvaluation(false); // 切换到 "AI投资建议" Tab 时自动加载数据
        loadingEvaluation.value = false;
      } else if (newTab === 'forecast') {
        loadForecast();
      }
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
          board: '--',
          price: '--',
          change: 0,
          changePercent: '--',
          industry: '--',
          listingDate: '--',
          totalShares: '--',
          floatShares: '--',
          open: '--',
          high: '--',
          low: '--',
          change5min: '--',
          volume: '--',
          turnover: '--',
          marketCap: '--',
          floatMarketCap: '--',
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
      
      // 设置自动刷新定时器
      setupAutoRefresh();
      
      // 确保页面加载时滚动到顶部
      window.scrollTo(0, 0);
    });

    onBeforeUnmount(() => {
      // 使用新的清除所有定时器函数
      clearAllTimers();
    });

    // 跳转到登录页面
    const goToLogin = () => {
      router.push('/login');
    };

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
      refreshAIEvaluation,
      loadingEvaluation,
      viewNewsDetail,
      mapConclusionToRating,  // 确保函数被返回
      lastPriceUpdate,
      lastNewsUpdate,
      forecastChartRef,
      isLoggedIn,
      goToLogin,
      forecastData,
      forecastSummary,
      loadingForecast,
      loadForecast,
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
    }

    .stock-tags {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .stock-meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;

      @media (max-width: 992px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      @media (max-width: 576px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;

        .meta-item {
          padding: 8px 10px;
          gap: 4px;
        }

        .meta-label {
          font-size: 0.8rem;
        }

        .meta-value {
          font-size: 0.92rem;
        }
      }

      .meta-item {
        background: #f7f9fc;
        border: 1px solid #edf0f5;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .meta-label {
        font-size: 0.85rem;
        color: var(--text-tertiary);
      }

      .meta-value {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
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
    .data-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;

      @media (max-width: 992px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }

      .data-item {
        display: flex;
        flex-direction: column;

        .label {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .value {
          font-size: 1.1rem;
          font-weight: 500;
        }
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
      }

      .news-total {
        font-size: 0.9rem;
        color: var(--text-tertiary);
      }
    }

    .analysis-content {
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;

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
          }
        }
      }
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
    margin-bottom: 12px;
  }
}

// 登录提示框样式
.login-required-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  
  .login-prompt {
    text-align: center;
    padding: 40px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    
    .prompt-icon {
      font-size: 48px;
      color: #409EFF;
      margin-bottom: 20px;
      
      i {
        font-size: 48px;
      }
    }
    
    h3 {
      color: #303133;
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    p {
      color: #606266;
      margin-bottom: 16px;
      font-size: 14px;
    }
    
    .feature-list {
      text-align: left;
      margin: 20px 0;
      padding: 0;
      list-style: none;
      
      li {
        padding: 8px 0;
        color: #606266;
        font-size: 14px;
        display: flex;
        align-items: center;
        
        &:before {
          content: '';
          width: 6px;
          height: 6px;
          background-color: #409EFF;
          border-radius: 50%;
          margin-right: 12px;
        }
      }
    }
    
    .login-button {
      margin-top: 24px;
      padding: 12px 32px;
      font-size: 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
      }
    }
  }
}

.forecast-content {
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
