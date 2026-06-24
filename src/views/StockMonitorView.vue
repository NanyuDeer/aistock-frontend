<template>
  <div class="monitor-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <div class="page-header">
          <h2 class="page-title">个股异动</h2>
          <p class="page-desc">聚合外部爬虫返回的公告和新闻研判，发现个股异动线索</p>
        </div>

        <!-- 统计概览 -->
        <div class="stats-row">
          <div class="stat-card" v-for="stat in stats" :key="stat.label">
            <span class="stat-value" :class="stat.cls">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>

        <!-- 个股异动列表 -->
        <div class="monitor-content">
          <StockMonitorList
            :events="allEvents"
            :show-cycle-filter="true"
            default-cycle="all"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import TheNavbar from '@/components/TheNavbar.vue'
import StockMonitorList from '@/components/StockMonitorList.vue'
import { trendHotspotApi } from '@/services/api'

export default {
  name: 'StockMonitorView',
  components: { TheNavbar, StockMonitorList },
  setup() {
    const allEvents = ref([])

    const fetchEvents = async () => {
      try {
        const res = await trendHotspotApi.getEvents({ cycle: 'all', limit: 100 })
        const events = res?.data?.events || []
        allEvents.value = events.map(e => ({
          ...e,
          stock_code: (e.stock_code || e.symbol || '').replace(/^(SH|SZ)/, ''),
          industry: e.industry || '',
          change_type: e.change_type || '',
          change_type_name: e.change_type_name || e.summary || '',
          price: e.price ?? 0,
          change_pct: e.change_pct ?? 0,
          event_time_display: e.event_time_display || formatEventTime(e.event_time),
        }))
      } catch (err) {
        console.warn('[StockMonitorView] 获取个股异动数据失败:', err)
      }
    }

    const formatEventTime = (timeStr) => {
      if (!timeStr) return ''
      try {
        const d = new Date(timeStr)
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hour = String(d.getHours()).padStart(2, '0')
        const minute = String(d.getMinutes()).padStart(2, '0')
        return `${month}-${day} ${hour}:${minute}`
      } catch {
        return timeStr
      }
    }

    onMounted(() => {
      fetchEvents()
    })

    const stats = computed(() => {
      const events = allEvents.value
      const announcement = events.filter(e => e.info_type === 'announcement' || e.change_type === 'announcement').length
      const news = events.filter(e => e.info_type === 'news' || e.change_type === 'news').length
      const positive = events.filter(e => ['重大利好', '利好'].includes(e.ai_impact || e.level)).length
      const negative = events.filter(e => ['重大利空', '利空'].includes(e.ai_impact || e.level)).length
      const total = events.length
      return [
        { label: '异动总数', value: total, cls: '' },
        { label: '公告', value: announcement, cls: 'up' },
        { label: '新闻', value: news, cls: 'up' },
        { label: '利好', value: positive, cls: 'up' },
        { label: '利空', value: negative, cls: 'down' },
      ]
    })

    return { allEvents, stats }
  }
}
</script>

<style lang="scss" scoped>
.monitor-page {
  padding-top: 80px;
  min-height: 100vh;
  background: var(--background-color);

  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 15px;
  }

  .page-header {
    margin-bottom: 20px;

    .page-title {
      font-size: 1.4rem;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .page-desc {
      font-size: 0.9rem;
      color: var(--text-tertiary);
    }
  }

  .stats-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;

    .stat-card {
      flex: 1;
      min-width: 100px;
      background: #fff;
      border-radius: 8px;
      padding: 14px 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text-primary);

        &.up { color: var(--danger-color); }
        &.down { color: var(--success-color); }
      }

      .stat-label {
        font-size: 0.8rem;
        color: var(--text-tertiary);
      }
    }
  }

  .monitor-content {
    background: #fff;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }
}

@media (max-width: 768px) {
  .monitor-page .stats-row .stat-card {
    min-width: 80px;
    padding: 10px 12px;

    .stat-value { font-size: 1.2rem; }
  }
}
</style>
