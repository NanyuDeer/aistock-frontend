<template>
  <div class="forecast-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <el-card shadow="never" class="table-card" v-loading="loading">
          <div class="filter-bar">
            <el-form :inline="!isMobileScreen" :label-width="isMobileScreen ? '72px' : '76px'" class="filter-form">
              <el-form-item label="关键词">
                <el-input
                  v-model="filters.keyword"
                  placeholder="股票代码/简称/摘要"
                  clearable
                  class="filter-input"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </el-form-item>
              <el-form-item label="排序字段">
                <el-select v-model="sortBy" class="filter-select" @change="handleSortFilterChange">
                  <el-option label="净利润同比" value="forecast_netprofit_yoy" />
                  <el-option label="股票代码" value="symbol" />
                </el-select>
              </el-form-item>
              <el-form-item label="排序方向">
                <el-select v-model="sortOrder" class="filter-select" @change="handleSortFilterChange">
                  <el-option label="降序" value="desc" />
                  <el-option label="升序" value="asc" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleSearch">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
              </el-form-item>
            </el-form>
          </div>

          <el-table
            :data="tableData"
            table-layout="fixed"
            :header-cell-style="getHeaderCellStyle"
            :cell-style="getCellStyle"
            border
            stripe
            style="width: 100%"
            empty-text="暂无盈利预测数据"
            @sort-change="handleSortChange"
          >
            <el-table-column
              prop="code"
              label="股票代码"
              :min-width="columnMinWidth.code"
              sortable="custom"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.code }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column
              prop="name"
              label="股票名称"
              :min-width="columnMinWidth.name"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.name }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column
              prop="forecastNetprofitYoy"
              label="净利润同比(%)"
              :min-width="columnMinWidth.yoy"
              align="center"
              header-align="center"
              sortable="custom"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                <span class="growth-val" :class="row.growthClass">{{ row.forecastNetprofitYoyText }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="summary"
              label="盈利预测摘要"
              :min-width="columnMinWidth.summary"
              align="left"
              header-align="left"
            >
              <template #default="{ row }">
                <div
                  class="summary-text"
                  :title="row.summary"
                  v-html="formatSummary(row.summary, row.forecastNetprofitYoy)"
                ></div>
              </template>
            </el-table-column>
            <el-table-column
              v-if="showUpdateTimeColumn"
              prop="updateTime"
              label="更新时间"
              :min-width="columnMinWidth.updateTime"
              show-overflow-tooltip
            />
          </el-table>

          <div class="pagination-container">
            <el-pagination
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              :page-sizes="pageSizeOptions"
              :page-size="pageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              background
            />
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import TheNavbar from '@/components/TheNavbar.vue'
import { stockApi } from '@/services/api'

const DEFAULT_SORT = {
  sortBy: 'forecast_netprofit_yoy',
  sortOrder: 'desc'
}
const MOBILE_BREAKPOINT = 768

export default {
  name: 'PerformanceForecastView',
  components: { TheNavbar, RouterLink },
  setup() {
    const loading = ref(false)
    const tableData = ref([])
    const total = ref(0)
    const currentPage = ref(1)
    const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
    const pageSize = ref(viewportWidth.value <= MOBILE_BREAKPOINT ? 10 : 50)

    const filters = ref({ keyword: '' })
    const sortBy = ref(DEFAULT_SORT.sortBy)
    const sortOrder = ref(DEFAULT_SORT.sortOrder)

    const isMobileScreen = computed(() => viewportWidth.value <= MOBILE_BREAKPOINT)
    const isNarrowScreen = computed(() => viewportWidth.value <= 480)
    const showUpdateTimeColumn = computed(() => viewportWidth.value > 768)
    const pageSizeOptions = computed(() => (isMobileScreen.value ? [10, 20, 50] : [10, 20, 50, 100, 200, 500]))

    const columnMinWidth = computed(() => {
      if (viewportWidth.value <= 360) {
        return {
          code: 74,
          name: 82,
          yoy: 92,
          summary: 96,
          updateTime: 0
        }
      }
      if (isNarrowScreen.value) {
        return {
          code: 82,
          name: 96,
          yoy: 108,
          summary: 120,
          updateTime: 0
        }
      }
      return {
        code: 110,
        name: 130,
        yoy: 140,
        summary: 320,
        updateTime: 180
      }
    })

    const toNumber = (value) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'number') return Number.isFinite(value) ? value : null
      const text = String(value).replace(/,/g, '').replace('%', '').trim()
      if (!text) return null
      const parsed = Number(text)
      return Number.isFinite(parsed) ? parsed : null
    }

    const getGrowthClass = (yoy) => {
      if (yoy === null) return ''
      if (yoy > 0) return 'tone-increase'
      if (yoy < 0) return 'tone-decrease'
      return 'tone-flat'
    }

    const formatYoyText = (yoy) => {
      if (yoy === null) return '--'
      return `${yoy > 0 ? '+' : ''}${yoy.toFixed(2)}%`
    }

    const normalizeRow = (item = {}) => {
      const code = item.symbol || item['股票代码'] || item.code || ''
      const name = item.name || item['股票简称'] || item['股票名称'] || ''
      const forecastNetprofitYoy = toNumber(
        item.forecast_netprofit_yoy ?? item['净利润同比(%)'] ?? item['净利润同比'] ?? item.yoy
      )
      const summary = item.forecast_summary || item['摘要'] || item.summary || '--'
      const updateTime = item.update_time || item['更新时间'] || item.updated_at || '--'

      return {
        code,
        name,
        forecastNetprofitYoy,
        forecastNetprofitYoyText: formatYoyText(forecastNetprofitYoy),
        growthClass: getGrowthClass(forecastNetprofitYoy),
        summary,
        updateTime
      }
    }

    const resolveListPayload = (response) => {
      if (!response || response.code !== 200 || !response.data) {
        return { list: [], totalCount: 0, serverPage: null, serverPageSize: null }
      }
      const data = response.data
      const list =
        data.list ||
        data.items ||
        data['列表'] ||
        data['盈利预测列表'] ||
        []
      const parsedTotalCount = Number(
        data.total ??
        data.totalCount ??
        data.count ??
        data['总数'] ??
        data['总数量']
      )
      const parsedTotalPages = Number(data.totalPages ?? data['总页数'])
      const parsedServerPageSize = Number(data.pageSize ?? data['每页数量'])
      const parsedServerPage = Number(data.page ?? data['当前页'])

      let totalCount = Number.isFinite(parsedTotalCount) ? parsedTotalCount : 0
      if (!totalCount && Number.isFinite(parsedTotalPages) && Number.isFinite(parsedServerPageSize)) {
        totalCount = parsedTotalPages * parsedServerPageSize
      }
      if (!totalCount) {
        totalCount = Array.isArray(list) ? list.length : 0
      }

      return {
        list: Array.isArray(list) ? list : [],
        totalCount: Number.isFinite(totalCount) ? totalCount : 0,
        serverPage: Number.isFinite(parsedServerPage) ? parsedServerPage : null,
        serverPageSize: Number.isFinite(parsedServerPageSize) ? parsedServerPageSize : null
      }
    }

    const fetchData = async () => {
      loading.value = true
      try {
        const requestPageSize = isMobileScreen.value ? 10 : pageSize.value
        const params = {
          page: currentPage.value,
          pageSize: requestPageSize,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
        }
        const keyword = (filters.value.keyword || '').trim()
        const response = keyword
          ? await stockApi.searchProfitForecast({ ...params, keyword })
          : await stockApi.getProfitForecastList(params)

        const { list, totalCount, serverPage, serverPageSize } = resolveListPayload(response)
        const visibleList = isMobileScreen.value ? list.slice(0, 10) : list
        tableData.value = visibleList.map(normalizeRow)
        total.value = totalCount

        if (serverPage && serverPage !== currentPage.value) {
          currentPage.value = serverPage
        }
        if (!isMobileScreen.value && serverPageSize && serverPageSize !== pageSize.value) {
          pageSize.value = serverPageSize
        }
      } catch (error) {
        console.error('Failed to fetch profit forecast:', error)
        tableData.value = []
        total.value = 0
      } finally {
        loading.value = false
      }
    }

    const handleSearch = () => {
      currentPage.value = 1
      fetchData()
    }

    const handleReset = () => {
      filters.value.keyword = ''
      sortBy.value = DEFAULT_SORT.sortBy
      sortOrder.value = DEFAULT_SORT.sortOrder
      currentPage.value = 1
      pageSize.value = isMobileScreen.value ? 10 : 50
      fetchData()
    }

    const handleSortFilterChange = () => {
      if (!sortOrder.value) {
        sortOrder.value = sortBy.value === 'symbol' ? 'asc' : 'desc'
      }
      currentPage.value = 1
      fetchData()
    }

    const handleSortChange = ({ prop, order }) => {
      if (prop === 'code') {
        sortBy.value = 'symbol'
      } else if (prop === 'forecastNetprofitYoy') {
        sortBy.value = 'forecast_netprofit_yoy'
      } else {
        return
      }

      sortOrder.value = order === 'ascending'
        ? 'asc'
        : order === 'descending'
          ? 'desc'
          : (sortBy.value === 'symbol' ? 'asc' : 'desc')

      currentPage.value = 1
      fetchData()
    }

    const handleSizeChange = (val) => {
      pageSize.value = val
      currentPage.value = 1
      fetchData()
    }

    const handleCurrentChange = (val) => {
      currentPage.value = val
      fetchData()
    }

    const getSummaryToneClass = (yoy) => {
      if (yoy === null) return 'info'
      if (yoy > 0) return 'success'
      if (yoy < 0) return 'danger'
      return 'primary'
    }

    const formatSummary = (text = '', yoy) => {
      if (!text) return ''
      const tone = getSummaryToneClass(yoy)
      return text.replace(/(\d+(?:\.\d+)?%)/g, `<span class="highlight-number ${tone}">$1</span>`)
    }

    const getHeaderCellStyle = ({ column }) => {
      if (column?.property === 'forecastNetprofitYoy') {
        return { textAlign: 'center' }
      }
      if (column?.property === 'summary') {
        return { textAlign: 'left' }
      }
      return { textAlign: 'center' }
    }

    const getCellStyle = ({ column }) => {
      if (column?.property === 'forecastNetprofitYoy') {
        return { textAlign: 'center' }
      }
      if (column?.property === 'summary') {
        return { textAlign: 'left' }
      }
      return { textAlign: 'center' }
    }

    const handleResize = () => {
      viewportWidth.value = window.innerWidth
    }

    onMounted(() => {
      handleResize()
      window.addEventListener('resize', handleResize)
      fetchData()
    })

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
    })

    return {
      loading,
      tableData,
      total,
      currentPage,
      pageSize,
      filters,
      sortBy,
      sortOrder,
      isMobileScreen,
      isNarrowScreen,
      showUpdateTimeColumn,
      columnMinWidth,
      pageSizeOptions,
      handleSearch,
      handleReset,
      handleSortFilterChange,
      handleSortChange,
      handleSizeChange,
      handleCurrentChange,
      formatSummary,
      getHeaderCellStyle,
      getCellStyle
    }
  }
}
</script>

<style lang="scss" scoped>
.forecast-page {
  .page-container {
    padding: 12px;
    padding-top: 68px;
    background: var(--background-color);
    min-height: 100vh;
  }

  .filter-bar {
    margin-bottom: 12px;

    .filter-form {
      :deep(.el-form-item) {
        margin-bottom: 10px;
      }
    }

    .filter-input,
    .filter-select {
      width: 240px;
      max-width: 100%;
    }
  }

  .table-card {
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  }

  :deep(.el-table .cell) {
    padding-left: 8px;
    padding-right: 8px;
  }

  @media (max-width: 480px) {
    .page-container {
      padding: 8px;
      padding-top: 64px;
    }

    :deep(.el-table .cell) {
      padding-left: 4px;
      padding-right: 4px;
      font-size: 12px;
    }

    .pagination-container {
      justify-content: center;
      overflow-x: auto;
      padding: 12px 0 4px;
    }
  }

  @media (max-width: 768px) {
    .filter-bar {
      .filter-form {
        :deep(.el-form-item) {
          width: 100%;
          margin-right: 0;
        }

        :deep(.el-form-item__content) {
          width: 100%;
          min-width: 0;
        }
      }

      .filter-input,
      .filter-select {
        width: 100%;
      }
    }
  }

  .pagination-container {
    padding: 20px 0;
    display: flex;
    justify-content: flex-end;
  }

  .summary-text {
    display: block;
    text-align: left;
    white-space: normal;
    word-break: break-word;
    overflow: visible;
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

  :deep(.highlight-number.primary) {
    color: var(--el-color-primary, #409eff);
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

  .growth-val {
    font-weight: 600;
  }

  .tone-increase {
    color: #f56c6c;
  }

  .tone-decrease {
    color: #67c23a;
  }

  .tone-flat {
    color: #409eff;
  }
}
</style>
