<template>
  <div class="resonance-panel">
    <div class="panel-header">
      <h3>风口爆发<span class="title-sub">三重共振信号</span></h3>
      <div class="header-right">
        <span class="subtitle" v-if="signals.length">共 {{ signals.length }} 只股票</span>
        <router-link v-if="showMoreLink" to="/hotspot-outbreak" class="more-link">查看全部 <span class="arrow">&rarr;</span></router-link>
      </div>
    </div>

    <div v-if="loading" class="loading">检测中...</div>
    <div v-else-if="!signals.length && !hotConcepts.length" class="empty">暂无共振信号，点击下方按钮执行检测</div>

    <div v-else>
      <!-- 细分概念爆发区域 -->
      <div v-if="hotConcepts.length" class="concept-section">
        <div class="section-title">细分概念爆发</div>
        <div class="concept-list">
          <div
            v-for="concept in hotConcepts"
            :key="concept.conceptName"
            class="concept-card"
          >
            <div class="concept-header">
              <span class="concept-name">{{ concept.conceptName }}</span>
              <span class="concept-badge">共振一通过</span>
            </div>
            <div class="concept-stats">
              <span class="stat-item">财联社 {{ concept.clsCount }}篇</span>
              <span class="stat-item">格隆汇 {{ concept.glhCount }}篇</span>
              <span class="stat-ratio" v-if="concept.surgeRatio">x{{ concept.surgeRatio.toFixed(1) }}</span>
            </div>
            <div class="concept-stocks" v-if="concept.stockCodes && concept.stockCodes.length">
              <span class="stock-tag" v-for="s in concept.stockCodes.slice(0, 5)" :key="s.symbol">
                {{ s.name || s.symbol }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 个股共振信号区域 -->
      <div v-if="signals.length" class="signal-list">
        <div
          v-for="sig in signals"
          :key="sig.symbol"
          class="signal-card"
          :class="'level-' + sig.resonanceLevel"
        >
          <div class="card-header">
            <span class="stock-name">{{ sig.stockName }}({{ sig.symbol }})</span>
            <span class="level-tag" :class="sig.resonanceLevel">
              {{ levelLabel(sig.resonanceLevel) }}
            </span>
          </div>

          <div class="triple-resonance-row">
            <span class="res-dot" :class="{ on: sig.resonance1?.verified }">共振一</span>
            <span class="res-dot" :class="{ on: sig.resonance2?.verified }">共振二</span>
            <span class="res-dot" :class="{ on: sig.resonance3?.verified }">共振三</span>
          </div>

          <div class="resonance-row">
            <div class="res-item">
              <span class="res-label">快讯</span>
              <span class="res-val">{{ sig.newsCount }}篇</span>
              <span class="res-ratio" v-if="sig.newsSurgeRatio">x{{ sig.newsSurgeRatio.toFixed(1) }}</span>
            </div>
            <div class="res-item">
              <span class="res-label">飞书</span>
              <span class="res-val">{{ sig.feishuMessageCount }}条</span>
            </div>
            <div class="res-item" :class="{ verified: sig.thsVerified }">
              <span class="res-label">板块</span>
              <span class="res-val">{{ sig.thsVerified ? '#' + sig.thsSectorRank : '否' }}</span>
              <span class="res-sector" v-if="sig.thsSectorName">{{ sig.thsSectorName }}</span>
            </div>
          </div>

          <!-- 概念共振标签 -->
          <div class="concept-resonance-row" v-if="sig.conceptResonance">
            <span class="concept-tag" :class="{ verified: sig.conceptResonance.conceptVerified }">
              {{ sig.conceptResonance.conceptName }}
            </span>
            <span class="concept-detail">
              财联社{{ sig.conceptResonance.clsCount }} + 格隆汇{{ sig.conceptResonance.glhCount }}
            </span>
          </div>

          <div class="keywords-row" v-if="uniqueKeywords(sig).length">
            <span
              v-for="kw in uniqueKeywords(sig)"
              :key="kw"
              class="kw-tag"
            >{{ kw }}</span>
          </div>

          <div class="score-bar">
            <div class="score-fill" :style="{ width: sig.resonanceScore + '%' }"></div>
            <span class="score-text">{{ sig.resonanceScore }}分</span>
          </div>
        </div>
      </div>
    </div>

    <button class="detect-btn" @click="runDetect" :disabled="loading">
      {{ loading ? '检测中...' : '执行检测' }}
    </button>
  </div>
</template>

<script>
import { hotSectorApi } from '@/services/api'

export default {
  name: 'HotspotOutbreakPanel',
  props: {
    showMoreLink: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      signals: [],
      hotConcepts: [],
      loading: false,
    }
  },
  methods: {
    levelLabel(level) {
      return { critical: '严重', high: '强烈', medium: '中等', low: '弱' }[level] || level
    },
    uniqueKeywords(sig) {
      return [...new Set([...(sig.newsKeywords || []), ...(sig.feishuKeywords || [])])]
    },
    async fetchRecent() {
      this.loading = true
      try {
        const res = await hotSectorApi.getOutbreak(6)
        this.signals = res.data?.outbreaks || []
        this.hotConcepts = res.data?.hotConcepts || []
      } catch {
        this.signals = []
        this.hotConcepts = []
      } finally {
        this.loading = false
      }
    },
    async runDetect() {
      this.loading = true
      try {
        const res = await hotSectorApi.detectOutbreak()
        this.signals = res.data?.outbreaks || []
        this.hotConcepts = res.data?.hotConcepts || []
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

<style scoped>
.resonance-panel {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel-header h3 {
  margin: 0;
  color: var(--text-primary, #1f2937);
  font-size: 1.1rem;
  .title-sub {
    margin-left: 6px;
    font-size: 0.8rem;
    font-weight: 400;
    color: var(--text-tertiary, #94a3b8);
  }
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
.loading, .empty {
  text-align: center;
  padding: 30px 0;
  color: var(--text-tertiary, #94a3b8);
  font-size: 13px;
}

.concept-section {
  margin-bottom: 16px;
}
.section-title {
  color: #f59e0b;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}
.concept-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.concept-card {
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 6px;
  padding: 10px;
}
.concept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.concept-name {
  color: var(--text-primary, #1f2937);
  font-weight: 600;
  font-size: 13px;
}
.concept-badge {
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}
.concept-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
  font-size: 11px;
  color: var(--text-tertiary, #94a3b8);
}
.concept-ratio {
  color: #ea580c;
  font-weight: 600;
}
.concept-stocks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.stock-tag {
  background: rgba(124, 58, 237, 0.08);
  color: #6d28d9;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.signal-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.signal-card {
  background: #f8fafc;
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid #cbd5e1;
}
.signal-card.level-critical { border-left-color: #ef4444; }
.signal-card.level-high { border-left-color: #f97316; }
.signal-card.level-medium { border-left-color: #f59e0b; }
.signal-card.level-low { border-left-color: #94a3b8; }
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.stock-name {
  color: var(--text-primary, #1f2937);
  font-weight: 600;
  font-size: 14px;
}
.level-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.level-tag.critical { background: #ef4444; color: #fff; }
.level-tag.high { background: #f97316; color: #fff; }
.level-tag.medium { background: #f59e0b; color: #fff; }
.level-tag.low { background: #e2e8f0; color: #64748b; }

.triple-resonance-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.res-dot {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #94a3b8;
}
.res-dot.on {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}

.resonance-row {
  display: flex;
  gap: 20px;
  margin-bottom: 6px;
}
.res-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.res-label {
  color: var(--text-tertiary, #94a3b8);
  font-size: 11px;
}
.res-val {
  color: var(--text-primary, #1f2937);
  font-size: 12px;
  font-weight: 600;
}
.res-ratio {
  color: #ea580c;
  font-size: 10px;
}
.res-sector {
  color: var(--text-tertiary, #94a3b8);
  font-size: 10px;
}
.res-item.verified .res-val {
  color: #16a34a;
}

.concept-resonance-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.concept-tag {
  background: rgba(124, 58, 237, 0.08);
  color: #6d28d9;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.concept-tag.verified {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}
.concept-detail {
  color: var(--text-tertiary, #94a3b8);
  font-size: 11px;
}

.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.kw-tag {
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.score-bar {
  position: relative;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}
.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  border-radius: 3px;
  transition: width 0.3s;
}
.score-text {
  position: absolute;
  right: 0;
  top: -16px;
  color: #b45309;
  font-size: 11px;
}

.detect-btn {
  width: 100%;
  margin-top: 12px;
  padding: 10px;
  background: var(--primary-color, #4f7cff);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.detect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
