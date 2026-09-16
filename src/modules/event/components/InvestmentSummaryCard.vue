<template>
  <div class="summary-card" v-if="data">
    <!-- 核心判断 -->
    <div class="summary-section">
      <span class="section-title">核心判断</span>
      <p class="conclusion-text">{{ data.conclusion }}</p>
      <div class="key-points" v-if="data.keyPoints?.length">
        <span v-for="(kp, i) in data.keyPoints" :key="i" class="key-point">• {{ kp }}</span>
      </div>
    </div>

    <!-- 关注方向 -->
    <div class="summary-section" v-if="data.focusIndustries?.length">
      <span class="section-title">关注方向</span>
      <div class="focus-list">
        <div
          v-for="fi in data.focusIndustries"
          :key="fi.name"
          class="focus-item"
          :class="'focus-' + fi.direction"
        >
          <span class="focus-name">{{ fi.name }}</span>
          <span class="focus-dir">{{ fi.direction === 'positive' ? '↑' : '↓' }}</span>
          <span class="focus-reason">{{ fi.reason }}</span>
        </div>
      </div>
    </div>

    <!-- 投资机会 -->
    <div class="summary-section" v-if="data.opportunities?.length">
      <span class="section-title">存在机会</span>
      <div class="opp-list">
        <span v-for="(op, i) in data.opportunities" :key="i" class="opp-item">• {{ op }}</span>
      </div>
    </div>

    <!-- 风险提示 -->
    <div class="summary-section risk-section" v-if="data.risks?.length">
      <span class="section-title risk-title">风险提示</span>
      <div class="risk-list">
        <span v-for="(r, i) in data.risks" :key="i" class="risk-item">• {{ r }}</span>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * InvestmentSummaryCard — Web 端 AI 投资总结卡片
 *
 * 镜像 APP 端同名组件（InvestmentSummaryCard.vue）：
 * 核心判断（conclusion + keyPoints）→ 关注方向（涨红↑/跌绿↓）→ 存在机会 → 风险提示（A股绿）。
 *
 * Props: data — investmentSummary
 */
export default {
  name: 'InvestmentSummaryCard',
  props: {
    data: { type: Object, default: null },
  },
}
</script>

<style lang="scss" scoped>
.summary-card {
  display: flex;
  flex-direction: column;
}

/* 区块 */
.summary-section {
  padding: 10px 0;
  border-bottom: 1px solid var(--ev-border-light);
}
.summary-section:last-of-type { border-bottom: none; }

.section-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ev-accent);
  margin-bottom: 8px;
}

.conclusion-text {
  font-size: 13px;
  color: var(--ev-text-secondary);
  line-height: 1.6;
  display: block;
  margin: 0 0 8px;
}

.key-points { display: flex; flex-direction: column; gap: 5px; }
.key-point { font-size: 12px; color: var(--ev-text-tertiary); line-height: 1.5; }

/* 关注方向 */
.focus-list { display: flex; flex-direction: column; gap: 8px; }

.focus-item {
  padding: 8px 12px;
  border-radius: var(--ev-r-xs);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.focus-positive { background: var(--ev-negative-bg); }
.focus-negative { background: var(--ev-positive-bg); }

.focus-name { font-size: 12px; font-weight: 600; color: var(--ev-text-primary); }
.focus-dir { font-size: 12px; font-weight: 700; }
.focus-positive .focus-dir { color: var(--ev-negative); }
.focus-negative .focus-dir { color: var(--ev-positive); }
.focus-reason { font-size: 12px; color: var(--ev-text-muted); width: 100%; }

/* 机会 */
.opp-list { display: flex; flex-direction: column; gap: 5px; }
.opp-item { font-size: 12px; color: var(--ev-text-tertiary); line-height: 1.5; }

/* 风险提示：谨慎/利空语义 → A股绿 */
.risk-section { border-bottom: none; }
.risk-title { color: var(--ev-positive); }
.risk-list { display: flex; flex-direction: column; gap: 5px; }
.risk-item { font-size: 12px; color: var(--ev-positive); line-height: 1.5; }
</style>