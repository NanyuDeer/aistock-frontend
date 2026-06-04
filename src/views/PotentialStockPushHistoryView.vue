<template>
  <div class="potential-page">
    <section class="page-header">
      <div>
        <h1>风口潜力股推送追踪</h1>
        <p>记录每日推送股票，并追踪从推送日至今的收益表现</p>
      </div>
      <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
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
        <small>推送日至今</small>
      </div>
      <div class="summary-card">
        <span class="summary-label">最高收益</span>
        <strong :class="returnClass(summary.best?.return_pct)">
          {{ summary.best ? formatPercent(summary.best.return_pct) : '--' }}
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
            :data="records"
            class="history-table"
            empty-text="暂无推送记录"
          >
            <el-table-column label="推送日期" prop="push_date" width="120" />
            <el-table-column label="股票" min-width="170">
              <template #default="{ row }">
                <div class="stock-cell">
                  <strong>{{ row.stock_name }}</strong>
                  <span>{{ row.stock_code }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="风口/题材" prop="theme" width="140">
              <template #default="{ row }">
                <el-tag type="primary">{{ row.theme }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="推荐理由" prop="reason" min-width="260" show-overflow-tooltip />
            <el-table-column label="推送价" width="100">
              <template #default="{ row }">{{ formatPrice(row.push_price) }}</template>
            </el-table-column>
            <el-table-column label="当前价" width="100">
              <template #default="{ row }">{{ formatPrice(row.latest_price) }}</template>
            </el-table-column>
            <el-table-column label="累计收益" width="120">
              <template #default="{ row }">
                <span class="return-value" :class="returnClass(row.return_pct)">
                  {{ formatPercent(row.return_pct) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="更新日期" prop="latest_trade_date" width="120" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="收益榜单" name="ranking">
          <div class="ranking-grid">
            <div class="ranking-card">
              <h2>累计涨幅榜</h2>
              <ol>
                <li v-for="item in ranking.top_gainers" :key="`gain-${item.push_id}`">
                  <span>{{ item.stock_name }}</span>
                  <em :class="returnClass(item.return_pct)">{{ formatPercent(item.return_pct) }}</em>
                </li>
              </ol>
            </div>
            <div class="ranking-card">
              <h2>累计跌幅榜</h2>
              <ol>
                <li v-for="item in ranking.top_losers" :key="`loss-${item.push_id}`">
                  <span>{{ item.stock_name }}</span>
                  <em :class="returnClass(item.return_pct)">{{ formatPercent(item.return_pct) }}</em>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { stockApi } from '@/services/api'

export default {
  name: 'PotentialStockPushHistoryView',
  setup() {
    const loading = ref(false)
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

    const summary = computed(() => ranking.value.summary || {})

    const loadData = async () => {
      loading.value = true
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
      } catch (error) {
        ElMessage.error(error?.message || '加载风口潜力股推送记录失败')
      } finally {
        loading.value = false
      }
    }

    const formatPrice = (value) => {
      const num = Number(value)
      return Number.isFinite(num) ? num.toFixed(2) : '--'
    }

    const formatPercent = (value) => {
      const num = Number(value)
      if (!Number.isFinite(num)) return '--'
      return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
    }

    const returnClass = (value) => {
      const num = Number(value)
      if (num > 0) return 'is-up'
      if (num < 0) return 'is-down'
      return ''
    }

    onMounted(loadData)

    return {
      activeTab,
      filters,
      loading,
      records,
      ranking,
      summary,
      loadData,
      formatPrice,
      formatPercent,
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

.summary-card small {
  display: block;
  margin-top: 8px;
  color: #9ca3af;
}

.content-panel {
  padding: 18px 20px 24px;
}

.panel-toolbar {
  display: flex;
  justify-content: flex-end;
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

.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stock-cell strong {
  color: #111827;
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
