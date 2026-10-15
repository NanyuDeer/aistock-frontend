<template>
  <div v-if="rows && rows.length" class="fav-related-card">
    <!-- 标题行：整行可点切换；右侧箭头表示展开态 -->
    <div class="fav-head" @click="toggle">
      <span class="fav-head-title">我的自选股 · {{ rows.length }} 条相关</span>
      <span class="fav-head-arrow" :class="{ 'is-expanded': expanded }" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 1024 1024" fill="none">
          <path d="M512 640 192 320l60-60 260 260 260-260 60 60z" fill="currentColor" />
        </svg>
      </span>
    </div>

    <ul class="fav-list">
      <li v-for="row in visibleRows" :key="row.event.eventId" class="fav-item">
        <div class="fav-item-head">
          <span class="fav-event-title" @click="goEvent(row.event)">{{ row.event.title }}</span>
          <span class="fav-event-date">{{ formatDate(row.event.publishTime) }}</span>
        </div>
        <div v-for="stock in row.matchedStocks" :key="stock.symbol" class="fav-reason">
          <span class="fav-reason-label">影响板块：</span>
          <span class="fav-reason-industry">{{ stock.matchedIndustry }}</span>
          <span class="fav-reason-arrow" aria-hidden="true">→</span>
          <span class="fav-reason-label">你的自选股：</span>
          <span class="fav-stock-chip" @click="goStock(stock)">{{ stock.name }}（{{ stock.industry }}）</span>
        </div>
      </li>
    </ul>

    <!-- 收起态且有超出：底部提示可展开 -->
    <div v-if="!expanded && rows.length > COLLAPSED_COUNT" class="fav-more" @click="toggle">
      还有 {{ rows.length - COLLAPSED_COUNT }} 条，点击展开
    </div>
  </div>
</template>

<script>
/**
 * FavoriteRelatedCard - 自选股相关事件收折卡片
 *
 * 数据来自 loadFavoriteRelatedEvents()（modules/event/favoriteRelated）。
 * rows 为空 → 组件整体不渲染（不占位、不显示空态）。
 *
 * Props: rows — Array<{ event, matchedStocks: [{symbol,name,industry,matchedIndustry}] }>
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const COLLAPSED_COUNT = 3

export default {
  name: 'FavoriteRelatedCard',
  props: {
    /** 相关事件行列表 */
    rows: {
      type: Array,
      default: () => [],
    },
  },
  setup(props) {
    const router = useRouter()
    // 默认收起，仅显示前 3 条
    const expanded = ref(false)

    const visibleRows = computed(() => (expanded.value ? props.rows : props.rows.slice(0, COLLAPSED_COUNT)))

    function toggle() {
      expanded.value = !expanded.value
    }

    /** 事件标题点击 → 事件详情 */
    function goEvent(event) {
      if (!event?.eventId) return
      router.push({ name: 'eventDetail', params: { id: event.eventId } })
    }

    /** 自选股胶囊点击 → 个股详情 */
    function goStock(stock) {
      if (!stock?.symbol) return
      router.push({ name: 'stockDetail', params: { code: stock.symbol } })
    }

    /** 发布时间 → MM-DD（紧凑展示，与卡片「近期相关」定位一致） */
    function formatDate(time) {
      if (!time) return ''
      const text = String(time)
      const date = new Date(text.replace(' ', 'T'))
      if (Number.isNaN(date.getTime())) {
        return text.length >= 10 ? text.slice(5, 10) : text
      }
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    return {
      COLLAPSED_COUNT,
      expanded,
      visibleRows,
      toggle,
      goEvent,
      goStock,
      formatDate,
    }
  },
}
</script>

<style scoped>
/* 卡片容器：与事件模块其它卡片一致的 token 配色（--ev-* 由全局样式定义，勿在 scoped 内新增 token） */
.fav-related-card {
  background: var(--ev-bg-card);
  border: 1px solid var(--ev-line);
  border-radius: var(--ev-r-lg);
  box-shadow: var(--ev-shadow-xs);
  margin-bottom: 16px;
  overflow: hidden;
}

/* 标题行：整行可点，展开/收起 */
.fav-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
}

.fav-head-title {
  font-size: var(--ev-font-md);
  font-weight: 700;
  color: var(--ev-text-primary);
}

.fav-head-arrow {
  display: inline-flex;
  align-items: center;
  color: var(--ev-text-muted);
  transition: transform 0.2s ease;
}

.fav-head-arrow.is-expanded {
  transform: rotate(180deg);
}

/* 列表 */
.fav-list {
  list-style: none;
  margin: 0;
  padding: 0 14px;
}

.fav-item {
  padding: 10px 0;
  border-top: 1px solid var(--ev-line-soft);
}

.fav-item-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

/* 事件标题：悬停变蓝表示可点（跳事件详情） */
.fav-event-title {
  flex: 1;
  min-width: 0;
  font-size: var(--ev-font-base);
  font-weight: 600;
  color: var(--ev-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.15s ease;
}

.fav-event-title:hover {
  color: var(--ev-primary);
}

.fav-event-date {
  flex-shrink: 0;
  font-size: var(--ev-font-xs);
  color: var(--ev-text-muted);
}

/* 关联理由行 */
.fav-reason {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: var(--ev-font-sm);
  color: var(--ev-text-secondary);
  line-height: 1.6;
}

.fav-reason-industry {
  font-weight: 600;
  color: var(--ev-text-primary);
}

.fav-reason-arrow {
  color: var(--ev-text-muted);
}

/* 自选股胶囊：点击跳个股详情 */
.fav-stock-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: var(--ev-r-full);
  background: var(--ev-primary-50);
  color: var(--ev-primary);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.fav-stock-chip:hover {
  background: var(--ev-primary-100);
}

/* 收起态底部「展开更多」提示 */
.fav-more {
  padding: 8px 14px 12px;
  font-size: var(--ev-font-sm);
  color: var(--ev-text-muted);
  text-align: center;
  cursor: pointer;
}

.fav-more:hover {
  color: var(--ev-primary);
}
</style>
