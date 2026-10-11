import { Check, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { getStepFocusIndex, type StepState } from "@/lib/step-states"
import { cn } from "@/lib/utils"

export type StepItem = { id: string; label: string; state: StepState }

// Marker rail (spec 2C section 7.2, K17): 22px circles joined by a line. The state shows by shape (number, check, X)
// and by a hidden word, never by color alone. Each state is its own string: a status soft fill never shares a class
// string with faint text. No frame of its own; place it in a panel with a margin class.
const markerBase = "inline-flex size-5.5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold num"
const markerByState: Record<StepState, string> = {
  complete: "border-success-border bg-success-soft text-success",
  current: "border-primary bg-primary-soft text-primary-hover",
  upcoming: "border-control-border bg-surface text-faint-foreground",
  rejected: "border-danger-border bg-danger-soft text-danger",
}
const labelByState: Record<StepState, string> = {
  complete: "text-muted-foreground",
  current: "font-semibold text-foreground",
  upcoming: "text-faint-foreground",
  rejected: "font-medium text-danger",
}
const stateWordKeys: Record<StepState, string> = {
  complete: "stepComplete",
  current: "stepCurrent",
  upcoming: "stepUpcoming",
  rejected: "stepRejected",
}

// No client directive: useTranslations is the only hook, so server pages (the disposal request) render it too.
// Below md every label is sr-only and one aria-hidden line names the focus step; the list already reads every step.
export function Steps({ label, steps, className }: { label: string; steps: readonly StepItem[]; className?: string }) {
  const t = useTranslations("common")
  if (steps.length === 0) return null
  const focus = getStepFocusIndex(steps.map((step) => step.state))
  const focusStep = steps[focus]

  return (
    <div data-slot="steps" className={className}>
      <ol aria-label={label} className="flex items-start gap-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.state === "current" ? "step" : undefined}
            className="flex min-w-0 flex-1 items-start gap-2 last:flex-none"
          >
            <span aria-hidden="true" className={cn(markerBase, markerByState[step.state])}>
              {step.state === "complete" ? (
                <Check className="size-3.5" strokeWidth={2.75} />
              ) : step.state === "rejected" ? (
                <X className="size-3.5" strokeWidth={2.75} />
              ) : index + 1}
            </span>
            <span className={cn("min-w-0 pt-px text-meta max-md:sr-only", labelByState[step.state])}>
              <span className="sr-only">{t(stateWordKeys[step.state])}: </span>
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className={cn("mt-2.75 h-px min-w-3 flex-1", step.state === "complete" ? "bg-success-border" : "bg-border")} />
            ) : null}
          </li>
        ))}
      </ol>
      <p aria-hidden="true" className="mt-2 text-meta text-faint-foreground md:hidden">
        <span className="num">{t("stepOf", { current: focus + 1, total: steps.length })}</span> · <span className={labelByState[focusStep.state]}>{focusStep.label}</span>
      </p>
    </div>
  )
}
