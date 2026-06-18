<template>
  <div class="stock-monitor-card">
    <div class="monitor-header">
      <h3 class="section-title">个股异动</h3>
      <div class="header-right">
        <div class="cycle-filter">
          <button
            v-for="opt in CYCLE_OPTIONS"
            :key="opt.key"
            :class="['cycle-btn', { 'is-active': activeCycle === opt.key }]"
            @click="onCycleChange(opt.key)"
          >
            {{ opt.label }}
          </button>
        </div>
        <router-link to="/stock-monitor" class="monitor-more-link">
          查看全部 <span class="arrow">&rarr;</span>
        </router-link>
      </div>
    </div>

    <div class="monitor-list">
      <div class="monitor-list-head">
        <span>股票</span>
        <span>来源</span>
        <span>影响</span>
        <span>关键词</span>
        <span>周期</span>
        <span>时间</span>
      </div>
      <div
        v-for="event in filteredEvents"
        :key="event.event_id"
        class="monitor-row"
        @click="goToStock(event.stock_code)"
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
          <div v-if="getDisplayKeywords(event).length > 0" class="keyword-tags">
            <span
              v-for="kw in getDisplayKeywords(event)"
              :key="kw"
              class="keyword-tag"
              :style="{ backgroundColor: getKeywordColor(kw) + '15', color: getKeywordColor(kw), borderColor: getKeywordColor(kw) + '40' }"
            >{{ kw }}</span>
          </div>
          <p v-else class="trend-summary">{{ event.summary || event.title || event.change_type_name }}</p>
        </div>
        <div class="level-cell">
          <span class="level-badge">{{ event.ai_horizon || event.cycle }}</span>
        </div>
        <div class="time-cell">{{ event.event_time_display }}</div>
      </div>
      <div v-if="filteredEvents.length === 0" class="empty-row">
        暂无个股异动数据
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
  name: 'StockMonitorCard',
  props: {
    events: {
      type: Array,
      default: () => []
    }
  },
  setup(props) {
    const router = useRouter()
    const activeCycle = ref('all')

    const filteredEvents = computed(() => {
      return filterEventsByCycle(props.events, activeCycle.value)
    })

    const onCycleChange = (cycle) => {
      activeCycle.value = cycle
    }

    const goToStock = (code) => {
      router.push({ name: 'stockDetail', params: { code } })
    }

    const getDisplayKeywords = (event) => {
      const decisive = filterDecisiveKeywords(event.ai_keywords)
      if (decisive.length > 0) return decisive
      return (event.ai_keywords || []).slice(0, 2)
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
      onCycleChange,
      goToStock
    }
  }
}
</script>

<style lang="scss" scoped>
.stock-monitor-card {
  .monitor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .section-title {
      margin: 0;
      font-size: 1.1rem;
      color: var(--text-primary);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .cycle-filter {
      display: flex;
      gap: 6px;

      .cycle-btn {
        padding: 4px 14px;
        border-radius: 16px;
        border: 1px solid var(--border-color);
        background: #fff;
        color: var(--text-secondary);
        font-size: 0.82rem;
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

    .monitor-more-link {
      font-size: 0.85rem;
      color: var(--primary-color);
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;

      .arrow { margin-left: 2px; }
      &:hover { text-decoration: underline; }
    }
  }

  .monitor-list {
    border: 1px solid #edf1f7;
    border-radius: 8px;
    overflow: hidden;
  }

  .monitor-list-head,
  .monitor-row {
    display: grid;
    grid-template-columns: minmax(120px, 0.9fr) minmax(86px, 0.6fr) minmax(82px, 0.55fr) minmax(180px, 1.4fr) 56px 72px;
    align-items: center;
    gap: 8px;
  }

  .monitor-list-head {
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

  .empty-row {
    text-align: center;
    color: var(--text-tertiary);
    padding: 30px 0;
    font-size: 0.88rem;
  }
}

@media (max-width: 768px) {
  .stock-monitor-card {
    .monitor-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;

      .header-right {
        width: 100%;
        justify-content: space-between;
      }
    }

    .monitor-list-head,
    .monitor-row {
      grid-template-columns: minmax(90px, 0.85fr) minmax(64px, 0.55fr) minmax(64px, 0.55fr) minmax(96px, 0.9fr) 44px 60px;
      gap: 4px;
    }

    .monitor-list-head {
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
