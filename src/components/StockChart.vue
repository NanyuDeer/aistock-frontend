<template>
  <div class="stock-chart-section">
    <div class="chart-header">
      <div class="title-group">
        <h3 class="section-title">历史K线</h3>
        <span class="adjustment-tag">前复权</span>
      </div>
      <div class="period-switch">
        <button
          v-for="option in periodOptions"
          :key="option.klt"
          type="button"
          class="period-button"
          :class="{ 'is-active': selectedKlt === option.klt }"
          @click="handlePeriodChange(option.klt)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <div class="stock-chart" ref="chartContainer"></div>
    <div v-if="klineItems.length > 1" class="chart-range-slider">
      <el-slider
        v-model="zoomRange"
        range
        :min="0"
        :max="100"
        :step="1"
        :show-tooltip="false"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import * as echarts from 'echarts/core';
import { CandlestickChart } from 'echarts/charts';
import {
  TooltipComponent,
  GridComponent,
  MarkPointComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  CandlestickChart,
  TooltipComponent,
  GridComponent,
  MarkPointComponent,
  CanvasRenderer
]);

const PERIOD_OPTIONS = [
  { label: '1', klt: 1 },
  { label: '5', klt: 5 },
  { label: '30', klt: 30 },
  { label: '日线', klt: 101 },
  { label: '周线', klt: 102 },
  { label: '月线', klt: 103 }
];

const UP_COLOR = '#d94848';
const DOWN_COLOR = '#2f9e44';

export default {
  name: 'StockChart',
  props: {
    stockCode: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const store = useStore();
    const chartContainer = ref(null);
    const chartInstance = ref(null);
    const selectedKlt = ref(101);
    const periodOptions = PERIOD_OPTIONS;
    const klineItems = ref([]);
    const zoomRange = ref([0, 100]);
    const latestRequestId = ref(0);
    let resizeTimer = null;

    const toNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const formatLocalDateTime = (date) => {
      const pad = (value) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const normalizeTime = (time) => {
      if (time == null) return '';
      const raw = String(time).trim();
      if (!raw) return '';
      if (/^\d{10}$/.test(raw)) {
        const date = new Date(Number(raw) * 1000);
        return Number.isNaN(date.getTime()) ? raw : formatLocalDateTime(date);
      }
      if (/^\d{13}$/.test(raw)) {
        const date = new Date(Number(raw));
        return Number.isNaN(date.getTime()) ? raw : formatLocalDateTime(date);
      }
      return raw;
    };

    const formatSigned = (value, digits = 2) => {
      if (!Number.isFinite(value)) return '--';
      const formatted = value.toLocaleString('zh-CN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
      return `${value > 0 ? '+' : ''}${formatted}`;
    };

    const formatPercent = (value) => {
      if (!Number.isFinite(value)) return '--';
      return `${formatSigned(value, 2)}%`;
    };

    const formatPrice = (value) => {
      if (!Number.isFinite(value)) return '--';
      return value.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const formatVolume = (value) => {
      if (!Number.isFinite(value)) return '--';
      if (value >= 100000000) return `${(value / 100000000).toFixed(2)}亿`;
      if (value >= 10000) return `${(value / 10000).toFixed(2)}万`;
      return `${Math.round(value)}`;
    };

    const formatAxisLabel = (value) => {
      const str = String(value || '');
      if (!str) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str.slice(5);
      }
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
        return `${str.slice(5, 10)} ${str.slice(11, 16)}`;
      }
      return str;
    };

    const renderEmpty = (message) => {
      if (!chartInstance.value) return;
      chartInstance.value.setOption(
        {
          animation: false,
          xAxis: { show: false },
          yAxis: { show: false },
          series: [],
          graphic: {
            type: 'text',
            left: 'center',
            top: 'middle',
            style: {
              text: message,
              fill: '#9ca3af',
              fontSize: 14
            }
          }
        },
        true
      );
    };

    const getVisibleItems = () => {
      const items = klineItems.value;
      if (!items.length) return [];
      const total = items.length;
      const startRaw = Array.isArray(zoomRange.value) ? Number(zoomRange.value[0]) : 0;
      const endRaw = Array.isArray(zoomRange.value) ? Number(zoomRange.value[1]) : 100;
      const startPercent = Math.max(0, Math.min(100, Number.isFinite(startRaw) ? startRaw : 0));
      const endPercent = Math.max(0, Math.min(100, Number.isFinite(endRaw) ? endRaw : 100));
      let startIndex = Math.floor(startPercent / 100 * total);
      let endIndex = Math.ceil(endPercent / 100 * total);
      if (endIndex <= startIndex) {
        endIndex = Math.min(total, startIndex + 1);
      }
      return items.slice(startIndex, endIndex);
    };

    const renderChart = () => {
      if (!chartInstance.value) return;
      if (!klineItems.value.length) {
        renderEmpty('暂无K线数据');
        return;
      }

      const visibleItems = getVisibleItems();
      if (!visibleItems.length) {
        renderEmpty('暂无K线数据');
        return;
      }

      const categories = visibleItems.map(item => item.time);
      const candles = visibleItems.map(item => [item.open, item.close, item.low, item.high]);
      const visibleHighs = visibleItems.map(item => item.high);
      const visibleLows = visibleItems.map(item => item.low);
      const rawMax = Math.max(...visibleHighs);
      const rawMin = Math.min(...visibleLows);
      const range = Math.max(rawMax - rawMin, Math.abs(rawMax) * 0.02, 0.01);
      const axisPadding = range * 0.12;
      const axisMin = rawMin - axisPadding;
      const axisMax = rawMax + axisPadding;
      let highestIndex = 0;
      let lowestIndex = 0;
      let highestValue = visibleItems[0].high;
      let lowestValue = visibleItems[0].low;
      for (let i = 1; i < visibleItems.length; i += 1) {
        if (visibleItems[i].high > highestValue) {
          highestValue = visibleItems[i].high;
          highestIndex = i;
        }
        if (visibleItems[i].low < lowestValue) {
          lowestValue = visibleItems[i].low;
          lowestIndex = i;
        }
      }

      chartInstance.value.setOption(
        {
          animation: false,
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'
            },
            backgroundColor: 'rgba(18, 22, 28, 0.9)',
            borderWidth: 0,
            textStyle: {
              color: '#f5f7fa'
            },
            formatter: (params) => {
              const candle = params.find(item => item.seriesName === 'K线');
              if (!candle) return '';
              const row = visibleItems[candle.dataIndex];
              if (!row) return '';
              const isUp = row.close >= row.open;
              const trendColor = isUp ? UP_COLOR : DOWN_COLOR;
              return [
                `<div style="margin-bottom:6px;font-weight:600;">${row.time}</div>`,
                `<div>开盘：${formatPrice(row.open)}</div>`,
                `<div>收盘：<span style="color:${trendColor};font-weight:600;">${formatPrice(row.close)}</span></div>`,
                `<div>最高：${formatPrice(row.high)}</div>`,
                `<div>最低：${formatPrice(row.low)}</div>`,
                `<div>成交量：${formatVolume(row.volume)}</div>`,
                `<div>涨跌幅：<span style="color:${trendColor};font-weight:600;">${formatPercent(row.changePercent)}</span></div>`,
                `<div>换手率：${formatPercent(row.turnoverRate)}</div>`
              ].join('');
            }
          },
          grid: {
            left: '6%',
            right: '4%',
            top: 26,
            bottom: 52
          },
          xAxis: {
            type: 'category',
            data: categories,
            boundaryGap: true,
            axisLine: { lineStyle: { color: '#d0d7e2' } },
            axisTick: { show: false },
            axisLabel: {
              color: '#6b7280',
              formatter: value => formatAxisLabel(value)
            }
          },
          yAxis: {
            scale: true,
            min: axisMin,
            max: axisMax,
            splitNumber: 5,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: '#6b7280',
              formatter: value => formatPrice(toNumber(value))
            },
            splitLine: {
              lineStyle: { color: '#eef1f5' }
            }
          },
          series: [
            {
              name: 'K线',
              type: 'candlestick',
              data: candles,
              clip: false,
              large: false,
              progressive: 0,
              progressiveThreshold: 0,
              itemStyle: {
                color: UP_COLOR,
                color0: DOWN_COLOR,
                borderColor: UP_COLOR,
                borderColor0: DOWN_COLOR
              },
              markPoint: {
                symbol: 'circle',
                symbolSize: 6,
                animation: false,
                z: 12,
                label: {
                  show: true,
                  fontSize: 11,
                  color: '#111827',
                  backgroundColor: 'rgba(255, 255, 255, 0.78)',
                  borderColor: '#d1d5db',
                  borderWidth: 1,
                  borderRadius: 4,
                  padding: [2, 5],
                  distance: 14,
                  formatter: (params) => {
                    const value = toNumber(params.value);
                    return `${params.name}：${formatPrice(value)}`;
                  }
                },
                data: [
                  {
                    name: '最高',
                    coord: [categories[highestIndex], highestValue],
                    value: highestValue,
                    itemStyle: { color: '#111827' },
                    label: {
                      position: 'top',
                      align: highestIndex < 2 ? 'left' : (highestIndex > categories.length - 3 ? 'right' : 'center'),
                      verticalAlign: 'bottom'
                    }
                  },
                  {
                    name: '最低',
                    coord: [categories[lowestIndex], lowestValue],
                    value: lowestValue,
                    itemStyle: { color: '#111827' },
                    label: {
                      position: 'bottom',
                      align: lowestIndex < 2 ? 'left' : (lowestIndex > categories.length - 3 ? 'right' : 'center'),
                      verticalAlign: 'top'
                    }
                  }
                ]
              }
            }
          ]
        },
        true
      );
    };

    const fetchKlineData = async () => {
      if (!props.stockCode || !chartInstance.value) return;
      const requestId = ++latestRequestId.value;
      chartInstance.value.showLoading({ text: '加载K线数据...' });
      try {
        const result = await store.dispatch('fetchStockKline', {
          symbol: props.stockCode,
          klt: selectedKlt.value,
          fqt: 1,
          limit: selectedKlt.value >= 100 ? 1000 : 600
        });
        if (requestId !== latestRequestId.value) return;

        const normalized = (result?.items || [])
          .map(item => {
            const open = toNumber(item['开盘价']);
            const close = toNumber(item['收盘价']);
            const low = toNumber(item['最低价']);
            const high = toNumber(item['最高价']);
            const time = normalizeTime(item['时间']);
            if (!time) return null;
            return {
              time,
              open,
              close,
              low,
              high,
              volume: toNumber(item['成交量']),
              changePercent: toNumber(item['涨跌幅']),
              turnoverRate: toNumber(item['换手率'])
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.time.localeCompare(b.time));

        klineItems.value = normalized;
        const initialWindowSize = 60;
        if (normalized.length > initialWindowSize) {
          const start = Math.round((1 - initialWindowSize / normalized.length) * 100);
          zoomRange.value = [start, 100];
        } else {
          zoomRange.value = [0, 100];
        }
        renderChart();
      } catch (error) {
        console.error('获取K线失败:', error);
        if (requestId !== latestRequestId.value) return;
        klineItems.value = [];
        renderEmpty('K线加载失败');
      } finally {
        if (requestId === latestRequestId.value && chartInstance.value) {
          chartInstance.value.hideLoading();
        }
      }
    };

    const initChart = () => {
      if (!chartContainer.value) return;
      if (chartInstance.value) {
        chartInstance.value.dispose();
      }
      chartInstance.value = echarts.init(chartContainer.value, null, {
        renderer: 'canvas'
      });
      renderEmpty('加载中...');
    };

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartInstance.value) {
          chartInstance.value.resize();
        }
      }, 120);
    };

    const handlePeriodChange = (klt) => {
      if (selectedKlt.value === klt) return;
      selectedKlt.value = klt;
    };

    watch(selectedKlt, () => {
      fetchKlineData();
    });

    watch(zoomRange, () => {
      renderChart();
    }, { deep: true });

    watch(() => props.stockCode, (newCode, oldCode) => {
      if (newCode && newCode !== oldCode) {
        klineItems.value = [];
        fetchKlineData();
      }
    });

    onMounted(() => {
      initChart();
      fetchKlineData();
      window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (chartInstance.value) {
        chartInstance.value.dispose();
        chartInstance.value = null;
      }
    });

    return {
      chartContainer,
      selectedKlt,
      klineItems,
      zoomRange,
      periodOptions,
      handlePeriodChange
    };
  }
};
</script>

<style lang="scss" scoped>
.stock-chart-section {
  background: #fff;
  border: 1px solid #edf1f5;
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 20px;

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .section-title {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.3;
    white-space: nowrap;
  }

  .adjustment-tag {
    color: #9ca3af;
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
  }

  .period-switch {
    margin-left: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    max-width: 460px;
    min-width: 0;
  }

  .period-button {
    border: 1px solid #d8dee8;
    background: #fff;
    color: #4b5563;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 13px;
    line-height: 1.4;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: #9ea8b6;
      color: #1f2937;
    }

    &.is-active {
      color: #1e40af;
      border-color: #9ab0f5;
      background: #f4f8ff;
      font-weight: 600;
    }
  }

  .stock-chart {
    width: 100%;
    height: 420px;
  }

  .chart-range-slider {
    margin-top: 10px;
    padding: 0 4px;
  }
}

@media (max-width: 768px) {
  .stock-chart-section {
    padding: 14px 14px 12px;

    .stock-chart {
      height: 360px;
    }
  }
}

@media (max-width: 576px) {
  .stock-chart-section {
    .chart-header {
      flex-direction: column;
      align-items: stretch;
    }

    .title-group {
      justify-content: space-between;
    }

    .period-switch {
      width: 100%;
      max-width: none;
      justify-content: flex-start;
    }

    .period-button {
      flex: 1 1 calc(33.333% - 6px);
      padding: 6px 0;
      text-align: center;
    }

    .stock-chart {
      height: 320px;
    }
  }
}
</style>
