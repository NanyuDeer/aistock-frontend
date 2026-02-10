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
              <el-form-item label="代码搜索">
                <el-input 
                  v-model="filters.keyword" 
                  placeholder="股票代码/名称" 
                  clearable 
                  style="width: 180px"
                  @keyup.enter="fetchData"
                />
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
            @sort-change="handleSortChange"
          >
            <el-table-column prop="code" label="股票代码" :min-width="colWidths.code" sortable>
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.code }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="股票名称" :min-width="colWidths.name" sortable>
              <template #default="{ row }">
                <RouterLink :to="`/stock/${row.code}`" class="stock-link">{{ row.name }}</RouterLink>
              </template>
            </el-table-column>
            <el-table-column 
              prop="growth_sort_val" 
              label="业绩预值" 
              :min-width="colWidths.growth_display_val" 
              align="right"
              sortable="custom"
            >
               <template #default="{ row }">
                 <span class="growth-val" :class="row.growth_highlight">
                   {{ row.growth_display_val }}
                 </span>
               </template>
            </el-table-column>
            <el-table-column prop="forecast_summary" label="业绩预告摘要" min-width="200">
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
              :page-sizes="[10, 20, 50, 100, 10000]"
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

    const filters = ref({ reportPeriod: '2025年年报', forecastType: '', keyword: '' })
    const reportPeriodOptions = ref([])
    const forecastTypeOptions = ref([])
    const sortState = ref({ prop: '', order: '' })
    
    // 自适应列宽存储对象
    const colWidths = ref({
      code: 90,
      name: 100,
      growth_display_val: 100
    })

    const getTagType = (type) => {
      if (!type) return 'info'
      if (type.includes('增') || type.includes('盈')) return 'success'
      if (type.includes('降') || type.includes('亏') || type.includes('减')) return 'danger'
      if (type.includes('平')) return 'primary'
      if (type.includes('警')) return 'warning'
      return 'info'
    }

    const getToneClass = (type) => {
      if (!type) return ''
      if (type.includes('增') || type.includes('盈')) return 'tone-increase'
      if (type.includes('降') || type.includes('亏') || type.includes('减')) return 'tone-decrease'
      if (type.includes('平')) return 'tone-flat'
      if (type.includes('警')) return 'tone-warning'
      return ''
    }

    // 字符宽度计算辅助函数
    const getTextWidth = (str) => {
      let len = 0;
      for (let i = 0; i < str.length; i++) {
        // 中文算1个单位，非中文算0.6个单位（更紧凑的估算）
        if (str.charCodeAt(i) > 127 || str.charCodeAt(i) === 94) {
          len += 1;
        } else {
          len += 0.6;
        }
      }
      return len;
    }

    const calcGrowthInfo = (row) => {
      const text = row.forecast_summary || '';
      const type = row.forecast_type || '';
      
      const matches = text.match(/(\d+(?:\.\d+)?)(?=%)/g);
      // 用于排序的默认极小值
      if (!matches || matches.length === 0) {
        return { num: -9999999, display: '--', highlight: '' };
      }
      
      const nums = matches.map(parseFloat);
      let num = 0;
      let display = '';
      let highlight = '';

      const isPositive = type.includes('增') || type.includes('盈');
      const isNegative = type.includes('降') || type.includes('亏') || type.includes('减');
      
      if (isPositive) {
        // 预增取最大值
        const val = Math.max(...nums);
        num = val;
        display = `+${val}%`;
        highlight = 'tone-increase';
      } else if (isNegative) {
        // 预减取最小值（幅度最小？通常业绩预告说下降20%-50%，那应该是-50%比较糟糕，或者-20%比较好？）
        // 排序通常希望：涨幅高的在上面，跌幅大的在下面。
        // 下降 20% -> -20。 下降 50% -> -50。
        // 如果 text 是 "下降20%至50%"，nums是 [20, 50]。
        // 这里的逻辑之前对应的是： displayVal = `-${val}%` where val = Math.min(...nums)
        // 也就是 "下降20%至50%" 显示 "-20%"。这是一个保守估计或者说乐观估计？
        // 如果这里逻辑不变：
        const val = Math.min(...nums);
        num = -val;
        display = `-${val}%`;
        highlight = 'tone-decrease';
      } else {
        const val = Math.max(...nums); 
        num = val;
        display = `${val}%`;
        
        if (type.includes('平')) highlight = 'tone-flat';
        else if (type.includes('警')) highlight = 'tone-warning';
      }
      
      return { num, display, highlight };
    }

    const performSort = () => {
      const { prop, order } = sortState.value
      if (prop === 'growth_sort_val' && order) {
        tableData.value.sort((a, b) => {
          const valA = a.growth_sort_val;
          const valB = b.growth_sort_val;
          
          const isNullA = valA === -9999999;
          const isNullB = valB === -9999999;
  
          if (isNullA && isNullB) return 0;
          if (isNullA) return 1; // 空值排在最后
          if (isNullB) return -1; // 空值排在最后
            
          if (order === 'ascending') {
            return valA - valB;
          } else {
            return valB - valA;
          }
        });
      }
    }

    const handleSortChange = ({ prop, order }) => {
      sortState.value = { prop, order }
      performSort()
    }

    // 计算自适应列宽
    const calcColumnWidths = () => {
      const columns = [
        { prop: 'code', label: '股票代码', min: 80 },
        { prop: 'name', label: '股票名称', min: 90 },
        { prop: 'growth_display_val', label: '业绩预值', min: 90 }
      ]

      const newWidths = {}
      
      columns.forEach(col => {
        let maxLen = getTextWidth(col.label)
        
        tableData.value.forEach(row => {
          const val = row[col.prop]
          if (val) {
            const len = getTextWidth(String(val))
            if (len > maxLen) maxLen = len
          }
        })
        
        // 14px * 长度 + padding 20px
        newWidths[col.prop] = Math.max(col.min, Math.ceil(maxLen * 14 + 20))
      })
      
      colWidths.value = { ...colWidths.value, ...newWidths }
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
          forecast_type: filters.value.forecastType,
          keyword: filters.value.keyword
        }
        const res = await stockApi.getForecastList(params)
        if (res && res.code === 0) {
          // 预处理数据，计算业绩预值用于排序
          tableData.value = (res.data.list || []).map(row => {
            const info = calcGrowthInfo(row);
            return {
              ...row,
              growth_sort_val: info.num,
              growth_display_val: info.display,
              growth_highlight: info.highlight
            };
          });
          
          total.value = res.data.total || 0
          calcColumnWidths()
          // 应用当前排序
          performSort()
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
      colWidths,
      reportPeriodOptions,
      forecastTypeOptions,
      handleSizeChange,
      handleCurrentChange,
      formatSummary,
      getTagType,
      getToneClass,
      // getGrowthData // 移除旧函数导出
      handleSortChange
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

  :deep(.tone-flat) {
    color: #409eff !important;
    border-color: #409eff !important;
    background-color: #ecf5ff !important;
  }

  :deep(.tone-warning) {
    color: #e6a23c !important;
    border-color: #e6a23c !important;
    background-color: #fdf6ec !important;
  }
}
</style>
