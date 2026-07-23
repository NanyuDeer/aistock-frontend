<template>
  <div class="event-card" @click="handleCardClick">
    <!-- 第一行：事件类型 + 来源 + 时间 + 重要程度 -->
    <div class="card-header">
      <div class="header-left">
        <span class="card-type" :style="{ color: typeColor.text, background: typeColor.bg }">
          {{ event.eventType }}
        </span>
        <span class="card-source" :class="{ 'source-unverified': !event.sourceInfo?.name && !event.source }">
          {{ event.sourceInfo?.name || event.source || '来源暂不可验证' }}
        </span>
        <span class="card-time">{{ formatTime(event.publishTime) }}</span>
      </div>
      <ImportanceStars :level="event.importance" :size="12" />
    </div>

    <!-- 事件标题（最多2行，点击跳转新闻） -->
    <h3 class="card-title" @click.stop="$emit('view-news', event)">{{ event.title }}</h3>

    <!-- Top5 影响行业（排序后取前5，不换行） -->
    <div class="card-top5">
      <span
        v-for="ind in top5Industries"
        :key="ind.name"
        class="top5-item"
        :class="'t5-' + ind.sentiment"
      >
        {{ ind.name }}<span class="t5-arrow">{{ ind.sentiment === 'bullish' ? '↑' : ind.sentiment === 'bearish' ? '↓' : '→' }}</span>
      </span>
    </div>

    <!-- AI 摘要 + 操作按钮 -->
    <div class="card-bottom">
      <div class="card-ai-summary" v-if="event.aiSummary">
        <span class="ai-badge">AI</span>
        <span class="ai-text">{{ event.aiSummary }}</span>
      </div>
      <div class="card-actions">
        <el-button
          class="follow-btn"
          :class="{ followed: event.isFollowed }"
          type="default"
          size="small"
          round
          @click.stop="$emit('toggle-follow', event)"
        >
          {{ event.isFollowed ? '✓ 已关注' : '+ 关注' }}
        </el-button>
        <el-button
          class="detail-btn"
          type="primary"
          size="small"
          round
          @click.stop="$emit('view-detail', event)"
        >
          <el-icon class="robot-icon"><Monitor /></el-icon>
          AI解析 ›
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 事件列表核心卡片组件
 *
 * Props:
 * - event: Object — 事件数据（与 eventAdapter 输出结构一致）
 *
 * Emits:
 * - toggle-follow — 切换关注状态
 * - view-detail — 查看详情
 * - view-news — 查看新闻原文
 */
import { computed } from 'vue'
import { Monitor } from '@element-plus/icons-vue'
import ImportanceStars from './ImportanceStars.vue'
import { EVENT_TYPE_COLORS } from '../constants'

export default {
  name: 'EventItemCard',
  components: {
    ImportanceStars,
    Monitor,
  },
  props: {
    /** 事件数据（与 eventAdapter.adaptEventItem 输出结构一致） */
    event: {
      type: Object,
      required: true,
    },
  },
  emits: ['toggle-follow', 'view-detail', 'view-news'],
  setup(props, { emit }) {
    /** 事件类型颜色（按类型映射） */
    const typeColor = computed(() => {
      return EVENT_TYPE_COLORS[props.event.eventType] || { bg: '#f0f2f5', text: '#6b7280' }
    })

    /** 按 impactLevel 降序取前5个行业 */
    const top5Industries = computed(() => {
      if (!props.event.affectedIndustries || props.event.affectedIndustries.length === 0) {
        return []
      }
      return [...props.event.affectedIndustries]
        .sort((a, b) => b.impactLevel - a.impactLevel)
        .slice(0, 5)
    })

    /** 格式化发布时间 */
    function formatTime(time) {
      if (!time) return ''
      const d = new Date(time)
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time.slice(11, 16)}`
    }

    function handleCardClick() {
      emit('view-detail', props.event)
    }

    return {
      typeColor,
      top5Industries,
      formatTime,
      handleCardClick,
    }
  },
}
</script>

<style scoped>
.event-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s ease;
}

.event-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #d1d5db;
}

/* ========== 第一行：事件类型 + 时间 + 重要程度 ========== */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.card-type {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.card-time {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}

.card-source {
  font-size: 11px;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-unverified {
  font-style: italic;
  color: #d1d5db;
  opacity: 0.7;
}

/* ========== 标题（最多2行，超出省略） ========== */
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.card-title:hover {
  color: #3b82f6;
}

/* ========== Top5 影响行业 ========== */
.card-top5 {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.top5-item {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.t5-arrow {
  margin-left: 2px;
  font-weight: 700;
  font-size: 10px;
}

.t5-bullish {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.15);
  color: #f43f5e;
}

.t5-bearish {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.t5-neutral {
  background: #f1f5f9;
  border: 1px solid rgba(148, 163, 184, 0.1);
  color: #6b7280;
}

/* ========== 底部：AI 摘要 + 操作按钮 ========== */
.card-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

/* AI 摘要 */
.card-ai-summary {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.ai-badge {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3b82f6;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin-top: 1px;
}

.ai-text {
  flex: 1;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 按钮组 */
.card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.follow-btn.followed {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.25);
  color: #f59e0b;
}

.detail-btn .robot-icon {
  margin-right: 4px;
}
</style>