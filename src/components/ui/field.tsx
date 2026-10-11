import * as React from "react"
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
  id?: string
  className?: string
  // One element that accepts id and aria-* (Input, NativeSelect, Textarea, ScannerTextInput), or a function for a
  // control built from several parts. Never wrap SearchableSelect: it renders its own label.
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }> | ((control: FieldControlProps) => React.ReactNode)
}

// Label, control, hint, error. Server-safe: useId is the only hook and there is no context. Never put a Field
// inside a <label>.
function Field({ label, hideLabel, required, hint, error, id, className, children }: FieldProps) {
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

  return (
    <div data-slot="field" className={cn("grid min-w-0 gap-1.5", className)}>
      <FieldLabel htmlFor={controlId} required={required} visuallyHidden={hideLabel}>
        {label}
      </FieldLabel>
      {renderControl ? renderControl(control) : element ? React.cloneElement(element, control) : null}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
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
    <label data-slot="field-label" className={cn("text-meta font-medium text-foreground", visuallyHidden && "sr-only", className)} {...props}>
      {children}
      {required ? <span aria-hidden="true" className="ml-1 text-warning">*</span> : null}
    </label>
  )
}

function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-hint" className={cn("text-meta text-faint-foreground", className)} {...props} />
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-error" role="alert" className={cn("text-meta text-danger", className)} {...props} />
}

export { Field, FieldError, FieldHint, FieldLabel }
