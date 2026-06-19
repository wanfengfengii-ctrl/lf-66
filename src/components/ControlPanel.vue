<template>
  <div class="control-panel">
    <h3 class="panel-title">参数控制</h3>

    <div class="param-section">
      <h4 class="section-title">腔体尺寸</h4>

      <div class="param-item">
        <label class="param-label">
          <span>腔体宽度</span>
          <span class="param-value">{{ params.chamberWidth }} mm</span>
        </label>
        <input
          type="range"
          :value="params.chamberWidth"
          @input="handleSliderChange('chamberWidth', $event)"
          min="20"
          max="200"
          step="1"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.chamberWidth"
          @change="handleInputChange('chamberWidth', $event)"
          min="1"
          step="1"
          class="param-input"
        />
      </div>

      <div class="param-item">
        <label class="param-label">
          <span>腔体高度</span>
          <span class="param-value">{{ params.chamberHeight }} mm</span>
        </label>
        <input
          type="range"
          :value="params.chamberHeight"
          @input="handleSliderChange('chamberHeight', $event)"
          min="20"
          max="200"
          step="1"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.chamberHeight"
          @change="handleInputChange('chamberHeight', $event)"
          min="1"
          step="1"
          class="param-input"
        />
      </div>

      <div class="param-item">
        <label class="param-label">
          <span>腔体深度</span>
          <span class="param-value">{{ params.chamberDepth }} mm</span>
        </label>
        <input
          type="range"
          :value="params.chamberDepth"
          @input="handleSliderChange('chamberDepth', $event)"
          min="10"
          max="150"
          step="1"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.chamberDepth"
          @change="handleInputChange('chamberDepth', $event)"
          min="1"
          step="1"
          class="param-input"
        />
      </div>
    </div>

    <div class="param-section">
      <h4 class="section-title">运动参数</h4>

      <div class="param-item">
        <label class="param-label">
          <span>拉杆频率</span>
          <span class="param-value">{{ params.rodFrequency }} Hz</span>
        </label>
        <input
          type="range"
          :value="params.rodFrequency"
          @input="handleSliderChange('rodFrequency', $event)"
          min="0.1"
          max="15"
          step="0.1"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.rodFrequency"
          @change="handleInputChange('rodFrequency', $event)"
          min="0.1"
          step="0.1"
          class="param-input"
        />
      </div>

      <div class="param-item">
        <label class="param-label">
          <span>活塞行程</span>
          <span class="param-value">{{ params.pistonStroke }} mm</span>
        </label>
        <input
          type="range"
          :value="params.pistonStroke"
          @input="handleSliderChange('pistonStroke', $event)"
          min="5"
          max="100"
          step="1"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.pistonStroke"
          @change="handleInputChange('pistonStroke', $event)"
          min="1"
          step="1"
          class="param-input"
        />
      </div>
    </div>

    <div class="param-section">
      <h4 class="section-title">外部工况参数</h4>

      <div class="param-item">
        <label class="param-label">
          <span>环境阻力系数</span>
          <span class="param-value">{{ (params.environmentalResistance * 100).toFixed(0) }}%</span>
        </label>
        <input
          type="range"
          :value="params.environmentalResistance"
          @input="handleSliderChange('environmentalResistance', $event)"
          min="0"
          max="1.8"
          step="0.01"
          class="param-slider"
        />
        <input
          type="number"
          :value="(params.environmentalResistance * 100).toFixed(0)"
          @change="handlePercentageChange('environmentalResistance', $event)"
          min="0"
          max="180"
          step="1"
          class="param-input"
        />
      </div>

      <div class="param-item">
        <label class="param-label">
          <span>负载压力</span>
          <span class="param-value">{{ params.loadPressure.toFixed(2) }} atm</span>
        </label>
        <input
          type="range"
          :value="params.loadPressure"
          @input="handleSliderChange('loadPressure', $event)"
          min="0"
          max="2.5"
          step="0.01"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.loadPressure.toFixed(2)"
          @change="handleInputChange('loadPressure', $event)"
          min="0"
          max="5"
          step="0.01"
          class="param-input"
        />
      </div>

      <div class="param-item">
        <label class="param-label">
          <span>漏气率</span>
          <span class="param-value">{{ params.leakageRate.toFixed(1) }}%</span>
        </label>
        <input
          type="range"
          :value="params.leakageRate"
          @input="handleSliderChange('leakageRate', $event)"
          min="0"
          max="50"
          step="0.5"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.leakageRate.toFixed(1)"
          @change="handleInputChange('leakageRate', $event)"
          min="0"
          max="100"
          step="0.1"
          class="param-input"
        />
      </div>
    </div>

    <div class="param-section">
      <h4 class="section-title">阀片参数</h4>

      <div class="param-item">
        <label class="param-label">
          <span>阀片开口面积</span>
          <span class="param-value">{{ params.valveOpeningArea }} mm²</span>
        </label>
        <input
          type="range"
          :value="params.valveOpeningArea"
          @input="handleSliderChange('valveOpeningArea', $event)"
          min="50"
          max="3000"
          step="10"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.valveOpeningArea"
          @change="handleInputChange('valveOpeningArea', $event)"
          min="10"
          step="10"
          class="param-input"
        />
      </div>

      <div class="param-item toggle-item">
        <label class="param-label">
          <span>阀片卡滞</span>
          <span class="param-value">{{ params.valveStuck ? '是' : '否' }}</span>
        </label>
        <button
          :class="['toggle-btn', { active: params.valveStuck }]"
          @click="toggleValveStuck"
        >
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
        </button>
      </div>

      <div v-if="params.valveStuck" class="param-item">
        <label class="param-label">
          <span>卡滞程度</span>
          <span class="param-value">{{ (params.valveStuckLevel * 100).toFixed(0) }}%</span>
        </label>
        <input
          type="range"
          :value="params.valveStuckLevel"
          @input="handleSliderChange('valveStuckLevel', $event)"
          min="0.1"
          max="0.9"
          step="0.05"
          class="param-slider"
        />
      </div>
    </div>

    <div class="result-section">
      <h4 class="section-title">计算结果</h4>

      <div class="result-item">
        <span class="result-label">实际送风量</span>
        <span class="result-value">{{ result.airFlowRate.toFixed(2) }} mm³/s</span>
      </div>

      <div class="result-item">
        <span class="result-label">有效送风量</span>
        <span class="result-value">{{ result.effectiveFlowRate.toFixed(2) }} mm³/s</span>
      </div>

      <div class="result-item">
        <span class="result-label">理论最大风量</span>
        <span class="result-value">{{ result.theoreticalMaxFlow.toFixed(2) }} mm³/s</span>
      </div>

      <div class="result-item">
        <span class="result-label">送风效率</span>
        <span :class="['result-value', { 'warning': result.efficiency < 40, 'danger': result.efficiency < 20 }]">
          {{ result.efficiency.toFixed(1) }}%
        </span>
      </div>

      <div class="result-item">
        <span class="result-label">压力损失</span>
        <span class="result-value">{{ result.pressureLoss.toFixed(2) }}%</span>
      </div>

      <div class="result-item">
        <span class="result-label">气流波动幅度</span>
        <span class="result-value">{{ result.fluctuationAmplitude.toFixed(2) }}</span>
      </div>

      <div class="result-item">
        <span class="result-label">阀片异常风险</span>
        <span :class="['result-value', 'risk-level', getRiskClass(result.valveRisk)]">
          {{ (result.valveRisk * 100).toFixed(1) }}%
        </span>
      </div>

      <div class="result-item">
        <span class="result-label">综合风险评分</span>
        <span :class="['result-value', 'risk-level', getScoreClass(result.riskScore)]">
          {{ result.riskScore.toFixed(1) }}
        </span>
      </div>

      <div v-if="result.isLeaking" class="leak-warning">
        <span class="warning-icon">⚠</span>
        <span>{{ result.leakWarning }}</span>
      </div>
    </div>

    <div v-if="result.anomalies.length > 0" class="anomaly-section">
      <h4 class="section-title anomaly-title">
        <span class="anomaly-icon">⚡</span>
        异常状态提示 ({{ result.anomalies.length }})
      </h4>
      <div
        v-for="(anomaly, index) in result.anomalies"
        :key="index"
        :class="['anomaly-item', anomaly.level]"
      >
        <span class="anomaly-badge">{{ getAnomalyBadge(anomaly.type) }}</span>
        <span class="anomaly-msg">{{ anomaly.message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBellowsStore } from '@/stores/bellows'
import type { BellowsParams } from '@/types'

const store = useBellowsStore()

const params = computed(() => store.params)
const result = computed(() => store.result)

function handleSliderChange(key: keyof BellowsParams, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  if (key === 'leakageRate' || key === 'loadPressure' || key === 'environmentalResistance' || value > 0) {
    store.updateParam(key, value as BellowsParams[typeof key])
  }
}

function handleInputChange(key: keyof BellowsParams, event: Event) {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value)

  if (isNaN(value) || value < 0) {
    value = 0
  }

  if (key === 'valveStuckLevel') {
    value = Math.min(0.9, Math.max(0.1, value))
  }

  store.updateParam(key, value as BellowsParams[typeof key])
}

function handlePercentageChange(key: keyof BellowsParams, event: Event) {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value)
  if (isNaN(value) || value < 0) value = 0
  store.updateParam(key, (value / 100) as BellowsParams[typeof key])
}

function toggleValveStuck() {
  store.updateParam('valveStuck', !store.params.valveStuck)
}

function getRiskClass(risk: number): string {
  if (risk >= 0.7) return 'high'
  if (risk >= 0.4) return 'medium'
  return 'low'
}

function getScoreClass(score: number): string {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function getAnomalyBadge(type: string): string {
  const map: Record<string, string> = {
    valve_stuck: '阀片',
    leakage: '漏气',
    high_frequency: '频率',
    low_efficiency: '效率',
    pressure_abnormal: '压力'
  }
  return map[type] || type
}
</script>

<style scoped>
.control-panel {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.panel-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.param-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.param-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.param-item {
  margin-bottom: 12px;
}

.param-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
}

.param-value {
  font-weight: 500;
  color: #333;
}

.param-slider {
  width: calc(100% - 70px);
  margin-right: 8px;
  vertical-align: middle;
  accent-color: #4a90d9;
}

.param-input {
  width: 60px;
  padding: 4px 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
  vertical-align: middle;
}

.param-input:focus {
  outline: none;
  border-color: #4a90d9;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.toggle-track {
  display: inline-block;
  width: 44px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle-btn.active .toggle-track {
  background: #4a90d9;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-btn.active .toggle-thumb {
  transform: translateX(20px);
}

.result-section {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.result-item:last-child {
  border-bottom: none;
}

.result-label {
  font-size: 13px;
  color: #666;
}

.result-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.result-value.warning {
  color: #e67e22;
}

.result-value.danger {
  color: #e74c3c;
}

.risk-level.low {
  color: #27ae60;
}

.risk-level.medium {
  color: #f39c12;
}

.risk-level.high {
  color: #e74c3c;
}

.leak-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: #fef5e7;
  border-radius: 6px;
  color: #e67e22;
  font-size: 12px;
  font-weight: 500;
}

.warning-icon {
  font-size: 16px;
}

.anomaly-section {
  margin-top: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #f0e0e0;
}

.anomaly-title {
  color: #c0392b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.anomaly-icon {
  font-size: 16px;
}

.anomaly-item {
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border-left: 4px solid;
  display: flex;
  align-items: flex-start;
  gap: 8px;
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

.anomaly-item.info {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1565c0;
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

.anomaly-item.info .anomaly-badge {
  background: rgba(33, 150, 243, 0.15);
  color: #1565c0;
}

.anomaly-msg {
  flex: 1;
}
</style>
