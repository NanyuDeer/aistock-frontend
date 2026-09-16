<template>
  <div class="as-timeline">
    <div v-for="(ev, idx) in events" :key="ev.historyId || ev.year + ev.title" class="as-timeline__item">
      <!-- 左侧轨道：圆点 + 连接线 -->
      <div class="as-timeline__rail">
        <div class="as-timeline__dot" :class="`is-${typeOf(ev)}`" />
        <div v-if="idx !== events.length - 1" class="as-timeline__line" />
      </div>
      <!-- 右侧内容卡片 -->
      <div class="as-timeline__card">
        <div class="as-timeline__header">
          <span class="as-timeline__time">{{ ev.year }}</span>
          <span class="as-timeline__tag" :class="`is-${typeOf(ev)}`">{{ typeLabel(ev) }}</span>
        </div>
        <span class="as-timeline__title">{{ ev.title }}</span>
        <span v-if="ev.industryChange" class="as-timeline__desc">{{ ev.industryChange }}</span>
        <div v-if="formatPercent(ev.changePercentage)" class="as-timeline__footer">
          <span class="as-timeline__extra" :class="`is-${typeOf(ev)}`">{{ formatPercent(ev.changePercentage) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * HistoryTimeline — Web 端历史验证时间线
 *
 * 镜像 APP 端 shared Timeline 组件（HistoryTimeline 数据适配器 → Timeline）。
 * A股红涨绿跌：bullish(利好)=红(up / --ev-negative)，bearish(利空)=绿(down / --ev-positive)，neutral=灰。
 *
 * 视觉结构（卡片化）：左侧轨道（圆点+连接线）+ 右侧内容卡片（时间+利好/利空标签 + 标题 + 描述 + 涨跌幅）。
 *
 * Props: events — Array<HistoryEvent> { year, title, industryChange, sentiment, changePercentage, historyId }
 */
export default {
  name: 'HistoryTimeline',
  props: {
    events: { type: Array, default: () => [] },
  },
  methods: {
    /** sentiment → Timeline type：up=利好(红) / down=利空(绿) / neutral=中性(灰) */
    typeOf(ev) {
      const s = ev?.sentiment
      if (s === 'bullish' || s === 'positive') return 'up'
      if (s === 'bearish' || s === 'negative') return 'down'
      return 'neutral'
    },
    /** 类型标签文案 */
    typeLabel(ev) {
      return { up: '利好', down: '利空', neutral: '中性' }[this.typeOf(ev)]
    },
    formatPercent(p) {
      if (typeof p !== 'number' || Number.isNaN(p)) return ''
      return `${p >= 0 ? '+' : ''}${p}%`
    },
  },
}
</script>

<style lang="scss" scoped>
.as-timeline {
  display: flex;
  flex-direction: column;
}

.as-timeline__item {
  position: relative;
  padding-left: 24px; /* 左侧轨道宽度 */
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

/* 左侧轨道：圆点 + 连接线 */
.as-timeline__rail {
  position: absolute;
  left: 0;
  top: 0;
  width: 16px;
  height: 100%;
}

.as-timeline__dot {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 10px;
  height: 10px;
  border-radius: var(--ev-r-full);
  z-index: 2;

  &.is-up {
    background: var(--ev-negative); /* 利好=红 */
    box-shadow: 0 0 0 3px rgba(229, 77, 94, 0.18);
  }

  &.is-down {
    background: var(--ev-positive); /* 利空=绿 */
    box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.18);
  }

  &.is-neutral {
    background: var(--ev-text-muted);
    box-shadow: 0 0 0 3px rgba(138, 150, 176, 0.18);
  }
}

/* 连接线：从当前圆点底部延伸至下一项圆点顶部，保证竖线连续（宽度对齐 APP 2rpx→1px） */
.as-timeline__line {
  position: absolute;
  top: 28px;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: var(--ev-line);
}

/* 右侧内容卡片 */
.as-timeline__card {
  background: var(--ev-bg-card);
  border: 1px solid var(--ev-line);
  border-radius: var(--ev-r-md);
  box-shadow: var(--ev-shadow-xs);
  padding: 12px;
}

.as-timeline__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
}

.as-timeline__time {
  font-size: 12px;
  color: var(--ev-text-muted);
}

.as-timeline__tag {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;

  &.is-up {
    background: var(--ev-negative-soft);
    color: var(--ev-negative);
  }

  &.is-down {
    background: var(--ev-positive-soft);
    color: var(--ev-positive);
  }

  &.is-neutral {
    background: var(--ev-bg-deep);
    color: var(--ev-text-muted);
  }
}

.as-timeline__title {
  display: block;
  font-size: var(--ev-font-md);
  font-weight: 600;
  color: var(--ev-text-primary);
  line-height: 1.4;
  margin-bottom: 5px;
}

.as-timeline__desc {
  display: block;
  font-size: var(--ev-font-sm);
  color: var(--ev-text-secondary);
  line-height: 1.6;
}

.as-timeline__footer {
  margin-top: 8px;
}

.as-timeline__extra {
  font-size: var(--ev-font-sm);
  font-weight: 700;

  &.is-up {
    color: var(--ev-negative);
  }

  &.is-down {
    color: var(--ev-positive);
  }

  &.is-neutral {
    color: var(--ev-text-muted);
  }
}
</style>