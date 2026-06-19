import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type {
  BellowsParams,
  SimulationResult,
  AnimationState,
  Scheme,
  AirFlowDataPoint,
  PressureDataPoint,
  AnomalyInfo,
  EfficiencyDataPoint,
  RiskDataPoint
} from '@/types'

const LEAK_THRESHOLD = 0.3
const MAX_HISTORY_POINTS = 300
const STORAGE_KEY = 'bellows_schemes_v2'
const HIGH_FREQ_THRESHOLD = 6
const HIGH_FLUCTUATION_THRESHOLD = 30
const LOW_EFFICIENCY_THRESHOLD = 40
const RISK_PRESSURE_ABNORMAL = 1.6

function loadSchemesFromStorage(): Scheme[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load schemes from localStorage:', e)
  }
  return []
}

function saveSchemesToStorage(schemes: Scheme[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes))
  } catch (e) {
    console.error('Failed to save schemes to localStorage:', e)
  }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const useBellowsStore = defineStore('bellows', () => {
  const params = ref<BellowsParams>({
    chamberWidth: 100,
    chamberHeight: 80,
    chamberDepth: 60,
    rodFrequency: 2,
    valveOpeningArea: 500,
    valveStuck: false,
    valveStuckLevel: 0.5,
    pistonStroke: 40,
    environmentalResistance: 0.1,
    loadPressure: 0,
    leakageRate: 0
  })

  const animationState = ref<AnimationState>({
    time: 0,
    leftPistonPosition: 0,
    rightPistonPosition: 0,
    leftChamberPressure: 1,
    rightChamberPressure: 1,
    airFlowDirection: 'none',
    valveOpenLeft: false,
    valveOpenRight: false
  })

  const schemes = ref<Scheme[]>(loadSchemesFromStorage())
  const selectedSchemeIds = ref<string[]>([])
  const isPlaying = ref(true)
  const isSeeking = ref(false)
  const airFlowHistory = ref<AirFlowDataPoint[]>([])
  const pressureHistory = ref<PressureDataPoint[]>([])
  const efficiencyHistory = ref<EfficiencyDataPoint[]>([])
  const riskHistory = ref<RiskDataPoint[]>([])
  const playbackSpeed = ref(1)

  const effectiveValveArea = computed(() => {
    if (params.value.valveStuck) {
      return params.value.valveOpeningArea * (1 - params.value.valveStuckLevel)
    }
    return params.value.valveOpeningArea
  })

  const pistonArea = computed(() => {
    return params.value.chamberWidth * params.value.chamberDepth
  })

  const chamberVolume = computed(() => {
    return params.value.chamberWidth * params.value.chamberHeight * params.value.chamberDepth
  })

  const theoreticalMaxFlow = computed(() => {
    const strokeVolume = pistonArea.value * params.value.pistonStroke
    return strokeVolume * params.value.rodFrequency * 2
  })

  const valveFlowCoefficient = computed(() => {
    const maxArea = params.value.chamberWidth * params.value.chamberDepth * 0.3
    const ratio = Math.min(effectiveValveArea.value / maxArea, 1)
    return 0.35 + 0.65 * ratio
  })

  const resistanceFactor = computed(() => {
    return Math.max(0.1, 1 - params.value.environmentalResistance * 0.5)
  })

  const loadPressureFactor = computed(() => {
    const loadEffect = params.value.loadPressure / 2
    return Math.max(0.2, 1 - loadEffect * 0.4)
  })

  const leakageFactor = computed(() => {
    return Math.max(0, 1 - params.value.leakageRate / 100)
  })

  function detectAnomalies(
    actualFlow: number,
    theoFlow: number,
    efficiency: number,
    fluctuation: number,
    _valveRisk: number
  ): AnomalyInfo[] {
    const anomalies: AnomalyInfo[] = []

    if (params.value.valveStuck) {
      anomalies.push({
        type: 'valve_stuck',
        level: params.value.valveStuckLevel >= 0.6 ? 'danger' : 'warning',
        message: `阀片卡滞（程度${(params.value.valveStuckLevel * 100).toFixed(0)}%）：阀片开启受限，严重影响送风量`,
        value: params.value.valveStuckLevel,
        threshold: 0.1
      })
    }

    const actualLeakRate = params.value.leakageRate
    if (actualLeakRate > 5) {
      anomalies.push({
        type: 'leakage',
        level: actualLeakRate >= 20 ? 'danger' : 'warning',
        message: `漏气异常（漏气率${actualLeakRate.toFixed(1)}%）：系统密封性能下降，实际送风量显著降低`,
        value: actualLeakRate,
        threshold: 5
      })
    } else if (actualFlow < theoFlow * LEAK_THRESHOLD && !params.value.valveStuck) {
      anomalies.push({
        type: 'leakage',
        level: 'warning',
        message: '疑似漏气：送风量低于理论值的30%，建议检查密封件',
        value: (actualFlow / Math.max(1, theoFlow)) * 100,
        threshold: 30
      })
    }

    if (params.value.rodFrequency > HIGH_FREQ_THRESHOLD) {
      anomalies.push({
        type: 'high_frequency',
        level: params.value.rodFrequency >= 8 ? 'danger' : 'warning',
        message: `频率过高（${params.value.rodFrequency.toFixed(1)}Hz）：部件磨损加剧，可能导致气流波动异常`,
        value: params.value.rodFrequency,
        threshold: HIGH_FREQ_THRESHOLD
      })
    }

    if (fluctuation > HIGH_FLUCTUATION_THRESHOLD) {
      anomalies.push({
        type: 'high_frequency',
        level: fluctuation >= HIGH_FLUCTUATION_THRESHOLD * 1.5 ? 'danger' : 'warning',
        message: `波动异常（${fluctuation.toFixed(0)}）：气流波动过大，系统运行不稳定`,
        value: fluctuation,
        threshold: HIGH_FLUCTUATION_THRESHOLD
      })
    }

    if (efficiency < LOW_EFFICIENCY_THRESHOLD && efficiency > 0) {
      anomalies.push({
        type: 'low_efficiency',
        level: efficiency < 20 ? 'danger' : 'warning',
        message: `效率过低（${efficiency.toFixed(1)}%）：能量浪费严重，建议优化参数配置`,
        value: efficiency,
        threshold: LOW_EFFICIENCY_THRESHOLD
      })
    }

    const maxPressure = Math.max(animationState.value.leftChamberPressure, animationState.value.rightChamberPressure)
    if (maxPressure > RISK_PRESSURE_ABNORMAL || maxPressure < 0.5) {
      anomalies.push({
        type: 'pressure_abnormal',
        level: maxPressure > 2 || maxPressure < 0.3 ? 'danger' : 'warning',
        message: maxPressure > RISK_PRESSURE_ABNORMAL
          ? `压力过高（${maxPressure.toFixed(2)}atm）：存在腔体过载风险`
          : `压力过低（${maxPressure.toFixed(2)}atm）：可能存在严重漏气`,
        value: maxPressure,
        threshold: RISK_PRESSURE_ABNORMAL
      })
    }

    return anomalies
  }

  const result = computed<SimulationResult>(() => {
    const baseFlow = theoreticalMaxFlow.value * valveFlowCoefficient.value

    const stuckFactor = params.value.valveStuck
      ? 1 - params.value.valveStuckLevel * 0.6
      : 1

    const preLeakFlow = baseFlow * stuckFactor * resistanceFactor.value * loadPressureFactor.value
    const actualFlow = preLeakFlow * leakageFactor.value
    const effectiveFlowRate = actualFlow

    const pressureLoss = params.value.environmentalResistance * params.value.loadPressure * 50
      + params.value.leakageRate * 2

    const fluctuation = (params.value.rodFrequency > 0)
      ? Math.min(100, (
          params.value.rodFrequency * 8 +
          params.value.environmentalResistance * 40 +
          params.value.loadPressure * 25 +
          params.value.leakageRate * 1.5
        ) * (1 + params.value.rodFrequency * 0.02))
      : 0

    let valveRisk = params.value.valveStuck
      ? 0.3 + params.value.valveStuckLevel * 0.7
      : Math.max(0, 0.1 - (effectiveValveArea.value / 100) * 0.05)

    valveRisk += params.value.rodFrequency > HIGH_FREQ_THRESHOLD
      ? (params.value.rodFrequency - HIGH_FREQ_THRESHOLD) * 0.05
      : 0
    valveRisk += params.value.leakageRate > 10 ? (params.value.leakageRate - 10) * 0.01 : 0
    valveRisk = Math.min(1, valveRisk)

    const isLeaking = actualFlow < theoreticalMaxFlow.value * LEAK_THRESHOLD
    const leakWarning = isLeaking
      ? '警告：送风量低于理论值的30%，可能存在漏气问题！'
      : ''

    const efficiency = theoreticalMaxFlow.value > 0
      ? (actualFlow / theoreticalMaxFlow.value) * 100
      : 0

    const riskScore = (
      valveRisk * 40 +
      (isLeaking ? 20 : params.value.leakageRate * 0.8) +
      Math.max(0, params.value.rodFrequency - HIGH_FREQ_THRESHOLD) * 3 +
      Math.max(0, LOW_EFFICIENCY_THRESHOLD - efficiency) * 0.5
    )
    const finalRiskScore = Math.min(100, riskScore)

    const anomalies = detectAnomalies(actualFlow, theoreticalMaxFlow.value, efficiency, fluctuation, valveRisk)

    return {
      airFlowRate: actualFlow,
      fluctuationAmplitude: fluctuation,
      valveRisk,
      isLeaking,
      leakWarning,
      efficiency,
      theoreticalMaxFlow: theoreticalMaxFlow.value,
      riskScore: finalRiskScore,
      anomalies,
      effectiveFlowRate,
      pressureLoss
    }
  })

  function computeStateAtTime(targetTime: number) {
    const omega = 2 * Math.PI * params.value.rodFrequency
    const stroke = params.value.pistonStroke / 2

    const leftPistonPos = Math.sin(omega * targetTime) * stroke
    const rightPistonPos = Math.sin(omega * targetTime + Math.PI) * stroke

    const leftVelocity = omega * stroke * Math.cos(omega * targetTime)
    const rightVelocity = omega * stroke * Math.cos(omega * targetTime + Math.PI)

    const loadPressureBase = params.value.loadPressure
    const pressureAmplitude = 0.3 * (1 + params.value.environmentalResistance * 0.3)
    let leftPressure = 1.0 - pressureAmplitude * Math.sin(omega * targetTime) + loadPressureBase * 0.5
    let rightPressure = 1.0 - pressureAmplitude * Math.sin(omega * targetTime + Math.PI) + loadPressureBase * 0.5

    leftPressure *= (1 - params.value.leakageRate / 200)
    rightPressure *= (1 - params.value.leakageRate / 200)

    let valveOpenLeft = leftVelocity < 0
    let valveOpenRight = rightVelocity < 0

    if (params.value.valveStuck) {
      const stuckChance = params.value.valveStuckLevel
      if (Math.abs(Math.sin(targetTime * 2)) < stuckChance) {
        valveOpenLeft = false
      }
      if (Math.abs(Math.cos(targetTime * 2)) < stuckChance) {
        valveOpenRight = false
      }
    }

    let airFlowDirection: 'left' | 'right' | 'none' = 'none'
    if (leftPressure > rightPressure) {
      airFlowDirection = 'right'
    } else if (rightPressure > leftPressure) {
      airFlowDirection = 'left'
    }

    return {
      time: targetTime,
      leftPistonPosition: leftPistonPos,
      rightPistonPosition: rightPistonPos,
      leftChamberPressure: leftPressure,
      rightChamberPressure: rightPressure,
      airFlowDirection,
      valveOpenLeft,
      valveOpenRight
    }
  }

  function generateFullHistory() {
    airFlowHistory.value = []
    pressureHistory.value = []
    efficiencyHistory.value = []
    riskHistory.value = []

    const currentTime = animationState.value.time
    const historyPoints = Math.min(150, MAX_HISTORY_POINTS)
    const totalDuration = 10
    const timeStep = totalDuration / historyPoints

    for (let i = historyPoints; i >= 1; i--) {
      const time = Math.max(0, currentTime - i * timeStep)
      const state = computeStateAtTime(time)

      const omega = 2 * Math.PI * params.value.rodFrequency
      const stroke = params.value.pistonStroke / 2
      const leftVelocity = omega * stroke * Math.cos(omega * time)
      const instantaneousFlow = Math.abs(leftVelocity) * pistonArea.value
        * valveFlowCoefficient.value * resistanceFactor.value
        * loadPressureFactor.value * leakageFactor.value

      const resFactor = resistanceFactor.value
      const loadFactor = loadPressureFactor.value
      const leakFactor = leakageFactor.value
      const stuckFactor = params.value.valveStuck
        ? 1 - params.value.valveStuckLevel * 0.6
        : 1
      const eff = (valveFlowCoefficient.value * resFactor * loadFactor * leakFactor * stuckFactor) * 100

      const valveRiskAtTime = computeInstantRisk(state, instantaneousFlow)

      airFlowHistory.value.push({ time, flowRate: instantaneousFlow })
      pressureHistory.value.push({
        time,
        leftPressure: state.leftChamberPressure,
        rightPressure: state.rightChamberPressure
      })
      efficiencyHistory.value.push({ time, efficiency: Math.min(100, eff) })
      riskHistory.value.push({ time, riskScore: Math.min(100, valveRiskAtTime) })
    }
  }

  function computeInstantRisk(state: AnimationState, flow: number): number {
    let risk = (result.value.valveRisk) * 40
    const maxP = Math.max(state.leftChamberPressure, state.rightChamberPressure)
    if (maxP > RISK_PRESSURE_ABNORMAL) risk += (maxP - RISK_PRESSURE_ABNORMAL) * 20
    if (params.value.rodFrequency > HIGH_FREQ_THRESHOLD) risk += (params.value.rodFrequency - HIGH_FREQ_THRESHOLD) * 5
    risk += params.value.leakageRate * 0.8
    if (flow < theoreticalMaxFlow.value * 0.3 && theoreticalMaxFlow.value > 0) risk += 15
    return Math.min(100, risk)
  }

  function updateAnimation(deltaTime: number) {
    if (!isPlaying.value || isSeeking.value) return

    const adjustedDelta = deltaTime * playbackSpeed.value
    const newTime = animationState.value.time + adjustedDelta
    animationState.value = computeStateAtTime(newTime)

    const omega = 2 * Math.PI * params.value.rodFrequency
    const stroke = params.value.pistonStroke / 2
    const leftVelocity = omega * stroke * Math.cos(omega * newTime)
    const instantaneousFlow = Math.abs(leftVelocity) * pistonArea.value
      * valveFlowCoefficient.value * resistanceFactor.value
      * loadPressureFactor.value * leakageFactor.value

    airFlowHistory.value.push({
      time: newTime,
      flowRate: instantaneousFlow
    })

    pressureHistory.value.push({
      time: newTime,
      leftPressure: animationState.value.leftChamberPressure,
      rightPressure: animationState.value.rightChamberPressure
    })

    efficiencyHistory.value.push({
      time: newTime,
      efficiency: result.value.efficiency
    })

    riskHistory.value.push({
      time: newTime,
      riskScore: result.value.riskScore
    })

    if (airFlowHistory.value.length > MAX_HISTORY_POINTS) airFlowHistory.value.shift()
    if (pressureHistory.value.length > MAX_HISTORY_POINTS) pressureHistory.value.shift()
    if (efficiencyHistory.value.length > MAX_HISTORY_POINTS) efficiencyHistory.value.shift()
    if (riskHistory.value.length > MAX_HISTORY_POINTS) riskHistory.value.shift()
  }

  function resetAnimation() {
    animationState.value = {
      time: 0,
      leftPistonPosition: 0,
      rightPistonPosition: 0,
      leftChamberPressure: 1,
      rightChamberPressure: 1,
      airFlowDirection: 'none',
      valveOpenLeft: false,
      valveOpenRight: false
    }
    airFlowHistory.value = []
    pressureHistory.value = []
    efficiencyHistory.value = []
    riskHistory.value = []
    generateFullHistory()
  }

  function seekToTime(targetTime: number) {
    isSeeking.value = true
    const clampedTime = Math.max(0, targetTime)
    animationState.value = computeStateAtTime(clampedTime)
    generateFullHistory()
  }

  function endSeek() {
    isSeeking.value = false
  }

  function updateParam<K extends keyof BellowsParams>(key: K, value: BellowsParams[K]) {
    if (typeof value === 'number' && key !== 'leakageRate' && key !== 'loadPressure' && key !== 'environmentalResistance' && value <= 0) {
      return
    }
    if (typeof value === 'number' && value < 0) {
      value = 0 as BellowsParams[K]
    }
    params.value[key] = value

    animationState.value = computeStateAtTime(animationState.value.time)
    generateFullHistory()
  }

  function saveScheme(name: string) {
    const scheme: Scheme = {
      id: `scheme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      params: deepClone(params.value),
      result: deepClone(result.value),
      timestamp: Date.now(),
      animationState: deepClone(animationState.value),
      isPlaying: isPlaying.value,
      airFlowHistory: deepClone(airFlowHistory.value),
      pressureHistory: deepClone(pressureHistory.value),
      efficiencyHistory: deepClone(efficiencyHistory.value),
      riskHistory: deepClone(riskHistory.value)
    }
    schemes.value.push(scheme)
    saveSchemesToStorage(schemes.value)
    return scheme.id
  }

  function deleteScheme(id: string) {
    const index = schemes.value.findIndex(s => s.id === id)
    if (index !== -1) {
      schemes.value.splice(index, 1)
    }
    const selectedIndex = selectedSchemeIds.value.indexOf(id)
    if (selectedIndex !== -1) {
      selectedSchemeIds.value.splice(selectedIndex, 1)
    }
    saveSchemesToStorage(schemes.value)
  }

  function loadScheme(id: string) {
    const scheme = schemes.value.find(s => s.id === id)
    if (scheme) {
      params.value = deepClone(scheme.params)
      animationState.value = deepClone(scheme.animationState)
      isPlaying.value = scheme.isPlaying
      airFlowHistory.value = deepClone(scheme.airFlowHistory)
      pressureHistory.value = deepClone(scheme.pressureHistory)
      efficiencyHistory.value = deepClone(scheme.efficiencyHistory || [])
      riskHistory.value = deepClone(scheme.riskHistory || [])

      animationState.value = computeStateAtTime(animationState.value.time)
      generateFullHistory()
    }
  }

  function toggleSchemeSelection(id: string) {
    const index = selectedSchemeIds.value.indexOf(id)
    if (index === -1) {
      if (selectedSchemeIds.value.length < 5) {
        selectedSchemeIds.value.push(id)
      }
    } else {
      selectedSchemeIds.value.splice(index, 1)
    }
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
  }

  function setPlaybackSpeed(speed: number) {
    playbackSpeed.value = Math.max(0.25, Math.min(4, speed))
  }

  const selectedSchemes = computed(() => {
    return schemes.value.filter(s => selectedSchemeIds.value.includes(s.id))
  })

  watch(() => [params.value.chamberWidth, params.value.chamberHeight, params.value.chamberDepth,
    params.value.rodFrequency, params.value.pistonStroke, params.value.valveOpeningArea,
    params.value.environmentalResistance, params.value.loadPressure, params.value.leakageRate],
    () => {
      animationState.value = computeStateAtTime(animationState.value.time)
      generateFullHistory()
    }, { deep: true }
  )

  generateFullHistory()

  return {
    params,
    animationState,
    schemes,
    selectedSchemeIds,
    isPlaying,
    isSeeking,
    playbackSpeed,
    airFlowHistory,
    pressureHistory,
    efficiencyHistory,
    riskHistory,
    effectiveValveArea,
    pistonArea,
    chamberVolume,
    theoreticalMaxFlow,
    valveFlowCoefficient,
    result,
    selectedSchemes,
    updateAnimation,
    resetAnimation,
    generateFullHistory,
    updateParam,
    saveScheme,
    deleteScheme,
    loadScheme,
    toggleSchemeSelection,
    togglePlay,
    seekToTime,
    endSeek,
    setPlaybackSpeed
  }
})
