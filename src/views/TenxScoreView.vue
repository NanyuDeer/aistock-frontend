<template>
  <div class="tenx-page">
    <TheNavbar />
    <div class="tenx-layout">
      <!-- 左侧边栏 -->
      <aside class="tenx-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-brand-icon">X</div>
            <div>
              <div class="sidebar-brand-text">TenX Model</div>
              <div class="sidebar-brand-sub">十倍股评分系统</div>
            </div>
          </div>
          <div class="add-search-wrap">
            <i class="el-icon-search add-search-icon"></i>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索添加股票..."
              class="add-search-input"
              autocomplete="off"
              @focus="searchFocused = true"
              @blur="onSearchBlur"
            />
            <div v-if="searchFocused && filteredAllStocks.length > 0" class="add-search-dropdown">
              <div
                v-for="s in filteredAllStocks"
                :key="s.code"
                class="add-search-item"
                @mousedown.prevent="addStock(s)"
              >
                <span class="asi-name">{{ s.name }}</span>
                <span class="asi-code">{{ s.code }}</span>
                <span class="asi-add">+ 添加</span>
              </div>
            </div>
          </div>
        </div>
        <div class="sidebar-list">
          <div class="sidebar-list-header">
            <span>{{ myStocks.length }} 只股票</span>
            <button class="model-info-btn" @click="showModelOverlay = true">
              <i class="el-icon-info"></i> 模型说明
            </button>
          </div>
          <div class="sidebar-list-items">
            <div
              v-for="(stock, idx) in myStocks"
              :key="stock.code"
              class="stock-item"
              :class="{ active: curIdx === idx }"
              @click="selectStock(idx)"
            >
              <div class="stock-item-score" :style="getScoreBadgeStyle(stock)">
                {{ getScoreBadgeLabel(stock) }}
              </div>
              <div class="stock-item-info">
                <div class="stock-item-name">{{ stock.name }}</div>
                <div class="stock-item-meta">
                  <span>{{ stock.code }}</span>
                  <span>{{ stock.sector }}</span>
                </div>
              </div>
              <div class="stock-item-remove" @click.stop="removeStock(idx)">
                <i class="el-icon-close"></i>
              </div>
            </div>
            <div v-if="myStocks.length === 0" class="sidebar-empty">
              <i class="el-icon-folder-opened"></i>
              搜索框添加股票
            </div>
          </div>
        </div>
        <div class="sidebar-footer">
          <button class="score-all-btn" :class="{ loading: isScoring }" @click="startScoring">
            <i :class="isScoring ? 'el-icon-loading' : 'el-icon-lightning'"></i>
            一键评分
            <span class="score-all-sub">{{ isScoring ? '重新计算中，请耐心等待' : '重新获取数据评分' }}</span>
          </button>
        </div>
      </aside>

      <!-- 主内容区 -->
      <div class="tenx-main">
        <!-- 空状态 -->
        <div v-if="myStocks.length === 0" class="empty-state">
          <i class="el-icon-data-line empty-state-icon"></i>
          <div class="empty-state-text">从左侧搜索添加股票</div>
          <div class="empty-state-sub">添加后点击"一键评分"开始分析</div>
        </div>

        <!-- 评分内容 -->
        <div v-else class="main-inner">
          <!-- 股票信息栏 -->
          <div class="stock-header">
            <div>
              <div class="stock-header-name">{{ currentStock.name }}</div>
              <div class="stock-header-sub">
                <span class="stock-header-code">{{ currentStock.code }}</span>
                <span class="stock-header-ind">{{ currentStock.sector }}</span>
              </div>
            </div>
            <div class="stock-header-right">
              <button class="refresh-single-btn" :class="{ loading: isRefreshing }" @click="refreshSingleScore" :disabled="isRefreshing">
                <i :class="isRefreshing ? 'el-icon-loading' : 'el-icon-refresh'"></i>
                {{ isRefreshing ? '刷新中' : '刷新评分' }}
              </button>
              <div class="stock-header-price">{{ currentStock.latestPrice || '--' }}</div>
              <div class="stock-header-chg" :class="currentStock.changeRate >= 0 ? 'is-up' : 'is-down'">
                {{ formatChg(currentStock) }}
              </div>
            </div>
          </div>

          <!-- 评分环 + 雷达 -->
          <div class="score-radar-row">
            <div class="score-ring-card">
              <div class="score-ring-wrap">
                <svg viewBox="0 0 150 150" width="150" height="150" style="transform:rotate(-90deg)">
                  <circle cx="75" cy="75" r="65" fill="none" stroke="#e4e7ed" stroke-width="6" />
                  <circle
                    cx="75" cy="75" r="65" fill="none"
                    :stroke="totalScoreColor"
                    stroke-width="6"
                    stroke-linecap="round"
                    :stroke-dasharray="408.4"
                    :stroke-dashoffset="408.4 * (1 - totalScore / 100)"
                    class="score-ring-fill"
                  />
                </svg>
                <div class="score-ring-center">
                  <span class="score-ring-value" :style="{ color: hasScoreError ? '#f56c6c' : totalScoreColor }">
                    {{ hasScore ? totalScore.toFixed(1) : hasScoreError ? '!' : '--' }}
                  </span>
                  <span class="score-ring-label">{{ hasScore ? ratingInfo.d : hasScoreError ? '获取失败' : '待评分' }}</span>
                </div>
              </div>
              <div class="rating-row">
                <span class="rating-badge" :style="ratingBadgeStyle">{{ ratingInfo.l }}</span>
                <span class="rating-desc" :style="{ color: hasScore ? ratingInfo.c : hasScoreError ? '#f56c6c' : '#7b8ca6' }">
                  {{ hasScore ? `评级 ${ratingInfo.l} · ${ratingInfo.d}` : hasScoreError ? '评分获取失败，请稍后重试' : '点击评分开始' }}
                </span>
              </div>
              <div v-if="hasScoreError && !hasScore" class="ai-conclusion-block" style="border-color: #f56c6c;">
                <div class="ai-conclusion-header" style="color: #f56c6c;">
                  <i class="el-icon-warning-outline"></i>
                  <span>评分获取失败</span>
                </div>
                <p class="ai-conclusion-text" style="color: #f56c6c;">无法连接评分服务，请检查网络后点击刷新重试。</p>
              </div>
              <div v-if="hasScore" class="ai-conclusion-block">
                <div class="ai-conclusion-header">
                  <i class="el-icon-chat-dot-round"></i>
                  <span>AI结论</span>
                </div>
                <p class="ai-conclusion-text">{{ aiConclusion }}</p>
              </div>
            </div>
            <div class="radar-card">
              <div class="radar-card-title">维度雷达</div>
              <div class="radar-canvas-wrap">
                <canvas ref="radarCanvas"></canvas>
              </div>
            </div>
          </div>

          <!-- 维度详情 -->
          <div class="dim-section-header">
            <div class="dim-section-left">
              <span class="dim-section-title">维度详情</span>
              <div class="dim-group-labels">
                <span class="dim-group-label">前四维 · 能长多大</span>
                <span class="dim-group-label">后四维 · 能走多远</span>
              </div>
            </div>
            <button class="dim-expand-btn" @click="toggleAll">
              {{ allOpen ? '全部收起' : '全部展开' }}
            </button>
          </div>
          <div class="dim-grid">
            <template v-for="(dim, i) in DIMS" :key="dim.name">
              <div v-if="i === 4" class="dim-group-divider">
                <span class="dim-group-divider-label">后四维 · 能走多远</span>
                <div class="dim-group-divider-line"></div>
              </div>
              <div
                class="dim-card"
                :class="{ expanded: expandedDims.has(i), 'anim-in': hasScore }"
                :style="hasScore ? { animationDelay: `${i * 40}ms` } : {}"
              >
                <div class="dim-head" @click="toggleDim(i)">
                  <div class="dim-head-row">
                    <div class="dim-head-left">
                      <i :class="dim.iconClass" class="dim-icon" :style="{ color: hasScore ? sColor(dimScores[i]) : '#7b8ca6' }"></i>
                      <div>
                        <span class="dim-name">{{ dim.name }}</span>
                        <span class="dim-weight">{{ dim.weight }}%</span>
                        <div class="dim-question">{{ dim.question }}</div>
                      </div>
                    </div>
                    <div class="dim-head-right">
                      <span class="dim-score" :style="{ color: hasScore ? sColor(dimScores[i]) : '#7b8ca6' }">
                        {{ hasScore ? dimScores[i] : '--' }}
                      </span>
                      <i class="el-icon-arrow-down dim-chevron" :class="{ open: expandedDims.has(i) }"></i>
                    </div>
                  </div>
                  <div class="bar-track">
                    <div class="bar-fill" :style="{ width: `${hasScore ? dimScores[i] : 0}%`, background: sGrad(dimScores[i]) }"></div>
                  </div>
                </div>
                <div class="dim-details" :class="{ open: expandedDims.has(i) }">
                  <div class="dim-details-inner">
                    <div v-for="(ind, j) in dim.indicators" :key="ind.name" class="ind-row">
                      <span class="ind-name">{{ ind.name }}</span>
                      <div class="ind-right">
                        <span class="ind-value">{{ hasScore ? indVals[i][j] : '--' }}</span>
                        <div class="ind-bar-track">
                          <div class="ind-bar-fill" :style="{ width: `${hasScore ? indScores[i][j] : 0}%`, background: sGrad(indScores[i][j]) }"></div>
                        </div>
                        <span class="ind-score" :style="{ color: hasScore ? sColor(indScores[i][j]) : '#7b8ca6' }">
                          {{ hasScore ? indScores[i][j] : '--' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 模型说明浮层 -->
    <div v-if="showModelOverlay" class="model-overlay" @click.self="showModelOverlay = false">
      <div class="model-panel">
        <div class="model-panel-header">
          <h2 class="model-panel-title">TenX Model 八维评分体系</h2>
          <i class="el-icon-close model-panel-close" @click="showModelOverlay = false"></i>
        </div>
        <p class="model-panel-desc">8个维度、32个指标综合评估十倍股潜力。</p>
        <div class="model-grid">
          <div v-for="dim in DIMS" :key="dim.name" class="model-dim-item">
            <div class="model-dim-header">
              <i :class="dim.iconClass" class="model-dim-icon"></i>
              <span class="model-dim-name">{{ dim.name }}</span>
              <span class="model-dim-weight">{{ dim.weight }}%</span>
            </div>
            <div class="model-dim-inds">
              <span v-for="ind in dim.indicators" :key="ind.name" class="model-ind-tag">{{ ind.name }}</span>
            </div>
          </div>
        </div>
        <p class="model-panel-footer">评分基于历史数据，不构成投资建议。</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, reactive, onMounted, nextTick, watch } from 'vue'
import TheNavbar from '@/components/TheNavbar.vue'
import { tenbaggerStocks } from '@/mock/curatedStocks'
import { tenxApi, stockApi } from '@/services/api'

// 维度定义
const DIMS = [
  {
    name: '成长性', iconClass: 'el-icon-top', weight: 20, group: 'size',
    question: '能长多大？',
    indicators: [
      { name: '营收3年CAGR', key: 'rev_cagr' },
      { name: '净利润3年CAGR', key: 'profit_cagr' },
      { name: '扣非净利3年CAGR', key: 'deducted_cagr' },
      { name: '盈利质量提升(净利增速-营收增速)', key: 'profit_quality' }
    ]
  },
  {
    name: '盈利能力', iconClass: 'el-icon-coin', weight: 15, group: 'size',
    question: '赚钱效率？',
    indicators: [
      { name: 'ROE(3年均)', key: 'roe' },
      { name: 'ROIC(3年均)', key: 'roic' },
      { name: '毛利率(3年均)', key: 'gross_margin' },
      { name: '净利率(3年均)', key: 'net_margin' }
    ]
  },
  {
    name: '估值潜力', iconClass: 'el-icon-data-analysis', weight: 15, group: 'size',
    question: '贵不贵？',
    indicators: [
      { name: 'PEG', key: 'peg' },
      { name: 'PE分位数(5年)', key: 'pe_pct' },
      { name: 'PB分位数(5年)', key: 'pb_pct' },
      { name: '市值规模', key: 'market_cap' }
    ]
  },
  {
    name: '行业赛道', iconClass: 'el-icon-aim', weight: 12, group: 'size',
    question: '赛道宽不宽？',
    indicators: [
      { name: '行业景气指数', key: 'industry_boom' },
      { name: '行业渗透率/市场空间', key: 'industry_penetration' },
      { name: '政策支持评分', key: 'policy_score' },
      { name: '集中度提升空间', key: 'concentration' }
    ]
  },
  {
    name: '财务健康', iconClass: 'el-icon-first-aid-kit', weight: 12, group: 'duration',
    question: '资金链安全吗？',
    indicators: [
      { name: '流动比率/速动比率', key: 'liquidity_ratio' },
      { name: '利息保障倍数', key: 'interest_cover' },
      { name: '自由现金流(3年均)', key: 'fcf' },
      { name: '资产负债率(反)', key: 'debt_ratio' }
    ]
  },
  {
    name: '竞争壁垒', iconClass: 'el-icon-lock', weight: 12, group: 'duration',
    question: '护城河宽不宽？',
    indicators: [
      { name: '市占率', key: 'market_share' },
      { name: '毛利率稳定性(3年)', key: 'margin_stability' },
      { name: '研发投入占比(3年均)', key: 'rd_ratio' },
      { name: '无形资产占比(品牌/专利)', key: 'brand_patent' }
    ]
  },
  {
    name: '管理层治理', iconClass: 'el-icon-user', weight: 7, group: 'duration',
    question: '人靠不靠谱？',
    indicators: [
      { name: '大股东质押比(反)', key: 'pledge_ratio' },
      { name: '高管增减持净比', key: 'holder_trade_ratio' },
      { name: '管理层持股比例', key: 'mgmt_share_ratio' },
      { name: '分红率(3年均)', key: 'dividend_ratio' }
    ]
  },
  {
    name: '催化剂强度', iconClass: 'el-icon-sunny', weight: 7, group: 'duration',
    question: '什么时候爆发？',
    indicators: [
      { name: '业绩加速信号', key: 'earnings_accel' },
      { name: '订单/合同负债增速', key: 'contract_liab_growth' },
      { name: '分析师预期上修比例', key: 'analyst_upgrade_ratio' },
      { name: '事件催化密度评分', key: 'event_catalyst_score' }
    ]
  }
]

// 颜色工具（浅色主题）
function sColor(s) {
  if (s >= 70) return '#22c55e'
  if (s >= 50) return '#eab308'
  return '#ef4444'
}
function sGrad(s) {
  if (s >= 70) return 'linear-gradient(90deg,#16a34a,#22c55e)'
  if (s >= 50) return 'linear-gradient(90deg,#ca8a04,#eab308)'
  return 'linear-gradient(90deg,#dc2626,#ef4444)'
}
function getRating(s) {
  if (s >= 90) return { l: 'S', d: '十倍股种子', c: '#e6a23c', bg: 'rgba(230,162,60,0.1)' }
  if (s >= 80) return { l: 'A', d: '高潜力标的', c: '#67c23a', bg: 'rgba(103,194,58,0.1)' }
  if (s >= 70) return { l: 'B', d: '有亮点需催化', c: '#409eff', bg: 'rgba(64,158,255,0.1)' }
  if (s >= 60) return { l: 'C', d: '显著短板', c: '#e6a23c', bg: 'rgba(230,162,60,0.1)' }
  return { l: 'D', d: '不符合十倍股特征', c: '#f56c6c', bg: 'rgba(245,108,108,0.1)' }
}

// 伪随机评分生成
/** 将后端评分结果转换为前端格式 */
function transformScore(apiData) {
  const dimensions = apiData.indicators || apiData.dimensions || []
  const dimScores = apiData.dim_scores || dimensions.map(d => d.score)
  const indScores = dimensions.map(d => d.indicators.map(i => i.score))
  const indVals = dimensions.map(d => d.indicators.map(i => {
    const v = i.value
    // 0.0%、0.0、0等明显无意义的默认值显示为 --
    if (v === '0.0%' || v === '0.00%' || v === '0%' || v === '0.0' || v === '0' || v === '-') return '--'
    return v
  }))
  return {
    dimScores,
    indScores,
    indVals,
    totalScore: apiData.score || 0,
    label: apiData.label || '',
    expectedMultiple: apiData.expected_multiple || '',
    aiConclusion: apiData.ai_conclusion || '',
  }
}

export default {
  name: 'TenxScoreView',
  components: { TheNavbar },
  setup() {
    const searchQuery = ref('')
    const searchFocused = ref(false)
    const STORAGE_KEY = 'tenx_stocks'
    const SCORE_CACHE_KEY = 'tenx_score_cache'

    // 从 localStorage 恢复数据
    function loadPersisted() {
      try {
        const stocks = localStorage.getItem(STORAGE_KEY)
        if (stocks) myStocks.value = JSON.parse(stocks)
        const cache = localStorage.getItem(SCORE_CACHE_KEY)
        if (cache) Object.assign(scoreCache, JSON.parse(cache))
      } catch { /* 忽略 */ }
    }

    function persistData() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(myStocks.value))
        localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(scoreCache))
      } catch { /* 忽略 */ }
    }

    const myStocks = ref([])
    const curIdx = ref(-1)
    const scoreCache = reactive({})
    const scoreErrors = reactive({}) // 记录评分失败的股票
    const expandedDims = reactive(new Set())
    const allOpen = ref(false)
    const isScoring = ref(false)
    const isRefreshing = ref(false)
    const showModelOverlay = ref(false)
    const radarCanvas = ref(null)
    let radarChart = null

    // 全量股票（从模拟数据构建）
    const allStocks = tenbaggerStocks.map(s => ({
      code: s.code,
      name: s.name,
      sector: s.sector,
      latestPrice: (Math.random() * 200 + 20).toFixed(2),
      changeRate: (Math.random() * 10 - 5).toFixed(2)
    }))

    // 搜索结果（API返回）
    const searchResults = ref([])
    let searchTimer = null

    const filteredAllStocks = computed(() => {
      if (searchQuery.value.trim() && searchResults.value.length > 0) {
        return searchResults.value.slice(0, 8)
      }
      if (!searchQuery.value.trim()) return allStocks.slice(0, 8)
      return []
    })

    // 防抖搜索：调用后端API
    watch(searchQuery, (val) => {
      clearTimeout(searchTimer)
      if (!val.trim()) {
        searchResults.value = []
        return
      }
      searchTimer = setTimeout(async () => {
        try {
          const res = await stockApi.searchStocks(val.trim(), 20)
          if (res.code === 200 && res.data?.股票列表) {
            searchResults.value = res.data.股票列表.map(item => ({
              code: item.股票代码,
              name: item.股票简称,
              sector: item.市场代码 || '',
              latestPrice: (Math.random() * 200 + 20).toFixed(2),
              changeRate: (Math.random() * 10 - 5).toFixed(2)
            }))
          } else {
            searchResults.value = []
          }
        } catch {
          // API失败时回退到本地过滤
          const q = val.trim().toLowerCase()
          searchResults.value = allStocks.filter(s =>
            s.name.toLowerCase().includes(q) || s.code.includes(q)
          )
        }
      }, 300)
    })

    const currentStock = computed(() => {
      if (curIdx.value < 0 || curIdx.value >= myStocks.value.length) return {}
      return myStocks.value[curIdx.value]
    })

    const currentScore = computed(() => {
      const stock = currentStock.value
      if (!stock || !scoreCache[stock.code]) return null
      return scoreCache[stock.code]
    })

    const hasScore = computed(() => !!currentScore.value)
    const hasScoreError = computed(() => {
      const stock = currentStock.value
      return stock ? !!scoreErrors[stock.code] : false
    })

    const totalScore = computed(() => hasScore.value ? currentScore.value.totalScore : 0)
    const totalScoreColor = computed(() => hasScore.value ? getRating(totalScore.value).c : '#409eff')
    const ratingInfo = computed(() => hasScore.value ? getRating(totalScore.value) : { l: '-', d: '待评分', c: '#909399', bg: 'rgba(144,147,153,0.1)' })
    const ratingBadgeStyle = computed(() => ({
      background: ratingInfo.value.bg,
      color: ratingInfo.value.c
    }))

    const dimScores = computed(() => hasScore.value ? currentScore.value.dimScores : [0,0,0,0,0,0,0,0])
    const indScores = computed(() => hasScore.value ? currentScore.value.indScores : Array(8).fill([0,0,0,0]))
    const indVals = computed(() => hasScore.value ? currentScore.value.indVals : Array(8).fill(['--','--','--','--']))

    const aiConclusion = computed(() => {
      if (!hasScore.value) return ''
      // 优先使用后端AI结论
      if (currentScore.value?.aiConclusion) return currentScore.value.aiConclusion
      // 回退: 前端生成
      const ds = dimScores.value
      const strongest = DIMS[ds.indexOf(Math.max(...ds))]
      const weakest = DIMS[ds.indexOf(Math.min(...ds))]
      const sIdx = ds.indexOf(Math.max(...ds))
      const wIdx = ds.indexOf(Math.min(...ds))
      const sActive = DIMS[sIdx].indicators.filter((_, j) => indScores.value[sIdx][j] >= 60).map(i => i.name)
      const wWeak = DIMS[wIdx].indicators.filter((_, j) => indScores.value[wIdx][j] < 50).map(i => i.name)
      let text = `${currentStock.value.name}综合评分${totalScore.value.toFixed(1)}，评级${ratingInfo.value.l}。`
      text += `最强维度"${strongest.name}"由${sActive.join('、') || '多项指标'}支撑；`
      text += `"${weakest.name}"偏弱${wWeak.length ? '，需关注' + wWeak.join('、') + '能否补强' : '，各项指标均已激活'}。`
      if (totalScore.value >= 80) text += '整体具备十倍股核心特征，建议持续跟踪催化剂落地节奏。'
      else if (totalScore.value >= 60) text += '有亮点但存在短板，需等待关键催化因素验证。'
      else text += '当前与十倍股样本差距较大，建议关注基本面拐点信号。'
      return text
    })

    function onSearchBlur() {
      setTimeout(() => { searchFocused.value = false }, 200)
    }

    function addStock(stock) {
      if (myStocks.value.some(s => s.code === stock.code)) {
        curIdx.value = myStocks.value.findIndex(s => s.code === stock.code)
        return
      }
      myStocks.value.push({ ...stock })
      curIdx.value = myStocks.value.length - 1
      searchQuery.value = ''
      searchFocused.value = false
      persistData()
      // 自动评分
      autoScoreStock(stock)
    }

    async function autoScoreStock(stock) {
      if (scoreCache[stock.code]) return
      // 先尝试从D1缓存获取
      let sd = await fetchCachedScore(stock.code)
      if (!sd) {
        // 缓存无数据，调用refresh重新计算
        try {
          const res = await tenxApi.refreshScore(stock.code)
          if (res.code === 200 && res.data) {
            sd = transformScore(res.data)
          }
        } catch { /* 忽略 */ }
      }
      if (sd) {
        scoreCache[stock.code] = sd
        delete scoreErrors[stock.code]
      } else {
        scoreErrors[stock.code] = true
      }
      persistData()
      if (currentStock.value?.code === stock.code) {
        nextTick(() => updateRadar(dimScores.value))
      }
    }

    /** 页面加载时自动从后端D1缓存获取所有股票的评分（不触发重新计算） */
    async function autoRefreshAllScores() {
      if (myStocks.value.length === 0) return
      for (const stock of myStocks.value) {
        try {
          const sd = await fetchCachedScore(stock.code)
          if (sd) {
            scoreCache[stock.code] = sd
            delete scoreErrors[stock.code]
          }
        } catch { /* 忽略 */ }
      }
      persistData()
      nextTick(() => updateRadar(dimScores.value))
    }

    function removeStock(idx) {
      delete scoreCache[myStocks.value[idx].code]
      myStocks.value.splice(idx, 1)
      if (myStocks.value.length === 0) curIdx.value = -1
      else if (curIdx.value >= myStocks.value.length) curIdx.value = myStocks.value.length - 1
      else if (curIdx.value === idx) curIdx.value = Math.min(idx, myStocks.value.length - 1)
      else if (curIdx.value > idx) curIdx.value--
      persistData()
    }

    function selectStock(idx) {
      curIdx.value = idx
      expandedDims.clear()
      allOpen.value = false
    }

    function toggleDim(i) {
      if (expandedDims.has(i)) expandedDims.delete(i)
      else expandedDims.add(i)
    }

    function toggleAll() {
      allOpen.value = !allOpen.value
      DIMS.forEach((_, i) => {
        if (allOpen.value) expandedDims.add(i)
        else expandedDims.delete(i)
      })
    }

    function getScoreBadgeLabel(stock) {
      const sc = scoreCache[stock.code]
      if (sc) return getRating(sc.totalScore).l
      return scoreErrors[stock.code] ? '!' : '--'
    }

    function getScoreBadgeStyle(stock) {
      const sc = scoreCache[stock.code]
      if (sc) {
        const rt = getRating(sc.totalScore)
        return { background: rt.bg, color: rt.c }
      }
      return scoreErrors[stock.code]
        ? { background: 'rgba(245,108,108,0.1)', color: '#f56c6c' }
        : { background: '#f1f5f9', color: '#909399' }
    }

    function formatChg(stock) {
      if (!stock.changeRate) return '--'
      const val = parseFloat(stock.changeRate)
      const sign = val >= 0 ? '+' : ''
      return `${sign}${val.toFixed(2)}%`
    }

    async function refreshSingleScore() {
      const stock = currentStock.value
      if (!stock || isRefreshing.value) return
      isRefreshing.value = true
      try {
        const res = await tenxApi.refreshScore(stock.code)
        if (res.code === 200 && res.data) {
          const sd = transformScore(res.data)
          scoreCache[stock.code] = sd
          delete scoreErrors[stock.code]
        } else {
          scoreErrors[stock.code] = true
        }
      } catch {
        scoreErrors[stock.code] = true
      }
      isRefreshing.value = false
      persistData()
      nextTick(() => updateRadar(dimScores.value))
    }

    async function startScoring() {
      if (isScoring.value || myStocks.value.length === 0) return
      isScoring.value = true

      const curStock = myStocks.value[curIdx.value]
      if (!curStock) { isScoring.value = false; return }

      // 评分当前股票（带动画）— 调用refresh接口重新计算
      try {
        const res = await tenxApi.refreshScore(curStock.code)
        if (res.code === 200 && res.data) {
          const sd = transformScore(res.data)
          scoreCache[curStock.code] = sd
          delete scoreErrors[curStock.code]
          let loaded = 0
          function stepDim() {
            if (loaded >= 8) {
              updateRadar(sd.dimScores)
              // 当前股票动画完成后，继续评分其余股票
              scoreRemaining()
              return
            }
            loaded++
            const partial = sd.dimScores.slice().map((s, i) => i < loaded ? s : 0)
            updateRadar(partial)
            setTimeout(stepDim, 160 + Math.random() * 100)
          }
          await nextTick()
          updateRadar([0,0,0,0,0,0,0,0])
          setTimeout(stepDim, 300)
        } else {
          scoreErrors[curStock.code] = true
          isScoring.value = false
        }
      } catch {
        scoreErrors[curStock.code] = true
        // 仍然继续评分其余股票
        scoreRemaining()
      }
    }

    /** 串行评分剩余股票，每只间隔2秒避免Tushare频率超限 */
    async function scoreRemaining() {
      const curStock = myStocks.value[curIdx.value]
      for (let i = 0; i < myStocks.value.length; i++) {
        const s = myStocks.value[i]
        if (s.code === curStock?.code) continue
        try {
          const res = await tenxApi.refreshScore(s.code)
          if (res.code === 200 && res.data) {
            scoreCache[s.code] = transformScore(res.data)
            delete scoreErrors[s.code]
          } else {
            scoreErrors[s.code] = true
          }
        } catch {
          scoreErrors[s.code] = true
        }
        // 非最后一只，等待2秒
        if (i < myStocks.value.length - 1) {
          await new Promise(r => setTimeout(r, 2000))
        }
      }
      isScoring.value = false
      persistData()
    }

    /** 从后端D1缓存获取评分（不触发重新计算） */
    async function fetchCachedScore(code) {
      try {
        const res = await tenxApi.getScore(code)
        if (res.code === 200 && res.data) {
          return transformScore(res.data)
        }
      } catch { /* 忽略 */ }
      return null
    }

    function updateRadar(data) {
      if (!radarCanvas.value) return
      const ctx = radarCanvas.value.getContext('2d')
      if (radarChart) {
        radarChart.data.datasets[0].data = data
        radarChart.update('none')
        return
      }
      // Simple radar drawing
      const Chart = window.Chart
      if (!Chart) return
      radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: DIMS.map(d => d.name),
          datasets: [{
            data, fill: true,
            backgroundColor: 'rgba(64,158,255,0.08)',
            borderColor: 'rgba(64,158,255,0.6)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(64,158,255,0.9)',
            pointBorderColor: 'rgba(64,158,255,1)',
            pointRadius: 3.5,
            pointHoverRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              min: 0, max: 100,
              ticks: { stepSize: 25, color: 'rgba(144,147,153,0.4)', backdropColor: 'transparent', font: { size: 9 } },
              grid: { color: 'rgba(220,223,230,0.6)' },
              angleLines: { color: 'rgba(220,223,230,0.5)' },
              pointLabels: { color: '#606266', font: { size: 10, weight: '500' } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#fff', borderColor: '#dcdfe6', borderWidth: 1,
              titleColor: '#303133', bodyColor: '#606266', padding: 8, cornerRadius: 6,
              callbacks: { label: c => `${c.label}: ${c.raw}分` }
            }
          },
          animation: { duration: 800, easing: 'easeOutQuart' }
        }
      })
    }

    // 加载 Chart.js
    onMounted(() => {
      if (!window.Chart) {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
        script.onload = () => { if (hasScore.value) updateRadar(dimScores.value) }
        document.head.appendChild(script)
      }
      // 恢复持久化数据
      loadPersisted()
      if (myStocks.value.length === 0) {
        // 首次访问：默认添加几只十倍潜力股
        tenbaggerStocks.slice(0, 5).forEach(s => {
          myStocks.value.push({
            code: s.code,
            name: s.name,
            sector: s.sector,
            latestPrice: (Math.random() * 200 + 20).toFixed(2),
            changeRate: (Math.random() * 10 - 5).toFixed(2)
          })
        })
      }
      curIdx.value = 0
      // 自动从后端获取所有股票的最新评分数据
      autoRefreshAllScores()
    })

    watch(dimScores, (v) => {
      if (hasScore.value) nextTick(() => updateRadar(v))
    }, { deep: true })

    return {
      DIMS,
      searchQuery, searchFocused, myStocks, curIdx,
      filteredAllStocks, currentStock, currentScore, hasScore, hasScoreError,
      totalScore, totalScoreColor, ratingInfo, ratingBadgeStyle,
      dimScores, indScores, indVals, aiConclusion,
      expandedDims, allOpen, isScoring, isRefreshing, showModelOverlay,
      radarCanvas,
      onSearchBlur, addStock, removeStock, selectStock,
      toggleDim, toggleAll, startScoring, refreshSingleScore,
      getScoreBadgeLabel, getScoreBadgeStyle, formatChg,
      sColor, sGrad
    }
  }
}
</script>

<style lang="scss" scoped>
.tenx-page {
  min-height: 100vh;
  background: #f5f7fa;
  color: #303133;
}

.tenx-layout {
  display: flex;
  height: calc(100vh - 60px);
  margin-top: 60px;
  overflow: hidden;
}

/* ===== 左侧边栏 ===== */
.tenx-sidebar {
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  z-index: 10;
}
.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.sidebar-brand-icon {
  width: 28px; height: 28px; border-radius: 6px;
  background: #409eff; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.sidebar-brand-text { font-size: 15px; font-weight: 600; color: #303133; }
.sidebar-brand-sub { font-size: 10px; color: #909399; }

.add-search-wrap { position: relative; }
.add-search-input {
  width: 100%; padding: 8px 12px 8px 32px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px; color: #303133;
  font-size: 13px; font-family: inherit;
  transition: border-color 0.2s;
  &::placeholder { color: #c0c4cc; }
  &:focus { outline: none; border-color: #409eff; box-shadow: 0 0 0 2px rgba(64,158,255,0.1); }
}
.add-search-icon {
  position: absolute; left: 10px; top: 50%;
  transform: translateY(-50%);
  color: #909399; font-size: 12px;
}
.add-search-dropdown {
  position: absolute; top: calc(100% + 4px);
  left: 0; right: 0;
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 8px; max-height: 200px;
  overflow-y: auto; z-index: 60;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.add-search-item {
  padding: 9px 12px; cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f2f3f5;
  display: flex; align-items: center; gap: 8px;
  &:hover { background: #ecf5ff; }
  &:last-child { border-bottom: none; }
  .asi-name { font-size: 13px; font-weight: 500; color: #303133; }
  .asi-code { font-size: 11px; color: #909399; }
  .asi-add { margin-left: auto; font-size: 10px; color: #409eff; opacity: 0; transition: opacity 0.15s; }
  &:hover .asi-add { opacity: 1; }
}

.sidebar-list {
  flex: 1; overflow-y: auto; padding: 8px;
}
.sidebar-list-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 8px 10px; font-size: 11px; color: #909399;
}
.model-info-btn {
  background: none; border: none; color: #909399; cursor: pointer;
  font-size: 11px; font-family: inherit;
  &:hover { color: #409eff; }
}
.sidebar-list-items { padding: 0; }
.sidebar-empty {
  text-align: center; padding: 32px 12px; color: #c0c4cc; font-size: 12px;
  i { font-size: 20px; display: block; margin-bottom: 8px; }
}

.stock-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 8px;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid transparent; margin-bottom: 2px;
  &:hover { background: #f5f7fa; }
  &.active { background: #ecf5ff; border-color: #b3d8ff; }
}
.stock-item-score {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  background: #f1f5f9; color: #909399;
  transition: all 0.3s; flex-shrink: 0;
}
.stock-item-info { flex: 1; min-width: 0; }
.stock-item-name {
  font-size: 13px; font-weight: 500; color: #303133;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.stock-item-meta {
  font-size: 11px; color: #909399;
  display: flex; align-items: center; gap: 6px; margin-top: 1px;
}
.stock-item-remove {
  opacity: 0; font-size: 11px; color: #f56c6c;
  cursor: pointer; transition: opacity 0.15s; padding: 4px;
}
.stock-item:hover .stock-item-remove { opacity: 0.5; }
.stock-item-remove:hover { opacity: 1 !important; }

.sidebar-footer {
  padding: 12px 16px; border-top: 1px solid #e4e7ed;
}
.score-all-btn {
  width: 100%; padding: 10px;
  background: linear-gradient(135deg, #409eff 0%, #337ecc 100%);
  color: #fff; font-weight: 600; font-size: 13px;
  border: none; border-radius: 8px; cursor: pointer;
  transition: all 0.25s; font-family: inherit;
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(64,158,255,0.3); }
  &:active { transform: scale(0.98); }
  &.loading { pointer-events: none; opacity: 0.8; }
}
.score-all-sub { font-size: 10px; font-weight: 400; opacity: 0.8; display: block; margin-top: 2px; }

/* ===== 主内容区 ===== */
.tenx-main {
  flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;
  background: #f5f7fa;
}
.main-inner {
  position: relative; z-index: 1;
  max-width: 960px; margin: 0 auto;
  padding: 24px 32px 48px;
}

.empty-state {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 80px 20px; text-align: center; height: 100%;
}
.empty-state-icon { font-size: 36px; color: #c0c4cc; margin-bottom: 16px; }
.empty-state-text { font-size: 14px; color: #909399; }
.empty-state-sub { font-size: 12px; color: #c0c4cc; margin-top: 6px; }

/* 股票信息栏 */
.stock-header {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.stock-header-name { font-size: 22px; font-weight: 700; color: #303133; }
.stock-header-sub {
  display: flex; align-items: center; gap: 8px; margin-top: 2px;
}
.stock-header-code { font-size: 13px; color: #909399; }
.stock-header-ind {
  font-size: 11px; padding: 2px 8px; border-radius: 4px;
  background: #ecf5ff; color: #409eff;
}
.stock-header-right { margin-left: auto; text-align: right; display: flex; align-items: center; gap: 12px; }
.refresh-single-btn {
  padding: 5px 12px; border-radius: 6px; border: 1px solid #dcdfe6;
  background: #fff; color: #606266; font-size: 12px; cursor: pointer;
  transition: all 0.2s; white-space: nowrap;
}
.refresh-single-btn:hover:not(:disabled) { border-color: #409eff; color: #409eff; }
.refresh-single-btn:disabled { cursor: not-allowed; opacity: 0.6; }
.refresh-single-btn.loading { color: #409eff; border-color: #409eff; }
.stock-header-price { font-size: 22px; font-weight: 700; color: #303133; }
.stock-header-chg { font-size: 13px; font-weight: 500; }
.stock-header-chg.is-up { color: #f56c6c; }
.stock-header-chg.is-down { color: #67c23a; }

/* 评分环 + 雷达 */
.score-radar-row {
  display: flex; gap: 20px; margin-bottom: 24px; align-items: stretch;
}
.score-ring-card {
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 12px; padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  width: 220px; min-width: 220px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.score-ring-wrap {
  position: relative; width: 150px; height: 150px; margin-bottom: 8px;
}
.score-ring-fill { transition: stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1); }
.score-ring-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
.score-ring-value { font-size: 32px; font-weight: 700; }
.score-ring-label { font-size: 11px; color: #909399; margin-top: 2px; }
.rating-row { display: flex; align-items: center; gap: 8px; }
.rating-badge {
  width: 30px; height: 30px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 15px;
}
.rating-desc { font-size: 12px; color: #909399; }

.ai-conclusion-block {
  width: 100%;
  margin-top: 14px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}
.ai-conclusion-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #409eff;
  i { font-size: 13px; }
}
.ai-conclusion-text {
  font-size: 11px;
  color: #606266;
  line-height: 1.7;
  margin: 0;
}

.radar-card {
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 12px; padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
}
.radar-card-title { font-size: 12px; font-weight: 500; color: #909399; margin-bottom: 8px; }
.radar-canvas-wrap {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 200px;
}

/* 维度详情 */
.dim-section-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.dim-section-left { display: flex; align-items: center; gap: 16px; }
.dim-section-title { font-size: 13px; font-weight: 600; color: #606266; }
.dim-group-labels { display: flex; gap: 16px; }
.dim-group-label { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: #c0c4cc; }
.dim-expand-btn {
  font-size: 11px; padding: 4px 10px; border-radius: 6px;
  border: 1px solid #dcdfe6; background: #fff;
  color: #606266; cursor: pointer; font-family: inherit;
  transition: border-color 0.2s;
  &:hover { border-color: #409eff; color: #409eff; }
}

.dim-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.dim-card {
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 10px; transition: all 0.25s; cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: #c0c4cc; }
  &.expanded { border-color: #409eff; box-shadow: 0 4px 12px rgba(64,158,255,0.08); }
}
.dim-head { padding: 12px 14px; }
.dim-head-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.dim-head-left { display: flex; align-items: center; gap: 6px; }
.dim-icon { width: 14px; text-align: center; font-size: 11px; }
.dim-name { font-size: 13px; font-weight: 500; color: #303133; }
.dim-weight { font-size: 10px; color: #c0c4cc; margin-left: 4px; }
.dim-question { font-size: 9px; color: #409eff; opacity: 0.7; }
.dim-head-right { display: flex; align-items: center; gap: 8px; }
.dim-score { font-size: 17px; font-weight: 700; }
.dim-chevron { font-size: 10px; color: #c0c4cc; transition: transform 0.3s; }
.dim-chevron.open { transform: rotate(180deg); }

.bar-track { background: #f2f3f5; border-radius: 3px; height: 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }

.dim-details { max-height: 0; overflow: hidden; transition: max-height 0.35s ease; }
.dim-details.open { max-height: 280px; }
.dim-details-inner {
  padding: 0 14px 12px; border-top: 1px solid #f2f3f5; margin-top: 0;
}
.ind-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 0; border-bottom: 1px solid #fafafa;
  &:last-child { border-bottom: none; }
}
.ind-name { font-size: 11px; color: #909399; }
.ind-right { display: flex; align-items: center; gap: 8px; }
.ind-value { font-size: 11px; color: #606266; }
.ind-bar-track { width: 40px; height: 3px; border-radius: 2px; background: #f2f3f5; overflow: hidden; }
.ind-bar-fill { height: 100%; border-radius: 2px; transition: width 0.7s cubic-bezier(0.4,0,0.2,1); }
.ind-score { font-size: 11px; font-weight: 700; width: 20px; text-align: right; }

.dim-group-divider {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 8px; padding: 4px 0 2px;
}
.dim-group-divider-label { font-size: 10px; color: #c0c4cc; letter-spacing: 0.05em; white-space: nowrap; }
.dim-group-divider-line { flex: 1; height: 1px; background: #e4e7ed; }

/* 模型说明浮层 */
.model-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 100; display: grid; place-items: center;
}
.model-panel {
  background: #fff; border: 1px solid #e4e7ed;
  border-radius: 14px; max-width: 660px; width: 90%;
  max-height: 80vh; overflow-y: auto; padding: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.12);
}
.model-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.model-panel-title { font-size: 16px; font-weight: 700; color: #409eff; }
.model-panel-close { font-size: 18px; color: #909399; cursor: pointer; &:hover { color: #303133; } }
.model-panel-desc { font-size: 12px; color: #909399; margin-bottom: 12px; }
.model-grid { display: flex; flex-direction: column; gap: 8px; }
.model-dim-item {
  padding: 10px 12px; background: #f5f7fa; border-radius: 8px;
}
.model-dim-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.model-dim-icon { color: #409eff; font-size: 12px; }
.model-dim-name { font-size: 13px; font-weight: 500; color: #303133; }
.model-dim-weight { font-size: 10px; color: #c0c4cc; margin-left: auto; }
.model-dim-inds { display: flex; flex-wrap: wrap; gap: 4px; }
.model-ind-tag {
  font-size: 10px; padding: 2px 8px; border-radius: 3px;
  background: #e4e7ed; color: #606266;
}
.model-panel-footer { font-size: 12px; color: #c0c4cc; margin-top: 16px; }

/* 动画 */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.anim-in { animation: fadeUp 0.4s ease forwards; opacity: 0; }

/* 滚动条 */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #dcdfe6; border-radius: 2px; }

/* 响应式 */
@media (max-width: 860px) {
  .tenx-sidebar { width: 240px; min-width: 240px; }
  .score-radar-row { flex-direction: column; }
  .score-ring-card { width: 100%; min-width: 0; }
  .dim-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .tenx-sidebar {
    position: fixed; left: -280px; top: 60px; bottom: 0;
    z-index: 50; transition: left 0.3s ease;
  }
  .tenx-sidebar.mobile-open { left: 0; }
  .main-inner { padding: 16px; }
}
</style>
