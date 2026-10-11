// States for the Steps rail (src/components/ui/steps.tsx, spec 2C section 7.2.1). Plain TS with no React and no
// "@/" imports, so tests import this file directly.
export type StepState = "complete" | "current" | "upcoming" | "rejected"
export type StepOutcome = "in_progress" | "complete" | "rejected"

// Steps before currentIndex are complete, the one at currentIndex is current (or rejected), the rest are upcoming.
// A complete flow has every step complete and none current. currentIndex is pulled into 0 … count - 1, so an
// indexOf() miss (-1) points at the first step.
export function getLinearStepStates(count: number, currentIndex: number, outcome: StepOutcome = "in_progress"): StepState[] {
  if (count <= 0) return []
  if (outcome === "complete") return Array.from({ length: count }, (): StepState => "complete")
  const index = Number.isFinite(currentIndex) ? Math.trunc(currentIndex) : 0
  const current = Math.min(Math.max(index, 0), count - 1)
  const marker: StepState = outcome === "rejected" ? "rejected" : "current"
  return Array.from({ length: count }, (_, step): StepState => (step < current ? "complete" : step === current ? marker : "upcoming"))
}

// The step the phone line names: the current or rejected step, else the last step once all are complete, else the first.
export function getStepFocusIndex(states: readonly StepState[]): number {
  const active = states.findIndex((state) => state === "current" || state === "rejected")
  if (active !== -1) return active
  if (states.length > 0 && states.every((state) => state === "complete")) return states.length - 1
  return 0
}
