export interface BellowsParams {
  chamberWidth: number
  chamberHeight: number
  chamberDepth: number
  rodFrequency: number
  valveOpeningArea: number
  valveStuck: boolean
  valveStuckLevel: number
  pistonStroke: number
}

export interface SimulationResult {
  airFlowRate: number
  fluctuationAmplitude: number
  valveRisk: number
  isLeaking: boolean
  leakWarning: string
  efficiency: number
  theoreticalMaxFlow: number
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
