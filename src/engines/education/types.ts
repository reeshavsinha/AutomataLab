// ============================================================
// Shared contracts for interactive educational exercises.
//
// Exercises are deliberately separate from machine and parser execution
// state. They may use an engine as an oracle, but a student's attempts,
// hints, and limits must never mutate the authoritative simulation.
// ============================================================

export type ExerciseStatus = 'idle' | 'in_progress' | 'completed' | 'failed' | 'limited'

export interface ExerciseLimits {
  /** Maximum number of user/engine steps allowed in one exercise. */
  maxSteps: number
  /** Maximum search/frontier size for exercises that explore alternatives. */
  maxNodes?: number
  /** Maximum witness or sentence length accepted by the exercise. */
  maxLength?: number
}

export interface ExerciseAttempt<Action, Observation = unknown> {
  index: number
  action: Action
  valid: boolean
  feedback: string
  observation?: Observation
}

export interface ExerciseSession<State, Action, Observation = unknown> {
  version: 1
  id: string
  status: ExerciseStatus
  state: State
  attempts: ExerciseAttempt<Action, Observation>[]
  limits: ExerciseLimits
}
