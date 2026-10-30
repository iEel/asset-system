import type { ReactNode } from "react"
import { ChoiceChip } from "@/components/ui/choice-card"
import { FieldGroup } from "@/components/ui/field-group"

export type AssetConditionChoiceProps = {
  id: string
  legend: ReactNode
  options: readonly { id: string; label: string }[]
  value: string
  onChange: (conditionId: string) => void
  error: ReactNode
  required: boolean
  disabled?: boolean
}

// The condition chips of ส่งมอบ, รับคืน and โอนย้าย (group 3 spec §5, §7.2): one FieldGroup of radio chips that wrap, in the
// caller's order (the master sortOrder). The group's id takes focus and its error is <id>-error; an empty value chooses none.
export function AssetConditionChoice({ id, legend, options, value, onChange, error, required, disabled = false }: AssetConditionChoiceProps) {
  return (
    <FieldGroup legend={legend} id={id} required={required} error={error}>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option.id}
            type="radio"
            name={id}
            value={option.id}
            label={option.label}
            checked={value === option.id}
            required={required}
            disabled={disabled}
            onChange={() => onChange(option.id)}
          />
        ))}
      </div>
    </FieldGroup>
  )
}
