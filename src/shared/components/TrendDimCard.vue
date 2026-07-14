<template>
  <div class="dim-card" :class="{ open: isOpen }">
    <div class="dim-head" @click="$emit('toggle')">
      <div class="dim-info">
        <span class="dim-name">{{ name }}</span>
        <span class="dim-weight">权重 {{ weight }}%</span>
      </div>
      <div class="dim-score-area">
        <div class="dim-bar">
          <div class="dim-bar-fill" :style="{ width: score + '%', background: scoreColor }"></div>
        </div>
        <span class="dim-score" :style="{ color: scoreColor }">{{ score }}</span>
        <span class="dim-arrow" :class="{ rotated: isOpen }">▼</span>
      </div>
    </div>
    <div class="dim-body" v-show="isOpen">
      <div class="dim-indicators" v-if="indicators.length">
        <div class="ind-row" v-for="ind in indicators" :key="ind.key">
          <span class="ind-name">{{ ind.name }}</span>
          <span class="ind-value">{{ ind.value }}</span>
          <div class="ind-bar">
            <div class="ind-bar-fill" :style="{ width: ind.score + '%', background: getScoreColor(ind.score) }"></div>
          </div>
          <span class="ind-score" :style="{ color: getScoreColor(ind.score) }">{{ ind.score }}</span>
        </div>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, default: '' },
  weight: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  isOpen: { type: Boolean, default: false },
  indicators: { type: Array, default: () => [] },
});

defineEmits(['toggle']);

const scoreColor = computed(() => {
  if (props.score >= 70) return '#67c23a';
  if (props.score >= 50) return '#e6a23c';
  return '#f56c6c';
});

function getScoreColor(score) {
  if (score >= 70) return '#67c23a';
  if (score >= 50) return '#e6a23c';
  return '#f56c6c';
}
</script>

<style scoped>
.dim-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: box-shadow 0.3s;
}
.dim-card.open { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.dim-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; cursor: pointer; user-select: none;
}
.dim-info { display: flex; align-items: center; gap: 10px; }
.dim-name { font-size: 1rem; font-weight: 600; color: #303133; }
.dim-weight { font-size: 0.8rem; color: #909399; }
.dim-score-area { display: flex; align-items: center; gap: 10px; }
.dim-bar { width: 100px; height: 6px; background: #f0f2f5; border-radius: 3px; overflow: hidden; }
.dim-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
.dim-score { font-size: 1.2rem; font-weight: 700; min-width: 30px; text-align: right; }
.dim-arrow { font-size: 0.7rem; color: #909399; transition: transform 0.3s; }
.dim-arrow.rotated { transform: rotate(180deg); }
.dim-body { padding: 0 16px 16px; }
.dim-indicators { margin-bottom: 12px; }
.ind-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 0; border-bottom: 1px solid #f5f7fa;
}
.ind-row:last-child { border-bottom: none; }
.ind-name { font-size: 0.85rem; color: #606266; min-width: 120px; }
.ind-value { font-size: 0.85rem; color: #303133; min-width: 80px; }
.ind-bar { flex: 1; height: 4px; background: #f0f2f5; border-radius: 2px; overflow: hidden; }
.ind-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.ind-score { font-size: 0.85rem; font-weight: 600; min-width: 24px; text-align: right; }
@media (max-width: 768px) {
  .ind-name { min-width: 80px; }
  .dim-bar { width: 60px; }
}
</style>
