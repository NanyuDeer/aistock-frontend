<template>
  <div class="trend-layout">
    <!-- ============ 左侧栏 ============ -->
    <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-top">
        <div class="search-wrap">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input v-model="searchInput" type="text" class="search-input" placeholder="搜索股票代码 / 名称" />
        </div>
        <div class="list-header">
          <span class="list-title">趋势股列表</span>
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
              <div class="stock-code-row">
                <span class="stock-code">{{ item.symbol }}</span>
                <span class="stock-sector-tag" v-if="item.industry">{{ item.industry }}</span>
              </div>
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
    <div class="sidebar-overlay" v-if="sidebarOpen" @click="sidebarOpen = false"></div>

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
            <button class="ghost-btn" @click="showToast('加入监控功能开发中')">
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
                      @click="showPolicyDetail(item)"
                      style="cursor: pointer;"
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
                <div class="news-item" v-for="(news, ni) in newsPagedList" :key="newsPage * NEWS_PAGE_SIZE + ni" @click="showNewsDetailDialog(news)" style="cursor: pointer;">
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
                <!-- 分页控件 -->
                <div class="news-pagination" v-if="newsTotalPages > 1">
                  <button class="news-page-btn" :disabled="newsPage === 0" @click="newsPage--">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <span class="news-page-info">{{ newsPage + 1 }} / {{ newsTotalPages }}</span>
                  <button class="news-page-btn" :disabled="newsPage >= newsTotalPages - 1" @click="newsPage++">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
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

    <!-- 政策/新闻详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" :title="detailDialogTitle" width="600px" class="news-detail-dialog" :close-on-click-modal="true" :destroy-on-close="true" style="border-radius: 18px; box-shadow: 0 8px 32px rgba(0,0,0,0.18);">
      <div class="detail-dialog-content">
        <div v-if="detailDialogSubtitle" class="detail-dialog-subtitle">{{ detailDialogSubtitle }}</div>
        <div class="detail-dialog-body">{{ detailDialogBody }}</div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
// 模块级缓存：组件销毁后仍存活，避免每次进入页面都重新加载
let listCache = null; // { data, time }
let detailCache = null; // { symbol, data, time }
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存
</script>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
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
const sidebarOpen = ref(false);
const stockList = ref([]);
const scoreData = ref(null);
const loading = ref(false);
const listLoading = ref(false);
const batchLoading = ref(false);
const vetoInfo = ref(null);
// 技术面默认展开，其余折叠
const panelOpen = reactive({ tech: true, track: false, news: false, fund: false });

// 同步恢复缓存：在模板首次渲染前设置数据，避免空状态闪现
if (listCache && Date.now() - listCache.time < CACHE_TTL) {
  stockList.value = listCache.data;
  if (detailCache && Date.now() - detailCache.time < CACHE_TTL) {
    currentSymbol.value = detailCache.symbol;
    scoreData.value = detailCache.data;
  }
}

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
const NEWS_PAGE_SIZE = 4;
const newsPage = ref(0);
const newsTotalPages = computed(() => Math.max(1, Math.ceil(newsList.value.length / NEWS_PAGE_SIZE)));
const newsPagedList = computed(() => {
  const start = newsPage.value * NEWS_PAGE_SIZE;
  return newsList.value.slice(start, start + NEWS_PAGE_SIZE);
});
// 资讯列表变化时重置页码
watch(newsList, () => { newsPage.value = 0; });
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

// ============ 政策/新闻详情弹窗 ============
const detailDialogVisible = ref(false);
const detailDialogTitle = ref('');
const detailDialogSubtitle = ref('');
const detailDialogBody = ref('');

const showPolicyDetail = (item) => {
  detailDialogTitle.value = item.name;
  detailDialogSubtitle.value = '';
  detailDialogBody.value = item.desc;
  detailDialogVisible.value = true;
};

const showNewsDetailDialog = (news) => {
  detailDialogTitle.value = news.title;
  detailDialogSubtitle.value = [news.source, news.publishTime].filter(Boolean).join(' · ');
  detailDialogBody.value = news.summary || '暂无详细内容';
  detailDialogVisible.value = true;
};

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

// ============ 数据加载 ============

async function loadTopStocks() {
  // 有缓存且未过期，直接用缓存数据，不显示加载态
  if (listCache && Date.now() - listCache.time < CACHE_TTL) {
    stockList.value = listCache.data;
    // 如果 setup 阶段已恢复详情，只需重新渲染图表
    if (detailCache && Date.now() - detailCache.time < CACHE_TTL && currentSymbol.value) {
      await nextTick();
      setTimeout(() => { renderStockKline(); renderConceptKline(); }, 150);
    } else if (stockList.value.length && !currentSymbol.value) {
      await selectStock(stockList.value[0].symbol);
    }
    return;
  }
  listLoading.value = true;
  try {
    const res = await trendApi.getTopStocks(50);
    if (res.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
      stockList.value = res.data;
      listCache = { data: res.data, time: Date.now() };
      if (stockList.value.length && !currentSymbol.value) {
        await selectStock(stockList.value[0].symbol);
      }
    } else {
      throw new Error('No data');
    }
  } catch (e) {
    console.error('[TrendScore] 加载股票列表失败:', e);
    showToast('加载股票列表失败，请检查后端服务');
  } finally {
    listLoading.value = false;
  }
}

async function selectStock(symbol) {
  currentSymbol.value = symbol;
  // 窄屏抽屉模式下，选择股票后自动收起侧边栏
  sidebarOpen.value = false;
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
        detailCache = { symbol, data: res.data, time: Date.now() };
        // 从评分详情中回填板块名到列表项，供股票卡片展示概念板块标签
        const trackDetail = res.data.dimensions?.find(d => d.name === '行业赛道景气')?.detail;
        const sectorName = trackDetail?.sectorName;
        if (sectorName) {
          const listItem = stockList.value.find(s => s.symbol === symbol);
          if (listItem) listItem.industry = sectorName;
        }
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

// ResizeObserver: 监听容器宽度变化（如面板展开/折叠、sidebar 抽屉切换），自动 resize echarts
let resizeObserver = null;

onMounted(() => {
  loadTopStocks();
  window.addEventListener('resize', handleResize);
  // 监听 main-content 容器尺寸变化
  resizeObserver = new ResizeObserver(() => {
    stockChart?.resize();
    conceptChart?.resize();
    trackChart?.resize();
  });
  const mainEl = document.querySelector('.main-content');
  if (mainEl) resizeObserver.observe(mainEl);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeObserver) resizeObserver.disconnect();
  if (toastTimer) clearTimeout(toastTimer);
  disposeCharts();
});
</script>

<style scoped>
/* ============ CSS 变量（与模板 :root 完全一致） ============ */
.trend-layout {
  --bg-page: #f5f7fa;
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
    linear-gradient(180deg, #f5f7fa 0%, #f0f2f5 100%);
}

.mono-lg { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 18px; font-weight: 700; }
.mono-xl { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 24px; font-weight: 700; }

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
/* 桌面端隐藏移动端菜单按钮与遮罩 */
.mobile-menu-btn { display: none; }
.sidebar-overlay { display: none; }
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
  font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  margin-bottom: 4px;
  background: #fff;
}
.stock-item:hover { background: #f5f7fa; border-color: #e4e7ed; }
.stock-item.active { background: #ecf5ff; border-color: #b3d8ff; }
.stock-code-row { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.stock-sector-tag {
  font-size: 10px;
  color: #909399;
  background: #f0f2f5;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.stock-meta { display: flex; flex-direction: column; min-width: 0; }
.stock-name { font-weight: 600; font-size: 14px; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stock-code { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 12px; color: var(--ink-mute); margin-top: 2px; }
.stock-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.stock-score { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 16px; font-weight: 700; color: var(--primary); }

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
.title-code { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 14px; color: var(--ink-mute); }
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
.panel-score-val { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 24px; font-weight: 700; color: var(--primary); }
.panel-score-max { font-size: 12px; font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; color: var(--ink-mute); }

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
.score-max { font-size: 14px; font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; color: var(--ink-mute); }
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
  box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.06);
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
.dim-score-max { font-size: 12px; font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; color: var(--ink-mute); }

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
.charts-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; min-width: 0; }
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
  min-width: 0;
  overflow: hidden;
}
.soft-box-title { font-size: 12px; font-weight: 600; color: var(--ink-soft); margin-bottom: 12px; }
.policy-block { display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.policy-item { display: flex; align-items: flex-start; gap: 8px; }
.policy-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 7px; flex-shrink: 0; }
.policy-dot-blue { background: var(--up); }
.policy-dot-gold { background: var(--gold); }
.policy-item > div { display: flex; flex-direction: column; min-width: 0; }
.policy-name { font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.policy-desc {
  font-size: 12px;
  color: var(--ink-soft);
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
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
.catalyst-text { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-weight: 700; color: var(--up); }

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

/* 分页控件 */
.news-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
}
.news-page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg-soft);
  color: var(--ink-soft);
  cursor: pointer;
  transition: all 0.15s ease;
}
.news-page-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: #eaf2ff;
}
.news-page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.news-page-info {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
  font-family: 'JetBrains Mono', 'Consolas', sans-serif;
  min-width: 48px;
  text-align: center;
}
.news-date {
  flex-shrink: 0;
  width: 40px;
  text-align: center;
  font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: var(--ink-mute);
}
.news-body { flex: 1; min-width: 0; }
.news-tag-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.news-source { font-size: 12px; color: var(--ink-mute); }
.news-title { font-size: 14px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.news-summary {
  font-size: 12px;
  margin-top: 4px;
  color: var(--ink-soft);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
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
.factor-score { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-size: 14px; font-weight: 700; }
.factor-row-wrapper { margin-bottom: 8px; }
.factor-row.expanded .factor-chevron { transform: rotate(180deg); }
.factor-chevron { transition: transform 0.25s ease; flex-shrink: 0; margin-left: 8px; color: var(--ink-mute); }
.factor-detail { padding: 8px 12px 12px 20px; }
.factor-indicator { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; border-bottom: 1px solid var(--line-soft); }
.factor-indicator:last-child { border-bottom: none; }
.fi-name { color: var(--ink-soft); min-width: 100px; }
.fi-value { font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; font-weight: 600; color: var(--ink); }
.fi-score { margin-left: auto; font-family: 'JetBrains Mono', 'Consolas', 'Noto Sans SC', sans-serif; color: var(--primary); font-weight: 600; }
.fi-empty { font-size: 12px; color: var(--ink-mute); padding: 8px 0; }
.factor-detail-wrapper {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.35s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.25s ease;
}
.factor-detail-wrapper.expanded {
  max-height: 400px;
  opacity: 1;
}
.factor-detail {
  overflow: hidden;
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
  .sidebar { width: 240px; }
}
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -300px;
    top: 60px;
    bottom: 0;
    z-index: 50;
    transition: left 0.3s ease;
    width: 288px;
  }
  .sidebar.open { left: 0; }
  .mobile-menu-btn {
    display: flex;
    position: fixed;
    top: 68px;
    left: 12px;
    z-index: 51;
    background: rgba(255,255,255,0.9);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    color: var(--ink);
    align-items: center;
    justify-content: center;
  }
  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.3);
    z-index: 49;
  }
  .data-grid-3 { grid-template-columns: 1fr; }
  .dim-cards-grid { grid-template-columns: 1fr; }
  .total-score { font-size: 48px; }
}

/* ============ 政策/新闻详情弹窗 ============ */
.detail-dialog-content { padding: 0 4px; }
.detail-dialog-subtitle { font-size: 13px; color: var(--ink-mute); margin-bottom: 12px; }
.detail-dialog-body { font-size: 14px; color: var(--ink); line-height: 1.8; white-space: pre-wrap; }
</style>
