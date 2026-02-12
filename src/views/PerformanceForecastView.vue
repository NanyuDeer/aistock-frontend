<template>
  <div class="forecast-page">
    <TheNavbar />
    <div class="page-container">
      <div class="container">
        <el-card shadow="never" class="table-card" v-loading="loading">
          <div class="filter-bar">
            <el-form inline label-width="76px">
              <el-form-item label="关键词">
                <el-input
                  v-model="filters.keyword"
                  placeholder="股票代码/简称/摘要"
                  clearable
                  style="width: 240px"
                  @keyup.enter="handleSearch"
                  @clear="handleSearch"
                />
              </el-form-item>
              <el-form-item label="排序字段">
                <el-select v-model="sortBy" style="width: 180px" @change="handleSortFilterChange">
                  <el-option label="净利润同比" value="forecast_netprofit_yoy" />
                  <el-option label="股票代码" value="symbol" />
                </el-select>
              </el-form-item>
              <el-form-item label="排序方向">
                <el-select v-model="sortOrder" style="width: 140px" @change="handleSortFilterChange">
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
            border
            stripe
            style="width: 100%"
            empty-text="暂无盈利预测数据"
            @sort-change="handleSortChange"
          >
            <el-table-column prop="code" label="股票代码" min-width="110" sortable="custom">
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.code }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="股票名称" min-width="130">
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.name }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column
              prop="forecastNetprofitYoy"
              label="净利润同比(%)"
              min-width="140"
              align="right"
              sortable="custom"
            >
              <template #default="{ row }">
                <span class="growth-val" :class="row.growthClass">{{ row.forecastNetprofitYoyText }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="summary" label="盈利预测摘要" min-width="320">
              <template #default="{ row }">
                <div
                  class="summary-text"
                  :title="row.summary"
                  v-html="formatSummary(row.summary, row.forecastNetprofitYoy)"
                ></div>
              </template>
            </el-table-column>
            <el-table-column prop="updateTime" label="更新时间" min-width="180" />
          </el-table>

          <div class="pagination-container">
            <el-pagination
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              :page-sizes="[20, 50, 100, 200, 500]"
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
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import TheNavbar from '@/components/TheNavbar.vue'
import { stockApi } from '@/services/api'

const DEFAULT_SORT = {
  sortBy: 'forecast_netprofit_yoy',
  sortOrder: 'desc'
}

export default {
  name: 'PerformanceForecastView',
  components: { TheNavbar, RouterLink },
  setup() {
    const loading = ref(false)
    const tableData = ref([])
    const total = ref(0)
    const currentPage = ref(1)
    const pageSize = ref(50)

    const filters = ref({ keyword: '' })
    const sortBy = ref(DEFAULT_SORT.sortBy)
    const sortOrder = ref(DEFAULT_SORT.sortOrder)

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
        const params = {
          page: currentPage.value,
          pageSize: pageSize.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
        }
        const keyword = (filters.value.keyword || '').trim()
        const response = keyword
          ? await stockApi.searchProfitForecast({ ...params, keyword })
          : await stockApi.getProfitForecastList(params)

        const { list, totalCount, serverPage, serverPageSize } = resolveListPayload(response)
        tableData.value = list.map(normalizeRow)
        total.value = totalCount

        if (serverPage && serverPage !== currentPage.value) {
          currentPage.value = serverPage
        }
        if (serverPageSize && serverPageSize !== pageSize.value) {
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
      pageSize.value = 50
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

    onMounted(() => {
      fetchData()
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
      handleSearch,
      handleReset,
      handleSortFilterChange,
      handleSortChange,
      handleSizeChange,
      handleCurrentChange,
      formatSummary
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
