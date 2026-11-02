"use client"

import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import type { useFieldErrors } from "@/components/ui/use-field-errors"
import type { AssetField } from "@/lib/asset-form-rules"

// The asset form's field-error hook, as its section files receive it (group 4 plan 2 Task 5).
export type AssetFormFieldErrors = ReturnType<typeof useFieldErrors<AssetField>>

// Spec 2D D9: each form section is a ContentPanel (16px title, 16/20px padding), the frame of every other panel.
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ContentPanel title={title}>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
    </ContentPanel>
  )
}

// Keeps the name and props it had before 2C, so its 12 call sites stay as they are. hint carries the help line
// that used to sit in a <p> under 3 of them (spec 2C section 4.3 F6).
export function SelectField({
  label,
  id,
  value,
  required,
  hint,
  error,
  onChange,
  children,
}: {
  label: string
  // The id focus moves to and the error is tied to (v-track M-R1).
  id?: string
  value: string
  required?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} hint={hint} error={error}>
      <NativeSelect value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
