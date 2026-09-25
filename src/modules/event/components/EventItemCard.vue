<template>
  <div class="event-card" @click="handleCardClick">
    <!-- 第一行：事件类型 + 来源 + 时间 + 重要程度 -->
    <div class="card-header">
      <div class="header-left">
        <span class="card-type">{{ event.eventType }}</span>
        <span class="card-source" :class="{ 'source-unverified': !event.sourceInfo?.name && !event.source }">
          {{ event.sourceInfo?.name || event.source || '来源暂不可验证' }}
        </span>
        <span class="card-time">{{ formatTime(event.publishTime) }}</span>
        <!-- 原文入口：链接图标（对齐 APP links-line），点击打开原文；无原文/不可达域名不显示（点击冒泡到整卡详情） -->
        <span
          v-if="event.sourceInfo?.url"
          class="card-link"
          title="查看原文"
          @click.stop="handleLinkClick"
        >
          <el-icon :size="12"><IconLink /></el-icon>
        </span>
      </div>
      <ImportanceStars v-if="event.importance" :level="event.importance" :size="12" />
    </div>

    <!-- 事件标题（最多2行，点击冒泡到整卡进入事件机会洞见，不再单独跳原文） -->
    <h3 class="card-title">{{ event.title }}</h3>

    <!-- Top5 影响行业（排序后取前5，不换行） -->
    <div class="card-top5" v-if="top5Industries.length">
      <span
        v-for="ind in top5Industries"
        :key="ind.name"
        class="top5-item"
        :class="'t5-' + ind.sentiment"
      >
        {{ ind.name }}<span class="t5-arrow">{{ ind.sentiment === 'bullish' ? '↑' : ind.sentiment === 'bearish' ? '↓' : '→' }}</span>
      </span>
    </div>
    <!-- 空行业降级：对齐 APP，不暴露系统内部异常 -->
    <div class="card-top5 t5-empty" v-else>暂无明确行业影响</div>

    <!-- AI 摘要 + 操作按钮 -->
    <div class="card-bottom">
      <div class="card-ai-summary" v-if="event.aiSummary">
        <!-- AI洞见字标（与 APP 洞见徽标同源，无背景小图） -->
        <span class="ai-badge-wm"></span>
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
          {{ event.isFollowed ? '已关注' : '关注' }}
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
import { Link } from '@element-plus/icons-vue'
import ImportanceStars from './ImportanceStars.vue'

export default {
  name: 'EventItemCard',
  components: {
    ImportanceStars,
    // Link 是 HTML 保留字，改名注册避免 vue/no-reserved-component-names
    IconLink: Link,
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

    /** 链接图标点击 → 打开原文（阻止冒泡，避免触发整卡详情跳转） */
    function handleLinkClick() {
      emit('view-news', props.event)
    }

    return {
      top5Industries,
      formatTime,
      handleCardClick,
      handleLinkClick,
    }
  },
}
</script>

<style scoped>
.event-card {
  background: var(--ev-bg-card);
  border-radius: var(--ev-r-lg);
  padding: 14px 16px;
  border: 1px solid var(--ev-line);
  box-shadow: var(--ev-shadow-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}

.event-card:hover {
  box-shadow: var(--ev-shadow-sm);
  border-color: var(--ev-line-strong);
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
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
  background: #ffffff; /* 对齐 APP：事件类型标签白底 */
  color: #8a96b0;      /* 对齐 APP $ink-mute */
  border: 1px solid #eef3fb;
  white-space: nowrap;
}

.card-time {
  font-size: 11px;
  color: var(--ev-text-muted); /* 对齐 APP $ink-mute */
  flex-shrink: 0;
}

.card-source {
  font-size: 11px;
  color: var(--ev-text-muted); /* 对齐 APP $ink-mute */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 来源不可验证：warning 橙提示（对齐 APP sourceTagType='warning'） */
.source-unverified {
  color: #e6a23c;
  font-weight: 500;
}

/* ========== 标题（最多2行，超出省略） ========== */
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ev-text-primary); /* 对齐 APP $ink */
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

/* 原文入口链接图标：与时间同行、同色对齐（对齐 APP links-line 22rpx / $ink-mute），点击打开原文 */
.card-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ev-text-muted); /* 对齐 APP $ink-mute #8a96b0 */
  cursor: pointer;
  line-height: 1;
  transition: color 0.15s ease;
}

.card-link:hover {
  color: var(--ev-text-primary);
}

/* ========== Top5 影响行业 ========== */
.card-top5 {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.top5-item {
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  background: transparent; /* 行业外面无框/无底，只有名称+红绿箭头（对齐 APP） */
  color: #4b5a7a;          /* 行业名中性灰 $ink-soft */
}

.t5-arrow {
  margin-left: 3px;
  font-weight: 700;
  font-size: 10px;
}

/* 方向箭头保留行情色（A股 红涨绿跌），行业名不承载语义色 */
.t5-bullish .t5-arrow { color: #e54d5e; }
.t5-bearish .t5-arrow { color: #18a058; }
.t5-neutral .t5-arrow { color: #8a96b0; }

/* 空行业降级文案 */
.t5-empty {
  font-size: 12px;
  color: #9ca3af;
  padding: 3px 0;
  overflow: visible;
}

/* ========== 底部：AI 摘要 + 操作按钮 ========== */
.card-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--ev-line);
}

/* AI 摘要 */
.card-ai-summary {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

/* AI 洞见字标（对齐 APP：洞见 wordmark PNG，无背景小图） */
.ai-badge-wm {
  flex-shrink: 0;
  width: 40px;
  height: 20px;
  background-image: url('@/assets/insight-wordmark.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  align-self: center;
}

.ai-text {
  flex: 1;
  font-size: 12px;
  color: #8a96b0; /* 对齐 APP $ink-mute */
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
</style>