import * as React from "react"
import { FieldError, FieldHint, FieldRequiredMark } from "@/components/ui/field"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { cn } from "@/lib/utils"

type FieldGroupProps = {
  legend: React.ReactNode
  required?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  // The fieldset's id: focusFirst focuses the group's checked radio or first control, and the error is <id>-error.
  id?: string
  className?: string
  // The choices (checkboxes, radios, ChoiceCards). A checkbox may take aria-invalid from its caller; a radio may not.
  children: React.ReactNode
}

// A group of choices with one label (the legend), one hint and one error (V track spec §7.3). The error shows under the
// group and is tied to the fieldset by aria-describedby, error before hint as Field reads them. Server-safe like Field:
// useId is the only hook and there is no context.
function FieldGroup({ legend, required, hint, error, id, className, children }: FieldGroupProps) {
  const generatedId = React.useId()
  const groupId = id ?? generatedId
  const hintId = hint ? `${groupId}-hint` : undefined
  const errorId = error ? `${groupId}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined

  return (
    <fieldset id={groupId} data-slot="field-group" aria-describedby={describedBy} className={cn("min-w-0", className)}>
      <legend className={cn(fieldLabelClasses, "mb-1.5")}>
        {legend}
        {required ? <FieldRequiredMark /> : null}
      </legend>
      {children}
      {hint ? <FieldHint id={hintId} className="mt-1.5">{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId} className="mt-1.5">{error}</FieldError> : null}
    </fieldset>
  )
}

export { FieldGroup }
