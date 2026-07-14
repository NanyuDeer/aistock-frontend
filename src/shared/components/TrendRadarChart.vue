<template>
  <div ref="chartRef" class="trend-radar-chart" :style="{ width: size + 'px', height: size + 'px' }"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as echarts from 'echarts/core';
import { RadarChart } from 'echarts/charts';
import { TooltipComponent, RadarComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([RadarChart, TooltipComponent, RadarComponent, CanvasRenderer]);

const props = defineProps({
  dimensions: { type: Array, default: () => [] },
  size: { type: Number, default: 240 },
});

const chartRef = ref(null);
let chart = null;

function renderChart() {
  if (!chartRef.value || !props.dimensions.length) return;
  if (!chart) {
    chart = echarts.init(chartRef.value);
  }
  chart.setOption({
    radar: {
      indicator: props.dimensions.map(d => ({ name: d.name, max: 100 })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#606266', fontSize: 12 },
      splitArea: { areaStyle: { color: ['#f5f7fa', '#e8eef5'] } },
      splitLine: { lineStyle: { color: '#dcdfe6' } },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: props.dimensions.map(d => d.score),
        areaStyle: { color: 'rgba(64, 158, 255, 0.15)' },
        lineStyle: { color: '#409eff', width: 2 },
        itemStyle: { color: '#409eff' },
      }],
    }],
  });
}

onMounted(() => renderChart());
onUnmounted(() => { if (chart) { chart.dispose(); chart = null; } });
watch(() => props.dimensions, () => renderChart(), { deep: true });
</script>

<style scoped>
.trend-radar-chart { margin: 0 auto; }
</style>
