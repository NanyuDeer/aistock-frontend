<template>
  <!-- 事件影响存活度小标（标题下方单独一行）：
       仅 alive/fading/expired 三档渲染；no_observation / 无数据不渲染（见 isVitalityVisible）。 -->
  <div v-if="visible" class="vitality-badge" :class="'is-' + vitality.status">
    <span class="vb-dot"></span>
    <span class="vb-text">{{ label }}</span>
  </div>
</template>

<script>
/**
 * 事件影响存活度小标（Web 端，列表卡片 / 详情 Hero 卡共用）
 *
 * 语义：判断已推送重大事件的影响是否仍在推动相关板块（后端 annotation-only 标注）。
 * 展示口径（用户已确认，对齐 APP）：标题下方单独一行小标；alive=影响持续中 / fading=影响减弱 /
 * expired=影响消退；no_observation 或无数据不渲染。语义色避开红涨绿跌 → alive=蓝 / fading=琥珀 / expired=浅灰。
 *
 * Props:
 * - vitality: Object|null — 后端 impactVitality 字段 { score, status, statDate }
 */
import { computed } from 'vue'
import { VITALITY_LABELS, isVitalityVisible } from '../constants'

export default {
  name: 'VitalityBadge',
  props: {
    /** 后端 impactVitality 字段（可为 null） */
    vitality: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const visible = computed(() => isVitalityVisible(props.vitality))
    const label = computed(() => (props.vitality ? VITALITY_LABELS[props.vitality.status] || '' : ''))
    return { visible, label }
  },
}
</script>

<style scoped>
.vitality-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--ev-r-full);
  font-size: var(--ev-font-xs);
  line-height: 1.5;
}

.vb-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.vb-text {
  font-size: var(--ev-font-xs);
  font-weight: 500;
}

/* 影响持续中：蓝（存活，语义色避开红涨绿跌） */
.vitality-badge.is-alive {
  background: var(--ev-primary-50);
}
.vitality-badge.is-alive .vb-dot {
  background: var(--ev-primary);
}
.vitality-badge.is-alive .vb-text {
  color: var(--ev-primary);
}

/* 影响减弱：琥珀 */
.vitality-badge.is-fading {
  background: var(--ev-warning-soft);
}
.vitality-badge.is-fading .vb-dot {
  background: var(--ev-warning);
}
.vitality-badge.is-fading .vb-text {
  color: var(--ev-warning);
}

/* 影响消退：浅灰（已钝化，弱化视觉权重） */
.vitality-badge.is-expired {
  background: var(--ev-bg-soft);
}
.vitality-badge.is-expired .vb-dot {
  background: var(--ev-text-muted);
}
.vitality-badge.is-expired .vb-text {
  color: var(--ev-text-muted);
}
</style>
