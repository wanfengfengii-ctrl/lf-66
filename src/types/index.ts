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
  hasWarning: boolean
  warningComponents: string[]
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

export type MaintenanceType = 'inspection' | 'valve_replacement' | 'seal_replacement' | 'piston_replacement' | 'other'

export type MaintenanceComponent = 'valve' | 'seal' | 'piston' | 'system'

export interface MaintenanceRecord {
  id: string
  maintenanceType: MaintenanceType
  component: MaintenanceComponent
  maintenanceDate: number
  description: string
  cost: number
  operator: string
  remarks: string
  lifespanRestored: number
  healthScoreBefore: number
  healthScoreAfter: number
}

export interface MaintenanceCostTrendPoint {
  date: string
  timestamp: number
  totalCost: number
  inspectionCost: number
  valveCost: number
  sealCost: number
  pistonCost: number
}

export interface ComponentReplacementHistory {
  component: MaintenanceComponent
  componentName: string
  replacementCount: number
  totalCost: number
  avgCost: number
  firstReplacementDate: number
  lastReplacementDate: number
  avgIntervalHours: number
}

export interface MaintenanceCycleDeviationPoint {
  component: MaintenanceComponent
  componentName: string
  expectedCycleHours: number
  actualCycleHours: number
  deviationHours: number
  deviationPercent: number
}

export interface MaintenanceCostStats {
  totalMaintenanceCost: number
  inspectionCount: number
  inspectionCost: number
  valveReplacementCount: number
  valveReplacementCost: number
  sealReplacementCount: number
  sealReplacementCost: number
  pistonReplacementCount: number
  pistonReplacementCost: number
  avgMonthlyCost: number
  costTrend: MaintenanceCostTrendPoint[]
}

export interface MaintenanceCycleAnalysis {
  componentReplacements: ComponentReplacementHistory[]
  cycleDeviations: MaintenanceCycleDeviationPoint[]
  avgMaintenanceFrequency: number
}

export interface CalendarEvent {
  id: string
  title: string
  date: number
  type: 'maintenance' | 'scheduled' | 'alert'
  component?: MaintenanceComponent
  componentName?: string
  description: string
  isCompleted: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface SchemeMaintenanceComparison {
  schemeId: string
  schemeName: string
  totalMaintenanceCost: number
  maintenanceCount: number
  avgLifespanRestored: number
  avgHealthImprovement: number
  maintenanceFrequency: number
  valveLifespanHours: number
  sealLifespanHours: number
  pistonLifespanHours: number
  overallHealthScore: number
  totalCostPerYear: number
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
  maintenanceRecords?: MaintenanceRecord[]
  maintenanceCostStats?: MaintenanceCostStats
  maintenanceCycleAnalysis?: MaintenanceCycleAnalysis
}
