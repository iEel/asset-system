import { Check, Circle, XCircle } from "lucide-react"
import type { DisposalStage } from "@/lib/disposal-stage"

type DisposalWorkflowStepperProps = {
  stage: DisposalStage
  currentStageLabel: string
  ownerRoleLabel: string
  ownerLabel: string
  labels: {
    request: string
    decision: string
    execution: string
  }
}

const currentStepByStage: Record<DisposalStage, number> = {
  pending_approval: 0,
  awaiting_execution: 1,
  complete: 2,
  rejected: 1,
}

export function DisposalWorkflowStepper({
  stage,
  currentStageLabel,
  ownerRoleLabel,
  ownerLabel,
  labels,
}: DisposalWorkflowStepperProps) {
  const currentStep = currentStepByStage[stage]
  const steps = [labels.request, labels.decision, labels.execution]

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <p className="text-sm font-semibold text-foreground">{currentStageLabel}</p>
        <p className="text-sm text-muted-foreground">{ownerRoleLabel}: {ownerLabel}</p>
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={currentStageLabel}>
        {steps.map((label, index) => {
          const isCurrent = index === currentStep
          const isComplete = index < currentStep || stage === "complete"
          const isRejected = stage === "rejected" && index === currentStep

          return (
            <li key={label} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    isRejected
                      ? "border-danger bg-danger/10 text-danger"
                      : isComplete
                        ? "border-success bg-success text-white"
                        : isCurrent
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {isRejected ? <XCircle className="h-3.5 w-3.5" /> : isComplete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </span>
                {index < steps.length - 1 ? <span className="h-px min-w-0 flex-1 bg-border" aria-hidden="true" /> : null}
              </div>
              <p className={`mt-2 text-xs font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
