import * as React from "react"
import { fieldLabelClasses } from "@/components/ui/field-variants"
import { cn } from "@/lib/utils"

// What Field hands to its control. aria-required, never required: a real required attribute would start the
// browser's own form validation and could block submits that our code validates itself.
export type FieldControlProps = {
  id: string
  "aria-describedby"?: string
  "aria-invalid"?: true
  "aria-required"?: true
}

type FieldProps = {
  label: React.ReactNode
  hideLabel?: boolean
  required?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  // The text a check shows while the person types (spec U8), or null while it finds nothing. A field with such a check
  // always passes it, so its polite live region is there before the first error and reads each new text once. An error
  // that a save or the server set is not passed here: focus reads it once, through aria-describedby (v-track final
  // task 3). While the check finds something, error shows the same text.
  liveError?: string | null
  id?: string
  className?: string
  // One icon button beside the label, for example AssetStateHelpPopover. It sits outside the <label>, so clicking it
  // does not move focus to the field. It needs its own accessible name and must not be a <label> or hold a field.
  labelAction?: React.ReactNode
  // One element that accepts id and aria-* (Input, NativeSelect, Textarea, ScannerTextInput), or a function for a
  // control built from several parts. Never wrap SearchableSelect: it renders its own label.
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }> | ((control: FieldControlProps) => React.ReactNode)
}

// Label, control, hint, error. Server-safe: useId is the only hook and there is no context. Never put a Field
// inside a <label>.
function Field({ label, hideLabel, required, hint, error, liveError, id, className, labelAction, children }: FieldProps) {
  const generatedId = React.useId()
  const renderControl = typeof children === "function" ? children : null
  const element = typeof children === "function" ? null : children
  const controlId = element?.props.id ?? id ?? generatedId
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [element?.props["aria-describedby"], errorId, hintId].filter(Boolean).join(" ")
  const control: FieldControlProps = {
    id: controlId,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(error ? { "aria-invalid": true } : {}),
    ...(required ? { "aria-required": true } : {}),
  }

  const labelNode = (
    <FieldLabel htmlFor={controlId} required={required} visuallyHidden={hideLabel}>
      {label}
    </FieldLabel>
  )

  // With labelAction, label and button share one row. -my-0.5 keeps a 24px icon button from making the row taller
  // than the 20px label, so fields in neighbouring columns stay level. hideLabel still works: the label is sr-only
  // and the button stays visible. Without labelAction the label renders exactly as before.
  return (
    <div data-slot="field" className={cn("grid min-w-0 content-start gap-1.5", className)}>
      {labelAction ? (
        <div data-slot="field-label-row" className="flex min-w-0 items-center gap-1.5">
          {labelNode}
          <span data-slot="field-label-action" className="-my-0.5 inline-flex shrink-0">{labelAction}</span>
        </div>
      ) : (
        labelNode
      )}
      {renderControl ? renderControl(control) : element ? React.cloneElement(element, control) : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId} aria-hidden={(liveError && liveError === error) || undefined}>{error}</FieldError> : null}
      {liveError !== undefined ? <span data-slot="field-error-live" className="sr-only" aria-live="polite">{liveError}</span> : null}
    </div>
  )
}

// visuallyHidden, not hidden: hidden is an HTML attribute that would remove the label for screen readers too.
function FieldLabel({
  className,
  required,
  visuallyHidden,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean; visuallyHidden?: boolean }) {
  return (
    <label data-slot="field-label" className={cn(fieldLabelClasses, visuallyHidden && "sr-only", className)} {...props}>
      {children}
      {required ? <FieldRequiredMark /> : null}
    </label>
  )
}

// The orange star after a required label, and after the text of a required <legend>. aria-hidden, because the
// control itself carries aria-required or required, so screen readers say "required" instead of "star".
function FieldRequiredMark() {
  return <span aria-hidden="true" className="ml-1 text-warning">*</span>
}

function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-hint" className={cn("text-meta text-faint-foreground", className)} {...props} />
}

// No alert role: one submit is one announcement, made by focusing the first wrong field, which reads this line through
// aria-describedby. An error shown while typing goes through Field liveError.
function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-error" className={cn("text-meta text-danger", className)} {...props} />
}

export { Field, FieldError, FieldHint, FieldLabel, FieldRequiredMark }
