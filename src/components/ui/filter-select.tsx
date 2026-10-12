import type React from "react"
import { Field } from "@/components/ui/field"
import type { FieldSize } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"

export type FilterSelectOption = { value: string; label: string }

type FilterSelectProps = Omit<React.ComponentProps<"select">, "size" | "multiple" | "className"> & {
  // The visible label (13/20 500, like every Field), or a screen-reader label with hideLabel.
  label: string
  options?: readonly FilterSelectOption[]
  // Puts <option value=""> first, for "all".
  allLabel?: string
  // lg (40px) for a filter panel with visible labels; a toolbar passes md (36px). Below md both are 44px.
  fieldSize?: FieldSize
  // Toolbars: the label is sr-only and the first option shows the name instead.
  hideLabel?: boolean
  // One help button beside the label (AssetStateHelpPopover on the register).
  labelAction?: React.ReactNode
  // On the Field wrapper, for layout only (col-span, width). Change the height through fieldSize.
  className?: string
}

// A list filter: Field (label and id through useId) around NativeSelect. Server-safe: no directive and no hook of its
// own. Works uncontrolled (name + defaultValue in a GET form) or controlled (value + onChange from a client component).
// Options render in this order: allLabel, options, children. Never use it in place of SearchableSelect.
export function FilterSelect({ label, options, allLabel, fieldSize = "lg", hideLabel, labelAction, className, children, ...selectProps }: FilterSelectProps) {
  return (
    <Field label={label} hideLabel={hideLabel} labelAction={labelAction} className={className}>
      <NativeSelect fieldSize={fieldSize} {...selectProps}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </NativeSelect>
    </Field>
  )
}
