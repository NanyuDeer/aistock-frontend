<template>
  <div class="hot-burst-panel">
    <div class="panel-header">
      <h3 class="section-title">
        媒体关注榜
        <button
          v-if="showDetectBtn"
          class="detect-btn-small"
          @click="runDetect"
          :disabled="loading"
        >
          {{ loading ? '检测中...' : '执行监测' }}
        </button>
      </h3>
      <div class="header-right">
        <span class="subtitle" v-if="signals.length">共 {{ signals.length }} 只</span>
        <router-link v-if="showMoreLink" to="/hot-burst" class="more-link">
          查看全部 <span class="arrow">&rarr;</span>
        </router-link>
      </div>
    </div>

    <div v-if="loading && !signals.length" class="loading">检测中...</div>

    <div v-else class="signal-table">
      <div class="table-head">
        <span>行情</span>
        <span>股票</span>
        <span>共振</span>
        <span>等级</span>
        <span>关键词</span>
        <span>得分</span>
        <span>板块</span>
      </div>
      <div
        v-for="sig in signals"
        :key="sig.symbol"
        class="table-row"
        :class="'level-' + sig.resonanceLevel"
        @click="goToStock(sig.symbol)"
      >
        <div class="cell-price">
          <span class="price-val">{{ sig.price != null ? sig.price.toFixed(2) : '--' }}</span>
          <span class="change-val" :class="changeClass(sig.changePct)">
            {{ formatChange(sig.changePct) }}
          </span>
        </div>
        <div class="cell-stock">
          <span class="stock-name">{{ sig.stockName || sig.symbol }}</span>
          <span class="stock-code">{{ sig.symbol }}</span>
        </div>
        <div class="cell-resonance">
          <span class="res-dot" :class="{ on: sig.resonance1?.verified }">1</span>
          <span class="res-dot" :class="{ on: sig.resonance2?.verified }">2</span>
          <span class="res-dot" :class="{ on: sig.resonance3?.verified }">3</span>
        </div>
        <div class="cell-level">
          <span class="level-tag" :class="sig.resonanceLevel">{{ levelLabel(sig.resonanceLevel) }}</span>
        </div>
        <div class="cell-keywords">
          <span
            v-for="kw in uniqueKeywords(sig).slice(0, 3)"
            :key="kw"
            class="kw-tag"
          >{{ kw }}</span>
        </div>
        <div class="cell-score">
          <span class="score-val">{{ sig.resonanceScore }}</span>
        </div>
        <div class="cell-sector">
          <span class="sector-text">{{ sig.sectorInfo || sig.thsSectorName || '--' }}</span>
        </div>
      </div>
      <div v-if="!signals.length" class="empty-row">暂无共振信号</div>
    </div>
  </div>
</template>

<script>
import { windLeaderApi } from '@/services/api'
import { useRouter } from 'vue-router'

export default {
  name: 'HotBurstPanel',
  props: {
    showMoreLink: { type: Boolean, default: true },
    showDetectBtn: { type: Boolean, default: false },
  },
  data() {
    return { signals: [], loading: false }
  },
  setup() {
    const router = useRouter()
    const goToStock = (code) => router.push({ name: 'stockDetail', params: { code } })
    return { goToStock }
  },
  methods: {
    levelLabel(level) {
      return { critical: '极高', high: '高', medium: '中', low: '低' }[level] || level
    },
    uniqueKeywords(sig) {
      return [...new Set([...(sig.newsKeywords || []), ...(sig.feishuKeywords || [])])]
    },
    formatChange(pct) {
      if (pct == null) return '--'
      return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
    },
    changeClass(pct) {
      if (pct == null) return ''
      return pct >= 0 ? 'up' : 'down'
    },
    async fetchRecent() {
      this.loading = true
      try {
        const res = await windLeaderApi.getHotBurst(6)
        this.signals = res.data?.outbreaks || []
      } catch {
        this.signals = []
      } finally {
        this.loading = false
      }
    },
    async runDetect() {
      this.loading = true
      try {
        const res = await windLeaderApi.detectHotBurst()
        this.signals = res.data?.outbreaks || []
      } finally {
        this.loading = false
      }
    },
  },
  mounted() {
    this.fetchRecent()
  },
}
</script>

<style lang="scss" scoped>
.hot-burst-panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .section-title {
      margin: 0;
      font-size: 1.1rem;
      color: var(--text-primary);
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

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .subtitle {
      color: var(--text-tertiary, #94a3b8);
      font-size: 12px;
    }

    .more-link {
      font-size: 0.85rem;
      color: var(--primary-color, #4f7cff);
      text-decoration: none;
      white-space: nowrap;
      .arrow { margin-left: 2px; }
      &:hover { text-decoration: underline; }
    }
  }

  .loading {
    text-align: center;
    padding: 30px 0;
    color: var(--text-tertiary, #94a3b8);
    font-size: 13px;
  }

  .empty-row {
    text-align: center;
    color: var(--text-tertiary, #94a3b8);
    padding: 30px 0;
    font-size: 0.88rem;
  }

  .signal-table {
    border: 1px solid #edf1f7;
    border-radius: 8px;
    overflow: hidden;
  }

  .table-head,
  .table-row {
    display: grid;
    grid-template-columns: 80px minmax(90px, 0.8fr) 56px 56px minmax(120px, 1fr) 44px minmax(80px, 0.7fr);
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
}

@media (max-width: 768px) {
  .hot-burst-panel {
    .table-head,
    .table-row {
      grid-template-columns: 64px minmax(72px, 0.75fr) 48px 48px minmax(80px, 0.8fr) 36px minmax(60px, 0.6fr);
      gap: 4px;
    }

    .table-head {
      font-size: 0.68rem;
    }

    .table-row {
      padding: 6px 8px;
      min-height: 44px;
    }

    .cell-stock .stock-name { font-size: 0.82rem; }
    .cell-keywords .kw-tag { font-size: 0.66rem; padding: 1px 5px; }
    .cell-price .price-val { font-size: 0.8rem; }
    .cell-sector .sector-text { font-size: 0.68rem; }
  }
}
</style>
