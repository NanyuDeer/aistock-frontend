<template>
  <div class="potential-page">
    <section class="page-header">
      <div>
        <h1>风口潜力股推送追踪</h1>
        <p>记录每日推送股票，并追踪从推送日至今的收益表现</p>
      </div>
      <el-button type="primary" :loading="loading || realtimeLoading" @click="loadData">刷新</el-button>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">推送股票</span>
        <strong>{{ summary.total || 0 }}</strong>
        <small>当前筛选范围</small>
      </div>
      <div class="summary-card">
        <span class="summary-label">上涨股票</span>
        <strong>{{ summary.winners || 0 }}</strong>
        <small>胜率 {{ formatPercent(summary.win_rate) }}</small>
      </div>
      <div class="summary-card">
        <span class="summary-label">平均收益</span>
        <strong :class="returnClass(summary.average_return_pct)">
          {{ formatPercent(summary.average_return_pct) }}
        </strong>
        <small>{{ realtimeUpdatedAt ? `实时 ${realtimeUpdatedAt}` : '盘中参考' }}</small>
      </div>
      <div class="summary-card">
        <span class="summary-label">最高收益</span>
        <strong :class="returnClass(summary.best ? displayReturn(summary.best) : null)">
          {{ summary.best ? formatPercent(displayReturn(summary.best)) : '--' }}
        </strong>
        <small>{{ summary.best?.stock_name || '暂无数据' }}</small>
      </div>
    </section>

    <section class="content-panel">
      <div class="panel-toolbar">
        <div class="filters">
          <el-date-picker
            v-model="filters.date"
            value-format="YYYY-MM-DD"
            type="date"
            placeholder="推送日期"
            clearable
            @change="loadData"
          />
          <el-input
            v-model="filters.keyword"
            placeholder="股票 / 题材"
            clearable
            @keyup.enter="loadData"
            @clear="loadData"
          />
          <el-button @click="loadData">查询</el-button>
        </div>
      </div>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="推送历史" name="history">
          <el-table
            v-loading="loading"
            :data="sortedRecords"
            class="history-table"
            empty-text="暂无推送记录"
          >
            <el-table-column prop="push_date" width="102">
              <template #header>
                <div class="sort-header">
                  <span>推送日期</span>
                  <button
                    :class="['sort-btn', sortField === 'date' ? (sortOrder === 'desc' ? 'desc' : 'asc') : '']"
                    @click="sortByField('date')"
                    :title="sortField === 'date' ? (sortOrder === 'desc' ? '切换为升序' : '切换为降序') : '按推送日期排序'"
                  />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="股票" width="128">
              <template #default="{ row }">
                <div class="stock-cell">
                  <strong>{{ row.stock_name }}</strong>
                  <span>{{ row.stock_code }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="风口/题材" prop="theme" width="112">
              <template #default="{ row }">
                <el-tag type="primary">{{ row.theme }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column width="82">
              <template #header>
                <div class="sort-header">
                  <span>推荐分</span>
                  <button
                    :class="['sort-btn', sortField === 'score' ? (sortOrder === 'desc' ? 'desc' : 'asc') : '']"
                    @click="sortByField('score')"
                    :title="sortField === 'score' ? (sortOrder === 'desc' ? '切换为升序' : '切换为降序') : '按推荐分排序'"
                  />
                </div>
              </template>
              <template #default="{ row }">{{ formatScore(row.score) }}</template>
            </el-table-column>
            <el-table-column label="链路" width="72">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ chainPositionLabel(row.chain_position) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="推荐理由" prop="reason" min-width="210" show-overflow-tooltip />
            <el-table-column label="推送价" width="84">
              <template #default="{ row }">{{ formatPrice(row.push_price) }}</template>
            </el-table-column>
            <el-table-column label="实时价" width="84">
              <template #default="{ row }">{{ formatPrice(displayPrice(row)) }}</template>
            </el-table-column>
            <el-table-column width="98">
              <template #header>
                <div class="sort-header">
                  <span>收益率</span>
                  <button
                    :class="['sort-btn', sortField === 'return' ? (sortOrder === 'desc' ? 'desc' : 'asc') : '']"
                    @click="sortByField('return')"
                    :title="sortField === 'return' ? (sortOrder === 'desc' ? '切换为升序' : '切换为降序') : '按收益率排序'"
                  />
                </div>
              </template>
              <template #default="{ row }">
                <span class="return-value" :class="returnClass(displayReturn(row))">
                  {{ formatPercent(displayReturn(row)) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="行情时间" width="132">
              <template #default="{ row }">{{ row.realtime_time || row.latest_trade_date || '--' }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="收益榜单" name="ranking">
          <div class="ranking-grid">
            <div class="ranking-card">
              <h2>累计涨幅榜</h2>
              <ol>
                <li v-for="item in realtimeRanking.top_gainers" :key="`gain-${item.push_id}`">
                  <span>{{ item.stock_name }}</span>
                  <em :class="returnClass(displayReturn(item))">{{ formatPercent(displayReturn(item)) }}</em>
                </li>
              </ol>
            </div>
            <div class="ranking-card">
              <h2>累计跌幅榜</h2>
              <ol>
                <li v-for="item in realtimeRanking.top_losers" :key="`loss-${item.push_id}`">
                  <span>{{ item.stock_name }}</span>
                  <em :class="returnClass(displayReturn(item))">{{ formatPercent(displayReturn(item)) }}</em>
                </li>
              </ol>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>

<script>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { stockApi } from '@/services/api'

export default {
  name: 'PotentialStockPushHistoryView',
  setup() {
    const loading = ref(false)
    const realtimeLoading = ref(false)
    const realtimeUpdatedAt = ref('')
    const activeTab = ref('history')
    const records = ref([])
    const ranking = ref({
      top_gainers: [],
      top_losers: [],
      summary: {}
    })
    const filters = reactive({
      date: '',
      keyword: ''
    })
    const sortField = ref('return')
    const sortOrder = ref('desc')
    let realtimeTimer = null

    const toggleSortOrder = () => {
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
    }

    const sortByField = (field) => {
      if (sortField.value === field) {
        toggleSortOrder()
      } else {
        sortField.value = field
        sortOrder.value = 'desc'
      }
    }

    const toFiniteNumber = (value) => {
      if (value === null || value === undefined || value === '') return null
      const num = Number(value)
      return Number.isFinite(num) ? num : null
    }

    const hasHistoricalPrice = (row) => {
      const pushPrice = toFiniteNumber(row?.push_price)
      const latestPrice = toFiniteNumber(row?.latest_price)
      if (latestPrice === null) return false
      if (row?.latest_trade_date && row?.push_date && row.latest_trade_date !== row.push_date) return true
      return pushPrice !== null && latestPrice !== pushPrice
    }

    const displayPrice = (row) => {
      if (row?.realtime_price !== undefined && row?.realtime_price !== null) return row.realtime_price
      return hasHistoricalPrice(row) ? row?.latest_price : null
    }

    const displayReturn = (row) => {
      const calculated = calculateReturn(row?.push_price, displayPrice(row))
      if (calculated !== null) return calculated
      if (row?.realtime_return_pct !== undefined && row?.realtime_return_pct !== null) return row.realtime_return_pct
      return hasHistoricalPrice(row) ? row?.return_pct : null
    }

    const buildSummary = (items) => {
      const total = items.length
      const itemsWithReturn = items.filter(item => toFiniteNumber(displayReturn(item)) !== null)
      const winners = itemsWithReturn.filter(item => displayReturn(item) > 0).length
      const average = itemsWithReturn.length
        ? itemsWithReturn.reduce((sum, item) => sum + displayReturn(item), 0) / itemsWithReturn.length
        : 0
      const sorted = itemsWithReturn.slice().sort((a, b) => displayReturn(b) - displayReturn(a))
      return {
        total,
        winners,
        win_rate: itemsWithReturn.length ? Number(((winners / itemsWithReturn.length) * 100).toFixed(2)) : 0,
        average_return_pct: Number(average.toFixed(2)),
        best: sorted[0] || null,
        worst: sorted.slice().reverse()[0] || null
      }
    }

    const summary = computed(() => buildSummary(records.value))

    const sortedRecords = computed(() => {
      return records.value.slice().sort((a, b) => {
        let result = 0
        const order = sortOrder.value === 'desc' ? 1 : -1

        switch (sortField.value) {
          case 'return':
            {
              const aReturn = toFiniteNumber(displayReturn(a))
              const bReturn = toFiniteNumber(displayReturn(b))
              if (aReturn === null && bReturn === null) return 0
              if (aReturn === null) return order
              if (bReturn === null) return -order
              result = bReturn - aReturn
            }
            break
          case 'date':
            {
              const aDate = new Date(a.push_date).getTime()
              const bDate = new Date(b.push_date).getTime()
              result = bDate - aDate
            }
            break
          case 'score':
            {
              const aScore = toFiniteNumber(a.score)
              const bScore = toFiniteNumber(b.score)
              if (aScore === null && bScore === null) return 0
              if (aScore === null) return order
              if (bScore === null) return -order
              result = bScore - aScore
            }
            break
          default:
            break
        }

        return result * order
      })
    })

    const realtimeRanking = computed(() => {
      const itemsWithReturn = sortedRecords.value.filter(item => toFiniteNumber(displayReturn(item)) !== null)
      return {
        top_gainers: itemsWithReturn.slice(0, 10),
        top_losers: itemsWithReturn.slice().sort((a, b) => displayReturn(a) - displayReturn(b)).slice(0, 10)
      }
    })

    const calculateReturn = (pushPrice, currentPrice) => {
      const base = toFiniteNumber(pushPrice)
      const current = toFiniteNumber(currentPrice)
      if (!base || base <= 0 || current === null) return null
      return Number((((current - base) / base) * 100).toFixed(2))
    }

    const chunk = (items, size) => {
      const groups = []
      for (let i = 0; i < items.length; i += size) {
        groups.push(items.slice(i, i + size))
      }
      return groups
    }

    const mergeRealtimeQuotes = (quoteMap, nowText) => {
      records.value = records.value.map(item => {
        const quote = quoteMap[item.stock_code]
        if (!quote || quote.price === null) return item
        return {
          ...item,
          realtime_price: quote.price,
          realtime_change_pct: quote.change_pct,
          realtime_time: quote.time || nowText,
          realtime_return_pct: calculateReturn(item.push_price, quote.price)
        }
      })
    }

    const refreshRealtimeQuotes = async () => {
      const symbols = [...new Set(records.value.map(item => item.stock_code).filter(Boolean))]
      if (!symbols.length) return
      if (realtimeLoading.value) return

      realtimeLoading.value = true
      const nowText = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      try {
        const groups = chunk(symbols, 4)
        await Promise.allSettled(groups.map(group =>
          stockApi.getStockRealtimeQuotes(group.join(',')).then(response => {
            if (response?.code !== 200) return
            const quoteMap = {}
            const quotes = response?.data?.行情 || []
            quotes.forEach(quote => {
              const code = quote?.股票代码
              if (!code || quote?.错误) return
              quoteMap[code] = {
                price: toFiniteNumber(quote?.最新价),
                change_pct: toFiniteNumber(quote?.涨跌幅),
                time: quote?.更新时间 || ''
              }
            })
            mergeRealtimeQuotes(quoteMap, nowText)
          })
        ))

        realtimeUpdatedAt.value = nowText
      } catch (error) {
        console.warn('[PotentialStockPushHistory] realtime quote refresh failed', error)
      } finally {
        realtimeLoading.value = false
      }
    }

    const loadData = async () => {
      loading.value = true
      let shouldRefreshRealtime = false
      try {
        const params = {
          date: filters.date,
          keyword: filters.keyword
        }
        const [historyResp, rankingResp] = await Promise.all([
          stockApi.getPotentialPushHistory(params),
          stockApi.getPotentialPushRanking({ date: filters.date })
        ])

        records.value = historyResp?.data?.items || []
        ranking.value = rankingResp?.data || { top_gainers: [], top_losers: [], summary: {} }
        shouldRefreshRealtime = true
      } catch (error) {
        ElMessage.error(error?.message || '加载风口潜力股推送记录失败')
      } finally {
        loading.value = false
      }
      if (shouldRefreshRealtime) {
        refreshRealtimeQuotes()
      }
    }

    const formatPrice = (value) => {
      const num = toFiniteNumber(value)
      return Number.isFinite(num) ? num.toFixed(2) : '--'
    }

    const formatPercent = (value) => {
      const num = toFiniteNumber(value)
      if (!Number.isFinite(num)) return '--'
      return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
    }

    const formatScore = (value) => {
      const num = toFiniteNumber(value)
      return Number.isFinite(num) ? num.toFixed(1) : '--'
    }

    const chainPositionLabel = (value) => {
      const labels = {
        core: '核心',
        upstream: '上游',
        downstream: '下游'
      }
      return labels[value] || value || '--'
    }

    const returnClass = (value) => {
      const num = Number(value)
      if (num > 0) return 'is-up'
      if (num < 0) return 'is-down'
      return ''
    }

    onMounted(() => {
      loadData()
      realtimeTimer = setInterval(refreshRealtimeQuotes, 30000)
    })

    onUnmounted(() => {
      if (realtimeTimer) {
        clearInterval(realtimeTimer)
        realtimeTimer = null
      }
    })

    return {
      activeTab,
      filters,
      sortField,
      sortOrder,
      loading,
      realtimeLoading,
      realtimeUpdatedAt,
      records,
      sortedRecords,
      ranking,
      realtimeRanking,
      summary,
      loadData,
      toggleSortOrder,
      sortByField,
      displayPrice,
      displayReturn,
      formatPrice,
      formatPercent,
      formatScore,
      chainPositionLabel,
      returnClass
    }
  }
}
</script>

<style scoped>
.potential-page {
  min-height: 100vh;
  padding: 120px 56px 48px;
  background: #f5f7fb;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.page-header p {
  margin: 0;
  color: #6b7280;
  font-size: 15px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.summary-card,
.content-panel,
.ranking-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.summary-card {
  padding: 18px;
}

.summary-label {
  display: block;
  color: #6b7280;
  font-size: 13px;
  margin-bottom: 8px;
}

.summary-card strong {
  display: block;
  color: #111827;
  font-size: 26px;
  line-height: 1.2;
}

.summary-card strong.is-up {
  color: #ef4444;
}

.summary-card strong.is-down {
  color: #16a34a;
}

.summary-card small {
  display: block;
  margin-top: 8px;
  color: #9ca3af;
}

.content-panel {
  padding: 16px 18px 22px;
}

.history-table {
  width: 100%;
}

.history-table :deep(.el-table__cell) {
  padding: 10px 0;
}

.history-table :deep(.cell) {
  padding: 0 8px;
  line-height: 1.35;
}

.history-table :deep(.el-tag) {
  max-width: 100%;
}

.history-table :deep(.el-tag__content) {
  display: inline-block;
  max-width: 82px;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

.panel-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filters :deep(.el-input) {
  width: 180px;
}

.sort-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-btn {
  position: relative;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  width: 16px;
  height: 9px;
}

.sort-btn::before,
.sort-btn::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 3px solid transparent;
  border-right: 3px solid transparent;
}

.sort-btn::before {
  top: 0;
  border-bottom: 4px solid #9ca3af;
}

.sort-btn::after {
  bottom: 0;
  border-top: 4px solid #9ca3af;
}

.sort-btn:hover::before,
.sort-btn:hover::after {
  border-bottom-color: #3b82f6;
  border-top-color: #3b82f6;
}

.sort-btn.asc::before {
  border-bottom-color: #3b82f6;
}

.sort-btn.asc::after {
  border-top-color: #9ca3af;
}

.sort-btn.desc::before {
  border-bottom-color: #9ca3af;
}

.sort-btn.desc::after {
  border-top-color: #3b82f6;
}

.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stock-cell strong {
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stock-cell span {
  color: #6b7280;
  font-size: 13px;
}

.return-value,
.ranking-card em {
  font-weight: 700;
  font-style: normal;
}

.is-up {
  color: #ef4444;
}

.is-down {
  color: #16a34a;
}

.ranking-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.ranking-card {
  padding: 18px;
}

.ranking-card h2 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #1f2937;
}

.ranking-card ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ranking-card li {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eef2f7;
}

.ranking-card li:last-child {
  border-bottom: 0;
}

@media (max-width: 900px) {
  .potential-page {
    padding: 96px 16px 32px;
  }

  .page-header,
  .filters {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid,
  .ranking-grid {
    grid-template-columns: 1fr;
  }

  .panel-toolbar {
    justify-content: stretch;
  }

  .filters :deep(.el-input),
  .filters :deep(.el-date-editor) {
    width: 100%;
  }
}
</style>
