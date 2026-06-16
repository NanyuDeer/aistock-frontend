<template>
  <div class="resonance-panel">
    <div class="panel-header">
      <h3>【风口爆发】三重共振信号</h3>
      <span class="subtitle" v-if="signals.length">共 {{ signals.length }} 只股票</span>
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
            :key="concept.concept_name"
            class="concept-card"
          >
            <div class="concept-header">
              <span class="concept-name">{{ concept.concept_name }}</span>
              <span class="concept-badge">共振一通过</span>
            </div>
            <div class="concept-stats">
              <span class="stat-item">财联社 {{ concept.cls_count }}篇</span>
              <span class="stat-item">格隆汇 {{ concept.glh_count }}篇</span>
              <span class="stat-ratio" v-if="concept.surge_ratio">x{{ concept.surge_ratio.toFixed(1) }}</span>
            </div>
            <div class="concept-stocks" v-if="concept.stock_codes && concept.stock_codes.length">
              <span class="stock-tag" v-for="s in concept.stock_codes.slice(0, 5)" :key="s.symbol">
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
          :class="'level-' + sig.resonance_level"
        >
          <div class="card-header">
            <span class="stock-name">{{ sig.stock_name }}({{ sig.symbol }})</span>
            <span class="level-tag" :class="sig.resonance_level">
              {{ levelLabel(sig.resonance_level) }}
            </span>
          </div>

          <div class="resonance-row">
            <div class="res-item">
              <span class="res-label">快讯</span>
              <span class="res-val">{{ sig.news_count }}篇</span>
              <span class="res-ratio" v-if="sig.news_surge_ratio">x{{ sig.news_surge_ratio.toFixed(1) }}</span>
            </div>
            <div class="res-item">
              <span class="res-label">飞书</span>
              <span class="res-val">{{ sig.feishu_message_count }}条</span>
            </div>
            <div class="res-item" :class="{ verified: sig.ths_verified }">
              <span class="res-label">板块</span>
              <span class="res-val">{{ sig.ths_verified ? '#' + sig.ths_sector_rank : '否' }}</span>
              <span class="res-sector" v-if="sig.ths_sector_name">{{ sig.ths_sector_name }}</span>
            </div>
          </div>

          <!-- 概念共振标签 -->
          <div class="concept-resonance-row" v-if="sig.concept_resonance">
            <span class="concept-tag" :class="{ verified: sig.concept_resonance.concept_verified }">
              {{ sig.concept_resonance.concept_name }}
            </span>
            <span class="concept-detail">
              财联社{{ sig.concept_resonance.cls_count }} + 格隆汇{{ sig.concept_resonance.glh_count }}
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
            <div class="score-fill" :style="{ width: sig.resonance_score + '%' }"></div>
            <span class="score-text">{{ sig.resonance_score }}分</span>
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
      return [...new Set([...(sig.news_keywords || []), ...(sig.feishu_keywords || [])])]
    },
    async fetchRecent() {
      this.loading = true
      try {
        const res = await hotSectorApi.getOutbreak(6)
        this.signals = res.data?.outbreaks || []
        this.hotConcepts = res.data?.hot_concepts || []
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
        this.hotConcepts = res.data?.hot_concepts || []
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
  background: #1a1a2e;
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
.panel-header h3 { color: #e0e0e0; margin: 0; font-size: 15px; }
.subtitle { color: #888; font-size: 12px; }
.loading, .empty { color: #888; text-align: center; padding: 20px 0; font-size: 13px; }

/* 细分概念爆发区域 */
.concept-section {
  margin-bottom: 12px;
}
.section-title {
  color: #a78bfa;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}
.concept-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.concept-card {
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 6px;
  padding: 8px 10px;
}
.concept-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.concept-name {
  color: #e0e0e0;
  font-weight: 600;
  font-size: 13px;
}
.concept-badge {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
}
.concept-stats {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 4px;
}
.stat-item {
  color: #94a3b8;
  font-size: 11px;
}
.stat-ratio {
  color: #ef4444;
  font-size: 10px;
  font-weight: 600;
}
.concept-stocks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.stock-tag {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
}

/* 个股共振信号 */
.signal-list { display: flex; flex-direction: column; gap: 8px; }

.signal-card {
  background: #16213e;
  border-radius: 6px;
  padding: 10px 12px;
  border-left: 3px solid #444;
}
.signal-card.level-critical { border-color: #ef4444; }
.signal-card.level-high { border-color: #f97316; }
.signal-card.level-medium { border-color: #eab308; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.stock-name { color: #fff; font-weight: 600; font-size: 13px; }
.level-tag {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 8px;
}
.level-tag.critical { background: #7f1d1d; color: #fca5a5; }
.level-tag.high { background: #7c2d12; color: #fdba74; }
.level-tag.medium { background: #713f12; color: #fde047; }
.level-tag.low { background: #1e293b; color: #94a3b8; }

.resonance-row { display: flex; gap: 20px; margin-bottom: 6px; }
.res-item { display: flex; align-items: center; gap: 4px; }
.res-label { color: #666; font-size: 11px; }
.res-val { color: #ccc; font-size: 12px; font-weight: 500; }
.res-ratio { color: #ef4444; font-size: 10px; }
.res-sector { color: #f97316; font-size: 10px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.res-item.verified .res-val { color: #4ade80; }

/* 概念共振标签 */
.concept-resonance-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.concept-tag {
  background: rgba(124, 58, 237, 0.2);
  color: #a78bfa;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}
.concept-tag.verified {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}
.concept-detail {
  color: #64748b;
  font-size: 10px;
}

.keywords-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
.kw-tag {
  background: rgba(124, 58, 237, 0.2);
  color: #a78bfa;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}

.score-bar {
  position: relative;
  height: 4px;
  background: #333;
  border-radius: 2px;
}
.score-fill {
  height: 100%;
  background: linear-gradient(90deg, #eab308, #f97316, #ef4444);
  border-radius: 2px;
  transition: width 0.4s;
}
.score-text {
  position: absolute;
  right: 0;
  top: -15px;
  font-size: 9px;
  color: #666;
}

.detect-btn {
  margin-top: 12px;
  width: 100%;
  padding: 8px;
  background: #7c3aed;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.detect-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.detect-btn:hover:not(:disabled) { background: #6d28d9; }
</style>
