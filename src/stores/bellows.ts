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
  MaintenanceSuggestion,
  MaintenanceRecord,
  MaintenanceType,
  MaintenanceComponent,
  MaintenanceCostStats,
  MaintenanceCostTrendPoint,
  ComponentReplacementHistory,
  MaintenanceCycleDeviationPoint,
  MaintenanceCycleAnalysis,
  CalendarEvent,
  SchemeMaintenanceComparison,
  EnergyCostParams,
  EnergyConsumption,
  OperationCost,
  EnergyEfficiencyAnalysis,
  EnergyAnomalyInfo,
  EnergySavingSuggestion,
  EnergyHistoryPoint,
  EnergyEvaluation,
  SchemeEnergyComparison
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

const HIGH_FREQ_ENERGY_THRESHOLD = 6
const HIGH_RESISTANCE_ENERGY_THRESHOLD = 0.5
const HIGH_LEAKAGE_ENERGY_THRESHOLD = 10
const HIGH_LOAD_ENERGY_THRESHOLD = 1.0
const POOR_MAINTENANCE_HEALTH_THRESHOLD = 60

const BASE_POWER_COEFFICIENT = 0.0015
const FREQUENCY_POWER_EXPONENT = 1.3
const LOAD_POWER_COEFFICIENT = 0.8
const RESISTANCE_POWER_COEFFICIENT = 0.6
const ENERGY_HISTORY_POINTS = 100

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  inspection: '例行检查',
  valve_replacement: '更换阀片',
  seal_replacement: '更换密封件',
  piston_replacement: '更换活塞组件',
  other: '其他维护'
}

const COMPONENT_NAMES: Record<MaintenanceComponent, string> = {
  valve: '阀片组件',
  seal: '密封件',
  piston: '活塞组件',
  system: '系统整体'
}

const LIFESPAN_RESTORE_RATIO: Record<MaintenanceType, number> = {
  inspection: 0.05,
  valve_replacement: 0.95,
  seal_replacement: 0.9,
  piston_replacement: 0.92,
  other: 0.1
}

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

  const maintenanceRecords = ref<MaintenanceRecord[]>([])
  const componentAdjustedLifespans = ref<Record<string, number>>({})
  const lastMaintenanceTimestamp = ref<number>(0)

  const energyCostParams = ref<EnergyCostParams>({
    electricityPrice: 1.2,
    maintenanceCostPerHour: 50,
    dailyOperatingHours: 8,
    monthlyOperatingDays: 22,
    systemEfficiency: 85
  })

  const energyHistory = ref<EnergyHistoryPoint[]>([])

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

  function computeLifespanFromParams(p: BellowsParams, adjustedLifespans?: Record<string, number>): LifespanEvaluation {
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
      let remaining = baseLifespan / wearMultiplier
      
      if (adjustedLifespans && adjustedLifespans[key] !== undefined) {
        remaining = adjustedLifespans[key]
      }
      
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
    return computeLifespanFromParams(params.value, componentAdjustedLifespans.value)
  })

  const sortedMaintenanceRecords = computed(() => {
    return [...maintenanceRecords.value].sort((a, b) => b.maintenanceDate - a.maintenanceDate)
  })

  const maintenanceCostStats = computed<MaintenanceCostStats>(() => {
    const records = maintenanceRecords.value
    let totalCost = 0
    let inspectionCount = 0, inspectionCost = 0
    let valveCount = 0, valveCost = 0
    let sealCount = 0, sealCost = 0
    let pistonCount = 0, pistonCost = 0

    records.forEach(r => {
      totalCost += r.cost
      switch (r.maintenanceType) {
        case 'inspection':
          inspectionCount++
          inspectionCost += r.cost
          break
        case 'valve_replacement':
          valveCount++
          valveCost += r.cost
          break
        case 'seal_replacement':
          sealCount++
          sealCost += r.cost
          break
        case 'piston_replacement':
          pistonCount++
          pistonCost += r.cost
          break
      }
    })

    const costTrend = computeCostTrend(records)
    const months = Math.max(1, computeMonthsSpan(records))
    const avgMonthlyCost = totalCost / months

    return {
      totalMaintenanceCost: totalCost,
      inspectionCount,
      inspectionCost,
      valveReplacementCount: valveCount,
      valveReplacementCost: valveCost,
      sealReplacementCount: sealCount,
      sealReplacementCost: sealCost,
      pistonReplacementCount: pistonCount,
      pistonReplacementCost: pistonCost,
      avgMonthlyCost,
      costTrend
    }
  })

  const maintenanceCycleAnalysis = computed<MaintenanceCycleAnalysis>(() => {
    return computeMaintenanceCycleAnalysis(maintenanceRecords.value, lifespanEvaluation.value)
  })

  const calendarEvents = computed<CalendarEvent[]>(() => {
    return generateCalendarEvents(maintenanceRecords.value, lifespanEvaluation.value)
  })

  const schemesMaintenanceComparison = computed<SchemeMaintenanceComparison[]>(() => {
    return computeSchemesMaintenanceComparison(schemes.value)
  })

  function ensureSchemeLifespan(scheme: Scheme): LifespanEvaluation {
    if (scheme.lifespanEvaluation) return scheme.lifespanEvaluation
    const computed = computeLifespanFromParams(scheme.params)
    scheme.lifespanEvaluation = computed
    return computed
  }

  function computeMonthsSpan(records: MaintenanceRecord[]): number {
    if (records.length === 0) return 1
    const dates = records.map(r => r.maintenanceDate)
    const min = Math.min(...dates)
    const max = Math.max(...dates, Date.now())
    return Math.max(1, (max - min) / (1000 * 60 * 60 * 24 * 30))
  }

  function computeCostTrend(records: MaintenanceRecord[]): MaintenanceCostTrendPoint[] {
    if (records.length === 0) return []
    
    const sorted = [...records].sort((a, b) => a.maintenanceDate - b.maintenanceDate)
    const monthMap = new Map<string, MaintenanceCostTrendPoint>()
    
    sorted.forEach(r => {
      const date = new Date(r.maintenanceDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          date: key,
          timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          totalCost: 0,
          inspectionCost: 0,
          valveCost: 0,
          sealCost: 0,
          pistonCost: 0
        })
      }
      
      const point = monthMap.get(key)!
      point.totalCost += r.cost
      switch (r.maintenanceType) {
        case 'inspection': point.inspectionCost += r.cost; break
        case 'valve_replacement': point.valveCost += r.cost; break
        case 'seal_replacement': point.sealCost += r.cost; break
        case 'piston_replacement': point.pistonCost += r.cost; break
      }
    })
    
    return Array.from(monthMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  }

  function computeMaintenanceCycleAnalysis(
    records: MaintenanceRecord[],
    lifespan: LifespanEvaluation
  ): MaintenanceCycleAnalysis {
    const componentReplacements: ComponentReplacementHistory[] = []
    const cycleDeviations: MaintenanceCycleDeviationPoint[] = []
    
    const components: Array<{ key: MaintenanceComponent; name: string; baseLifespan: number }> = [
      { key: 'valve', name: '阀片组件', baseLifespan: BASE_VALVE_LIFESPAN },
      { key: 'seal', name: '密封件', baseLifespan: BASE_SEAL_LIFESPAN },
      { key: 'piston', name: '活塞组件', baseLifespan: BASE_PISTON_LIFESPAN }
    ]
    
    components.forEach(comp => {
      const typeMap: Record<string, MaintenanceType> = {
        valve: 'valve_replacement',
        seal: 'seal_replacement',
        piston: 'piston_replacement'
      }
      
      const compRecords = records
        .filter(r => r.maintenanceType === typeMap[comp.key])
        .sort((a, b) => a.maintenanceDate - b.maintenanceDate)
      
      if (compRecords.length > 0) {
        const totalCost = compRecords.reduce((sum, r) => sum + r.cost, 0)
        const firstDate = compRecords[0].maintenanceDate
        const lastDate = compRecords[compRecords.length - 1].maintenanceDate
        
        let avgIntervalHours = 0
        if (compRecords.length > 1) {
          const intervals: number[] = []
          for (let i = 1; i < compRecords.length; i++) {
            intervals.push((compRecords[i].maintenanceDate - compRecords[i - 1].maintenanceDate) / (1000 * 60 * 60))
          }
          avgIntervalHours = intervals.reduce((a, b) => a + b, 0) / intervals.length
        }
        
        componentReplacements.push({
          component: comp.key,
          componentName: comp.name,
          replacementCount: compRecords.length,
          totalCost,
          avgCost: totalCost / compRecords.length,
          firstReplacementDate: firstDate,
          lastReplacementDate: lastDate,
          avgIntervalHours: Math.round(avgIntervalHours)
        })
        
        const compLifespan = lifespan.components.find(c => c.componentKey === comp.key)
        if (compLifespan && avgIntervalHours > 0) {
          const expectedCycle = compLifespan.baseLifespanHours
          const actualCycle = avgIntervalHours
          const deviation = actualCycle - expectedCycle
          const deviationPercent = (deviation / expectedCycle) * 100
          
          cycleDeviations.push({
            component: comp.key,
            componentName: comp.name,
            expectedCycleHours: expectedCycle,
            actualCycleHours: Math.round(actualCycle),
            deviationHours: Math.round(deviation),
            deviationPercent: Math.round(deviationPercent * 10) / 10
          })
        }
      }
    })
    
    const totalMaintenanceCount = records.length
    const monthsSpan = computeMonthsSpan(records)
    const avgMaintenanceFrequency = totalMaintenanceCount / Math.max(1, monthsSpan)
    
    return {
      componentReplacements,
      cycleDeviations,
      avgMaintenanceFrequency: Math.round(avgMaintenanceFrequency * 10) / 10
    }
  }

  function generateCalendarEvents(
    records: MaintenanceRecord[],
    lifespan: LifespanEvaluation
  ): CalendarEvent[] {
    const events: CalendarEvent[] = []
    
    records.forEach(r => {
      events.push({
        id: `hist_${r.id}`,
        title: MAINTENANCE_TYPE_LABELS[r.maintenanceType],
        date: r.maintenanceDate,
        type: 'maintenance',
        component: r.component,
        componentName: COMPONENT_NAMES[r.component],
        description: r.description,
        isCompleted: true,
        priority: r.maintenanceType === 'inspection' ? 'low' : 'medium'
      })
    })
    
    lifespan.components.forEach(comp => {
      const remainingHours = comp.remainingLifespanHours
      const maintenanceDate = Date.now() + remainingHours * 60 * 60 * 1000
      const weeksRemaining = remainingHours / (24 * 7)
      
      let priority: CalendarEvent['priority'] = 'low'
      if (comp.riskLevel === 'danger') priority = 'critical'
      else if (comp.riskLevel === 'warning') priority = 'high'
      else if (weeksRemaining < 8) priority = 'medium'
      
      events.push({
        id: `sched_${comp.componentKey}`,
        title: `建议更换${comp.componentName}`,
        date: maintenanceDate,
        type: 'scheduled',
        component: comp.componentKey,
        componentName: comp.componentName,
        description: `预计剩余寿命 ${Math.round(remainingHours)} 小时，建议安排维护更换`,
        isCompleted: false,
        priority
      })
    })
    
    lifespan.maintenanceAlerts.forEach(alert => {
      if (alert.level === 'danger' || alert.level === 'warning') {
        events.push({
          id: `alert_${alert.id}`,
          title: alert.title,
          date: Date.now(),
          type: 'alert',
          component: alert.componentKey,
          componentName: alert.componentName,
          description: alert.message,
          isCompleted: false,
          priority: alert.level === 'danger' ? 'critical' : 'high'
        })
      }
    })
    
    return events.sort((a, b) => a.date - b.date)
  }

  function computeSchemesMaintenanceComparison(schemes: Scheme[]): SchemeMaintenanceComparison[] {
    return schemes.map(scheme => {
      const records = scheme.maintenanceRecords || []
      const lifespan = scheme.lifespanEvaluation || computeLifespanFromParams(scheme.params)
      const costStats = scheme.maintenanceCostStats || computeMaintenanceCostStatsForRecords(records)
      
      const totalCost = costStats.totalMaintenanceCost
      const maintenanceCount = records.length
      const monthsSpan = computeMonthsSpan(records)
      const totalCostPerYear = (totalCost / Math.max(1, monthsSpan)) * 12
      
      const lifespanRestoredValues = records.map(r => r.lifespanRestored).filter(v => v > 0)
      const avgLifespanRestored = lifespanRestoredValues.length > 0
        ? lifespanRestoredValues.reduce((a, b) => a + b, 0) / lifespanRestoredValues.length
        : 0
      
      const healthImprovements = records
        .map(r => r.healthScoreAfter - r.healthScoreBefore)
        .filter(v => v > 0)
      const avgHealthImprovement = healthImprovements.length > 0
        ? healthImprovements.reduce((a, b) => a + b, 0) / healthImprovements.length
        : 0
      
      return {
        schemeId: scheme.id,
        schemeName: scheme.name,
        totalMaintenanceCost: totalCost,
        maintenanceCount,
        avgLifespanRestored: Math.round(avgLifespanRestored),
        avgHealthImprovement: Math.round(avgHealthImprovement * 10) / 10,
        maintenanceFrequency: Math.round((maintenanceCount / Math.max(1, monthsSpan)) * 10) / 10,
        valveLifespanHours: lifespan.components[0].remainingLifespanHours,
        sealLifespanHours: lifespan.components[1].remainingLifespanHours,
        pistonLifespanHours: lifespan.components[2].remainingLifespanHours,
        overallHealthScore: lifespan.overallHealthScore,
        totalCostPerYear: Math.round(totalCostPerYear)
      }
    })
  }

  function computeEnergyConsumption(p: BellowsParams): EnergyConsumption {
    const frequency = p.rodFrequency
    const load = p.loadPressure
    const resistance = p.environmentalResistance
    const leakage = p.leakageRate
    const stroke = p.pistonStroke
    const pistonArea = p.chamberWidth * p.chamberDepth

    const basePower = BASE_POWER_COEFFICIENT * pistonArea * stroke
    const frequencyPower = Math.pow(Math.max(0.1, frequency), FREQUENCY_POWER_EXPONENT)
    const loadPower = 1 + load * LOAD_POWER_COEFFICIENT
    const resistancePower = 1 + resistance * RESISTANCE_POWER_COEFFICIENT
    const leakagePower = 1 + (leakage / 100) * 0.5

    const powerPerSecond = basePower * frequencyPower * loadPower * resistancePower * leakagePower
    const powerPerHour = powerPerSecond * 3600 / 1000
    const dailyEnergy = powerPerHour * energyCostParams.value.dailyOperatingHours
    const monthlyEnergy = dailyEnergy * energyCostParams.value.monthlyOperatingDays
    const yearlyEnergy = monthlyEnergy * 12

    return {
      powerPerSecond,
      powerPerHour,
      dailyEnergy,
      monthlyEnergy,
      yearlyEnergy
    }
  }

  function computeOperationCost(energy: EnergyConsumption, p: BellowsParams, efficiency: number): OperationCost {
    const cp = energyCostParams.value
    const systemEfficiencyFactor = cp.systemEfficiency / 100

    const energyCostPerHour = energy.powerPerHour * cp.electricityPrice / systemEfficiencyFactor
    const maintenanceCostPerHour = cp.maintenanceCostPerHour * (1 + (p.leakageRate / 100) * 0.3)
    const efficiencyLossRate = Math.max(0, (100 - efficiency) / 100)
    const efficiencyLossCostPerHour = energyCostPerHour * efficiencyLossRate * 0.5

    const costPerHour = energyCostPerHour + maintenanceCostPerHour + efficiencyLossCostPerHour
    const costPerSecond = costPerHour / 3600
    const costPerCycle = costPerHour / Math.max(1, p.rodFrequency * 3600) * 1000

    const dailyOperatingHours = cp.dailyOperatingHours
    const monthlyOperatingDays = cp.monthlyOperatingDays

    const dailyEnergyCost = energy.dailyEnergy * cp.electricityPrice / systemEfficiencyFactor
    const dailyMaintenanceCost = maintenanceCostPerHour * dailyOperatingHours
    const dailyEfficiencyLossCost = efficiencyLossCostPerHour * dailyOperatingHours
    const dailyCost = dailyEnergyCost + dailyMaintenanceCost + dailyEfficiencyLossCost

    const monthlyCost = dailyCost * monthlyOperatingDays
    const yearlyCost = monthlyCost * 12

    return {
      costPerSecond,
      costPerHour,
      costPerCycle,
      dailyCost,
      monthlyCost,
      yearlyCost,
      breakdown: {
        energyCost: dailyEnergyCost * monthlyOperatingDays * 12,
        maintenanceCost: dailyMaintenanceCost * monthlyOperatingDays * 12,
        efficiencyLossCost: dailyEfficiencyLossCost * monthlyOperatingDays * 12,
        totalCost: yearlyCost
      }
    }
  }

  function computeEfficiencyAnalysis(energy: EnergyConsumption, p: BellowsParams, currentEfficiency: number): EnergyEfficiencyAnalysis {
    const cp = energyCostParams.value
    const systemEfficiencyFactor = cp.systemEfficiency / 100

    const theoreticalEnergy = energy.powerPerHour / systemEfficiencyFactor
    const actualEnergy = energy.powerPerHour / (currentEfficiency / 100) / systemEfficiencyFactor
    const efficiencyLossRate = Math.max(0, 100 - currentEfficiency)
    const efficiencyLossCostPerHour = (actualEnergy - theoreticalEnergy) * cp.electricityPrice * 0.5

    const optimalFrequency = Math.min(p.rodFrequency, 4)
    const optimalLeakage = Math.min(p.leakageRate, 2)
    const optimalResistance = Math.min(p.environmentalResistance, 0.2)
    const optimalLoad = Math.min(p.loadPressure, 0.5)

    const freqRatio = optimalFrequency / Math.max(0.1, p.rodFrequency)
    const leakRatio = (100 - optimalLeakage) / Math.max(1, 100 - p.leakageRate)
    const resistRatio = (1 - optimalResistance * 0.5) / Math.max(0.1, 1 - p.environmentalResistance * 0.5)
    const loadRatio = (1 - optimalLoad * 0.4) / Math.max(0.1, 1 - p.loadPressure * 0.4)

    const savingPotentialPercent = Math.min(80, Math.max(0, (1 - freqRatio * leakRatio * resistRatio * loadRatio) * 100))

    return {
      theoreticalEnergy,
      actualEnergy,
      efficiencyLossRate,
      efficiencyLossCostPerHour,
      energySavingPotential: savingPotentialPercent
    }
  }

  function detectEnergyAnomalies(
    p: BellowsParams,
    energy: EnergyConsumption,
    _efficiency: number,
    lifespan: LifespanEvaluation
  ): EnergyAnomalyInfo[] {
    const anomalies: EnergyAnomalyInfo[] = []
    const cp = energyCostParams.value

    if (p.rodFrequency > HIGH_FREQ_ENERGY_THRESHOLD) {
      const extraCostPerYear = (energy.powerPerHour * (Math.pow(p.rodFrequency, 1.3) - Math.pow(HIGH_FREQ_ENERGY_THRESHOLD, 1.3)) *
        cp.electricityPrice * cp.dailyOperatingHours * cp.monthlyOperatingDays * 12) / 100
      anomalies.push({
        type: 'high_frequency',
        level: p.rodFrequency >= 8 ? 'danger' : 'warning',
        message: `高频运行（${p.rodFrequency.toFixed(1)}Hz）：能耗随频率呈指数增长，预计年额外成本约 ¥${extraCostPerYear.toFixed(0)}`,
        value: p.rodFrequency,
        threshold: HIGH_FREQ_ENERGY_THRESHOLD,
        costImpact: extraCostPerYear
      })
    }

    if (p.environmentalResistance > HIGH_RESISTANCE_ENERGY_THRESHOLD) {
      const extraCostPerYear = (energy.powerPerHour * (p.environmentalResistance - HIGH_RESISTANCE_ENERGY_THRESHOLD) * 0.6 *
        cp.electricityPrice * cp.dailyOperatingHours * cp.monthlyOperatingDays * 12) / 100
      anomalies.push({
        type: 'high_resistance',
        level: p.environmentalResistance >= 1.0 ? 'danger' : 'warning',
        message: `高环境阻力（${(p.environmentalResistance * 100).toFixed(0)}%）：管道阻力增加能耗，预计年额外成本约 ¥${extraCostPerYear.toFixed(0)}`,
        value: p.environmentalResistance,
        threshold: HIGH_RESISTANCE_ENERGY_THRESHOLD,
        costImpact: extraCostPerYear
      })
    }

    if (p.leakageRate > HIGH_LEAKAGE_ENERGY_THRESHOLD) {
      const extraCostPerYear = (energy.powerPerHour * (p.leakageRate - HIGH_LEAKAGE_ENERGY_THRESHOLD) * 0.005 *
        cp.electricityPrice * cp.dailyOperatingHours * cp.monthlyOperatingDays * 12)
      anomalies.push({
        type: 'high_leakage',
        level: p.leakageRate >= 20 ? 'danger' : 'warning',
        message: `高漏气率（${p.leakageRate.toFixed(1)}%）：密封失效导致能源浪费，预计年额外成本约 ¥${extraCostPerYear.toFixed(0)}`,
        value: p.leakageRate,
        threshold: HIGH_LEAKAGE_ENERGY_THRESHOLD,
        costImpact: extraCostPerYear
      })
    }

    if (p.loadPressure > HIGH_LOAD_ENERGY_THRESHOLD) {
      const extraCostPerYear = (energy.powerPerHour * (p.loadPressure - HIGH_LOAD_ENERGY_THRESHOLD) * 0.8 *
        cp.electricityPrice * cp.dailyOperatingHours * cp.monthlyOperatingDays * 12) / 100
      anomalies.push({
        type: 'high_load',
        level: p.loadPressure >= 1.5 ? 'danger' : 'warning',
        message: `高负载压力（${p.loadPressure.toFixed(2)}atm）：重载运行显著增加能耗，预计年额外成本约 ¥${extraCostPerYear.toFixed(0)}`,
        value: p.loadPressure,
        threshold: HIGH_LOAD_ENERGY_THRESHOLD,
        costImpact: extraCostPerYear
      })
    }

    if (lifespan.overallHealthScore < POOR_MAINTENANCE_HEALTH_THRESHOLD) {
      const extraCostPerYear = (energy.powerPerHour * (100 - lifespan.overallHealthScore) * 0.01 *
        cp.electricityPrice * cp.dailyOperatingHours * cp.monthlyOperatingDays * 12)
      anomalies.push({
        type: 'poor_maintenance',
        level: lifespan.overallHealthScore < 30 ? 'danger' : 'warning',
        message: `维护状态不佳（健康度${lifespan.overallHealthScore.toFixed(1)}%）：部件磨损导致能效下降，预计年额外成本约 ¥${extraCostPerYear.toFixed(0)}`,
        value: lifespan.overallHealthScore,
        threshold: POOR_MAINTENANCE_HEALTH_THRESHOLD,
        costImpact: extraCostPerYear
      })
    }

    return anomalies.sort((a, b) => b.costImpact - a.costImpact)
  }

  function generateEnergySavingSuggestions(
    p: BellowsParams,
    energy: EnergyConsumption,
    efficiency: number,
    anomalies: EnergyAnomalyInfo[],
    lifespan: LifespanEvaluation
  ): EnergySavingSuggestion[] {
    const suggestions: EnergySavingSuggestion[] = []
    const cp = energyCostParams.value
    const yearlyOperatingHours = cp.dailyOperatingHours * cp.monthlyOperatingDays * 12

    if (p.rodFrequency > HIGH_FREQ_ENERGY_THRESHOLD) {
      const currentCost = energy.powerPerHour * cp.electricityPrice * yearlyOperatingHours
      const targetFreq = 4
      const savingRatio = 1 - Math.pow(targetFreq / p.rodFrequency, FREQUENCY_POWER_EXPONENT)
      const savingAmount = currentCost * savingRatio

      suggestions.push({
        id: 'saving_freq',
        category: 'parameter_optimization',
        priority: p.rodFrequency >= 8 ? 'critical' : 'high',
        title: '降低运行频率',
        description: `当前频率 ${p.rodFrequency.toFixed(1)}Hz 过高，建议降低至 ${targetFreq}Hz 左右。能耗与频率呈指数关系（${FREQUENCY_POWER_EXPONENT}次方），降频可显著节能。`,
        estimatedSavingPercent: Math.round(savingRatio * 100),
        estimatedSavingCostPerYear: Math.round(savingAmount),
        implementationCost: '¥0',
        difficulty: 'easy',
        paybackPeriod: '立即'
      })
    }

    if (p.leakageRate > HIGH_LEAKAGE_ENERGY_THRESHOLD) {
      const savingAmount = anomalies.find(a => a.type === 'high_leakage')?.costImpact ||
        (energy.powerPerHour * p.leakageRate * 0.01 * cp.electricityPrice * yearlyOperatingHours * 0.3)

      suggestions.push({
        id: 'saving_seal',
        category: 'maintenance',
        priority: p.leakageRate >= 20 ? 'critical' : 'high',
        title: '修复密封件减少漏气',
        description: `当前漏气率 ${p.leakageRate.toFixed(1)}%，建议检查并更换密封件。漏气不仅浪费能源，还会降低系统性能。`,
        estimatedSavingPercent: Math.round(Math.min(30, p.leakageRate * 2)),
        estimatedSavingCostPerYear: Math.round(savingAmount),
        implementationCost: '¥200-500',
        difficulty: 'medium',
        paybackPeriod: '1-3个月'
      })
    }

    if (p.environmentalResistance > HIGH_RESISTANCE_ENERGY_THRESHOLD) {
      const savingAmount = anomalies.find(a => a.type === 'high_resistance')?.costImpact ||
        (energy.powerPerHour * p.environmentalResistance * 0.3 * cp.electricityPrice * yearlyOperatingHours)

      suggestions.push({
        id: 'saving_pipe',
        category: 'component_upgrade',
        priority: p.environmentalResistance >= 1.0 ? 'high' : 'medium',
        title: '优化管道设计降低阻力',
        description: `当前环境阻力系数 ${(p.environmentalResistance * 100).toFixed(0)}%，建议检查管道布局，减少弯头和收缩，或增大管径。`,
        estimatedSavingPercent: Math.round(Math.min(25, p.environmentalResistance * 20)),
        estimatedSavingCostPerYear: Math.round(savingAmount),
        implementationCost: '¥1000-3000',
        difficulty: 'hard',
        paybackPeriod: '6-12个月'
      })
    }

    if (p.loadPressure > HIGH_LOAD_ENERGY_THRESHOLD) {
      const targetLoad = 0.8
      const savingRatio = (p.loadPressure - targetLoad) * 0.3
      const savingAmount = energy.powerPerHour * cp.electricityPrice * yearlyOperatingHours * savingRatio

      suggestions.push({
        id: 'saving_load',
        category: 'operation_optimization',
        priority: p.loadPressure >= 1.5 ? 'high' : 'medium',
        title: '优化负载匹配',
        description: `当前负载压力 ${p.loadPressure.toFixed(2)}atm，建议评估实际需求，优化系统匹配，避免大马拉小车。`,
        estimatedSavingPercent: Math.round(savingRatio * 100),
        estimatedSavingCostPerYear: Math.round(savingAmount),
        implementationCost: '¥0-500',
        difficulty: 'medium',
        paybackPeriod: '1-2个月'
      })
    }

    if (lifespan.overallHealthScore < POOR_MAINTENANCE_HEALTH_THRESHOLD) {
      const savingAmount = anomalies.find(a => a.type === 'poor_maintenance')?.costImpact ||
        (energy.powerPerHour * (100 - lifespan.overallHealthScore) * 0.005 * cp.electricityPrice * yearlyOperatingHours)

      suggestions.push({
        id: 'saving_maintenance',
        category: 'maintenance',
        priority: lifespan.overallHealthScore < 30 ? 'critical' : 'high',
        title: '执行预防性维护',
        description: `系统健康度仅 ${lifespan.overallHealthScore.toFixed(1)}%，建议按照维护计划及时更换磨损部件，恢复系统能效。`,
        estimatedSavingPercent: Math.round((100 - lifespan.overallHealthScore) * 0.5),
        estimatedSavingCostPerYear: Math.round(savingAmount),
        implementationCost: '¥500-2000',
        difficulty: 'medium',
        paybackPeriod: '2-6个月'
      })
    }

    if (efficiency < 60) {
      const savingAmount = energy.powerPerHour * (60 - efficiency) * 0.01 * cp.electricityPrice * yearlyOperatingHours * 0.8

      suggestions.push({
        id: 'saving_valve',
        category: 'component_upgrade',
        priority: efficiency < 40 ? 'high' : 'medium',
        title: '升级阀片组件',
        description: `当前系统效率仅 ${efficiency.toFixed(1)}%，建议检查阀片状态，必要时升级为高效阀片，改善气流特性。`,
        estimatedSavingPercent: Math.round(Math.min(20, (60 - efficiency) * 0.5)),
        estimatedSavingCostPerYear: Math.round(savingAmount),
        implementationCost: '¥300-800',
        difficulty: 'medium',
        paybackPeriod: '3-6个月'
      })
    }

    if (suggestions.length === 0 || efficiency >= 80) {
      suggestions.push({
        id: 'saving_monitor',
        category: 'operation_optimization',
        priority: 'low',
        title: '持续监控运行参数',
        description: '当前系统运行状态良好，建议定期监控能耗数据，保持良好的维护习惯，确保能效水平稳定。',
        estimatedSavingPercent: 5,
        estimatedSavingCostPerYear: Math.round(energy.yearlyEnergy * cp.electricityPrice * 0.05),
        implementationCost: '¥0',
        difficulty: 'easy',
        paybackPeriod: '持续'
      })
    }

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.estimatedSavingCostPerYear - a.estimatedSavingCostPerYear)
  }

  function computeEnergyEvaluationFromParams(
    p: BellowsParams,
    costParams?: EnergyCostParams,
    lifespanEval?: LifespanEvaluation
  ): EnergyEvaluation {
    const backupCp = costParams || energyCostParams.value
    const simEff = computeTheoreticalEfficiency(p)
    const lifespan = lifespanEval || computeLifespanFromParams(p)

    const oldCp = { ...energyCostParams.value }
    if (costParams) {
      energyCostParams.value = { ...costParams }
    }

    try {
      const energy = computeEnergyConsumption(p)
      const cost = computeOperationCost(energy, p, simEff)
      const effAnalysis = computeEfficiencyAnalysis(energy, p, simEff)
      const anomalies = detectEnergyAnomalies(p, energy, simEff, lifespan)
      const suggestions = generateEnergySavingSuggestions(p, energy, simEff, anomalies, lifespan)
      const history = generateEnergyHistoryData(p, backupCp)

      const hasWarning = anomalies.some(a => a.level === 'warning')
      const hasDanger = anomalies.some(a => a.level === 'danger')

      return {
        energyConsumption: energy,
        operationCost: cost,
        efficiencyAnalysis: effAnalysis,
        anomalies,
        suggestions,
        energyHistory: history,
        costParams: backupCp,
        hasHighEnergyWarning: hasWarning,
        hasHighEnergyDanger: hasDanger
      }
    } finally {
      energyCostParams.value = oldCp
    }
  }

  function computeTheoreticalEfficiency(p: BellowsParams): number {
    const valveFlowCoeff = Math.min(1, p.valveOpeningArea / (p.chamberWidth * p.chamberDepth * 0.3))
    const baseEff = 0.35 + 0.65 * valveFlowCoeff
    const resistanceFactor = Math.max(0.1, 1 - p.environmentalResistance * 0.5)
    const loadFactor = Math.max(0.2, 1 - p.loadPressure * 0.4)
    const leakFactor = Math.max(0, 1 - p.leakageRate / 100)
    const stuckFactor = p.valveStuck ? 1 - p.valveStuckLevel * 0.6 : 1

    return Math.min(100, baseEff * resistanceFactor * loadFactor * leakFactor * stuckFactor * 100)
  }

  function generateEnergyHistoryData(p: BellowsParams, _cp: EnergyCostParams): EnergyHistoryPoint[] {
    const history: EnergyHistoryPoint[] = []
    const totalDuration = 10
    const timeStep = totalDuration / ENERGY_HISTORY_POINTS
    const baseEnergy = computeEnergyConsumption(p)

    for (let i = 0; i < ENERGY_HISTORY_POINTS; i++) {
      const time = i * timeStep
      const omega = 2 * Math.PI * p.rodFrequency
      const strokePhase = Math.sin(omega * time + Math.PI / 4)
      const powerVariation = 0.8 + 0.4 * Math.abs(strokePhase)
      const instantPower = baseEnergy.powerPerSecond * powerVariation
      const instantEnergy = baseEnergy.powerPerHour * (time / 3600)
      const instantEfficiency = computeTheoreticalEfficiency(p) * (0.95 + 0.1 * Math.random())

      history.push({
        time,
        power: instantPower,
        energy: instantEnergy,
        efficiency: Math.min(100, instantEfficiency)
      })
    }

    return history
  }

  function ensureSchemeEnergy(scheme: Scheme): EnergyEvaluation {
    if (scheme.energyEvaluation) return scheme.energyEvaluation
    const computed = computeEnergyEvaluationFromParams(scheme.params, scheme.energyCostParams)
    scheme.energyEvaluation = computed
    return computed
  }

  function computeSchemesEnergyComparison(schemes: Scheme[]): SchemeEnergyComparison[] {
    return schemes.map(scheme => {
      const energyEval = scheme.energyEvaluation || computeEnergyEvaluationFromParams(scheme.params, scheme.energyCostParams)
      const simEff = computeTheoreticalEfficiency(scheme.params)

      return {
        schemeId: scheme.id,
        schemeName: scheme.name,
        powerPerHour: Math.round(energyEval.energyConsumption.powerPerHour * 1000) / 1000,
        dailyCost: Math.round(energyEval.operationCost.dailyCost * 100) / 100,
        monthlyCost: Math.round(energyEval.operationCost.monthlyCost),
        yearlyCost: Math.round(energyEval.operationCost.yearlyCost),
        efficiencyLossCostPerHour: Math.round(energyEval.efficiencyAnalysis.efficiencyLossCostPerHour * 100) / 100,
        overallEfficiency: Math.round(simEff * 10) / 10,
        totalCostPerYear: Math.round(energyEval.operationCost.yearlyCost),
        savingPotential: Math.round(energyEval.efficiencyAnalysis.energySavingPotential * 10) / 10
      }
    })
  }

  function updateEnergyCostParam<K extends keyof EnergyCostParams>(key: K, value: EnergyCostParams[K]) {
    if (typeof value === 'number' && value < 0) {
      value = 0 as EnergyCostParams[K]
    }
    energyCostParams.value[key] = value
    generateEnergyHistory()
  }

  function generateEnergyHistory() {
    energyHistory.value = generateEnergyHistoryData(params.value, energyCostParams.value)
  }

  function updateEnergyHistory() {
    const latestPoint = energyHistory.value[energyHistory.value.length - 1]
    if (!latestPoint) {
      generateEnergyHistory()
      return
    }

    const energy = computeEnergyConsumption(params.value)
    const newTime = animationState.value.time
    const omega = 2 * Math.PI * params.value.rodFrequency
    const strokePhase = Math.sin(omega * newTime + Math.PI / 4)
    const powerVariation = 0.8 + 0.4 * Math.abs(strokePhase)

    energyHistory.value.push({
      time: newTime,
      power: energy.powerPerSecond * powerVariation,
      energy: energy.powerPerHour * (newTime / 3600),
      efficiency: computeTheoreticalEfficiency(params.value)
    })

    if (energyHistory.value.length > MAX_HISTORY_POINTS) {
      energyHistory.value.shift()
    }
  }

  const energyEvaluation = computed<EnergyEvaluation>(() => {
    return computeEnergyEvaluationFromParams(params.value, energyCostParams.value, lifespanEvaluation.value)
  })

  const schemesEnergyComparison = computed<SchemeEnergyComparison[]>(() => {
    return computeSchemesEnergyComparison(schemes.value)
  })

  function computeMaintenanceCostStatsForRecords(records: MaintenanceRecord[]): MaintenanceCostStats {
    let totalCost = 0
    let inspectionCount = 0, inspectionCost = 0
    let valveCount = 0, valveCost = 0
    let sealCount = 0, sealCost = 0
    let pistonCount = 0, pistonCost = 0

    records.forEach(r => {
      totalCost += r.cost
      switch (r.maintenanceType) {
        case 'inspection':
          inspectionCount++
          inspectionCost += r.cost
          break
        case 'valve_replacement':
          valveCount++
          valveCost += r.cost
          break
        case 'seal_replacement':
          sealCount++
          sealCost += r.cost
          break
        case 'piston_replacement':
          pistonCount++
          pistonCost += r.cost
          break
      }
    })

    const costTrend = computeCostTrend(records)
    const months = Math.max(1, computeMonthsSpan(records))
    const avgMonthlyCost = totalCost / months

    return {
      totalMaintenanceCost: totalCost,
      inspectionCount,
      inspectionCost,
      valveReplacementCount: valveCount,
      valveReplacementCost: valveCost,
      sealReplacementCount: sealCount,
      sealReplacementCost: sealCost,
      pistonReplacementCount: pistonCount,
      pistonReplacementCost: pistonCost,
      avgMonthlyCost,
      costTrend
    }
  }

  function getComponentHealthBeforeMaintenance(componentKey: string): number {
    const comp = lifespanEvaluation.value.components.find(c => c.componentKey === componentKey)
    return comp ? comp.healthScore : 100
  }

  function applyMaintenanceToLifespan(
    component: MaintenanceComponent,
    maintenanceType: MaintenanceType,
    currentLifespan: LifespanEvaluation
  ): { adjustedLifespans: Record<string, number>; healthScoreAfter: number; lifespanRestored: number } {
    const adjusted: Record<string, number> = { ...componentAdjustedLifespans.value }
    const restoreRatio = LIFESPAN_RESTORE_RATIO[maintenanceType]
    let lifespanRestored = 0
    let healthScoreAfter = 100
    
    if (component === 'system') {
      currentLifespan.components.forEach(comp => {
        const baseLifespan = comp.baseLifespanHours
        const currentRemaining = comp.remainingLifespanHours
        const restored = Math.round(baseLifespan * restoreRatio)
        const newRemaining = Math.min(baseLifespan, currentRemaining + restored)
        adjusted[comp.componentKey] = newRemaining
        lifespanRestored += restored
        
        if (comp.componentKey === 'valve') {
          healthScoreAfter = Math.min(100, (newRemaining / baseLifespan) * 100)
        }
      })
    } else {
      const comp = currentLifespan.components.find(c => c.componentKey === component)
      if (comp) {
        const baseLifespan = comp.baseLifespanHours
        const currentRemaining = comp.remainingLifespanHours
        const restored = Math.round(baseLifespan * restoreRatio)
        const newRemaining = Math.min(baseLifespan, currentRemaining + restored)
        adjusted[component] = newRemaining
        lifespanRestored = restored
        healthScoreAfter = Math.min(100, (newRemaining / baseLifespan) * 100)
      }
    }
    
    return { adjustedLifespans: adjusted, healthScoreAfter, lifespanRestored }
  }

  function addMaintenanceRecord(
    maintenanceType: MaintenanceType,
    component: MaintenanceComponent,
    maintenanceDate: number,
    description: string,
    cost: number,
    operator: string,
    remarks: string
  ): MaintenanceRecord {
    const currentLifespan = lifespanEvaluation.value
    const healthScoreBefore = component === 'system'
      ? currentLifespan.overallHealthScore
      : getComponentHealthBeforeMaintenance(component)
    
    const { adjustedLifespans, healthScoreAfter, lifespanRestored } = applyMaintenanceToLifespan(
      component,
      maintenanceType,
      currentLifespan
    )
    
    const record: MaintenanceRecord = {
      id: `maint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      maintenanceType,
      component,
      maintenanceDate,
      description,
      cost,
      operator,
      remarks,
      lifespanRestored,
      healthScoreBefore: Math.round(healthScoreBefore * 10) / 10,
      healthScoreAfter: Math.round(healthScoreAfter * 10) / 10
    }
    
    maintenanceRecords.value.push(record)
    componentAdjustedLifespans.value = adjustedLifespans
    lastMaintenanceTimestamp.value = Date.now()
    
    return record
  }

  function updateMaintenanceRecord(
    id: string,
    updates: Partial<Pick<MaintenanceRecord, 'maintenanceType' | 'component' | 'maintenanceDate' | 'description' | 'cost' | 'operator' | 'remarks'>>
  ): boolean {
    const index = maintenanceRecords.value.findIndex(r => r.id === id)
    if (index === -1) return false
    
    const record = maintenanceRecords.value[index]
    maintenanceRecords.value[index] = { ...record, ...updates }
    
    recalculateAllAdjustedLifespans()
    
    return true
  }

  function deleteMaintenanceRecord(id: string): boolean {
    const index = maintenanceRecords.value.findIndex(r => r.id === id)
    if (index === -1) return false
    
    maintenanceRecords.value.splice(index, 1)
    recalculateAllAdjustedLifespans()
    
    return true
  }

  function recalculateAllAdjustedLifespans() {
    let adjusted: Record<string, number> = {}
    
    const sortedRecords = [...maintenanceRecords.value].sort((a, b) => a.maintenanceDate - b.maintenanceDate)
    
    sortedRecords.forEach(record => {
      const tempEval = computeLifespanFromParams(params.value, adjusted)
      const result = applyMaintenanceToLifespan(record.component, record.maintenanceType, tempEval)
      adjusted = result.adjustedLifespans
    })
    
    componentAdjustedLifespans.value = adjusted
    lastMaintenanceTimestamp.value = Date.now()
  }

  function loadMaintenanceRecords(records: MaintenanceRecord[], adjustedLifespans?: Record<string, number>) {
    maintenanceRecords.value = deepClone(records)
    if (adjustedLifespans) {
      componentAdjustedLifespans.value = { ...adjustedLifespans }
    } else {
      recalculateAllAdjustedLifespans()
    }
  }

  function clearMaintenanceRecords() {
    maintenanceRecords.value = []
    componentAdjustedLifespans.value = {}
    lastMaintenanceTimestamp.value = 0
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

    generateEnergyHistory()
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

    updateEnergyHistory()
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
      lifespanEvaluation: deepClone(lifespanEvaluation.value),
      maintenanceRecords: deepClone(maintenanceRecords.value),
      maintenanceCostStats: deepClone(maintenanceCostStats.value),
      maintenanceCycleAnalysis: deepClone(maintenanceCycleAnalysis.value),
      energyEvaluation: deepClone(energyEvaluation.value),
      energyCostParams: deepClone(energyCostParams.value)
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

      if (scheme.energyCostParams) {
        energyCostParams.value = deepClone(scheme.energyCostParams)
      }
      if (scheme.energyEvaluation) {
        energyHistory.value = deepClone(scheme.energyEvaluation.energyHistory || [])
      }

      if (scheme.maintenanceRecords) {
        loadMaintenanceRecords(scheme.maintenanceRecords)
      } else {
        clearMaintenanceRecords()
      }

      animationState.value = computeStateAtTime(animationState.value.time)

      if (airFlowHistory.value.length === 0) {
        generateFullHistory()
      }
      if (energyHistory.value.length === 0) {
        generateEnergyHistory()
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
    list.forEach(s => {
      ensureSchemeLifespan(s)
      ensureSchemeEnergy(s)
    })
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
    maintenanceRecords,
    componentAdjustedLifespans,
    lastMaintenanceTimestamp,
    sortedMaintenanceRecords,
    maintenanceCostStats,
    maintenanceCycleAnalysis,
    calendarEvents,
    schemesMaintenanceComparison,
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
    computeCostTrend,
    computeMaintenanceCycleAnalysis,
    generateCalendarEvents,
    computeSchemesMaintenanceComparison,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    loadMaintenanceRecords,
    clearMaintenanceRecords,
    recalculateAllAdjustedLifespans,
    MAINTENANCE_TYPE_LABELS,
    COMPONENT_NAMES,
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
    setPlaybackSpeed,
    energyCostParams,
    energyHistory,
    energyEvaluation,
    schemesEnergyComparison,
    computeEnergyConsumption,
    computeOperationCost,
    computeEfficiencyAnalysis,
    detectEnergyAnomalies,
    generateEnergySavingSuggestions,
    computeEnergyEvaluationFromParams,
    ensureSchemeEnergy,
    computeSchemesEnergyComparison,
    updateEnergyCostParam,
    generateEnergyHistory,
    updateEnergyHistory
  }
})
