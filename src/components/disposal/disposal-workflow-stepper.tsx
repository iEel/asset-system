import { Steps } from "@/components/ui/steps"
import type { DisposalStage } from "@/lib/disposal-stage"
import { getLinearStepStates, type StepOutcome } from "@/lib/step-states"

type DisposalWorkflowStepperProps = {
  stage: DisposalStage
  currentStageLabel: string
  ownerRoleLabel: string
  ownerLabel: string
  stepsLabel: string
  labels: {
    request: string
    decision: string
    execution: string
  }
}

// A request someone can open has been filed, so "request" is always done (spec 2C section 7.2.4, S1): a pending
// request waits at the decision, an approved one at the disposal itself. A disposed request has every step done and
// none current; a rejected one stops at the decision with an X.
const currentStepByStage: Record<DisposalStage, number> = {
  pending_approval: 1,
  awaiting_execution: 2,
  complete: 2,
  rejected: 1,
}

const outcomeByStage: Record<DisposalStage, StepOutcome> = {
  pending_approval: "in_progress",
  awaiting_execution: "in_progress",
  complete: "complete",
  rejected: "rejected",
}

const stepKeys = ["request", "decision", "execution"] as const

// The stage and its owner stay the panel's first row (the panel itself waits for 2D, K28); the steps are the shared
// rail, which names its list, reads each step's state and shows "ขั้นที่ x จาก 3" on phones.
export function DisposalWorkflowStepper({
  stage,
  currentStageLabel,
  ownerRoleLabel,
  ownerLabel,
  stepsLabel,
  labels,
}: DisposalWorkflowStepperProps) {
  const states = getLinearStepStates(stepKeys.length, currentStepByStage[stage], outcomeByStage[stage])
  const steps = stepKeys.map((key, index) => ({ id: key, label: labels[key], state: states[index] }))

  return (
    <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-sm font-semibold text-foreground">{currentStageLabel}</p>
        <p className="text-sm text-muted-foreground">{ownerRoleLabel}: {ownerLabel}</p>
      </div>
      <Steps className="mt-4" label={stepsLabel} steps={steps} />
    </section>
  )
}
