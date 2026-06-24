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

    <!-- 个股异动列表 -->
    <div class="monitor-table">
      <div class="monitor-table-head">
        <span>股票</span>
        <span>来源</span>
        <span>影响</span>
        <span>一句话摘要</span>
        <span>周期</span>
        <span>时间</span>
      </div>
      <div
        v-for="event in filteredEvents"
        :key="event.event_id"
        class="monitor-row"
        @click="goToDetail(event)"
      >
        <div class="stock-identity">
          <div class="stock-title-wrap">
            <h4>{{ event.stock_name }}</h4>
            <span v-if="event.industry" class="industry-tag">{{ event.industry }}</span>
            <span class="stock-code-line">{{ event.stock_code }}</span>
          </div>
        </div>
        <div class="stock-metrics">
          <span class="info-type-tag" :style="{ color: getInfoTypeColor(event.change_type), borderColor: getInfoTypeColor(event.change_type) + '60' }">
            {{ getInfoTypeLabel(event.change_type) }}
          </span>
        </div>
        <div class="event-metrics">
          <span class="impact-tag" :style="{ color: getImpactColor(event.level), borderColor: getImpactColor(event.level) + '60' }">
            {{ event.level }}
          </span>
        </div>
        <div class="change-info">
          <!-- 关键词标签（隐藏，后续可能用到） -->
          <div v-if="false && getDisplayKeywords(event).length > 0" class="keyword-tags">
            <span
              v-for="kw in getDisplayKeywords(event)"
              :key="kw"
              class="keyword-tag"
              :style="{ backgroundColor: getKeywordColor(kw) + '15', color: getKeywordColor(kw), borderColor: getKeywordColor(kw) + '40' }"
            >{{ kw }}</span>
          </div>
          <p class="trend-summary">{{ event.summary || event.title || event.change_type_name }}</p>
        </div>
        <div class="level-cell">
          <span class="level-badge">{{ event.ai_horizon || event.cycle }}</span>
        </div>
        <div class="time-cell">{{ formatEventTime(event.event_time_display || event.event_time) }}</div>
      </div>

      <div v-if="filteredEvents.length === 0" class="empty-state">
        <p>暂无个股异动数据</p>
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

    const goToDetail = (event) => {
      if (event.detail_url) {
        window.open(event.detail_url, '_blank')
      } else {
        router.push({ name: 'stockDetail', params: { code: event.stock_code } })
      }
    }

    const getDisplayKeywords = (event) => {
      const decisive = filterDecisiveKeywords(event.ai_keywords)
      if (decisive.length > 0) return decisive
      return (event.ai_keywords || []).slice(0, 2)
    }

    const formatEventTime = (timeStr) => {
      if (!timeStr) return ''
      // 已经是 MM-DD HH:mm 格式则直接返回
      if (/^\d{2}-\d{2}\s\d{2}:\d{2}$/.test(timeStr)) return timeStr
      try {
        const d = new Date(timeStr)
        if (isNaN(d.getTime())) return timeStr
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hour = String(d.getHours()).padStart(2, '0')
        const minute = String(d.getMinutes()).padStart(2, '0')
        return `${month}-${day} ${hour}:${minute}`
      } catch {
        return timeStr
      }
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
      getDisplayKeywords,
      formatEventTime,
      goToDetail
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

  .monitor-table {
    border: 1px solid #edf1f7;
    border-radius: 8px;
    overflow: hidden;
  }

  .monitor-table-head,
  .monitor-row {
    display: grid;
    grid-template-columns: minmax(120px, 0.9fr) minmax(64px, 0.4fr) minmax(60px, 0.35fr) minmax(220px, 1.8fr) 56px 110px;
    align-items: center;
    gap: 8px;
  }

  .monitor-table-head {
    min-height: 34px;
    padding: 0 12px;
    background: #f8fafc;
    border-bottom: 1px solid #edf1f7;
    color: var(--text-tertiary);
    font-size: 0.74rem;
    font-weight: 700;
  }

  .monitor-row {
    min-height: 54px;
    padding: 8px 12px;
    background: #fff;
    cursor: pointer;
    border-bottom: 1px solid #f0f3f8;
    transition: background 0.2s ease, box-shadow 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: #fbfdff;
      box-shadow: inset 3px 0 0 #4f7cff;
    }
  }

  .stock-identity {
    display: block;
    min-width: 0;

    .stock-title-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 6px;
      min-width: 0;

      h4 {
        margin: 0;
        min-width: 0;
        flex: 0 1 auto;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-primary);
        font-size: 0.92rem;
        line-height: 1.3;
      }

      .stock-code-line {
        flex: 0 0 100%;
        display: block;
        color: var(--text-tertiary);
        font-size: 0.72rem;
      }
    }
  }

  .industry-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 98px;
    min-height: 20px;
    padding: 1px 8px;
    border-radius: 999px;
    background: #eaf2ff;
    color: #1d4ed8;
    border: 1px solid #bcd2ff;
    font-size: 0.7rem;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }

  .stock-metrics {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    .info-type-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid;
      font-size: 0.74rem;
      font-weight: 700;
      white-space: nowrap;
    }
  }

  .event-metrics {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;

    .impact-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid;
      font-size: 0.74rem;
      font-weight: 700;
      white-space: nowrap;
    }
  }

  .change-info {
    min-width: 0;

    .keyword-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

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

    .trend-summary {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.76rem;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .level-cell {
    .level-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.72rem;
      font-weight: 600;
      border: 1px solid #cbd5e1;
      color: #475569;
    }
  }

  .time-cell {
    font-size: 0.76rem;
    color: var(--text-tertiary);
    white-space: nowrap;
  }

  .empty-state {
    text-align: center;
    padding: 40px 0;
    color: var(--text-tertiary);
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .stock-monitor-list {
    .monitor-table-head,
    .monitor-row {
      grid-template-columns: minmax(90px, 0.85fr) minmax(48px, 0.35fr) minmax(48px, 0.35fr) minmax(120px, 1.2fr) 44px 90px;
      gap: 4px;
    }

    .monitor-table-head {
      font-size: 0.68rem;
    }

    .monitor-row {
      padding: 6px 8px;
      min-height: 46px;
    }

    .stock-identity .stock-title-wrap h4 {
      font-size: 0.82rem;
    }

    .industry-tag {
      font-size: 0.64rem;
      padding: 1px 6px;
      max-width: 72px;
    }

    .stock-metrics .info-type-tag,
    .event-metrics .impact-tag {
      font-size: 0.66rem;
      padding: 1px 5px;
    }

    .change-info .trend-summary {
      font-size: 0.68rem;
    }

    .time-cell { font-size: 0.68rem; }
  }
}
</style>
