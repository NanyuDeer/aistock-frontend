<template>
  <div class="forecast-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <el-card shadow="never" class="table-card" v-loading="loading">
          <div class="filter-bar">
            <el-form inline label-width="80px">
              <el-form-item label="报告期">
                <el-select v-model="filters.reportPeriod" placeholder="全部" clearable style="width: 180px">
                  <el-option
                    v-for="period in reportPeriodOptions"
                    :key="period"
                    :label="period"
                    :value="period"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="预告类型">
                <el-select v-model="filters.forecastType" placeholder="全部" clearable style="width: 180px">
                  <el-option
                    v-for="type in forecastTypeOptions"
                    :key="type.value"
                    :label="type.label"
                    :value="type.value"
                  >
                    <el-tag
                      :type="type.tagType"
                      effect="light"
                      :class="getToneClass(type.value)"
                    >
                      {{ type.label }}
                    </el-tag>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-form>
          </div>

          <el-table
            :data="tableData"
            border
            stripe
            style="width: 100%"
            empty-text="暂无业绩预告数据"
          >
            <el-table-column prop="code" label="股票代码" min-width="120" sortable>
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.code }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="股票名称" min-width="140" sortable>
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.name }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column
              prop="report_period"
              label="报告期"
              min-width="110"
              sortable
            />
            <el-table-column
              prop="announcement_date"
              label="公告日期"
              min-width="120"
              sortable
            />
            <el-table-column prop="forecast_type" label="预告类型" min-width="110" sortable>
              <template #default="{ row }">
                <el-tag
                  :type="getTagType(row.forecast_type)"
                  effect="light"
                  :class="getToneClass(row.forecast_type)"
                >
                  {{ row.forecast_type || '未披露' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="forecast_summary" label="业绩预告摘要" min-width="320">
              <template #default="{ row }">
                <div
                  class="summary-text"
                  :title="row.forecast_summary"
                  v-html="formatSummary(row.forecast_summary, row.forecast_type)"
                ></div>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              :page-sizes="[10, 20, 50, 100]"
              :page-size="pageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              background
            />
          </div>

          <div class="source-link-wrap">
            <a
              href="https://stcn.com/dc/sdcb.html?type=yjyg"
              target="_blank"
              rel="noopener noreferrer"
              class="source-link"
            >
              <img
                src="https://static-web.stcn.com/static/images/zqsb.png"
                alt="STCN Logo"
                class="source-logo"
              />
              <span>STCN证券时报网</span>
            </a>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import TheNavbar from '@/components/TheNavbar.vue'
import { stockApi } from '@/services/api'

export default {
  name: 'PerformanceForecastView',
  components: { TheNavbar, RouterLink },
  setup() {
    const loading = ref(false)
    const tableData = ref([])
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(20)

    const filters = ref({ reportPeriod: '', forecastType: '' })
    const reportPeriodOptions = ref([])
    const forecastTypeOptions = ref([])

    const getTagType = (type) => {
      if (!type) return 'info'
      if (type.includes('增') || type.includes('盈')) return 'success'
      if (type.includes('减') || type.includes('亏')) return 'danger'
      return 'warning'
    }

    const getToneClass = (type) => {
      if (!type) return ''
      if (type.includes('增') || type.includes('盈')) return 'tone-increase'
      if (type.includes('减') || type.includes('亏')) return 'tone-decrease'
      return ''
    }

    const formatSummary = (text = '', forecastType) => {
      if (!text) return ''
      const tone = getTagType(forecastType)
      return text.replace(
        /(\d+(?:\.\d+)?%)/g,
        `<span class="highlight-number ${tone}">$1</span>`
      )
    }

    const fetchOptions = async () => {
      try {
        const res = await stockApi.getForecastOptions()
        if (res && res.code === 0) {
          reportPeriodOptions.value = res.data.report_period || []
          if (res.data.forecast_type) {
            forecastTypeOptions.value = res.data.forecast_type.map(type => ({
              label: type,
              value: type,
              tagType: getTagType(type)
            }))
          }
        }
      } catch (error) {
        console.error('Failed to fetch options:', error)
      }
    }

    const fetchData = async () => {
      loading.value = true
      try {
        const params = {
          page: currentPage.value,
          limit: pageSize.value,
          report_period: filters.value.reportPeriod,
          forecast_type: filters.value.forecastType
        }
        const res = await stockApi.getForecastList(params)
        if (res && res.code === 0) {
          tableData.value = res.data.list || []
          total.value = res.data.total || 0
        } else {
          tableData.value = []
          total.value = 0
        }
      } catch (error) {
        console.error('Failed to fetch forecast list:', error)
        tableData.value = []
      } finally {
        loading.value = false
      }
    }

    const handleSizeChange = (val) => {
      pageSize.value = val
      fetchData()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      fetchData()
    }

    watch(() => filters.value, () => {
      currentPage.value = 1
      fetchData()
    }, { deep: true })

    onMounted(() => {
      fetchOptions()
      fetchData()
    })

    return {
      loading,
      tableData,
      total,
      currentPage,
      pageSize,
      filters,
      reportPeriodOptions,
      forecastTypeOptions,
      handleSizeChange,
      handleCurrentChange,
      formatSummary,
      getTagType,
      getToneClass
    }
  }
}
</script>

<style lang="scss" scoped>
.forecast-page {
  .page-container {
    padding-top: 90px;
    background: var(--background-color);
    min-height: 100vh;
  }

  .filter-bar {
    margin-bottom: 12px;
  }

  .table-card {
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  .pagination-container {
    padding: 20px 0;
    display: flex;
    justify-content: flex-end;
  }

  .source-link-wrap {
    display: flex;
    justify-content: flex-end;
    padding: 10px 0 4px;
  }

  .source-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 0.9rem;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .source-link:hover {
    color: var(--text-primary);
  }

  .source-logo {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .summary-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  :deep(.highlight-number) {
    font-weight: 600;
  }

  :deep(.highlight-number.success) {
    color: var(--el-color-danger, #f56c6c);
  }

  :deep(.highlight-number.danger) {
    color: var(--el-color-success, #67c23a);
  }

  :deep(.highlight-number.warning) {
    color: var(--el-color-warning, #e6a23c);
  }

  :deep(.highlight-number.info) {
    color: var(--el-color-info, #909399);
  }

  .stock-link {
    color: var(--primary-color);
    text-decoration: none;
    font-weight: 600;
  }

  .stock-link:hover {
    text-decoration: underline;
  }

  /* Custom tones for tags: increase = red, decrease = green */
  :deep(.tone-increase) {
    color: #f56c6c !important;
    border-color: #f56c6c !important;
    background-color: #fff1f0 !important;
  }

  :deep(.tone-decrease) {
    color: #67c23a !important;
    border-color: #67c23a !important;
    background-color: #f0fff4 !important;
  }
}
</style>
