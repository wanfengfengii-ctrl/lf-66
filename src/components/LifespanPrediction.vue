<template>
  <div class="lifespan-container">
    <div v-if="lifespanEvaluation.hasHighRisk" class="high-risk-banner danger">
      <span class="banner-icon">🚨</span>
      <span class="banner-text">
        <strong>紧急风险：</strong>{{ lifespanEvaluation.highRiskComponents.join('、') }} 剩余寿命不足15%，建议立即停机更换！
      </span>
    </div>
    <div v-else-if="lifespanEvaluation.hasWarning" class="high-risk-banner warning">
      <span class="banner-icon">⚠️</span>
      <span class="banner-text">
        <strong>维护提醒：</strong>{{ lifespanEvaluation.warningComponents.join('、') }} 已进入预警区间(剩余寿命15%-30%)，请安排近期维护。
      </span>
    </div>

    <div class="lifespan-subtabs">
      <button
        v-for="tab in lifespanSubtabs"
        :key="tab.key"
        @click="activeSubtab = tab.key"
        :class="['lifespan-subtab', { active: activeSubtab === tab.key }]"
      >
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <div v-show="activeSubtab === 'overview'" class="lifespan-overview">
      <div class="health-score-section">
        <div class="overall-health-card" :class="getHealthClass(lifespanEvaluation.overallHealthScore)">
          <div class="health-header">
            <span class="health-title">系统整体健康度</span>
            <span class="health-badge">{{ getHealthLabel(lifespanEvaluation.overallHealthScore) }}</span>
          </div>
          <div class="health-score-display">
            <div ref="healthGaugeRef" class="health-gauge"></div>
          </div>
          <div class="health-info-row">
            <div class="info-item">
              <span class="info-label">建议维护周期</span>
              <span class="info-value">
                {{ formatHours(lifespanEvaluation.estimatedMaintenanceCycleHours) }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">高风险部件</span>
              <span :class="['info-value', 'danger']" v-if="lifespanEvaluation.hasHighRisk">
                {{ lifespanEvaluation.highRiskComponents.length }} 个
              </span>
              <span class="info-value success" v-else>无</span>
            </div>
          </div>
        </div>

        <div class="component-health-grid">
          <div
            v-for="comp in lifespanEvaluation.components"
            :key="comp.componentKey"
            class="component-health-card"
            :class="`risk-${comp.riskLevel}`"
          >
            <div class="comp-header">
              <span class="comp-icon">{{ getComponentIcon(comp.componentKey) }}</span>
              <span class="comp-name">{{ comp.componentName }}</span>
              <span :class="['comp-risk-badge', comp.riskLevel]">
                {{ getRiskLabel(comp.riskLevel) }}
              </span>
            </div>
            <div class="comp-health-bar">
              <div
                class="health-fill"
                :style="{ width: `${comp.healthScore}%` }"
                :class="getHealthBarClass(comp.healthScore)"
              ></div>
              <span class="health-percent">{{ comp.healthScore }}%</span>
            </div>
            <div class="comp-stats">
              <div class="comp-stat">
                <span class="stat-label">剩余寿命</span>
                <span class="stat-value">{{ formatHours(comp.remainingLifespanHours) }}</span>
              </div>
              <div class="comp-stat">
                <span class="stat-label">基准寿命</span>
                <span class="stat-value">{{ formatHours(comp.baseLifespanHours) }}</span>
              </div>
              <div class="comp-stat">
                <span class="stat-label">磨损速率</span>
                <span class="stat-value">{{ comp.wearRate.toFixed(4) }}‰/h</span>
              </div>
            </div>
            <div class="comp-warn-threshold">
              <span v-if="comp.riskLevel !== 'normal'" class="threshold-warn">
                ⚠ 预警阈值：{{ formatHours(comp.thresholdHours) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="wear-factors-card">
        <h4 class="section-heading">🔍 磨损影响因子分析</h4>
        <div class="factors-grid">
          <div class="factor-item">
            <span class="factor-name">拉杆频率</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.frequencyFactor - 1) * 50)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.frequencyFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.frequencyFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">阀片卡滞</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.valveStuckFactor - 1) * 30)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.valveStuckFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.valveStuckFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">负载压力</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.loadPressureFactor - 1) * 50)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.loadPressureFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.loadPressureFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">环境阻力</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.resistanceFactor - 1) * 70)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.resistanceFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.resistanceFactor.toFixed(2) }}</span>
          </div>
          <div class="factor-item">
            <span class="factor-name">漏气率</span>
            <div class="factor-bar">
              <div
                class="factor-fill"
                :style="{ width: `${Math.min(100, (lifespanEvaluation.wearFactors.leakageFactor - 1) * 40)}%` }"
                :class="getFactorClass(lifespanEvaluation.wearFactors.leakageFactor)"
              ></div>
            </div>
            <span class="factor-value">×{{ lifespanEvaluation.wearFactors.leakageFactor.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'trend'" class="lifespan-trend-view">
      <div class="chart-item full-width">
        <div ref="lifespanTrendChartRef" class="chart tall"></div>
        <p class="chart-label">部件寿命衰减趋势预测（运行小时 vs 健康度）</p>
      </div>

      <div class="chart-item full-width">
        <div ref="componentLifespanBarRef" class="chart tall"></div>
        <p class="chart-label">各部件剩余寿命对比（小时）</p>
      </div>
    </div>

    <div v-show="activeSubtab === 'alerts'" class="lifespan-alerts-view">
      <div class="alerts-section">
        <h4 class="section-heading">
          <span>⚠️ 维护预警列表</span>
          <span class="alert-count-badge">{{ lifespanEvaluation.maintenanceAlerts.length }}</span>
        </h4>
        <div v-if="lifespanEvaluation.maintenanceAlerts.length === 0" class="empty-alerts">
          <div class="empty-icon">✅</div>
          <p>所有部件状态良好，暂无维护预警</p>
          <p class="empty-tip">继续保持良好的运行工况</p>
        </div>
        <div v-else class="alerts-list">
          <div
            v-for="alert in lifespanEvaluation.maintenanceAlerts"
            :key="alert.id"
            :class="['alert-item', alert.level]"
          >
            <div class="alert-header">
              <span class="alert-icon">{{ getAlertIcon(alert.level) }}</span>
              <span class="alert-title">{{ alert.title }}</span>
              <span :class="['alert-level-badge', alert.level]">
                {{ getAlertLevelLabel(alert.level) }}
              </span>
            </div>
            <p class="alert-message">{{ alert.message }}</p>
            <div class="alert-footer">
              <span class="alert-remaining">
                ⏱ 剩余寿命：<strong>{{ formatHours(alert.remainingHours) }}</strong>
              </span>
              <span class="alert-action">
                🔧 建议：<strong>{{ alert.recommendedAction }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="suggestions-section">
        <h4 class="section-heading">📋 维护建议清单</h4>
        <div class="suggestions-list">
          <div
            v-for="(suggestion, index) in lifespanEvaluation.suggestions"
            :key="index"
            :class="['suggestion-item', `urgency-${suggestion.urgency}`]"
          >
            <div class="suggestion-header">
              <span :class="['urgency-badge', suggestion.urgency]">
                {{ getUrgencyLabel(suggestion.urgency) }}
              </span>
              <span class="suggestion-component">{{ suggestion.component }}</span>
            </div>
            <div class="suggestion-body">
              <div class="suggestion-row">
                <span class="suggestion-label">维护措施：</span>
                <span class="suggestion-value action">{{ suggestion.action }}</span>
              </div>
              <div class="suggestion-row">
                <span class="suggestion-label">计划时间：</span>
                <span class="suggestion-value schedule">{{ suggestion.schedule }}</span>
              </div>
              <div class="suggestion-row">
                <span class="suggestion-label">预估费用：</span>
                <span class="suggestion-value cost">{{ suggestion.estimatedCost }}</span>
              </div>
              <div class="suggestion-row reason-row">
                <span class="suggestion-label">原因分析：</span>
                <span class="suggestion-value reason">{{ suggestion.reason }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeSubtab === 'comparison'" class="lifespan-comparison-view">
      <div v-if="selectedSchemes.length < 2" class="empty-compare">
        <div class="empty-compare-icon">📊</div>
        <p>请在右侧"方案管理"中选择至少2个已保存方案进行对比</p>
        <p class="empty-compare-tip">勾选方案列表中的复选框即可添加到对比视图</p>
      </div>
      <div v-else class="comparison-content">
        <div class="compare-hint">
          <span class="hint-icon">ℹ️</span>
          <span class="hint-text">提示：升级前保存的旧方案将按其保存参数自动计算寿命数据，用于对比参考。</span>
        </div>
        <div class="chart-item full-width">
          <div ref="compareHealthRadarRef" class="chart tall"></div>
          <p class="chart-label">多方案部件健康度对比（雷达图）</p>
        </div>

        <div class="chart-item full-width">
          <div ref="compareLifespanBarRef" class="chart tall"></div>
          <p class="chart-label">多方案部件剩余寿命对比（小时）</p>
        </div>

        <div class="comparison-table-card">
          <h4 class="section-heading">📋 维护周期对比表</h4>
          <div class="comparison-table-wrapper">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>方案名称</th>
                  <th>整体健康度</th>
                  <th>阀片寿命</th>
                  <th>密封件寿命</th>
                  <th>活塞寿命</th>
                  <th>维护周期</th>
                  <th>风险状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(scheme, idx) in computedForComparison" :key="scheme.id">
                  <td :class="['scheme-name-cell']">
                    <span class="color-dot" :style="{ background: comparisonColors[idx % comparisonColors.length] }"></span>
                    {{ scheme.name }}
                  </td>
                  <td :class="getHealthTableClass(scheme.lifespanEvaluation.overallHealthScore)">
                    {{ scheme.lifespanEvaluation.overallHealthScore.toFixed(1) }}%
                  </td>
                  <td>{{ formatHours(scheme.lifespanEvaluation.components[0].remainingLifespanHours) }}</td>
                  <td>{{ formatHours(scheme.lifespanEvaluation.components[1].remainingLifespanHours) }}</td>
                  <td>{{ formatHours(scheme.lifespanEvaluation.components[2].remainingLifespanHours) }}</td>
                  <td>{{ formatHours(scheme.lifespanEvaluation.estimatedMaintenanceCycleHours) }}</td>
                  <td>
                    <span v-if="scheme.lifespanEvaluation.hasHighRisk" class="high-risk-tag">
                      🚨 紧急 {{ scheme.lifespanEvaluation.highRiskComponents.length }}个
                    </span>
                    <span v-else-if="scheme.lifespanEvaluation.hasWarning" class="warning-tag">
                      ⚠️ 预警 {{ scheme.lifespanEvaluation.warningComponents.length }}个
                    </span>
                    <span v-else class="no-risk-tag">✅ 正常</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useBellowsStore } from '@/stores/bellows'
import type { Scheme } from '@/types'

const store = useBellowsStore()

const lifespanEvaluation = computed(() => store.lifespanEvaluation)
const selectedSchemes = computed(() => store.selectedSchemes)
const comparisonColors = ['#4a90d9', '#e67e22', '#27ae60', '#8e44ad', '#d35400']

const lifespanSubtabs = [
  { key: 'overview', label: '总览', icon: '📊' },
  { key: 'trend', label: '寿命趋势', icon: '📈' },
  { key: 'alerts', label: '维护预警', icon: '⚠️' },
  { key: 'comparison', label: '方案对比', icon: '🆚' }
]
const activeSubtab = ref('overview')

const healthGaugeRef = ref<HTMLDivElement | null>(null)
const lifespanTrendChartRef = ref<HTMLDivElement | null>(null)
const componentLifespanBarRef = ref<HTMLDivElement | null>(null)
const compareHealthRadarRef = ref<HTMLDivElement | null>(null)
const compareLifespanBarRef = ref<HTMLDivElement | null>(null)

let healthGaugeChart: echarts.ECharts | null = null
let lifespanTrendChart: echarts.ECharts | null = null
let componentLifespanBarChart: echarts.ECharts | null = null
let compareHealthRadarChart: echarts.ECharts | null = null
let compareLifespanBarChart: echarts.ECharts | null = null

const computedForComparison = computed(() => {
  const computedSchemes: (Scheme & { lifespanEvaluation: NonNullable<Scheme['lifespanEvaluation']> })[] = []
  selectedSchemes.value.forEach(s => {
    store.ensureSchemeLifespan(s)
    computedSchemes.push(s as Scheme & { lifespanEvaluation: NonNullable<Scheme['lifespanEvaluation']> })
  })
  return computedSchemes
})

function formatHours(hours: number): string {
  if (hours < 24) return `${hours}h`
  if (hours < 24 * 30) return `${(hours / 24).toFixed(1)}天`
  if (hours < 24 * 365) return `${(hours / 24 / 30).toFixed(1)}月`
  return `${(hours / 24 / 365).toFixed(2)}年`
}

function getHealthClass(score: number): string {
  if (score >= 70) return 'health-excellent'
  if (score >= 40) return 'health-warning'
  return 'health-danger'
}

function getHealthLabel(score: number): string {
  if (score >= 85) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 50) return '一般'
  if (score >= 30) return '较差'
  return '危险'
}

function getHealthBarClass(score: number): string {
  if (score >= 70) return 'fill-green'
  if (score >= 40) return 'fill-yellow'
  return 'fill-red'
}

function getHealthTableClass(score: number): string {
  if (score >= 70) return 'cell-success'
  if (score >= 40) return 'cell-warning'
  return 'cell-danger'
}

function getRiskLabel(level: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    warning: '预警',
    danger: '危险'
  }
  return map[level] || level
}

function getComponentIcon(key: string): string {
  const map: Record<string, string> = {
    valve: '🔩',
    seal: '🛡️',
    piston: '⚙️'
  }
  return map[key] || '📦'
}

function getFactorClass(factor: number): string {
  if (factor >= 2.5) return 'factor-danger'
  if (factor >= 1.5) return 'factor-warning'
  return 'factor-normal'
}

function getAlertIcon(level: string): string {
  const map: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨'
  }
  return map[level] || '📌'
}

function getAlertLevelLabel(level: string): string {
  const map: Record<string, string> = {
    info: '提示',
    warning: '警告',
    danger: '紧急'
  }
  return map[level] || level
}

function getUrgencyLabel(urgency: string): string {
  const map: Record<string, string> = {
    low: '低优先级',
    medium: '中优先级',
    high: '高优先级',
    critical: '紧急'
  }
  return map[urgency] || urgency
}

function initHealthGauge() {
  if (!healthGaugeRef.value) return
  healthGaugeChart = echarts.init(healthGaugeRef.value)
  updateHealthGauge()
}

function updateHealthGauge() {
  if (!healthGaugeChart) return
  const score = lifespanEvaluation.value.overallHealthScore

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: 100,
      splitNumber: 10,
      radius: '90%',
      center: ['50%', '58%'],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#e74c3c' },
          { offset: 0.4, color: '#f39c12' },
          { offset: 0.7, color: '#3498db' },
          { offset: 1, color: '#27ae60' }
        ])
      },
      progress: { show: true, width: 20 },
      pointer: { icon: 'triangle', length: '60%', width: 10, itemStyle: { color: '#333' } },
      axisLine: { lineStyle: { width: 20 } },
      axisTick: { distance: -28, length: 6, lineStyle: { color: '#999', width: 1 } },
      splitLine: { distance: -32, length: 12, lineStyle: { color: '#777', width: 2 } },
      axisLabel: { distance: 20, color: '#888', fontSize: 10 },
      anchor: { show: true, showAbove: true, size: 16, itemStyle: { borderWidth: 4, color: '#fff', borderColor: '#4a90d9' } },
      title: { offsetCenter: [0, '15%'], fontSize: 12, fontWeight: 600 },
      detail: {
        offsetCenter: [0, '45%'],
        valueAnimation: true,
        fontSize: 36,
        fontWeight: 700,
        formatter: '{value}%',
        color: '#2c3e50'
      },
      data: [{ value: Number(score.toFixed(1)), name: '健康度评分' }]
    }]
  }
  healthGaugeChart.setOption(option)
}

function initLifespanTrendChart() {
  if (!lifespanTrendChartRef.value) return
  lifespanTrendChart = echarts.init(lifespanTrendChartRef.value)
  updateLifespanTrendChart()
}

function updateLifespanTrendChart() {
  if (!lifespanTrendChart) return
  const trendData = lifespanEvaluation.value.trendData

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let html = `运行时长: ${params[0]?.value[0]}h<br/>`
        params.forEach((p: any) => {
          html += `${p.seriesName}: ${p.value[1]}%<br/>`
        })
        return html
      }
    },
    legend: {
      data: ['阀片健康度', '密封件健康度', '活塞健康度', '整体健康度'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 25, top: 35, bottom: 40 },
    xAxis: {
      type: 'value',
      name: '运行时长 (小时)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: {
        fontSize: 9,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
          return String(val)
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '健康度 (%)',
      min: 0,
      max: 100,
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 9 }
    },
    visualMap: {
      show: false,
      pieces: [
        { gt: 70, color: '#27ae60' },
        { gt: 40, lte: 70, color: '#f39c12' },
        { lte: 40, color: '#e74c3c' }
      ]
    },
    series: [
      {
        name: '阀片健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.valveHealth]),
        smooth: true,
        lineStyle: { color: '#e74c3c', width: 2 },
        itemStyle: { color: '#e74c3c' },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(231, 76, 60, 0.12)' },
            { offset: 1, color: 'rgba(231, 76, 60, 0.01)' }
          ])
        }
      },
      {
        name: '密封件健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.sealHealth]),
        smooth: true,
        lineStyle: { color: '#f39c12', width: 2 },
        itemStyle: { color: '#f39c12' },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(243, 156, 18, 0.12)' },
            { offset: 1, color: 'rgba(243, 156, 18, 0.01)' }
          ])
        }
      },
      {
        name: '活塞健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.pistonHealth]),
        smooth: true,
        lineStyle: { color: '#3498db', width: 2 },
        itemStyle: { color: '#3498db' },
        showSymbol: false,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(52, 152, 219, 0.12)' },
            { offset: 1, color: 'rgba(52, 152, 219, 0.01)' }
          ])
        }
      },
      {
        name: '整体健康度',
        type: 'line',
        data: trendData.map(d => [d.operatingHours, d.overallHealth]),
        smooth: true,
        lineStyle: { color: '#27ae60', width: 3, type: 'dashed' },
        itemStyle: { color: '#27ae60' },
        showSymbol: false,
        markLine: {
          silent: true,
          data: [
            { yAxis: 70, lineStyle: { color: '#27ae60', type: 'dashed' }, label: { formatter: '良好线 70%', fontSize: 9 } },
            { yAxis: 30, lineStyle: { color: '#e74c3c', type: 'dashed' }, label: { formatter: '危险线 30%', fontSize: 9 } }
          ]
        }
      }
    ]
  }

  lifespanTrendChart.setOption(option, true)
}

function initComponentLifespanBar() {
  if (!componentLifespanBarRef.value) return
  componentLifespanBarChart = echarts.init(componentLifespanBarRef.value)
  updateComponentLifespanBar()
}

function updateComponentLifespanBar() {
  if (!componentLifespanBarChart) return
  const comps = lifespanEvaluation.value.components

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let html = ''
        params.forEach((p: any) => {
          html += `${p.seriesName}: ${p.value.toLocaleString()} h<br/>`
        })
        return html
      }
    },
    legend: {
      data: ['剩余寿命', '基准寿命'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 60, right: 25, top: 35, bottom: 35 },
    xAxis: {
      type: 'category',
      data: comps.map(c => c.componentName),
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: '寿命 (小时)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: {
        fontSize: 9,
        formatter: (val: number) => {
          if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
          return String(val)
        }
      }
    },
    series: [
      {
        name: '剩余寿命',
        type: 'bar',
        data: comps.map(c => ({
          value: c.remainingLifespanHours,
          itemStyle: {
            color: c.riskLevel === 'danger' ? '#e74c3c' : c.riskLevel === 'warning' ? '#f39c12' : '#27ae60'
          }
        })),
        barWidth: 25,
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => formatHours(p.value),
          fontSize: 10,
          fontWeight: 600
        }
      },
      {
        name: '基准寿命',
        type: 'bar',
        data: comps.map(c => ({
          value: c.baseLifespanHours,
          itemStyle: { color: '#bdc3c7' }
        })),
        barWidth: 25,
        barGap: '20%',
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => formatHours(p.value),
          fontSize: 9,
          color: '#999'
        }
      }
    ]
  }

  componentLifespanBarChart.setOption(option, true)
}

function updateComparisonCharts() {
  const schemes = computedForComparison.value
  if (schemes.length < 2) return

  if (compareHealthRadarChart) {
    const radarIndicator = [
      { name: '整体健康度', max: 100 },
      { name: '阀片健康', max: 100 },
      { name: '密封健康', max: 100 },
      { name: '活塞健康', max: 100 },
      { name: '维护周期(归一化)', max: 100 }
    ]

    const maxCycle = Math.max(...schemes.map(s => s.lifespanEvaluation.estimatedMaintenanceCycleHours), 1)

    const radarSeries = schemes.map((scheme, idx) => {
      const ev = scheme.lifespanEvaluation
      return {
        name: scheme.name,
        value: [
          ev.overallHealthScore,
          ev.components[0].healthScore,
          ev.components[1].healthScore,
          ev.components[2].healthScore,
          Math.min(100, (ev.estimatedMaintenanceCycleHours / maxCycle) * 100)
        ],
        lineStyle: { color: comparisonColors[idx % comparisonColors.length], width: 2 },
        itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
        areaStyle: {
          color: comparisonColors[idx % comparisonColors.length],
          opacity: 0.15
        }
      }
    })

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

    compareHealthRadarChart.setOption(radarOption, true)
  }

  if (compareLifespanBarChart) {
    const barOption: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: schemes.map(s => s.name),
        top: 0,
        textStyle: { fontSize: 11 }
      },
      grid: { left: 60, right: 25, top: 35, bottom: 35 },
      xAxis: {
        type: 'category',
        data: ['阀片组件', '密封件', '活塞组件', '维护周期'],
        axisLabel: { fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        name: '小时',
        nameTextStyle: { fontSize: 10 },
        axisLabel: {
          fontSize: 9,
          formatter: (val: number) => {
            if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
            return String(val)
          }
        }
      },
      series: schemes.map((scheme, idx) => ({
        name: scheme.name,
        type: 'bar',
        data: [
          scheme.lifespanEvaluation.components[0].remainingLifespanHours,
          scheme.lifespanEvaluation.components[1].remainingLifespanHours,
          scheme.lifespanEvaluation.components[2].remainingLifespanHours,
          scheme.lifespanEvaluation.estimatedMaintenanceCycleHours
        ],
        itemStyle: { color: comparisonColors[idx % comparisonColors.length] },
        barWidth: 20
      }))
    }

    compareLifespanBarChart.setOption(barOption, true)
  }
}

function handleResize() {
  healthGaugeChart?.resize()
  lifespanTrendChart?.resize()
  componentLifespanBarChart?.resize()
  compareHealthRadarChart?.resize()
  compareLifespanBarChart?.resize()
}

function initComparisonCharts() {
  if (compareHealthRadarRef.value) {
    compareHealthRadarChart = echarts.init(compareHealthRadarRef.value)
  }
  if (compareLifespanBarRef.value) {
    compareLifespanBarChart = echarts.init(compareLifespanBarRef.value)
  }
}

watch(() => lifespanEvaluation.value, () => {
  setTimeout(() => {
    updateHealthGauge()
    updateLifespanTrendChart()
    updateComponentLifespanBar()
  }, 50)
}, { deep: true })

watch(selectedSchemes, () => {
  setTimeout(() => {
    updateComparisonCharts()
    handleResize()
  }, 80)
}, { deep: true })

watch(activeSubtab, (newVal) => {
  setTimeout(() => {
    handleResize()
    if (newVal === 'overview') updateHealthGauge()
    if (newVal === 'trend') {
      updateLifespanTrendChart()
      updateComponentLifespanBar()
    }
    if (newVal === 'comparison') updateComparisonCharts()
  }, 60)
})

onMounted(() => {
  initHealthGauge()
  initLifespanTrendChart()
  initComponentLifespanBar()
  initComparisonCharts()
  setTimeout(() => {
    updateHealthGauge()
    updateLifespanTrendChart()
    updateComponentLifespanBar()
    updateComparisonCharts()
  }, 120)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  healthGaugeChart?.dispose()
  lifespanTrendChart?.dispose()
  componentLifespanBarChart?.dispose()
  compareHealthRadarChart?.dispose()
  compareLifespanBarChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.lifespan-container {
  width: 100%;
}

.high-risk-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 10px;
  border: 2px solid;
}

.high-risk-banner.danger {
  background: linear-gradient(90deg, #fee, #fff5f5);
  border-color: #e74c3c;
  animation: pulse-danger 2s ease-in-out infinite;
}

.high-risk-banner.warning {
  background: linear-gradient(90deg, #fff8e1, #fffdf5);
  border-color: #f39c12;
  animation: pulse-warning 2.5s ease-in-out infinite;
}

@keyframes pulse-danger {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
}

@keyframes pulse-warning {
  0%, 100% { box-shadow: 0 0 0 0 rgba(243, 156, 18, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(243, 156, 18, 0); }
}

.high-risk-banner.warning .banner-text {
  color: #b7791f;
}

.banner-icon {
  font-size: 22px;
}

.banner-text {
  font-size: 14px;
  color: #c0392b;
  font-weight: 500;
  flex: 1;
}

.lifespan-subtabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.lifespan-subtab {
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 20px;
  background: white;
  color: #666;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.lifespan-subtab:hover {
  background: #e8f4f8;
  color: #2980b9;
}

.lifespan-subtab.active {
  background: linear-gradient(135deg, #4a90d9, #357abd);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}

.lifespan-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.health-score-section {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
}

.overall-health-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.overall-health-card.health-excellent {
  border: 2px solid #27ae60;
}

.overall-health-card.health-warning {
  border: 2px solid #f39c12;
}

.overall-health-card.health-danger {
  border: 2px solid #e74c3c;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.health-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.health-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #ecf0f1;
  color: #666;
}

.health-excellent .health-badge {
  background: #e8f8f0;
  color: #27ae60;
}

.health-warning .health-badge {
  background: #fef3e2;
  color: #f39c12;
}

.health-danger .health-badge {
  background: #ffebee;
  color: #e74c3c;
}

.health-gauge {
  width: 100%;
  height: 180px;
}

.health-info-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 11px;
  color: #999;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.info-value.success {
  color: #27ae60;
}

.info-value.danger {
  color: #e74c3c;
}

.component-health-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.component-health-card {
  background: white;
  border-radius: 10px;
  padding: 12px 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #27ae60;
}

.component-health-card.risk-warning {
  border-left-color: #f39c12;
  background: linear-gradient(90deg, #fffcf0, white);
}

.component-health-card.risk-danger {
  border-left-color: #e74c3c;
  background: linear-gradient(90deg, #fff5f5, white);
}

.comp-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.comp-icon {
  font-size: 18px;
}

.comp-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.comp-risk-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.comp-risk-badge.normal {
  background: #e8f8f0;
  color: #27ae60;
}

.comp-risk-badge.warning {
  background: #fef3e2;
  color: #f39c12;
}

.comp-risk-badge.danger {
  background: #ffebee;
  color: #e74c3c;
}

.comp-health-bar {
  position: relative;
  height: 22px;
  background: #f0f0f0;
  border-radius: 11px;
  margin-bottom: 10px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  border-radius: 11px;
  transition: width 0.4s ease;
}

.health-fill.fill-green {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.health-fill.fill-yellow {
  background: linear-gradient(90deg, #f1c40f, #f39c12);
}

.health-fill.fill-red {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

.health-percent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.comp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.comp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-label {
  font-size: 10px;
  color: #999;
}

.stat-value {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  font-family: 'SF Mono', Menlo, monospace;
}

.comp-warn-threshold {
  margin-top: 8px;
  text-align: center;
}

.threshold-warn {
  font-size: 10px;
  color: #e67e22;
  background: #fef9e7;
  padding: 3px 8px;
  border-radius: 10px;
}

.wear-factors-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-heading {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.factors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.factor-item {
  display: grid;
  grid-template-columns: 70px 1fr 60px;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 8px;
}

.factor-name {
  font-size: 12px;
  color: #555;
  font-weight: 500;
}

.factor-bar {
  height: 10px;
  background: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
}

.factor-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.4s ease;
  background: #27ae60;
}

.factor-fill.factor-normal {
  background: linear-gradient(90deg, #2ecc71, #27ae60);
}

.factor-fill.factor-warning {
  background: linear-gradient(90deg, #f1c40f, #f39c12);
}

.factor-fill.factor-danger {
  background: linear-gradient(90deg, #e67e22, #e74c3c);
}

.factor-value {
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  font-family: 'SF Mono', Menlo, monospace;
  color: #333;
}

.lifespan-trend-view,
.lifespan-alerts-view,
.lifespan-comparison-view {
  display: flex;
  flex-direction: column;
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

.alerts-section,
.suggestions-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.alert-count-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  background: #e74c3c;
  color: white;
}

.empty-alerts {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-alerts .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-alerts p {
  margin: 4px 0;
  font-size: 13px;
}

.empty-alerts .empty-tip {
  font-size: 11px;
  color: #bbb;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  border-radius: 10px;
  padding: 12px 14px;
  border-left: 4px solid;
}

.alert-item.info {
  background: #e8f4fd;
  border-color: #3498db;
}

.alert-item.warning {
  background: #fff8e1;
  border-color: #f39c12;
}

.alert-item.danger {
  background: #ffebee;
  border-color: #e74c3c;
  animation: alert-pulse 2s ease-in-out infinite;
}

@keyframes alert-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(231, 76, 60, 0); }
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.alert-icon {
  font-size: 16px;
}

.alert-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.alert-level-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.alert-item.info .alert-level-badge {
  background: rgba(52, 152, 219, 0.15);
  color: #2980b9;
}

.alert-item.warning .alert-level-badge {
  background: rgba(243, 156, 18, 0.15);
  color: #b7791f;
}

.alert-item.danger .alert-level-badge {
  background: rgba(231, 76, 60, 0.15);
  color: #c0392b;
}

.alert-message {
  margin: 0 0 10px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #555;
}

.alert-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 11px;
}

.alert-remaining,
.alert-action {
  color: #666;
}

.alert-remaining strong {
  color: #2c3e50;
  font-weight: 600;
}

.alert-item.danger .alert-action strong {
  color: #e74c3c;
}

.alert-item.warning .alert-action strong {
  color: #f39c12;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.suggestion-item {
  border-radius: 10px;
  padding: 12px 14px;
  background: #f8f9fa;
  border: 1px solid #e8ecef;
}

.suggestion-item.urgency-critical {
  background: #fff5f5;
  border-color: #f5c6c6;
}

.suggestion-item.urgency-high {
  background: #fffaf0;
  border-color: #fde3c4;
}

.suggestion-item.urgency-medium {
  background: #f5faff;
  border-color: #c5e1f9;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.urgency-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.urgency-badge.low {
  background: #e8f8f0;
  color: #27ae60;
}

.urgency-badge.medium {
  background: #e8f4fd;
  color: #3498db;
}

.urgency-badge.high {
  background: #fef3e2;
  color: #e67e22;
}

.urgency-badge.critical {
  background: #ffebee;
  color: #e74c3c;
  animation: urgency-blink 1.5s ease-in-out infinite;
}

@keyframes urgency-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.suggestion-component {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.suggestion-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.suggestion-label {
  flex-shrink: 0;
  color: #888;
  min-width: 70px;
}

.suggestion-value {
  color: #333;
  flex: 1;
}

.suggestion-value.action {
  font-weight: 600;
  color: #2980b9;
}

.suggestion-value.schedule {
  color: #27ae60;
  font-weight: 500;
}

.suggestion-value.cost {
  color: #e67e22;
  font-weight: 600;
  font-family: 'SF Mono', Menlo, monospace;
}

.suggestion-value.reason {
  color: #7f8c8d;
  font-size: 11px;
}

.reason-row {
  padding-top: 6px;
  border-top: 1px dashed #e0e0e0;
}

.empty-compare {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #999;
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e0e0e0;
}

.empty-compare-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-compare p {
  font-size: 13px;
  margin: 4px 0;
}

.empty-compare-tip {
  font-size: 11px !important;
  color: #bbb;
}

.comparison-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comparison-table-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.comparison-table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e8ecef;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.comparison-table th,
.comparison-table td {
  padding: 10px 12px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
  font-size: 11px;
  white-space: nowrap;
}

.comparison-table tbody tr:hover {
  background: #f5faff;
}

.comparison-table tbody tr:last-child td {
  border-bottom: none;
}

.scheme-name-cell {
  text-align: left !important;
  font-weight: 600;
  color: #333;
}

.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.cell-success {
  color: #27ae60;
  font-weight: 600;
}

.cell-warning {
  color: #f39c12;
  font-weight: 600;
}

.cell-danger {
  color: #e74c3c;
  font-weight: 600;
}

.high-risk-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: #ffebee;
  color: #e74c3c;
  font-size: 10px;
  font-weight: 600;
}

.no-risk-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e8f8f0;
  color: #27ae60;
  font-size: 10px;
  font-weight: 600;
}

.warning-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  background: #fef3e2;
  color: #e67e22;
  font-size: 10px;
  font-weight: 600;
}

.compare-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: #eaf4fd;
  border: 1px solid #b8dff7;
  border-radius: 8px;
}

.hint-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.hint-text {
  font-size: 12px;
  color: #2980b9;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .health-score-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .comp-stats {
    grid-template-columns: 1fr;
  }

  .health-info-row {
    grid-template-columns: 1fr;
  }

  .alert-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
