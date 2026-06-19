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
  RiskDataPoint,
  LifespanEvaluation,
  ComponentLifespan,
  LifespanTrendPoint,
  MaintenanceAlert,
  MaintenanceSuggestion
} from '@/types'

const LEAK_THRESHOLD = 0.3
const MAX_HISTORY_POINTS = 300
const STORAGE_KEY = 'bellows_schemes_v2'
const HIGH_FREQ_THRESHOLD = 6
const HIGH_FLUCTUATION_THRESHOLD = 30
const LOW_EFFICIENCY_THRESHOLD = 40
const RISK_PRESSURE_ABNORMAL = 1.6

const BASE_VALVE_LIFESPAN = 8000
const BASE_SEAL_LIFESPAN = 12000
const BASE_PISTON_LIFESPAN = 15000
const WARNING_LIFESPAN_RATIO = 0.3
const DANGER_LIFESPAN_RATIO = 0.15
const LIFESPAN_TREND_POINTS = 20
const LIFESPAN_TREND_RANGE_HOURS = 10000

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

  const wearFactors = computed(() => {
    const freq = params.value.rodFrequency
    const frequencyFactor = 1 + Math.max(0, freq - 2) * 0.15 + Math.pow(Math.max(0, freq - 6), 2) * 0.08

    const valveStuckFactor = params.value.valveStuck
      ? 1 + params.value.valveStuckLevel * 3.5
      : 1

    const load = params.value.loadPressure
    const loadPressureFactor = 1 + load * 0.6 + Math.pow(load, 2) * 0.2

    const resistance = params.value.environmentalResistance
    const resistanceFactor = 1 + resistance * 0.8

    const leakage = params.value.leakageRate
    const leakageFactor = 1 + leakage * 0.08 + Math.pow(Math.max(0, leakage - 10), 2) * 0.005

    return {
      frequencyFactor,
      valveStuckFactor,
      loadPressureFactor,
      resistanceFactor,
      leakageFactor
    }
  })

  function computeLifespanFromParams(p: BellowsParams): LifespanEvaluation {
    const freq = p.rodFrequency
    const frequencyFactor = 1 + Math.max(0, freq - 2) * 0.15 + Math.pow(Math.max(0, freq - 6), 2) * 0.08
    const valveStuckFactor = p.valveStuck ? 1 + p.valveStuckLevel * 3.5 : 1
    const load = p.loadPressure
    const loadPressureFactor = 1 + load * 0.6 + Math.pow(load, 2) * 0.2
    const resistance = p.environmentalResistance
    const resistanceFactor = 1 + resistance * 0.8
    const leakage = p.leakageRate
    const leakageFactor = 1 + leakage * 0.08 + Math.pow(Math.max(0, leakage - 10), 2) * 0.005

    const wf = { frequencyFactor, valveStuckFactor, loadPressureFactor, resistanceFactor, leakageFactor }

    function computeComp(key: 'valve' | 'seal' | 'piston', name: string, baseLifespan: number): ComponentLifespan {
      let wearMultiplier = 1
      switch (key) {
        case 'valve': wearMultiplier = wf.frequencyFactor * wf.valveStuckFactor * (1 + wf.loadPressureFactor * 0.1); break
        case 'seal': wearMultiplier = wf.leakageFactor * wf.loadPressureFactor * (1 + wf.frequencyFactor * 0.15); break
        case 'piston': wearMultiplier = wf.frequencyFactor * wf.loadPressureFactor * wf.resistanceFactor * (1 + wf.leakageFactor * 0.1); break
      }
      const wearRate = (1 / baseLifespan) * wearMultiplier
      const remaining = baseLifespan / wearMultiplier
      const health = Math.max(0, Math.min(100, (remaining / baseLifespan) * 100))
      const threshold = baseLifespan * WARNING_LIFESPAN_RATIO
      let riskLevel: 'normal' | 'warning' | 'danger' = 'normal'
      if (remaining <= baseLifespan * DANGER_LIFESPAN_RATIO) riskLevel = 'danger'
      else if (remaining <= threshold) riskLevel = 'warning'
      return {
        componentName: name, componentKey: key, baseLifespanHours: baseLifespan,
        remainingLifespanHours: Math.round(remaining), wearRate: wearRate * 1000,
        healthScore: Math.round(health * 10) / 10, riskLevel, thresholdHours: Math.round(threshold)
      }
    }

    const components: ComponentLifespan[] = [
      computeComp('valve', '阀片组件', BASE_VALVE_LIFESPAN),
      computeComp('seal', '密封件', BASE_SEAL_LIFESPAN),
      computeComp('piston', '活塞组件', BASE_PISTON_LIFESPAN)
    ]

    const valve = components[0], seal = components[1], piston = components[2]
    const trendData: LifespanTrendPoint[] = []
    const stepHours = LIFESPAN_TREND_RANGE_HOURS / LIFESPAN_TREND_POINTS
    for (let i = 0; i <= LIFESPAN_TREND_POINTS; i++) {
      const oh = i * stepHours
      const vh = Math.max(0, 100 - (oh / valve.baseLifespanHours) * 100 * (100 / valve.healthScore))
      const sh = Math.max(0, 100 - (oh / seal.baseLifespanHours) * 100 * (100 / seal.healthScore))
      const ph = Math.max(0, 100 - (oh / piston.baseLifespanHours) * 100 * (100 / piston.healthScore))
      const ov = (vh * 0.4 + sh * 0.35 + ph * 0.25)
      trendData.push({
        operatingHours: Math.round(oh),
        valveHealth: Math.round(vh * 10) / 10, sealHealth: Math.round(sh * 10) / 10,
        pistonHealth: Math.round(ph * 10) / 10, overallHealth: Math.round(ov * 10) / 10
      })
    }

    const alerts: MaintenanceAlert[] = []
    components.forEach((comp) => {
      if (comp.riskLevel === 'danger') {
        alerts.push({
          id: `alert_${comp.componentKey}_danger`, componentKey: comp.componentKey,
          componentName: comp.componentName, level: 'danger',
          title: `${comp.componentName}紧急更换预警`,
          message: `剩余寿命仅约 ${comp.remainingLifespanHours} 小时，已低于安全阈值的15%。建议立即停机更换，避免运行故障。`,
          remainingHours: comp.remainingLifespanHours, recommendedAction: '立即停机更换'
        })
      } else if (comp.riskLevel === 'warning') {
        alerts.push({
          id: `alert_${comp.componentKey}_warning`, componentKey: comp.componentKey,
          componentName: comp.componentName, level: 'warning',
          title: `${comp.componentName}维护提醒`,
          message: `剩余寿命约 ${comp.remainingLifespanHours} 小时，已进入预警区间。请安排近期维护计划。`,
          remainingHours: comp.remainingLifespanHours, recommendedAction: '近期安排维护更换'
        })
      } else if (comp.healthScore < 80) {
        alerts.push({
          id: `alert_${comp.componentKey}_info`, componentKey: comp.componentKey,
          componentName: comp.componentName, level: 'info',
          title: `${comp.componentName}状态关注`,
          message: `剩余寿命约 ${comp.remainingLifespanHours} 小时，状态良好，建议继续定期检查。`,
          remainingHours: comp.remainingLifespanHours, recommendedAction: '定期检查维护'
        })
      }
    })
    alerts.sort((a, b) => {
      const order: Record<string, number> = { danger: 0, warning: 1, info: 2 }
      return order[a.level] - order[b.level] || a.remainingHours - b.remainingHours
    })

    const suggestions: MaintenanceSuggestion[] = []
    components.forEach((comp) => {
      let urgency: 'low' | 'medium' | 'high' | 'critical', action: string, schedule: string, cost: string
      switch (comp.riskLevel) {
        case 'danger':
          urgency = 'critical'
          action = `立即更换${comp.componentName}组件`
          schedule = '立即执行'
          cost = comp.componentKey === 'piston' ? '¥800-1500' : comp.componentKey === 'seal' ? '¥200-500' : '¥300-600'
          break
        case 'warning':
          urgency = 'high'
          action = `安排更换${comp.componentName}组件`
          schedule = `未来 ${Math.round(comp.remainingLifespanHours / 24 / 7)} 周内`
          cost = comp.componentKey === 'piston' ? '¥800-1500' : comp.componentKey === 'seal' ? '¥200-500' : '¥300-600'
          break
        default:
          if (comp.healthScore < 60) {
            urgency = 'medium'
            action = `制定${comp.componentName}预防性维护计划`
            schedule = `未来 ${Math.round(comp.remainingLifespanHours / 24 / 30)} 个月内`
            cost = comp.componentKey === 'piston' ? '¥500-1000' : comp.componentKey === 'seal' ? '¥150-300' : '¥200-400'
          } else {
            urgency = 'low'
            action = `${comp.componentName}例行检查与清洁`
            schedule = '下次常规维护时'
            cost = comp.componentKey === 'piston' ? '¥100-300' : comp.componentKey === 'seal' ? '¥50-150' : '¥80-200'
          }
      }
      let reason = `当前磨损速率：${comp.wearRate.toFixed(4)}‰/h`
      if (comp.componentKey === 'valve') {
        if (wf.valveStuckFactor > 1.5) reason += '，阀片卡滞加速磨损'
        if (wf.frequencyFactor > 1.5) reason += '，高频运行加剧疲劳'
      } else if (comp.componentKey === 'seal') {
        if (wf.leakageFactor > 1.5) reason += '，漏气现象加速密封老化'
        if (wf.loadPressureFactor > 1.5) reason += '，高负载压力造成挤压变形'
      } else {
        if (wf.frequencyFactor > 1.5) reason += '，高频往复加剧摩擦损耗'
        if (wf.loadPressureFactor > 1.5) reason += '，高压环境加速活塞环磨损'
      }
      suggestions.push({ component: comp.componentName, urgency, action, schedule, estimatedCost: cost, reason })
    })
    const urgencyOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    const overallHealthScore = Math.round((components[0].healthScore * 0.4 + components[1].healthScore * 0.35 + components[2].healthScore * 0.25) * 10) / 10
    const estimatedMaintenanceCycleHours = Math.round(Math.min(...components.map(c => c.remainingLifespanHours)) * 0.85)
    const hasHighRisk = components.some(c => c.riskLevel === 'danger')
    const highRiskComponents = components.filter(c => c.riskLevel === 'danger').map(c => c.componentName)
    const hasWarning = components.some(c => c.riskLevel === 'warning')
    const warningComponents = components.filter(c => c.riskLevel === 'warning').map(c => c.componentName)

    return {
      components, trendData, maintenanceAlerts: alerts, suggestions,
      overallHealthScore, estimatedMaintenanceCycleHours,
      hasHighRisk, highRiskComponents, hasWarning, warningComponents,
      wearFactors: wf
    }
  }

  const lifespanEvaluation = computed<LifespanEvaluation>(() => {
    return computeLifespanFromParams(params.value)
  })

  function ensureSchemeLifespan(scheme: Scheme): LifespanEvaluation {
    if (scheme.lifespanEvaluation) return scheme.lifespanEvaluation
    const computed = computeLifespanFromParams(scheme.params)
    scheme.lifespanEvaluation = computed
    return computed
  }

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
      playbackSpeed: playbackSpeed.value,
      airFlowHistory: deepClone(airFlowHistory.value),
      pressureHistory: deepClone(pressureHistory.value),
      efficiencyHistory: deepClone(efficiencyHistory.value),
      riskHistory: deepClone(riskHistory.value),
      lifespanEvaluation: deepClone(lifespanEvaluation.value)
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
      playbackSpeed.value = scheme.playbackSpeed ?? 1
      airFlowHistory.value = deepClone(scheme.airFlowHistory || [])
      pressureHistory.value = deepClone(scheme.pressureHistory || [])
      efficiencyHistory.value = deepClone(scheme.efficiencyHistory || [])
      riskHistory.value = deepClone(scheme.riskHistory || [])

      animationState.value = computeStateAtTime(animationState.value.time)

      if (airFlowHistory.value.length === 0) {
        generateFullHistory()
      }
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
    const list = schemes.value.filter(s => selectedSchemeIds.value.includes(s.id))
    list.forEach(s => ensureSchemeLifespan(s))
    return list
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
    lifespanEvaluation,
    wearFactors,
    selectedSchemes,
    computeLifespanFromParams,
    ensureSchemeLifespan,
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
