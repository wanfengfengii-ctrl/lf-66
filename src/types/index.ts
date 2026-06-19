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
  airFlowHistory: AirFlowDataPoint[]
  pressureHistory: PressureDataPoint[]
  efficiencyHistory: EfficiencyDataPoint[]
  riskHistory: RiskDataPoint[]
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
