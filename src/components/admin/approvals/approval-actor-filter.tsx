"use client"

import { useRef, useState } from "react"
import { FilterMenuChip } from "@/components/ui/filter-menu-chip"

export type ApprovalActorFilterLabels = {
  label: string
  all: string
  search: string
  empty: string
}

type ApprovalActorFilterProps = {
  // The chosen actorId from the URL ("" = everyone).
  value: string
  // Everyone with a decision row the viewer may see, "displayName · username".
  options: readonly { value: string; label: string }[]
  labels: ApprovalActorFilterLabels
  className?: string
}

// Group 12 plan 2 task 4 (spec §5, board AD-ApprovalHistory): ผู้ตัดสินใจ is a searchable FilterMenuChip inside the
// history's GET form, the pattern of the system log's ผู้ใช้ chip. Choosing one writes the hidden actorId input and
// submits the form, so the chosen tabs, the page size and the dates go along. "ทุกคน" disables the input, so the URL
// carries no empty actorId.
export function ApprovalActorFilter({ value, options, labels, className }: ApprovalActorFilterProps) {
  const [chosen, setChosen] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input ref={inputRef} type="hidden" name="actorId" value={chosen} disabled={!chosen} />
      <FilterMenuChip
        searchable
        label={labels.label}
        options={[{ value: "", label: labels.all }, ...options]}
        value={chosen}
        onValueChange={(next) => {
          setChosen(next)
          const input = inputRef.current
          if (!input) return
          // The state update renders later; the form reads the input now.
          input.value = next
          input.disabled = !next
          input.form?.requestSubmit()
        }}
        searchPlaceholder={labels.search}
        emptyLabel={labels.empty}
        className={className}
      />
    </>
  )
}
