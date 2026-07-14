<template>
  <div class="kline-compare">
    <div class="kline-panel">
      <div class="kline-title">个股K线</div>
      <div ref="stockRef" class="kline-chart"></div>
    </div>
    <div class="kline-panel">
      <div class="kline-title">{{ conceptKline.name || '概念指数' }}</div>
      <div ref="conceptRef" class="kline-chart"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts/core';
import { CandlestickChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([CandlestickChart, LineChart, GridComponent, TooltipComponent, AxisPointerComponent, CanvasRenderer]);

const props = defineProps({
  stockKline: { type: Object, default: () => ({ dates: [], ohlc: [] }) },
  conceptKline: { type: Object, default: () => ({ name: '', dates: [], close: [] }) },
});

const stockRef = ref(null);
const conceptRef = ref(null);
let stockChart = null;
let conceptChart = null;

function renderStock() {
  if (!stockRef.value || !props.stockKline.dates.length) return;
  if (!stockChart) stockChart = echarts.init(stockRef.value);
  const dates = props.stockKline.dates.map(d => d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d);
  stockChart.setOption({
    grid: { left: '8%', right: '3%', top: '5%', bottom: '15%' },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10, interval: Math.floor(dates.length / 6) } },
    yAxis: { scale: true, axisLabel: { fontSize: 10 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    series: [{
      type: 'candlestick',
      data: props.stockKline.ohlc,
      itemStyle: { color: '#ec0000', color0: '#00da3c', borderColor: '#ec0000', borderColor0: '#00da3c' },
    }],
  });
}

function renderConcept() {
  if (!conceptRef.value || !props.conceptKline.close.length) return;
  if (!conceptChart) conceptChart = echarts.init(conceptRef.value);
  const dates = props.conceptKline.dates.map(d => d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d);
  conceptChart.setOption({
    grid: { left: '8%', right: '3%', top: '5%', bottom: '15%' },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10, interval: Math.floor(dates.length / 6) } },
    yAxis: { scale: true, axisLabel: { fontSize: 10 } },
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'line',
      data: props.conceptKline.close,
      smooth: true,
      lineStyle: { color: '#409eff', width: 1.5 },
      areaStyle: { color: 'rgba(64,158,255,0.08)' },
    }],
  });
}

onMounted(() => { renderStock(); renderConcept(); });
onUnmounted(() => { if (stockChart) stockChart.dispose(); if (conceptChart) conceptChart.dispose(); });
watch(() => props.stockKline, () => renderStock(), { deep: true });
watch(() => props.conceptKline, () => renderConcept(), { deep: true });
</script>

<style scoped>
.kline-compare { display: flex; gap: 12px; }
.kline-panel { flex: 1; min-width: 0; }
.kline-title { font-size: 0.85rem; color: #909399; margin-bottom: 4px; }
.kline-chart { height: 240px; }
@media (max-width: 768px) { .kline-compare { flex-direction: column; } }
</style>
