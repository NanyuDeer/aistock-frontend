﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
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
                <span :class="['cf-ai-tag', capitalFlowMock.tagClass]">{{ capitalFlowMock.tag }}</span>
              </div>
              <div class="cf-price-info" :class="stockInfo.change >= 0 ? 'is-up' : 'is-down'">
                <span class="cf-current-price">{{ stockInfo.price || '--' }}</span>
                <span class="cf-change-badge">{{ stockInfo.change >= 0 ? '+' : '' }}{{ stockInfo.changePercent || '--' }}%</span>
              </div>
            </div>

            <div class="cf-block cf-ai-conclusion">
              <div class="cf-ai-narrative">
                <p class="cf-narrative-main">{{ capitalFlowMock.narrative }}</p>
                <p class="cf-narrative-risk">风险：{{ capitalFlowMock.risk }}</p>
              </div>
              <div class="cf-hero-card">
                <span class="cf-hero-card-label">主力净流入</span>
                <span :class="['cf-hero-card-value', capitalFlowMock.mainInflow >= 0 ? 'is-up' : 'is-down']">
                  {{ formatFlowValue(capitalFlowMock.mainInflow) }}
                </span>
              </div>
            </div>

            <div class="cf-block cf-data-row">
              <div class="cf-split-col">
                <div class="cf-split-header">
                  <span class="cf-split-title">资金拆解</span>
                </div>
                <div ref="capitalSplitChartRef" class="cf-split-chart"></div>
              </div>
              <div class="cf-trend">
                <div class="cf-trend-header">
                  <span class="cf-trend-title">10日资金趋势</span>
                  <span class="cf-trend-badge">{{ capitalFlowMock.trendBadge }}</span>
                </div>
                <div ref="capitalFlowChartRef" class="cf-trend-chart"></div>
              </div>
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
          </div>
          <div class="card-body">
            <div class="ai-conclusion">
              <span :class="['conclusion-badge', midAiAnalysis.badgeClass]">{{ midAiAnalysis.conclusion }}</span>
            </div>
            <div class="ai-logic">
              <p>{{ midAiAnalysis.logic }}</p>
            </div>
            <div class="ai-basis">
              <h4>研判依据</h4>
              <ul>
                <li v-for="item in midAiAnalysis.basis" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="ai-risk">
              <h4>投资建议</h4>
              <ul class="ai-advice-list">
                <li v-for="item in midAiAnalysis.advice" :key="item">{{ item }}</li>
              </ul>
              <h4 class="risk-title">风险提示</h4>
              <ul class="ai-risk-list">
                <li v-for="item in midAiAnalysis.riskTips" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>财报分析</h3>
          </div>
          <div class="card-body">
            <div class="finance-grid">
              <div v-for="item in midMockData.finance" :key="item.label" class="finance-item">
                <span class="finance-label">{{ item.label }}</span>
                <span class="finance-value">{{ item.value }}</span>
                <span :class="['finance-change', item.type]">{{ item.change }}</span>
              </div>
            </div>
          </div>
        </div>

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

        <div class="card">
          <div class="card-header">
            <h3>行业景气指数</h3>
          </div>
          <div class="card-body industry-card-body">
            <div class="industry-health">
              <div class="industry-health-head">
                <div class="industry-health-title">
                  <span v-for="tag in midMockData.industryHealth.tags" :key="tag.text" class="industry-pill">{{ tag.text }}</span>
                </div>
                <div :class="['industry-score-number', midMockData.industryHealth.levelClass]">
                  <strong>{{ midMockData.industryHealth.score }}</strong>
                  <span>/ 100</span>
                </div>
              </div>
              <div class="industry-chart-wrap">
                <div ref="industryHealthChartRef" class="industry-line-chart" role="img" aria-label="行业景气指数趋势"></div>
              </div>
              <div class="industry-detail-title">行业详情（点击展开）</div>
              <div class="industry-detail-grid">
                <div v-for="item in midMockData.industryHealth.details" :key="item.title" class="industry-detail-item">
                  <span class="detail-icon">{{ item.icon }}</span>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.desc }}</span>
                  </div>
                  <span class="detail-arrow">›</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 长线视图 -->
      <div v-show="activeView === 'long'" class="view-content">
        <div class="card ai-analysis-card">
          <div class="card-header">
            <h3>长线AI研判</h3>
          </div>
          <div class="card-body">
            <div class="ai-conclusion">
              <span :class="['conclusion-badge', longAiAnalysis.badgeClass]">{{ longAiAnalysis.conclusion }}</span>
            </div>
            <div class="ai-logic">
              <p>{{ longAiAnalysis.logic }}</p>
            </div>
            <div class="ai-basis">
              <h4>研判依据</h4>
              <ul>
                <li v-for="item in longAiAnalysis.basis" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="ai-risk">
              <h4>投资建议</h4>
              <ul class="ai-advice-list">
                <li v-for="item in longAiAnalysis.advice" :key="item">{{ item }}</li>
              </ul>
              <h4 class="risk-title">风险提示</h4>
              <ul class="ai-risk-list">
                <li v-for="item in longAiAnalysis.riskTips" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="shouldShowTenxModel" class="card tenx-card">
          <div class="card-header">
            <h3>倍数潜力模型</h3>
          </div>
          <div class="card-body">
            <div v-if="tenxModel.error" class="tenx-error-block">
              <i class="el-icon-warning-outline" style="font-size:32px;color:#f56c6c;"></i>
              <p style="color:#f56c6c;font-size:14px;margin-top:8px;">评分获取失败，请稍后重试</p>
            </div>
            <div v-else class="tenx-hero" :class="getScoreClass(tenxModel.score)">
              <div class="tenx-radar-center-wrap">
                <canvas ref="tenxRadarCanvas" class="tenx-radar-canvas"></canvas>
                <div class="tenx-radar-score-overlay" :class="getScoreClass(tenxModel.score)">
                  <span class="tenx-radar-score-value">{{ tenxModel.score }}</span>
                  <span class="tenx-radar-score-label">{{ tenxModel.expectedMultiple }}</span>
                </div>
              </div>
              <div class="tenx-verdict">
                <span class="verdict-tag" :class="getScoreClass(tenxModel.score)">{{ tenxModel.label }}</span>
                <p class="verdict-text">{{ tenxModel.description }}</p>
                <div class="tenx-ai-conclusion">
                  <div class="tenx-ai-conclusion-header">
                    <i class="el-icon-chat-dot-round"></i>
                    <span>AI结论</span>
                  </div>
                  <p class="tenx-ai-conclusion-text">{{ tenxModel.aiConclusion }}</p>
                </div>
              </div>
            </div>
            <div class="tenx-dim-section-header">
              <span class="tenx-dim-section-title">八维因子详情</span>
              <button class="tenx-dim-toggle-btn" @click="tenxToggleAll">
                {{ tenxAllOpen ? '全部收起' : '全部展开' }}
              </button>
            </div>
            <div class="tenx-dimensions-grid">
              <template v-for="(dim, i) in tenxModel.dimensions" :key="dim.name">
                <div v-if="i === 4" class="tenx-dim-group-divider">
                  <span class="tenx-dim-group-label">后四维 · 能走多远</span>
                  <div class="tenx-dim-group-line"></div>
                </div>
                <div
                  class="tenx-dim-item"
                  :class="{ 'is-expanded': tenxExpandedDims.has(i), [getScoreClass(dim.score)]: true }"
                >
                  <div class="tenx-dim-head" @click="tenxToggleDim(i)">
                    <div class="tenx-dim-head-left">
                      <i :class="dim.iconClass" class="tenx-dim-icon" :style="{ color: tenxSColor(dim.score) }"></i>
                      <div>
                        <span class="tenx-dim-name">{{ dim.name }}</span>
                        <span class="tenx-dim-weight">{{ dim.weight }}%</span>
                        <div class="tenx-dim-question">{{ dim.question }}</div>
                      </div>
                    </div>
                    <div class="tenx-dim-head-right">
                      <span class="tenx-dim-score" :style="{ color: tenxSColor(dim.score) }">{{ dim.score }}</span>
                      <i class="el-icon-arrow-down tenx-dim-chevron" :class="{ open: tenxExpandedDims.has(i) }"></i>
                    </div>
                  </div>
                  <div class="tenx-dim-bar">
                    <div class="tenx-dim-bar-fill" :style="{ width: `${dim.score}%`, background: tenxSGrad(dim.score) }"></div>
                  </div>
                  <div class="tenx-dim-details" :class="{ open: tenxExpandedDims.has(i) }">
                    <div class="tenx-dim-details-inner">
                      <div v-for="(ind, j) in dim.indicators" :key="ind.name" class="tenx-ind-row">
                        <span class="tenx-ind-name">{{ ind.name }}</span>
                        <div class="tenx-ind-right">
                          <span class="tenx-ind-value">{{ ind.value }}</span>
                          <div class="tenx-ind-bar-track">
                            <div class="tenx-ind-bar-fill" :style="{ width: `${ind.score}%`, background: tenxSGrad(ind.score) }"></div>
                          </div>
                          <span class="tenx-ind-score" :style="{ color: tenxSColor(ind.score) }">{{ ind.score }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div class="tenx-data-source">
              <span class="source-label">数据来源：</span>模型基于历史数据，不构成投资建议
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>行业政策</h3>
          </div>
          <div class="card-body">
            <div class="policy-list">
              <div v-for="item in longMockData.policies" :key="item.text" class="policy-item">
                <span :class="['policy-tag', item.type]">{{ item.tag }}</span>
                <span class="policy-text">{{ item.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>公司护城河</h3>
          </div>
          <div class="card-body">
            <div class="moat-grid">
              <div v-for="item in longMockData.moats" :key="item.title" class="moat-item">
                <div class="moat-icon">{{ item.icon }}</div>
                <div class="moat-info">
                  <span class="moat-title">{{ item.title }}</span>
                  <span class="moat-desc">{{ item.desc }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>年报对比</h3>
          </div>
          <div class="card-body">
            <div class="annual-grid">
              <div v-for="item in longMockData.annual" :key="item.label" class="annual-item">
                <span class="annual-label">{{ item.label }}</span>
                <span class="annual-value">{{ item.value }}</span>
                <span :class="['annual-note', item.type]">{{ item.note }}</span>
              </div>
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
import { ref, onMounted, watch, onBeforeUnmount, computed, nextTick, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import MarkdownIt from 'markdown-it';
import StockChart from '@/components/StockChart.vue';
import CycleSelect from '@/components/CycleSelect.vue';
import { useStockCycle } from '@/utils/stockCycle';
import { ttsApi } from '@/services/api';
import { getCuratedStockProfile } from '@/mock/curatedStocks';
import { tenxApi } from '@/services/api';
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
    const showEvaluationOverlay = computed(() => loadingEvaluation.value && !hasStreamDelta.value);
    const isStreamingEvaluation = computed(() => loadingEvaluation.value && hasStreamDelta.value);
    const isGeneratingEvaluationAudio = ref(false);
    const isPlayingEvaluationAudio = ref(false);
    let evaluationAudio = null;
    let evaluationAudioUrl = '';
    let evaluationTtsAbortController = null;

    const displayedConclusion = computed(() => isStreamingEvaluation.value && streamedConclusion.value ? streamedConclusion.value : analysisResult.value.conclusion || '加载中...');
    const displayedCoreLogic = computed(() => isStreamingEvaluation.value ? md.render(streamedCoreLogic.value || 'AI 正在生成核心逻辑...') : analysisResult.value.coreLogic);
    const displayedRiskWarning = computed(() => isStreamingEvaluation.value ? md.render(streamedRiskWarning.value || 'AI 正在生成风险提示...') : analysisResult.value.riskWarning);
    const displayedCoreLogicSource = computed(() => isStreamingEvaluation.value ? (streamedCoreLogic.value || '') : (analysisResult.value.coreLogicText || ''));
    const displayedRiskWarningSource = computed(() => isStreamingEvaluation.value ? (streamedRiskWarning.value || '') : (analysisResult.value.riskWarningText || ''));

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

    const curatedProfile = computed(() => getCuratedStockProfile(stockInfo.value.code));
    const profileScore = computed(() => Number(curatedProfile.value?.aiScore || 78));
    const profileTheme = computed(() => curatedProfile.value?.theme || stockInfo.value.industry || '成长赛道');
    const profileName = computed(() => curatedProfile.value?.name || stockInfo.value.name || '该股');
    const expectedMultipleText = computed(() => curatedProfile.value?.expectedMultiple || '1.5倍');
    const expectedMultipleNumber = computed(() => Number(String(expectedMultipleText.value).replace('倍', '').trim()) || 1.5);

    const fifteenthPlanThemeMap = {
      '光通讯': '算力基础设施、数据中心网络升级和高速信息通信底座',
      '半导体': '集成电路、高端芯片和关键产业链自主可控',
      'AI应用': '人工智能+、数字经济和智能化应用落地',
      '商业航天': '商业航天、卫星互联网和空天信息产业',
      '机器人': '具身智能、智能制造和机器人产业',
      '锂电储能': '新型能源体系、新型储能和绿色低碳转型',
      '算电协同': '算力网络、能源数字化和算电协同基础设施',
      '新型储能': '新型能源体系、新型储能和绿色低碳转型'
    };

    const getFifteenthPlanStatement = (themeName) => {
      const rawName = String(themeName || '').trim();
      const matchedKey = Object.keys(fifteenthPlanThemeMap).find(key => rawName === key || rawName.includes(key) || key.includes(rawName));
      if (matchedKey) {
        return `${matchedKey}对应${fifteenthPlanThemeMap[matchedKey]}，属于十五五期间培育新质生产力、战略性新兴产业和未来产业时容易被重点关注的方向。`;
      }
      return `${rawName || '该方向'}与十五五期间培育新质生产力、发展战略性新兴产业的政策主线存在一定关联。`;
    };

    const getTenbaggerSimilarityScore = (baseScore, multiple) => {
      const score = Number(baseScore) || 78;
      const m = Number(multiple) || 1.5;
      if (m >= 10) return Math.min(98, Math.max(86, Math.round(score)));
      if (m >= 5) return Math.min(74, Math.max(68, Math.round(64 + m + (score - 85) * 0.25)));
      if (m >= 3) return Math.min(64, Math.max(56, Math.round(52 + m * 2 + (score - 85) * 0.18)));
      if (m >= 2) return Math.min(55, Math.max(48, Math.round(45 + m * 2.5 + (score - 85) * 0.12)));
      return Math.min(47, Math.max(38, Math.round(36 + m * 3 + (score - 85) * 0.1)));
    };

    const formatFlowValue = (value) => {
      const amount = Number(value) || 0;
      const abs = Math.abs(amount);
      const digits = abs >= 10 ? 1 : 2;
      return `${amount >= 0 ? '+' : '-'}${abs.toFixed(digits)}亿`;
    };

    const capitalFlowPresets = {
      '300308': { tag: '强承接', tagClass: 'is-bull', mainInflow: 8.46, ratio: '2.8%', fiveDay: 26.4, streak: '连买5天', trendBadge: '趋势：高位抱团第5天', narrative: '主力资金继续围绕光模块核心资产集中，超大单净买入占比提升，说明高位换手后仍有机构承接。', risk: '若单日成交放大但主力净流入转负，说明抱团资金开始松动。', trend: [1.2, 2.6, 3.4, 1.9, 4.8, 5.6, 3.2, 6.1, 7.3, 8.46], orders: [{ label: '超大单', value: 4.96 }, { label: '大单', value: 3.5 }, { label: '中单', value: -1.14 }, { label: '小单', value: -1.82 }] },
      '002371': { tag: '稳步流入', tagClass: 'is-bull', mainInflow: 4.18, ratio: '1.6%', fiveDay: 11.2, streak: '连买3天', trendBadge: '趋势：权重资金回补', narrative: '半导体设备权重资金以稳步回补为主，大单净流入强于超大单，偏机构底仓加仓节奏。', risk: '若设备板块缩量回落且大单流入降至1亿以内，短线资金面支撑会减弱。', trend: [-0.6, 0.4, 1.1, -0.2, 1.8, 2.4, 1.7, 2.9, 3.6, 4.18], orders: [{ label: '超大单', value: 1.42 }, { label: '大单', value: 2.76 }, { label: '中单', value: -0.62 }, { label: '小单', value: -0.91 }] },
      '300058': { tag: '高换手', tagClass: 'is-bull', mainInflow: 6.72, ratio: '3.4%', fiveDay: 18.9, streak: '连买4天', trendBadge: '趋势：情绪主升第4天', narrative: 'AI应用人气资金继续涌入，超大单和大单同步净买入，但小单流出明显，说明筹码正在快速换手。', risk: '若次日高开后小单继续流出且超大单不再接力，容易出现剧烈震荡。', trend: [-1.5, 0.8, 2.6, 4.1, 3.2, -0.7, 5.4, 6.0, 4.9, 6.72], orders: [{ label: '超大单', value: 3.88 }, { label: '大单', value: 2.84 }, { label: '中单', value: -1.36 }, { label: '小单', value: -2.08 }] },
      '600118': { tag: '主题流入', tagClass: 'is-bull', mainInflow: 3.36, ratio: '2.0%', fiveDay: 9.8, streak: '连买3天', trendBadge: '趋势：主题资金抬升', narrative: '商业航天主题资金回流明显，超大单净流入温和但持续，更多体现为事件催化下的趋势抬升。', risk: '若主题催化降温且中单转为持续流出，短线承接会变弱。', trend: [-0.4, 0.6, 1.5, 1.2, 2.0, 2.6, 1.9, 2.7, 3.1, 3.36], orders: [{ label: '超大单', value: 1.18 }, { label: '大单', value: 2.18 }, { label: '中单', value: -0.48 }, { label: '小单', value: -0.76 }] },
      '688017': { tag: '放量抢筹', tagClass: 'is-bull', mainInflow: 5.27, ratio: '3.1%', fiveDay: 14.6, streak: '连买4天', trendBadge: '趋势：弹性资金加强', narrative: '机器人弹性资金明显增强，超大单净流入超过大单，显示资金更偏向抢筹核心零部件标的。', risk: '若机器人板块回落且超大单净流入低于1亿，高弹性资金可能快速撤离。', trend: [0.2, -0.5, 1.4, 2.3, 2.8, 3.6, 2.9, 4.2, 4.8, 5.27], orders: [{ label: '超大单', value: 3.04 }, { label: '大单', value: 2.23 }, { label: '中单', value: -0.82 }, { label: '小单', value: -1.4 }] },
      '300750': { tag: '低位回补', tagClass: 'is-neutral', mainInflow: 2.15, ratio: '0.7%', fiveDay: 5.6, streak: '连买2天', trendBadge: '趋势：权重修复初期', narrative: '新能源权重资金以低位回补为主，净流入金额不弱但占成交比例不高，说明当前更像估值修复。', risk: '若储能催化未延续且主力净流入重新回到负值，修复趋势可能放缓。', trend: [-2.1, -1.4, -0.6, 0.5, 1.2, -0.3, 0.8, 1.6, 1.9, 2.15], orders: [{ label: '超大单', value: 0.82 }, { label: '大单', value: 1.33 }, { label: '中单', value: -0.42 }, { label: '小单', value: -0.58 }] },
      '600406': { tag: '稳健增配', tagClass: 'is-neutral', mainInflow: 1.32, ratio: '0.9%', fiveDay: 4.1, streak: '连买3天', trendBadge: '趋势：慢速抬升', narrative: '电网权重资金呈稳健增配特征，大单流入为主，短线爆发力一般但流出压力较小。', risk: '若成交继续缩小且大单净流入转负，慢牛节奏可能进入横盘。', trend: [0.1, 0.3, 0.5, 0.4, 0.9, 1.0, 0.8, 1.1, 1.25, 1.32], orders: [{ label: '超大单', value: 0.38 }, { label: '大单', value: 0.94 }, { label: '中单', value: -0.22 }, { label: '小单', value: -0.31 }] },
      '688205': { tag: '试探流入', tagClass: 'is-bull', mainInflow: 2.86, ratio: '4.2%', fiveDay: 7.4, streak: '连买3天', trendBadge: '趋势：小市值弹性回暖', narrative: '光通讯小市值弹性资金开始试探流入，超大单不算极端，但大单承接改善明显。', risk: '若海外订单预期落空且大单转流出，资金会快速回到观望。', trend: [-0.8, -0.3, 0.2, 0.9, 1.6, 1.4, 2.1, 2.4, 2.6, 2.86], orders: [{ label: '超大单', value: 0.96 }, { label: '大单', value: 1.9 }, { label: '中单', value: -0.34 }, { label: '小单', value: -0.62 }] },
      '688008': { tag: '机构加仓', tagClass: 'is-bull', mainInflow: 3.94, ratio: '2.5%', fiveDay: 12.7, streak: '连买4天', trendBadge: '趋势：芯片资金回流', narrative: 'AI服务器芯片链条资金回流，超大单和大单结构均衡，显示机构加仓意愿较强。', risk: '若半导体整体冲高回落且超大单流入低于0.8亿，短线趋势会转弱。', trend: [0.5, 1.2, 0.9, 1.7, 2.2, 2.6, 3.4, 3.1, 3.8, 3.94], orders: [{ label: '超大单', value: 1.98 }, { label: '大单', value: 1.96 }, { label: '中单', value: -0.54 }, { label: '小单', value: -0.7 }] },
      '300136': { tag: '脉冲流入', tagClass: 'is-neutral', mainInflow: 1.76, ratio: '1.8%', fiveDay: 3.9, streak: '连买2天', trendBadge: '趋势：事件驱动脉冲', narrative: '卫星通信主题带来脉冲式流入，大单净买入较明显，但超大单参与度仍需继续观察。', risk: '若事件催化减弱且小单流出扩大，短线容易回到震荡。', trend: [-0.9, -0.2, 0.6, 1.4, 0.7, -0.4, 0.8, 1.2, 1.5, 1.76], orders: [{ label: '超大单', value: 0.42 }, { label: '大单', value: 1.34 }, { label: '中单', value: -0.28 }, { label: '小单', value: -0.56 }] },
      '002050': { tag: '白马回流', tagClass: 'is-bull', mainInflow: 4.62, ratio: '2.2%', fiveDay: 13.5, streak: '连买4天', trendBadge: '趋势：白马成长回流', narrative: '机器人链条扩散到白马成长股，机构资金回流清晰，大单和超大单同步净买入。', risk: '若机器人执行器预期降温且大单净流入小于1亿，资金会转为防守。', trend: [0.6, 1.0, 1.8, 2.2, 2.9, 3.1, 3.6, 4.0, 4.4, 4.62], orders: [{ label: '超大单', value: 2.12 }, { label: '大单', value: 2.5 }, { label: '中单', value: -0.64 }, { label: '小单', value: -0.96 }] },
      '002015': { tag: '分歧流入', tagClass: 'is-neutral', mainInflow: 0.88, ratio: '1.1%', fiveDay: 2.6, streak: '连买2天', trendBadge: '趋势：分歧修复', narrative: '算电协同方向有资金试探，但超大单参与度偏低，当前更像分歧中的修复而非主升。', risk: '若算力项目落地节奏不清晰，试探资金可能重新流出。', trend: [-0.7, -0.4, 0.1, 0.6, -0.2, 0.4, 0.7, 0.5, 0.9, 0.88], orders: [{ label: '超大单', value: 0.16 }, { label: '大单', value: 0.72 }, { label: '中单', value: -0.18 }, { label: '小单', value: -0.35 }] },
      '300438': { tag: '底部吸筹', tagClass: 'is-neutral', mainInflow: 1.08, ratio: '1.5%', fiveDay: 3.2, streak: '连买2天', trendBadge: '趋势：底部吸筹初期', narrative: '储能弹性资金有底部吸筹迹象，大单净流入改善，但还没有形成连续强势主升。', risk: '若电池价格继续下行且主力净流入转负，底部修复会延后。', trend: [-1.1, -0.8, -0.4, 0.2, 0.5, -0.1, 0.6, 0.9, 1.0, 1.08], orders: [{ label: '超大单', value: 0.28 }, { label: '大单', value: 0.8 }, { label: '中单', value: -0.24 }, { label: '小单', value: -0.42 }] }
    };

    const normalizeCapitalFlow = (preset) => {
      const source = preset || {
        tag: '观察',
        tagClass: 'is-neutral',
        mainInflow: 0.62,
        ratio: '0.6%',
        fiveDay: 1.4,
        streak: '观察中',
        trendBadge: '趋势：资金温和观察',
        narrative: '当前资金流向以温和观察为主，缺少连续主力净流入信号，短线更适合等待方向确认。',
        risk: '若主力净流入持续为负，短线资金面会偏弱。',
        trend: [-0.2, 0.1, 0.4, -0.1, 0.2, 0.5, 0.3, 0.7, 0.4, 0.62],
        orders: [{ label: '超大单', value: 0.12 }, { label: '大单', value: 0.5 }, { label: '中单', value: -0.18 }, { label: '小单', value: -0.26 }]
      };
      const maxOrder = Math.max(0.01, ...source.orders.map(item => Math.abs(Number(item.value) || 0)));
      return {
        ...source,
        tags: [`占比 ${source.ratio}`, `5日 ${formatFlowValue(source.fiveDay)}`, source.streak],
        orders: source.orders.map(item => ({
          ...item,
          width: Math.max(8, Math.round((Math.abs(Number(item.value) || 0) / maxOrder) * 88))
        }))
      };
    };

    const capitalFlowMock = computed(() => normalizeCapitalFlow(capitalFlowPresets[String(stockInfo.value.code || '')]));

    const industryHealthPresets = {
      '光通讯': { values: [70, 76, 74, 82, 87, 91, 93], details: [{ icon: '政', title: '相关政策', desc: '14项' }, { icon: '告', title: '重大公告', desc: '11条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      '半导体': { values: [56, 61, 65, 71, 78, 83, 86], details: [{ icon: '政', title: '相关政策', desc: '16项' }, { icon: '告', title: '重大公告', desc: '9条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      'AI应用': { values: [62, 69, 68, 76, 83, 88, 90], details: [{ icon: '政', title: '相关政策', desc: '12项' }, { icon: '告', title: '重大公告', desc: '8条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      '商业航天': { values: [48, 55, 60, 66, 72, 79, 83], details: [{ icon: '政', title: '相关政策', desc: '15项' }, { icon: '告', title: '重大公告', desc: '7条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      '机器人': { values: [52, 59, 64, 72, 80, 85, 88], details: [{ icon: '政', title: '相关政策', desc: '13项' }, { icon: '告', title: '重大公告', desc: '10条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      '锂电储能': { values: [45, 49, 52, 58, 64, 69, 72], details: [{ icon: '政', title: '相关政策', desc: '9项' }, { icon: '告', title: '重大公告', desc: '5条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      '算电协同': { values: [50, 57, 63, 70, 77, 82, 85], details: [{ icon: '政', title: '相关政策', desc: '11项' }, { icon: '告', title: '重大公告', desc: '6条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] },
      '新型储能': { values: [40, 46, 52, 59, 67, 72, 76], details: [{ icon: '政', title: '相关政策', desc: '10项' }, { icon: '告', title: '重大公告', desc: '6条' }, { icon: '排', title: '行业股票排行', desc: '查看' }] }
    };

    const getIndustryHealthClass = (score) => {
      const value = Number(score) || 0;
      if (value >= 85) return 'is-hot';
      if (value >= 70) return 'is-warm';
      if (value >= 50) return 'is-normal';
      return 'is-cold';
    };

    const getIndustryHealthPreset = (industryName) => {
      const rawName = String(industryName || '').trim();
      const matchedKey = Object.keys(industryHealthPresets).find(key => rawName === key || rawName.includes(key) || key.includes(rawName));
      if (matchedKey) return industryHealthPresets[matchedKey];

      const monthsCount = 7;
      const seed = rawName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const base = 48 + (seed % 18);
      const values = Array.from({ length: monthsCount }, (_, index) => {
        const wave = ((seed + index * 5) % 7) - 3;
        return Math.max(38, Math.min(82, Math.round(base + index * 3.2 + wave)));
      });
      return {
        values,
        details: [
          { icon: '政', title: '相关政策', desc: `${Math.max(4, Math.round(values[values.length - 1] / 10))}项` },
          { icon: '告', title: '重大公告', desc: `${Math.max(2, Math.round(values[values.length - 1] / 14))}条` },
          { icon: '排', title: '行业股票排行', desc: '查看' }
        ]
      };
    };

    const buildFinancialMock = (score, multiple) => {
      const revenueGrowth = Math.round(12 + score * 0.55 + multiple * 2);
      const profitGrowth = Math.round(revenueGrowth + 8 + multiple * 1.5);
      const pe = Math.max(18, Math.round(62 - score * 0.22 + multiple * 1.8));
      const pb = (2.1 + score / 55 + multiple / 8).toFixed(1);
      const margin = (22 + score * 0.18 + multiple * 0.6).toFixed(1);
      const roe = (10 + score * 0.13 + multiple * 0.35).toFixed(1);
      return [
        { label: '营收增速', value: `${revenueGrowth}%`, change: `较上季+${Math.max(2, Math.round(multiple))}%`, type: 'is-up' },
        { label: '净利增速', value: `${profitGrowth}%`, change: '利润弹性释放', type: 'is-up' },
        { label: 'PE(TTM)', value: `${pe}倍`, change: multiple >= 10 ? '成长估值' : '行业中枢', type: multiple >= 10 ? '' : 'is-down' },
        { label: 'PB', value: `${pb}倍`, change: '资产质量稳定', type: '' },
        { label: '毛利率', value: `${margin}%`, change: `+${(multiple / 2).toFixed(1)}%`, type: 'is-up' },
        { label: 'ROE', value: `${roe}%`, change: score >= 88 ? '高于行业' : '接近行业', type: 'is-up' }
      ];
    };

    const midMockData = computed(() => {
      const score = profileScore.value;
      const multiple = expectedMultipleNumber.value;
      const months = ['10月', '11月', '12月', '1月', '2月', '3月', '4月'];
      const industryPreset = getIndustryHealthPreset(profileTheme.value);
      const trendValues = months.map((month, index) => ({
        month,
        value: industryPreset.values[index] ?? industryPreset.values[industryPreset.values.length - 1] ?? 60
      }));
      const healthScore = trendValues[trendValues.length - 1].value;
      return {
        finance: buildFinancialMock(score, multiple),
        industryHealth: {
          score: healthScore,
          levelClass: getIndustryHealthClass(healthScore),
          tags: [
            { text: profileTheme.value, type: 'success' },
            { text: '东方财富数据', type: 'success' }
          ],
          months,
          trend: trendValues,
          values: trendValues.map(item => item.value),
          details: industryPreset.details
        }
      };
    });

    const midAiAnalysis = computed(() => {
      const profile = curatedProfile.value || {};
      const focus = profile.midTermFocus || ['趋势结构保持健康', '行业景气度仍在修复', '业绩拐点需要继续验证'];
      const risks = profile.risks || ['业绩兑现节奏低于预期', '板块交易拥挤导致波动加大'];
      const score = profileScore.value;
      const conclusion = score >= 90 ? '持有可顺势跟踪' : score >= 85 ? '关注等回踩确认' : '持有者稳健观察';
      const finance = midMockData.value.finance;
      const health = midMockData.value.industryHealth;
      const revenue = finance.find(item => item.label === '营收增速');
      const profit = finance.find(item => item.label === '净利增速');
      const margin = finance.find(item => item.label === '毛利率');
      const roe = finance.find(item => item.label === 'ROE');
      const planStatement = getFifteenthPlanStatement(profileTheme.value);
      const summary = `${profileName.value}中线核心在于${focus.slice(0, 2).join('和')}，财报增速、毛利率与行业景气度同步改善，说明这轮行情更像业绩与赛道共同验证。`;
      const advice = score >= 90
        ? [
          `已持有者可继续按趋势跟踪，重点观察回踩关键均线时是否仍有主力承接。`,
          `关注者不宜在连续放量急涨后追高，更适合等待缩量回踩或业绩预期再次确认。`,
          `若${focus[2] || '业绩兑现'}继续改善，同时行业景气指数维持高位，中线仓位可以保持偏积极。`,
          `若资金流向从连续净流入转为放量净流出，应先降低中线预期，等待下一次承接确认。`
        ]
        : [
          `已持有者可维持观察仓位，优先看${focus[0] || '趋势结构'}是否保持完整。`,
          `关注者建议等待放量确认或财报预期更清晰后再提高关注级别。`,
          `若行业景气指数继续上行，同时毛利率和ROE改善，中线判断可从观察转为偏积极。`,
          `若股价脱离业绩兑现过快，应以分批观察为主，不把主题热度当成中线确定性。`
        ];
      const riskTips = [
        `若${risks[0]}，中线逻辑会从业绩验证转为题材交易，估值支撑会变弱。`,
        `若行业景气指数回落到70分以下，说明赛道热度和订单预期开始降温。`,
        `若主力资金连续转净流出且成交放大，持有者需要防范趋势破位后的回撤。`
      ];
      return {
        conclusion,
        badgeClass: score >= 90 ? 'is-bull' : 'is-hold',
        logic: summary,
        basis: [
          `财报分析显示营收增速为${revenue?.value || '--'}、净利增速为${profit?.value || '--'}，利润弹性高于收入弹性，说明中线业绩拐点正在被数据支撑。`,
          `毛利率为${margin?.value || '--'}、ROE为${roe?.value || '--'}，若后续继续改善，说明公司不是单纯题材上涨，而是经营质量同步抬升。`,
          `行业景气指数为${health.score}分，标签集中在“${health.tags.map(tag => tag.text).join('、')}”，说明中线逻辑和所属赛道景气度保持一致。`,
          `政策维度上，${planStatement} 这会强化中线资金对赛道景气和订单兑现的跟踪，但仍需要用财报增速与资金承接继续验证。`,
          `第二步股票画像中的中线关注点为“${focus.join('、')}”，与当前财报和景气卡片方向一致，因此AI给出${conclusion}。`
        ],
        advice,
        riskTips
      };
    });

    const longMockData = computed(() => {
      const profile = curatedProfile.value || {};
      const theme = profileTheme.value;
      const focus = profile.longTermFocus || ['产业空间仍在扩张', '核心壁垒需要持续验证', '估值弹性取决于盈利兑现'];
      const multiple = expectedMultipleNumber.value;
      const planStatement = getFifteenthPlanStatement(theme);
      return {
        policies: [
          { tag: '利好', type: 'is-good', text: `${planStatement}长期需求预期因此更容易获得政策资源、产业资本和应用场景共振。` },
          { tag: '利好', type: 'is-good', text: `${focus[0]}，公司若能维持份额或切入核心客户，估值体系有望继续抬升。` },
          { tag: '中性', type: 'is-neutral', text: `需要关注产业节奏和订单兑现的时间差，长线逻辑不等于短期单边上涨。` }
        ],
        moats: [
          { icon: 'A', title: '技术壁垒', desc: focus[1] || '核心技术与产品验证周期形成进入门槛。' },
          { icon: 'C', title: '客户资源', desc: multiple >= 10 ? '若进入核心客户供应链，成长曲线将明显陡峭。' : '客户结构稳定，适合观察份额提升。' },
          { icon: 'S', title: '规模效应', desc: profile.investmentLogic || `${profileName.value}具备一定规模和产业链协同基础。` },
          { icon: 'G', title: '成长曲线', desc: focus[2] || '第二增长曲线是长期估值扩张的关键。' }
        ],
        annual: [
          { label: '研发投入', value: `同比+${Math.round(18 + multiple * 3)}%`, note: '持续加码', type: 'is-up' },
          { label: '股东结构', value: multiple >= 10 ? '成长资金增配' : '机构底仓稳定', note: '积极信号', type: 'is-up' },
          { label: '资本回报率', value: `${(12 + profileScore.value / 8).toFixed(1)}%`, note: '高于行业', type: 'is-up' },
          { label: '自由现金流', value: multiple >= 10 ? '拐点修复' : '持续为正', note: '质量改善', type: 'is-up' },
          { label: '分红率', value: multiple >= 10 ? '低分红高投入' : '稳定分红', note: multiple >= 10 ? '成长优先' : '稳健', type: '' },
          { label: '商誉', value: '低风险', note: '风险可控', type: '' }
        ]
      };
    });

    const longAiAnalysis = computed(() => {
      const profile = curatedProfile.value || {};
      const focus = profile.longTermFocus || ['产业空间', '核心壁垒', '成长弹性'];
      const risks = profile.risks || ['产业兑现节奏低于预期'];
      const multiple = expectedMultipleText.value;
      const multipleNumber = expectedMultipleNumber.value;
      const conclusion = multiple === '10倍'
        ? '长线可分批跟踪'
        : multipleNumber >= 3
          ? '长线弹性观察'
          : multipleNumber >= 2
            ? '长线稳健跟踪'
            : '长线耐心观察';
      const policies = longMockData.value.policies;
      const moats = longMockData.value.moats;
      const annual = longMockData.value.annual;
      const hasMultipleModel = Boolean(curatedProfile.value) && expectedMultipleNumber.value >= 1.5;
      const planStatement = getFifteenthPlanStatement(profileTheme.value);
      const tenxBasis = hasMultipleModel
        ? `倍数潜力模型给出${tenxModel.value.score}分和“${tenxModel.value.label}”，当前倍数预期为${multiple}，因此AI给出${conclusion}。`
        : `当前股票未进入精选倍数模型池，长线判断暂以行业政策、护城河和年报质量为主，不单独给出倍数预期。`;
      const summary = `${profileName.value}长线核心在于${focus.slice(0, 2).join('和')}，行业政策、护城河和年报投入共同支撑长期估值弹性。`;
      const advice = multiple === '10倍'
        ? [
          `已持有者可按长线高弹性样本跟踪，避免一次性重仓，适合用分批方式等待产业验证。`,
          `关注者优先等估值回落、业绩公告或订单数据确认，不把短期题材上涨直接等同于十倍股兑现。`,
          `若${focus[0] || '产业空间'}和${focus[1] || '核心壁垒'}持续验证，倍数潜力模型的高分才有继续上修基础。`,
          `长期跟踪重点放在研发投入、客户突破、现金流改善和政策落地四个维度。`
        ]
        : [
          `已持有者可按趋势龙头做长期观察，核心是验证${focus[0] || '产业空间'}能否持续兑现。`,
          `关注者不必按十倍股预期定价，更适合在估值和业绩匹配时分批跟踪。`,
          `若护城河、研发投入和资本回报率继续改善，${multiple}空间的可信度会提高。`,
          `若长期逻辑没有新订单或新利润验证，应降低倍数预期，把它视作稳健成长而非高弹性标的。`
        ];
      const riskTips = [
        `核心风险是${risks[0]}，一旦兑现，倍数潜力模型会先从成长动能和赛道景气两项下修。`,
        `若政策催化强但订单、利润和现金流没有同步改善，长线逻辑容易停留在主题阶段。`,
        `若估值提前大幅透支，后续即使行业方向正确，也可能出现较长时间的震荡消化。`
      ];
      return {
        conclusion,
        badgeClass: multiple === '10倍' ? 'is-bull' : 'is-hold',
        logic: summary,
        basis: [
          `行业政策卡片中有${policies.filter(item => item.type === 'is-good').length}条利好线索，核心方向是“${profileTheme.value}”；${planStatement} 说明长期产业空间仍有政策、资本和场景落地推动。`,
          `公司护城河卡片显示“${moats.map(item => item.title).join('、')}”四个维度，分别对应技术、客户、规模和成长曲线，是长线估值能否扩张的基础。`,
          `年报对比中研发投入为${annual.find(item => item.label === '研发投入')?.value || '--'}，资本回报率为${annual.find(item => item.label === '资本回报率')?.value || '--'}，说明长期逻辑既看投入，也看回报质量。`,
          tenxBasis,
          hasMultipleModel
            ? `需要反向跟踪的风险是：${risks[0]}，如果这个风险兑现，长线倍数模型会先于股价表现下修。`
            : `需要反向跟踪的风险是：${risks[0]}，如果这个风险兑现，长线判断会先从护城河和年报质量两项下修。`
        ],
        advice,
        riskTips
      };
    });

    // TenX 八维定义（与 TenxScoreView 一致）
    const TENX_DIMS = [
      { name: '成长性', iconClass: 'el-icon-top', weight: 20, question: '能长多大？', indNames: ['营收3年CAGR','净利润3年CAGR','扣非净利3年CAGR','盈利质量提升(净利增速-营收增速)'] },
      { name: '盈利能力', iconClass: 'el-icon-coin', weight: 15, question: '赚钱效率？', indNames: ['ROE(3年均)','ROIC(3年均)','毛利率(3年均)','净利率(3年均)'] },
      { name: '估值潜力', iconClass: 'el-icon-data-analysis', weight: 15, question: '贵不贵？', indNames: ['PEG','PE分位数(5年)','PB分位数(5年)','市值规模'] },
      { name: '行业赛道', iconClass: 'el-icon-aim', weight: 12, question: '赛道宽不宽？', indNames: ['行业景气指数','行业渗透率/市场空间','政策支持评分','集中度提升空间'] },
      { name: '财务健康', iconClass: 'el-icon-first-aid-kit', weight: 12, question: '资金链安全吗？', indNames: ['流动比率/速动比率','利息保障倍数','自由现金流(3年均)','资产负债率(反)'] },
      { name: '竞争壁垒', iconClass: 'el-icon-lock', weight: 12, question: '护城河宽不宽？', indNames: ['市占率','毛利率稳定性(3年)','研发投入占比(3年均)','无形资产占比(品牌/专利)'] },
      { name: '管理层治理', iconClass: 'el-icon-user', weight: 7, question: '人靠不靠谱？', indNames: ['大股东质押比(反)','高管增减持净比','管理层持股比例','分红率(3年均)'] },
      { name: '催化剂强度', iconClass: 'el-icon-sunny', weight: 7, question: '什么时候爆发？', indNames: ['业绩加速信号','订单/合同负债增速','分析师预期上修比例','事件催化密度评分'] }
    ];

    function tenxSColor(s) {
      if (s >= 70) return '#22c55e';
      if (s >= 50) return '#eab308';
      return '#ef4444';
    }
    function tenxSGrad(s) {
      if (s >= 70) return 'linear-gradient(90deg,#16a34a,#22c55e)';
      if (s >= 50) return 'linear-gradient(90deg,#ca8a04,#eab308)';
      return 'linear-gradient(90deg,#dc2626,#ef4444)';
    }

    const tenxExpandedDims = reactive(new Set());
    const tenxAllOpen = ref(false);
    const tenxRadarCanvas = ref(null);
    let tenxRadarChart = null;

    function tenxToggleDim(i) {
      if (tenxExpandedDims.has(i)) tenxExpandedDims.delete(i);
      else tenxExpandedDims.add(i);
    }
    function tenxToggleAll() {
      tenxAllOpen.value = !tenxAllOpen.value;
      TENX_DIMS.forEach((_, i) => {
        if (tenxAllOpen.value) tenxExpandedDims.add(i);
        else tenxExpandedDims.delete(i);
      });
    }

    function tenxGetRadarColors(score) {
      if (score >= 70) return { bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.7)', point: 'rgba(34,197,94,0.9)' };
      if (score >= 50) return { bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.7)', point: 'rgba(234,179,8,0.9)' };
      return { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.7)', point: 'rgba(239,68,68,0.9)' };
    }

    function tenxLoadChartJs() {
      return new Promise((resolve) => {
        if (window.Chart) { resolve(true); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
    }

    async function tenxUpdateRadar(data) {
      if (!tenxRadarCanvas.value) return;
      const loaded = await tenxLoadChartJs();
      if (!loaded) return;
      const Chart = window.Chart;
      if (!Chart) return;
      const ctx = tenxRadarCanvas.value.getContext('2d');
      const score = tenxModel.value ? tenxModel.value.score : 0;
      const colors = tenxGetRadarColors(score);
      if (tenxRadarChart) {
        tenxRadarChart.data.datasets[0].data = data;
        tenxRadarChart.data.datasets[0].backgroundColor = colors.bg;
        tenxRadarChart.data.datasets[0].borderColor = colors.border;
        tenxRadarChart.data.datasets[0].pointBackgroundColor = colors.point;
        tenxRadarChart.data.datasets[0].pointBorderColor = colors.border;
        tenxRadarChart.update();
        return;
      }
      // Set explicit canvas size
      const wrap = tenxRadarCanvas.value.parentElement;
      const w = wrap ? wrap.offsetWidth || 300 : 300;
      const h = wrap ? wrap.offsetHeight || 260 : 260;
      tenxRadarCanvas.value.width = w;
      tenxRadarCanvas.value.height = h;
      // Start from 0 for expand animation
      const zeroData = data.map(() => 0);
      tenxRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: TENX_DIMS.map(d => d.name),
          datasets: [{
            data: zeroData, fill: true,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 2,
            pointBackgroundColor: colors.point,
            pointBorderColor: colors.border,
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: false,
          scales: {
            r: {
              min: 0, max: 100,
              ticks: { stepSize: 25, color: 'rgba(144,147,153,0.4)', backdropColor: 'transparent', font: { size: 10 } },
              grid: { color: 'rgba(220,223,230,0.6)' },
              angleLines: { color: 'rgba(220,223,230,0.5)' },
              pointLabels: { color: '#606266', font: { size: 11, weight: '500' } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#fff', borderColor: '#dcdfe6', borderWidth: 1,
              titleColor: '#303133', bodyColor: '#606266', padding: 8, cornerRadius: 6,
              callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + '分' }
            }
          },
          animation: { duration: 0 }
        }
      });
      // Trigger expand animation: from 0 to actual values
      requestAnimationFrame(() => {
        tenxRadarChart.data.datasets[0].data = data;
        tenxRadarChart.options.animation = { duration: 1400, easing: 'easeOutQuart' };
        tenxRadarChart.update();
      });
    }

    const shouldShowTenxModel = computed(() => Boolean(curatedProfile.value) && expectedMultipleNumber.value >= 1.5);

    // 十倍股评分 — 从后端API获取
    const tenxApiData = ref(null);
    const tenxApiLoading = ref(false);
    const tenxApiError = ref(false);

    async function fetchTenxScore(symbol) {
      if (!symbol) return;
      tenxApiLoading.value = true;
      tenxApiError.value = false;
      try {
        const res = await tenxApi.getScore(symbol);
        if (res.code === 200 && res.data) {
          tenxApiData.value = res.data;
          tenxApiError.value = false;
        } else {
          try {
            const refreshRes = await tenxApi.refreshScore(symbol);
            if (refreshRes.code === 200 && refreshRes.data) {
              tenxApiData.value = refreshRes.data;
              tenxApiError.value = false;
            } else {
              tenxApiError.value = true;
            }
          } catch {
            tenxApiError.value = true;
          }
        }
      } catch {
        tenxApiError.value = true;
      }
      tenxApiLoading.value = false;
    }

    const tenxModel = computed(() => {
      if (tenxApiData.value) {
        const apiData = tenxApiData.value;
        const dimensions = apiData.dimensions || apiData.indicators || [];
        const dimScores = apiData.dim_scores || dimensions.map(d => d.score);
        return {
          score: apiData.score || 0,
          expectedMultiple: apiData.expected_multiple || '',
          label: apiData.label || '',
          description: apiData.description || '',
          aiConclusion: apiData.ai_conclusion || '',
          dimensions: dimensions.map(d => ({
            name: d.name,
            iconClass: TENX_DIMS.find(t => t.name === d.name)?.iconClass || 'el-icon-data-line',
            weight: d.weight,
            question: TENX_DIMS.find(t => t.name === d.name)?.question || '',
            score: d.score,
            indicators: d.indicators.map(ind => ({ name: ind.name, value: ind.value, score: ind.score }))
          })),
          dimScores
        };
      }
      // 后端获取失败
      return {
        score: 0,
        expectedMultiple: '--',
        label: '获取失败',
        description: '评分获取失败，请稍后重试',
        aiConclusion: '无法连接评分服务，请检查网络后刷新重试。',
        dimensions: TENX_DIMS.map(dim => ({
          name: dim.name,
          iconClass: dim.iconClass,
          weight: dim.weight,
          question: dim.question,
          score: 0,
          indicators: dim.indNames.map(name => ({ name, value: '--', score: 0 }))
        })),
        dimScores: [0,0,0,0,0,0,0,0],
        error: true
      };
    });

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
    const refreshAIEvaluation = async () => { if (!isLoggedIn.value) { ElMessage.warning('请先登录后刷新评测'); router.push('/login'); return; } loadingEvaluation.value = true; await loadAIEvaluation(true); loadingEvaluation.value = false; };
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
    const capitalSplitChartRef = ref(null);
    let capitalSplitChartInstance = null;
    const industryHealthChartRef = ref(null);
    let industryHealthChartInstance = null;
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
    const disposeIndustryHealthChart = () => {
      if (industryHealthChartInstance) {
        industryHealthChartInstance.dispose();
        industryHealthChartInstance = null;
      }
    };
    const renderIndustryHealthChart = () => {
      const el = industryHealthChartRef.value;
      if (!el) return;
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        setTimeout(() => { renderIndustryHealthChart(); }, 150);
        return;
      }
      disposeIndustryHealthChart();
      industryHealthChartInstance = echarts.init(el);
      const chartData = midMockData.value.industryHealth;
      industryHealthChartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          confine: true,
          axisPointer: {
            type: 'cross',
            lineStyle: { color: '#9ca3af', width: 1 }
          },
          formatter: (params) => {
            const item = params?.[0] || {};
            return [`<strong>${item.axisValue || '--'}</strong>`, `景气指数：${item.value ?? '--'}`].join('<br/>');
          }
        },
        grid: { left: 48, right: 24, top: 18, bottom: 30 },
        xAxis: {
          type: 'category',
          data: chartData.months,
          boundaryGap: false,
          axisLabel: { color: '#6b7280', fontSize: 12 },
          axisLine: { lineStyle: { color: '#8b8b8b' } },
          axisTick: { show: false },
          splitLine: { show: true, lineStyle: { type: 'dashed', color: '#e5e7eb' } }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          interval: 25,
          axisLabel: { color: '#6b7280', fontSize: 12 },
          splitLine: { lineStyle: { type: 'dashed', color: '#e5e7eb' } },
          axisLine: { show: true, lineStyle: { color: '#8b8b8b' } },
          axisTick: { show: false }
        },
        series: [{
          name: '景气指数',
          type: 'line',
          data: chartData.values,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { color: '#45c98f', width: 3 },
          itemStyle: { color: '#45c98f', borderColor: '#45c98f', borderWidth: 2 },
          emphasis: { scale: 1.15 }
        }]
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
      var values = capitalFlowMock.value.trend || [-1.2, -0.8, 0.5, 1.3, 2.1, 1.8, -0.3, 3.2, 4.5, 6.83];
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
    const renderCapitalSplitChart = () => {
      const el = capitalSplitChartRef.value;
      if (!el) return;
      if (el.clientWidth === 0 || el.clientHeight === 0) {
        setTimeout(() => { renderCapitalSplitChart(); }, 150);
        return;
      }
      if (capitalSplitChartInstance) { capitalSplitChartInstance.dispose(); capitalSplitChartInstance = null; }
      capitalSplitChartInstance = echarts.init(el);
      var orders = capitalFlowMock.value.orders || [];
      var labels = orders.map(item => item.label);
      var values = orders.map(item => Number(item.value) || 0);
      var colors = values.map(v => v >= 0 ? '#dc2626' : '#16a34a');
      capitalSplitChartInstance.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: function(params) {
            var p = params[0];
            return p.name + '<br/>' + (p.value >= 0 ? '+' : '') + p.value + '亿';
          }
        },
        grid: { left: 50, right: 20, top: 20, bottom: 30 },
        xAxis: {
          type: 'category',
          data: labels,
          axisLabel: { color: '#475569', fontSize: 11 },
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
        series: [{
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] } })),
          barWidth: '40%',
          label: {
            show: true,
            position: 'outside',
            fontSize: 10,
            color: '#475569',
            formatter: function(p) { return (p.value >= 0 ? '+' : '') + p.value + '亿'; }
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [{ yAxis: 0, lineStyle: { color: '#94a3b8', type: 'solid', width: 1 }, label: { show: false } }]
          }
        }]
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
    const handleWindowResize = () => { if (forecastChartInstance) forecastChartInstance.resize(); if (historyTimelineChartInstance) historyTimelineChartInstance.resize(); if (capitalFlowChartInstance) capitalFlowChartInstance.resize(); if (capitalSplitChartInstance) capitalSplitChartInstance.resize(); if (industryHealthChartInstance) industryHealthChartInstance.resize(); };
    watch(shouldShowTenxModel, (v) => {
      if (v) {
        fetchTenxScore(stockInfo.value.code);
        nextTick(() => tenxUpdateRadar(tenxModel.value.dimScores));
      }
    });
    // Also trigger radar when stockData loads and tenxModel becomes available
    watch(tenxModel, (m) => {
      if (m && m.dimScores) nextTick(() => tenxUpdateRadar(m.dimScores));
    });
    watch(() => route.params.code, (nc) => {
      if (nc && nc !== stockInfo.value.code) {
        invalidateCache(stockInfo.value.code);
        tenxApiData.value = null;
        stockInfo.value.code = nc; stockNews.value = []; totalNews.value = 0; newsCursor.value = 0;
        forecastData.value = {}; forecastSummary.value = '';
        historyDialogVisible.value = false; historyDetailDialogVisible.value = false; historyErrorMessage.value = '';
        historyRecords.value = []; selectedHistoryRecord.value = null;
        historyPagination.value = { page: 1, pageSize: historyPagination.value.pageSize, total: 0, totalPages: 1 };
        disposeHistoryTimelineChart();
        if (!isCacheFresh('stockData', nc)) loadStockData();
        if (!isCacheFresh('news', nc)) loadNewsAndAnalysis();
        if (!isCacheFresh('forecast', nc)) loadForecast();
        if (!isCacheFresh('evaluation', nc)) { loadingEvaluation.value = true; loadAIEvaluation(false); }
        setupAutoRefresh(); window.scrollTo(0, 0);
        if (activeView.value === 'short') {
          setTimeout(() => { renderCapitalFlowChart(); renderCapitalSplitChart(); }, 160);
        }
        if (activeView.value === 'mid') {
          setTimeout(() => { renderIndustryHealthChart(); }, 160);
        }
      }
    });
    watch(isLoggedIn, async (l) => { if (l) { checkIfFavorite(); if (!isCacheFresh('evaluation', stockInfo.value.code)) { loadingEvaluation.value = true; await loadAIEvaluation(false); } } });
    watch(historyDialogVisible, async (v) => { if (!v) { historyDetailDialogVisible.value = false; selectedHistoryRecord.value = null; disposeHistoryTimelineChart(); return; } await nextTick(); renderHistoryTimelineChart(); setTimeout(() => { if (historyTimelineChartInstance) historyTimelineChartInstance.resize(); }, 80); });
    watch(activeView, async (nv) => {
      await nextTick();
      if (nv === 'short') {
        setTimeout(() => { renderCapitalFlowChart(); renderCapitalSplitChart(); }, 100);
      }
      if (nv === 'mid') {
        setTimeout(() => {
          renderIndustryHealthChart();
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
      if (!isCacheFresh('evaluation', currentCode)) { loadingEvaluation.value = true; loadAIEvaluation(false); }
      setupAutoRefresh(); window.addEventListener('resize', handleWindowResize); window.scrollTo(0, 0);
      setTimeout(() => { if (activeView.value === 'short') { renderCapitalFlowChart(); renderCapitalSplitChart(); } }, 200);
      setTimeout(() => { if (activeView.value === 'mid') renderIndustryHealthChart(); }, 200);
      // Initialize tenx radar after data loads
      setTimeout(() => {
        if (shouldShowTenxModel.value && tenxModel.value && tenxModel.value.dimScores) {
          tenxUpdateRadar(tenxModel.value.dimScores);
        }
      }, 800);
    });
    onBeforeUnmount(() => { clearAutoRefreshTimers(); window.removeEventListener('resize', handleWindowResize); if (tenxRadarChart) { tenxRadarChart.destroy(); tenxRadarChart = null; } if (forecastChartInstance) { forecastChartInstance.dispose(); forecastChartInstance = null; } if (capitalFlowChartInstance) { capitalFlowChartInstance.dispose(); capitalFlowChartInstance = null; } if (capitalSplitChartInstance) { capitalSplitChartInstance.dispose(); capitalSplitChartInstance = null; } disposeIndustryHealthChart(); disposeHistoryTimelineChart(); cancelFlowAnimationFrames(); });

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
      if (s >= 82) return 'is-high';
      if (s >= 58) return 'is-mid';
      return 'is-low';
    };

    const getScoreLabel = (score) => {
      const s = Number(score) || 0;
      if (s >= 82) return '十倍股高相似度';
      if (s >= 58) return '十倍股中等相似度';
      return '十倍股低相似度';
    };

    const getScoreDescription = (score) => {
      const s = Number(score) || 0;
      if (s >= 82) return '十倍股相似度较高，符合高弹性成长样本特征';
      if (s >= 58) return '具备倍数空间，但距离十倍股样本仍有差距';
      return '更接近趋势修复或稳健成长，不按十倍股处理';
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
      hasForecastChartData, capitalFlowChartRef, capitalSplitChartRef, industryHealthChartRef,
      midMockData, midAiAnalysis, longMockData, longAiAnalysis, shouldShowTenxModel, tenxModel, capitalFlowMock,
      TENX_DIMS, tenxSColor, tenxSGrad, tenxExpandedDims, tenxAllOpen, tenxRadarCanvas, tenxToggleDim, tenxToggleAll,
      toggleFavorite, getEvaluationClass, goToTagBoard, formatRatioText,
      mergedStructureChart, priceTrendClass,
      formatSignedPercent, formatSignedPrice, formatFlowValue,
      getScoreClass, getScoreLabel, getScoreDescription, getScoreRingStyle
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
  .ai-logic > p {
    margin: 0;
    line-height: 1.7;
    color: var(--text-secondary);
  }
  .ai-basis {
    margin: 12px 0 14px;
    padding: 12px 14px;
    background: #f8fafc;
    border: 1px solid #e8eef6;
    border-radius: 8px;

    h4 {
      margin: 0 0 8px;
      color: #334155;
      font-size: 0.9rem;
      font-weight: 700;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }

    li {
      position: relative;
      padding-left: 18px;
      color: #475569;
      font-size: 0.9rem;
      line-height: 1.65;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.72em;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #4f7cff;
      }
    }
  }
  .ai-risk {
    h4 {
      font-size: 0.92rem;
      color: #334155;
      margin: 0 0 8px;
      font-weight: 700;
    }

    .risk-title {
      margin-top: 12px;
      color: #7f1d1d;
    }

    .markdown-content {
      line-height: 1.7;
      color: #334155;
      font-size: 0.92rem;
    }

    .ai-advice-list,
    .ai-risk-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 7px;
    }

    li {
      position: relative;
      padding-left: 18px;
      color: #334155;
      font-size: 0.92rem;
      line-height: 1.65;

      &::before {
        content: "";
        position: absolute;
        left: 0;
        top: 0.72em;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #4f7cff;
      }
    }

    .ai-risk-list li {
      color: #475569;

      &::before {
        background: #ef4444;
      }
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
    background: #f8fafc; display: flex; align-items: flex-start; gap: 20px;
    .cf-ai-narrative {
      flex: 1; line-height: 1.6; font-size: 0.82rem; min-width: 0;
      .cf-narrative-main { color: #1e293b; margin: 0 0 4px; }
      .cf-narrative-risk { color: #dc2626; margin: 0; }
    }
    .cf-hero-card {
      flex-shrink: 0; width: 140px; background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 14px 16px; display: flex; flex-direction: column; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      .cf-hero-card-label { font-size: 0.72rem; color: #94a3b8; margin-bottom: 4px; }
      .cf-hero-card-value { font-size: 1.6rem; font-weight: 800; line-height: 1.1;
        &.is-up { color: #dc2626; }
        &.is-down { color: #16a34a; }
      }
    }
    @media (max-width: 640px) {
      flex-direction: column;
      .cf-hero-card { width: 100%; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 14px;
        .cf-hero-card-label { margin-bottom: 0; }
        .cf-hero-card-value { margin-bottom: 0; font-size: 1.3rem; }
      }
    }
  }

  .cf-data-row {
    display: flex; gap: 0;
    .cf-split-col {
      flex: 1; padding: 16px 20px; background: #fff; min-width: 0;
      .cf-split-header {
        display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
        .cf-split-title { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
      }
      .cf-split-chart { height: 200px; }
    }
    .cf-trend {
      flex: 1.2; padding: 16px 20px; background: #fff; border-left: 1px solid #f1f5f9; min-width: 0;
      .cf-trend-header {
        display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
        .cf-trend-title { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
        .cf-trend-badge {
          font-size: 0.72rem; font-weight: 600; color: #92400e; background: #fef3c7; padding: 2px 10px; border-radius: 4px;
        }
      }
      .cf-trend-chart { height: 200px; }
    }
    @media (max-width: 800px) {
      flex-direction: column;
      .cf-trend { border-left: none; border-top: 1px solid #f1f5f9; }
    }
  }

  .finance-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; @media (max-width: 576px) { grid-template-columns: repeat(2, 1fr); } .finance-item { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; .finance-label { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 4px; } .finance-value { display: block; font-size: 1.2rem; font-weight: 600; color: #1e293b; margin-bottom: 2px; } .finance-change { display: block; font-size: 0.75rem; color: #94a3b8; &.is-up { color: #ef4444; } &.is-down { color: #22c55e; } } } }

  .forecast-summary-card { background: #f0f7ff; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; .summary-text { font-size: 0.9rem; line-height: 1.6; color: #334155; } }
  .forecast-charts-container { .forecast-chart { height: 400px; } }

  .industry-card-body { padding: 0 !important; }
  .industry-health {
    border-radius: 0 0 10px 10px;
    overflow: hidden;
    background: #fff;

    .industry-health-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid #eef2f7;
    }

    .industry-health-title {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .industry-pill {
      display: inline-flex;
      align-items: center;
      height: 24px;
      padding: 0 12px;
      border-radius: 999px;
      background: #e9f8e6;
      color: #215c2f;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .industry-score-number {
      display: flex;
      align-items: baseline;
      gap: 4px;
      color: #6b7280;
      font-size: 0.86rem;
      font-weight: 700;
      white-space: nowrap;

      strong {
        font-size: 1.55rem;
        line-height: 1;
        font-weight: 800;
      }

      &.is-cold strong { color: #94a3b8; }
      &.is-normal strong { color: #2563eb; }
      &.is-warm strong { color: #eab308; }
      &.is-hot strong { color: #ef4444; }
    }

    .industry-chart-wrap {
      height: 220px;
      padding: 14px 18px 10px;
      border-bottom: 1px solid #eef2f7;
    }

    .industry-line-chart {
      width: 100%;
      height: 100%;
    }

    .industry-detail-title {
      padding: 16px 20px 10px;
      color: #10251e;
      font-size: 0.98rem;
      font-weight: 800;
    }

    .industry-detail-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      padding: 0 20px 18px;
    }

    .industry-detail-item {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      padding: 14px 16px;
      border: 1px solid #eef1f5;
      border-radius: 10px;
      background: #fff;

      .detail-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: #eef4ff;
        color: #2563eb;
        font-size: 0.8rem;
        font-weight: 800;
        flex-shrink: 0;
      }

      div {
        min-width: 0;
        flex: 1;
      }

      strong,
      span {
        display: block;
      }

      strong {
        color: #10251e;
        font-size: 0.92rem;
      }

      div span {
        color: #6b7280;
        font-size: 0.8rem;
      }

      .detail-arrow {
        color: #9ca3af;
        font-size: 1.5rem;
        line-height: 1;
      }
    }

    @media (max-width: 720px) {
      .industry-health-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .industry-detail-grid {
        grid-template-columns: 1fr;
      }
    }
  }

  .policy-list { .policy-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f5f5f5; &:last-child { border-bottom: none; } .policy-tag { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap; &.is-good { background: #fef2f2; color: #dc2626; } &.is-bad { background: #f0fdf4; color: #16a34a; } &.is-neutral { background: #f8fafc; color: #64748b; } } .policy-text { font-size: 0.9rem; color: #334155; line-height: 1.5; } } }

  .moat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; @media (max-width: 576px) { grid-template-columns: 1fr; } .moat-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; .moat-icon { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px; background: #eef4ff; color: #2563eb; font-size: 0.86rem; font-weight: 800; flex-shrink: 0; } .moat-info { .moat-title { display: block; font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 2px; } .moat-desc { display: block; font-size: 0.8rem; color: #64748b; } } } }

  .annual-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; @media (max-width: 576px) { grid-template-columns: repeat(2, 1fr); } .annual-item { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; .annual-label { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 4px; } .annual-value { display: block; font-size: 1rem; font-weight: 600; color: #1e293b; margin-bottom: 2px; } .annual-note { display: block; font-size: 0.75rem; color: #94a3b8; &.is-up { color: #ef4444; } &.is-down { color: #22c55e; } } } }

  .tenx-card {
    .tenx-error-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
    }
    .tenx-hero {
      display: flex;
      align-items: flex-start;
      gap: 24px;
      padding: 20px 0;
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      @media (max-width: 576px) {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
    }
    /* 雷达图 + 中心分数 */
    .tenx-radar-center-wrap {
      position: relative;
      width: 300px;
      height: 260px;
      flex-shrink: 0;
    }
    .tenx-radar-canvas {
      display: block;
    }
    .tenx-radar-score-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      &.is-high .tenx-radar-score-value { color: #22c55e; }
      &.is-mid .tenx-radar-score-value { color: #eab308; }
      &.is-low .tenx-radar-score-value { color: #ef4444; }
    }
    .tenx-radar-score-value {
      display: block;
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1;
      transition: color 0.3s ease;
    }
    .tenx-radar-score-label {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-top: 4px;
    }
    .tenx-verdict {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 260px;
      @media (max-width: 576px) {
        min-height: 0;
      }
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
      &.is-high { background: transparent; color: #22c55e; border: 1px solid #22c55e; }
      &.is-mid { background: transparent; color: #eab308; border: 1px solid #eab308; }
      &.is-low { background: transparent; color: #ef4444; border: 1px solid #ef4444; }
    }
    .verdict-text {
      font-size: 0.88rem;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }

    /* AI结论 */
    .tenx-ai-conclusion {
      width: 100%;
      margin-top: 4px;
      padding: 10px 12px;
      background: #f5f7fa;
      border-radius: 8px;
      border: 1px solid #e4e7ed;
      flex: 1;
    }
    .tenx-ai-conclusion-header {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #409eff;
      i { font-size: 13px; }
    }
    .tenx-ai-conclusion-text {
      font-size: 11px;
      color: #606266;
      line-height: 1.7;
      margin: 0;
    }

    /* 因子详情区 */
    .tenx-dim-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .tenx-dim-section-title {
      font-size: 13px;
      font-weight: 600;
      color: #606266;
    }
    .tenx-dim-toggle-btn {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #dcdfe6;
      background: #fff;
      color: #606266;
      cursor: pointer;
      font-family: inherit;
      transition: border-color 0.2s;
      &:hover { border-color: #409eff; color: #409eff; }
    }

    /* 因子网格 */
    .tenx-dimensions-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
      @media (max-width: 576px) {
        grid-template-columns: 1fr;
      }
    }

    /* 因子分组分隔线 */
    .tenx-dim-group-divider {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0 2px;
    }
    .tenx-dim-group-label {
      font-size: 10px;
      color: #c0c4cc;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .tenx-dim-group-line {
      flex: 1;
      height: 1px;
      background: #e4e7ed;
    }

    /* 单个因子卡片 */
    .tenx-dim-item {
      background: #fff;
      border: 1px solid #e4e7ed;
      border-radius: 10px;
      transition: all 0.25s;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
      &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: #c0c4cc; }
      &.is-expanded { border-color: #409eff; box-shadow: 0 4px 12px rgba(64,158,255,0.08); }
      &.is-high { border-left: 3px solid #22c55e; }
      &.is-mid { border-left: 3px solid #eab308; }
      &.is-low { border-left: 3px solid #ef4444; }
    }

    /* 因子头部 */
    .tenx-dim-head {
      padding: 8px 14px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .tenx-dim-head-left {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .tenx-dim-icon {
      font-size: 14px;
      margin-top: 2px;
    }
    .tenx-dim-name {
      font-size: 13px;
      font-weight: 500;
      color: #303133;
    }
    .tenx-dim-weight {
      font-size: 10px;
      color: #c0c4cc;
      margin-left: 4px;
    }
    .tenx-dim-question {
      font-size: 9px;
      color: #409eff;
      opacity: 0.7;
      margin-top: 2px;
    }
    .tenx-dim-head-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .tenx-dim-score {
      font-size: 17px;
      font-weight: 700;
    }
    .tenx-dim-chevron {
      font-size: 10px;
      color: #c0c4cc;
      transition: transform 0.3s;
      &.open { transform: rotate(180deg); }
    }

    /* 因子进度条 */
    .tenx-dim-bar {
      height: 4px;
      background: #f2f3f5;
      border-radius: 3px;
      overflow: hidden;
      margin: 0 14px 8px;
    }
    .tenx-dim-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
    }

    /* 因子展开详情 */
    .tenx-dim-details {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.35s ease;
    }
    .tenx-dim-details.open {
      max-height: 400px;
    }
    .tenx-dim-details-inner {
      padding: 8px 14px 12px;
      border-top: 1px solid #f2f3f5;
      margin-top: 0;
    }

    /* 指标行 */
    .tenx-ind-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #fafafa;
      &:last-child { border-bottom: none; }
    }
    .tenx-ind-name {
      font-size: 11px;
      color: #909399;
    }
    .tenx-ind-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tenx-ind-value {
      font-size: 11px;
      color: #606266;
    }
    .tenx-ind-bar-track {
      width: 40px;
      height: 3px;
      border-radius: 2px;
      background: #f2f3f5;
      overflow: hidden;
    }
    .tenx-ind-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.7s cubic-bezier(0.4,0,0.2,1);
    }
    .tenx-ind-score {
      font-size: 11px;
      font-weight: 700;
      width: 20px;
      text-align: right;
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
