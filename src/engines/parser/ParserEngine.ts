// src/modules/parser/ParserEngine.ts

import type { Automaton, MachineDefinition, SimulationStatus, StepResult, Configuration, HistoryEntry } from "../../engines/machine/core/types";
import { GlobalRoutingEngine } from "./layout/GlobalRoutingEngine";

/**
 * Stub parser engine implementing the Automaton interface.
 * It forwards to a basic engine (e.g., DFAEngine) for core simulation logic
 * and integrates the GlobalRoutingEngine for visual layout.
 */
export class ParserEngine implements Automaton {
  private definition: MachineDefinition;
  private routingEngine: GlobalRoutingEngine;

  constructor(definition: MachineDefinition) {
    this.definition = definition;
    // In a full implementation, we would instantiate the appropriate core engine.
    // For this stub, we just store the definition and set up the routing engine.
    this.routingEngine = new GlobalRoutingEngine();
  }

  // ---------- Automaton lifecycle ----------
  initialize(_input: string): void {
    // No-op for stub – a real engine would parse the input and set up state.
  }

  step(): StepResult {
    // Return a minimal StepResult placeholder.
    const dummyResult: StepResult = {
      status: "idle" as SimulationStatus,
      activeStateIds: [],
      consumedInput: "",
      remainingInput: "",
      symbol: "",
      transitionIds: [],
      historyEntry: {
        step: 0,
        fromStateIds: [],
        toStateIds: [],
        symbol: "",
        transitionIds: [],
        status: "idle",
      },
      configurations: [],
    } as any;
    return dummyResult;
  }

  reset(): void {
    // No internal state to reset in this stub.
  }

  // ---------- Introspection ----------
  getCurrentConfigurations(): Configuration[] {
    return [];
  }

  getExecutionHistory(): HistoryEntry[] {
    return [];
  }

  isAccepted(): boolean | null {
    return null;
  }

  getStatus(): SimulationStatus {
    return "idle" as SimulationStatus;
  }

  // ---------- Optional routing utilities ----------
  /** Expose routing engine for UI components */
  getRoutingEngine(): GlobalRoutingEngine {
    return this.routingEngine;
  }
}
