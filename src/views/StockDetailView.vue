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
            <span :class="(typeof stockInfo.change === 'number' && stockInfo.change >= 0) ? 'stock-up' : 'stock-down'">
              {{ typeof stockInfo.change === 'number' && stockInfo.change >= 0 ? '+' : '' }}{{ typeof stockInfo.change === 'number' ? stockInfo.change.toFixed(2) : stockInfo.change }}
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
          <CycleSelect v-if="isFavorite && stockInfo?.code" :model-value="stockCycle" @update:model-value="onStockCycleChange" />
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

      <div class="view-tabs">
        <button
          v-for="tab in viewTabs"
          :key="tab.key"
          :class="['view-tab', { 'is-active': activeView === tab.key }]"
          @click="activeView = tab.key"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <span class="tab-desc">{{ tab.desc }}</span>
        </button>
      </div>

      <!-- 短线视图 -->
      <div v-show="activeView === 'short'" class="view-content">
        <div class="card ai-analysis-card">
          <div class="card-header">
            <h3>AI资讯分析</h3>
          </div>
          <div class="card-body analysis-content" :class="{ 'is-loading': showEvaluationOverlay }">
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
                    circle
                    class="tts-play-btn"
                    :class="{ 'is-playing': isPlayingEvaluationAudio }"
                    :loading="isGeneratingEvaluationAudio"
                    :disabled="isGeneratingEvaluationAudio || (!canPlayEvaluationAudio && !isPlayingEvaluationAudio)"
                    :aria-label="isPlayingEvaluationAudio ? '停止播报AI评价' : '播放AI评价语音'"
                    :title="isPlayingEvaluationAudio ? '停止播报AI评价' : '播放AI评价语音'"
                    @click="playEvaluationAudio"
                  >
                    <span v-if="!isGeneratingEvaluationAudio" class="tts-icon" aria-hidden="true">
                      <svg v-if="isPlayingEvaluationAudio" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="4" y="3" width="3" height="10" rx="1"></rect>
                        <rect x="9" y="3" width="3" height="10" rx="1"></rect>
                      </svg>
                      <svg v-else viewBox="0 0 16 16" fill="none">
                        <path d="M3.5 6.25H5.75L9 3.75V12.25L5.75 9.75H3.5C2.95 9.75 2.5 9.3 2.5 8.75V7.25C2.5 6.7 2.95 6.25 3.5 6.25Z" fill="currentColor"></path>
                        <path d="M10.8 5.35C11.63 6.08 12.1 7.11 12.1 8.2C12.1 9.29 11.63 10.32 10.8 11.05" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>
                        <path d="M12.35 3.85C13.58 4.97 14.25 6.53 14.25 8.2C14.25 9.87 13.58 11.43 12.35 12.55" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>
                      </svg>
                    </span>
                  </el-button>
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

            <div v-if="isCuratedMockStock" class="analysis-detail">
              <h4>投资建议</h4>
              <div class="markdown-content">{{ displayedInvestmentAdvice }}</div>
            </div>

            <div class="analysis-detail">
              <h4>风险提示</h4>
              <div class="markdown-content" v-html="displayedRiskWarning"></div>
            </div>

            <div v-if="showEvaluationOverlay" class="analysis-loading-overlay" role="status" aria-live="polite" aria-label="资讯面AI投资建议生成中">
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

            <div class="info-news-divider"></div>

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
                <span class="news-total">已显示 {{ stockNews.length }} / {{ totalNews }} 条</span>
                <el-button
                  v-if="hasMoreNews"
                  size="small"
                  plain
                  class="news-more-btn"
                  :loading="loadingMoreNews"
                  @click="loadMoreNews"
                >
                  查看更多
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <StockChart :stockCode="stockInfo.code" :stockMarket="stockInfo.market" />

        <div class="card capital-flow-card">
          <div class="card-header">
            <h3>资金流向</h3>
          </div>
          <div class="card-body">
            <div class="cf-block cf-header-bar">
              <div class="cf-stock-info">
                <span class="cf-stock-name">{{ stockInfo.name }}</span>
                <span class="cf-stock-code">{{ stockInfo.code }}</span>
                <span class="cf-ai-tag is-bull">偏多</span>
              </div>
              <div class="cf-price-info" :class="stockInfo.change >= 0 ? 'is-up' : 'is-down'">
                <span class="cf-current-price">{{ stockInfo.price || '--' }}</span>
                <span class="cf-change-badge">{{ stockInfo.change >= 0 ? '+' : '' }}{{ stockInfo.changePercent || '--' }}%</span>
              </div>
            </div>

            <div class="cf-block cf-ai-conclusion">
              <div class="cf-ai-narrative">
                <p class="cf-narrative-main">主力资金连续3日净流入，今日超大单与大单合计净买入6.83亿，占全天成交额2.1%，资金面支撑偏强。</p>
                <p class="cf-narrative-risk">风险：若明日主力转向净流出且单日超3亿，则短期支撑失效。</p>
              </div>
            </div>

            <div class="cf-block cf-core-data">
              <div class="cf-hero-col">
                <span class="cf-hero-label">主力净流入</span>
                <span class="cf-hero-value is-up">+6.83亿</span>
                <div class="cf-hero-tags">
                  <span class="cf-hero-tag">占比 2.1%</span>
                  <span class="cf-hero-tag">5日 +18.7亿</span>
                  <span class="cf-hero-tag">连买 3天</span>
                </div>
              </div>
              <div class="cf-split-col">
                <div class="cf-bidi-chart">
                  <div class="cf-bidi-row">
                    <span class="cf-bidi-label">超大单</span>
                    <div class="cf-bidi-track-left">
                      <div class="cf-bidi-bar cf-bidi-bar-left" style="width: 0%"></div>
                    </div>
                    <div class="cf-bidi-axis"></div>
                    <div class="cf-bidi-track-right">
                      <div class="cf-bidi-bar cf-bidi-bar-right" style="width: 70%"></div>
                    </div>
                    <span class="cf-bidi-value is-up">+3.2亿</span>
                  </div>
                  <div class="cf-bidi-row">
                    <span class="cf-bidi-label">大单</span>
                    <div class="cf-bidi-track-left">
                      <div class="cf-bidi-bar cf-bidi-bar-left" style="width: 0%"></div>
                    </div>
                    <div class="cf-bidi-axis"></div>
                    <div class="cf-bidi-track-right">
                      <div class="cf-bidi-bar cf-bidi-bar-right" style="width: 78%"></div>
                    </div>
                    <span class="cf-bidi-value is-up">+3.6亿</span>
                  </div>
                  <div class="cf-bidi-row">
                    <span class="cf-bidi-label">中单</span>
                    <div class="cf-bidi-track-left">
                      <div class="cf-bidi-bar cf-bidi-bar-left" style="width: 35%"></div>
                    </div>
                    <div class="cf-bidi-axis"></div>
                    <div class="cf-bidi-track-right">
                      <div class="cf-bidi-bar cf-bidi-bar-right" style="width: 0%"></div>
                    </div>
                    <span class="cf-bidi-value is-down">-0.8亿</span>
                  </div>
                  <div class="cf-bidi-row">
                    <span class="cf-bidi-label">小单</span>
                    <div class="cf-bidi-track-left">
                      <div class="cf-bidi-bar cf-bidi-bar-left" style="width: 50%"></div>
                    </div>
                    <div class="cf-bidi-axis"></div>
                    <div class="cf-bidi-track-right">
                      <div class="cf-bidi-bar cf-bidi-bar-right" style="width: 0%"></div>
                    </div>
                    <span class="cf-bidi-value is-down">-1.2亿</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="cf-block cf-trend">
              <div class="cf-trend-header">
                <span class="cf-trend-title">10日资金趋势</span>
                <span class="cf-trend-badge">趋势：反弹第4天，力度增强</span>
              </div>
              <div ref="capitalFlowChartRef" class="cf-trend-chart"></div>
            </div>
          </div>
        </div>

        <div class="card stock-data-card">
          <div class="card-header">
            <h3>交易数据</h3>
          </div>
          <div class="card-body">
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
      </div>

      <!-- 中线视图 -->
      <div v-show="activeView === 'mid'" class="view-content">
        <div class="card ai-analysis-card">
          <div class="card-header">
            <h3>中线AI研判</h3>
            <span class="card-badge mock-badge">Mock数据</span>
          </div>
          <div class="card-body">
            <div class="ai-conclusion">
              <span :class="['conclusion-badge', midCycleAnalysis.tone === 'bull' ? 'rating-buy' : 'rating-hold']">{{ midCycleAnalysis.conclusion }}</span>
            </div>
            <div class="ai-logic">
              <div class="markdown-content" v-html="midCycleAnalysis.coreHtml"></div>
            </div>
            <div class="cycle-evidence-list">
              <div v-for="item in midCycleAnalysis.evidence" :key="item.label" class="cycle-evidence-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
            <div class="ai-advice">
              <h4>投资建议</h4>
              <p>{{ midCycleAnalysis.advice }}</p>
            </div>
            <div class="ai-risk">
              <h4>风险提示</h4>
              <p>{{ midCycleAnalysis.risk }}</p>
            </div>
          </div>
        </div>

        <!-- Mock: 财报分析待接入API
        <div class="card">
          <div class="card-header">
            <h3>财报分析</h3>
            <span class="card-badge mock-badge">Mock数据 · 待接入API</span>
          </div>
          <div class="card-body">
            <div class="finance-grid">
              <div class="finance-item">
                <span class="finance-label">营收(亿)</span>
                <span class="finance-value">186.5</span>
                <span class="finance-change is-up">+12.3%</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">净利润(亿)</span>
                <span class="finance-value">23.8</span>
                <span class="finance-change is-up">+18.6%</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">PE(TTM)</span>
                <span class="finance-value">22.5</span>
                <span class="finance-change is-down">行业均值28</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">PB</span>
                <span class="finance-value">3.2</span>
                <span class="finance-change">行业均值3.8</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">毛利率</span>
                <span class="finance-value">32.1%</span>
                <span class="finance-change is-up">+1.2%</span>
              </div>
              <div class="finance-item">
                <span class="finance-label">ROE</span>
                <span class="finance-value">14.5%</span>
                <span class="finance-change is-up">+0.8%</span>
              </div>
            </div>
          </div>
        </div>
        Mock: 财报分析结束 -->

        <div class="card">
          <div class="card-header">
            <h3>业绩预测</h3>
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
              刷新
            </el-button>
          </div>
          <div class="card-body" v-loading="loadingForecast">
            <div v-if="forecastData && (forecastData.symbol || forecastData['股票代码'])">
              <div class="forecast-summary-card">
                <div class="summary-text">{{ forecastSummary }}</div>
              </div>
              <div v-if="hasForecastChartData" class="forecast-charts-container">
                <div ref="forecastChartRef" class="forecast-chart"></div>
              </div>
            </div>
            <el-empty v-else-if="!loadingForecast" description="暂无业绩预测数据" :image-size="60" />
            <div class="forecast-footer">
              <a :href="`https://stockpage.10jqka.com.cn/${stockInfo.code}/worth/#forecast`" target="_blank" class="source-link">
                <img src="https://s.thsi.cn/cd/news-p-fe-app-news-flow-home/home/_next/static/media/logo.1c8fc73f.png" alt="同花顺 Logo" class="source-logo">
              </a>
            </div>
          </div>
        </div>

        <!-- Mock: 行业景气指数待接入API
        <div class="card">
          <div class="card-header">
            <h3>行业景气指数</h3>
            <span class="card-badge mock-badge">Mock数据 · 待接入API</span>
          </div>
          <div class="card-body">
            <div class="industry-health">
              <div class="health-score">
                <span class="score-value is-up">72</span>
                <span class="score-label">景气度评分</span>
              </div>
              <div class="health-tags">
                <el-tag size="small" type="success">政策利好</el-tag>
                <el-tag size="small" type="warning">产能扩张</el-tag>
                <el-tag size="small" type="info">需求稳定</el-tag>
              </div>
            </div>
          </div>
        </div>
        Mock: 行业景气指数结束 -->
      </div>

      <!-- 长线视图 -->
      <div v-show="activeView === 'long'" class="view-content">
        <div class="card ai-analysis-card">
          <div class="card-header">
            <h3>长线AI研判</h3>
            <span class="card-badge mock-badge">Mock数据</span>
          </div>
          <div class="card-body">
            <div class="ai-conclusion">
              <span :class="['conclusion-badge', longCycleAnalysis.tone === 'bull' ? 'rating-buy' : 'rating-hold']">{{ longCycleAnalysis.conclusion }}</span>
            </div>
            <div class="ai-logic">
              <div class="markdown-content" v-html="longCycleAnalysis.coreHtml"></div>
            </div>
            <div class="cycle-evidence-list">
              <div v-for="item in longCycleAnalysis.evidence" :key="item.label" class="cycle-evidence-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
            <div class="ai-advice">
              <h4>投资建议</h4>
              <p>{{ longCycleAnalysis.advice }}</p>
            </div>
            <div class="ai-risk">
              <h4>风险提示</h4>
              <p>{{ longCycleAnalysis.risk }}</p>
            </div>
          </div>
        </div>

        <!-- Mock: 行业政策待接入API
        <div class="card">
          <div class="card-header">
            <h3>行业政策</h3>
            <span class="card-badge mock-badge">Mock数据 · 待接入API</span>
          </div>
          <div class="card-body">
            <div class="policy-list">
              <div class="policy-item">
                <span class="policy-tag is-good">利好</span>
                <span class="policy-text">《关于更高水平更高质量做好节能降碳工作的意见》发布</span>
              </div>
              <div class="policy-item">
                <span class="policy-tag is-good">利好</span>
                <span class="policy-text">新型储能发展规划落地，行业进入加速期</span>
              </div>
              <div class="policy-item">
                <span class="policy-tag is-neutral">中性</span>
                <span class="policy-text">电力市场化改革推进，电价波动性可能加大</span>
              </div>
            </div>
          </div>
        </div>
        Mock: 行业政策结束 -->

        <!-- Mock: 公司护城河待接入API
        <div class="card">
          <div class="card-header">
            <h3>公司护城河</h3>
            <span class="card-badge mock-badge">Mock数据 · 待接入API</span>
          </div>
          <div class="card-body">
            <div class="moat-grid">
              <div class="moat-item">
                <div class="moat-icon">🏆</div>
                <div class="moat-info">
                  <span class="moat-title">品牌溢价</span>
                  <span class="moat-desc">行业龙头品牌，市场认知度高</span>
                </div>
              </div>
              <div class="moat-item">
                <div class="moat-icon">📐</div>
                <div class="moat-info">
                  <span class="moat-title">规模效应</span>
                  <span class="moat-desc">装机容量行业前三，成本优势明显</span>
                </div>
              </div>
              <div class="moat-item">
                <div class="moat-icon">🔬</div>
                <div class="moat-info">
                  <span class="moat-title">技术壁垒</span>
                  <span class="moat-desc">核心专利126项，研发投入持续增长</span>
                </div>
              </div>
              <div class="moat-item">
                <div class="moat-icon">🔗</div>
                <div class="moat-info">
                  <span class="moat-title">产业链</span>
                  <span class="moat-desc">上下游一体化布局，供应链稳定</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        Mock: 公司护城河结束 -->

        <!-- Mock: 年报对比待接入API
        <div class="card">
          <div class="card-header">
            <h3>年报对比</h3>
            <span class="card-badge mock-badge">Mock数据 · 待接入API</span>
          </div>
          <div class="card-body">
            <div class="annual-grid">
              <div class="annual-item">
                <span class="annual-label">管理层薪酬</span>
                <span class="annual-value">同比+8%</span>
                <span class="annual-note">合理区间</span>
              </div>
              <div class="annual-item">
                <span class="annual-label">股东结构</span>
                <span class="annual-value">北向资金增持</span>
                <span class="annual-note is-up">积极信号</span>
              </div>
              <div class="annual-item">
                <span class="annual-label">资本回报率</span>
                <span class="annual-value">14.5%</span>
                <span class="annual-note is-up">高于行业</span>
              </div>
              <div class="annual-item">
                <span class="annual-label">自由现金流</span>
                <span class="annual-value">+18.3亿</span>
                <span class="annual-note is-up">持续为正</span>
              </div>
              <div class="annual-item">
                <span class="annual-label">分红率</span>
                <span class="annual-value">35.2%</span>
                <span class="annual-note">稳定分红</span>
              </div>
              <div class="annual-item">
                <span class="annual-label">商誉</span>
                <span class="annual-value">0.8亿</span>
                <span class="annual-note">风险较低</span>
              </div>
            </div>
          </div>
        </div>
        Mock: 年报对比结束 -->

        <div class="card tenx-card">
          <div class="card-header">
            <h3>10倍股模型</h3>
            <span class="card-badge mock-badge">Mock数据 · 待接入API</span>
          </div>
          <div class="card-body">
            <div class="tenx-hero" :class="getScoreClass(tenxModel.score)">
              <div class="tenx-score-ring">
                <svg viewBox="0 0 120 120" class="score-svg">
                  <defs>
                    <linearGradient id="scoreGradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#22c55e"/>
                      <stop offset="100%" style="stop-color:#16a34a"/>
                    </linearGradient>
                    <linearGradient id="scoreGradientMid" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#eab308"/>
                      <stop offset="100%" style="stop-color:#ca8a04"/>
                    </linearGradient>
                    <linearGradient id="scoreGradientLow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#ef4444"/>
                      <stop offset="100%" style="stop-color:#dc2626"/>
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="52" class="score-bg"/>
                  <circle cx="60" cy="60" r="52" class="score-fill" :class="getScoreClass(tenxModel.score)" :style="getScoreRingStyle(tenxModel.score)"/>
                </svg>
                <div class="score-center" :class="getScoreClass(tenxModel.score)">
                  <span class="score-value">{{ tenxModel.score }}</span>
                  <span class="score-label">模型评分</span>
                </div>
              </div>
              <div class="tenx-verdict">
                <span :class="['verdict-tag', getScoreClass(tenxModel.score), getMultipleClass(tenxModel.expectedMultiple)]">{{ tenxModel.expectedMultiple }}</span>
                <p class="verdict-text">{{ tenxModel.description }}</p>
                <div class="tenx-insight-inline">
                  <div class="insight-header">
                    <span class="insight-title">AI洞察</span>
                  </div>
                  <p class="insight-content">{{ tenxModel.insight }}</p>
                </div>
              </div>
            </div>
            <div class="tenx-dimensions-grid">
              <div v-for="dim in tenxModel.dimensions" :key="dim.name" class="dimension-item" :class="getScoreClass(dim.score)">
                <div class="dim-header">
                  <span class="dim-name">{{ dim.name }}</span>
                  <span class="dim-score" :class="getScoreClass(dim.score)">{{ dim.score }}</span>
                </div>
                <div class="dim-bar"><div class="dim-fill" :class="getScoreClass(dim.score)" :style="{ width: `${dim.score}%` }"></div></div>
                <div class="dim-detail">{{ dim.detail }}</div>
              </div>
            </div>
            <div class="tenx-data-source">
              <span class="source-label">数据来源：</span>
              <span class="source-list">财报数据、行业研报、专利数据库、政策文件</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="historyDialogVisible"
      :title="`${stockInfo.name || stockInfo.code} 历史AI评价`"
      width="min(860px, 96vw)"
      class="analysis-history-dialog"
    >
      <div class="analysis-history-content" v-loading="loadingHistory">
        <div v-if="historyErrorMessage" class="analysis-history-error">{{ historyErrorMessage }}</div>
        <template v-else>
          <div class="analysis-history-toolbar">
            <div class="analysis-history-summary">共 {{ historyPagination.total }} 条历史记录</div>
            <el-button size="small" plain @click="reloadHistoryPage" :loading="loadingHistory">重新加载</el-button>
          </div>
          <div class="analysis-history-timeline">
            <div class="history-timeline-head">
              <h4>评价强度时间轴</h4>
              <p>中性为 0，利好在上方，利空在下方</p>
            </div>
            <div v-if="historyRecords.length > 0" ref="historyTimelineChartRef" class="history-timeline-chart"></div>
            <el-empty v-else description="暂无时间轴数据" />
          </div>
          <div v-if="historyRecords.length > 0" class="analysis-history-list">
            <article v-for="(item, index) in historyRecords" :key="`${item.analysisTime}-${index}`" class="history-record-item">
              <div class="history-record-head">
                <span class="history-record-time">{{ item.analysisTime || '--' }}</span>
                <div class="history-record-actions">
                  <span class="history-record-conclusion" :class="getHistoryConclusionClass(item.conclusion)">{{ item.conclusion || '未知' }}</span>
                  <el-button size="small" text type="primary" class="history-detail-btn" @click="openHistoryDetail(item)">查看详细</el-button>
                </div>
              </div>
            </article>
          </div>
          <el-empty v-else description="暂无历史评价记录" />
          <div v-if="historyPagination.total > historyPagination.pageSize" class="analysis-history-pagination">
            <el-pagination background layout="prev, pager, next" :current-page="historyPagination.page" :page-size="historyPagination.pageSize" :total="historyPagination.total" @current-change="handleHistoryPageChange" />
          </div>
        </template>
      </div>
    </el-dialog>

    <el-dialog v-model="historyDetailDialogVisible" title="历史AI评价详情" width="min(620px, 96vw)" class="analysis-history-detail-dialog">
      <div v-if="selectedHistoryRecord" class="history-detail-content">
        <div class="history-detail-meta">
          <span class="history-detail-time">{{ selectedHistoryRecord.analysisTime || '--' }}</span>
          <span class="history-record-conclusion" :class="getHistoryConclusionClass(selectedHistoryRecord.conclusion)">{{ selectedHistoryRecord.conclusion || '未知' }}</span>
        </div>
        <section class="history-detail-block"><h4>核心逻辑</h4><p>{{ selectedHistoryRecord.coreLogic || '暂无核心逻辑' }}</p></section>
        <section class="history-detail-block"><h4>风险提示</h4><p>{{ selectedHistoryRecord.riskWarning || '暂无风险提示' }}</p></section>
      </div>
      <el-empty v-else description="暂无评价详情" />
    </el-dialog>

    <el-dialog v-model="newsDetailDialogVisible" title="新闻详情" width="50%">
      <div v-if="currentNewsDetail">
        <h3>{{ currentNewsDetail.title }}</h3>
        <div class="news-detail-content">{{ currentNewsDetail.content }}</div>
        <div class="news-footer"><span class="news-source">{{ currentNewsDetail.source }}</span><span class="news-time">{{ currentNewsDetail.publish_time }}</span></div>
        <a v-if="currentNewsDetail.url" :href="currentNewsDetail.url" target="_blank" rel="noopener noreferrer" class="news-link">查看原文</a>
      </div>
      <div v-else><el-empty description="暂无新闻详情"></el-empty></div>
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
import CycleSelect from '@/components/CycleSelect.vue';
import { useStockCycle } from '@/utils/stockCycle';
import { ttsApi } from '@/services/api';
import { getCuratedStockProfile } from '@/mock/curatedStocks';
import 'element-plus/es/components/message/style/css';
import * as echarts from 'echarts/core';

import { LineChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([LineChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, MarkLineComponent, AxisPointerComponent, CanvasRenderer]);

const STOCK_DETAIL_CACHE_MAX_AGE = 5 * 60 * 1000;
const stockDetailCache = {
  stockData: { code: '', ts: 0 },
  news: { code: '', ts: 0 },
  forecast: { code: '', ts: 0 },
  evaluation: { code: '', ts: 0 }
};
const isCacheFresh = (key, code) => {
  const entry = stockDetailCache[key];
  return entry && entry.code === code && (Date.now() - entry.ts) < STOCK_DETAIL_CACHE_MAX_AGE;
};
const markCacheFresh = (key, code) => {
  stockDetailCache[key] = { code, ts: Date.now() };
};
const invalidateCache = (code) => {
  Object.keys(stockDetailCache).forEach(key => {
    if (stockDetailCache[key].code === code) {
      stockDetailCache[key] = { code: '', ts: 0 };
    }
  });
};

export default {
  name: 'StockDetailView',
  components: { StockChart, CycleSelect },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const store = useStore();
    const activeView = ref('short');
    const viewTabs = [
      { key: 'short', label: '短线', desc: '日/周' },
      { key: 'mid', label: '中线', desc: '周/月' },
      { key: 'long', label: '长线', desc: '季/年' }
    ];
    const stockInfo = ref({
      name: '加载中...', code: route.params.code || '', market: '',
      regionBoard: '--', regionBoardTagId: '', price: '--', avgPrice: '--',
      change: 0, changeAmount: '--', changePercent: '--',
      industry: '--', industryTagId: '', listingDate: '--',
      totalShares: '--', floatShares: '--', totalSharesValue: null, floatSharesValue: null,
      open: '--', prevClose: '--', high: '--', low: '--',
      limitUp: '--', limitDown: '--', volume: '--', turnover: '--',
      turnoverRate: '--', volumeRatio: '--', outerVolume: '--', innerVolume: '--',
      marketCap: '--', floatMarketCap: '--', marketCapValue: null, floatMarketCapValue: null,
      infoUpdatedAt: '--', lastUpdated: '--'
    });
    const isLoggedIn = computed(() => store.getters.isLoggedIn);
    const isFavorite = ref(false);
    const addingToFavorites = ref(false);
    const { getCycle, setCycle } = useStockCycle();
    const stockCycle = computed(() => getCycle(stockInfo.value.code));
    const onStockCycleChange = (val) => {
      setCycle(stockInfo.value.code, val);
    };
    const stockNews = ref([]);
    const analysisResult = ref({ conclusion: '', date: '', coreLogic: '', coreLogicText: '', riskWarning: '', riskWarningText: '' });
    const currentNewsDetail = ref(null);
    const newsDetailDialogVisible = ref(false);
    const forecastData = ref({});
    const forecastSummary = ref('');
    const loadingForecast = ref(false);
    const newsLimit = ref(3);
    const newsCursor = ref(0);
    const totalNews = ref(0);
    const loadingMoreNews = ref(false);
    const md = new MarkdownIt({ breaks: true, linkify: true, typographer: true });
    const loadingEvaluation = ref(false);
    const evaluationErrorMessage = ref('');
    const evaluationProgressText = ref('');
    const evaluationStreamPreview = ref('');
    const streamedConclusion = ref('');
    const streamedCoreLogic = ref('');
    const streamedRiskWarning = ref('');
    const hasStreamDelta = ref(false);
    const curatedProfile = computed(() => getCuratedStockProfile(stockInfo.value.code));
    const isCuratedMockStock = computed(() => Boolean(curatedProfile.value));
    const showEvaluationOverlay = computed(() => loadingEvaluation.value && !hasStreamDelta.value && !isCuratedMockStock.value);
    const isStreamingEvaluation = computed(() => loadingEvaluation.value && hasStreamDelta.value);
    const isGeneratingEvaluationAudio = ref(false);
    const isPlayingEvaluationAudio = ref(false);
    let evaluationAudio = null;
    let evaluationAudioUrl = '';
    let evaluationTtsAbortController = null;

    const getCurrentStockName = () => curatedProfile.value?.name || stockInfo.value.name || '该股';
    const getCurrentTheme = () => curatedProfile.value?.theme || stockInfo.value.industry || '核心赛道';
    const getFocusText = (items, index, fallback) => Array.isArray(items) && items[index] ? items[index] : fallback;
    const scoreFromProfile = computed(() => Number(curatedProfile.value?.aiScore || 78));

    const buildCycleAnalysis = (cycle) => {
      const profile = curatedProfile.value;
      const name = getCurrentStockName();
      const theme = getCurrentTheme();
      const score = scoreFromProfile.value;
      const expectedMultiple = profile?.expectedMultiple || (score >= 86 ? '2倍' : '1.5倍');
      const risks = profile?.risks || ['若市场风险偏好下降，估值扩张节奏可能放缓'];
      const shortFocus = profile?.shortTermFocus || ['量价结构等待确认', '资金承接需要持续观察', '题材热度仍有波动'];
      const midFocus = profile?.midTermFocus || ['趋势结构保持健康', '业绩预期等待验证', '行业景气度逐步修复'];
      const longFocus = profile?.longTermFocus || ['产业空间仍在扩张', '核心壁垒需要验证', '估值弹性取决于盈利兑现'];

      if (cycle === 'short') {
        return {
          conclusion: score >= 90 ? '短线偏强' : score >= 84 ? '短线谨慎偏多' : '短线观察',
          tone: score >= 84 ? 'bull' : 'hold',
          coreLogic: [
            `${name}短线主要看${getFocusText(shortFocus, 0, '量价结构')}、${getFocusText(shortFocus, 1, '资金承接')}和${getFocusText(shortFocus, 2, '题材热度')}三项数据。`,
            `AI判断：当前${theme}方向仍有资金关注，若成交额维持活跃且回踩不破关键均线，短线情绪大概率继续偏强。`,
            `研判依据来自短线资金流、量价结构、板块热度和当前题材催化，而不是单纯分析资讯标题。`
          ].join('\n\n'),
          advice: score >= 90 ? '短线适合沿趋势轻仓跟随，回踩均线不破可分批观察；若放量冲高后资金承接转弱，不追高。' : '短线以观察为主，等放量突破或回踩确认后再提高仓位。',
          risk: `${risks[0]}；若板块热度降温或主力资金转为净流出，短线信号需要下调。`
        };
      }

      if (cycle === 'mid') {
        return {
          conclusion: score >= 90 ? '中线重点跟踪' : score >= 84 ? '中线结构偏强' : '中线等待确认',
          tone: score >= 84 ? 'bull' : 'hold',
          coreLogic: [
            `${name}中线研判重点不在单日涨跌，而在${getFocusText(midFocus, 0, '趋势结构')}、${getFocusText(midFocus, 1, '业绩预期')}和${getFocusText(midFocus, 2, '行业景气度')}是否同时改善。`,
            `AI判断：${profile?.investmentLogic || `${theme}方向具备阶段性景气修复逻辑，仍需等待业绩与订单验证。`}`,
            `如果后续业绩预测继续上修，且股价维持周线级别抬升，中线胜率会明显高于普通题材交易。`
          ].join('\n\n'),
          advice: score >= 90 ? '中线可作为重点观察仓，优先选择回踩不破趋势线时分批配置，避免在连续加速后一次性追入。' : '中线先等待业绩预测、行业景气和资金承接共振，确认后再提高配置比例。',
          risk: `${risks[0]}；若业绩预测下修或行业景气转弱，中线逻辑需要重新评估。`,
          evidence: [
            { label: '趋势结构', value: getFocusText(midFocus, 0, '周线趋势保持修复') },
            { label: '资金承接', value: getFocusText(midFocus, 1, '机构资金仍在观察') },
            { label: '业绩拐点', value: getFocusText(midFocus, 2, '等待盈利兑现') }
          ]
        };
      }

      return {
        conclusion: expectedMultiple === '10倍' ? '长线十倍潜力' : `长线${expectedMultiple}空间`,
        tone: expectedMultiple === '10倍' || score >= 84 ? 'bull' : 'hold',
        expectedMultiple,
        coreLogic: [
          `${name}长线研判重点是${theme}产业空间、公司壁垒和成长弹性，而不是短期价格波动。`,
          `AI判断：${profile?.investmentLogic || `${theme}方向具备长期成长想象力，但需要持续验证商业化和利润释放。`}`,
          `当前模型给出的预期空间为${expectedMultiple}，核心依据是${getFocusText(longFocus, 0, '产业空间')}、${getFocusText(longFocus, 1, '核心壁垒')}和${getFocusText(longFocus, 2, '成长曲线')}。`
        ].join('\n\n'),
        advice: expectedMultiple === '10倍' ? '长线适合按产业周期分批跟踪，不用短线涨跌判断价值；重点观察收入结构、毛利率和新业务兑现。' : '长线可作为趋势型配置观察，目标不是十倍弹性，而是等待行业景气和盈利改善推动估值修复。',
        risk: `${risks[0]}；若核心壁垒被削弱或产业增速低于预期，长线倍数空间会明显压缩。`,
        evidence: [
          { label: '产业空间', value: getFocusText(longFocus, 0, '产业需求扩张') },
          { label: '核心壁垒', value: getFocusText(longFocus, 1, '竞争优势待验证') },
          { label: '成长弹性', value: getFocusText(longFocus, 2, '盈利弹性释放') }
        ]
      };
    };

    const shortCycleAnalysis = computed(() => buildCycleAnalysis('short'));
    const midCycleAnalysis = computed(() => ({
      ...buildCycleAnalysis('mid'),
      coreHtml: md.render(buildCycleAnalysis('mid').coreLogic)
    }));
    const longCycleAnalysis = computed(() => ({
      ...buildCycleAnalysis('long'),
      coreHtml: md.render(buildCycleAnalysis('long').coreLogic)
    }));
    const useMockEvaluationForCode = (code) => Boolean(getCuratedStockProfile(code || stockInfo.value.code));

    const displayedConclusion = computed(() => {
      if (isStreamingEvaluation.value && streamedConclusion.value) return streamedConclusion.value;
      if (isCuratedMockStock.value) return shortCycleAnalysis.value.conclusion;
      return analysisResult.value.conclusion || '加载中...';
    });
    const displayedCoreLogic = computed(() => {
      if (isStreamingEvaluation.value) return md.render(streamedCoreLogic.value || 'AI 正在生成核心逻辑...');
      if (isCuratedMockStock.value) return md.render(shortCycleAnalysis.value.coreLogic);
      return analysisResult.value.coreLogic;
    });
    const displayedRiskWarning = computed(() => {
      if (isStreamingEvaluation.value) return md.render(streamedRiskWarning.value || 'AI 正在生成风险提示...');
      if (isCuratedMockStock.value) return md.render(shortCycleAnalysis.value.risk);
      return analysisResult.value.riskWarning;
    });
    const displayedInvestmentAdvice = computed(() => shortCycleAnalysis.value.advice);
    const displayedCoreLogicSource = computed(() => {
      if (isStreamingEvaluation.value) return streamedCoreLogic.value || '';
      if (isCuratedMockStock.value) return shortCycleAnalysis.value.coreLogic;
      return analysisResult.value.coreLogicText || '';
    });
    const displayedRiskWarningSource = computed(() => {
      if (isStreamingEvaluation.value) return streamedRiskWarning.value || '';
      if (isCuratedMockStock.value) return shortCycleAnalysis.value.risk;
      return analysisResult.value.riskWarningText || '';
    });

    const markdownToPlainText = (value) => {
      const source = String(value || '').trim(); if (!source) return '';
      const renderedHtml = md.render(source).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h[1-6]|blockquote)>/gi, '</$1>\n');
      if (typeof document !== 'undefined') { const container = document.createElement('div'); container.innerHTML = renderedHtml; return String(container.textContent || '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim(); }
      return source.replace(/\[(.*?)\]\((.*?)\)/g, '$1').replace(/[`*_>#-]/g, ' ').replace(/\s+/g, ' ').trim();
    };

    const displayedCoreLogicText = computed(() => markdownToPlainText(displayedCoreLogicSource.value));
    const displayedRiskWarningText = computed(() => markdownToPlainText(displayedRiskWarningSource.value));

    const evaluationTtsText = computed(() => {
      const sections = [];
      const conclusion = String(displayedConclusion.value || '').trim();
      const coreLogicText = displayedCoreLogicText.value;
      const riskWarningText = displayedRiskWarningText.value;

      if (conclusion) { sections.push(`结论：${conclusion}`); }
      if (coreLogicText) { sections.push(`核心逻辑：${coreLogicText}`); }
      if (riskWarningText) { sections.push(`风险提示：${riskWarningText}`); }

      return sections.join('\n');
    });

    const canPlayEvaluationAudio = computed(() => (
      !loadingEvaluation.value && Boolean(String(evaluationTtsText.value || '').trim())
    ));

    const clearEvaluationAudioUrl = () => {
      if (evaluationAudioUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(evaluationAudioUrl);
      }
      evaluationAudioUrl = '';
    };

    const disposeEvaluationAudioPlayback = () => {
      if (evaluationAudio) {
        evaluationAudio.pause();
        evaluationAudio.currentTime = 0;
        evaluationAudio.onended = null;
        evaluationAudio.onerror = null;
        evaluationAudio = null;
      }
      clearEvaluationAudioUrl();
      isPlayingEvaluationAudio.value = false;
    };

    const stopEvaluationAudio = () => {
      if (evaluationTtsAbortController) {
        evaluationTtsAbortController.abort();
        evaluationTtsAbortController = null;
      }
      isGeneratingEvaluationAudio.value = false;
      disposeEvaluationAudioPlayback();
    };

    const playEvaluationAudio = async () => {
      if (isPlayingEvaluationAudio.value) {
        stopEvaluationAudio();
        return;
      }

      const text = String(evaluationTtsText.value || '').trim();
      if (!text) {
        ElMessage.warning('暂无可播报的AI评价内容');
        return;
      }

      stopEvaluationAudio();
      isGeneratingEvaluationAudio.value = true;
      evaluationTtsAbortController = typeof AbortController !== 'undefined' ? new AbortController() : null;

      try {
        const audioBlob = await ttsApi.synthesize({
          text,
          voice: '晓晓',
          emotion: '温柔',
          provider: 'azure'
        }, {
          signal: evaluationTtsAbortController?.signal
        });

        evaluationTtsAbortController = null;
        disposeEvaluationAudioPlayback();

        if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
          throw new Error('当前浏览器不支持语音播放');
        }

        evaluationAudioUrl = URL.createObjectURL(audioBlob);
        evaluationAudio = new Audio(evaluationAudioUrl);
        evaluationAudio.onended = () => {
          disposeEvaluationAudioPlayback();
        };
        evaluationAudio.onerror = () => {
          disposeEvaluationAudioPlayback();
          ElMessage.error('语音播放失败，请稍后重试');
        };

        await evaluationAudio.play();
        isPlayingEvaluationAudio.value = true;
      } catch (error) {
        disposeEvaluationAudioPlayback();
        const aborted = error?.name === 'CanceledError'
          || error?.name === 'AbortError'
          || /aborted|canceled/i.test(String(error?.message || ''));
        if (!aborted) {
          console.error('播放AI评价语音失败:', error);
          ElMessage.error(error?.message || '语音合成失败，请稍后重试');
        }
      } finally {
        evaluationTtsAbortController = null;
        isGeneratingEvaluationAudio.value = false;
      }
    };

    const resetEvaluationStreamState = () => { evaluationProgressText.value = ''; evaluationStreamPreview.value = ''; streamedConclusion.value = ''; streamedCoreLogic.value = ''; streamedRiskWarning.value = ''; hasStreamDelta.value = false; };
    const extractStreamField = (source, field, nextFields = []) => {
      if (!source) return ''; const fieldPattern = new RegExp(`"${field}"\\s*:\\s*"`); const fieldMatch = fieldPattern.exec(source); if (!fieldMatch) return '';
      const start = fieldMatch.index + fieldMatch[0].length; let end = source.length;
      nextFields.forEach(nf => { const ni = source.indexOf(`"${nf}"`, start); if (ni !== -1 && ni < end) end = ni; });
      return source.slice(start, end).replace(/",?\s*$/, '').replace(/,\s*$/, '').replace(/}\s*$/, '').trim();
    };
    const syncStreamDraft = () => {
      const preview = evaluationStreamPreview.value; if (!preview) return;
      const jsonStart = preview.indexOf('{'); const jsonEnd = preview.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) { try { const parsed = JSON.parse(preview.slice(jsonStart, jsonEnd + 1)); if (parsed && typeof parsed === 'object') { streamedConclusion.value = parsed['结论'] || streamedConclusion.value; streamedCoreLogic.value = parsed['核心逻辑'] || streamedCoreLogic.value; streamedRiskWarning.value = parsed['风险提示'] || streamedRiskWarning.value; return; } } catch (_) {} }
      const c = extractStreamField(preview, '结论', ['核心逻辑', '风险提示']); const cl = extractStreamField(preview, '核心逻辑', ['风险提示']); const rw = extractStreamField(preview, '风险提示', []);
      if (c) streamedConclusion.value = c; if (cl) streamedCoreLogic.value = cl; if (rw) streamedRiskWarning.value = rw;
    };
    const appendStreamPreview = (text) => { if (!text || typeof text !== 'string') return; const normalized = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); const merged = `${evaluationStreamPreview.value}${normalized}`; const maxLength = 3000; evaluationStreamPreview.value = merged.length > maxLength ? `...${merged.slice(-maxLength)}` : merged; syncStreamDraft(); };
    const handleEvaluationStreamEvent = ({ event, data }) => {
      if (event === 'start') { evaluationProgressText.value = data?.message || '开始刷新个股评价...'; return; }
      if (event === 'progress') { evaluationProgressText.value = data?.message || '正在生成投资建议...'; return; }
      if (event === 'model.delta') { hasStreamDelta.value = true; evaluationProgressText.value = 'AI 正在生成投资建议...'; appendStreamPreview(typeof data === 'string' ? data : data?.content); return; }
      if (event === 'result') { evaluationProgressText.value = data?.message || '正在整理评估结果...'; return; }
      if (event === 'done') { evaluationProgressText.value = data?.message || '评估完成'; return; }
      if (event === 'error') { evaluationProgressText.value = data?.message || '评估失败'; }
    };
    const refreshAIEvaluation = async () => {
      if (isCuratedMockStock.value) {
        ElMessage.success('已刷新模拟AI研判');
        return;
      }
      if (!isLoggedIn.value) { ElMessage.warning('请先登录后刷新评测'); router.push('/login'); return; }
      loadingEvaluation.value = true; await loadAIEvaluation(true); loadingEvaluation.value = false;
    };
    const forecastChartRef = ref(null);
    const historyTimelineChartRef = ref(null);
    const historyDialogVisible = ref(false);
    const historyDetailDialogVisible = ref(false);
    const openingHistoryDialog = ref(false);
    const loadingHistory = ref(false);
    const historyErrorMessage = ref('');
    const historyRecords = ref([]);
    const selectedHistoryRecord = ref(null);
    const historyPagination = ref({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
    let forecastChartInstance = null;
    let historyTimelineChartInstance = null;
    const capitalFlowChartRef = ref(null);
    let capitalFlowChartInstance = null;
    const HISTORY_SCORE_MAP = Object.freeze({ '重大利好': 2, '利好': 1, '中性': 0, '利空': -1, '重大利空': -2 });
    const SCORE_LABEL_MAP = Object.freeze({ 2: '重大利好', 1: '利好', 0: '中性', '-1': '利空', '-2': '重大利空' });
    const normalizeAnalysisTimeText = (v) => v ? String(v).replace('T', ' ').trim() : '';
    const formatHistoryAxisTime = (v) => { const n = normalizeAnalysisTimeText(v).replace(/\.\d+$/, ''); if (!n) return '--'; const m = n.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/); return m ? `${m[2]}-${m[3]} ${m[4]}` : n; };
    const toAnalysisTimestamp = (v) => { const n = normalizeAnalysisTimeText(v).replace(/\.\d+$/, ''); if (!n) return 0; const p = Date.parse(n.replace(' ', 'T')); return Number.isFinite(p) ? p : 0; };
    const getHistoryScore = (c) => { const t = String(c || '').trim(); if (!t) return 0; if (HISTORY_SCORE_MAP.hasOwnProperty(t)) return HISTORY_SCORE_MAP[t]; if (t.includes('重大利好')) return 2; if (t.includes('利好')) return 1; if (t.includes('重大利空')) return -2; if (t.includes('利空')) return -1; if (t.includes('中性')) return 0; return 0; };
    const getHistoryScoreColor = (s) => { if (s >= 2) return '#b42318'; if (s > 0) return '#dc2626'; if (s <= -2) return '#166534'; if (s < 0) return '#15803d'; return '#64748b'; };
    const getHistoryConclusionClass = (c) => { const s = getHistoryScore(c); if (s >= 2) return 'is-strong-bull'; if (s > 0) return 'is-bull'; if (s <= -2) return 'is-strong-bear'; if (s < 0) return 'is-bear'; return 'is-neutral'; };
    const disposeHistoryTimelineChart = () => { if (historyTimelineChartInstance) { historyTimelineChartInstance.dispose(); historyTimelineChartInstance = null; } };
    const renderHistoryTimelineChart = () => {
      if (!historyTimelineChartRef.value || historyRecords.value.length === 0) { disposeHistoryTimelineChart(); return; }
      const rows = [...historyRecords.value].map(i => ({ ...i, analysisTime: normalizeAnalysisTimeText(i.analysisTime), score: getHistoryScore(i.conclusion) })).sort((a, b) => toAnalysisTimestamp(a.analysisTime) - toAnalysisTimestamp(b.analysisTime));
      disposeHistoryTimelineChart(); historyTimelineChartInstance = echarts.init(historyTimelineChartRef.value);
      historyTimelineChartInstance.setOption({
        grid: { left: 58, right: 20, top: 18, bottom: 62 },
        tooltip: { trigger: 'item', confine: true, formatter: (p) => { const d = p?.data || {}; return [`<strong>${d.analysisTime || '--'}</strong>`, `评级：${d.conclusion || '未知'}`, `强度：${SCORE_LABEL_MAP[Number(d.value) || 0] || '中性'}`].join('<br/>'); } },
        xAxis: { type: 'category', data: rows.map(i => formatHistoryAxisTime(i.analysisTime)), axisTick: { alignWithLabel: true }, axisLabel: { color: '#64748b', interval: rows.length > 12 ? 1 : 0, rotate: rows.length > 6 ? 24 : 0 }, axisLine: { lineStyle: { color: '#cbd5e1' } } },
        yAxis: { type: 'value', min: -2, max: 2, interval: 1, axisLabel: { formatter: (v) => SCORE_LABEL_MAP[v] || v, color: '#64748b' }, splitLine: { lineStyle: { color: '#e2e8f0', type: 'dashed' } }, axisLine: { lineStyle: { color: '#cbd5e1' } } },
        series: [{ type: 'line', smooth: false, symbol: 'circle', symbolSize: 10, lineStyle: { color: '#94a3b8', width: 2 }, data: rows.map(i => ({ value: i.score, analysisTime: i.analysisTime, conclusion: i.conclusion, itemStyle: { color: getHistoryScoreColor(i.score), borderColor: '#ffffff', borderWidth: 1.5 } })), markLine: { symbol: 'none', silent: true, label: { show: false }, lineStyle: { color: '#94a3b8', width: 1, type: 'dashed' }, data: [{ yAxis: 0 }] } }]
      });
    };
    const loadEvaluationHistory = async (page = 1) => {
      if (!stockInfo.value.code) return; loadingHistory.value = true; historyErrorMessage.value = '';
      try { const r = await store.dispatch('fetchStockEvaluationHistory', { stockCode: stockInfo.value.code, page, pageSize: historyPagination.value.pageSize }); historyRecords.value = Array.isArray(r?.history) ? r.history : []; historyPagination.value = { page: Number(r?.page) || page, pageSize: Number(r?.pageSize) || historyPagination.value.pageSize, total: Number(r?.total) || historyRecords.value.length, totalPages: Number(r?.totalPages) || 1 }; await nextTick(); renderHistoryTimelineChart(); }
      catch (e) { historyRecords.value = []; historyErrorMessage.value = e?.message || '加载历史评价失败'; disposeHistoryTimelineChart(); }
      finally { loadingHistory.value = false; }
    };
    const openHistoryDialog = async () => { historyDialogVisible.value = true; historyDetailDialogVisible.value = false; selectedHistoryRecord.value = null; openingHistoryDialog.value = true; await loadEvaluationHistory(1); openingHistoryDialog.value = false; };
    const openHistoryDetail = (r) => { selectedHistoryRecord.value = r ? { analysisTime: r.analysisTime || '', conclusion: r.conclusion || '', coreLogic: r.coreLogic || '', riskWarning: r.riskWarning || '' } : null; historyDetailDialogVisible.value = !!r; };
    const reloadHistoryPage = async () => { await loadEvaluationHistory(historyPagination.value.page || 1); };
    const handleHistoryPageChange = async (p) => { await loadEvaluationHistory(p); };
    const hasForecastChartData = computed(() => { const d = forecastData.value?.['业绩预测详表_详细指标预测']; return Array.isArray(d) && d.length > 0; });
    const hasMoreNews = computed(() => totalNews.value > stockNews.value.length);
    const parseChinaTimeToUnix = (t) => { if (!t || typeof t !== 'string') return 0; const m = t.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/); if (!m) return 0; return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]) - 8, Number(m[5]), Number(m[6])) / 1000); };
    const normalizeStockNewsItem = (i) => { const c = i.内容 || i.content || ''; return { id: i.ID || i.id || `${i.标题 || i.title || ''}-${i.时间 || i.time || ''}`, title: i.标题 || i.title || '', summary: c, content: c, url: i.链接 || i.url || '', time: i.时间 || i.time || '' }; };
    const generateForecastSummary = () => {
      if (forecastData.value && forecastData.value.摘要) { forecastSummary.value = forecastData.value.摘要; return; }
      if (!forecastData.value || !forecastData.value['预测年报每股收益']) return;
      const epsList = forecastData.value['预测年报每股收益']; const profitList = forecastData.value['预测年报净利润']; const detailIndicators = forecastData.value['业绩预测详表_详细指标预测'];
      if (!epsList || epsList.length === 0) return;
      const first = epsList[0]; const year = first['年度']; const orgCount = first['预测机构数']; const meanEPS = parseFloat(first['均值']);
      let profitMean = '--'; let profitGrowth = '';
      if (profitList && profitList.length > 0) { const p = profitList.find(x => x['年度'] === year); if (p) profitMean = parseFloat(p['均值']); }
      if (detailIndicators && Array.isArray(detailIndicators)) { const gi = detailIndicators.find(x => x['预测指标'] === '净利润增长率'); if (gi) { const k = `预测${year}-平均`; if (gi[k]) profitGrowth = parseFloat(gi[k].replace('%', '')); } }
      const today = new Date().toISOString().split('T')[0];
      let s = `截至${today}，6个月以内共有 ${orgCount} 家机构对${stockInfo.value.name}的${year}年度业绩作出预测；预测每股收益 ${meanEPS} 元，净利润 ${profitMean} 亿元`;
      if (profitGrowth !== '') { const n = parseFloat(profitGrowth); s += `，同比${n >= 0 ? '增长' : '减少'} ${Math.abs(n)}%`; }
      forecastSummary.value = s;
    };
    const renderForecastChart = () => {
      if (!forecastData.value || !forecastData.value['业绩预测详表_详细指标预测'] || !forecastChartRef.value) return;
      const containerWidth = forecastChartRef.value.offsetWidth || forecastChartRef.value.clientWidth;
      if (containerWidth === 0) return;
      if (forecastChartInstance) forecastChartInstance.dispose();
      forecastChartInstance = echarts.init(forecastChartRef.value);
      const details = forecastData.value['业绩预测详表_详细指标预测']; if (!details || details.length === 0) return;
      const firstRow = details[0]; const yearKeys = Object.keys(firstRow).filter(k => k.includes('实际值') || k.includes('平均')).sort();
      const years = yearKeys.map(k => { const m = k.match(/(\d{4})/); return m ? m[1] : k; });
      const getSeriesData = (name) => { const row = details.find(i => i['预测指标'].includes(name)); if (!row) return new Array(years.length).fill(0); return yearKeys.map(k => { let v = row[k]; if (!v || v === '--') return 0; let n = parseFloat(v.replace(/,/g, '')); if (v.includes('万')) return n / 10000; return n; }); };
      const rev = getSeriesData('营业收入(元)'); const np = getSeriesData('净利润(元)'); const npg = getSeriesData('净利润增长率');
      const rg = getSeriesData('营业收入增长率'); const roe = getSeriesData('净资产收益率'); const pe = getSeriesData('市盈率(动态)');
      const revRem = rev.map((r, i) => Math.max(0, r - (np[i] || 0)));
      forecastChartInstance.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (params) { let res = params[0].name + '<br/>'; params.forEach(p => { if (p.seriesName === '营业收入(剩余)') return; let v = p.value; if (p.seriesName.includes('增长率') || p.seriesName.includes('收益率')) v += '%'; else if (p.seriesName.includes('利润') || p.seriesName.includes('收入')) v += '亿'; if (p.seriesName === '净利润') { res += `${p.marker} 净利润: ${v}<br/>`; res += `${p.marker} 营业收入: ${rev[params[0].dataIndex]}亿<br/>`; } else res += `${p.marker} ${p.seriesName}: ${v}<br/>`; }); return res; } },
        legend: { data: ['净利润', '净利润增长率', '营业收入增长率', '净资产收益率', '市盈率'], bottom: 0 },
        grid: [{ left: '3%', right: '55%', top: '15%', bottom: '10%', containLabel: true }, { left: '55%', right: '3%', top: '15%', bottom: '10%', containLabel: true }],
        xAxis: [{ type: 'category', data: years, gridIndex: 0 }, { type: 'category', data: years, gridIndex: 1 }],
        yAxis: [{ type: 'value', name: '金额(亿)', gridIndex: 0, splitLine: { show: false } }, { type: 'value', name: '增长率(%)', gridIndex: 0, splitLine: { show: false } }, { type: 'value', gridIndex: 1, splitLine: { show: true, lineStyle: { type: 'dashed' } } }],
        series: [
          { name: '净利润', type: 'bar', stack: 'revenue', data: np, xAxisIndex: 0, yAxisIndex: 0, itemStyle: { color: '#409EFF' } },
          { name: '营业收入(剩余)', type: 'bar', stack: 'revenue', data: revRem, xAxisIndex: 0, yAxisIndex: 0, itemStyle: { color: '#a0cfff' }, tooltip: { show: false } },
          { name: '净利润增长率', type: 'line', data: npg, xAxisIndex: 0, yAxisIndex: 1, itemStyle: { color: '#E6A23C' } },
          { name: '营业收入增长率', type: 'line', data: rg, xAxisIndex: 1, yAxisIndex: 2, itemStyle: { color: '#67C23A' } },
          { name: '净资产收益率', type: 'line', data: roe, xAxisIndex: 1, yAxisIndex: 2, itemStyle: { color: '#F56C6C' } },
          { name: '市盈率', type: 'line', data: pe, xAxisIndex: 1, yAxisIndex: 2, itemStyle: { color: '#909399' } }
        ]
      });
    };
    const renderCapitalFlowChart = () => {
      const el = capitalFlowChartRef.value;
      if (!el) return;
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        setTimeout(() => { renderCapitalFlowChart(); }, 150);
        return;
      }
      if (capitalFlowChartInstance) { capitalFlowChartInstance.dispose(); capitalFlowChartInstance = null; }
      capitalFlowChartInstance = echarts.init(el);
      var dates = ['04/21', '04/22', '04/23', '04/24', '04/25', '04/26', '04/27', '04/28', '04/29', '04/30'];
      var values = [-1.2, -0.8, 0.5, 1.3, 2.1, 1.8, -0.3, 3.2, 4.5, 6.83];
      var posData = [];
      var negData = [];
      for (var i = 0; i < values.length; i++) {
        posData.push(values[i] >= 0 ? values[i] : 0);
        negData.push(values[i] < 0 ? values[i] : 0);
      }
      capitalFlowChartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' }
        },
        grid: { left: 50, right: 20, top: 30, bottom: 30 },
        xAxis: {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLabel: { color: '#94a3b8', fontSize: 11 },
          axisLine: { lineStyle: { color: '#e2e8f0' } },
          axisTick: { show: false }
        },
        yAxis: {
          type: 'value',
          name: '亿',
          nameTextStyle: { color: '#94a3b8', fontSize: 11 },
          axisLabel: { color: '#94a3b8', fontSize: 11 },
          splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } },
          axisLine: { show: false },
          axisTick: { show: false }
        },
        series: [
          {
            name: '净流入',
            type: 'line',
            data: values,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#64748b', width: 2 },
            itemStyle: { color: '#64748b', borderColor: '#fff', borderWidth: 2 },
            label: {
              show: true,
              fontSize: 10,
              color: '#475569',
              formatter: function (p) { return p.value >= 0 ? '+' + p.value : '' + p.value; }
            },
            markLine: {
              silent: true,
              symbol: 'none',
              data: [{ yAxis: 0, lineStyle: { color: '#94a3b8', type: 'solid', width: 1 }, label: { show: false } }]
            }
          },
          {
            name: '正向',
            type: 'line',
            data: posData,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: { color: 'rgba(220,38,38,0.12)' },
            silent: true,
            z: 1
          },
          {
            name: '负向',
            type: 'line',
            data: negData,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 0 },
            areaStyle: { color: 'rgba(22,163,74,0.12)' },
            silent: true,
            z: 1
          }
        ]
      });
    };
    const loadForecast = async (refresh = false) => {
      if (loadingForecast.value) return; loadingForecast.value = true;
      try { const r = await store.dispatch('fetchStockForecast', { stockCode: stockInfo.value.code, refresh }); if (r && (r.symbol || r['股票代码'])) { forecastData.value = r; generateForecastSummary(); setTimeout(() => { renderForecastChart(); }, 0); } else { forecastData.value = {}; forecastSummary.value = ''; } }
      catch (e) { forecastData.value = {}; } finally { loadingForecast.value = false; if (!refresh) markCacheFresh('forecast', stockInfo.value.code); }
    };
    const refreshForecast = async () => { if (!isLoggedIn.value) return; await loadForecast(true); };
    const loadNewsAndAnalysis = async (append = false) => {
      const requestLastTime = append ? newsCursor.value : 0; if (append) loadingMoreNews.value = true;
      try {
        const newsData = await store.dispatch('fetchStockNews', { stockCode: stockInfo.value.code, limit: newsLimit.value, lastTime: requestLastTime });
        const previousCount = stockNews.value.length; const incoming = (newsData?.list || []).map(normalizeStockNewsItem);
        if (!append) { stockNews.value = incoming; } else if (incoming.length > 0) { const merged = [...stockNews.value, ...incoming]; const seen = new Set(); stockNews.value = merged.filter(i => { const k = `${i.id}-${i.time}`; if (seen.has(k)) return false; seen.add(k); return true; }); }
        totalNews.value = Number(newsData?.total || stockNews.value.length);
        if (append && stockNews.value.length === previousCount) totalNews.value = stockNews.value.length;
        if (incoming.length > 0) { const last = incoming[incoming.length - 1]; const nc = parseChinaTimeToUnix(last.time); if (nc > 0) newsCursor.value = nc; }
      } catch (e) { if (!append) { stockNews.value = []; totalNews.value = 0; newsCursor.value = 0; } }
      finally { if (append) loadingMoreNews.value = false; if (!append) markCacheFresh('news', stockInfo.value.code); }
    };
    const loadMoreNews = async () => { if (!hasMoreNews.value || loadingMoreNews.value) return; await loadNewsAndAnalysis(true); };
    const loadAIEvaluation = async (refresh = false) => {
      evaluationErrorMessage.value = ''; resetEvaluationStreamState();
      evaluationProgressText.value = refresh ? '正在连接流式评估服务...' : '正在获取AI评估结果...';
      try {
        const evaluation = await store.dispatch('fetchStockEvaluation', { stockCode: stockInfo.value.code, refresh, stream: true, onStreamEvent: handleEvaluationStreamEvent });
        if (evaluation) { analysisResult.value = { conclusion: evaluation.conclusion || '未知', date: evaluation.analysisTime || '--', coreLogic: md.render(evaluation.coreLogic || '暂无核心逻辑'), coreLogicText: evaluation.coreLogic || '暂无核心逻辑', riskWarning: md.render(evaluation.riskWarning || '暂无风险提示'), riskWarningText: evaluation.riskWarning || '暂无风险提示' }; }
        else { analysisResult.value = { conclusion: '未知', date: '--', coreLogic: '暂无AI评估数据', coreLogicText: '暂无AI评估数据', riskWarning: '无法获取AI评估结果', riskWarningText: '无法获取AI评估结果' }; }
      } catch (e) { evaluationErrorMessage.value = e?.message || '获取AI评估结果时发生错误'; analysisResult.value = { conclusion: '获取失败', date: '--', coreLogic: 'AI评估数据获取失败', coreLogicText: 'AI评估数据获取失败', riskWarning: '获取AI评估结果时发生错误', riskWarningText: '获取AI评估结果时发生错误' }; }
      finally { loadingEvaluation.value = false; resetEvaluationStreamState(); if (!refresh) markCacheFresh('evaluation', stockInfo.value.code); }
    };
    const toNumber = (v) => { if (v === null || v === undefined) return null; if (typeof v === 'number') return Number.isFinite(v) ? v : null; const n = String(v).replace(/,/g, '').trim(); if (!n) return null; const m = n.match(/^(-?\d+(?:\.\d+)?)(?:\s*)(亿|万)?(?:股|元|%)?$/); if (m) { const b = Number(m[1]); if (!Number.isFinite(b)) return null; if (m[2] === '亿') return b * 1e8; if (m[2] === '万') return b * 1e4; return b; } const p = Number(n.replace(/[^\d.-]/g, '')); return Number.isFinite(p) ? p : null; };
    const formatListingDate = (v) => { const t = v === null || v === undefined ? '' : String(v).trim(); if (!t) return '--'; if (/^\d{8}$/.test(t)) return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`; return t; };
    const formatScaledValue = (v, s = '') => { const n = toNumber(v); if (n === null) return typeof v === 'string' && v.trim() ? v : '--'; const a = Math.abs(n); if (a >= 1e8) return `${(n / 1e8).toFixed(2)}亿${s}`; if (a >= 1e4) return `${(n / 1e4).toFixed(2)}万${s}`; return `${n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}${s}`; };
    const formatPrice = (v) => { const n = toNumber(v); return n === null ? '--' : n.toFixed(2); };
    const formatPercentValue = (v) => { const n = toNumber(v); return n === null ? '--' : n.toFixed(2); };
    const formatPercentText = (v) => { const n = toNumber(v); return n === null ? '--' : `${n.toFixed(2)}%`; };
    const normalizeTagCode = (v) => { const c = String(v || '').trim().toUpperCase(); return /^BK\d{4}$/.test(c) ? c : ''; };
    const goToTagBoard = (tc, tn = '') => { const ntc = normalizeTagCode(tc); if (!ntc) return; const q = {}; const rn = String(tn || '').trim(); if (rn && rn !== '--') q.name = rn; router.push({ name: 'TagView', params: { tagCode: ntc }, query: q }); };
    const loadStockData = async () => {
      try {
        const snapshot = await store.dispatch('fetchStockSnapshot', stockInfo.value.code);
        if (snapshot) {
          const info = snapshot.info || {}; const quote = snapshot.quote || {};
          const lpn = toNumber(quote.最新价 ?? quote.最新价格 ?? quote.price ?? quote.latest_price);
          const apn = toNumber(quote.均价 ?? quote.avg_price);
          const cpn = toNumber(quote.涨跌幅 ?? quote.change_percent);
          const can = toNumber(quote.涨跌额 ?? quote.change_amount);
          const cn = can !== null ? can : (lpn !== null && cpn !== null ? lpn * cpn / 100 : 0);
          stockInfo.value = { ...stockInfo.value, name: info.股票简称 || quote.股票简称 || stockInfo.value.name || '未知', code: info.股票代码 || quote.股票代码 || stockInfo.value.code, market: info.市场代码 || quote.市场代码 || stockInfo.value.market || '', regionBoard: info.地域板块 || '--', regionBoardTagId: normalizeTagCode(info.地域板块ID), price: formatPrice(lpn), avgPrice: formatPrice(apn), change: cn, changeAmount: formatPrice(can), changePercent: formatPercentValue(cpn), industry: info.所属行业 || '未知行业', industryTagId: normalizeTagCode(info.行业板块ID), listingDate: formatListingDate(info.上市时间), totalShares: formatScaledValue(info.总股本, '股'), floatShares: formatScaledValue(info.流通股, '股'), totalSharesValue: toNumber(info.总股本), floatSharesValue: toNumber(info.流通股), open: formatPrice(quote.今开价 ?? quote.今开 ?? quote.开盘价 ?? quote.open), prevClose: formatPrice(quote.昨收价 ?? quote.昨收 ?? quote.prev_close), high: formatPrice(quote.最高价 ?? quote.最高 ?? quote.high), low: formatPrice(quote.最低价 ?? quote.最低 ?? quote.low), limitUp: formatPrice(quote.涨停价 ?? quote.limit_up), limitDown: formatPrice(quote.跌停价 ?? quote.limit_down), volume: formatScaledValue(quote.成交量 ?? quote.volume), turnover: formatScaledValue(quote.成交额 ?? quote.turnover, '元'), turnoverRate: formatPercentText(quote.换手率 ?? quote.turnover_rate), volumeRatio: formatPrice(quote.量比 ?? quote.volume_ratio), outerVolume: formatScaledValue(quote.外盘 ?? quote.outer_volume), innerVolume: formatScaledValue(quote.内盘 ?? quote.inner_volume), marketCap: formatScaledValue(info.总市值, '元'), floatMarketCap: formatScaledValue(info.流通市值, '元'), marketCapValue: toNumber(info.总市值), floatMarketCapValue: toNumber(info.流通市值), infoUpdatedAt: snapshot.infoUpdatedAt || '--', lastUpdated: quote.更新时间 || quote.时间 || quote.update_time || snapshot.quoteUpdatedAt || '--' };
          document.title = `${stockInfo.value.name}(${stockInfo.value.market || '未知'}${stockInfo.value.code}) - AI StockLink`;
          markCacheFresh('stockData', stockInfo.value.code);
        } else { ElMessage.error('获取股票数据失败'); }
      } catch (e) { ElMessage.error('获取股票数据失败'); }
    };
    const checkIfFavorite = () => { const fs = store.getters.favoriteStocks || []; isFavorite.value = fs.some(s => s.code === stockInfo.value.code); };
    const toggleFavorite = async () => {
      if (!isLoggedIn.value) { ElMessage.warning('请先登录'); router.push('/login'); return; }
      addingToFavorites.value = true;
      try {
        if (isFavorite.value) { const r = await store.dispatch('removeFavoriteStocks', [stockInfo.value.code]); if (r) { ElMessage.success(`已将 ${stockInfo.value.name} 从自选股中移除`); isFavorite.value = false; } else ElMessage.error(`移除失败`); }
        else { const r = await store.dispatch('addFavoriteStocks', [{ code: stockInfo.value.code, name: stockInfo.value.name }]); if (r) { ElMessage.success(`成功添加 ${stockInfo.value.name} 到自选股`); isFavorite.value = true; } else ElMessage.error(`添加失败`); }
      } catch (e) { ElMessage.error('操作失败，请稍后再试'); } finally { addingToFavorites.value = false; }
    };
    const getEvaluationClass = (c) => {
      if (!c) return ''; if (['看多', '强烈看多', '买入', '利好'].includes(c)) return 'rating-buy'; if (['重大利好'].includes(c)) return 'rating-strong-buy';
      if (['看空', '强烈看空', '卖出', '利空'].includes(c)) return 'rating-sell'; if (['重大利空'].includes(c)) return 'rating-strong-sell';
      if (['中性', '观望', '持有'].includes(c)) return 'rating-hold'; return '';
    };
    const viewNewsDetail = (n) => { if (!n) return; currentNewsDetail.value = { title: n.title || '', content: n.content || n.summary || '', source: '财联社', publish_time: n.time || '', url: n.url || '' }; newsDetailDialogVisible.value = true; };
    const priceUpdateTimer = ref(null); const newsUpdateTimer = ref(null);
    const setupAutoRefresh = () => { clearAutoRefreshTimers(); priceUpdateTimer.value = setInterval(() => { loadStockData(); }, 5 * 60 * 1000); newsUpdateTimer.value = setInterval(() => { loadNewsAndAnalysis(); }, 10 * 60 * 1000); };
    const clearAutoRefreshTimers = () => { if (priceUpdateTimer.value) { clearInterval(priceUpdateTimer.value); priceUpdateTimer.value = null; } if (newsUpdateTimer.value) { clearInterval(newsUpdateTimer.value); newsUpdateTimer.value = null; } };
    const handleWindowResize = () => { if (forecastChartInstance) forecastChartInstance.resize(); if (historyTimelineChartInstance) historyTimelineChartInstance.resize(); if (capitalFlowChartInstance) capitalFlowChartInstance.resize(); };
    watch(() => route.params.code, (nc) => {
      if (nc && nc !== stockInfo.value.code) {
        invalidateCache(stockInfo.value.code);
        stockInfo.value.code = nc; stockNews.value = []; totalNews.value = 0; newsCursor.value = 0;
        forecastData.value = {}; forecastSummary.value = '';
        historyDialogVisible.value = false; historyDetailDialogVisible.value = false; historyErrorMessage.value = '';
        historyRecords.value = []; selectedHistoryRecord.value = null;
        historyPagination.value = { page: 1, pageSize: historyPagination.value.pageSize, total: 0, totalPages: 1 };
        disposeHistoryTimelineChart();
        if (!isCacheFresh('stockData', nc)) loadStockData();
        if (!isCacheFresh('news', nc)) loadNewsAndAnalysis();
        if (!isCacheFresh('forecast', nc)) loadForecast();
        if (!useMockEvaluationForCode(nc) && !isCacheFresh('evaluation', nc)) { loadingEvaluation.value = true; loadAIEvaluation(false); }
        setupAutoRefresh(); window.scrollTo(0, 0);
      }
    });
    watch(isLoggedIn, async (l) => { if (l) { checkIfFavorite(); if (!useMockEvaluationForCode(stockInfo.value.code) && !isCacheFresh('evaluation', stockInfo.value.code)) { loadingEvaluation.value = true; await loadAIEvaluation(false); } } });
    watch(historyDialogVisible, async (v) => { if (!v) { historyDetailDialogVisible.value = false; selectedHistoryRecord.value = null; disposeHistoryTimelineChart(); return; } await nextTick(); renderHistoryTimelineChart(); setTimeout(() => { if (historyTimelineChartInstance) historyTimelineChartInstance.resize(); }, 80); });
    watch(activeView, async (nv) => {
      await nextTick();
      if (nv === 'short') {
        setTimeout(() => { renderCapitalFlowChart(); }, 100);
      }
      if (nv === 'mid') {
        setTimeout(() => {
          if (hasForecastChartData.value && forecastData.value) {
            if (forecastChartInstance) {
              forecastChartInstance.resize();
            } else {
              renderForecastChart();
            }
          }
        }, 100);
      }
    });
    onMounted(() => {
      window.scrollTo(0, 0);
      const currentCode = route.params.code || '';
      if (!stockInfo.value || !stockInfo.value.code) { stockInfo.value = { name: '加载中...', code: currentCode, market: '', regionBoard: '--', regionBoardTagId: '', price: '--', avgPrice: '--', change: 0, changeAmount: '--', changePercent: '--', industry: '--', industryTagId: '', listingDate: '--', totalShares: '--', floatShares: '--', totalSharesValue: null, floatSharesValue: null, open: '--', prevClose: '--', high: '--', low: '--', limitUp: '--', limitDown: '--', volume: '--', turnover: '--', turnoverRate: '--', volumeRatio: '--', outerVolume: '--', innerVolume: '--', marketCap: '--', floatMarketCap: '--', marketCapValue: null, floatMarketCapValue: null, infoUpdatedAt: '--', lastUpdated: '--' }; }
      if (!isCacheFresh('stockData', currentCode)) loadStockData();
      if (!isCacheFresh('news', currentCode)) loadNewsAndAnalysis();
      if (!isCacheFresh('forecast', currentCode)) loadForecast();
      if (isLoggedIn.value) checkIfFavorite();
      if (!useMockEvaluationForCode(currentCode) && !isCacheFresh('evaluation', currentCode)) { loadingEvaluation.value = true; loadAIEvaluation(false); }
      setupAutoRefresh(); window.addEventListener('resize', handleWindowResize); window.scrollTo(0, 0);
      setTimeout(() => { if (activeView.value === 'short') renderCapitalFlowChart(); }, 200);
    });
    onBeforeUnmount(() => { clearAutoRefreshTimers(); window.removeEventListener('resize', handleWindowResize); if (forecastChartInstance) { forecastChartInstance.dispose(); forecastChartInstance = null; } if (capitalFlowChartInstance) { capitalFlowChartInstance.dispose(); capitalFlowChartInstance = null; } disposeHistoryTimelineChart(); cancelFlowAnimationFrames(); });

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

    const getScoreClass = (score) => {
      const s = Number(score) || 0;
      if (s >= 75) return 'is-high';
      if (s >= 60) return 'is-mid';
      return 'is-low';
    };

    const getMultipleClass = (value) => {
      const multiple = Number(String(value || '').replace('倍', '').trim());
      if (multiple >= 10) return 'multiple-10';
      if (multiple >= 5) return 'multiple-5';
      if (multiple >= 3) return 'multiple-3';
      if (multiple >= 2) return 'multiple-2';
      return 'multiple-1';
    };

    const tenxModel = computed(() => {
      const profile = curatedProfile.value;
      const score = scoreFromProfile.value;
      const expectedMultiple = profile?.expectedMultiple || (score >= 86 ? '2倍' : '1.5倍');
      const theme = getCurrentTheme();
      const name = getCurrentStockName();
      const longFocus = profile?.longTermFocus || ['产业需求扩张', '竞争壁垒待验证', '盈利弹性释放'];
      const risks = profile?.risks || ['核心假设兑现不及预期'];
      const isTenx = expectedMultiple === '10倍';

      return {
        score,
        expectedMultiple,
        description: isTenx
          ? '模型识别为十倍潜力样本，重点看产业空间、商业化兑现和利润弹性是否持续共振。'
          : `模型识别为${expectedMultiple}潜力样本，更偏趋势成长与估值修复，不按十倍股处理。`,
        insight: `${name}的长线关键不在短期涨跌，而在${theme}赛道空间能否持续放大。AI模型当前最看重“${longFocus[0]}”，同时提示“${risks[0]}”是需要跟踪的第一风险。`,
        dimensions: [
          { name: '产业空间', score: Math.min(98, score + (isTenx ? 2 : 0)), detail: longFocus[0] || `${theme}需求仍在扩张` },
          { name: '核心壁垒', score: Math.max(62, score - 4), detail: longFocus[1] || '技术、客户和规模优势需要持续验证' },
          { name: '成长弹性', score: Math.max(58, score - 2), detail: longFocus[2] || '新业务放量决定利润弹性' },
          { name: '风险折扣', score: Math.max(55, score - (isTenx ? 10 : 14)), detail: risks[0] || '估值扩张需要基本面兑现支撑' }
        ]
      };
    });

    const getScoreLabel = (score) => {
      const s = Number(score) || 0;
      if (s >= 75) return '高潜力';
      if (s >= 60) return '中等潜力';
      return '潜力较低';
    };

    const getScoreDescription = (score) => {
      const s = Number(score) || 0;
      if (s >= 75) return '综合评分超过75分，符合历史10倍股核心特征';
      if (s >= 60) return '综合评分中等，部分维度需进一步观察';
      return '综合评分偏低，存在明显短板需谨慎';
    };

    const getScoreRingStyle = (score) => {
      const s = Number(score) || 0;
      const circumference = 2 * Math.PI * 52;
      const offset = circumference * (1 - s / 100);
      return {
        strokeDasharray: `${circumference}`,
        strokeDashoffset: `${offset}`
      };
    };

    return {
      activeView, viewTabs, stockInfo, isLoggedIn, isFavorite, addingToFavorites,
      stockCycle, onStockCycleChange,
      stockNews, analysisResult, currentNewsDetail, newsDetailDialogVisible,
      totalNews, hasMoreNews, loadingMoreNews, loadMoreNews,
      refreshAIEvaluation, loadingEvaluation, evaluationErrorMessage, evaluationProgressText,
      hasStreamDelta, showEvaluationOverlay, displayedConclusion, displayedCoreLogic, displayedRiskWarning,
      canPlayEvaluationAudio, isGeneratingEvaluationAudio, isPlayingEvaluationAudio, playEvaluationAudio,
      historyDialogVisible, historyDetailDialogVisible, loadingHistory, historyErrorMessage,
      historyRecords, selectedHistoryRecord, historyPagination, historyTimelineChartRef,
      openHistoryDialog, openingHistoryDialog, openHistoryDetail, reloadHistoryPage, handleHistoryPageChange,
      getHistoryConclusionClass, viewNewsDetail,
      forecastChartRef, forecastData, forecastSummary, loadingForecast, refreshForecast,
      hasForecastChartData, capitalFlowChartRef,
      isCuratedMockStock, midCycleAnalysis, longCycleAnalysis, tenxModel,
      toggleFavorite, getEvaluationClass, goToTagBoard, formatRatioText,
      mergedStructureChart, priceTrendClass,
      formatSignedPercent, formatSignedPrice,
      getScoreClass, getScoreLabel, getScoreDescription, getScoreRingStyle, getMultipleClass,
      displayedInvestmentAdvice
    };
  },
};
</script>

<style lang="scss" scoped>
.stock-detail-page {
  padding-top: 80px;
  .page-container { max-width: 1200px; margin: 0 auto; padding: 0 20px; @media (max-width: 576px) { padding: 0 12px; } }
  .stock-header {
    margin-bottom: 16px;
    .stock-title {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
      h1 {
        font-size: 1.8rem; margin: 0;
        .stock-code-container { display: inline-block; font-size: 1rem; color: var(--text-secondary); margin-left: 8px; border: 1px solid #ddd; padding: 2px 8px; border-radius: 4px; background-color: #f8f8f8; }
        .market-code { font-weight: bold; color: #409EFF; margin-right: 2px; }
        .code-separator { color: #999; margin: 0 2px; }
      }
      .stock-price-info { margin-left: auto; margin-right: 16px; .current-price { font-size: 1.4rem; font-weight: bold; margin-right: 8px; } .stock-up { color: var(--danger-color); } .stock-down { color: var(--success-color); } }
      > .el-button { margin-left: 5px; margin-right: 5px; }
      @media (max-width: 576px) { flex-wrap: wrap; align-items: flex-start; gap: 8px; h1 { width: 100%; font-size: 1.3rem; .stock-code-container { font-size: 0.85rem; margin-left: 6px; padding: 2px 6px; } } .stock-price-info { margin-left: 0; margin-right: 0; .current-price { font-size: 1.2rem; } } > .el-button { margin-left: auto; margin-right: 5px; } }
    }
    .stock-tags { display: flex; gap: 8px; flex-wrap: wrap; .tag-item.is-clickable { cursor: pointer; user-select: none; } }
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
        margin-top: 10px;
        margin-bottom: 10px;
        &:hover { border-color: #b9c6d7; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08); }
      }
      .capital-chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
      .capital-chart-title-wrap { min-width: 0; }
      .capital-chart-title { margin: 0; font-size: 0.96rem; font-weight: 600; color: #111827; line-height: 1.3; }
      .capital-chart-badge { display: inline-flex; flex-direction: column; align-items: flex-end; gap: 2px; padding: 4px 8px; border-radius: 6px; border: 1px solid #d8e0ea; background: #f8fafc; }
      .badge-label { font-size: 0.66rem; color: #6b7280; }
      .badge-value { font-size: 0.86rem; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums; }
      .capital-stacked-track { position: relative; display: flex; width: 100%; height: 12px; margin-bottom: 10px; border-radius: 999px; overflow: hidden; background: #eff3f8; border: 1px solid #e2e8f0; }
      .capital-stacked-segment { height: 100%; transition: width 0.68s ease; }
      .capital-stacked-segment.is-flow { background: linear-gradient(90deg, var(--flow-start) 0%, var(--flow-end) 100%); }
      .capital-stacked-segment.is-rest { background: linear-gradient(90deg, var(--rest-start) 0%, var(--rest-end) 100%); }
      .capital-chart-legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; @media (max-width: 576px) { grid-template-columns: 1fr; } }
      .legend-item { display: flex; align-items: center; gap: 6px; min-width: 0; padding: 6px 8px; border-radius: 6px; background: #fafbfc; border: 1px solid #e5e9f0; }
      .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; &.is-flow { background: linear-gradient(90deg, var(--flow-start) 0%, var(--flow-end) 100%); } &.is-rest { background: linear-gradient(90deg, var(--rest-start) 0%, var(--rest-end) 100%); } }
      .legend-label { font-size: 0.74rem; color: #6b7280; white-space: nowrap; flex-shrink: 0; }
      .legend-value { margin-left: auto; font-size: 0.82rem; font-weight: 600; color: #111827; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .capital-chart-metrics { margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
      .metric-row { display: grid; grid-template-columns: 56px 1fr auto; align-items: center; gap: 8px; padding: 4px 0; min-width: 0; }
      .metric-kind { font-size: 0.74rem; color: #6b7280; }
      .metric-desc { font-size: 0.8rem; color: #334155; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .metric-ratio { font-size: 0.8rem; font-weight: 600; color: #0f172a; font-variant-numeric: tabular-nums; }
      .capital-chart-note { margin: 8px 0 0; font-size: 0.74rem; color: #64748b; }
    }
  }

  .view-tabs {
    display: flex; margin-bottom: 20px; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    .view-tab {
      flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px 16px; border: none; background: #fff; cursor: pointer; transition: all 0.25s ease; border-bottom: 3px solid transparent;
      .tab-label { font-size: 1.1rem; font-weight: 600; color: #64748b; transition: color 0.25s; }
      .tab-desc { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; transition: color 0.25s; }
      &:hover { background: #f8fafc; .tab-label { color: #334155; } }
      &.is-active { background: #f0f7ff; border-bottom-color: #409EFF; .tab-label { color: #409EFF; } .tab-desc { color: #409EFF; } }
      &:not(:last-child) { border-right: 1px solid #e5e7eb; }
    }
  }

  .view-content { display: flex; flex-direction: column; gap: 16px; }

  .card {
    background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); overflow: hidden;
    .card-header {
      display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #f0f0f0;
      h3 { margin: 0; font-size: 1.1rem; font-weight: 600; color: #1e293b; }
      .card-actions { display: flex; align-items: center; gap: 8px; }
      .card-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; }
      .mock-badge { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; } // Mock样式，待接入API后可删除
    }
    .card-body { padding: 16px 20px; position: relative; &.is-loading { .ai-logic, .ai-risk { opacity: 0.35; } } &.chart-body { padding: 0; } }
  }

  .ai-conclusion {
    display: flex; align-items: center; gap: 12px; margin-bottom: 12px;
    .conclusion-badge {
      font-weight: bold; font-size: 1.6rem;
      &.rating-buy { color: #f56c6c; } &.rating-strong-buy { color: #ff0000; font-weight: 800; }
      &.rating-sell { color: #67c23a; } &.rating-strong-sell { color: #00cc00; font-weight: 800; }
      &.rating-hold { color: #0066cc; }
      &.is-hold { color: #0066cc; } &.is-bull { color: #f56c6c; } &.is-bear { color: #67c23a; }
    }
    .analysis-date { font-size: 0.85rem; color: #94a3b8; }
  }

  .card-actions {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;

    .analysis-date { font-size: 0.85rem; color: #94a3b8; margin-right: 4px; }

    .tts-play-btn {
      min-width: 32px; width: 32px; height: 32px; padding: 0; border-radius: 999px;
      border-color: #bfdbfe; color: #2563eb; background: #eff6ff;
      .tts-icon { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
      svg { width: 16px; height: 16px; display: block; }
      &:hover, &:focus { border-color: #93c5fd; color: #1d4ed8; background: #dbeafe; }
      &.is-playing { border-color: #fecaca; color: #dc2626; background: #fef2f2; &:hover, &:focus { border-color: #fca5a5; color: #b91c1c; background: #fee2e2; } }
    }

    .history-capsule-btn {
      border-radius: 999px; border-color: #cfd8e3; color: #334155; background: #f8fafc;
      &:hover, &:focus { border-color: #94a3b8; color: #1e293b; background: #f1f5f9; }
    }
  }

  .stock-news-list {
    margin-top: 0; margin-bottom: 10px;

    .news-item {
      padding: 15px 0; border-bottom: 1px solid var(--border-color);
      &:last-child { border-bottom: none; }

      h4.news-title {
        margin-top: 0; margin-bottom: 10px; font-size: 1.1rem; cursor: pointer;
        color: var(--primary-color); white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis; width: 100%; display: block;
      }

      .news-summary {
        color: var(--text-secondary); margin-bottom: 10px; line-height: 1.5;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        width: 100%; display: block;
      }

      .news-footer {
        display: flex; justify-content: space-between; align-items: center;
        font-size: 0.9rem; color: var(--text-tertiary);

        .news-link { color: var(--primary-color); text-decoration: none; &:hover { text-decoration: underline; } }
      }
    }

    .news-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; @media (max-width: 576px) { flex-wrap: wrap; gap: 8px; } }
    .news-total { font-size: 0.9rem; color: var(--text-tertiary); }
  }

  .analysis-powered-by {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 999px; border: 1px solid #d1d5db;
    background: #ffffff; color: #374151; font-size: 11px;
    text-decoration: none;
    &:hover { background: #f9fafb; }
    .analysis-powered-logo { display: inline-flex; align-items: center; gap: 3px; }
    .analysis-powered-logo-icon { width: 14px; height: 14px; }
    .analysis-powered-logo-text { height: 12px; }
  }

  .analysis-footer-section {
    display: flex; justify-content: flex-end; margin-bottom: 20px; padding-top: 16px;
  }

  .info-news-divider {
    height: 1px; background: #e5e7eb; margin: 24px -20px;
  }
  .ai-logic { margin-bottom: 12px; .markdown-content { line-height: 1.6; color: var(--text-secondary); :deep(p) { margin-bottom: 8px; } :deep(*) { overflow-wrap: break-word; } } }
  .ai-risk { h4 { font-size: 0.9rem; color: #64748b; margin: 0 0 6px; } .markdown-content { line-height: 1.6; color: #94a3b8; font-size: 0.9rem; } }
  .ai-advice {
    margin: 14px 0;
    padding: 12px 14px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;

    h4 {
      margin: 0 0 6px;
      color: #334155;
      font-size: 0.92rem;
    }

    p {
      margin: 0;
      color: #475569;
      line-height: 1.6;
      font-size: 0.9rem;
    }
  }

  .cycle-evidence-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 14px 0;

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
    }
  }

  .cycle-evidence-item {
    padding: 10px 12px;
    border-radius: 8px;
    background: #fff;
    border: 1px solid #edf2f7;

    span {
      display: block;
      color: #94a3b8;
      font-size: 0.78rem;
      margin-bottom: 4px;
    }

    strong {
      display: block;
      color: #1e293b;
      font-size: 0.9rem;
      line-height: 1.35;
    }
  }
  .analysis-error-message { color: #f56c6c; font-size: 0.9rem; margin-bottom: 12px; padding: 8px 12px; background: #fef0f0; border-radius: 6px; }
  .analysis-loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: 0 0 10px 10px; .analysis-loading-text { margin-top: 16px; color: #64748b; font-size: 0.9rem; } }
  .analysis-stream-status { text-align: center; padding: 8px; color: #94a3b8; font-size: 0.8rem; border-top: 1px solid #f0f0f0; margin-top: 8px; }

  .capital-flow-card {
    .card-body { padding: 0; }
  }
  .cf-block { padding: 14px 20px; }
  .cf-block + .cf-block { border-top: 1px solid #f1f5f9; }

  .cf-header-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: #fafbfc;
    .cf-stock-info {
      display: flex;
      align-items: baseline;
      gap: 6px;
      .cf-stock-name { font-size: 1rem; font-weight: 700; color: #0f172a; }
      .cf-stock-code { font-size: 0.75rem; color: #94a3b8; }
      .cf-ai-tag {
        display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;
        &.is-bull { background: rgba(220,38,38,0.1); color: #dc2626; }
        &.is-neutral { background: rgba(100,116,139,0.1); color: #475569; }
        &.is-bear { background: rgba(22,163,74,0.1); color: #16a34a; }
      }
    }
    .cf-price-info {
      display: flex;
      align-items: center;
      gap: 8px;
      &.is-up { .cf-current-price, .cf-change-badge { color: #dc2626; } .cf-change-badge { background: rgba(220,38,38,0.08); } }
      &.is-down { .cf-current-price, .cf-change-badge { color: #16a34a; } .cf-change-badge { background: rgba(22,163,74,0.08); } }
      .cf-current-price { font-size: 1rem; font-weight: 700; }
      .cf-change-badge { font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
    }
  }

  .cf-ai-conclusion {
    background: #f8fafc;
    .cf-ai-narrative {
      line-height: 1.6; font-size: 0.82rem;
      .cf-narrative-main { color: #1e293b; margin: 0 0 4px; }
      .cf-narrative-risk { color: #dc2626; margin: 0; }
    }
  }

  .cf-core-data {
    display: flex; gap: 0;
    .cf-hero-col {
      width: 40%; padding: 16px 20px; background: rgba(220,38,38,0.03); display: flex; flex-direction: column; justify-content: center;
      .cf-hero-label { font-size: 0.75rem; color: #94a3b8; margin-bottom: 4px; }
      .cf-hero-value { font-size: 2rem; font-weight: 800; line-height: 1.1; margin-bottom: 10px;
        &.is-up { color: #dc2626; }
        &.is-down { color: #16a34a; }
      }
      .cf-hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .cf-hero-tag {
        font-size: 0.7rem; padding: 2px 8px; border: 1px solid #e2e8f0; border-radius: 4px; color: #475569; background: #fff; white-space: nowrap;
      }
    }
    .cf-split-col {
      width: 60%; padding: 16px 20px; background: #fff;
      .cf-bidi-chart {
        display: flex; flex-direction: column; gap: 8px;
      }
      .cf-bidi-row {
        display: grid;
        grid-template-columns: 48px 1fr 1px 1fr 56px;
        align-items: center;
        gap: 0;
        height: 28px;
      }
      .cf-bidi-label {
        font-size: 0.75rem;
        color: #475569;
        font-weight: 500;
        text-align: left;
        padding-right: 6px;
      }
      .cf-bidi-axis {
        width: 1px;
        height: 100%;
        background: #cbd5e1;
        flex-shrink: 0;
      }
      .cf-bidi-track-left {
        height: 16px;
        position: relative;
        overflow: hidden;
      }
      .cf-bidi-track-right {
        height: 16px;
        position: relative;
        overflow: hidden;
      }
      .cf-bidi-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease;
        position: absolute;
        top: 0;
      }
      .cf-bidi-bar-right {
        left: 0;
        background: #dc2626;
        border-radius: 0 2px 2px 0;
      }
      .cf-bidi-bar-left {
        right: 0;
        background: #16a34a;
        border-radius: 2px 0 0 2px;
      }
      .cf-bidi-value {
        font-size: 0.75rem;
        font-weight: 600;
        text-align: right;
        padding-left: 6px;
        &.is-up { color: #dc2626; }
        &.is-down { color: #16a34a; }
      }
    }
  }

  .cf-trend {
    .cf-trend-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
      .cf-trend-title { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
      .cf-trend-badge {
        font-size: 0.72rem; font-weight: 600; color: #92400e; background: #fef3c7; padding: 2px 10px; border-radius: 4px;
      }
    }
    .cf-trend-chart { height: 200px; }
  }

  // Mock样式：财报分析，待接入API后可删除
  // .finance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; @media (max-width: 576px) { grid-template-columns: repeat(2, 1fr); } .finance-item { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; .finance-label { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 4px; } .finance-value { display: block; font-size: 1.2rem; font-weight: 600; color: #1e293b; margin-bottom: 2px; } .finance-change { display: block; font-size: 0.75rem; color: #94a3b8; &.is-up { color: #ef4444; } &.is-down { color: #22c55e; } } } }

  .forecast-summary-card { background: #f0f7ff; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; .summary-text { font-size: 0.9rem; line-height: 1.6; color: #334155; } }
  .forecast-charts-container { .forecast-chart { height: 400px; } }

  // Mock样式：行业景气指数，待接入API后可删除
  // .industry-health { display: flex; align-items: center; gap: 24px; .health-score { text-align: center; .score-value { display: block; font-size: 2.5rem; font-weight: 700; &.is-up { color: #ef4444; } &.is-down { color: #22c55e; } } .score-label { font-size: 0.8rem; color: #64748b; } } .health-tags { display: flex; flex-wrap: wrap; gap: 8px; } }

  // Mock样式：行业政策，待接入API后可删除
  // .policy-list { .policy-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; &:last-child { border-bottom: none; } .policy-tag { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap; &.is-good { background: #fef2f2; color: #dc2626; } &.is-bad { background: #f0fdf4; color: #16a34a; } &.is-neutral { background: #f8fafc; color: #64748b; } } .policy-text { font-size: 0.9rem; color: #334155; line-height: 1.5; } } }

  // Mock样式：公司护城河，待接入API后可删除
  // .moat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; @media (max-width: 576px) { grid-template-columns: 1fr; } .moat-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; .moat-icon { font-size: 1.5rem; flex-shrink: 0; } .moat-info { .moat-title { display: block; font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 2px; } .moat-desc { display: block; font-size: 0.8rem; color: #64748b; } } } }

  // Mock样式：年报对比，待接入API后可删除
  // .annual-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; @media (max-width: 576px) { grid-template-columns: repeat(2, 1fr); } .annual-item { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; .annual-label { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 4px; } .annual-value { display: block; font-size: 1rem; font-weight: 600; color: #1e293b; margin-bottom: 2px; } .annual-note { display: block; font-size: 0.75rem; color: #94a3b8; &.is-up { color: #ef4444; } &.is-down { color: #22c55e; } } } }

  .tenx-card {
    .tenx-hero {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 20px 0;
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      @media (max-width: 576px) {
        flex-direction: column;
        text-align: center;
      }
    }
    .tenx-score-ring {
      position: relative;
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }
    .score-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .score-bg {
      fill: none;
      stroke: #f1f5f9;
      stroke-width: 6;
    }
    .score-fill {
      fill: none;
      stroke-width: 6;
      stroke-linecap: round;
      transition: stroke-dashoffset 1s ease, stroke 0.3s ease;
      &.is-high { stroke: #22c55e; }
      &.is-mid { stroke: #eab308; }
      &.is-low { stroke: #ef4444; }
    }
    .score-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      &.is-high .score-value { color: #22c55e; }
      &.is-mid .score-value { color: #eab308; }
      &.is-low .score-value { color: #ef4444; }
    }
    .score-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      transition: color 0.3s ease;
    }
    .score-label {
      display: block;
      font-size: 0.7rem;
      color: #94a3b8;
      margin-top: 4px;
    }
    .tenx-verdict {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .verdict-tag {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      width: fit-content;
      transition: all 0.3s ease;
      &.is-high {
        background: transparent;
        color: #22c55e;
        border: 1px solid #22c55e;
      }
      &.is-mid {
        background: transparent;
        color: #eab308;
        border: 1px solid #eab308;
      }
      &.is-low {
        background: transparent;
        color: #ef4444;
        border: 1px solid #ef4444;
      }
      &.multiple-1 {
        color: #9a6700;
        border-color: #ffe58f;
        background: #fff8d6;
      }
      &.multiple-2 {
        color: #ad4e00;
        border-color: #ffd591;
        background: #fff1d6;
      }
      &.multiple-3 {
        color: #d4380d;
        border-color: #ffbb96;
        background: #fff2e8;
      }
      &.multiple-5 {
        color: #c41d7f;
        border-color: #ffadd2;
        background: #fff0f6;
      }
      &.multiple-10 {
        color: #cf1322;
        border-color: #ffa39e;
        background: #fff1f0;
      }
    }
    .verdict-text {
      font-size: 0.88rem;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }
    .tenx-insight-inline {
      padding: 10px 14px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }
    .tenx-dimensions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .dimension-item {
      padding: 12px 16px;
      border-radius: 6px;
      background: transparent;
      border: 1px solid #f1f5f9;
      transition: all 0.3s ease;
      &.is-high { border-left: 3px solid #22c55e; }
      &.is-mid { border-left: 3px solid #eab308; }
      &.is-low { border-left: 3px solid #ef4444; }
      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }
    }
    .dim-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .dim-icon {
      font-size: 1rem;
    }
    .dim-name {
      flex: 1;
      font-size: 0.88rem;
      font-weight: 600;
      color: #334155;
    }
    .dim-score {
      font-size: 0.9rem;
      font-weight: 700;
      padding: 1px 8px;
      border-radius: 4px;
      transition: all 0.3s ease;
      &.is-high { color: #22c55e; background: transparent; }
      &.is-mid { color: #eab308; background: transparent; }
      &.is-low { color: #ef4444; background: transparent; }
    }
    .dim-bar {
      height: 4px;
      background: #f1f5f9;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .dim-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.6s ease;
      &.is-high { background: #22c55e; }
      &.is-mid { background: #eab308; }
      &.is-low { background: #ef4444; }
    }
    .dim-detail {
      font-size: 0.78rem;
      color: #94a3b8;
    }
    .insight-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .insight-icon {
      font-size: 0.9rem;
    }
    .insight-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #64748b;
    }
    .insight-content {
      font-size: 0.78rem;
      color: #64748b;
      line-height: 1.6;
      margin: 0;
    }
    .tenx-data-source {
      font-size: 0.72rem;
      color: #cbd5e1;
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      .source-label {
        color: #94a3b8;
      }
    }
  }

  .star-loader { position: relative; width: 48px; height: 48px; .star-core { position: absolute; top: 50%; left: 50%; width: 12px; height: 12px; background: #409EFF; border-radius: 50%; transform: translate(-50%, -50%); animation: star-pulse 1.5s ease-in-out infinite; } .star-ring { position: absolute; top: 50%; left: 50%; width: 36px; height: 36px; border: 2px solid rgba(64, 158, 255, 0.3); border-radius: 50%; transform: translate(-50%, -50%); animation: star-ring-rotate 2s linear infinite; } .star-spark { position: absolute; width: 4px; height: 4px; background: #409EFF; border-radius: 50%; animation: star-spark-float 1.5s ease-in-out infinite; &.spark-one { top: 2px; left: 50%; animation-delay: 0s; } &.spark-two { right: 2px; top: 50%; animation-delay: 0.375s; } &.spark-three { bottom: 2px; left: 50%; animation-delay: 0.75s; } &.spark-four { left: 2px; top: 50%; animation-delay: 1.125s; } } }
  @keyframes star-pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; } }
  @keyframes star-ring-rotate { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }
  @keyframes star-spark-float { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

  .analysis-history-content { .analysis-history-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; .analysis-history-summary { font-size: 0.9rem; color: #64748b; } } .history-timeline-head { margin-bottom: 12px; h4 { margin: 0 0 4px; font-size: 1rem; } p { margin: 0; font-size: 0.8rem; color: #94a3b8; } } .history-timeline-chart { height: 200px; margin-bottom: 20px; } .analysis-history-list { .history-record-item { padding: 10px 0; border-bottom: 1px solid #f0f0f0; &:last-child { border-bottom: none; } .history-record-head { display: flex; align-items: center; justify-content: space-between; .history-record-time { font-size: 0.85rem; color: #64748b; } .history-record-actions { display: flex; align-items: center; gap: 8px; .history-record-conclusion { font-size: 0.85rem; font-weight: 600; &.is-strong-bull { color: #b42318; } &.is-bull { color: #dc2626; } &.is-neutral { color: #64748b; } &.is-bear { color: #15803d; } &.is-strong-bear { color: #166534; } } } } } } .analysis-history-pagination { margin-top: 16px; text-align: center; } }

  .history-detail-content { .history-detail-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; .history-detail-time { font-size: 0.9rem; color: #64748b; } .history-record-conclusion { font-weight: 600; &.is-strong-bull { color: #b42318; } &.is-bull { color: #dc2626; } &.is-neutral { color: #64748b; } &.is-bear { color: #15803d; } &.is-strong-bear { color: #166534; } } } .history-detail-block { margin-bottom: 16px; h4 { font-size: 0.95rem; color: #334155; margin: 0 0 8px; } p { font-size: 0.9rem; color: #64748b; line-height: 1.6; margin: 0; } } }

  .button-icon { width: 14px; height: 14px; vertical-align: middle; margin-right: 4px; }
  .refresh-btn { .button-icon { width: 12px; height: 12px; } }

  .stock-data-card {
    .card-body {
      position: relative;
      padding-bottom: 38px;
    }
    .data-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      width: 100%;

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
        }

        .metric-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #111827;
          word-break: break-word;

          &.trend-up {
            color: var(--danger-color);
            font-weight: 700;
          }
          &.trend-down {
            color: var(--success-color);
            font-weight: 700;
          }
          &.trend-flat {
            color: #4b5563;
            font-weight: 700;
          }
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

  .analysis-content {
    position: relative;
    padding-bottom: 34px;

    &.is-loading {
      .analysis-detail,
      .analysis-error-message {
        opacity: 0.35;
      }
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
              color: #f56c6c !important;
            }
            &.rating-strong-buy {
              color: #ff0000 !important;
              font-weight: 800;
            }
            &.rating-sell {
              color: #67c23a !important;
            }
            &.rating-strong-sell {
              color: #00cc00 !important;
              font-weight: 800;
            }
            &.rating-hold {
              color: #0066cc !important;
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

        .tts-play-btn {
          min-width: 32px;
          width: 32px;
          height: 32px;
          padding: 0;
          border-radius: 999px;
          border-color: #bfdbfe;
          color: #2563eb;
          background: #eff6ff;

          .tts-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }

          svg {
            width: 16px;
            height: 16px;
            display: block;
          }

          &:hover,
          &:focus {
            border-color: #93c5fd;
            color: #1d4ed8;
            background: #dbeafe;
          }

          &.is-playing {
            border-color: #fecaca;
            color: #dc2626;
            background: #fef2f2;

            &:hover,
            &:focus {
              border-color: #fca5a5;
              color: #b91c1c;
              background: #fee2e2;
            }
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
          font-size: 0.9em;
        }
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
