<template>
  <div class="history-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <div class="page-header">
          <h2 class="page-title">热点爆发历史</h2>
          <p class="page-desc">历史热点爆发推送记录</p>
        </div>

        <div class="history-content">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="!records.length" class="empty">暂无历史记录</div>

          <div v-else class="history-table">
            <div class="table-head">
              <span>股票</span>
              <span>等级</span>
              <span>得分</span>
              <span>股价</span>
              <span>板块</span>
              <span>关键词</span>
              <span>时间</span>
            </div>
            <div
              v-for="rec in records"
              :key="rec.id"
              class="table-row"
              :class="'level-' + rec.resonance_level"
              @click="goToStock(rec.symbol)"
            >
              <div class="cell-stock">
                <span class="stock-name">{{ rec.stock_name }}</span>
                <span class="stock-code">{{ rec.symbol }}</span>
              </div>
              <div class="cell-level">
                <span class="level-tag" :class="rec.resonance_level">{{ levelLabel(rec.resonance_level) }}</span>
              </div>
              <div class="cell-score">
                <span class="score-val">{{ rec.resonance_score }}</span>
              </div>
              <div class="cell-price">
                <span class="price-val">{{ rec.price != null ? Number(rec.price).toFixed(2) : '--' }}</span>
                <span class="change-val" :class="changeClass(rec.change_pct)">
                  {{ formatChange(rec.change_pct) }}
                </span>
              </div>
              <div class="cell-sector">
                <span class="sector-text">{{ rec.sector_info || '--' }}</span>
              </div>
              <div class="cell-keywords">
                <span v-if="rec.keywords" class="kw-tag" v-for="(kw, i) in rec.keywords.split('、').slice(0, 3)" :key="i">{{ kw }}</span>
              </div>
              <div class="cell-time">{{ formatTime(rec.detected_at) }}</div>
            </div>
          </div>

          <div v-if="hasMore" class="load-more">
            <button @click="loadMore" :disabled="loadingMore">
              {{ loadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import TheNavbar from '@/components/TheNavbar.vue'
import { windLeaderApi } from '@/services/api'

export default {
  name: 'HotBurstHistoryView',
  components: { TheNavbar },
  setup() {
    const router = useRouter()
    const records = ref([])
    const loading = ref(false)
    const loadingMore = ref(false)
    const total = ref(0)
    const page = ref(0)
    const pageSize = 50

    const hasMore = computed(() => records.value.length < total.value)

    const levelLabel = (level) => ({
      critical: '严重', high: '强烈', medium: '中等', low: '弱'
    })[level] || level

    const formatChange = (pct) => {
      if (pct == null) return '--'
      const n = Number(pct)
      return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
    }

    const changeClass = (pct) => {
      if (pct == null) return ''
      return Number(pct) >= 0 ? 'up' : 'down'
    }

    const formatTime = (ts) => {
      if (!ts) return '--'
      const d = new Date(ts)
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    const goToStock = (code) => router.push({ name: 'stockDetail', params: { code } })

    const fetchHistory = async (append = false) => {
      if (append) loadingMore.value = true
      else loading.value = true
      try {
        const offset = append ? records.value.length : 0
        const res = await windLeaderApi.getHotBurstHistory(pageSize, offset)
        const data = res.data || {}
        total.value = data.total || 0
        if (append) {
          records.value.push(...(data.records || []))
        } else {
          records.value = data.records || []
        }
      } catch {
        if (!append) records.value = []
      } finally {
        loading.value = false
        loadingMore.value = false
      }
    }

    const loadMore = () => fetchHistory(true)

    fetchHistory()

    return {
      records, loading, loadingMore, hasMore,
      levelLabel, formatChange, changeClass, formatTime,
      goToStock, loadMore,
    }
  }
}
</script>

<style lang="scss" scoped>
.history-page {
  padding-top: 80px;
  min-height: 100vh;
  background: var(--background-color);

  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 15px;
  }

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 1.4rem;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .page-desc {
      font-size: 0.9rem;
      color: var(--text-tertiary);
    }
  }

  .history-content {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .loading, .empty {
    text-align: center;
    padding: 40px 0;
    color: var(--text-tertiary);
    font-size: 0.9rem;
  }

  .history-table {
    border: 1px solid #edf1f7;
    border-radius: 8px;
    overflow: hidden;
  }

  .table-head,
  .table-row {
    display: grid;
    grid-template-columns: minmax(100px, 0.9fr) 56px 44px minmax(80px, 0.6fr) minmax(80px, 0.7fr) minmax(120px, 1fr) 72px;
    align-items: center;
    gap: 8px;
  }

  .table-head {
    min-height: 34px;
    padding: 0 12px;
    background: #f8fafc;
    border-bottom: 1px solid #edf1f7;
    color: var(--text-tertiary);
    font-size: 0.74rem;
    font-weight: 700;
  }

  .table-row {
    min-height: 50px;
    padding: 8px 12px;
    background: #fff;
    cursor: pointer;
    border-bottom: 1px solid #f0f3f8;
    border-left: 3px solid transparent;
    transition: background 0.2s, box-shadow 0.2s;

    &:last-child { border-bottom: none; }
    &:hover {
      background: #fbfdff;
      box-shadow: inset 3px 0 0 #4f7cff;
    }
    &.level-critical { border-left-color: #ef4444; }
    &.level-high { border-left-color: #f97316; }
    &.level-medium { border-left-color: #f59e0b; }
  }

  .cell-stock {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    .stock-name {
      font-size: 0.92rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stock-code {
      font-size: 0.72rem;
      color: var(--text-tertiary);
    }
  }

  .cell-level {
    .level-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 600;
      white-space: nowrap;

      &.critical { background: #ef4444; color: #fff; }
      &.high { background: #f97316; color: #fff; }
      &.medium { background: #f59e0b; color: #fff; }
      &.low { background: #e2e8f0; color: #64748b; }
    }
  }

  .cell-score {
    .score-val {
      font-size: 0.88rem;
      font-weight: 700;
      color: #b45309;
    }
  }

  .cell-price {
    display: flex;
    flex-direction: column;
    gap: 1px;

    .price-val {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .change-val {
      font-size: 0.76rem;
      font-weight: 500;
      &.up { color: #ef4444; }
      &.down { color: #16a34a; }
    }
  }

  .cell-sector {
    min-width: 0;
    .sector-text {
      font-size: 0.76rem;
      color: var(--text-secondary);
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .cell-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;

    .kw-tag {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 0.72rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.08);
      color: #2563eb;
      border: 1px solid rgba(59, 130, 246, 0.2);
      white-space: nowrap;
    }
  }

  .cell-time {
    font-size: 0.76rem;
    color: var(--text-tertiary);
    white-space: nowrap;
  }

  .load-more {
    text-align: center;
    padding: 16px 0;

    button {
      padding: 8px 24px;
      border-radius: 6px;
      border: 1px solid var(--primary-color, #4f7cff);
      background: #fff;
      color: var(--primary-color, #4f7cff);
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;

      &:hover { background: var(--primary-color, #4f7cff); color: #fff; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  }
}

@media (max-width: 768px) {
  .history-page {
    .table-head,
    .table-row {
      grid-template-columns: minmax(80px, 0.85fr) 48px 36px minmax(60px, 0.5fr) minmax(60px, 0.6fr) minmax(80px, 0.8fr) 60px;
      gap: 4px;
    }

    .table-head { font-size: 0.68rem; }
    .table-row { padding: 6px 8px; min-height: 44px; }
    .cell-stock .stock-name { font-size: 0.82rem; }
    .cell-keywords .kw-tag { font-size: 0.66rem; padding: 1px 5px; }
    .cell-price .price-val { font-size: 0.8rem; }
    .cell-sector .sector-text { font-size: 0.68rem; }
    .cell-time { font-size: 0.68rem; }
  }
}
</style>
