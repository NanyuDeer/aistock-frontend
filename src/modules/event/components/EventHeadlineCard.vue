<template>
  <div
    class="event-headline-card"
    :class="`event-headline-card--${type}`"
    @click="handleClick"
  >
    <!-- 双层结构·上层：顶部语义渐变色块 + 左侧语义竖线，承载焦点标识（白字，零红绿在正文之外） -->
    <div class="panel-top">
      <!-- 火焰图标（与 APP SvgIcon name="fire-fill" 同一几何：1024 viewBox，白色实心火焰） -->
      <svg class="panel-flame" width="18" height="18" viewBox="0 0 1024 1024" fill="none" aria-hidden="true">
        <path
          d="M512 981.333333a320 320 0 0 1-219.221333-553.088C350.037333 374.357333 490.666667 277.333333 469.333333 64c256 170.666667 384 341.333333 128 597.333333 42.666667 0 106.666667 0 213.333334-105.386666 11.52 32.981333 21.333333 68.437333 21.333333 105.386666A320 320 0 0 1 512 981.333333z"
          fill="#ffffff"
        />
      </svg>
      <span class="panel-title">{{ headlineTitle }}</span>
    </div>

    <!-- 双层结构·下层：白色正文区，纯黑白灰（标题 + 灰色行业标签 + 方向箭头），不承担红/绿语义 -->
    <div class="panel-body">
      <!-- 事件标题：点击跳原文（触摸变蓝与列表一致），阻止冒泡避免触发整卡跳详情 -->
      <span
        class="event-title"
        @click.stop="handleTitleClick"
      >{{ title }}</span>

      <div class="industries-container">
        <span
          v-for="(industry, index) in displayIndustries"
          :key="index"
          class="industry-tag"
        >
          {{ industry.name }}
          <span class="industry-arrow" :class="'industry-arrow--' + industry.sentiment">
            {{ industry.sentiment === 'bullish' ? '↑' : industry.sentiment === 'bearish' ? '↓' : '→' }}
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * EventHeadlineCard - AI 关注焦点高亮卡片
 *
 * 对齐 APP：Card 容器 + 双平面结构——
 * 上层：顶部语义渐变色块（机会正红渐变 / 风险正绿渐变）+ 左侧语义竖线 + 白字「重大机会/重大风险」
 * 下层：白色正文区（事件标题 + 灰色行业标签 + 方向箭头），纯黑白灰，不承担红/绿语义
 *
 * Props: type/title/importance/industries/eventId/sourceUrl
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'

export default {
  name: 'EventHeadlineCard',
  props: {
    /** 事件方向：利好/利空 */
    type: {
      type: String,
      required: true,
      validator: (value) => ['positive', 'negative'].includes(value),
    },
    /** 事件标题 */
    title: {
      type: String,
      required: true,
    },
    /** 重要性：重大/重要 */
    importance: {
      type: String,
      default: 'normal',
      validator: (value) => ['major', 'normal'].includes(value),
    },
    /**
     * 影响行业（全量展示，超出由 flex-wrap 换行），兼容两种形态：
     * - string[]：仅名称，无方向
     * - { name, sentiment }[]：含涨跌方向
     */
    industries: {
      type: Array,
      default: () => [],
    },
    /** 事件ID（用于跳转详情） */
    eventId: {
      type: String,
      default: '',
    },
    /** 原文链接（新标签打开） */
    sourceUrl: {
      type: String,
      default: '',
    },
  },
  emits: ['click', 'view-news'],
  setup(props, { emit }) {
    function handleClick() {
      if (props.eventId) emit('click', props.eventId)
    }

    /** 标题点击 → 跳转原文；无链接降级提示，不触发整卡详情跳转 */
    function handleTitleClick() {
      if (!props.sourceUrl) {
        ElMessage.warning('暂无原文链接')
        return
      }
      window.open(props.sourceUrl, '_blank', 'noopener,noreferrer')
    }

    /** 方向文本（更符合投资用户理解） */
    const directionText = computed(() => (props.type === 'positive' ? '机会' : '风险'))

    /** 整体标题：major 时「重大机会/重大风险」；否则「机会/风险」 */
    const headlineTitle = computed(() => {
      const base = directionText.value
      return props.importance === 'major' ? `重大${base}` : base
    })

    /** 归一化行业：统一为 { name, sentiment }，兼容 string / object */
    const normalizedIndustries = computed(() => {
      return (props.industries || [])
        .map((item) => {
          if (typeof item === 'string') return { name: item, sentiment: 'neutral' }
          return {
            name: item?.name || '',
            sentiment: item?.sentiment || 'neutral',
          }
        })
        .filter((item) => item.name)
    })

    const displayIndustries = computed(() => normalizedIndustries.value)

    return {
      handleClick,
      handleTitleClick,
      headlineTitle,
      displayIndustries,
    }
  },
}
</script>

<style scoped>
/* ===== 卡片容器：白底 + 左侧语义竖线 + 柔和蓝调投影（对齐 APP Card + border-left） ===== */
.event-headline-card {
  position: relative;
  padding: 0;
  border-radius: 8px;
  border-left: 3px solid; /* 6rpx：仅保留左侧语义竖线，标出卡片边界 */
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 4px 20px -8px rgba(11, 95, 255, 0.12), 0 2px 6px -2px rgba(11, 95, 255, 0.06);
  cursor: pointer;
  width: 100%;
  min-width: 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.event-headline-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(11, 95, 255, 0.18);
}

/* 语义竖线：机会=正红，风险=正绿 */
.event-headline-card--positive { border-left-color: #d81f1f; }
.event-headline-card--negative { border-left-color: #0d9e43; }

/* ===== 上层：顶部语义渐变色块 ===== */
.panel-top {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  flex-shrink: 0;
}

.event-headline-card--positive .panel-top {
  background: linear-gradient(180deg, #e22c2c, #d81f1f);
}

.event-headline-card--negative .panel-top {
  background: linear-gradient(180deg, #0faa4a, #0d9e43);
}

.panel-flame {
  flex-shrink: 0;
}

/* 白字标题（重大机会/重大风险）：色块上加大加粗，保证一眼可辨 */
.panel-title {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* ===== 下层：白色正文区 ===== */
.panel-body {
  padding: 10px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* 事件标题：单行省略；触摸/悬停变蓝表示可跳原文 */
.event-title {
  font-size: 14px;
  font-weight: 600;
  color: #0a1733;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.15s ease;
}

.event-title:hover,
.event-title:active {
  color: #0b5fff; /* 对齐 APP $primary：点标题→跳原文变蓝 */
}

/* 影响行业：无框无底，仅名称 + 方向箭头（涨红/跌绿/中性灰，对齐 APP） */
.industries-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  min-width: 0;
}

.industry-tag {
  font-size: 11px;
  font-weight: 500;
  background: transparent;
  color: #4b5a7a;
  white-space: nowrap;
  flex-shrink: 0;
}

.industry-arrow {
  margin-left: 3px;
  font-weight: 700;
  font-size: 10px;
}

.industry-arrow--bullish { color: #e54d5e; }
.industry-arrow--bearish { color: #18a058; }
.industry-arrow--neutral { color: #8a96b0; }
</style>