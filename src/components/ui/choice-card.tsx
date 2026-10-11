"use client"

import { useId, type ComponentProps, type KeyboardEvent, type ReactNode } from "react"
import { checkboxVariants } from "@/components/ui/field-variants"
import { cn } from "@/lib/utils"

// Radio and checkbox choices drawn on the browser's own input inside a <label> (spec 2C section 7.4, I20). The input
// stays visible, so a choice never shows by color alone, browsers without :has() still show the state, and the focus
// outline comes from the input itself. className goes on the <label> and is for layout only.
type ChoiceInputProps = Omit<ComponentProps<"input">, "type" | "size" | "className" | "children">

type ChoiceBaseProps = ChoiceInputProps & {
  type: "radio" | "checkbox"
  label: ReactNode
  className?: string
}

// Tailwind emits hover:, has-checked:, has-disabled:, has-[…]: in that order: a chosen choice keeps its primary border on
// hover, and only a disabled choice that is not chosen loses its fill (a disabled chosen one keeps primary-soft).
const choiceCardClasses =
  "group flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-control-border bg-surface px-3 py-2.5 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input has-checked:border-primary has-checked:bg-primary-soft has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background"
const choiceChipClasses =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-control-border bg-surface px-3 py-1 text-sm text-foreground transition-colors motion-reduce:transition-none hover:border-input md:min-h-8 has-checked:border-primary-border has-checked:bg-primary-soft has-checked:text-primary-hover has-disabled:cursor-not-allowed has-disabled:text-faint-foreground has-[:disabled:not(:checked)]:border-border has-[:disabled:not(:checked)]:bg-background"

// Chromium submits the form when Enter is pressed on a checkbox or radio (implicit submission). These choices replace
// type="button" toggles inside the settings and asset forms, so Enter must not save the whole form. Space still toggles.
export function preventEnterSubmit(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.preventDefault()
}

// The native input. Each tag has a literal type, so the form-migration guards read it as a choice, not as a
// hand-written text field. The caller's onKeyDown runs first, then the Enter guard.
function NativeChoice({ type, onKeyDown, ...props }: ChoiceInputProps & { type: "radio" | "checkbox"; className: string }) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event)
    preventEnterSubmit(event)
  }

  return type === "radio" ? <input type="radio" {...props} onKeyDown={handleKeyDown} /> : <input type="checkbox" {...props} onKeyDown={handleKeyDown} />
}

// The input is named by the label text only; the description or detail is read after it, as its description.
function useChoiceIds(extra: ReactNode, ariaDescribedBy: string | undefined) {
  const id = useId()
  const labelId = `${id}-label`
  const extraId = extra ? `${id}-extra` : undefined
  const describedBy = [ariaDescribedBy, extraId].filter(Boolean).join(" ") || undefined
  return { labelId, extraId, describedBy }
}

// A full-width option card (8px corners): handover mode, repair outcome.
export function ChoiceCard({
  type,
  label,
  description,
  className,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: ChoiceBaseProps & { description?: ReactNode }) {
  const { labelId, extraId, describedBy } = useChoiceIds(description, ariaDescribedBy)

  return (
    <label data-slot="choice-card" className={cn(choiceCardClasses, className)}>
      <NativeChoice
        {...inputProps}
        type={type}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        className={cn(checkboxVariants(), "mt-0.5")}
      />
      <span className="grid min-w-0 gap-0.5">
        <span id={labelId} className="font-medium">
          {label}
        </span>
        {description ? (
          <span id={extraId} className="text-meta text-muted-foreground group-has-disabled:text-faint-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}

// A small inline option (6px corners, 32px from md like a sm button): optional columns, photo type, depreciation group.
export function ChoiceChip({
  type,
  label,
  detail,
  className,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}: ChoiceBaseProps & { detail?: ReactNode }) {
  const { labelId, extraId, describedBy } = useChoiceIds(detail, ariaDescribedBy)

  return (
    <label data-slot="choice-chip" className={cn(choiceChipClasses, className)}>
      <NativeChoice
        {...inputProps}
        type={type}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        className={checkboxVariants()}
      />
      <span id={labelId}>{label}</span>
      {detail ? (
        <span id={extraId} className="text-meta text-faint-foreground">
          {detail}
        </span>
      ) : null}
    </label>
  )
}
