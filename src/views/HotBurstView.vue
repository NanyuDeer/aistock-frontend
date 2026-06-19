<template>
  <div class="hot-burst-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <div class="page-header">
          <h2 class="page-title">
            媒体关注榜
            <button
              class="detect-btn-small"
              @click="runDetect"
              :disabled="detecting"
            >
              {{ detecting ? '检测中...' : '执行监测' }}
            </button>
          </h2>
          <p class="page-desc">聚合格隆汇/财联社快讯 + 飞书群消息 + 同花顺热点掘金，三重共振发现媒体关注个股</p>
        </div>

        <div class="monitor-content">
          <div class="history-table">
            <div class="table-head">
              <span>行情</span>
              <span>股票</span>
              <span>共振</span>
              <span>等级</span>
              <span>关键词</span>
              <span>得分</span>
              <span>板块</span>
              <span>时间</span>
            </div>
            <div
              v-for="rec in records"
              :key="rec.id"
              class="table-row"
              :class="'level-' + rec.resonance_level"
              @click="goToStock(rec.symbol)"
            >
              <div class="cell-price">
                <span class="price-val">{{ rec.price != null ? Number(rec.price).toFixed(2) : '--' }}</span>
                <span class="change-val" :class="changeClass(rec.change_pct)">
                  {{ formatChange(rec.change_pct) }}
                </span>
              </div>
              <div class="cell-stock">
                <span class="stock-name">{{ rec.stock_name }}</span>
                <span class="stock-code">{{ rec.symbol }}</span>
              </div>
              <div class="cell-resonance">
                <span class="res-dot" :class="{ on: rec.resonance_count >= 1 }">1</span>
                <span class="res-dot" :class="{ on: rec.resonance_count >= 2 }">2</span>
                <span class="res-dot" :class="{ on: rec.resonance_count >= 3 }">3</span>
              </div>
              <div class="cell-level">
                <span class="level-tag" :class="rec.resonance_level">{{ levelLabel(rec.resonance_level) }}</span>
              </div>
              <div class="cell-keywords">
                <span v-if="rec.keywords" class="kw-tag" v-for="(kw, i) in rec.keywords.split('、').slice(0, 3)" :key="i">{{ kw }}</span>
              </div>
              <div class="cell-score">
                <span class="score-val">{{ rec.resonance_score }}</span>
              </div>
              <div class="cell-sector">
                <span class="sector-text">{{ rec.sector_info || '--' }}</span>
              </div>
              <div class="cell-time">{{ formatTime(rec.detected_at) }}</div>
            </div>
            <div v-if="loading && !records.length" class="empty-row">加载中...</div>
            <div v-if="!loading && !records.length" class="empty-row">暂无历史记录</div>
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

// TODO: 测试用模拟数据，上线前删除
const MOCK_RECORDS = [
  {
    id: 1,
    detected_at: '2026-06-19T10:30:00+08:00',
    symbol: '300308',
    stock_name: '中际旭创',
    resonance_score: 95,
    resonance_level: 'critical',
    price: 156.80,
    change_pct: 9.87,
    sector_info: '光模块/CPO',
    keywords: '光模块、AI算力、CPO',
    resonance_count: 3,
  },
  {
    id: 2,
    detected_at: '2026-06-19T10:15:00+08:00',
    symbol: '002475',
    stock_name: '立讯精密',
    resonance_score: 88,
    resonance_level: 'high',
    price: 42.35,
    change_pct: 6.52,
    sector_info: '消费电子',
    keywords: '苹果产业链、VR',
    resonance_count: 3,
  },
  {
    id: 3,
    detected_at: '2026-06-19T09:45:00+08:00',
    symbol: '688256',
    stock_name: '寒武纪',
    resonance_score: 82,
    resonance_level: 'high',
    price: 238.50,
    change_pct: 12.34,
    sector_info: 'AI芯片',
    keywords: 'AI芯片、算力',
    resonance_count: 2,
  },
  {
    id: 4,
    detected_at: '2026-06-19T09:30:00+08:00',
    symbol: '603986',
    stock_name: '兆易创新',
    resonance_score: 76,
    resonance_level: 'medium',
    price: 98.20,
    change_pct: 4.15,
    sector_info: '存储芯片',
    keywords: '存储、半导体',
    resonance_count: 2,
  },
  {
    id: 5,
    detected_at: '2026-06-18T14:50:00+08:00',
    symbol: '300750',
    stock_name: '宁德时代',
    resonance_score: 68,
    resonance_level: 'medium',
    price: 185.60,
    change_pct: -1.23,
    sector_info: '锂电池',
    keywords: '固态电池、新能源',
    resonance_count: 1,
  },
]

export default {
  name: 'HotBurstView',
  components: { TheNavbar },
  setup() {
    const router = useRouter()
    const records = ref([])
    const loading = ref(false)
    const loadingMore = ref(false)
    const detecting = ref(false)
    const total = ref(0)
    const pageSize = 50

    const hasMore = computed(() => records.value.length < total.value)

    const levelLabel = (level) => ({
      critical: '极高', high: '高', medium: '中', low: '低'
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
        // TODO: 测试用模拟数据，上线前删除
        if (!append) {
          records.value = MOCK_RECORDS
          total.value = MOCK_RECORDS.length
        }
      } finally {
        loading.value = false
        loadingMore.value = false
      }
    }

    const loadMore = () => fetchHistory(true)

    const runDetect = async () => {
      detecting.value = true
      try {
        await windLeaderApi.detectHotBurst()
        await fetchHistory(false)
      } finally {
        detecting.value = false
      }
    }

    fetchHistory()

    return {
      records, loading, loadingMore, hasMore, detecting,
      levelLabel, formatChange, changeClass, formatTime,
      goToStock, loadMore, runDetect,
    }
  }
}
</script>

<style lang="scss" scoped>
.hot-burst-page {
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
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .detect-btn-small {
      padding: 3px 12px;
      font-size: 0.78rem;
      border-radius: 4px;
      border: 1px solid var(--primary-color, #4f7cff);
      background: var(--primary-color, #4f7cff);
      color: #fff;
      cursor: pointer;
      transition: opacity 0.2s;

      &:hover { opacity: 0.85; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .page-desc {
      font-size: 0.9rem;
      color: var(--text-tertiary);
    }
  }

  .monitor-content {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .empty-row {
    text-align: center;
    color: var(--text-tertiary);
    padding: 30px 0;
    font-size: 0.88rem;
  }

  .history-table {
    border: 1px solid #edf1f7;
    border-radius: 8px;
    overflow: hidden;
  }

  .table-head,
  .table-row {
    display: grid;
    grid-template-columns: 80px minmax(90px, 0.8fr) 56px 56px minmax(120px, 1fr) 44px minmax(80px, 0.7fr) 72px;
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

  .cell-resonance {
    display: flex;
    gap: 3px;

    .res-dot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      font-size: 0.62rem;
      background: #f1f5f9;
      color: #94a3b8;

      &.on {
        background: rgba(34, 197, 94, 0.15);
        color: #16a34a;
      }
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

  .cell-score {
    .score-val {
      font-size: 0.88rem;
      font-weight: 700;
      color: #b45309;
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
  .hot-burst-page {
    .table-head,
    .table-row {
      grid-template-columns: 64px minmax(72px, 0.75fr) 48px 48px minmax(80px, 0.8fr) 36px minmax(60px, 0.6fr) 60px;
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
