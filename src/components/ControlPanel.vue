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
          max="10"
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
          min="1"
          max="100"
          step="0.5"
          class="param-slider"
        />
        <input
          type="number"
          :value="params.valveOpeningArea"
          @change="handleInputChange('valveOpeningArea', $event)"
          min="0.1"
          step="0.5"
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
        <span class="result-label">单位时间送风量</span>
        <span class="result-value">{{ result.airFlowRate.toFixed(2) }} mm³/s</span>
      </div>

      <div class="result-item">
        <span class="result-label">理论最大风量</span>
        <span class="result-value">{{ result.theoreticalMaxFlow.toFixed(2) }} mm³/s</span>
      </div>

      <div class="result-item">
        <span class="result-label">送风效率</span>
        <span :class="['result-value', { 'warning': result.efficiency < 30 }]">
          {{ result.efficiency.toFixed(1) }}%
        </span>
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

      <div v-if="result.isLeaking" class="leak-warning">
        <span class="warning-icon">⚠</span>
        <span>{{ result.leakWarning }}</span>
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
  if (value > 0) {
    store.updateParam(key, value as BellowsParams[typeof key])
  }
}

function handleInputChange(key: keyof BellowsParams, event: Event) {
  const target = event.target as HTMLInputElement
  let value = parseFloat(target.value)

  if (isNaN(value) || value <= 0) {
    value = 1
    target.value = '1'
  }

  if (key === 'valveStuckLevel') {
    value = Math.min(0.9, Math.max(0.1, value))
  }

  store.updateParam(key, value as BellowsParams[typeof key])
}

function toggleValveStuck() {
  store.updateParam('valveStuck', !store.params.valveStuck)
}

function getRiskClass(risk: number): string {
  if (risk >= 0.7) return 'high'
  if (risk >= 0.4) return 'medium'
  return 'low'
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
</style>
