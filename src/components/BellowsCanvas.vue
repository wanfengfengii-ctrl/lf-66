<template>
  <div class="bellows-canvas-container">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="bellows-canvas"
    ></canvas>
    <div class="canvas-controls">
      <button @click="handleTogglePlay" class="control-btn">
        {{ isPlaying ? '暂停' : '播放' }}
      </button>
      <button @click="handleReset" class="control-btn">
        重置
      </button>
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

  drawChamber(ctx, leftChamberX, centerY, chamberW, chamberH, 'left')
  drawChamber(ctx, rightChamberX, centerY, chamberW, chamberH, 'right')

  const leftPistonOffset = store.animationState.leftPistonPosition * s
  const rightPistonOffset = store.animationState.rightPistonPosition * s

  drawPiston(ctx, leftChamberX - chamberW / 2 - stroke + leftPistonOffset, centerY, chamberH, 'left')
  drawPiston(ctx, rightChamberX + chamberW / 2 + stroke + rightPistonOffset, centerY, chamberH, 'right')

  drawValve(ctx, leftChamberX + chamberW / 2, centerY, store.animationState.valveOpenLeft, 'left')
  drawValve(ctx, rightChamberX - chamberW / 2, centerY, store.animationState.valveOpenRight, 'right')

  drawConnectingTube(ctx, leftChamberX + chamberW / 2, rightChamberX - chamberW / 2, centerY)

  drawAirFlow(ctx, leftChamberX + chamberW / 2, rightChamberX - chamberW / 2, centerY)

  drawPressureIndicator(ctx, leftChamberX, centerY - chamberH / 2 - 30, store.animationState.leftChamberPressure, '左腔压力')
  drawPressureIndicator(ctx, rightChamberX, centerY - chamberH / 2 - 30, store.animationState.rightChamberPressure, '右腔压力')
}

function drawChamber(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  side: 'left' | 'right'
) {
  ctx.save()
  ctx.fillStyle = 'rgba(200, 220, 240, 0.6)'
  ctx.strokeStyle = '#4a90d9'
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#333'
  ctx.font = '14px sans-serif'
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

  ctx.fillStyle = '#e74c3c'
  ctx.strokeStyle = '#c0392b'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.roundRect(x - pistonW / 2, y - h / 2 - 10, pistonW, h + 20, 3)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = '#7f8c8d'
  ctx.lineWidth = 4
  ctx.beginPath()
  if (side === 'left') {
    ctx.moveTo(x - pistonW / 2, y)
    ctx.lineTo(x - pistonW / 2 - rodLength, y)
  } else {
    ctx.moveTo(x + pistonW / 2, y)
    ctx.lineTo(x + pistonW / 2 + rodLength, y)
  }
  ctx.stroke()

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

  const valveSize = 20

  if (store.params.valveStuck && isOpen) {
    ctx.globalAlpha = 0.5 + (1 - store.params.valveStuckLevel) * 0.5
  }

  if (isOpen) {
    ctx.fillStyle = '#27ae60'
    ctx.strokeStyle = '#219a52'
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

  const tubeHeight = 30

  ctx.fillStyle = 'rgba(150, 180, 200, 0.4)'
  ctx.strokeStyle = '#7f8c8d'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.roundRect(leftX, y - tubeHeight / 2, rightX - leftX, tubeHeight, 4)
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
  const direction = store.animationState.airFlowDirection
  if (direction === 'none') return

  ctx.save()

  const arrowCount = 5
  const totalWidth = rightX - leftX
  const spacing = totalWidth / (arrowCount + 1)

  const time = store.animationState.time
  const offset = (time * 100) % spacing

  ctx.fillStyle = '#3498db'
  ctx.strokeStyle = '#2980b9'
  ctx.lineWidth = 1

  for (let i = 0; i < arrowCount; i++) {
    let x = leftX + spacing * (i + 1) + offset - spacing

    if (direction === 'left') {
      x = rightX - spacing * (i + 1) - offset + spacing
    }

    if (x < leftX + 10 || x > rightX - 10) continue

    const arrowSize = 12
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

  const barWidth = 60
  const barHeight = 10

  const normalizedPressure = Math.max(0, Math.min(2, pressure))
  const fillWidth = (normalizedPressure / 2) * barWidth

  ctx.fillStyle = '#ecf0f1'
  ctx.strokeStyle = '#bdc3c7'
  ctx.lineWidth = 1
  ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight)
  ctx.strokeRect(x - barWidth / 2, y, barWidth, barHeight)

  const hue = 120 - (normalizedPressure / 2) * 120
  ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
  ctx.fillRect(x - barWidth / 2, y, fillWidth, barHeight)

  ctx.fillStyle = '#333'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${label}: ${pressure.toFixed(2)} atm`, x, y - 4)

  ctx.restore()
}

function animate(currentTime: number) {
  if (!canvasRef.value) return

  const deltaTime = lastTime ? (currentTime - lastTime) / 1000 : 0.016
  lastTime = currentTime

  store.updateAnimation(deltaTime)

  const ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    drawBellows(ctx)
  }

  animationFrameId = requestAnimationFrame(animate)
}

function handleTogglePlay() {
  store.togglePlay()
}

function handleReset() {
  store.resetAnimation()
}

watch(() => store.params, () => {
  if (canvasRef.value) {
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
  align-items: center;
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
}

.canvas-controls {
  display: flex;
  gap: 12px;
}

.control-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #4a90d9;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.control-btn:hover {
  background: #3a7bc8;
}

.canvas-legend {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 3px;
}

.legend-color.piston {
  background: #e74c3c;
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
</style>
