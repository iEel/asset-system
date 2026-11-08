"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { FilterMenuChip } from "@/components/ui/filter-menu-chip"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type RepairDateRangeChipLabels = { chip: string; applied: string; apply: string; clear: string; from: string; to: string }

// The repair list's date range (group 5 plan 5, G5P5-R8, spec §11.3): a FilterMenuChip popover with the two dates. The
// popover is portaled outside the toolbar's GET form, so its inputs and its button join that form through the form
// attribute. Radix unmounts the closed popover, so while it is closed the applied dates ride in hidden inputs: a search
// typed in the toolbar keeps them, and only one input per name is ever in the form.
// Group 12 plan 2 task 3: optional quick presets (the system log's วันนี้ · 7 วัน · 30 วัน) render as link chips at the
// top of the popover; without them (the repair list, the disposal queue) the chip is exactly as before.
export function RepairDateRangeChip({ formId, dateFrom, dateTo, labels, clearHref, presets }: {
  formId: string
  dateFrom: string
  dateTo: string
  labels: RepairDateRangeChipLabels
  clearHref: string
  presets?: { key: string; label: string; href: string; active: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const active = Boolean(dateFrom || dateTo)

  return (
    <>
      {!open && dateFrom ? <input type="hidden" name="dateFrom" form={formId} value={dateFrom} /> : null}
      {!open && dateTo ? <input type="hidden" name="dateTo" form={formId} value={dateTo} /> : null}
      <FilterMenuChip
        label={labels.chip}
        valueText={active ? labels.applied : labels.chip}
        wholeText
        active={active}
        open={open}
        onOpenChange={setOpen}
      >
        <div className="grid gap-3">
          {presets && presets.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Link
                  key={preset.key}
                  href={preset.href}
                  aria-current={preset.active ? "true" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), preset.active && "border-primary-border bg-primary-soft text-primary-hover")}
                >
                  {preset.label}
                </Link>
              ))}
            </div>
          ) : null}
          <Field label={labels.from}>
            <Input type="date" name="dateFrom" form={formId} defaultValue={dateFrom} />
          </Field>
          <Field label={labels.to}>
            <Input type="date" name="dateTo" form={formId} defaultValue={dateTo} />
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" form={formId} size="sm">
              {labels.apply}
            </Button>
            {active ? (
              <Link href={clearHref} onClick={() => setOpen(false)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {labels.clear}
              </Link>
            ) : null}
          </div>
        </div>
      </FilterMenuChip>
    </>
  )
}
