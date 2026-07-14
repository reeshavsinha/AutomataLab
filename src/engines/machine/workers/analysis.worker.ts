import type { MachineDefinition } from '../core/types'
import {
  getReachability,
  checkEmptiness,
  checkEquivalence,
  checkInclusion
} from '../core/analysis'

export type AnalysisRequest =
  | { id: string; type: 'reachability'; machine: MachineDefinition }
  | { id: string; type: 'emptiness'; machine: MachineDefinition }
  | { id: string; type: 'equivalence'; m1: MachineDefinition; m2: MachineDefinition }
  | { id: string; type: 'inclusion'; m1: MachineDefinition; m2: MachineDefinition }

export type AnalysisResponse =
  | { id: string; success: true; type: 'reachability'; result: ReturnType<typeof getReachability> }
  | { id: string; success: true; type: 'emptiness'; result: ReturnType<typeof checkEmptiness> }
  | { id: string; success: true; type: 'equivalence'; result: ReturnType<typeof checkEquivalence> }
  | { id: string; success: true; type: 'inclusion'; result: ReturnType<typeof checkInclusion> }
  | { id: string; success: false; error: string }

self.onmessage = (e: MessageEvent<AnalysisRequest>) => {
  const req = e.data
  try {
    switch (req.type) {
      case 'reachability': {
        const result = getReachability(req.machine)
        self.postMessage({ id: req.id, success: true, type: 'reachability', result } as AnalysisResponse)
        break
      }
      case 'emptiness': {
        const result = checkEmptiness(req.machine)
        self.postMessage({ id: req.id, success: true, type: 'emptiness', result } as AnalysisResponse)
        break
      }
      case 'equivalence': {
        const result = checkEquivalence(req.m1, req.m2)
        self.postMessage({ id: req.id, success: true, type: 'equivalence', result } as AnalysisResponse)
        break
      }
      case 'inclusion': {
        const result = checkInclusion(req.m1, req.m2)
        self.postMessage({ id: req.id, success: true, type: 'inclusion', result } as AnalysisResponse)
        break
      }
      default:
        throw new Error('Unknown analysis type')
    }
  } catch (error) {
    self.postMessage({
      id: req.id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    } as AnalysisResponse)
  }
}
