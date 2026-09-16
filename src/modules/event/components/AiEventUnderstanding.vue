<template>
  <div class="event-understanding" v-if="data">
    <!-- 事件概括 -->
    <div class="eu-section">
      <span class="eu-section-title">事件概括</span>
      <p class="eu-summary">{{ data.summary }}</p>
    </div>

    <!-- 核心变化 -->
    <div class="eu-section" v-if="data.coreChanges?.length">
      <span class="eu-section-title">核心变化</span>
      <div class="eu-changes">
        <div v-for="(ch, idx) in data.coreChanges" :key="idx" class="eu-change-row">
          <span class="change-var">{{ ch.variable }}</span>
          <div class="change-flow">
            <span class="change-before">{{ ch.before }}</span>
            <span class="change-arrow">→</span>
            <span class="change-after">{{ ch.after }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * AiEventUnderstanding — Web 端 AI 事件理解
 *
 * 镜像 APP 端同名组件（AiEventUnderstanding.vue）：
 * 事件概括（summary）→ 核心变化（coreChanges：变量→前→后 流程卡片）。
 *
 * Props: data — eventUnderstanding
 */
export default {
  name: 'AiEventUnderstanding',
  props: {
    data: { type: Object, default: null },
  },
}
</script>

<style lang="scss" scoped>
.event-understanding {
  display: flex;
  flex-direction: column;
}

.eu-section {
  padding: 10px 0;
  border-bottom: 1px solid var(--ev-border-light);
}
.eu-section:last-child { border-bottom: none; }

.eu-section-title {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--ev-accent);
  margin-bottom: 8px;
}

.eu-summary {
  font-size: 13px;
  color: var(--ev-text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* 核心变化 */
.eu-changes { display: flex; flex-direction: column; gap: 8px; }

.eu-change-row {
  padding: 8px 12px;
  border-radius: var(--ev-r-xs);
  background: var(--ev-bg-elevated);
}

.change-var { display: block; font-size: 12px; font-weight: 600; color: var(--ev-text-primary); margin-bottom: 5px; }
.change-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.change-before { font-size: 12px; color: var(--ev-text-muted); }
.change-arrow { font-size: 12px; color: var(--ev-accent); font-weight: 700; }
.change-after { font-size: 12px; color: var(--ev-text-secondary); font-weight: 500; }
</style>