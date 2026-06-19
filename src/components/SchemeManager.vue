<template>
  <div class="scheme-manager">
    <h3 class="panel-title">方案管理</h3>

    <div class="save-section">
      <input
        v-model="schemeName"
        type="text"
        placeholder="输入方案名称"
        class="scheme-input"
        @keyup.enter="handleSave"
      />
      <button @click="handleSave" class="save-btn" :disabled="!schemeName.trim()">
        保存方案
      </button>
    </div>

    <div class="scheme-list">
      <h4 class="section-title">已保存方案</h4>

      <div v-if="schemes.length === 0" class="empty-state">
        暂无保存的方案
      </div>

      <div v-for="scheme in schemes" :key="scheme.id" class="scheme-item">
        <div class="scheme-header">
          <label class="scheme-checkbox">
            <input
              type="checkbox"
              :checked="selectedSchemeIds.includes(scheme.id)"
              @change="handleToggleSelect(scheme.id)"
            />
            <span class="checkmark"></span>
          </label>
          <span class="scheme-name" :title="scheme.name">{{ scheme.name }}</span>
        </div>

        <div class="scheme-stats">
          <span class="stat">风量: {{ scheme.result.airFlowRate.toFixed(0) }}</span>
          <span class="stat">效率: {{ scheme.result.efficiency.toFixed(1) }}%</span>
        </div>

        <div class="scheme-actions">
          <button @click="handleLoad(scheme.id)" class="action-btn load-btn">
            加载
          </button>
          <button @click="handleDelete(scheme.id)" class="action-btn delete-btn">
            删除
          </button>
        </div>
      </div>
    </div>

    <div v-if="selectedSchemes.length > 1" class="compare-section">
      <h4 class="section-title">方案对比 ({{ selectedSchemes.length }}个)</h4>
      <div ref="compareChartRef" class="compare-chart"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { useBellowsStore } from '@/stores/bellows'

const store = useBellowsStore()

const schemeName = ref('')
const compareChartRef = ref<HTMLDivElement | null>(null)

let compareChart: echarts.ECharts | null = null

const schemes = computed(() => store.schemes)
const selectedSchemeIds = computed(() => store.selectedSchemeIds)
const selectedSchemes = computed(() => store.selectedSchemes)

function handleSave() {
  if (!schemeName.value.trim()) return
  store.saveScheme(schemeName.value.trim())
  schemeName.value = ''
}

function handleLoad(id: string) {
  store.loadScheme(id)
}

function handleDelete(id: string) {
  store.deleteScheme(id)
}

function handleToggleSelect(id: string) {
  store.toggleSchemeSelection(id)
}

function initCompareChart() {
  if (!compareChartRef.value) return
  compareChart = echarts.init(compareChartRef.value)
}

function updateCompareChart() {
  if (!compareChart || selectedSchemes.value.length < 2) return

  const schemeNames = selectedSchemes.value.map(s => s.name)
  const airFlowData = selectedSchemes.value.map(s => s.result.airFlowRate)
  const efficiencyData = selectedSchemes.value.map(s => s.result.efficiency)
  const riskData = selectedSchemes.value.map(s => s.result.valveRisk * 100)
  const fluctuationData = selectedSchemes.value.map(s => s.result.fluctuationAmplitude)

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['送风量', '效率(%)', '阀片风险(%)', '波动幅度'],
      top: 0,
      textStyle: { fontSize: 10 }
    },
    grid: {
      left: 50,
      right: 20,
      top: 40,
      bottom: 30
    },
    xAxis: {
      type: 'category',
      data: schemeNames,
      axisLabel: {
        fontSize: 10,
        rotate: 20
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '送风量',
        type: 'bar',
        data: airFlowData,
        itemStyle: { color: '#3498db' }
      },
      {
        name: '效率(%)',
        type: 'bar',
        data: efficiencyData,
        itemStyle: { color: '#27ae60' }
      },
      {
        name: '阀片风险(%)',
        type: 'bar',
        data: riskData,
        itemStyle: { color: '#e74c3c' }
      },
      {
        name: '波动幅度',
        type: 'bar',
        data: fluctuationData,
        itemStyle: { color: '#f39c12' }
      }
    ]
  }

  compareChart.setOption(option, true)
}

function handleResize() {
  compareChart?.resize()
}

watch(selectedSchemes, () => {
  setTimeout(updateCompareChart, 50)
}, { deep: true })

onMounted(() => {
  setTimeout(() => {
    initCompareChart()
    updateCompareChart()
  }, 100)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  compareChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.scheme-manager {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.panel-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.save-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.scheme-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
}

.scheme-input:focus {
  outline: none;
  border-color: #4a90d9;
}

.save-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #4a90d9;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background: #3a7bc8;
}

.save-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.section-title {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.scheme-list {
  max-height: 250px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
}

.scheme-item {
  background: white;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  border: 1px solid #e0e0e0;
  transition: border-color 0.2s;
}

.scheme-item:hover {
  border-color: #4a90d9;
}

.scheme-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.scheme-checkbox {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.scheme-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-radius: 3px;
  background: white;
}

.scheme-checkbox input:checked ~ .checkmark {
  background: #4a90d9;
  border-color: #4a90d9;
}

.scheme-checkbox input:checked ~ .checkmark::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.scheme-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scheme-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.stat {
  font-size: 11px;
  color: #888;
}

.scheme-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s;
}

.load-btn {
  background: #e8f4f8;
  color: #2980b9;
}

.load-btn:hover {
  background: #d4e9f0;
}

.delete-btn {
  background: #fde8e8;
  color: #c0392b;
}

.delete-btn:hover {
  background: #f8d0d0;
}

.compare-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.compare-chart {
  width: 100%;
  height: 200px;
}
</style>
