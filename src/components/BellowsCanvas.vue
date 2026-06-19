<template>
  <div class="bellows-canvas-container">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="bellows-canvas"
    ></canvas>

    <div class="status-panel">
      <div class="status-row">
        <div class="status-block">
          <span class="status-label">当前时间</span>
          <span class="status-value highlight">{{ animationState.time.toFixed(2) }}s</span>
        </div>
        <div class="status-block">
          <span class="status-label">左活塞位置</span>
          <span class="status-value">{{ animationState.leftPistonPosition.toFixed(1) }} mm</span>
        </div>
        <div class="status-block">
          <span class="status-label">右活塞位置</span>
          <span class="status-value">{{ animationState.rightPistonPosition.toFixed(1) }} mm</span>
        </div>
      </div>
      <div class="status-row">
        <div class="status-block">
          <span class="status-label">左阀片</span>
          <span :class="['status-value', 'badge', animationState.valveOpenLeft ? 'open' : 'closed']">
            {{ animationState.valveOpenLeft ? '开启' : '关闭' }}
          </span>
        </div>
        <div class="status-block">
          <span class="status-label">右阀片</span>
          <span :class="['status-value', 'badge', animationState.valveOpenRight ? 'open' : 'closed']">
            {{ animationState.valveOpenRight ? '开启' : '关闭' }}
          </span>
        </div>
        <div class="status-block">
          <span class="status-label">气流方向</span>
          <span :class="['status-value', 'flow-badge', getFlowClass()]">
            {{ getFlowText() }}
          </span>
        </div>
      </div>
      <div class="status-row">
        <div class="status-block">
          <span class="status-label">左腔压力</span>
          <span class="status-value pressure">{{ animationState.leftChamberPressure.toFixed(3) }} atm</span>
        </div>
        <div class="status-block">
          <span class="status-label">右腔压力</span>
          <span class="status-value pressure">{{ animationState.rightChamberPressure.toFixed(3) }} atm</span>
        </div>
        <div class="status-block">
          <span class="status-label">播放速度</span>
          <span class="status-value">{{ playbackSpeed }}x</span>
        </div>
      </div>
    </div>

    <div class="timeline-container">
      <div class="timeline-header">
        <span class="timeline-label">时间轴回放</span>
        <span class="timeline-range">0.00s ~ {{ maxTimelineTime.toFixed(2) }}s</span>
      </div>
      <div class="timeline-slider-wrapper">
        <input
          type="range"
          :value="timelineValue"
          min="0"
          :max="maxTimelineTime"
          step="0.01"
          class="timeline-slider"
          @input="handleTimelineInput"
          @mousedown="handleTimelineStart"
          @mouseup="handleTimelineEnd"
          @touchstart="handleTimelineStart"
          @touchend="handleTimelineEnd"
        />
        <div class="timeline-markers">
          <span v-for="mark in timelineMarkers" :key="mark" class="timeline-marker" :style="{ left: (mark / maxTimelineTime * 100) + '%' }">
            {{ mark.toFixed(1) }}s
          </span>
        </div>
      </div>
    </div>

    <div class="canvas-controls">
      <button @click="handleTogglePlay" :class="['control-btn', isPlaying ? 'pause' : 'play']">
        {{ isPlaying ? '⏸ 暂停' : '▶ 播放' }}
      </button>
      <button @click="handleReset" class="control-btn reset">
        ⟲ 重置
      </button>
      <div class="speed-group">
        <button
          v-for="speed in speedOptions"
          :key="speed"
          @click="handleSpeedChange(speed)"
          :class="['speed-btn', { active: playbackSpeed === speed }]"
        >
          {{ speed }}x
        </button>
      </div>
    </div>

    <div class="canvas-legend">
      <div class="legend-item">
        <span class="legend-color piston"></span>
        <span>活塞</span>
      </div>
      <div class="legend-item">
        <span class="legend-color valve-open"></span>
        <span>阀片开启</span>
      </div>
      <div class="legend-item">
        <span class="legend-color valve-closed"></span>
        <span>阀片关闭</span>
      </div>
      <div class="legend-item">
        <span class="legend-color airflow"></span>
        <span>气流方向</span>
      </div>
      <div class="legend-item">
        <span class="legend-color pressure-high"></span>
        <span>高压区</span>
      </div>
      <div class="legend-item">
        <span class="legend-color pressure-low"></span>
        <span>低压区</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useBellowsStore } from '@/stores/bellows'

const store = useBellowsStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = 800
const canvasHeight = 400

const isPlaying = computed(() => store.isPlaying)
const animationState = computed(() => store.animationState)
const playbackSpeed = computed(() => store.playbackSpeed)

const speedOptions = [0.25, 0.5, 1, 2, 4]
const maxTimelineTime = 20
const timelineValue = ref(0)
let isUserSeeking = false

const timelineMarkers = computed(() => {
  const count = 5
  return Array.from({ length: count + 1 }, (_, i) => (maxTimelineTime / count) * i)
})

let animationFrameId: number | null = null
let lastTime = 0

const scale = computed(() => {
  const maxDimension = Math.max(
    store.params.chamberWidth,
    store.params.chamberHeight,
    store.params.pistonStroke
  )
  return Math.min(canvasWidth / 4 / maxDimension, canvasHeight / maxDimension) * 0.8
})

function getFlowClass(): string {
  const dir = animationState.value.airFlowDirection
  if (dir === 'left') return 'flow-left'
  if (dir === 'right') return 'flow-right'
  return 'flow-none'
}

function getFlowText(): string {
  const dir = animationState.value.airFlowDirection
  if (dir === 'left') return '← 向左'
  if (dir === 'right') return '向右 →'
  return '— 无'
}

function drawBellows(ctx: CanvasRenderingContext2D) {
  const w = canvasWidth
  const h = canvasHeight
  const s = scale.value

  const chamberW = store.params.chamberWidth * s
  const chamberH = store.params.chamberHeight * s
  const stroke = store.params.pistonStroke * s / 2

  const centerY = h / 2
  const leftChamberX = w / 4
  const rightChamberX = w * 3 / 4

  ctx.clearRect(0, 0, w, h)

  drawBackground(ctx, w, h)

  const leftPressureNorm = (animationState.value.leftChamberPressure - 0.5) / 2
  const rightPressureNorm = (animationState.value.rightChamberPressure - 0.5) / 2

  drawChamber(ctx, leftChamberX, centerY, chamberW, chamberH, 'left', leftPressureNorm)
  drawChamber(ctx, rightChamberX, centerY, chamberW, chamberH, 'right', rightPressureNorm)

  const leftPistonOffset = animationState.value.leftPistonPosition * s
  const rightPistonOffset = animationState.value.rightPistonPosition * s

  drawPiston(ctx, leftChamberX - chamberW / 2 - stroke + leftPistonOffset, centerY, chamberH, 'left')
  drawPiston(ctx, rightChamberX + chamberW / 2 + stroke + rightPistonOffset, centerY, chamberH, 'right')

  drawValve(ctx, leftChamberX + chamberW / 2, centerY, animationState.value.valveOpenLeft, 'left')
  drawValve(ctx, rightChamberX - chamberW / 2, centerY, animationState.value.valveOpenRight, 'right')

  drawConnectingTube(ctx, leftChamberX + chamberW / 2, rightChamberX - chamberW / 2, centerY)

  drawAirFlow(ctx, leftChamberX + chamberW / 2, rightChamberX - chamberW / 2, centerY)

  drawPressureIndicator(ctx, leftChamberX, centerY - chamberH / 2 - 40, animationState.value.leftChamberPressure, '左腔压力')
  drawPressureIndicator(ctx, rightChamberX, centerY - chamberH / 2 - 40, animationState.value.rightChamberPressure, '右腔压力')

  drawStrokeIndicator(ctx, leftChamberX - chamberW / 2 - stroke, centerY, stroke, 'left')
  drawStrokeIndicator(ctx, rightChamberX + chamberW / 2 + stroke, centerY, stroke, 'right')
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, '#f8f9fa')
  gradient.addColorStop(1, '#e8ecef')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(100, 120, 140, 0.08)'
  ctx.lineWidth = 1
  const gridSize = 40
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function drawChamber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  side: 'left' | 'right',
  pressureNorm: number
) {
  ctx.save()

  const hue = 120 - Math.max(0, Math.min(1, pressureNorm)) * 120
  const saturation = 50 + Math.abs(pressureNorm - 0.5) * 40
  const fillColor = `hsla(${hue}, ${saturation}%, 65%, 0.45)`

  ctx.fillStyle = fillColor
  ctx.strokeStyle = '#4a90d9'
  ctx.lineWidth = 3
  ctx.shadowColor = 'rgba(74, 144, 217, 0.2)'
  ctx.shadowBlur = 10

  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 8)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

  ctx.fillStyle = '#333'
  ctx.font = 'bold 14px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(side === 'left' ? '左腔' : '右腔', x, y + h / 2 + 25)

  ctx.restore()
}

function drawPiston(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  h: number,
  side: 'left' | 'right'
) {
  ctx.save()

  const pistonW = 15
  const rodLength = 60

  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2

  const pistonGradient = ctx.createLinearGradient(x - pistonW / 2, 0, x + pistonW / 2, 0)
  pistonGradient.addColorStop(0, '#c0392b')
  pistonGradient.addColorStop(0.5, '#e74c3c')
  pistonGradient.addColorStop(1, '#c0392b')
  ctx.fillStyle = pistonGradient
  ctx.strokeStyle = '#922b21'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.roundRect(x - pistonW / 2, y - h / 2 - 10, pistonW, h + 20, 3)
  ctx.fill()
  ctx.stroke()

  ctx.shadowBlur = 0

  ctx.strokeStyle = '#7f8c8d'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (side === 'left') {
    ctx.moveTo(x - pistonW / 2, y)
    ctx.lineTo(x - pistonW / 2 - rodLength, y)
  } else {
    ctx.moveTo(x + pistonW / 2, y)
    ctx.lineTo(x + pistonW / 2 + rodLength, y)
  }
  ctx.stroke()

  ctx.fillStyle = '#555'
  ctx.beginPath()
  if (side === 'left') {
    ctx.arc(x - pistonW / 2 - rodLength, y, 6, 0, Math.PI * 2)
  } else {
    ctx.arc(x + pistonW / 2 + rodLength, y, 6, 0, Math.PI * 2)
  }
  ctx.fill()

  ctx.restore()
}

function drawValve(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isOpen: boolean,
  side: 'left' | 'right'
) {
  ctx.save()

  const valveSize = 22

  if (store.params.valveStuck && isOpen) {
    ctx.globalAlpha = 0.5 + (1 - store.params.valveStuckLevel) * 0.5
  }
  if (store.params.valveStuck && !isOpen) {
    ctx.shadowColor = '#e74c3c'
    ctx.shadowBlur = 8
  }

  if (isOpen) {
    ctx.fillStyle = '#27ae60'
    ctx.strokeStyle = '#1e8449'
  } else {
    ctx.fillStyle = '#e67e22'
    ctx.strokeStyle = '#d35400'
  }

  ctx.lineWidth = 2

  if (isOpen) {
    ctx.beginPath()
    if (side === 'left') {
      ctx.moveTo(x + valveSize / 2, y - valveSize / 2)
      ctx.lineTo(x + valveSize / 2, y + valveSize / 2)
      ctx.lineTo(x + valveSize / 4, y + valveSize / 2)
      ctx.lineTo(x - valveSize / 4, y - valveSize / 2)
    } else {
      ctx.moveTo(x - valveSize / 2, y - valveSize / 2)
      ctx.lineTo(x - valveSize / 2, y + valveSize / 2)
      ctx.lineTo(x - valveSize / 4, y + valveSize / 2)
      ctx.lineTo(x + valveSize / 4, y - valveSize / 2)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.fillRect(x - valveSize / 2, y - valveSize / 2, valveSize, valveSize)
    ctx.strokeRect(x - valveSize / 2, y - valveSize / 2, valveSize, valveSize)
    ctx.strokeStyle = isOpen ? '#1e8449' : '#9c3d00'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - valveSize / 3, y - valveSize / 3)
    ctx.lineTo(x + valveSize / 3, y + valveSize / 3)
    ctx.moveTo(x + valveSize / 3, y - valveSize / 3)
    ctx.lineTo(x - valveSize / 3, y + valveSize / 3)
    ctx.stroke()
  }

  ctx.restore()
}

function drawConnectingTube(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  y: number
) {
  ctx.save()

  const tubeHeight = 34

  const tubeGradient = ctx.createLinearGradient(0, y - tubeHeight / 2, 0, y + tubeHeight / 2)
  tubeGradient.addColorStop(0, 'rgba(180, 210, 235, 0.6)')
  tubeGradient.addColorStop(0.5, 'rgba(200, 225, 245, 0.4)')
  tubeGradient.addColorStop(1, 'rgba(180, 210, 235, 0.6)')

  ctx.fillStyle = tubeGradient
  ctx.strokeStyle = '#7f8c8d'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.roundRect(leftX, y - tubeHeight / 2, rightX - leftX, tubeHeight, 6)
  ctx.fill()
  ctx.stroke()

  ctx.restore()
}

function drawAirFlow(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  rightX: number,
  y: number
) {
  const direction = animationState.value.airFlowDirection
  if (direction === 'none') return

  ctx.save()

  const arrowCount = 6
  const totalWidth = rightX - leftX
  const spacing = totalWidth / (arrowCount + 1)

  const time = animationState.value.time
  const speed = (1 + store.params.rodFrequency * 0.3) * 60
  const offset = (time * speed) % spacing

  const flowIntensity = Math.min(1, Math.abs(animationState.value.leftChamberPressure - animationState.value.rightChamberPressure) * 2 + 0.4)
  const arrowSize = 10 + flowIntensity * 6

  ctx.fillStyle = `rgba(52, 152, 219, ${0.6 + flowIntensity * 0.4})`
  ctx.strokeStyle = '#2980b9'
  ctx.lineWidth = 1.5

  for (let i = 0; i < arrowCount; i++) {
    let x = leftX + spacing * (i + 1) + offset - spacing

    if (direction === 'left') {
      x = rightX - spacing * (i + 1) - offset + spacing
    }

    if (x < leftX + 15 || x > rightX - 15) continue

    ctx.beginPath()
    if (direction === 'right') {
      ctx.moveTo(x - arrowSize / 2, y - arrowSize / 2)
      ctx.lineTo(x + arrowSize / 2, y)
      ctx.lineTo(x - arrowSize / 2, y + arrowSize / 2)
    } else {
      ctx.moveTo(x + arrowSize / 2, y - arrowSize / 2)
      ctx.lineTo(x - arrowSize / 2, y)
      ctx.lineTo(x + arrowSize / 2, y + arrowSize / 2)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
}

function drawPressureIndicator(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pressure: number,
  label: string
) {
  ctx.save()

  const barWidth = 70
  const barHeight = 12

  const normalizedPressure = Math.max(0, Math.min(2.5, pressure))
  const fillWidth = (normalizedPressure / 2.5) * barWidth

  ctx.fillStyle = '#ecf0f1'
  ctx.strokeStyle = '#bdc3c7'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x - barWidth / 2, y, barWidth, barHeight, 3)
  ctx.fill()
  ctx.stroke()

  const hue = 120 - (normalizedPressure / 2.5) * 130
  const grad = ctx.createLinearGradient(x - barWidth / 2, 0, x - barWidth / 2 + fillWidth, 0)
  grad.addColorStop(0, `hsl(${hue + 20}, 70%, 55%)`)
  grad.addColorStop(1, `hsl(${hue}, 70%, 45%)`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(x - barWidth / 2, y, fillWidth, barHeight, 3)
  ctx.fill()

  ctx.fillStyle = '#333'
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${label}: ${pressure.toFixed(2)} atm`, x, y - 5)

  ctx.restore()
}

function drawStrokeIndicator(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number,
  strokeLength: number,
  side: 'left' | 'right'
) {
  ctx.save()
  ctx.strokeStyle = 'rgba(100, 120, 140, 0.35)'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 4])

  const startX = side === 'left' ? centerX - strokeLength : centerX
  const endX = side === 'left' ? centerX + strokeLength : centerX + strokeLength * 2

  ctx.beginPath()
  ctx.moveTo(startX, y - 20)
  ctx.lineTo(startX, y + 20)
  ctx.moveTo(endX, y - 20)
  ctx.lineTo(endX, y + 20)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(100, 120, 140, 0.6)'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  const midX = (startX + endX) / 2
  ctx.fillText(`行程: ${(strokeLength * 2 / scale.value).toFixed(0)}mm`, midX, y - 28)

  ctx.restore()
}

function animate(currentTime: number) {
  if (!canvasRef.value) return

  const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016
  lastTime = currentTime

  if (!isUserSeeking) {
    store.updateAnimation(deltaTime)
    timelineValue.value = animationState.value.time % maxTimelineTime
  }

  const ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    drawBellows(ctx)
  }

  animationFrameId = requestAnimationFrame(animate)
}

function handleTimelineStart() {
  isUserSeeking = true
}

function handleTimelineInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  timelineValue.value = value
  store.seekToTime(value)
}

function handleTimelineEnd() {
  isUserSeeking = false
  store.endSeek()
}

function handleTogglePlay() {
  store.togglePlay()
}

function handleReset() {
  store.resetAnimation()
  timelineValue.value = 0
}

function handleSpeedChange(speed: number) {
  store.setPlaybackSpeed(speed)
}

watch(() => store.params, () => {
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      drawBellows(ctx)
    }
  }
}, { deep: true })

watch(animationState, () => {
  if (canvasRef.value && !isUserSeeking) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      drawBellows(ctx)
    }
  }
}, { deep: true })

onMounted(() => {
  animationFrameId = requestAnimationFrame(animate)
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.bellows-canvas-container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bellows-canvas {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  width: 100%;
  max-width: 100%;
}

.status-panel {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #e8ecef;
}

.status-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.status-row:last-child {
  margin-bottom: 0;
}

.status-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.status-label {
  font-size: 11px;
  color: #888;
}

.status-value {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.status-value.highlight {
  color: #2980b9;
  font-size: 15px;
}

.status-value.pressure {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12px;
}

.status-value.badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
}

.status-value.badge.open {
  background: #e8f8f0;
  color: #27ae60;
}

.status-value.badge.closed {
  background: #fef3e2;
  color: #e67e22;
}

.flow-badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
}

.flow-badge.flow-right {
  background: #e8f4f8;
  color: #2980b9;
}

.flow-badge.flow-left {
  background: #f8e8f0;
  color: #8e44ad;
}

.flow-badge.flow-none {
  background: #f0f0f0;
  color: #888;
}

.timeline-container {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid #e8ecef;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.timeline-range {
  font-size: 11px;
  color: #999;
  font-family: 'SF Mono', 'Menlo', monospace;
}

.timeline-slider-wrapper {
  position: relative;
  padding-bottom: 18px;
}

.timeline-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #e8f4f8, #d4e9f0);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.timeline-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90d9, #357abd);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(74, 144, 217, 0.4);
  transition: transform 0.15s;
}

.timeline-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.timeline-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90d9, #357abd);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(74, 144, 217, 0.4);
}

.timeline-markers {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 14px;
}

.timeline-marker {
  position: absolute;
  transform: translateX(-50%);
  font-size: 9px;
  color: #aaa;
  white-space: nowrap;
}

.canvas-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.control-btn {
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: #4a90d9;
  color: white;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.control-btn:hover {
  background: #3a7bc8;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(74, 144, 217, 0.3);
}

.control-btn:active {
  transform: translateY(0);
}

.control-btn.pause {
  background: #e67e22;
}

.control-btn.pause:hover {
  background: #d35400;
}

.control-btn.reset {
  background: #7f8c8d;
}

.control-btn.reset:hover {
  background: #606b6c;
}

.speed-group {
  display: flex;
  gap: 4px;
  background: #e8ecef;
  padding: 4px;
  border-radius: 6px;
}

.speed-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #666;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.speed-btn.active {
  background: #4a90d9;
  color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.canvas-legend {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #666;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  flex-shrink: 0;
}

.legend-color.piston {
  background: linear-gradient(90deg, #c0392b, #e74c3c, #c0392b);
}

.legend-color.valve-open {
  background: #27ae60;
}

.legend-color.valve-closed {
  background: #e67e22;
}

.legend-color.airflow {
  background: #3498db;
  clip-path: polygon(0% 50%, 100% 0%, 100% 100%);
}

.legend-color.pressure-high {
  background: linear-gradient(90deg, #e74c3c, #f39c12);
}

.legend-color.pressure-low {
  background: linear-gradient(90deg, #27ae60, #2ecc71);
}

@media (max-width: 700px) {
  .status-row {
    flex-wrap: wrap;
  }

  .status-block {
    min-width: 30%;
  }
}
</style>
