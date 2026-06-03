<template>
  <div class="monitor-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <div class="page-header">
          <h2 class="page-title">个股异动监测</h2>
          <p class="page-desc">实时追踪全市场个股异动，捕捉交易机会</p>
        </div>

        <!-- 统计概览 -->
        <div class="stats-row">
          <div class="stat-card" v-for="stat in stats" :key="stat.label">
            <span class="stat-value" :class="stat.cls">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>

        <!-- 异动列表 -->
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
import { monitorApi } from '@/services/api'

export default {
  name: 'MonitorView',
  components: { TheNavbar, StockMonitorList },
  setup() {
    const allEvents = ref([])

    const fetchEvents = async () => {
      try {
        const res = await monitorApi.getEvents({ cycle: 'all', limit: 100 })
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
        console.warn('[MonitorView] 获取异动数据失败:', err)
      }
    }

    const formatEventTime = (timeStr) => {
      if (!timeStr) return ''
      try {
        const d = new Date(timeStr)
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      } catch {
        return timeStr
      }
    }

    onMounted(() => {
      fetchEvents()
    })

    const stats = computed(() => {
      const events = allEvents.value
      const limitUp = events.filter(e => e.change_type === '4').length
      const limitDown = events.filter(e => e.change_type === '8').length
      const rocket = events.filter(e => e.change_type === '8193').length
      const dive = events.filter(e => e.change_type === '8194').length
      const total = events.length
      return [
        { label: '异动总数', value: total, cls: '' },
        { label: '涨停', value: limitUp, cls: 'up' },
        { label: '跌停', value: limitDown, cls: 'down' },
        { label: '火箭发射', value: rocket, cls: 'up' },
        { label: '加速下跌', value: dive, cls: 'down' },
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
