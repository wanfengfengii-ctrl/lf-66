import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BellowsParams,
  SimulationResult,
  AnimationState,
  Scheme,
  AirFlowDataPoint,
  PressureDataPoint
} from '@/types'

const LEAK_THRESHOLD = 0.3
const MAX_HISTORY_POINTS = 200
const STORAGE_KEY = 'bellows_schemes'

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

export const useBellowsStore = defineStore('bellows', () => {
  const params = ref<BellowsParams>({
    chamberWidth: 100,
    chamberHeight: 80,
    chamberDepth: 60,
    rodFrequency: 2,
    valveOpeningArea: 20,
    valveStuck: false,
    valveStuckLevel: 0.5,
    pistonStroke: 40
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
  const airFlowHistory = ref<AirFlowDataPoint[]>([])
  const pressureHistory = ref<PressureDataPoint[]>([])

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
    return 0.2 + 0.8 * ratio
  })

  const result = computed<SimulationResult>(() => {
    const baseFlow = theoreticalMaxFlow.value * valveFlowCoefficient.value

    const stuckFactor = params.value.valveStuck
      ? 1 - params.value.valveStuckLevel * 0.6
      : 1

    const actualFlow = baseFlow * stuckFactor

    const fluctuation = (params.value.rodFrequency > 0)
      ? (actualFlow * 0.3) / (params.value.rodFrequency * 0.5 + 0.5)
      : 0

    const valveRisk = params.value.valveStuck
      ? 0.3 + params.value.valveStuckLevel * 0.7
      : Math.max(0, 0.1 - (effectiveValveArea.value / 100) * 0.05)

    const isLeaking = actualFlow < theoreticalMaxFlow.value * LEAK_THRESHOLD
    const leakWarning = isLeaking
      ? '警告：送风量低于理论值的30%，可能存在漏气问题！'
      : ''

    const efficiency = theoreticalMaxFlow.value > 0
      ? (actualFlow / theoreticalMaxFlow.value) * 100
      : 0

    return {
      airFlowRate: actualFlow,
      fluctuationAmplitude: fluctuation,
      valveRisk,
      isLeaking,
      leakWarning,
      efficiency,
      theoreticalMaxFlow: theoreticalMaxFlow.value
    }
  })

  function generateHistoryData() {
    const state = animationState.value
    const omega = 2 * Math.PI * params.value.rodFrequency
    const stroke = params.value.pistonStroke / 2

    airFlowHistory.value = []
    pressureHistory.value = []

    const historyPoints = Math.min(100, MAX_HISTORY_POINTS)
    const timeStep = 0.05

    for (let i = historyPoints; i >= 1; i--) {
      const time = state.time - i * timeStep
      if (time < 0) continue

      const leftVelocity = omega * stroke * Math.cos(omega * time)
      const leftPressure = 1.0 - 0.3 * Math.sin(omega * time)
      const rightPressure = 1.0 - 0.3 * Math.sin(omega * time + Math.PI)
      const instantaneousFlow = Math.abs(leftVelocity) * pistonArea.value * valveFlowCoefficient.value

      airFlowHistory.value.push({
        time,
        flowRate: instantaneousFlow
      })

      pressureHistory.value.push({
        time,
        leftPressure,
        rightPressure
      })
    }
  }

  function updateAnimation(deltaTime: number) {
    if (!isPlaying.value) return

    const state = animationState.value
    state.time += deltaTime

    const omega = 2 * Math.PI * params.value.rodFrequency
    const stroke = params.value.pistonStroke / 2

    state.leftPistonPosition = Math.sin(omega * state.time) * stroke
    state.rightPistonPosition = Math.sin(omega * state.time + Math.PI) * stroke

    const leftVelocity = omega * stroke * Math.cos(omega * state.time)
    const rightVelocity = omega * stroke * Math.cos(omega * state.time + Math.PI)

    const basePressure = 1.0
    const pressureAmplitude = 0.3
    state.leftChamberPressure = basePressure - pressureAmplitude * Math.sin(omega * state.time)
    state.rightChamberPressure = basePressure - pressureAmplitude * Math.sin(omega * state.time + Math.PI)

    state.valveOpenLeft = leftVelocity < 0
    state.valveOpenRight = rightVelocity < 0

    if (state.leftChamberPressure > state.rightChamberPressure) {
      state.airFlowDirection = 'right'
    } else if (state.rightChamberPressure > state.leftChamberPressure) {
      state.airFlowDirection = 'left'
    } else {
      state.airFlowDirection = 'none'
    }

    const instantaneousFlow = Math.abs(leftVelocity) * pistonArea.value * valveFlowCoefficient.value
    airFlowHistory.value.push({
      time: state.time,
      flowRate: instantaneousFlow
    })

    pressureHistory.value.push({
      time: state.time,
      leftPressure: state.leftChamberPressure,
      rightPressure: state.rightChamberPressure
    })

    if (airFlowHistory.value.length > MAX_HISTORY_POINTS) {
      airFlowHistory.value.shift()
    }
    if (pressureHistory.value.length > MAX_HISTORY_POINTS) {
      pressureHistory.value.shift()
    }
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
  }

  function updateParam<K extends keyof BellowsParams>(key: K, value: BellowsParams[K]) {
    if (typeof value === 'number' && value <= 0) {
      return
    }
    params.value[key] = value

    const omega = 2 * Math.PI * params.value.rodFrequency
    const stroke = params.value.pistonStroke / 2
    const state = animationState.value

    state.leftPistonPosition = Math.sin(omega * state.time) * stroke
    state.rightPistonPosition = Math.sin(omega * state.time + Math.PI) * stroke

    const leftVelocity = omega * stroke * Math.cos(omega * state.time)
    const rightVelocity = omega * stroke * Math.cos(omega * state.time + Math.PI)

    state.leftChamberPressure = 1.0 - 0.3 * Math.sin(omega * state.time)
    state.rightChamberPressure = 1.0 - 0.3 * Math.sin(omega * state.time + Math.PI)

    state.valveOpenLeft = leftVelocity < 0
    state.valveOpenRight = rightVelocity < 0

    if (state.leftChamberPressure > state.rightChamberPressure) {
      state.airFlowDirection = 'right'
    } else if (state.rightChamberPressure > state.leftChamberPressure) {
      state.airFlowDirection = 'left'
    } else {
      state.airFlowDirection = 'none'
    }

    generateHistoryData()
  }

  function saveScheme(name: string) {
    const scheme: Scheme = {
      id: `scheme_${Date.now()}`,
      name,
      params: { ...params.value },
      result: { ...result.value },
      timestamp: Date.now(),
      animationState: { ...animationState.value }
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
      params.value = { ...scheme.params }
      animationState.value = { ...scheme.animationState }

      const omega = 2 * Math.PI * params.value.rodFrequency
      const stroke = params.value.pistonStroke / 2
      const state = animationState.value

      state.leftPistonPosition = Math.sin(omega * state.time) * stroke
      state.rightPistonPosition = Math.sin(omega * state.time + Math.PI) * stroke

      const leftVelocity = omega * stroke * Math.cos(omega * state.time)
      const rightVelocity = omega * stroke * Math.cos(omega * state.time + Math.PI)

      state.leftChamberPressure = 1.0 - 0.3 * Math.sin(omega * state.time)
      state.rightChamberPressure = 1.0 - 0.3 * Math.sin(omega * state.time + Math.PI)

      state.valveOpenLeft = leftVelocity < 0
      state.valveOpenRight = rightVelocity < 0

      generateHistoryData()
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

  const selectedSchemes = computed(() => {
    return schemes.value.filter(s => selectedSchemeIds.value.includes(s.id))
  })

  return {
    params,
    animationState,
    schemes,
    selectedSchemeIds,
    isPlaying,
    airFlowHistory,
    pressureHistory,
    effectiveValveArea,
    pistonArea,
    chamberVolume,
    theoreticalMaxFlow,
    valveFlowCoefficient,
    result,
    selectedSchemes,
    updateAnimation,
    resetAnimation,
    generateHistoryData,
    updateParam,
    saveScheme,
    deleteScheme,
    loadScheme,
    toggleSchemeSelection,
    togglePlay
  }
})
