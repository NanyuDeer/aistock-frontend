<template>
  <div class="stock-monitor-list">
    <!-- 周期筛选标签 -->
    <div v-if="showCycleFilter" class="cycle-filter">
      <button
        v-for="opt in CYCLE_OPTIONS"
        :key="opt.key"
        :class="['cycle-btn', { 'is-active': activeCycle === opt.key }]"
        @click="activeCycle = opt.key"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- 媒体关注榜列表 -->
    <div class="monitor-events">
      <div
        v-for="event in filteredEvents"
        :key="event.event_id"
        class="event-row"
        @click="goToStock(event.stock_code)"
      >
        <div class="event-main">
          <div class="event-stock">
            <span class="stock-name">{{ event.stock_name }}</span>
            <span class="stock-code">{{ event.stock_code }}</span>
          </div>
          <div class="event-tags">
            <span
              class="change-tag"
              :style="{ backgroundColor: getInfoTypeColor(event.change_type) + '18', color: getInfoTypeColor(event.change_type), borderColor: getInfoTypeColor(event.change_type) + '40' }"
            >
              {{ getInfoTypeLabel(event.change_type) }}
            </span>
            <span class="level-tag" :style="{ color: getImpactColor(event.level) }">
              {{ event.level }}
            </span>
          </div>
          <div class="event-price-info">
            <span class="price">{{ event.ai_horizon || '--' }}</span>
            <span class="change">{{ event.source || '--' }}</span>
          </div>
        </div>
        <div class="event-meta">
          <span v-if="event.title" class="meta-item trend-title">
            {{ event.title }}
          </span>
          <div v-if="event.ai_keywords && event.ai_keywords.length > 0" class="event-keywords">
            <span
              v-for="kw in filterDecisiveKeywords(event.ai_keywords)"
              :key="kw"
              class="keyword-tag"
              :style="{ backgroundColor: getKeywordColor(kw) + '15', color: getKeywordColor(kw), borderColor: getKeywordColor(kw) + '40' }"
            >{{ kw }}</span>
          </div>
          <span v-else-if="event.summary" class="meta-item trend-summary">
            {{ event.summary }}
          </span>
          <span class="meta-time">{{ event.event_time_display }}</span>
        </div>
      </div>

      <div v-if="filteredEvents.length === 0" class="empty-state">
        <p>暂无媒体关注榜数据</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  CYCLE_OPTIONS,
  filterEventsByCycle,
  getImpactColor,
  getInfoTypeColor,
  getInfoTypeLabel,
  getKeywordColor,
  filterDecisiveKeywords,
} from '@/utils/trendHotspotConstants'

export default {
  name: 'StockMonitorList',
  props: {
    events: {
      type: Array,
      default: () => []
    },
    showCycleFilter: {
      type: Boolean,
      default: true
    },
    defaultCycle: {
      type: String,
      default: 'all'
    }
  },
  setup(props) {
    const router = useRouter()
    const activeCycle = ref(props.defaultCycle)

    const filteredEvents = computed(() => {
      return filterEventsByCycle(props.events, activeCycle.value)
    })

    const goToStock = (code) => {
      router.push({ name: 'stockDetail', params: { code } })
    }

    return {
      activeCycle,
      filteredEvents,
      CYCLE_OPTIONS,
      getImpactColor,
      getInfoTypeColor,
      getInfoTypeLabel,
      getKeywordColor,
      filterDecisiveKeywords,
      goToStock
    }
  }
}
</script>

<style lang="scss" scoped>
.stock-monitor-list {
  .cycle-filter {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;

    .cycle-btn {
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid var(--border-color);
      background: #fff;
      color: var(--text-secondary);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
      }

      &.is-active {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: #fff;
      }
    }
  }

  .monitor-events {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .event-row {
    padding: 12px 14px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: box-shadow 0.2s, transform 0.15s;

    &:hover {
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-1px);
    }

    .event-main {
      display: flex;
      align-items: center;
      gap: 14px;

      .event-stock {
        flex: 0 0 110px;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .stock-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .stock-code {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }
      }

      .event-tags {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;

        .change-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.78rem;
          font-weight: 500;
          border: 1px solid;
          white-space: nowrap;
        }

        .level-tag {
          font-size: 0.72rem;
          font-weight: 600;
          opacity: 0.8;
        }
      }

      .event-price-info {
        flex: 0 0 100px;
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .price {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .change {
          font-size: 0.8rem;
          font-weight: 500;
        }

        color: #475569;
      }
    }

    .event-meta {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;

      .meta-item {
        font-size: 0.78rem;
        color: var(--text-tertiary);
        min-width: 0;

        strong {
          color: var(--text-secondary);
          font-weight: 500;
        }
      }

      .trend-title,
      .trend-summary {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .trend-title {
        flex: 1;
        min-width: 0;
        color: var(--text-secondary);
      }

      .trend-summary {
        flex: 1;
        min-width: 0;
      }

      .event-keywords {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        flex-shrink: 0;

        .keyword-tag {
          display: inline-block;
          padding: 1px 8px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 600;
          border: 1px solid;
          white-space: nowrap;
        }
      }

      .meta-time {
        flex-shrink: 0;
        font-size: 0.75rem;
        color: var(--text-tertiary);
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: var(--text-tertiary);
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .stock-monitor-list .event-row .event-main {
    flex-wrap: wrap;
    gap: 8px;

    .event-stock { flex: 0 0 auto; }
    .event-tags { flex: 1; }
    .event-price-info { flex: 0 0 auto; }
  }
}
</style>
