<template>
  <div class="trend-layout">
    <!-- ============ 左侧栏 ============ -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input v-model="searchInput" type="text" class="search-input" placeholder="搜索股票代码 / 名称" />
        </div>
        <div class="list-header">
          <span class="list-title">关注列表</span>
          <span class="count-pill">{{ filteredStockList.length }} 只</span>
        </div>
      </div>

      <div class="stock-list">
        <div v-if="listLoading" class="list-hint">加载中...</div>
        <template v-else>
          <div
            v-for="item in filteredStockList"
            :key="item.symbol"
            class="stock-item"
            :class="{ active: item.symbol === currentSymbol }"
            @click="selectStock(item.symbol)"
          >
            <div class="stock-meta">
              <div class="stock-name">{{ item.name || '--' }}</div>
              <div class="stock-code">{{ item.symbol }}</div>
            </div>
            <div class="stock-right">
              <span class="stock-score">{{ item.score != null ? item.score : '--' }}</span>
              <div class="grade-badge" :class="'grade-' + getGrade(item.score)">{{ getGrade(item.score) }}</div>
            </div>
          </div>
          <div v-if="!filteredStockList.length" class="list-hint">暂无数据</div>
        </template>
      </div>

      <div class="sidebar-bottom">
        <button class="btn-primary" :disabled="batchLoading" @click="handleBatchRefresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.7 2.82L21 8"></path>
            <path d="M21 3v5h-5"></path>
          </svg>
          <span>{{ batchLoading ? '重评中...' : '一键重评' }}</span>
        </button>
        <p class="btn-hint">基于最新数据重新评分</p>
      </div>
    </aside>

    <!-- ============ 主内容区 ============ -->
    <main class="main-content">
      <!-- 加载态 -->
      <div v-if="loading" class="state-block">
        <div class="spinner"></div>
        <p>正在计算评分，请稍候...</p>
      </div>

      <!-- 一票否决提示 -->
      <div v-else-if="vetoInfo" class="state-block">
        <div class="veto-alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <div>
            <div class="veto-title">{{ vetoInfo.symbol }} 未通过一票否决</div>
            <div class="veto-reason" v-if="vetoInfo.reasons.length">{{ vetoInfo.reasons.join('；') }}</div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!scoreData" class="state-block">
        <p>请在左侧选择股票查看趋势评分</p>
      </div>

      <template v-else>
        <!-- 面包屑 + 标题 -->
        <div class="page-header fade-in">
          <div class="page-header-left">
            <div class="breadcrumb">
              <span>趋势股评分</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <span>{{ currentStockName }}</span>
            </div>
            <div class="title-row">
              <h2 class="main-title">{{ currentStockName }}</h2>
              <span class="title-code">{{ currentSymbol }}</span>
              <span class="trend-tag" v-if="scoreData.expectedMultiple">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                预期{{ scoreData.expectedMultiple }}趋势
              </span>
            </div>
          </div>
          <div class="header-actions">
            <button class="ghost-btn" @click="showToast('报告导出功能开发中')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              导出报告
            </button>
            <button class="ghost-btn" @click="showToast('已加入监控列表')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              加入监控
            </button>
          </div>
        </div>

        <!-- 评分总览（2x2 维度卡片，无雷达图） -->
        <section class="panel score-overview fade-in" style="animation-delay: 0.05s">
          <div class="overview-grid grid-bg">
            <!-- 左：总评分 -->
            <div class="overview-left">
              <div class="label-sm">综合评分</div>
              <div class="score-row">
                <span class="total-score">{{ totalScoreText }}</span>
                <span class="score-max">/100</span>
              </div>
              <div class="grade-row">
                <div class="grade-badge" :class="'grade-' + totalGrade">{{ totalGrade }}</div>
                <span class="rating-pill">{{ ratingText }}</span>
              </div>
              <div class="status-list">
                <div class="status-item">
                  <span class="dot dot-up"></span>
                  <span>多维度量化趋势评分</span>
                </div>
                <div class="status-item">
                  <span class="dot dot-gold"></span>
                  <span>{{ scoreData.scoreDate || '最新数据' }} 更新</span>
                </div>
              </div>
            </div>
            <!-- 右：维度评分明细 2x2 -->
            <div class="overview-right">
              <div class="label-sm">维度评分明细</div>
              <div class="dim-cards-grid">
                <div class="dim-card" v-for="(dim, i) in dimensionsOrdered" :key="i">
                  <div class="dim-icon" :style="{ background: DIM_CONFIG[i].bg }">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path :d="DIM_CONFIG[i].icon"></path>
                    </svg>
                  </div>
                  <div class="dim-bar-wrap">
                    <div class="dim-head">
                      <div class="dim-head-text">
                        <div class="dim-name">{{ DIM_CONFIG[i].displayName }}</div>
                        <div class="dim-desc">{{ DIM_CONFIG[i].desc }}</div>
                      </div>
                      <div class="dim-score-wrap">
                        <span class="dim-score" :style="{ color: DIM_CONFIG[i].color }">{{ dim.score != null ? dim.score : '--' }}</span>
                        <span class="dim-score-max">/100</span>
                      </div>
                    </div>
                    <div class="score-bar">
                      <div class="score-bar-fill" :style="{ width: (dim.score || 0) + '%', background: 'linear-gradient(90deg, ' + DIM_CONFIG[i].color + ', ' + DIM_CONFIG[i].color + 'cc)' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ 技术面趋势 ============ -->
        <section class="panel fade-in" :class="{ expanded: panelOpen.tech }" style="animation-delay: 0.1s">
          <div class="panel-header" @click="togglePanel('tech')">
            <div class="panel-title">
              <div class="icon-box icon-tech">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline></svg>
              </div>
              <span>技术面趋势</span>
              <span class="panel-sub">K线形态是否走出趋势</span>
            </div>
            <div class="panel-score">
              <span class="panel-score-val">{{ techDim && techDim.score != null ? techDim.score : '--' }}</span>
              <span class="panel-score-max">/100</span>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="panel-body">
            <div class="panel-inner">
              <!-- 4 个数据点 -->
              <div class="data-grid-4">
                <div class="data-point">
                  <div class="dp-label">低点涨幅</div>
                  <div class="trend-indicator up">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline></svg>
                    <span class="mono-lg">{{ techIndicators.lowPointGain != null ? '+' + techIndicators.lowPointGain.toFixed(1) + '%' : '--' }}</span>
                  </div>
                </div>
                <div class="data-point">
                  <div class="dp-label">60日线位置</div>
                  <div class="dp-value-row">
                    <span class="mono-lg" :style="{ color: techIndicators.ma60Position === 'above' ? 'var(--up)' : 'var(--down)' }">
                      {{ techIndicators.ma60Position === 'above' ? '上方' : techIndicators.ma60Position === 'below' ? '下方' : '--' }}
                    </span>
                    <span class="tag" :class="ma60TrendTag.cls" v-if="techIndicators.ma60Trend">{{ ma60TrendTag.text }}</span>
                  </div>
                </div>
                <div class="data-point">
                  <div class="dp-label">近期新高</div>
                  <div class="dp-value-row">
                    <svg v-if="techIndicators.isNewHigh250 || techIndicators.isNewHigh120" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--up)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span class="mono-lg" :style="{ color: (techIndicators.isNewHigh250 || techIndicators.isNewHigh120) ? 'var(--up)' : 'var(--ink-mute)' }">
                      {{ techIndicators.isNewHigh250 ? '250日新高' : techIndicators.isNewHigh120 ? '120日新高' : '未突破' }}
                    </span>
                  </div>
                </div>
                <div class="data-point">
                  <div class="dp-label">最大回撤</div>
                  <div class="dp-value-row">
                    <span class="mono-lg">{{ techIndicators.maxDrawdown != null ? techIndicators.maxDrawdown.toFixed(1) + '%' : '--' }}</span>
                    <span class="tag tag-neutral">{{ techIndicators.maxDrawdown != null && techIndicators.maxDrawdown < 15 ? '健康' : '较大' }}</span>
                  </div>
                </div>
              </div>

              <!-- 双 K 线图 -->
              <div class="charts-grid-2">
                <div class="chart-box">
                  <div class="chart-head">
                    <div class="chart-head-left">
                      <span class="chart-dot chart-dot-blue"></span>
                      <span class="chart-title-text">个股K线 · {{ currentStockName }}</span>
                    </div>
                    <span class="tag tag-up">近{{ techKlineCount }}日</span>
                  </div>
                  <div ref="stockKlineRef" class="chart-280"></div>
                  <div v-if="!hasStockKline" class="chart-empty">暂无K线数据</div>
                </div>
                <div class="chart-box">
                  <div class="chart-head">
                    <div class="chart-head-left">
                      <span class="chart-dot chart-dot-cyan"></span>
                      <span class="chart-title-text">概念指数 · {{ conceptKlineName }}</span>
                    </div>
                    <span class="tag tag-up">近{{ conceptKlineCount }}日</span>
                  </div>
                  <div ref="conceptKlineRef" class="chart-280"></div>
                  <div v-if="!hasConceptKline" class="chart-empty">暂无概念K线数据</div>
                </div>
              </div>

              <!-- 趋势判读 -->
              <div class="trend-analysis">
                <div class="ta-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div>
                  <div class="ta-title">趋势判读</div>
                  <div class="ta-text">{{ trendAnalysis }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ 行业赛道景气 ============ -->
        <section class="panel fade-in" :class="{ expanded: panelOpen.track }" style="animation-delay: 0.15s">
          <div class="panel-header" @click="togglePanel('track')">
            <div class="panel-title">
              <div class="icon-box icon-track">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              </div>
              <span>行业赛道景气</span>
              <span class="panel-sub">所在赛道是否处于景气周期</span>
            </div>
            <div class="panel-score">
              <span class="panel-score-val">{{ trackDim && trackDim.score != null ? trackDim.score : '--' }}</span>
              <span class="panel-score-max">/100</span>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="panel-body">
            <div class="panel-inner">
              <!-- 3 个数据点 -->
              <div class="data-grid-3">
                <div class="data-point">
                  <div class="dp-label">同花顺60日上榜</div>
                  <div class="dp-value-row">
                    <span class="mono-xl" style="color: var(--primary)">{{ trackData.sectorListCount60d }}</span>
                    <span class="dp-unit">次</span>
                    <span class="tag tag-up" style="margin-left: auto">活跃</span>
                  </div>
                </div>
                <div class="data-point">
                  <div class="dp-label">市场认可度</div>
                  <div class="dp-value-row">
                    <span class="mono-xl" style="color: var(--primary)">{{ trackData.marketRecognition }}</span>
                    <span class="dp-unit">/100</span>
                  </div>
                  <div class="score-bar" style="margin-top: 8px">
                    <div class="score-bar-fill" :style="{ width: trackData.marketRecognition + '%' }"></div>
                  </div>
                </div>
                <div class="data-point">
                  <div class="dp-label">板块强度</div>
                  <div class="dp-value-row">
                    <span class="mono-xl" style="color: var(--up)">{{ trackData.sectorStrength || '--' }}</span>
                    <span class="dp-unit">月涨幅</span>
                  </div>
                </div>
              </div>

              <div class="charts-grid-2">
                <div class="soft-box">
                  <div class="soft-box-title">板块60日上榜趋势</div>
                  <div ref="trackChartRef" class="chart-200"></div>
                </div>
                <div class="soft-box">
                  <div class="soft-box-title">板块信息与政策趋势</div>
                  <div class="policy-block">
                    <div class="policy-item">
                      <span class="policy-dot policy-dot-blue"></span>
                      <div>
                        <span class="policy-name">所属板块</span>
                        <span class="policy-desc">{{ trackData.sectorName }}</span>
                      </div>
                    </div>
                    <div
                      class="policy-item"
                      v-for="(item, pi) in trackPolicyItems"
                      :key="pi"
                    >
                      <span class="policy-dot" :class="item.color === 'gold' ? 'policy-dot-gold' : 'policy-dot-blue'"></span>
                      <div>
                        <span class="policy-name">{{ item.name }}</span>
                        <span class="policy-desc">{{ item.desc }}</span>
                      </div>
                    </div>
                    <div class="policy-empty" v-if="!trackPolicyItems.length">暂无政策趋势数据</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ============ 消息面催化 ============ -->
        <section class="panel fade-in" :class="{ expanded: panelOpen.news }" style="animation-delay: 0.2s">
          <div class="panel-header" @click="togglePanel('news')">
            <div class="panel-title">
              <div class="icon-box icon-news">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
              </div>
              <span>消息面催化</span>
              <span class="panel-sub">是否有持续性消息催化</span>
            </div>
            <div class="panel-score">
              <span class="panel-score-val">{{ newsDim && newsDim.score != null ? newsDim.score : '--' }}</span>
              <span class="panel-score-max">/100</span>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="panel-body">
            <div class="panel-inner">
              <div class="news-head">
                <div class="news-head-title">近期重大资讯</div>
                <div class="catalyst-row">
                  <span class="catalyst-label">催化强度</span>
                  <div class="catalyst-bars">
                    <div v-for="n in 5" :key="n" class="catalyst-bar" :class="{ filled: n <= catalystBars.count }"></div>
                  </div>
                  <span class="catalyst-text">{{ catalystBars.label }}</span>
                </div>
              </div>

              <div class="news-meta-row" v-if="newsStats.researchCount || newsStats.hardCatalyst">
                <span v-if="newsStats.researchCount" class="news-meta-item">机构调研：<strong>{{ newsStats.researchCount }}</strong> 家</span>
                <span v-if="newsStats.hardCatalyst" class="news-meta-item">硬催化：{{ newsStats.hardCatalyst }}</span>
              </div>

              <div class="news-list" v-if="newsList.length">
                <div class="news-item" v-for="(news, ni) in newsList" :key="ni">
                  <div class="news-date">{{ formatNewsDate(news.publishTime) }}</div>
                  <div class="news-body">
                    <div class="news-tag-row">
                      <span class="tag" :class="sentimentTag(news.sentiment).cls">{{ sentimentTag(news.sentiment).text }}</span>
                      <span class="news-source" v-if="news.source">{{ news.source }}</span>
                    </div>
                    <div class="news-title">{{ news.title }}</div>
                    <div class="news-summary" v-if="news.summary">{{ news.summary }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="news-empty">暂无近期资讯</div>
            </div>
          </div>
        </section>

        <!-- ============ 基本面综合 ============ -->
        <section class="panel fade-in" :class="{ expanded: panelOpen.fund }" style="animation-delay: 0.25s">
          <div class="panel-header" @click="togglePanel('fund')">
            <div class="panel-title">
              <div class="icon-box icon-fund">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
              </div>
              <span>基本面综合</span>
              <span class="panel-sub">业绩 · 估值 · 盈利 · 壁垒</span>
            </div>
            <div class="panel-score">
              <span class="panel-score-val">{{ fundDim && fundDim.score != null ? fundDim.score : '--' }}</span>
              <span class="panel-score-max">/100</span>
              <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div class="panel-body">
            <div class="panel-inner">
              <!-- 4 个因子行 -->
              <div class="factor-grid">
                <div class="factor-row-wrapper" v-for="(sub, i) in fundSubDims" :key="i">
                  <div class="factor-row" @click="toggleFundSub(i)" :class="{ expanded: fundSubOpen[i] }">
                    <div class="factor-stripe" :style="{ background: FUND_STRIPE_COLORS[i] }"></div>
                    <div class="factor-content">
                      <div class="factor-head">
                        <span class="factor-name">{{ sub.name }}</span>
                        <span class="factor-score" style="color: var(--primary)">{{ sub.score }}</span>
                      </div>
                      <div class="score-bar">
                        <div class="score-bar-fill" :style="{ width: (sub.score || 0) + '%' }"></div>
                      </div>
                    </div>
                    <svg class="factor-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <div class="factor-detail-wrapper" :class="{ expanded: fundSubOpen[i] }">
                    <div class="factor-detail">
                      <div class="factor-indicator" v-for="(ind, j) in (sub.indicators || [])" :key="j">
                        <span class="fi-name">{{ ind.name }}</span>
                        <span class="fi-value">{{ ind.value }}</span>
                        <span class="fi-score" v-if="ind.score != null">{{ ind.score }}分</span>
                      </div>
                      <div v-if="!sub.indicators || !sub.indicators.length" class="fi-empty">暂无因子明细</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 4 个数据点 -->
              <div class="data-grid-4" style="margin-top: 20px">
                <div class="data-point" v-for="(dp, i) in fundDataPoints" :key="i">
                  <div class="dp-label">{{ dp.name }}</div>
                  <div class="mono-xl" style="margin-top: 4px; color: var(--primary)">{{ dp.value }}</div>
                  <div class="dp-sub" v-if="dp.score != null">评分 {{ dp.score }}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>

    <!-- Toast -->
    <div class="toast" :class="{ show: toastVisible }">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>{{ toastText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { trendApi } from '@/shared/api/api';
import * as echarts from 'echarts/core';
import { CandlestickChart, LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, DataZoomComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  CandlestickChart, LineChart, BarChart,
  GridComponent, TooltipComponent, DataZoomComponent, AxisPointerComponent,
  CanvasRenderer,
]);

// 维度展示配置（与模板 updateDimCards 一致）
const DIM_CONFIG = [
  { displayName: '技术面趋势', desc: 'K线形态趋势', color: '#0b5fff', bg: 'linear-gradient(135deg, #0b5fff, #00b8ff)', icon: 'M3 17l6-6 4 4 8-8' },
  { displayName: '行业赛道景气', desc: '赛道景气周期', color: '#00b8ff', bg: 'linear-gradient(135deg, #00b8ff, #0b5fff)', icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' },
  { displayName: '消息面催化', desc: '资讯持续性', color: '#d4a843', bg: 'linear-gradient(135deg, #d4a843, #b8862e)', icon: 'M3 11l18-5v12L3 14z' },
  { displayName: '基本面综合', desc: '业绩·估值·盈利·壁垒', color: '#0a2e6f', bg: 'linear-gradient(135deg, #0a2e6f, #0b5fff)', icon: 'M2 7h20v14H2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
];

// 基本面因子条左侧色块颜色
const FUND_STRIPE_COLORS = ['#0b5fff', '#00b8ff', '#4d8bff', '#d4a843'];

// ============ 状态 ============
const searchInput = ref('');
const currentSymbol = ref('');
const stockList = ref([]);
const scoreData = ref(null);
const loading = ref(false);
const listLoading = ref(false);
const batchLoading = ref(false);
const vetoInfo = ref(null);
// 技术面默认展开，其余折叠
const panelOpen = reactive({ tech: true, track: false, news: false, fund: false });

// 基本面子维度展开状态
const fundSubOpen = reactive({});
function toggleFundSub(i) {
  fundSubOpen[i] = !fundSubOpen[i];
}

const toastVisible = ref(false);
const toastText = ref('');
let toastTimer = null;

// 图表 DOM 引用与实例
const stockKlineRef = ref(null);
const conceptKlineRef = ref(null);
const trackChartRef = ref(null);
let stockChart = null;
let conceptChart = null;
let trackChart = null;

// ============ 计算属性 ============
const filteredStockList = computed(() => {
  const kw = searchInput.value.trim().toLowerCase();
  if (!kw) return stockList.value;
  return stockList.value.filter(s =>
    (s.name || '').toLowerCase().includes(kw) ||
    (s.symbol || '').toLowerCase().includes(kw)
  );
});

const currentStockName = computed(() => {
  const s = stockList.value.find(x => x.symbol === currentSymbol.value);
  return s?.name || scoreData.value?.symbol || currentSymbol.value || '--';
});

// 按固定顺序排列的维度（技术面/赛道/消息面/基本面）
const dimensionsOrdered = computed(() => {
  const order = ['技术面', '行业赛道景气', '消息面催化', '基本面'];
  const dims = scoreData.value?.dimensions || [];
  return order.map(name => dims.find(d => d.name === name)).filter(Boolean);
});

function findDim(name) {
  return scoreData.value?.dimensions?.find(d => d.name === name);
}
const techDim = computed(() => findDim('技术面'));
const trackDim = computed(() => findDim('行业赛道景气'));
const newsDim = computed(() => findDim('消息面催化'));
const fundDim = computed(() => findDim('基本面'));

// 评级：S>=85 A>=75 B>=65 C>=55 D<55
function getGrade(score) {
  const s = Number(score);
  if (isNaN(s)) return 'C';
  if (s >= 85) return 'S';
  if (s >= 75) return 'A';
  if (s >= 65) return 'B';
  if (s >= 55) return 'C';
  return 'D';
}

const totalScoreText = computed(() => {
  const s = scoreData.value?.score;
  return s != null ? (Number.isInteger(s) ? s : s.toFixed(1)) : '--';
});
const totalGrade = computed(() => getGrade(scoreData.value?.score));
const ratingText = computed(() => {
  const map = {
    S: 'S级 · 强趋势',
    A: 'A级 · 趋势形成',
    B: 'B级 · 趋势酝酿',
    C: 'C级 · 弱趋势',
    D: 'D级 · 观望',
  };
  return map[totalGrade.value] || '--';
});

// 技术面指标
const techIndicators = computed(() => {
  const ind = techDim.value?.detail?.indicators || {};
  return {
    lowPointGain: ind.lowPointGain != null ? Number(ind.lowPointGain) : null,
    ma60Position: ind.ma60Position || '',
    ma60Trend: ind.ma60Trend || '',
    isNewHigh250: !!ind.isNewHigh250,
    isNewHigh120: !!ind.isNewHigh120,
    maxDrawdown: ind.maxDrawdown != null ? Number(ind.maxDrawdown) : null,
  };
});

const ma60TrendTag = computed(() => {
  const t = techIndicators.value.ma60Trend;
  if (t === 'up') return { cls: 'tag-up', text: '向上' };
  if (t === 'down') return { cls: 'tag-down', text: '向下' };
  if (t === 'flat') return { cls: 'tag-neutral', text: '走平' };
  return { cls: 'tag-neutral', text: '--' };
});

// K 线数据
const hasStockKline = computed(() => {
  const k = techDim.value?.detail?.kline;
  return !!(k && k.dates && k.dates.length && k.ohlc && k.ohlc.length);
});
const hasConceptKline = computed(() => {
  const k = techDim.value?.detail?.conceptKline;
  return !!(k && k.dates && k.dates.length && ((k.ohlc && k.ohlc.length) || (k.close && k.close.length)));
});
const techKlineCount = computed(() => techDim.value?.detail?.kline?.dates?.length || 0);
const conceptKlineCount = computed(() => techDim.value?.detail?.conceptKline?.ohlc?.length || techDim.value?.detail?.conceptKline?.close?.length || 0);
const conceptKlineName = computed(() => techDim.value?.detail?.conceptKline?.name || '概念指数');

// 赛道数据
const trackData = computed(() => {
  const d = trackDim.value?.detail || {};
  const inds = trackDim.value?.indicators || [];
  const penetration = inds.find(i => i.key === 'industry_penetration') || inds[1];
  return {
    sectorListCount60d: d.sectorListCount60d != null ? d.sectorListCount60d : 0,
    sectorName: d.sectorName || '--',
    marketRecognition: d.marketRecognition != null ? d.marketRecognition : 0,
    policyTrend: d.policyTrend || '',
    penetration: penetration || null,
    sectorStrength: d.sectorStrength || '',
    weeklyListingTrend: Array.isArray(d.weeklyListingTrend) ? d.weeklyListingTrend : [],
    policyItems: Array.isArray(d.policyItems) ? d.policyItems : [],
  };
});

// 政策趋势条目：优先使用 policyItems 数组，回退到 policyTrend 单条文本
const trackPolicyItems = computed(() => {
  const items = trackData.value.policyItems;
  if (Array.isArray(items) && items.length) return items;
  if (trackData.value.policyTrend) {
    return [{ name: '政策 / 产业趋势', desc: trackData.value.policyTrend, color: 'gold' }];
  }
  return [];
});

// 消息面数据
const newsList = computed(() => newsDim.value?.detail?.news || []);
const newsStats = computed(() => ({
  researchCount: newsDim.value?.detail?.researchCount || 0,
  hardCatalyst: newsDim.value?.detail?.hardCatalyst || '',
  score: newsDim.value?.score != null ? newsDim.value.score : 0,
}));
const catalystBars = computed(() => {
  const s = newsStats.value.score;
  if (s >= 80) return { count: 5, label: '极强' };
  if (s >= 65) return { count: 4, label: '强' };
  if (s >= 50) return { count: 3, label: '中等偏强' };
  if (s >= 35) return { count: 2, label: '中等' };
  return { count: 1, label: '偏弱' };
});

// 基本面数据
const fundSubDims = computed(() => fundDim.value?.detail?.subDimensions || []);
const fundDataPoints = computed(() => {
  const preferredNames = ['最近单季营收同比增速', 'PEG', '毛利率(%)', '行业地位不可替代性'];
  return fundSubDims.value.map((sub, i) => {
    const ind = (sub.indicators || []).find(x => x.name === preferredNames[i]) || sub.indicators?.[0];
    return {
      name: ind?.name || sub.name,
      value: ind?.value || '--',
      score: ind?.score != null ? ind.score : null,
    };
  });
});

// 趋势判读文案：优先 AI 结论，其次描述，最后兜底
const trendAnalysis = computed(() => {
  if (scoreData.value?.aiConclusion) return scoreData.value.aiConclusion;
  if (scoreData.value?.description) return scoreData.value.description;
  const ti = techIndicators.value;
  const gain = ti.lowPointGain != null ? '+' + ti.lowPointGain.toFixed(1) + '%' : '--';
  const pos = ti.ma60Position === 'above' ? '站稳60日均线' : '位于60日均线下方';
  return `股价自低点已反弹 ${gain}，当前${pos}，关注后续量能配合与趋势延续性。`;
});

// ============ 工具函数 ============
// YYYYMMDD -> M/D
function formatKlineDate(d) {
  if (!d || d.length < 8) return d || '';
  return parseInt(d.slice(4, 6), 10) + '/' + parseInt(d.slice(6, 8), 10);
}

// 发布时间 -> M/D
function formatNewsDate(t) {
  if (!t) return '--';
  const s = String(t);
  const m = s.match(/(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (m) return parseInt(m[2], 10) + '/' + parseInt(m[3], 10);
  return s;
}

// 简单移动平均
function calcMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(+(sum / period).toFixed(2));
  }
  return result;
}

function sentimentTag(s) {
  if (s === 'positive') return { cls: 'tag-up', text: '利好' };
  if (s === 'negative') return { cls: 'tag-down', text: '利空' };
  return { cls: 'tag-neutral', text: '中性' };
}

function showToast(text) {
  toastText.value = text;
  toastVisible.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastVisible.value = false; }, 2200);
}

// ============ 面板展开/折叠 ============
function togglePanel(id) {
  panelOpen[id] = !panelOpen[id];
  if (panelOpen[id]) {
    // 展开后延迟渲染/重置图表尺寸（等待 max-height 过渡）
    setTimeout(() => {
      if (id === 'tech') {
        if (stockChart) stockChart.resize(); else renderStockKline();
        if (conceptChart) conceptChart.resize(); else renderConceptKline();
      }
      if (id === 'track') {
        if (trackChart) trackChart.resize(); else renderTrackChart();
      }
    }, 360);
  }
}

// ============ 图表渲染 ============
function renderStockKline() {
  const el = stockKlineRef.value;
  const kline = techDim.value?.detail?.kline;
  if (!el || !kline || !kline.dates?.length || !kline.ohlc?.length) return;
  if (!stockChart) stockChart = echarts.init(el);
  const dates = kline.dates.map(formatKlineDate);
  // ohlc 为 [open, close, low, high]，符合 ECharts candlestick 要求
  const closes = kline.ohlc.map(r => r[1]);
  const ma60 = calcMA(closes, 60);
  const interval = dates.length > 6 ? Math.floor(dates.length / 6) - 1 : 0;
  stockChart.setOption({
    grid: { left: '8%', right: '4%', top: '8%', bottom: '20%' },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#8a96b0', fontSize: 10, interval },
      axisLine: { lineStyle: { color: '#e1e9f5' } },
    },
    yAxis: {
      scale: true,
      axisLabel: { color: '#8a96b0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef3fb' } },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { show: true, type: 'slider', bottom: '2%', height: 14, start: 0, end: 100, borderColor: 'transparent', fillerColor: 'rgba(11, 95, 255, 0.1)', handleStyle: { color: '#0b5fff' } },
    ],
    series: [
      {
        type: 'candlestick', data: kline.ohlc,
        // A 股红涨绿跌
        itemStyle: { color: '#e54d5e', color0: '#18a058', borderColor: '#e54d5e', borderColor0: '#18a058' },
      },
      {
        name: 'MA60', type: 'line', data: ma60, smooth: true, symbol: 'none',
        lineStyle: { color: '#0b5fff', width: 1.5, type: 'dashed' },
      },
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e1e9f5',
      textStyle: { color: '#0a1733', fontSize: 12 },
    },
  }, true);
}

function renderConceptKline() {
  const el = conceptKlineRef.value;
  const ck = techDim.value?.detail?.conceptKline;
  if (!el || !ck) return;
  const ohlcData = ck.ohlc || ck.close?.map((c, i) => [c, c, c * 0.99, c * 1.01]) || [];
  if (!ohlcData.length) return;
  if (!conceptChart) conceptChart = echarts.init(el);
  const dates = (ck.dates || []).map(formatKlineDate);
  const closes = ohlcData.map(d => d[1]);
  const ma60 = calcMA(closes, 60);
  const interval = dates.length > 6 ? Math.floor(dates.length / 6) - 1 : 0;
  conceptChart.setOption({
    grid: { left: '8%', right: '4%', top: '8%', bottom: '20%' },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#8a96b0', fontSize: 10, interval },
      axisLine: { lineStyle: { color: '#e1e9f5' } },
    },
    yAxis: {
      scale: true,
      axisLabel: { color: '#8a96b0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef3fb' } },
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { show: true, type: 'slider', bottom: '2%', height: 14, start: 0, end: 100, borderColor: 'transparent', fillerColor: 'rgba(0, 184, 255, 0.1)', handleStyle: { color: '#00b8ff' } },
    ],
    series: [
      {
        type: 'candlestick', data: ohlcData,
        itemStyle: {
          color: '#e54d5e', color0: '#18a058',
          borderColor: '#e54d5e', borderColor0: '#18a058',
        },
      },
      {
        name: 'MA60', type: 'line', data: ma60, smooth: true, symbol: 'none',
        lineStyle: { color: '#0b5fff', width: 1.2, type: 'dashed', opacity: 0.6 },
      },
    ],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e1e9f5',
      textStyle: { color: '#0a1733', fontSize: 12 },
    },
  }, true);
}

function renderTrackChart() {
  const el = trackChartRef.value;
  if (!el) return;
  if (!trackChart) trackChart = echarts.init(el);
  // 板块60日上榜趋势：6 周柱状图
  const weeks = ['5W前', '4W前', '3W前', '2W前', '上周', '本周'];
  const weeklyData = (trackData.value.weeklyListingTrend && trackData.value.weeklyListingTrend.length === 6)
    ? trackData.value.weeklyListingTrend
    : [3, 5, 4, 7, 9, 12];
  trackChart.setOption({
    grid: { left: '8%', right: '5%', top: '15%', bottom: '15%' },
    xAxis: {
      type: 'category', data: weeks,
      axisLabel: { color: '#8a96b0', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e1e9f5' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8a96b0', fontSize: 10 },
      splitLine: { lineStyle: { color: '#eef3fb' } },
    },
    series: [{
      type: 'bar', data: weeklyData, barWidth: '45%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#0b5fff' },
            { offset: 1, color: '#00b8ff' },
          ],
        },
      },
      label: { show: true, position: 'top', color: '#0b5fff', fontWeight: 700, fontSize: 11 },
    }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#e1e9f5',
      textStyle: { color: '#0a1733', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/>上榜次数: ${p.value} 次`;
      },
    },
  }, true);
}

// ============ 模拟数据（API不可用时回退，用于设计预览） ============
function genMockKlineData(days, startPrice, volatility) {
  const dates = [];
  const ohlc = [];
  let price = startPrice;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = +(price * (1 + change)).toFixed(2);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.02)).toFixed(2);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.02)).toFixed(2);
    ohlc.push([open, close, low, high]);
    price = close;
  }
  return { dates, ohlc };
}

function genMockConceptKline(days, startIdx, volatility) {
  const dates = [];
  const ohlc = [];
  let price = startIdx;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = +(price * (1 + change)).toFixed(2);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.02)).toFixed(2);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.02)).toFixed(2);
    ohlc.push([open, close, low, high]);
    price = close;
  }
  return { name: '煤炭概念', dates, ohlc };
}

const MOCK_STOCKS = [
  { symbol: '600740.SH', name: '山西焦化', score: 82, label: 'S', expectedMultiple: '5-10倍', industry: '煤炭', dimScores: [82, 75, 60, 70] },
  { symbol: '300750.SZ', name: '宁德时代', score: 78, label: 'A', expectedMultiple: '3-5倍', industry: '电力设备', dimScores: [76, 88, 70, 80] },
  { symbol: '002594.SZ', name: '比亚迪', score: 72, label: 'B', expectedMultiple: '2-3倍', industry: '汽车', dimScores: [70, 82, 65, 75] },
  { symbol: '601012.SH', name: '隆基绿能', score: 68, label: 'B', expectedMultiple: '2-3倍', industry: '光伏', dimScores: [65, 72, 58, 78] },
  { symbol: '600519.SH', name: '贵州茅台', score: 75, label: 'A', expectedMultiple: '3-5倍', industry: '白酒', dimScores: [72, 68, 70, 92] },
  { symbol: '002475.SZ', name: '立讯精密', score: 70, label: 'B', expectedMultiple: '2-3倍', industry: '消费电子', dimScores: [68, 76, 62, 74] },
  { symbol: '603259.SH', name: '药明康德', score: 65, label: 'C', expectedMultiple: '1-2倍', industry: '医药', dimScores: [60, 65, 55, 80] },
  { symbol: '300059.SZ', name: '东方财富', score: 73, label: 'A', expectedMultiple: '3-5倍', industry: '证券', dimScores: [75, 70, 68, 78] },
];

const MOCK_NEWS = [
  { title: '财政部下达2026年新能源补贴预算', summary: '中央财政提前下达2026年新能源补贴预算，总规模超800亿元。', source: '财政部', publishTime: '2026-07-12', sentiment: 'positive' },
  { title: '多家券商上调行业评级至"超配"', summary: '中信、国泰君安等头部券商发布研报，上调煤炭行业评级。', source: '券商研报', publishTime: '2026-07-11', sentiment: 'positive' },
  { title: '公司发布上半年业绩预告', summary: '预计H1归母净利润同比增长120%-150%，大超市场预期。', source: '公司公告', publishTime: '2026-07-10', sentiment: 'positive' },
  { title: '大宗商品价格波动加剧', summary: '国际大宗商品市场震荡，焦煤期货主力合约涨3.2%。', source: '期货日报', publishTime: '2026-07-09', sentiment: 'neutral' },
];

function genMockScoreData(symbol) {
  const stock = MOCK_STOCKS.find(s => s.symbol === symbol) || MOCK_STOCKS[0];
  const kline = genMockKlineData(60, 15 + Math.random() * 20, 0.04);
  const conceptKline = genMockConceptKline(60, 1000 + Math.random() * 500, 0.03);
  return {
    symbol: stock.symbol,
    score: stock.score,
    scoreDate: new Date().toISOString().slice(0, 10),
    label: stock.label,
    expectedMultiple: stock.expectedMultiple,
    description: '技术面强势突破，行业景气度持续上行，消息面有积极催化，基本面扎实。',
    aiConclusion: '综合4维度评估，该股处于趋势上行阶段，技术面突破60日均线，行业赛道受政策利好，建议关注。',
    dimScores: stock.dimScores,
    updatedAt: new Date().toISOString(),
    dimensions: [
      {
        name: '技术面',
        weight: 35,
        score: stock.dimScores[0],
        indicators: [
          { name: '低点涨幅', key: 'lowPointGain', value: 0.95, score: 88 },
          { name: '60日线位置', key: 'ma60Position', value: 'above', score: 82 },
          { name: '近期新高', key: 'isNewHigh120', value: true, score: 90 },
          { name: '最大回撤', key: 'maxDrawdown', value: 0.08, score: 75 },
        ],
        detail: {
          kline,
          conceptKline,
          indicators: {
            lowPointGain: 0.95,
            ma60Position: 'above',
            ma60Trend: 'up',
            isNewHigh250: true,
            isNewHigh120: true,
            maxDrawdown: 0.08,
          },
        },
      },
      {
        name: '行业赛道景气',
        weight: 25,
        score: stock.dimScores[1],
        indicators: [
          { name: '60日上榜频次', key: 'sectorListCount60d', value: 12, score: 75 },
          { name: '市场认可度', key: 'marketRecognition', value: 80, score: 80 },
        ],
        detail: {
          sectorListCount60d: 12,
          sectorName: stock.industry + '概念',
          marketRecognition: 80,
          policyTrend: '新能源补贴政策持续加码，碳中和目标推动行业长期景气',
          sectorStrength: '+18.5%',
          weeklyListingTrend: [3, 5, 4, 7, 9, 12],
          policyItems: [
            { name: '焦煤供给持续偏紧', desc: '主产地安监趋严，产能释放受限', color: 'up' },
            { name: '钢铁需求边际改善', desc: '基建项目加速落地，下游补库预期', color: 'up' },
            { name: '双碳政策结构性调整', desc: '短期利好焦化，中长期关注转型', color: 'gold' },
          ],
        },
      },
      {
        name: '消息面催化',
        weight: 20,
        score: stock.dimScores[2],
        indicators: [
          { name: '机构调研次数', key: 'researchCount', value: 12, score: 65 },
          { name: '硬催化', key: 'hardCatalyst', value: '业绩预增', score: 60 },
        ],
        detail: {
          news: MOCK_NEWS,
          researchCount: 12,
          hardCatalyst: '业绩预增120%-150%',
        },
      },
      {
        name: '基本面',
        weight: 20,
        score: stock.dimScores[3],
        indicators: [
          { name: '净利润增速', key: 'netProfitGrowth', value: 1.35, score: 88 },
          { name: 'PEG', key: 'peg', value: 0.8, score: 72 },
          { name: '毛利率', key: 'grossMargin', value: 0.42, score: 68 },
          { name: 'ROE', key: 'roe', value: 0.18, score: 75 },
        ],
        detail: {
          subDimensions: [
            { name: '业绩爆发力', weight: 35, score: 88, indicators: [
              { name: '未来2年预期净利润复合增速', value: '85%', score: 100 },
              { name: '最近单季营收同比增速', value: '62%', score: 80 },
              { name: '最近一季利润同比加速', value: '+18pct', score: 100 },
            ] },
            { name: '估值弹性', weight: 25, score: 72, indicators: [
              { name: 'PEG', value: '0.8', score: 80 },
              { name: '当前总市值(亿)', value: '280', score: 60 },
              { name: '估值双击空间(倍)', value: '4.2', score: 80 },
            ] },
            { name: '盈利质量', weight: 25, score: 68, indicators: [
              { name: '毛利率(%)', value: '42%', score: 100 },
              { name: '净利率同比提升(pct)', value: '+3.2', score: 80 },
              { name: '经营现金流/净利润', value: '0.85', score: 40 },
            ] },
            { name: '竞争壁垒', weight: 15, score: 75, indicators: [
              { name: '细分赛道市占率趋势', value: '上升', score: 80 },
              { name: '合同负债环比增速', value: '+15%', score: 80 },
              { name: '行业地位不可替代性', value: '较高', score: 60 },
            ] },
          ],
        },
      },
    ],
  };
}

// ============ 数据加载 ============
let usingMock = false;

async function loadTopStocks() {
  listLoading.value = true;
  try {
    const res = await trendApi.getTopStocks(30);
    if (res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
      stockList.value = res.data;
      usingMock = false;
      if (stockList.value.length && !currentSymbol.value) {
        await selectStock(stockList.value[0].symbol);
      }
    } else {
      throw new Error('No data');
    }
  } catch (e) {
    console.warn('[TrendScore] API不可用，使用模拟数据展示');
    usingMock = true;
    stockList.value = MOCK_STOCKS.map(s => ({
      symbol: s.symbol,
      name: s.name,
      score: s.score,
      label: s.label,
      expectedMultiple: s.expectedMultiple,
      industry: s.industry,
      scoreDate: new Date().toISOString().slice(0, 10),
      dimScores: s.dimScores,
      description: '技术面强势突破',
    }));
    if (stockList.value.length && !currentSymbol.value) {
      await selectStock(stockList.value[0].symbol);
    }
  } finally {
    listLoading.value = false;
  }
}

async function selectStock(symbol) {
  currentSymbol.value = symbol;
  loading.value = true;
  scoreData.value = null;
  vetoInfo.value = null;
  panelOpen.tech = true;
  panelOpen.track = false;
  panelOpen.news = false;
  panelOpen.fund = false;
  // 销毁旧图表实例，避免内存泄漏
  disposeCharts();
  try {
    if (usingMock) {
      console.warn('[TrendScore] 使用模拟数据:', symbol);
      scoreData.value = genMockScoreData(symbol);
      await nextTick();
      setTimeout(() => {
        renderStockKline();
        renderConceptKline();
      }, 150);
    } else {
      const res = await trendApi.getDetail(symbol);
      if (res.code === 200 && res.data) {
        if (res.data.vetoed) {
          // 一票否决
          vetoInfo.value = {
            symbol,
            reasons: Array.isArray(res.data.reasons) ? res.data.reasons : [],
          };
        } else {
          scoreData.value = res.data;
          await nextTick();
          // 技术面默认展开，渲染 K 线（延迟等待面板 CSS 过渡完成，避免 ECharts 获取到 0 高度 DOM）
          setTimeout(() => {
            renderStockKline();
            renderConceptKline();
          }, 150);
        }
      } else {
        showToast('获取评分详情失败');
      }
    }
  } catch (e) {
    console.error('selectStock failed:', e);
    showToast('获取评分详情失败');
  } finally {
    loading.value = false;
  }
}

async function handleBatchRefresh() {
  if (batchLoading.value) return;
  const symbols = stockList.value.map(s => s.symbol);
  if (!symbols.length) { showToast('暂无股票可重评'); return; }
  batchLoading.value = true;
  showToast('正在重新评分...');
  try {
    const res = await trendApi.batchRefresh(symbols);
    if (res.code === 200) {
      const success = res.data?.success ?? 0;
      const failed = res.data?.failed ?? 0;
      showToast(`重评完成：成功 ${success}，失败 ${failed}`);
      await loadTopStocks();
    } else {
      showToast('重评失败');
    }
  } catch (e) {
    console.error('batchRefresh failed:', e);
    showToast('重评失败');
  } finally {
    batchLoading.value = false;
  }
}

function disposeCharts() {
  if (stockChart) { stockChart.dispose(); stockChart = null; }
  if (conceptChart) { conceptChart.dispose(); conceptChart = null; }
  if (trackChart) { trackChart.dispose(); trackChart = null; }
}

function handleResize() {
  stockChart?.resize();
  conceptChart?.resize();
  trackChart?.resize();
}

onMounted(() => {
  loadTopStocks();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (toastTimer) clearTimeout(toastTimer);
  disposeCharts();
});
</script>

<style scoped>
/* ============ CSS 变量（与模板 :root 完全一致） ============ */
.trend-layout {
  --bg-page: #eef3fb;
  --bg-card: #ffffff;
  --bg-soft: #f5f8fd;
  --primary: #0b5fff;
  --primary-deep: #0a2e6f;
  --primary-light: #4d8bff;
  --accent: #00b8ff;
  --gold: #d4a843;
  --ink: #0a1733;
  --ink-soft: #4b5a7a;
  --ink-mute: #8a96b0;
  --line: #e1e9f5;
  --line-soft: #eef3fb;
  --up: #e54d5e;
  --down: #18a058;
  --shadow-card: 0 4px 20px -8px rgba(11, 95, 255, 0.12), 0 2px 6px -2px rgba(11, 95, 255, 0.06);
  --shadow-hover: 0 12px 32px -8px rgba(11, 95, 255, 0.22), 0 4px 12px -2px rgba(11, 95, 255, 0.10);

  display: flex;
  margin-top: 60px;
  height: calc(100vh - 60px);
  overflow: hidden;
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif !important;
  color: var(--ink);
  background: var(--bg-page);
  background-image:
    radial-gradient(circle at 12% 8%, rgba(11, 95, 255, 0.08) 0%, transparent 35%),
    radial-gradient(circle at 88% 92%, rgba(0, 184, 255, 0.06) 0%, transparent 40%),
    linear-gradient(180deg, #eef3fb 0%, #e6eef9 100%);
}

.mono-lg { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; }
.mono-xl { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; }

/* ============ 滚动条 ============ */
.trend-layout ::-webkit-scrollbar { width: 6px; height: 6px; }
.trend-layout ::-webkit-scrollbar-track { background: transparent; }
.trend-layout ::-webkit-scrollbar-thumb { background: #c5d3e8; border-radius: 3px; }
.trend-layout ::-webkit-scrollbar-thumb:hover { background: #9fb5d6; }

/* ============ 左侧栏 ============ */
.sidebar {
  width: 288px;
  flex-shrink: 0;
  border-right: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
}
.sidebar-top {
  padding: 16px;
  border-bottom: 1px solid var(--line);
}
.search-wrap { position: relative; }
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ink-mute);
  pointer-events: none;
}
.search-input {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px 10px 38px;
  width: 100%;
  transition: all 0.2s ease;
  font-size: 14px;
  font-family: inherit;
  color: var(--ink);
  box-sizing: border-box;
}
.search-input::placeholder { color: var(--ink-mute); }
.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(11, 95, 255, 0.1);
}
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}
.list-title { font-size: 12px; font-weight: 600; color: var(--ink-soft); }
.count-pill {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(11, 95, 255, 0.08);
  color: var(--primary);
}

.stock-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.list-hint { text-align: center; color: var(--ink-mute); padding: 24px 0; font-size: 13px; }

.stock-item {
  background: var(--bg-card);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.stock-item::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary), var(--accent));
  transform: scaleY(0);
  transition: transform 0.3s ease;
}
.stock-item:hover {
  border-color: rgba(11, 95, 255, 0.3);
  transform: translateX(2px);
  box-shadow: 0 4px 12px -4px rgba(11, 95, 255, 0.15);
}
.stock-item.active {
  border-color: rgba(11, 95, 255, 0.4);
  background: linear-gradient(135deg, #f5f9ff, #eef3ff);
  box-shadow: 0 6px 20px -6px rgba(11, 95, 255, 0.25);
}
.stock-item.active::before { transform: scaleY(1); }
.stock-item { display: flex; align-items: center; justify-content: space-between; }
.stock-meta { display: flex; flex-direction: column; min-width: 0; }
.stock-name { font-weight: 600; font-size: 14px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stock-code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink-mute); margin-top: 2px; }
.stock-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.stock-score { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; color: var(--primary); }

/* 评级徽章 */
.grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-weight: 800;
  font-size: 13px;
  color: white;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.grade-S { background: linear-gradient(135deg, #d4a843, #b8862e); box-shadow: 0 2px 8px -1px rgba(212, 168, 67, 0.5); }
.grade-A { background: linear-gradient(135deg, #0b5fff, #00b8ff); box-shadow: 0 2px 8px -1px rgba(11, 95, 255, 0.4); }
.grade-B { background: linear-gradient(135deg, #5b8def, #7aa3f5); }
.grade-C { background: linear-gradient(135deg, #8a96b0, #6b7891); }
.grade-D { background: linear-gradient(135deg, #6b7891, #4b5a7a); }

.sidebar-bottom {
  padding: 16px;
  border-top: 1px solid var(--line);
}
.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%);
  color: white;
  padding: 12px 16px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px -2px rgba(11, 95, 255, 0.4);
  position: relative;
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-size: 14px;
}
.btn-primary::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s ease;
}
.btn-primary:hover::before { left: 100%; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px -2px rgba(11, 95, 255, 0.5); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
.btn-hint { font-size: 12px; text-align: center; margin-top: 8px; color: var(--ink-mute); }

/* ============ 主内容区 ============ */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  color: var(--ink-mute);
  font-size: 14px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--line);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.veto-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px;
  background: rgba(229, 77, 94, 0.06);
  border: 1px solid rgba(229, 77, 94, 0.25);
  border-radius: 12px;
  color: var(--up);
  max-width: 480px;
}
.veto-title { font-weight: 700; font-size: 15px; }
.veto-reason { font-size: 13px; color: var(--ink-soft); margin-top: 4px; }

/* 页头 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-mute);
}
.title-row { display: flex; align-items: baseline; gap: 12px; margin-top: 4px; flex-wrap: wrap; }
.main-title { font-size: 24px; font-weight: 700; color: var(--ink); margin: 0; }
.title-code { font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--ink-mute); }
.trend-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.12), rgba(212, 168, 67, 0.05));
  border: 1px solid rgba(212, 168, 67, 0.25);
  color: #a67c1f;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.header-actions { display: flex; align-items: center; gap: 8px; }
.ghost-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: var(--bg-card);
  border: 1px solid var(--line);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.ghost-btn:hover { border-color: rgba(11, 95, 255, 0.3); color: var(--primary); }

/* ============ 通用面板 ============ */
.panel {
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  transition: box-shadow 0.3s ease;
  overflow: hidden;
  margin-bottom: 16px;
}
.panel:hover { box-shadow: var(--shadow-hover); }

.panel-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s ease;
}
.panel-header:hover { background: var(--bg-soft); }
.panel-title { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 16px; color: var(--ink); }
.panel-sub { font-size: 12px; font-weight: 400; color: var(--ink-mute); }
.icon-box {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: white;
  font-size: 16px;
  flex-shrink: 0;
}
.icon-tech { background: linear-gradient(135deg, #0b5fff, #00b8ff); }
.icon-track { background: linear-gradient(135deg, #00b8ff, #0b5fff); }
.icon-news { background: linear-gradient(135deg, #d4a843, #b8862e); }
.icon-fund { background: linear-gradient(135deg, #0a2e6f, #0b5fff); }

.panel-score { display: flex; align-items: center; gap: 12px; }
.panel-score-val { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 700; color: var(--primary); }
.panel-score-max { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--ink-mute); }

.panel-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel.expanded .panel-body { max-height: 1600px; }
.panel.expanded .chevron { transform: rotate(180deg); }
.chevron { transition: transform 0.3s ease; color: var(--ink-mute); }
.panel-inner { padding: 24px; }

/* ============ 评分总览 ============ */
.score-overview .panel-body { max-height: 1600px; overflow: visible; }
.overview-grid {
  display: grid;
  grid-template-columns: 4fr 8fr;
  gap: 24px;
  padding: 24px;
}
.grid-bg {
  background-image:
    linear-gradient(rgba(11, 95, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(11, 95, 255, 0.04) 1px, transparent 1px);
  background-size: 20px 20px;
}
.overview-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--line-soft);
  padding-right: 24px;
}
.label-sm { font-size: 12px; font-weight: 600; color: var(--ink-mute); margin-bottom: 4px; }
.score-row { display: flex; align-items: baseline; gap: 8px; }
.total-score {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-weight: 800;
  font-size: 64px;
  line-height: 1;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.score-max { font-size: 14px; font-family: 'JetBrains Mono', monospace; color: var(--ink-mute); }
.grade-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.rating-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(212, 168, 67, 0.15), rgba(212, 168, 67, 0.05));
  color: #a67c1f;
  border: 1px solid rgba(212, 168, 67, 0.3);
}
.status-list { margin-top: 16px; font-size: 12px; line-height: 1.6; color: var(--ink-soft); }
.status-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-up { background: var(--up); }
.dot-gold { background: var(--gold); }

.overview-right { min-width: 0; }
.dim-cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.dim-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}
.dim-card:hover {
  border-color: rgba(11, 95, 255, 0.25);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -6px rgba(11, 95, 255, 0.18);
}
.dim-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: white;
}
.dim-bar-wrap { flex: 1; min-width: 0; }
.dim-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 8px; }
.dim-head-text { min-width: 0; }
.dim-name { font-size: 14px; font-weight: 700; color: var(--ink); }
.dim-desc { font-size: 12px; color: var(--ink-mute); }
.dim-score-wrap { display: flex; align-items: baseline; gap: 2px; flex-shrink: 0; }
.dim-score { font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 26px; font-weight: 800; line-height: 1; }
.dim-score-max { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--ink-mute); }

/* ============ 评分进度条（带 shimmer） ============ */
.score-bar {
  height: 6px;
  background: var(--line-soft);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}
.score-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  position: relative;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}
.score-bar-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s infinite;
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ============ 标签 ============ */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.tag-up { background: rgba(229, 77, 94, 0.1); color: var(--up); }
.tag-down { background: rgba(24, 160, 88, 0.1); color: var(--down); }
.tag-neutral { background: rgba(11, 95, 255, 0.08); color: var(--primary); }

/* ============ 数据点 ============ */
.data-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.data-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.data-point {
  background: var(--bg-soft);
  border-radius: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line-soft);
  transition: all 0.2s ease;
}
.data-point:hover { border-color: rgba(11, 95, 255, 0.2); background: #f0f6ff; }
.dp-label { font-size: 12px; color: var(--ink-mute); }
.dp-value-row { margin-top: 4px; display: flex; align-items: center; gap: 6px; }
.dp-unit { font-size: 12px; color: var(--ink-soft); }
.dp-sub { font-size: 12px; color: var(--ink-mute); margin-top: 4px; }
.trend-indicator { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-top: 4px; }
.trend-indicator.up { color: var(--up); }

/* ============ 图表容器 ============ */
.charts-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.chart-box {
  background: linear-gradient(180deg, #fbfdff, #f5f9ff);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  padding: 12px;
  position: relative;
}
.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
}
.chart-head-left { display: flex; align-items: center; gap: 8px; }
.chart-dot { width: 8px; height: 8px; border-radius: 50%; }
.chart-dot-blue { background: var(--primary); }
.chart-dot-cyan { background: var(--accent); }
.chart-title-text { font-size: 14px; font-weight: 600; color: var(--ink); }
.chart-280 { width: 100%; height: 280px; }
.chart-200 { width: 100%; height: 200px; }
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-mute);
  font-size: 13px;
}

/* 趋势判读 */
.trend-analysis {
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f5f9ff, #eaf2ff);
  border: 1px solid rgba(11, 95, 255, 0.12);
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.ta-icon {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary);
  color: white;
}
.ta-title { font-weight: 600; font-size: 14px; color: var(--primary-deep); }
.ta-text { font-size: 12px; margin-top: 4px; line-height: 1.6; color: var(--ink-soft); }

/* 软盒（赛道右栏 / 政策） */
.soft-box {
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-soft);
  border: 1px solid var(--line-soft);
}
.soft-box-title { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin-bottom: 12px; }
.policy-block { display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.policy-item { display: flex; align-items: flex-start; gap: 8px; }
.policy-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }
.policy-dot-blue { background: var(--up); }
.policy-dot-gold { background: var(--gold); }
.policy-item > div { display: flex; flex-direction: column; }
.policy-name { font-weight: 600; color: var(--ink); }
.policy-desc { font-size: 12px; color: var(--ink-soft); margin-top: 2px; }
.policy-empty { color: var(--ink-mute); font-size: 13px; }

/* ============ 消息面 ============ */
.news-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.news-head-title { font-size: 14px; font-weight: 600; color: var(--ink); }
.catalyst-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-mute); }
.catalyst-bars { display: flex; gap: 4px; }
.catalyst-bar { width: 6px; height: 12px; border-radius: 2px; background: var(--line); }
.catalyst-bar.filled { background: var(--up); }
.catalyst-text { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--up); }

.news-meta-row { display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
.news-meta-item { font-size: 13px; color: var(--ink-soft); }
.news-meta-item strong { color: var(--ink); font-weight: 700; }

.news-list { display: flex; flex-direction: column; }
.news-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-left: 3px solid transparent;
  background: var(--bg-soft);
  border-radius: 0 10px 10px 0;
  transition: all 0.2s ease;
  margin-bottom: 10px;
}
.news-item:hover {
  border-left-color: var(--primary);
  background: #eaf2ff;
  transform: translateX(2px);
}
.news-item:last-child { margin-bottom: 0; }
.news-date {
  flex-shrink: 0;
  width: 40px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-mute);
}
.news-body { flex: 1; min-width: 0; }
.news-tag-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.news-source { font-size: 12px; color: var(--ink-mute); }
.news-title { font-size: 14px; font-weight: 600; color: var(--ink); }
.news-summary { font-size: 12px; margin-top: 4px; color: var(--ink-soft); line-height: 1.5; }
.news-empty { color: var(--ink-mute); font-size: 14px; padding: 24px 0; text-align: center; }

/* ============ 基本面 ============ */
.factor-grid { display: grid; grid-template-columns: repeat(2, 1fr); column-gap: 32px; row-gap: 0; }
.factor-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px dashed var(--line-soft);
  cursor: pointer;
  user-select: none;
}
.factor-row:last-child { border-bottom: none; }
.factor-stripe { width: 4px; height: 32px; border-radius: 2px; flex-shrink: 0; }
.factor-content { flex: 1; min-width: 0; }
.factor-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.factor-name { font-size: 14px; font-weight: 600; color: var(--ink); }
.factor-score { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; }
.factor-row-wrapper { margin-bottom: 8px; }
.factor-row.expanded .factor-chevron { transform: rotate(180deg); }
.factor-chevron { transition: transform 0.25s ease; flex-shrink: 0; margin-left: 8px; color: var(--ink-mute); }
.factor-detail { padding: 8px 12px 12px 20px; }
.factor-indicator { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; border-bottom: 1px solid var(--line-soft); }
.factor-indicator:last-child { border-bottom: none; }
.fi-name { color: var(--ink-soft); min-width: 100px; }
.fi-value { font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--ink); }
.fi-score { margin-left: auto; font-family: 'JetBrains Mono', monospace; color: var(--primary); font-weight: 600; }
.fi-empty { font-size: 12px; color: var(--ink-mute); padding: 8px 0; }
.factor-detail-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.factor-detail-wrapper.expanded {
  grid-template-rows: 1fr;
}
.factor-detail-wrapper > .factor-detail {
  overflow: hidden;
  min-height: 0;
}

/* ============ Toast ============ */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  color: white;
  padding: 12px 20px;
  border-radius: 10px;
  box-shadow: 0 8px 24px -4px rgba(11, 95, 255, 0.4);
  z-index: 1000;
  transform: translateX(400px);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toast.show { transform: translateX(0); }

/* ============ 动画 ============ */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeInUp 0.5s ease backwards; }

/* ============ 响应式 ============ */
@media (max-width: 1100px) {
  .overview-grid { grid-template-columns: 1fr; }
  .overview-left { border-right: none; border-bottom: 1px solid var(--line-soft); padding-right: 0; padding-bottom: 20px; }
  .data-grid-4 { grid-template-columns: repeat(2, 1fr); }
  .charts-grid-2 { grid-template-columns: 1fr; }
  .factor-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .sidebar { width: 220px; }
  .data-grid-3 { grid-template-columns: 1fr; }
  .dim-cards-grid { grid-template-columns: 1fr; }
  .total-score { font-size: 48px; }
}
</style>
