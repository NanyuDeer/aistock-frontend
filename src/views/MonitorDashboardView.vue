<template>
  <div class="monitor-dashboard">
    <div class="dashboard-header">
      <svg class="dashboard-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3H21V21H3V3Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M9 9H15V15H9V9Z" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M12 6V3M12 21V18M6 12H3M21 12H18" stroke="currentColor" stroke-width="2"/>
        <path d="M7.5 7.5L5.5 5.5M18.5 5.5L16.5 7.5M16.5 16.5L18.5 18.5M5.5 18.5L7.5 16.5" stroke="currentColor" stroke-width="2"/>
      </svg>
      <h2 class="dashboard-title">服务器监控仪表盘</h2>
      <div class="status-indicator">
        <div class="status-dot"></div>
        <span class="status-text">在线</span>
      </div>
    </div>
    
    <div class="toolbar">
      <div class="refresh-control">
        <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          @change="toggleAutoRefresh"
        />
        <span v-if="autoRefresh" class="refresh-timer">{{ refreshCountdown }}s</span>
        <el-button type="primary" size="small" @click="renderCharts" :loading="loading">
          <i class="el-icon-refresh"></i> 立即刷新
        </el-button>
      </div>
    </div>
    
    <!-- 资源使用概览卡片 -->
    <div class="metrics-grid">
      <el-card class="metric-card cpu-card">
        <div class="metric-header">CPU 使用率</div>
        <div class="gauge-container">
          <div ref="cpuGauge" class="gauge-chart"></div>
          <div class="metric-details">
            <div class="metric-item">
              <div class="metric-label">1分钟负载:</div>
              <div class="metric-value" :class="getLoadClass(cpuLoads.load1)">{{ cpuLoads.load1 }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">5分钟负载:</div>
              <div class="metric-value" :class="getLoadClass(cpuLoads.load5)">{{ cpuLoads.load5 }}</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">15分钟负载:</div>
              <div class="metric-value" :class="getLoadClass(cpuLoads.load15)">{{ cpuLoads.load15 }}</div>
            </div>
          </div>
        </div>
      </el-card>
      
      <el-card class="metric-card memory-card">
        <div class="metric-header">内存使用率</div>
        <div class="gauge-container">
          <div ref="memoryGauge" class="gauge-chart"></div>
          <div class="metric-details">
            <div class="metric-item">
              <div class="metric-label">已用内存:</div>
              <div class="metric-value">{{ memoryStats.used }} GB</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">总内存:</div>
              <div class="metric-value">{{ memoryStats.total }} GB</div>
            </div>
            <div class="metric-item">
              <div class="metric-label">可用内存:</div>
              <div class="metric-value">{{ memoryStats.free }} GB</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
    
    <!-- 历史趋势图表 - CPU 和内存并列 -->
    <div class="charts-grid">
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <i class="el-icon-cpu"></i>
              <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20V20H4V4Z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M8 8H16V16H8V8Z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M10 6V4M14 6V4M10 20V18M14 20V18M6 10H4M20 10H18M6 14H4M20 14H18" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>CPU使用历史趋势</span>
            </div>
          </div>
        </template>
        <div ref="cpuTrendChart" style="height: 300px;"></div>
      </el-card>

      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C20.5523 4 21 4.44772 21 5V19C21 19.5523 20.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V5C3 4.44772 3.44772 4 4 4Z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M7 8H17M7 12H17M7 16H13" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>内存使用历史趋势</span>
            </div>
          </div>
        </template>
        <div ref="memoryTrendChart" style="height: 300px;"></div>
      </el-card>
    </div>
    
    <!-- 磁盘 IO 和 网络流量并列 -->
    <div class="charts-grid">
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <path d="M12 6V4M12 20V18M18 12H20M4 12H6" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>磁盘 IO 吞吐量</span>
            </div>
          </div>
        </template>
        <div ref="ioChart" style="height: 300px;"></div>
      </el-card>
      
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <svg class="header-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9Z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2"/>
                <path d="M8 8H16M8 12H16" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span>网络流量监控</span>
            </div>
          </div>
        </template>
        <div ref="networkChart" style="height: 300px;"></div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { fetchMonitorData } from '../services/api'
import { ElMessage } from 'element-plus'

const cpuGauge = ref(null)
const memoryGauge = ref(null)
const ioChart = ref(null)
const networkChart = ref(null)
const cpuTrendChart = ref(null)
const memoryTrendChart = ref(null)
const loading = ref(false)
const autoRefresh = ref(true)
const refreshInterval = ref(null)
const refreshCountdown = ref(5) // 自动刷新默认5秒
// systemInfo ref 已移除

const cpuLoads = ref({ load1: '0.00', load5: '0.00', load15: '0.00' })
const memoryStats = ref({ used: '0', total: '0', free: '0' })

// 时间范围固定为当天0点到当前时间，不再需要 timeRange ref 和 handleTimeRangeChange
// const timeRange = ref(...) // 已移除
// const handleTimeRangeChange = () => { ... } // 已移除

// 根据负载值获取显示样式
const getLoadClass = (load) => {
  const loadNum = parseFloat(load)
  if (loadNum > 2) return 'value-danger'
  if (loadNum > 1) return 'value-warning'
  return 'value-normal'
}

// 定时更新函数
const startAutoRefresh = () => {
  stopAutoRefresh() 
  refreshCountdown.value = 30 // 刷新间隔30秒
  
  refreshInterval.value = setInterval(() => {
    refreshCountdown.value--
    if (refreshCountdown.value <= 0) {
      refreshCountdown.value = 30 // 重置为30秒
      renderCharts()
    }
  }, 1000)
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    refreshInterval.value = null
  }
}

const toggleAutoRefresh = (value) => {
  if (value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const formatUptime = (seconds) => {
  if (!seconds) return '未知'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  return `${days}天 ${hours}小时 ${minutes}分钟`
}

const initChartInstances = () => {
  if (cpuGauge.value && !cpuGauge.value.__echarts__) {
    echarts.init(cpuGauge.value)
  }
  
  if (memoryGauge.value && !memoryGauge.value.__echarts__) {
    echarts.init(memoryGauge.value)
  }
  
  if (cpuTrendChart.value && !cpuTrendChart.value.__echarts__) {
    echarts.init(cpuTrendChart.value)
  }
  
  if (memoryTrendChart.value && !memoryTrendChart.value.__echarts__) {
    echarts.init(memoryTrendChart.value)
  }
  
  if (ioChart.value && !ioChart.value.__echarts__) {
    echarts.init(ioChart.value)
  }
  
  if (networkChart.value && !networkChart.value.__echarts__) {
    echarts.init(networkChart.value)
  }
}

// 渲染所有图表
const renderCharts = async () => {
  try {
    loading.value = true
    
    // 构建时间范围参数 - 固定为当天0点到当前时间
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const startTime = startOfDay.toISOString()
    const endTime = now.toISOString()
    
    const data = await fetchMonitorData(startTime, endTime)

    if (!data) {
      ElMessage.error('获取监控数据失败')
      return
    }

    // 先确保图表实例存在
    initChartInstances()

    // CPU & Memory - 直接从base参数对象中获取数据
    const baseParamData = data.find(item => item.param === 'base')
    const latestBaseData = baseParamData?.value?.[baseParamData.value.length - 1] || {} // 取最后一个数据点作为当前值
    const cpu = latestBaseData.cpu ?? 0
    const memory = latestBaseData.memory ?? 0
    
    console.log('最新数据:', { cpu, memory, latestBaseData }) // 调试日志
    
    // 更新CPU负载数据
    cpuLoads.value = {
      load1: latestBaseData.cpuLoad1?.toFixed(2) || '0.00',
      load5: latestBaseData.cpuLoad5?.toFixed(2) || '0.00',
      load15: latestBaseData.cpuLoad15?.toFixed(2) || '0.00'
    }
    
    // 从实际数据计算内存详细统计，如果有的话
    const totalMemGB = latestBaseData.memoryTotal ? (latestBaseData.memoryTotal / 1024 / 1024 / 1024).toFixed(2) : '8.00'
    const usedMemGB = latestBaseData.memoryUsed ? (latestBaseData.memoryUsed / 1024 / 1024 / 1024).toFixed(2) : ((memory / 100) * parseFloat(totalMemGB)).toFixed(2)
    const freeMemGB = (parseFloat(totalMemGB) - parseFloat(usedMemGB)).toFixed(2)
    
    memoryStats.value = {
      total: totalMemGB,
      used: usedMemGB,
      free: freeMemGB
    }

    // 渲染CPU仪表盘
    const cpuInstance = echarts.getInstanceByDom(cpuGauge.value) || echarts.init(cpuGauge.value)
    cpuInstance.setOption({
      series: [
        {
          name: 'CPU使用率',
          type: 'gauge',
          min: 0,
          max: 100,
          progress: {
            show: true,
            width: 15
          },
          axisLine: {
            lineStyle: {
              width: 15
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            show: false
          },
          anchor: {
            show: false
          },
          title: {
            show: false
          },
          pointer: {
            show: false
          },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 'bold',
            offsetCenter: [0, '0%'],
            formatter: function(value) {
              return value.toFixed(2) + '%'
            }
          },
          data: [
            {
              value: parseFloat(cpu.toFixed(2)),
              name: 'CPU',
              itemStyle: {
                color: cpu > 80 ? '#ff4757' : cpu > 60 ? '#ffa502' : '#2ed573'
              }
            }
          ]
        }
      ]
    })

    // 渲染内存仪表盘
    const memoryInstance = echarts.getInstanceByDom(memoryGauge.value) || echarts.init(memoryGauge.value)
    memoryInstance.setOption({
      series: [
        {
          name: '内存使用率',
          type: 'gauge',
          min: 0,
          max: 100,
          progress: {
            show: true,
            width: 15
          },
          axisLine: {
            lineStyle: {
              width: 15
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: false
          },
          axisLabel: {
            show: false
          },
          anchor: {
            show: false
          },
          title: {
            show: false
          },
          pointer: {
            show: false
          },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 'bold',
            offsetCenter: [0, '0%'],
            formatter: function(value) {
              return value.toFixed(2) + '%'
            }
          },
          data: [
            {
              value: parseFloat(memory.toFixed(2)),
              name: '内存',
              itemStyle: {
                color: memory > 80 ? '#ff4757' : memory > 60 ? '#ffa502' : '#2ed573'
              }
            }
          ]
        }
      ]
    })

    // 处理历史数据 - 提取时间序列和值
    const baseHistoryValues = baseParamData?.value || []

    const uniqueTimestampsMap = new Map();
    baseHistoryValues.forEach(item => {
        if (item.createdAt && !uniqueTimestampsMap.has(item.createdAt)) {
            uniqueTimestampsMap.set(item.createdAt, item);
        }
    });
    
    const sortedUniqueBaseValues = Array.from(uniqueTimestampsMap.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const formattedBaseTimes = sortedUniqueBaseValues.map(item => {
      const date = new Date(item.createdAt)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    })

    const cpuHistory = sortedUniqueBaseValues.map(item => item.cpu || 0);
    const memoryHistory = sortedUniqueBaseValues.map(item => item.memory || 0);
    

    // IO数据处理 for Line Chart - 合并读写
    const ioRawData = data.find(item => item.param === 'io');
    let ioSeries = [];
    let formattedIoTimestamps = [];
    let totalReadHistory = [];
    let totalWriteHistory = [];


    if (ioRawData && ioRawData.value && ioRawData.value.length > 0) {
      const allIoDeviceStats = ioRawData.value;
      
      const uniqueIoTimestampsMap = new Map();
      allIoDeviceStats.forEach(stat => {
          if (stat.createdAt && !uniqueIoTimestampsMap.has(stat.createdAt)) {
              uniqueIoTimestampsMap.set(stat.createdAt, []);
          }
          if (stat.createdAt) {
            uniqueIoTimestampsMap.get(stat.createdAt).push(stat);
          }
      });

      const sortedUniqueIoTimestamps = Array.from(uniqueIoTimestampsMap.keys()).sort((a,b) => new Date(a) - new Date(b));
      
      formattedIoTimestamps = sortedUniqueIoTimestamps.map(time => {
        const date = new Date(time);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      });

      // 计算每个时间点的总读取和总写入
      sortedUniqueIoTimestamps.forEach(ts => {
        const statsAtTs = uniqueIoTimestampsMap.get(ts) || [];
        let currentTotalRead = 0;
        let currentTotalWrite = 0;

        statsAtTs.forEach(stat => {
          // 仅包括非loop设备且有IO活动的设备
          if (stat.name && !stat.name.startsWith('loop') && stat.count > 0) {
            currentTotalRead += stat.read || 0;
            currentTotalWrite += stat.write || 0;
          }
        });
        totalReadHistory.push((currentTotalRead / 1024).toFixed(2));
        totalWriteHistory.push((currentTotalWrite / 1024).toFixed(2));
      });

      // 定义IO图表配色
      const totalIoReadColor = '#FF8C00'; // 深橙色
      const totalIoWriteColor = '#20B2AA'; // 亮海绿色

      ioSeries.push({
        name: '总读取 (KB/s)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: totalReadHistory,
        itemStyle: { color: totalIoReadColor },
        areaStyle: { opacity: 0.1, color: totalIoReadColor }
      });
      ioSeries.push({
        name: '总写入 (KB/s)',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: totalWriteHistory,
        itemStyle: { color: totalIoWriteColor },
        areaStyle: { opacity: 0.1, color: totalIoWriteColor }
      });
    }


    // CPU历史趋势折线图
    if (formattedBaseTimes.length > 0) {
      const cpuTrendInstance = echarts.getInstanceByDom(cpuTrendChart.value) || echarts.init(cpuTrendChart.value)
      cpuTrendInstance.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: '{b0}<br/>{a0}: {c0}%' // 使用 {b0} 避免重复显示X轴标签
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%', 
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: formattedBaseTimes,
          axisLabel: {
            rotate: 0, // X轴标签不再旋转
            // formatter: function(value) { // 已在 formattedBaseTimes 中处理
            //   return value; 
            // }
          }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          name: '使用率(%)'
        },
        series: [
          {
            name: 'CPU使用率',
            type: 'line',
            smooth: true,
            showSymbol: false, // 去掉数据点
            data: cpuHistory.map(v => v.toFixed(2)), 
            areaStyle: {
              opacity: 0.3,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [ // 渐变色
                { offset: 0, color: 'rgba(255, 107, 107, 0.7)' }, // #FF6B6B
                { offset: 1, color: 'rgba(255, 107, 107, 0.1)' }
              ])
            },
            lineStyle: {
              width: 2,
              color: '#FF6B6B' // 橙红色
            },
            // symbol: 'circle', // 已通过 showSymbol: false 隐藏
            // symbolSize: 6
          }
        ]
      })

      // 内存历史趋势折线图
      const memoryTrendInstance = echarts.getInstanceByDom(memoryTrendChart.value) || echarts.init(memoryTrendChart.value)
      memoryTrendInstance.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: '{b0}<br/>{a0}: {c0}%' // 使用 {b0}
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '10%', 
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: formattedBaseTimes,
          axisLabel: {
            rotate: 0, // X轴标签不再旋转
            // formatter: function(value) { // 已在 formattedBaseTimes 中处理
            //  return value;
            // }
          }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          name: '使用率(%)'
        },
        series: [
          {
            name: '内存使用率',
            type: 'line',
            smooth: true,
            showSymbol: false, // 去掉数据点
            data: memoryHistory.map(v => v.toFixed(2)), 
            areaStyle: {
              opacity: 0.3,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [ // 渐变色
                { offset: 0, color: 'rgba(78, 205, 196, 0.7)' }, // #4ECDC4
                { offset: 1, color: 'rgba(78, 205, 196, 0.1)' }
              ])
            },
            lineStyle: {
              width: 2,
              color: '#4ECDC4' // 青绿色
            },
            // symbol: 'circle', // 已通过 showSymbol: false 隐藏
            // symbolSize: 6
          }
        ]
      })
    } else {
      // 如果没有历史数据 - CPU
      const cpuTrendInstance = echarts.getInstanceByDom(cpuTrendChart.value) || echarts.init(cpuTrendChart.value)
      cpuTrendInstance.setOption({
        title: {
          text: '暂无历史数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#909399',
            fontSize: 16
          }
        }
      })

      // 如果没有历史数据 - 内存
      const memoryTrendInstance = echarts.getInstanceByDom(memoryTrendChart.value) || echarts.init(memoryTrendChart.value)
      memoryTrendInstance.setOption({
        title: {
          text: '暂无历史数据',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#909399',
            fontSize: 16
          }
        }
      })
    }

    // IO Chart - 折线图展示历史趋势
    const ioInstance = echarts.getInstanceByDom(ioChart.value) || echarts.init(ioChart.value);
    if (ioSeries.length > 0) {
      ioInstance.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' }
        },
        legend: { 
          data: ['总读取 (KB/s)', '总写入 (KB/s)'], // 更新图例
          bottom: 10,
          // type: 'scroll' // 可能不再需要scroll，因为只有两条线
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%', 
          containLabel: true
        },
        xAxis: { 
          type: 'category', 
          boundaryGap: false,
          data: formattedIoTimestamps,
          axisLabel: {
            rotate: 0, 
          }
        },
        yAxis: {
          type: 'value',
          name: 'KB/s',
          min: 0
        },
        series: ioSeries 
      });
    } else {
      // 显示"无IO数据"信息
      ioInstance.setOption({
        title: {
          text: '磁盘 IO - 暂无数据',
          left: 'center',
          top: 'center',
          textStyle: {
            fontSize: 16,
            color: '#909399'
          }
        }
      });
    }

    // Network Chart - 只在有网络数据时显示
    // 添加网络数据处理
    const netData = data.find(item => item.param === 'network');
    const hasNetworkData = netData && netData.value && netData.value.length > 0;
    
    if (hasNetworkData) {
      const networkInstance = echarts.getInstanceByDom(networkChart.value) || echarts.init(networkChart.value)
      
      const allNetDeviceStats = netData.value;
      let netSeries = [];
      let formattedNetTimestamps = [];

      const uniqueNetTimestampsMap = new Map();
      allNetDeviceStats.forEach(stat => {
          if (stat.createdAt && !uniqueNetTimestampsMap.has(stat.createdAt)) {
              uniqueNetTimestampsMap.set(stat.createdAt, []);
          }
          if (stat.createdAt) {
            uniqueNetTimestampsMap.get(stat.createdAt).push(stat);
          }
      });
      
      const sortedUniqueNetTimestamps = Array.from(uniqueNetTimestampsMap.keys()).sort((a,b) => new Date(a) - new Date(b));
      formattedNetTimestamps = sortedUniqueNetTimestamps.map(time => {
        const date = new Date(time);
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      });

      // 过滤出有意义的网络设备（排除lo等本地环回）
      const relevantNetDeviceNames = [...new Set(allNetDeviceStats.map(d => d.name).filter(name => name && name !== 'lo'))];
      const netColors = ['#FFD700', '#ADFF2F', '#FF69B4', '#7B68EE']; // 金色, 酸橙绿, 热粉色, 中暗蓝灰
      let netColorIndex = 0;

      relevantNetDeviceNames.forEach(deviceName => {
        const sentData = [];
        const recvData = [];
        sortedUniqueNetTimestamps.forEach(ts => {
          const statsAtTs = uniqueNetTimestampsMap.get(ts) || [];
          const stat = statsAtTs.find(s => s.name === deviceName);
          if (stat) {
            sentData.push((stat.sent / 1024).toFixed(2)); // KB/s
            recvData.push(((stat.received || stat.recv) / 1024).toFixed(2)); // KB/s
          } else {
            sentData.push(null);
            recvData.push(null);
          }
        });
        
        netSeries.push({
          name: `${deviceName} - 发送 (KB/s)`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: sentData,
          itemStyle: { color: netColors[netColorIndex % netColors.length] },
          areaStyle: { opacity: 0.1, color: netColors[netColorIndex % netColors.length] }
        });
        netColorIndex++;
        
        netSeries.push({
          name: `${deviceName} - 接收 (KB/s)`,
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: recvData,
          itemStyle: { color: netColors[netColorIndex % netColors.length] },
          areaStyle: { opacity: 0.1, color: netColors[netColorIndex % netColors.length] }
        });
        netColorIndex++;
      });
      
      networkInstance.setOption({
        title: { text: '网络流量历史趋势', left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: netSeries.map(s => s.name), bottom: 10, type: 'scroll' },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false, data: formattedNetTimestamps, axisLabel: { rotate: 0 } },
        yAxis: { type: 'value', name: 'KB/s', min: 0 },
        series: netSeries
      });

    } else {
      // 显示"无网络数据"信息
      const networkInstance = echarts.getInstanceByDom(networkChart.value) || echarts.init(networkChart.value)
      networkInstance.setOption({
        title: {
          text: '网络流量 - 暂无数据',
          left: 'center',
          top: 'center',
          textStyle: {
            fontSize: 16,
            color: '#909399'
          }
        }
      })
    }

    // 监听窗口变化，重新调整图表大小
    const resizeHandler = () => {
      const cpuInstance = echarts.getInstanceByDom(cpuGauge.value)
      const memoryInstance = echarts.getInstanceByDom(memoryGauge.value)
      
      cpuInstance?.resize()
      memoryInstance?.resize()
      echarts.getInstanceByDom(cpuTrendChart.value)?.resize()
      echarts.getInstanceByDom(memoryTrendChart.value)?.resize()
      echarts.getInstanceByDom(ioChart.value)?.resize()
      echarts.getInstanceByDom(networkChart.value)?.resize()
    }
    
    // 移除之前的监听器，添加新的监听器
    window.removeEventListener('resize', resizeHandler)
    window.addEventListener('resize', resizeHandler)
  } catch (error) {
    console.error('渲染图表失败:', error)
    ElMessage.error('渲染图表失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 强制滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
  
  renderCharts()
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
  
  // 销毁图表
  if (cpuGauge.value?.__echarts__) {
    echarts.getInstanceByDom(cpuGauge.value).dispose()
  }
  if (memoryGauge.value?.__echarts__) {
    echarts.getInstanceByDom(memoryGauge.value).dispose()
  }
  if (cpuTrendChart.value?.__echarts__) {
    echarts.getInstanceByDom(cpuTrendChart.value).dispose()
  }
  if (memoryTrendChart.value?.__echarts__) {
    echarts.getInstanceByDom(memoryTrendChart.value).dispose()
  }
  if (ioChart.value?.__echarts__) {
    echarts.getInstanceByDom(ioChart.value).dispose()
  }
  if (networkChart.value?.__echarts__) {
    echarts.getInstanceByDom(networkChart.value).dispose()
  }
})
</script>

<style scoped>
.monitor-dashboard {
  padding: 20px;
  padding-top: 80px; /* 增加顶部间距，避免被导航栏遮挡 */
  margin-top: 20px; /* 额外增加一些边距 */
}

.dashboard-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  color: white;
}

.dashboard-icon {
  width: 32px;
  height: 32px;
  color: rgba(255, 255, 255, 0.9);
}

.dashboard-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #2ecc71;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(46, 204, 113, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0);
  }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.toolbar {
  display: flex;
  /* justify-content: space-between; // 改为左对齐 */
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.refresh-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-timer {
  font-size: 14px;
  color: #409EFF;
}

/* .time-selector 已移除 */
/* .system-info 已移除 */

.chart-card {
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-icon {
  width: 20px;
  height: 20px;
  color: #409EFF;
  flex-shrink: 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.charts-grid { /* 新增：用于并列图表的网格布局 */
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 1200px) { /* 调整断点使图表在较小屏幕上堆叠 */
  .metrics-grid, .charts-grid {
    grid-template-columns: 1fr;
  }
}

.metric-card {
  padding: 10px;
  border-radius: 16px;
  overflow: hidden;
}

.metric-header {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #606266;
}

.gauge-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gauge-chart {
  width: 50%;
  height: 200px;
}

.metric-details {
  width: 45%;
}

.metric-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 12px;
}

.metric-label {
  color: #606266;
  font-size: 14px;
}

.metric-value {
  font-weight: bold;
  font-size: 16px;
}

.value-normal {
  color: #67C23A;
}

.value-warning {
  color: #E6A23C;
}

.value-danger {
  color: #F56C6C;
}

.chart-container {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}
</style>
