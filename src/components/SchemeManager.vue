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
        💾 保存方案
      </button>
    </div>

    <div class="scheme-list-wrapper">
      <div class="scheme-list-header">
        <h4 class="section-title">已保存方案 ({{ schemes.length }})</h4>
        <button
          v-if="schemes.length > 0"
          @click="handleClearAll"
          class="clear-btn"
          title="清空所有方案"
        >
          🗑 清空
        </button>
      </div>

      <div v-if="schemes.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <p>暂无保存的方案</p>
        <p class="empty-tip">调整参数后输入名称即可保存</p>
      </div>

      <div class="scheme-list">
        <div v-for="scheme in sortedSchemes" :key="scheme.id" class="scheme-item">
          <div class="scheme-header">
            <label class="scheme-checkbox" title="添加到对比">
              <input
                type="checkbox"
                :checked="selectedSchemeIds.includes(scheme.id)"
                @change="handleToggleSelect(scheme.id)"
              />
              <span class="checkmark"></span>
            </label>
            <span class="scheme-name" :title="scheme.name">{{ scheme.name }}</span>
            <span :class="['risk-badge', getRiskBadgeClass(scheme.result.riskScore)]">
              风险{{ scheme.result.riskScore.toFixed(0) }}
            </span>
          </div>

          <div class="scheme-params">
            <span class="param-tag" title="腔体尺寸">
              📐 {{ scheme.params.chamberWidth }}×{{ scheme.params.chamberHeight }}×{{ scheme.params.chamberDepth }}
            </span>
            <span class="param-tag" title="拉杆频率">
              ⚡ {{ scheme.params.rodFrequency }}Hz
            </span>
            <span class="param-tag" title="送风效率">
              📊 {{ scheme.result.efficiency.toFixed(1) }}%
            </span>
          </div>

          <div class="scheme-stats">
            <div class="stat-mini">
              <span class="stat-label">风量</span>
              <span class="stat-val">{{ scheme.result.airFlowRate.toFixed(0) }}</span>
            </div>
            <div class="stat-mini">
              <span class="stat-label">负载</span>
              <span class="stat-val">{{ scheme.params.loadPressure.toFixed(1) }}atm</span>
            </div>
            <div class="stat-mini">
              <span class="stat-label">阻力</span>
              <span class="stat-val">{{ (scheme.params.environmentalResistance * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <div class="scheme-meta">
            <span class="scheme-time">{{ formatTime(scheme.timestamp) }}</span>
            <span v-if="scheme.isPlaying" class="play-indicator" title="播放中">▶</span>
          </div>

          <div class="scheme-actions">
            <button @click="handleLoad(scheme.id)" class="action-btn load-btn">
              加载
            </button>
            <button @click="handleRename(scheme)" class="action-btn edit-btn">
              重命名
            </button>
            <button @click="handleDelete(scheme.id)" class="action-btn delete-btn">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedSchemes.length >= 2" class="compare-hint">
      ✅ 已选择 {{ selectedSchemes.length }} 个方案 → 前往图表"方案对比"视图查看
    </div>
    <div v-else-if="schemes.length >= 2" class="compare-hint tip">
      💡 勾选至少2个方案复选框即可进行对比分析
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBellowsStore } from '@/stores/bellows'
import type { Scheme } from '@/types'

const store = useBellowsStore()

const schemeName = ref('')

const schemes = computed(() => store.schemes)
const selectedSchemeIds = computed(() => store.selectedSchemeIds)
const selectedSchemes = computed(() => store.selectedSchemes)

const sortedSchemes = computed(() => {
  return [...schemes.value].sort((a, b) => b.timestamp - a.timestamp)
})

function handleSave() {
  if (!schemeName.value.trim()) return
  store.saveScheme(schemeName.value.trim())
  schemeName.value = ''
}

function handleLoad(id: string) {
  store.loadScheme(id)
}

function handleDelete(id: string) {
  if (confirm('确定要删除这个方案吗？此操作不可撤销。')) {
    store.deleteScheme(id)
  }
}

function handleClearAll() {
  if (schemes.value.length === 0) return
  if (confirm(`确定要清空所有 ${schemes.value.length} 个方案吗？此操作不可撤销！`)) {
    for (const s of [...schemes.value]) {
      store.deleteScheme(s.id)
    }
  }
}

function handleToggleSelect(id: string) {
  store.toggleSchemeSelection(id)
}

function handleRename(scheme: Scheme) {
  const newName = prompt('请输入新的方案名称：', scheme.name)
  if (newName && newName.trim() && newName.trim() !== scheme.name) {
    const idx = store.schemes.findIndex(s => s.id === scheme.id)
    if (idx !== -1) {
      store.schemes[idx].name = newName.trim()
      const updateStorage = () => {
        try {
          localStorage.setItem('bellows_schemes_v2', JSON.stringify(store.schemes))
        } catch (e) {
          console.error('Rename save failed:', e)
        }
      }
      updateStorage()
    }
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getRiskBadgeClass(score: number): string {
  if (score >= 70) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}
</script>

<style scoped>
.scheme-manager {
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

.save-section {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.scheme-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  transition: border-color 0.2s;
}

.scheme-input:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
}

.save-btn {
  padding: 9px 14px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #4a90d9, #357abd);
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #3a7bc8, #2c6aa8);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}

.save-btn:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.scheme-list-wrapper {
  margin-bottom: 12px;
}

.scheme-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
}

.clear-btn {
  padding: 4px 10px;
  border: 1px solid #fde8e8;
  background: #fff;
  color: #c0392b;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #fde8e8;
}

.empty-state {
  text-align: center;
  padding: 30px 20px;
  color: #999;
  background: white;
  border-radius: 8px;
  border: 2px dashed #e0e0e0;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.empty-state p {
  margin: 4px 0;
  font-size: 13px;
}

.empty-tip {
  font-size: 11px !important;
  color: #bbb;
}

.scheme-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scheme-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  border: 1px solid #e8ecef;
  transition: all 0.2s;
}

.scheme-item:hover {
  border-color: #4a90d9;
  box-shadow: 0 2px 10px rgba(74, 144, 217, 0.15);
  transform: translateY(-1px);
}

.scheme-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.scheme-checkbox {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
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
  border-radius: 4px;
  background: white;
  transition: all 0.2s;
}

.scheme-checkbox input:checked ~ .checkmark {
  background: #4a90d9;
  border-color: #4a90d9;
}

.scheme-checkbox input:checked ~ .checkmark::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 0px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.scheme-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.risk-badge.low {
  background: #e8f8f0;
  color: #27ae60;
}

.risk-badge.medium {
  background: #fef3e2;
  color: #f39c12;
}

.risk-badge.high {
  background: #ffebee;
  color: #e74c3c;
}

.scheme-params {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.param-tag {
  display: inline-block;
  padding: 3px 8px;
  background: #f1f3f5;
  border-radius: 4px;
  font-size: 10px;
  color: #666;
  font-family: 'SF Mono', Menlo, monospace;
}

.scheme-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  font-size: 10px;
  color: #999;
}

.stat-val {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  font-family: 'SF Mono', Menlo, monospace;
}

.scheme-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

.scheme-time {
  font-size: 11px;
  color: #aaa;
}

.play-indicator {
  font-size: 10px;
  color: #27ae60;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.scheme-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.load-btn {
  background: #e8f4f8;
  color: #2980b9;
}

.load-btn:hover {
  background: #d4e9f0;
  transform: translateY(-1px);
}

.edit-btn {
  background: #f5eef8;
  color: #8e44ad;
}

.edit-btn:hover {
  background: #ebd9f2;
  transform: translateY(-1px);
}

.delete-btn {
  background: #fde8e8;
  color: #c0392b;
}

.delete-btn:hover {
  background: #f8d0d0;
  transform: translateY(-1px);
}

.compare-hint {
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}

.compare-hint {
  background: #e8f8f0;
  color: #27ae60;
  border: 1px solid #b7e4c7;
}

.compare-hint.tip {
  background: #f8f9fa;
  color: #888;
  border: 1px dashed #ddd;
}
</style>
