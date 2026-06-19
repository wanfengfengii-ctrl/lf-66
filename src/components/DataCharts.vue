<template>
  <div class="chart-container">
    <div class="chart-tabs">
      <button
        v-for="tab in chartTabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="['chart-tab', { active: activeTab === tab.key }]"
      >
        {{ tab.label }}
      </button>
      <div v-if="lifespanEvaluation.hasHighRisk" class="tab-risk-indicator" title="存在高风险部件">
        ⚠️ {{ lifespanEvaluation.highRiskComponents.length }}
      </div>
    </div>

    <div v-show="activeTab === 'lifespan'" class="lifespan-view">
      <LifespanPrediction />
    </div>

    <div v-show="activeTab === 'realtime'" class="charts-grid">
      <div class="chart-item">
        <div ref="flowChartRef" class="chart"></div>
        <p class="chart-label">送风量变化趋势</p>
      </div>
      <div class="chart-item">
        <div ref="pressureChartRef" class="chart"></div>
        <p class="chart-label">腔体压力变化趋势</p>
      </div>
      <div class="chart-item">
        <div ref="efficiencyChartRef" class="chart"></div>
        <p class="chart-label">送风效率趋势</p>
      </div>
      <div class="chart-item">
        <div ref="riskChartRef" class="chart"></div>
        <p class="chart-label">综合风险评分趋势</p>
      </div>
    </div>

    <div v-show="activeTab === 'comparison'" class="comparison-view">
      <div v-if="selectedSchemes.length < 2" class="empty-compare">
        <div class="empty-compare-icon">📊</div>
        <p>请在右侧"方案管理"中选择至少2个已保存方案进行对比</p>
        <p class="empty-compare-tip">勾选方案列表中的复选框即可添加到对比视图</p>
      </div>
      <div v-else class="comparison-charts">
        <div class="comparison-subtabs">
          <button
            v-for="subtab in comparisonSubtabs"
            :key="subtab.key"
            @click="comparisonSubtab = subtab.key"
            :class="['comparison-subtab', { active: comparisonSubtab === subtab.key }]"
          >
            {{ subtab.label }}
          </button>
        </div>

        <div v-show="comparisonSubtab === 'summary'" class="comparison-summary">
          <div class="chart-item full-width">
            <div ref="compareFlowChartRef" class="chart tall"></div>
            <p class="chart-label">多方案送风量对比 (柱状图)</p>
          </div>
          <div class="chart-item full-width">
            <div ref="compareRadarChartRef" class="chart tall"></div>
            <p class="chart-label">多方案综合性能对比 (雷达图)</p>
          </div>
        </div>

        <div v-show="comparisonSubtab === 'history'" class="comparison-history">
          <div class="chart-item full-width">
            <div ref="compareHistoryFlowRef" class="chart tall"></div>
            <p class="chart-label">多方案送风量历史趋势对比</p>
          </div>
          <div class="chart-item full-width">
            <div ref="compareHistoryEffRef" class="chart tall"></div>
            <p class="chart-label">多方案效率 & 风险历史趋势对比</p>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'overview'" class="overview-view">
      <div class="overview-stats">
        <div class="stat-card primary">
          <span class="stat-icon">💨</span>
          <div class="stat-content">
            <span class="stat-name">当前送风量</span>
            <span class="stat-number">{{ result.airFlowRate.toFixed(0) }}</span>
            <span class="stat-unit">mm³/s</span>
          </div>
        </div>
        <div class="stat-card success">
          <span class="stat-icon">⚡</span>
          <div class="stat-content">
            <span class="stat-name">送风效率</span>
            <span class="stat-number">{{ result.efficiency.toFixed(1) }}%</span>
          </div>
        </div>
        <div class="stat-card warning">
          <span class="stat-icon">⚠️</span>
          <div class="stat-content">
            <span class="stat-name">风险评分</span>
            <span :class="['stat-number', getScoreColor(result.riskScore)]">
              {{ result.riskScore.toFixed(1) }}
            </span>
          </div>
        </div>
        <div class="stat-card danger">
          <span class="stat-icon">🧩</span>
          <div class="stat-content">
            <span class="stat-name">异常数量</span>
            <span :class="['stat-number', result.anomalies.length > 0 ? 'danger' : '']">
              {{ result.anomalies.length }}
            </span>
          </div>
        </div>
      </div>
      <div class="chart-item full-width">
        <div ref="gaugeChartRef" class="chart tall"></div>
        <p class="chart-label">综合性能仪表盘</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { useBellowsStore } from '@/stores/bellows'
import type { Scheme } from '@/types'
import LifespanPrediction from './LifespanPrediction.vue'

const store = useBellowsStore()

const chartTabs = [
  { key: 'overview', label: '📈 总览' },
  { key: 'realtime', label: '📊 实时趋势' },
  { key: 'lifespan', label: '🔧 寿命与维护' },
  { key: 'comparison', label: '🆚 方案对比' }
]
const activeTab = ref('overview')

const lifespanEvaluation = computed(() => store.lifespanEvaluation)

const comparisonSubtabs = [
  { key: 'summary', label: '📊 汇总对比' },
  { key: 'history', label: '📈 历史趋势' }
]
const comparisonSubtab = ref('summary')

const result = computed(() => store.result)
const selectedSchemes = computed(() => store.selectedSchemes)

const flowChartRef = ref<HTMLDivElement | null>(null)
const pressureChartRef = ref<HTMLDivElement | null>(null)
const efficiencyChartRef = ref<HTMLDivElement | null>(null)
const riskChartRef = ref<HTMLDivElement | null>(null)
const compareFlowChartRef = ref<HTMLDivElement | null>(null)
const compareRadarChartRef = ref<HTMLDivElement | null>(null)
const compareHistoryFlowRef = ref<HTMLDivElement | null>(null)
const compareHistoryEffRef = ref<HTMLDivElement | null>(null)
const gaugeChartRef = ref<HTMLDivElement | null>(null)

let flowChart: echarts.ECharts | null = null
let pressureChart: echarts.ECharts | null = null
let efficiencyChart: echarts.ECharts | null = null
let riskChart: echarts.ECharts | null = null
let compareFlowChart: echarts.ECharts | null = null
let compareRadarChart: echarts.ECharts | null = null
let compareHistoryFlowChart: echarts.ECharts | null = null
let compareHistoryEffChart: echarts.ECharts | null = null
let gaugeChart: echarts.ECharts | null = null

const comparisonColors = ['#4a90d9', '#e67e22', '#27ae60', '#8e44ad', '#d35400']

function getScoreColor(score: number): string {
  if (score >= 70) return 'danger'
  if (score >= 40) return 'warning'
  return 'success'
}

function initFlowChart() {
  if (!flowChartRef.value) return
  flowChart = echarts.init(flowChartRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0]
        return `时间: ${d.value[0].toFixed(2)}s<br/>送风量: ${d.value[1].toFixed(2)} mm³/s`
      }
    },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '风量(mm³/s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    series: [{
      type: 'line',
      data: [],
      smooth: true,
      lineStyle: { color: '#3498db', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(52, 152, 219, 0.35)' },
          { offset: 1, color: 'rgba(52, 152, 219, 0.02)' }
        ])
      },
      showSymbol: false
    }]
  }
  flowChart.setOption(option)
}

function initPressureChart() {
  if (!pressureChartRef.value) return
  pressureChart = echarts.init(pressureChartRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    tooltip: { trigger: 'axis' },
    legend: { data: ['左腔压力', '右腔压力'], top: 0, textStyle: { fontSize: 10 } },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '压力(atm)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    series: [
      { name: '左腔压力', type: 'line', data: [], smooth: true, lineStyle: { color: '#e74c3c', width: 2 }, showSymbol: false },
      { name: '右腔压力', type: 'line', data: [], smooth: true, lineStyle: { color: '#27ae60', width: 2 }, showSymbol: false }
    ]
  }
  pressureChart.setOption(option)
}

function initEfficiencyChart() {
  if (!efficiencyChartRef.value) return
  efficiencyChart = echarts.init(efficiencyChartRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0]
        return `时间: ${d.value[0].toFixed(2)}s<br/>效率: ${d.value[1].toFixed(1)}%`
      }
    },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '效率(%)', min: 0, max: 100, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    series: [{
      type: 'line',
      data: [],
      smooth: true,
      lineStyle: { color: '#27ae60', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(39, 174, 96, 0.35)' },
          { offset: 1, color: 'rgba(39, 174, 96, 0.02)' }
        ])
      },
      showSymbol: false,
      markLine: {
        silent: true,
        data: [{ yAxis: 40, lineStyle: { color: '#e67e22', type: 'dashed' }, label: { formatter: '警戒40%', fontSize: 9 } }]
      }
    }]
  }
  efficiencyChart.setOption(option)
}

function initRiskChart() {
  if (!riskChartRef.value) return
  riskChart = echarts.init(riskChartRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0]
        return `时间: ${d.value[0].toFixed(2)}s<br/>风险评分: ${d.value[1].toFixed(1)}`
      }
    },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '风险评分', min: 0, max: 100, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    visualMap: {
      show: false,
      pieces: [
      { gt: 70, color: '#e74c3c' },
      { gt: 40, lte: 70, color: '#f39c12' },
      { lte: 40, color: '#27ae60' }
    ]
    },
    series: [{
      type: 'line',
      data: [],
      smooth: true,
      lineStyle: { width: 2 },
      showSymbol: false,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(231, 76, 60, 0.25)' },
          { offset: 1, color: 'rgba(231, 76, 60, 0.02)' }
        ])
      },
      markLine: {
        silent: true,
        data: [
          { yAxis: 40, lineStyle: { color: '#f39c12', type: 'dashed' }, label: { formatter: '中风险', fontSize: 9 } },
          { yAxis: 70, lineStyle: { color: '#e74c3c', type: 'dashed' }, label: { formatter: '高风险', fontSize: 9 } }
        ]
      }
    }]
  }
  riskChart.setOption(option)
}

function initCompareFlowChart() {
  if (!compareFlowChartRef.value) return
  compareFlowChart = echarts.init(compareFlowChartRef.value)
}

function initCompareRadarChart() {
  if (!compareRadarChartRef.value) return
  compareRadarChart = echarts.init(compareRadarChartRef.value)
}

function initCompareHistoryFlowChart() {
  if (!compareHistoryFlowRef.value) return
  compareHistoryFlowChart = echarts.init(compareHistoryFlowRef.value)
}

function initCompareHistoryEffChart() {
  if (!compareHistoryEffRef.value) return
  compareHistoryEffChart = echarts.init(compareHistoryEffRef.value)
}

function initGaugeChart() {
  if (!gaugeChartRef.value) return
  gaugeChart = echarts.init(gaugeChartRef.value)
  updateGaugeChart()
}

function updateRealtimeCharts() {
  if (flowChart) {
    const flowData = store.airFlowHistory.map(p => [p.time, p.flowRate])
    flowChart.setOption({ series: [{ data: flowData }] })
  }

  if (pressureChart) {
    const leftData = store.pressureHistory.map(p => [p.time, p.leftPressure])
    const rightData = store.pressureHistory.map(p => [p.time, p.rightPressure])
    pressureChart.setOption({ series: [{ data: leftData }, { data: rightData }] })
  }

  if (efficiencyChart) {
    const effData = store.efficiencyHistory.map(p => [p.time, p.efficiency])
    efficiencyChart.setOption({ series: [{ data: effData }] })
  }

  if (riskChart) {
    const riskData = store.riskHistory.map(p => [p.time, p.riskScore])
    riskChart.setOption({ series: [{ data: riskData }] })
  }
}

function updateComparisonCharts() {
  if (!compareFlowChart || selectedSchemes.value.length < 2) return

  const schemes: Scheme[] = selectedSchemes.value
  const names = schemes.map(s => s.name)

  const flowOption: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['实际送风量', '理论最大风量', '送风效率(%)', '风险评分'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 25, top: 45, bottom: 50 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { fontSize: 11, rotate: 15, interval: 0 }
    },
    yAxis: [{
      type: 'value',
      name: '风量 / 效率 / 风险',
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 10 }
    }],
    series: [
      {
        name: '实际送风量',
        type: 'bar',
        data: schemes.map(s => s.result.airFlowRate.toFixed(0)),
        itemStyle: { color: comparisonColors[0] },
        barWidth: 16
      },
      {
        name: '理论最大风量',
        type: 'bar',
        data: schemes.map(s => s.result.theoreticalMaxFlow.toFixed(0)),
        itemStyle: { color: '#95a5a6' },
        barWidth: 16
      },
      {
        name: '送风效率(%)',
        type: 'bar',
        data: schemes.map(s => s.result.efficiency.toFixed(1)),
        itemStyle: { color: comparisonColors[2] },
        barWidth: 16
      },
      {
        name: '风险评分',
        type: 'bar',
        data: schemes.map(s => s.result.riskScore.toFixed(1)),
        itemStyle: { color: comparisonColors[1] },
        barWidth: 16
      }
    ]
  }
  compareFlowChart.setOption(flowOption, true)

  if (!compareRadarChart) return
  const radarIndicator = [
    { name: '送风量', max: 100 },
    { name: '效率', max: 100 },
    { name: '稳定性(低风险)', max: 100 },
    { name: '低波动', max: 100 },
    { name: '阀片可靠性', max: 100 }
  ]

  function normalizeFlow(val: number): number {
    const allFlows = schemes.map(s => s.result.airFlowRate)
    const maxFlow = Math.max(...allFlows, 1)
    return Math.min(100, (val / maxFlow) * 100)
  }

  function normalizeFluctuation(val: number): number {
    return Math.max(0, 100 - val / 20)
  }

  const radarSeries = schemes.map((s, idx) => ({
    name: s.name,
    value: [
      normalizeFlow(s.result.airFlowRate),
      s.result.efficiency,
      100 - s.result.riskScore,
      normalizeFluctuation(s.result.fluctuationAmplitude),
      (1 - s.result.valveRisk) * 100
    ],
    lineStyle: { color: comparisonColors[idx % comparisonColors.length], width: 2 },
    itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
    areaStyle: {
      color: comparisonColors[idx % comparisonColors.length],
      opacity: 0.15
    }
  }))

  const radarOption: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {},
    legend: {
      data: schemes.map(s => s.name),
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    radar: {
      indicator: radarIndicator,
      radius: '60%',
      center: ['50%', '48%'],
      axisName: { fontSize: 11, color: '#555' },
      splitArea: {
        areaStyle: {
          color: ['rgba(52, 152, 219, 0.02)', 'rgba(52, 152, 219, 0.05)']
        }
      }
    },
    series: [{
      type: 'radar',
      data: radarSeries
    }]
  }

  compareRadarChart.setOption(radarOption, true)

  updateComparisonHistoryCharts()
}

function updateComparisonHistoryCharts() {
  if (!compareHistoryFlowChart || selectedSchemes.value.length < 2) return

  const schemes: Scheme[] = selectedSchemes.value

  const flowSeries = schemes.map((scheme, idx) => {
    const data = scheme.airFlowHistory?.map(p => [p.time, p.flowRate]) || []
    return {
      name: scheme.name,
      type: 'line',
      data,
      smooth: true,
      lineStyle: { color: comparisonColors[idx % comparisonColors.length], width: 2 },
      itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
      showSymbol: false
    }
  })

  const flowOption: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `时间: ${params[0]?.value?.[0]?.toFixed(2)}s<br/>`
        params.forEach((p: any) => {
          html += `${p.seriesName}: ${p.value[1]?.toFixed(0)} mm³/s<br/>`
        })
        return html
      }
    },
    legend: {
      data: schemes.map(s => s.name),
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 20, top: 35, bottom: 30 },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '风量(mm³/s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    series: flowSeries as any
  }
  compareHistoryFlowChart.setOption(flowOption, true)

  if (!compareHistoryEffChart) return

  const effSeries: any[] = []
  schemes.forEach((scheme, idx) => {
    const effData = scheme.efficiencyHistory?.map(p => [p.time, p.efficiency]) || []
    effSeries.push({
      name: `${scheme.name} - 效率`,
      type: 'line',
      data: effData,
      smooth: true,
      lineStyle: { color: comparisonColors[idx % comparisonColors.length], width: 2 },
      itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
      showSymbol: false,
      yAxisIndex: 0
    })
    const riskData = scheme.riskHistory?.map(p => [p.time, p.riskScore]) || []
    effSeries.push({
      name: `${scheme.name} - 风险`,
      type: 'line',
      data: riskData,
      smooth: true,
      lineStyle: { color: comparisonColors[idx % comparisonColors.length], width: 2, type: 'dashed' },
      itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
      showSymbol: false,
      yAxisIndex: 1
    })
  })

  const effOption: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `时间: ${params[0]?.value?.[0]?.toFixed(2)}s<br/>`
        params.forEach((p: any) => {
          const unit = p.seriesName.includes('效率') ? '%' : '分'
          html += `${p.seriesName}: ${p.value[1]?.toFixed(1)}${unit}<br/>`
        })
        return html
      }
    },
    legend: {
      data: effSeries.map(s => s.name),
      top: 0,
      textStyle: { fontSize: 10 }
    },
    grid: { left: 55, right: 55, top: 40, bottom: 30 },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: [
      { type: 'value', name: '效率(%)', min: 0, max: 100, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
      { type: 'value', name: '风险评分', min: 0, max: 100, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } }
    ],
    series: effSeries
  }
  compareHistoryEffChart.setOption(effOption, true)
}

function updateGaugeChart() {
  if (!gaugeChart) return
  const r = result.value
  const compositeScore = Math.max(0, Math.min(100,
    r.efficiency * 0.5 +
    (100 - r.riskScore) * 0.35 +
    Math.max(0, 100 - r.fluctuationAmplitude / 20) * 0.15
  ))

  const gaugeOption: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 10,
      radius: '85%',
      center: ['50%', '58%'],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#e74c3c' },
          { offset: 0.4, color: '#f39c12' },
          { offset: 0.7, color: '#3498db' },
          { offset: 1, color: '#27ae60' }
        ])
      },
      progress: { show: true, width: 18 },
      pointer: { icon: 'triangle', length: '60%', width: 8, itemStyle: { color: '#333' } },
      axisLine: { lineStyle: { width: 18 } },
      axisTick: { distance: -24, length: 6, lineStyle: { color: '#999', width: 1 } },
      splitLine: { distance: -28, length: 12, lineStyle: { color: '#777', width: 2 } },
      axisLabel: { distance: 18, color: '#888', fontSize: 10 },
      anchor: { show: true, showAbove: true, size: 14, itemStyle: { borderWidth: 4, color: '#fff', borderColor: '#4a90d9' } },
      title: { offsetCenter: [0, '10%'], fontSize: 13, fontWeight: 600 },
      detail: {
        offsetCenter: [0, '40%'],
        valueAnimation: true,
        fontSize: 32,
        fontWeight: 700,
        formatter: '{value}',
        color: '#2c3e50'
      },
      data: [{ value: Number(compositeScore.toFixed(1)), name: '综合性能评分' }]
    }]
  }
  gaugeChart.setOption(gaugeOption)
}

let updateInterval: number | null = null

function handleResize() {
  flowChart?.resize()
  pressureChart?.resize()
  efficiencyChart?.resize()
  riskChart?.resize()
  compareFlowChart?.resize()
  compareRadarChart?.resize()
  compareHistoryFlowChart?.resize()
  compareHistoryEffChart?.resize()
  gaugeChart?.resize()
}

watch(() => store.airFlowHistory.length, () => updateRealtimeCharts())
watch(() => store.pressureHistory.length, () => updateRealtimeCharts())
watch(() => store.efficiencyHistory.length, () => updateRealtimeCharts())
watch(() => store.riskHistory.length, () => updateRealtimeCharts())

watch(() => store.params, () => {
  setTimeout(() => {
    updateRealtimeCharts()
    updateGaugeChart()
  }, 60)
}, { deep: true })

watch(selectedSchemes, () => {
  setTimeout(updateComparisonCharts, 80)
}, { deep: true })

watch(activeTab, (newVal) => {
  setTimeout(() => {
    handleResize()
    if (newVal === 'comparison') updateComparisonCharts()
    if (newVal === 'overview') updateGaugeChart()
    if (newVal === 'realtime') updateRealtimeCharts()
  }, 50)
})

watch(comparisonSubtab, () => {
  setTimeout(() => {
    handleResize()
    updateComparisonCharts()
  }, 50)
})

onMounted(() => {
  initFlowChart()
  initPressureChart()
  initEfficiencyChart()
  initRiskChart()
  initCompareFlowChart()
  initCompareRadarChart()
  initCompareHistoryFlowChart()
  initCompareHistoryEffChart()
  initGaugeChart()
  setTimeout(() => {
    updateRealtimeCharts()
    updateGaugeChart()
  }, 100)
  updateInterval = window.setInterval(updateRealtimeCharts, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval)
  flowChart?.dispose()
  pressureChart?.dispose()
  efficiencyChart?.dispose()
  riskChart?.dispose()
  compareFlowChart?.dispose()
  compareRadarChart?.dispose()
  compareHistoryFlowChart?.dispose()
  compareHistoryEffChart?.dispose()
  gaugeChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.chart-container {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
}

.tab-risk-indicator {
  padding: 4px 10px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3);
  animation: risk-pulse 2s ease-in-out infinite;
}

@keyframes risk-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.lifespan-view {
  width: 100%;
}

.chart-tab {
  padding: 8px 18px;
  border: 2px solid transparent;
  border-radius: 20px;
  background: white;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-tab:hover {
  background: #e8f4f8;
  color: #2980b9;
}

.chart-tab.active {
  background: linear-gradient(135deg, #4a90d9, #357abd);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}

.comparison-subtabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.comparison-subtab {
  padding: 6px 14px;
  border: 1px solid #d0d7de;
  border-radius: 16px;
  background: white;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.comparison-subtab:hover {
  background: #f0f4f8;
  color: #2980b9;
}

.comparison-subtab.active {
  background: #e8f4f8;
  color: #2980b9;
  border-color: #4a90d9;
}

.comparison-summary,
.comparison-history {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
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
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.chart-item.full-width {
  grid-column: 1 / -1;
}

.chart {
  width: 100%;
  height: 200px;
}

.chart.tall {
  height: 280px;
}

.chart-label {
  margin: 10px 0 0 0;
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.comparison-view {
  min-height: 400px;
}

.comparison-charts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.empty-compare {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #999;
  text-align: center;
  padding: 40px;
}

.empty-compare-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-compare p {
  font-size: 14px;
  margin: 4px 0;
}

.empty-compare-tip {
  font-size: 12px !important;
  color: #bbb;
}

.overview-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.stat-name {
  font-size: 12px;
  color: #888;
}

.stat-number {
  font-size: 22px;
  font-weight: 700;
  color: #2c3e50;
}

.stat-number.success {
  color: #27ae60;
}

.stat-number.warning {
  color: #f39c12;
}

.stat-number.danger {
  color: #e74c3c;
}

.stat-unit {
  font-size: 11px;
  color: #aaa;
}

.stat-card.primary {
  border-left: 4px solid #3498db;
}

.stat-card.success {
  border-left: 4px solid #27ae60;
}

.stat-card.warning {
  border-left: 4px solid #f39c12;
}

.stat-card.danger {
  border-left: 4px solid #e74c3c;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .overview-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 500px) {
  .overview-stats {
    grid-template-columns: 1fr;
  }
}
</style>
