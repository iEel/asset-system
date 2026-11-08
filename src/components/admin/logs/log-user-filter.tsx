"use client"

import { useRef, useState } from "react"
import { FilterMenuChip } from "@/components/ui/filter-menu-chip"
import { LOG_USER_INTEGRATION, LOG_USER_SYSTEM } from "@/lib/system-log-filters"

export type LogUserFilterLabels = {
  label: string
  all: string
  system: string
  integration: string
  search: string
  empty: string
}

type LogUserFilterProps = {
  // The chosen userId from the URL ("" = everyone).
  value: string
  // Every user, "displayName · username" (the dev DB has about 1,300), so the menu is searchable.
  options: readonly { value: string; label: string }[]
  labels: LogUserFilterLabels
  className?: string
}

// Spec §4, §15 item 6 (board AD-Logs): ผู้ใช้ is a searchable FilterMenuChip inside the page's one GET form. The two fixed
// options come first: "ระบบ (งานตามเวลา)" (logs with no user, not the integration API) and "Integration API". Choosing
// one writes the hidden userId input and submits the form, so the tag, the dates, the module and the action typed or
// chosen there go along. "ทุกคน" disables the input, so the URL carries no empty userId.
export function LogUserFilter({ value, options, labels, className }: LogUserFilterProps) {
  const [chosen, setChosen] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input ref={inputRef} type="hidden" name="userId" value={chosen} disabled={!chosen} />
      <FilterMenuChip
        searchable
        label={labels.label}
        options={[
          { value: "", label: labels.all },
          { value: LOG_USER_SYSTEM, label: labels.system },
          { value: LOG_USER_INTEGRATION, label: labels.integration },
          ...options,
        ]}
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
