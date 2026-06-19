<template>
  <div class="chart-container">
    <h3 class="chart-title">实时数据监测</h3>
    <div class="charts-grid">
      <div class="chart-item">
        <div ref="flowChartRef" class="chart"></div>
        <p class="chart-label">送风量变化</p>
      </div>
      <div class="chart-item">
        <div ref="pressureChartRef" class="chart"></div>
        <p class="chart-label">腔体压力变化</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useBellowsStore } from '@/stores/bellows'

const store = useBellowsStore()

const flowChartRef = ref<HTMLDivElement | null>(null)
const pressureChartRef = ref<HTMLDivElement | null>(null)

let flowChart: echarts.ECharts | null = null
let pressureChart: echarts.ECharts | null = null

function initFlowChart() {
  if (!flowChartRef.value) return

  flowChart = echarts.init(flowChartRef.value)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      left: 50,
      right: 20,
      top: 30,
      bottom: 30
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `时间: ${data.value[0].toFixed(2)}s<br/>送风量: ${data.value[1].toFixed(2)} mm³/s`
      }
    },
    xAxis: {
      type: 'value',
      name: '时间 (s)',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      name: '送风量 (mm³/s)',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        type: 'line',
        data: [],
        smooth: true,
        lineStyle: {
          color: '#3498db',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52, 152, 219, 0.3)' },
            { offset: 1, color: 'rgba(52, 152, 219, 0.05)' }
          ])
        },
        showSymbol: false
      }
    ]
  }

  flowChart.setOption(option)
  updateCharts()
}

function initPressureChart() {
  if (!pressureChartRef.value) return

  pressureChart = echarts.init(pressureChartRef.value)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: {
      left: 50,
      right: 20,
      top: 30,
      bottom: 30
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['左腔压力', '右腔压力'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    xAxis: {
      type: 'value',
      name: '时间 (s)',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      name: '压力 (atm)',
      nameTextStyle: { fontSize: 11 },
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '左腔压力',
        type: 'line',
        data: [],
        smooth: true,
        lineStyle: { color: '#e74c3c', width: 2 },
        showSymbol: false
      },
      {
        name: '右腔压力',
        type: 'line',
        data: [],
        smooth: true,
        lineStyle: { color: '#27ae60', width: 2 },
        showSymbol: false
      }
    ]
  }

  pressureChart.setOption(option)
  updateCharts()
}

function updateCharts() {
  if (flowChart) {
    const flowData = store.airFlowHistory.map(p => [p.time, p.flowRate])
    flowChart.setOption({
      series: [{ data: flowData }]
    })
  }

  if (pressureChart) {
    const leftPressureData = store.pressureHistory.map(p => [p.time, p.leftPressure])
    const rightPressureData = store.pressureHistory.map(p => [p.time, p.rightPressure])

    pressureChart.setOption({
      series: [
        { data: leftPressureData },
        { data: rightPressureData }
      ]
    })
  }
}

let updateInterval: number | null = null

function handleResize() {
  flowChart?.resize()
  pressureChart?.resize()
}

onMounted(() => {
  initFlowChart()
  initPressureChart()
  updateInterval = window.setInterval(updateCharts, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  flowChart?.dispose()
  pressureChart?.dispose()
  window.removeEventListener('resize', handleResize)
})

watch(() => store.params, () => {
  setTimeout(updateCharts, 50)
}, { deep: true })

watch(() => store.airFlowHistory.length, () => {
  updateCharts()
})

watch(() => store.pressureHistory.length, () => {
  updateCharts()
})
</script>

<style scoped>
.chart-container {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart {
  width: 100%;
  height: 200px;
}

.chart-label {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #666;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
