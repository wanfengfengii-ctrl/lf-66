<template>
  <div class="energy-cost-evaluation">
    <div class="energy-tabs">
      <button
        v-for="tab in energyTabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        :class="['energy-tab', { active: activeTab === tab.key }]"
      >
        {{ tab.label }}
      </button>
      <div
        v-if="energyEvaluation.hasHighEnergyDanger"
        class="tab-energy-indicator danger"
        title="存在高能耗紧急风险"
      >
        🚨 {{ energyEvaluation.anomalies.filter(a => a.level === 'danger').length }}
      </div>
      <div
        v-else-if="energyEvaluation.hasHighEnergyWarning"
        class="tab-energy-indicator warning"
        title="存在能耗异常预警"
      >
        ⚡ {{ energyEvaluation.anomalies.filter(a => a.level === 'warning').length }}
      </div>
    </div>

    <div v-show="activeTab === 'overview'" class="energy-overview">
      <div class="energy-stats">
        <div class="stat-card primary">
          <span class="stat-icon">⚡</span>
          <div class="stat-content">
            <span class="stat-name">实时功率</span>
            <span class="stat-number">{{ (energyEvaluation.energyConsumption.powerPerHour * 1000).toFixed(1) }}</span>
            <span class="stat-unit">W</span>
          </div>
        </div>
        <div class="stat-card success">
          <span class="stat-icon">💡</span>
          <div class="stat-content">
            <span class="stat-name">日耗电量</span>
            <span class="stat-number">{{ energyEvaluation.energyConsumption.dailyEnergy.toFixed(2) }}</span>
            <span class="stat-unit">kWh</span>
          </div>
        </div>
        <div class="stat-card warning">
          <span class="stat-icon">💰</span>
          <div class="stat-content">
            <span class="stat-name">日运行成本</span>
            <span class="stat-number">¥{{ energyEvaluation.operationCost.dailyCost.toFixed(2) }}</span>
          </div>
        </div>
        <div class="stat-card danger">
          <span class="stat-icon">📉</span>
          <div class="stat-content">
            <span class="stat-name">节能潜力</span>
            <span class="stat-number" :class="getPotentialClass(energyEvaluation.efficiencyAnalysis.energySavingPotential)">
              {{ energyEvaluation.efficiencyAnalysis.energySavingPotential.toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>

      <div class="energy-substats">
        <div class="substat-card">
          <div class="substat-label">月耗电量</div>
          <div class="substat-value">{{ energyEvaluation.energyConsumption.monthlyEnergy.toFixed(2) }} kWh</div>
        </div>
        <div class="substat-card">
          <div class="substat-label">月运行成本</div>
          <div class="substat-value">¥{{ energyEvaluation.operationCost.monthlyCost.toFixed(2) }}</div>
        </div>
        <div class="substat-card">
          <div class="substat-label">年耗电量</div>
          <div class="substat-value">{{ energyEvaluation.energyConsumption.yearlyEnergy.toFixed(2) }} kWh</div>
        </div>
        <div class="substat-card">
          <div class="substat-label">年运行成本</div>
          <div class="substat-value">¥{{ energyEvaluation.operationCost.yearlyCost.toFixed(2) }}</div>
        </div>
      </div>

      <div v-if="energyEvaluation.anomalies.length > 0" class="anomaly-section">
        <h4 class="section-title anomaly-title">
          <span class="anomaly-icon">⚠️</span>
          能耗异常提示 ({{ energyEvaluation.anomalies.length }})
        </h4>
        <div
          v-for="(anomaly, index) in energyEvaluation.anomalies"
          :key="index"
          :class="['anomaly-item', anomaly.level]"
        >
          <span class="anomaly-badge">{{ getAnomalyBadge(anomaly.type) }}</span>
          <div class="anomaly-content">
            <span class="anomaly-msg">{{ anomaly.message }}</span>
            <span class="anomaly-cost">年额外成本: ¥{{ anomaly.costImpact.toFixed(0) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'trends'" class="energy-trends">
      <div class="charts-grid">
        <div class="chart-item">
          <div ref="powerTrendRef" class="chart tall"></div>
          <p class="chart-label">功率变化趋势</p>
        </div>
        <div class="chart-item">
          <div ref="energyTrendRef" class="chart tall"></div>
          <p class="chart-label">累计能耗变化</p>
        </div>
        <div class="chart-item">
          <div ref="efficiencyTrendRef" class="chart tall"></div>
          <p class="chart-label">能效变化趋势</p>
        </div>
        <div class="chart-item">
          <div ref="costPieRef" class="chart tall"></div>
          <p class="chart-label">年运行成本构成</p>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'comparison'" class="energy-comparison">
      <div v-if="selectedSchemes.length < 2" class="empty-compare">
        <div class="empty-compare-icon">📊</div>
        <p>请在右侧"方案管理"中选择至少2个已保存方案进行能耗对比</p>
        <p class="empty-compare-tip">勾选方案列表中的复选框即可添加到对比视图</p>
      </div>
      <div v-else>
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

        <div v-show="comparisonSubtab === 'table'" class="comparison-table-wrapper">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>方案名称</th>
                <th>功率 (kW)</th>
                <th>日成本 (¥)</th>
                <th>月成本 (¥)</th>
                <th>年成本 (¥)</th>
                <th>效率损失 (¥/h)</th>
                <th>系统效率 (%)</th>
                <th>节能潜力 (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in selectedSchemesEnergyComparison"
                :key="item.schemeId"
                :class="{ 'best-row': isBestValue(index, 'yearlyCost', true) }"
              >
                <td class="scheme-name-cell">
                  <span class="scheme-color-dot" :style="{ background: comparisonColors[index % comparisonColors.length] }"></span>
                  {{ item.schemeName }}
                </td>
                <td>{{ item.powerPerHour.toFixed(3) }}</td>
                <td>{{ item.dailyCost.toFixed(2) }}</td>
                <td>{{ item.monthlyCost.toFixed(0) }}</td>
                <td :class="{ 'highlight-cell': isBestValue(index, 'yearlyCost', true) }">
                  {{ item.yearlyCost.toFixed(0) }}
                </td>
                <td :class="{ 'highlight-cell': isBestValue(index, 'efficiencyLossCostPerHour', true) }">
                  {{ item.efficiencyLossCostPerHour.toFixed(2) }}
                </td>
                <td :class="{ 'highlight-cell': isBestValue(index, 'overallEfficiency', false) }">
                  {{ item.overallEfficiency.toFixed(1) }}
                </td>
                <td :class="{ 'highlight-cell': isBestValue(index, 'savingPotential', false) }">
                  {{ item.savingPotential.toFixed(1) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-show="comparisonSubtab === 'charts'" class="comparison-charts">
          <div class="chart-item full-width">
            <div ref="compareBarChartRef" class="chart tall"></div>
            <p class="chart-label">多方案年运行成本对比</p>
          </div>
          <div class="chart-item full-width">
            <div ref="compareRadarChartRef" class="chart tall"></div>
            <p class="chart-label">多方案能耗性能对比</p>
          </div>
        </div>
      </div>
    </div>

    <div v-show="activeTab === 'suggestions'" class="energy-suggestions">
      <div class="cost-params-section">
        <h4 class="section-title">⚙️ 成本参数设置</h4>
        <div class="params-grid">
          <div class="param-item">
            <label class="param-label">
              <span>电价</span>
              <span class="param-value">¥{{ energyCostParams.electricityPrice.toFixed(2) }}/kWh</span>
            </label>
            <input
              type="range"
              :value="energyCostParams.electricityPrice"
              @input="handleSliderChange('electricityPrice', $event)"
              min="0.3"
              max="3"
              step="0.1"
              class="param-slider"
            />
          </div>
          <div class="param-item">
            <label class="param-label">
              <span>维护成本</span>
              <span class="param-value">¥{{ energyCostParams.maintenanceCostPerHour.toFixed(0) }}/h</span>
            </label>
            <input
              type="range"
              :value="energyCostParams.maintenanceCostPerHour"
              @input="handleSliderChange('maintenanceCostPerHour', $event)"
              min="10"
              max="200"
              step="5"
              class="param-slider"
            />
          </div>
          <div class="param-item">
            <label class="param-label">
              <span>日运行时长</span>
              <span class="param-value">{{ energyCostParams.dailyOperatingHours.toFixed(0) }}h</span>
            </label>
            <input
              type="range"
              :value="energyCostParams.dailyOperatingHours"
              @input="handleSliderChange('dailyOperatingHours', $event)"
              min="1"
              max="24"
              step="1"
              class="param-slider"
            />
          </div>
          <div class="param-item">
            <label class="param-label">
              <span>月运行天数</span>
              <span class="param-value">{{ energyCostParams.monthlyOperatingDays.toFixed(0) }}天</span>
            </label>
            <input
              type="range"
              :value="energyCostParams.monthlyOperatingDays"
              @input="handleSliderChange('monthlyOperatingDays', $event)"
              min="1"
              max="31"
              step="1"
              class="param-slider"
            />
          </div>
        </div>
      </div>

      <div class="suggestions-section">
        <h4 class="section-title">
          <span>💡 节能建议</span>
          <span class="savings-total">
            预计年节省: ¥{{ totalEstimatedSaving.toFixed(0) }}
          </span>
        </h4>
        <div class="suggestions-list">
          <div
            v-for="suggestion in energyEvaluation.suggestions"
            :key="suggestion.id"
            :class="['suggestion-card', suggestion.priority]"
          >
            <div class="suggestion-header">
              <span class="suggestion-icon">{{ getCategoryIcon(suggestion.category) }}</span>
              <span :class="['priority-badge', suggestion.priority]">
                {{ getPriorityLabel(suggestion.priority) }}
              </span>
              <span class="suggestion-title">{{ suggestion.title }}</span>
            </div>
            <p class="suggestion-desc">{{ suggestion.description }}</p>
            <div class="suggestion-meta">
              <div class="meta-item">
                <span class="meta-label">预计节省</span>
                <span class="meta-value saving">
                  {{ suggestion.estimatedSavingPercent.toFixed(0) }}% / ¥{{ suggestion.estimatedSavingCostPerYear.toFixed(0) }}/年
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">实施成本</span>
                <span class="meta-value">{{ suggestion.implementationCost }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">实施难度</span>
                <span class="meta-value">{{ getDifficultyLabel(suggestion.difficulty) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">投资回收期</span>
                <span class="meta-value">{{ suggestion.paybackPeriod }}</span>
              </div>
            </div>
            <div class="saving-bar">
              <div
                class="saving-bar-fill"
                :style="{ width: Math.min(100, suggestion.estimatedSavingPercent) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import * as echarts from 'echarts'
import { useBellowsStore } from '@/stores/bellows'
import type { EnergyCostParams, SchemeEnergyComparison } from '@/types'

const store = useBellowsStore()

const energyTabs = [
  { key: 'overview', label: '📊 能耗概览' },
  { key: 'trends', label: '📈 趋势分析' },
  { key: 'comparison', label: '🆚 方案对比' },
  { key: 'suggestions', label: '💡 节能建议' }
]
const activeTab = ref('overview')

const comparisonSubtabs = [
  { key: 'table', label: '📋 对比表格' },
  { key: 'charts', label: '📊 对比图表' }
]
const comparisonSubtab = ref('table')

const energyEvaluation = computed(() => store.energyEvaluation)
const energyCostParams = computed(() => store.energyCostParams)
const energyHistory = computed(() => store.energyHistory)
const selectedSchemes = computed(() => store.selectedSchemes)

const comparisonColors = ['#4a90d9', '#e67e22', '#27ae60', '#8e44ad', '#d35400']

const selectedSchemesEnergyComparison = computed<SchemeEnergyComparison[]>(() => {
  return store.schemesEnergyComparison.filter(s =>
    store.selectedSchemeIds.includes(s.schemeId)
  )
})

const totalEstimatedSaving = computed(() => {
  return energyEvaluation.value.suggestions.reduce((sum, s) => sum + s.estimatedSavingCostPerYear, 0)
})

const powerTrendRef = ref<HTMLDivElement | null>(null)
const energyTrendRef = ref<HTMLDivElement | null>(null)
const efficiencyTrendRef = ref<HTMLDivElement | null>(null)
const costPieRef = ref<HTMLDivElement | null>(null)
const compareBarChartRef = ref<HTMLDivElement | null>(null)
const compareRadarChartRef = ref<HTMLDivElement | null>(null)

let powerTrendChart: echarts.ECharts | null = null
let energyTrendChart: echarts.ECharts | null = null
let efficiencyTrendChart: echarts.ECharts | null = null
let costPieChart: echarts.ECharts | null = null
let compareBarChart: echarts.ECharts | null = null
let compareRadarChart: echarts.ECharts | null = null

function getPotentialClass(potential: number): string {
  if (potential >= 50) return 'danger'
  if (potential >= 30) return 'warning'
  return 'success'
}

function getAnomalyBadge(type: string): string {
  const map: Record<string, string> = {
    high_frequency: '高频',
    high_resistance: '阻力',
    high_leakage: '漏气',
    high_load: '重载',
    poor_maintenance: '维护'
  }
  return map[type] || type
}

function getCategoryIcon(category: string): string {
  const map: Record<string, string> = {
    parameter_optimization: '⚙️',
    maintenance: '🔧',
    component_upgrade: '🔩',
    operation_optimization: '📋'
  }
  return map[category] || '💡'
}

function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    critical: '紧急',
    high: '高',
    medium: '中',
    low: '低'
  }
  return map[priority] || priority
}

function getDifficultyLabel(difficulty: string): string {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return map[difficulty] || difficulty
}

function isBestValue(index: number, field: keyof SchemeEnergyComparison, isLowerBetter: boolean): boolean {
  const values = selectedSchemesEnergyComparison.value.map(s => s[field] as number)
  const best = isLowerBetter ? Math.min(...values) : Math.max(...values)
  return values[index] === best
}

function handleSliderChange(key: keyof EnergyCostParams, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  store.updateEnergyCostParam(key, value as EnergyCostParams[typeof key])
}

function initPowerTrendChart() {
  if (!powerTrendRef.value) return
  powerTrendChart = echarts.init(powerTrendRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 55, right: 25, top: 20, bottom: 35 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0]
        return `时间: ${d.value[0].toFixed(2)}s<br/>功率: ${(d.value[1] * 1000).toFixed(2)} W`
      }
    },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '功率(W)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    series: [{
      type: 'line',
      data: [],
      smooth: true,
      lineStyle: { color: '#f39c12', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(243, 156, 18, 0.35)' },
          { offset: 1, color: 'rgba(243, 156, 18, 0.02)' }
        ])
      },
      showSymbol: false
    }]
  }
  powerTrendChart.setOption(option)
}

function initEnergyTrendChart() {
  if (!energyTrendRef.value) return
  energyTrendChart = echarts.init(energyTrendRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 55, right: 25, top: 20, bottom: 35 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0]
        return `时间: ${d.value[0].toFixed(2)}s<br/>累计能耗: ${(d.value[1] * 1000).toFixed(4)} kWh`
      }
    },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '累计能耗(kWh)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    series: [{
      type: 'line',
      data: [],
      smooth: true,
      lineStyle: { color: '#9b59b6', width: 2 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(155, 89, 182, 0.35)' },
          { offset: 1, color: 'rgba(155, 89, 182, 0.02)' }
        ])
      },
      showSymbol: false
    }]
  }
  energyTrendChart.setOption(option)
}

function initEfficiencyTrendChart() {
  if (!efficiencyTrendRef.value) return
  efficiencyTrendChart = echarts.init(efficiencyTrendRef.value)
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    grid: { left: 55, right: 25, top: 20, bottom: 35 },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const d = params[0]
        return `时间: ${d.value[0].toFixed(2)}s<br/>能效: ${d.value[1].toFixed(1)}%`
      }
    },
    xAxis: { type: 'value', name: '时间(s)', nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', name: '能效(%)', min: 0, max: 100, nameTextStyle: { fontSize: 10 }, axisLabel: { fontSize: 9 } },
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
        data: [
          { yAxis: 60, lineStyle: { color: '#e67e22', type: 'dashed' }, label: { formatter: '良好60%', fontSize: 9 } },
          { yAxis: 40, lineStyle: { color: '#e74c3c', type: 'dashed' }, label: { formatter: '警戒40%', fontSize: 9 } }
        ]
      }
    }]
  }
  efficiencyTrendChart.setOption(option)
}

function initCostPieChart() {
  if (!costPieRef.value) return
  costPieChart = echarts.init(costPieRef.value)
  updateCostPieChart()
}

function updateCostPieChart() {
  if (!costPieChart) return
  const breakdown = energyEvaluation.value.operationCost.breakdown
  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ¥${params.value.toFixed(0)} (${params.percent.toFixed(1)}%)`
      }
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        fontSize: 11,
        formatter: '{b}: {d}%'
      },
      data: [
        { value: breakdown.energyCost, name: '能源成本', itemStyle: { color: '#3498db' } },
        { value: breakdown.maintenanceCost, name: '维护成本', itemStyle: { color: '#e67e22' } },
        { value: breakdown.efficiencyLossCost, name: '效率损失', itemStyle: { color: '#e74c3c' } }
      ]
    }]
  }
  costPieChart.setOption(option)
}

function updateTrendCharts() {
  if (powerTrendChart) {
    const data = energyHistory.value.map(p => [p.time, p.power])
    powerTrendChart.setOption({ series: [{ data }] })
  }
  if (energyTrendChart) {
    const data = energyHistory.value.map(p => [p.time, p.energy])
    energyTrendChart.setOption({ series: [{ data }] })
  }
  if (efficiencyTrendChart) {
    const data = energyHistory.value.map(p => [p.time, p.efficiency])
    efficiencyTrendChart.setOption({ series: [{ data }] })
  }
}

function initCompareBarChart() {
  if (!compareBarChartRef.value) return
  compareBarChart = echarts.init(compareBarChartRef.value)
}

function initCompareRadarChart() {
  if (!compareRadarChartRef.value) return
  compareRadarChart = echarts.init(compareRadarChartRef.value)
}

function updateComparisonCharts() {
  if (!compareBarChart || selectedSchemes.value.length < 2) return

  const schemes = selectedSchemesEnergyComparison.value
  const names = schemes.map(s => s.schemeName)

  const barOption: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['年能源成本', '年维护成本', '年效率损失成本', '年总成本'],
      top: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 55, right: 25, top: 50, bottom: 50 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { fontSize: 11, rotate: 15, interval: 0 }
    },
    yAxis: [{
      type: 'value',
      name: '成本(¥/年)',
      nameTextStyle: { fontSize: 10 },
      axisLabel: { fontSize: 10 }
    }],
    series: [
      {
        name: '年能源成本',
        type: 'bar',
        data: schemes.map(s => s.yearlyCost * 0.6),
        itemStyle: { color: '#3498db' },
        barWidth: 14
      },
      {
        name: '年维护成本',
        type: 'bar',
        data: schemes.map(s => s.yearlyCost * 0.25),
        itemStyle: { color: '#e67e22' },
        barWidth: 14
      },
      {
        name: '年效率损失成本',
        type: 'bar',
        data: schemes.map(s => s.efficiencyLossCostPerHour * 8 * 22 * 12),
        itemStyle: { color: '#e74c3c' },
        barWidth: 14
      },
      {
        name: '年总成本',
        type: 'bar',
        data: schemes.map(s => s.yearlyCost),
        itemStyle: { color: '#27ae60' },
        barWidth: 14
      }
    ]
  }
  compareBarChart.setOption(barOption, true)

  if (!compareRadarChart) return
  const radarIndicator = [
    { name: '低能耗', max: 100 },
    { name: '系统效率', max: 100 },
    { name: '低成本', max: 100 },
    { name: '低损耗', max: 100 },
    { name: '节能潜力', max: 100 }
  ]

  const allCosts = schemes.map(s => s.yearlyCost)
  const maxCost = Math.max(...allCosts, 1)
  const allLoss = schemes.map(s => s.efficiencyLossCostPerHour)
  const maxLoss = Math.max(...allLoss, 1)
  const allPower = schemes.map(s => s.powerPerHour)
  const maxPower = Math.max(...allPower, 1)

  const radarSeries = schemes.map((s, idx) => ({
    name: s.schemeName,
    value: [
      (1 - s.powerPerHour / maxPower) * 100,
      s.overallEfficiency,
      (1 - s.yearlyCost / maxCost) * 100,
      (1 - s.efficiencyLossCostPerHour / maxLoss) * 100,
      s.savingPotential
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
      data: schemes.map(s => s.schemeName),
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
}

function handleResize() {
  powerTrendChart?.resize()
  energyTrendChart?.resize()
  efficiencyTrendChart?.resize()
  costPieChart?.resize()
  compareBarChart?.resize()
  compareRadarChart?.resize()
}

watch(() => store.energyHistory.length, () => {
  updateTrendCharts()
})

watch(energyEvaluation, () => {
  setTimeout(() => {
    updateTrendCharts()
    updateCostPieChart()
  }, 60)
}, { deep: true })

watch(selectedSchemes, () => {
  setTimeout(updateComparisonCharts, 80)
}, { deep: true })

watch(activeTab, (newVal) => {
  setTimeout(() => {
    handleResize()
    if (newVal === 'trends') {
      updateTrendCharts()
      updateCostPieChart()
    }
    if (newVal === 'comparison') {
      updateComparisonCharts()
    }
  }, 50)
})

watch(comparisonSubtab, () => {
  setTimeout(() => {
    handleResize()
    updateComparisonCharts()
  }, 50)
})

onMounted(() => {
  initPowerTrendChart()
  initEnergyTrendChart()
  initEfficiencyTrendChart()
  initCostPieChart()
  initCompareBarChart()
  initCompareRadarChart()
  setTimeout(() => {
    updateTrendCharts()
    updateCostPieChart()
  }, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  powerTrendChart?.dispose()
  energyTrendChart?.dispose()
  efficiencyTrendChart?.dispose()
  costPieChart?.dispose()
  compareBarChart?.dispose()
  compareRadarChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.energy-cost-evaluation {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.energy-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
}

.energy-tab {
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

.energy-tab:hover {
  background: #e8f4f8;
  color: #2980b9;
}

.energy-tab.active {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
  box-shadow: 0 2px 8px rgba(243, 156, 18, 0.3);
}

.tab-energy-indicator {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.tab-energy-indicator.danger {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3);
  animation: risk-pulse-danger 2s ease-in-out infinite;
}

.tab-energy-indicator.warning {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
  box-shadow: 0 2px 6px rgba(243, 156, 18, 0.3);
  animation: risk-pulse-warning 2.5s ease-in-out infinite;
}

@keyframes risk-pulse-danger {
  0%, 100% { transform: scale(1); box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3); }
  50% { transform: scale(1.06); box-shadow: 0 3px 10px rgba(231, 76, 60, 0.5); }
}

@keyframes risk-pulse-warning {
  0%, 100% { transform: scale(1); box-shadow: 0 2px 6px rgba(243, 156, 18, 0.3); }
  50% { transform: scale(1.04); box-shadow: 0 3px 10px rgba(243, 156, 18, 0.45); }
}

.energy-overview,
.energy-trends,
.energy-comparison,
.energy-suggestions {
  width: 100%;
}

.energy-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
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

.stat-number.success { color: #27ae60; }
.stat-number.warning { color: #f39c12; }
.stat-number.danger { color: #e74c3c; }

.stat-unit {
  font-size: 11px;
  color: #aaa;
}

.stat-card.primary { border-left: 4px solid #f39c12; }
.stat-card.success { border-left: 4px solid #27ae60; }
.stat-card.warning { border-left: 4px solid #e67e22; }
.stat-card.danger { border-left: 4px solid #e74c3c; }

.energy-substats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.substat-card {
  background: white;
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.substat-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}

.substat-value {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.anomaly-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0e0e0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
}

.anomaly-title {
  color: #c0392b;
}

.anomaly-icon {
  font-size: 16px;
}

.anomaly-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid;
  font-size: 12px;
  line-height: 1.5;
}

.anomaly-item:last-child {
  margin-bottom: 0;
}

.anomaly-item.warning {
  background: #fff8e1;
  border-color: #f39c12;
  color: #7d6608;
}

.anomaly-item.danger {
  background: #ffebee;
  border-color: #e74c3c;
  color: #c62828;
}

.anomaly-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}

.anomaly-item.warning .anomaly-badge {
  background: rgba(243, 156, 18, 0.15);
  color: #b7791f;
}

.anomaly-item.danger .anomaly-badge {
  background: rgba(231, 76, 60, 0.15);
  color: #c0392b;
}

.anomaly-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.anomaly-cost {
  font-weight: 600;
  color: #e74c3c;
  font-size: 11px;
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
  border-color: #f39c12;
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

.comparison-table-wrapper {
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  padding: 12px;
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
  border-bottom: 1px solid #e0e0e0;
}

.comparison-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
  font-size: 11px;
  white-space: nowrap;
}

.comparison-table tbody tr:hover {
  background: #f5f8fa;
}

.comparison-table tbody tr.best-row {
  background: #e8f8f0;
}

.scheme-name-cell {
  text-align: left !important;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.scheme-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.highlight-cell {
  font-weight: 600;
  color: #27ae60;
  background: rgba(39, 174, 96, 0.08);
}

.cost-params-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.params-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.param-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #666;
}

.param-value {
  font-weight: 600;
  color: #f39c12;
}

.param-slider {
  width: 100%;
  accent-color: #f39c12;
}

.suggestions-section {
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.suggestions-section .section-title {
  justify-content: space-between;
  margin-bottom: 16px;
}

.savings-total {
  font-size: 13px;
  font-weight: 600;
  color: #27ae60;
  background: #e8f8f0;
  padding: 4px 12px;
  border-radius: 12px;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-card {
  border-radius: 8px;
  padding: 14px;
  border-left: 4px solid;
  background: #fafafa;
  transition: all 0.2s;
}

.suggestion-card:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.suggestion-card.critical {
  border-color: #e74c3c;
  background: #fff5f5;
}

.suggestion-card.high {
  border-color: #e67e22;
  background: #fffaf0;
}

.suggestion-card.medium {
  border-color: #3498db;
  background: #f0f8ff;
}

.suggestion-card.low {
  border-color: #27ae60;
  background: #f0fff4;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.suggestion-icon {
  font-size: 20px;
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

.priority-badge.critical {
  background: rgba(231, 76, 60, 0.15);
  color: #c0392b;
}

.priority-badge.high {
  background: rgba(230, 126, 34, 0.15);
  color: #d35400;
}

.priority-badge.medium {
  background: rgba(52, 152, 219, 0.15);
  color: #2980b9;
}

.priority-badge.low {
  background: rgba(39, 174, 96, 0.15);
  color: #27ae60;
}

.suggestion-title {
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
}

.suggestion-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 12px;
}

.suggestion-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 10px;
  color: #999;
}

.meta-value {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.meta-value.saving {
  color: #27ae60;
}

.saving-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.saving-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #e67e22);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.comparison-charts {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .energy-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .energy-substats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 500px) {
  .energy-stats {
    grid-template-columns: 1fr;
  }

  .energy-substats {
    grid-template-columns: 1fr;
  }

  .params-grid {
    grid-template-columns: 1fr;
  }
}
</style>
