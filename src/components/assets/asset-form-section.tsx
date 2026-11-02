"use client"

import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { FormDisclosure } from "@/components/ui/form-disclosure"
import { FormSection } from "@/components/ui/form-section"
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

// A group of the required card (ข้อมูลพื้นฐาน, ความเป็นเจ้าของ, ที่ตั้งและสถานะ): a heading row inside the card, never a
// panel in a panel (group 4 plan 2 Task 6a).
export function CardGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <FormSection title={title} as="h3">
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
    </FormSection>
  )
}

// What the form hands each folded section: whether it is open, its one-line summary, its count and its frame.
export type AssetFormDisclosure = Omit<React.ComponentProps<typeof FormDisclosure>, "id" | "title" | "children">

// An optional section of the form, folded behind its summary row (spec §8, P2-R11), with the grid a Section has.
export function FoldedSection({ id, title, disclosure, children }: { id?: string; title: string; disclosure: AssetFormDisclosure; children: React.ReactNode }) {
  return (
    <FormDisclosure id={id} title={title} {...disclosure}>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">{children}</div>
    </FormDisclosure>
  )
}

// Keeps the name and props it had before 2C, so its 12 call sites stay as they are. hint carries the help line
// that used to sit in a <p> under 3 of them (spec 2C section 4.3 F6).
export function SelectField({
  label,
  id,
  value,
  required,
  disabled,
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
  // The department locked to the holder's (group 4 plan 2 Task 6b).
  disabled?: boolean
  hint?: React.ReactNode
  error?: React.ReactNode
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} id={id} required={required} hint={hint} error={error}>
      <NativeSelect value={value} required={required} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {children}
      </NativeSelect>
    </Field>
  )
}
