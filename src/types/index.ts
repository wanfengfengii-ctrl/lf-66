export interface BellowsParams {
  chamberWidth: number
  chamberHeight: number
  chamberDepth: number
  rodFrequency: number
  valveOpeningArea: number
  valveStuck: boolean
  valveStuckLevel: number
  pistonStroke: number
  environmentalResistance: number
  loadPressure: number
  leakageRate: number
}

export interface SimulationResult {
  airFlowRate: number
  fluctuationAmplitude: number
  valveRisk: number
  isLeaking: boolean
  leakWarning: string
  efficiency: number
  theoreticalMaxFlow: number
  riskScore: number
  anomalies: AnomalyInfo[]
  effectiveFlowRate: number
  pressureLoss: number
}

export interface AnomalyInfo {
  type: 'valve_stuck' | 'leakage' | 'high_frequency' | 'low_efficiency' | 'pressure_abnormal'
  level: 'warning' | 'danger' | 'info'
  message: string
  value: number
  threshold: number
}

export interface AnimationState {
  time: number
  leftPistonPosition: number
  rightPistonPosition: number
  leftChamberPressure: number
  rightChamberPressure: number
  airFlowDirection: 'left' | 'right' | 'none'
  valveOpenLeft: boolean
  valveOpenRight: boolean
}

export interface Scheme {
  id: string
  name: string
  params: BellowsParams
  result: SimulationResult
  timestamp: number
  animationState: AnimationState
  isPlaying: boolean
  playbackSpeed: number
  airFlowHistory: AirFlowDataPoint[]
  pressureHistory: PressureDataPoint[]
  efficiencyHistory: EfficiencyDataPoint[]
  riskHistory: RiskDataPoint[]
  lifespanEvaluation?: LifespanEvaluation
}

export interface AirFlowDataPoint {
  time: number
  flowRate: number
}

export interface PressureDataPoint {
  time: number
  leftPressure: number
  rightPressure: number
}

export interface EfficiencyDataPoint {
  time: number
  efficiency: number
}

export interface RiskDataPoint {
  time: number
  riskScore: number
}

export interface ComponentLifespan {
  componentName: string
  componentKey: 'valve' | 'seal' | 'piston'
  baseLifespanHours: number
  remainingLifespanHours: number
  wearRate: number
  healthScore: number
  riskLevel: 'normal' | 'warning' | 'danger'
  thresholdHours: number
}

export interface LifespanTrendPoint {
  operatingHours: number
  valveHealth: number
  sealHealth: number
  pistonHealth: number
  overallHealth: number
}

export interface MaintenanceAlert {
  id: string
  componentKey: 'valve' | 'seal' | 'piston'
  componentName: string
  level: 'info' | 'warning' | 'danger'
  title: string
  message: string
  remainingHours: number
  recommendedAction: string
}

export interface MaintenanceSuggestion {
  component: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  action: string
  schedule: string
  estimatedCost: string
  reason: string
}

export interface LifespanEvaluation {
  components: ComponentLifespan[]
  trendData: LifespanTrendPoint[]
  maintenanceAlerts: MaintenanceAlert[]
  suggestions: MaintenanceSuggestion[]
  overallHealthScore: number
  estimatedMaintenanceCycleHours: number
  hasHighRisk: boolean
  highRiskComponents: string[]
  wearFactors: {
    frequencyFactor: number
    valveStuckFactor: number
    loadPressureFactor: number
    resistanceFactor: number
    leakageFactor: number
  }
}

export interface LifespanComparisonData {
  schemeName: string
  overallHealthScore: number
  valveLifespanHours: number
  sealLifespanHours: number
  pistonLifespanHours: number
  maintenanceCycleHours: number
  hasHighRisk: boolean
}
