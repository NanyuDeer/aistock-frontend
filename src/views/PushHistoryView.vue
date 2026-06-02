<template>
  <main class="push-history-page">
    <header class="page-header">
      <div>
        <h1>推送历史</h1>
        <p>查看自选股异动提醒记录和今日推送榜单</p>
      </div>
      <el-button :loading="loading" type="primary" @click="refreshAll">刷新</el-button>
    </header>

    <el-tabs v-model="activeTab" class="push-tabs">
      <el-tab-pane label="推送记录" name="history">
        <section class="filter-row">
          <el-input
            v-model="filters.symbol"
            maxlength="6"
            clearable
            placeholder="股票代码"
            class="symbol-input"
            @keyup.enter="loadHistory"
          />
          <el-select v-model="filters.status" clearable placeholder="推送状态" class="status-select">
            <el-option label="已发送" value="sent" />
            <el-option label="已跳过" value="skipped" />
            <el-option label="失败" value="failed" />
          </el-select>
          <el-button :loading="historyLoading" @click="loadHistory">筛选</el-button>
        </section>

        <el-table
          v-loading="historyLoading"
          :data="historyItems"
          border
          class="data-table"
          empty-text="暂无推送记录"
        >
          <el-table-column prop="sent_at" label="时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.sent_at) }}</template>
          </el-table-column>
          <el-table-column label="股票" min-width="150">
            <template #default="{ row }">
              <div class="stock-cell">
                <strong>{{ row.stock_name || '-' }}</strong>
                <span>{{ row.stock_code }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="event_type" label="类型" width="110" />
          <el-table-column prop="level" label="等级" width="90">
            <template #default="{ row }">
              <el-tag :type="levelTagType(row.level)" size="small">{{ row.level || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="异动摘要" min-width="140" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="error_msg" label="备注" min-width="180">
            <template #default="{ row }">{{ row.error_msg || '-' }}</template>
          </el-table-column>
          <el-table-column label="详情" width="90">
            <template #default="{ row }">
              <el-button
                v-if="row.detail_url"
                link
                type="primary"
                @click="openDetail(row.detail_url)"
              >
                查看
              </el-button>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="今日榜单" name="ranking">
        <section class="filter-row">
          <el-date-picker
            v-model="rankingDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="date-input"
          />
          <el-button :loading="rankingLoading" @click="loadRanking">查询</el-button>
        </section>

        <el-table
          v-loading="rankingLoading"
          :data="rankingItems"
          border
          class="data-table"
          empty-text="暂无榜单数据"
        >
          <el-table-column prop="rank" label="排名" width="80" />
          <el-table-column label="股票" min-width="150">
            <template #default="{ row }">
              <div class="stock-cell">
                <strong>{{ row.stock_name || '-' }}</strong>
                <span>{{ row.stock_code }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="push_count" label="推送次数" width="110" />
          <el-table-column prop="max_level" label="最高等级" width="110">
            <template #default="{ row }">
              <el-tag :type="levelTagType(row.max_level)" size="small">{{ row.max_level || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="latest_summary" label="最近异动" min-width="140" />
          <el-table-column prop="sent_count" label="发送" width="90" />
          <el-table-column prop="failed_count" label="失败" width="90" />
          <el-table-column label="累计收益" width="110">
            <template #default="{ row }">
              {{ formatReturn(row.cumulative_return) }}
            </template>
          </el-table-column>
          <el-table-column prop="latest_sent_at" label="最近时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.latest_sent_at) }}</template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>

<script>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { stockApi } from '@/services/api'

export default {
  name: 'PushHistoryView',
  setup() {
    const activeTab = ref('history')
    const historyLoading = ref(false)
    const rankingLoading = ref(false)
    const historyItems = ref([])
    const rankingItems = ref([])
    const filters = reactive({
      symbol: '',
      status: ''
    })
    const rankingDate = ref(new Date().toISOString().slice(0, 10))
    const loading = computed(() => historyLoading.value || rankingLoading.value)

    const loadHistory = async () => {
      historyLoading.value = true
      try {
        const response = await stockApi.getPushHistory({
          limit: 50,
          symbol: filters.symbol.trim(),
          status: filters.status
        })
        historyItems.value = response?.data?.items || []
      } catch (error) {
        console.error('获取推送历史失败:', error)
        ElMessage.error('获取推送历史失败')
      } finally {
        historyLoading.value = false
      }
    }

    const loadRanking = async () => {
      rankingLoading.value = true
      try {
        const response = await stockApi.getPushRanking({
          date: rankingDate.value
        })
        rankingItems.value = response?.data?.items || []
      } catch (error) {
        console.error('获取推送榜单失败:', error)
        ElMessage.error('获取推送榜单失败')
      } finally {
        rankingLoading.value = false
      }
    }

    const refreshAll = async () => {
      await Promise.all([loadHistory(), loadRanking()])
    }

    const formatDateTime = (value) => {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 19)
      const pad = (num) => String(num).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    const statusText = (status) => ({
      sent: '已发送',
      skipped: '已跳过',
      failed: '失败'
    }[status] || status || '-')

    const statusTagType = (status) => ({
      sent: 'success',
      skipped: 'info',
      failed: 'danger'
    }[status] || 'info')

    const levelTagType = (level) => ({
      L4: 'danger',
      L3: 'warning',
      L2: 'primary',
      L1: 'info'
    }[level] || 'info')

    const formatReturn = (value) => {
      if (value === null || value === undefined || value === '') return '-'
      const num = Number(value)
      if (!Number.isFinite(num)) return '-'
      return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`
    }

    const openDetail = (url) => {
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    onMounted(refreshAll)

    return {
      activeTab,
      historyLoading,
      rankingLoading,
      historyItems,
      rankingItems,
      filters,
      rankingDate,
      loading,
      loadHistory,
      loadRanking,
      refreshAll,
      formatDateTime,
      statusText,
      statusTagType,
      levelTagType,
      formatReturn,
      openDetail
    }
  }
}
</script>

<style lang="scss" scoped>
.push-history-page {
  min-height: calc(100vh - 64px);
  padding: 96px 24px 40px;
  background: #f6f8fb;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1280px;
  margin: 0 auto 18px;

  h1 {
    margin: 0;
    color: #1f2937;
    font-size: 28px;
    font-weight: 700;
  }

  p {
    margin: 8px 0 0;
    color: #667085;
    font-size: 14px;
  }
}

.push-tabs {
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.symbol-input {
  width: 180px;
}

.status-select,
.date-input {
  width: 180px;
}

.data-table {
  width: 100%;
}

.stock-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: #111827;
    font-weight: 600;
  }

  span {
    color: #6b7280;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .push-history-page {
    padding: 84px 12px 28px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .push-tabs {
    padding: 12px;
  }

  .symbol-input,
  .status-select,
  .date-input {
    width: 100%;
  }
}
</style>
