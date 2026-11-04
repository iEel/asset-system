"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { Field } from "@/components/ui/field"
import { FilterMenuChip } from "@/components/ui/filter-menu-chip"
import { Input } from "@/components/ui/input"

export type RepairDateRangeChipLabels = { chip: string; applied: string; apply: string; clear: string; from: string; to: string }

// The repair list's date range (group 5 plan 5, G5P5-R8, spec §11.3): a FilterMenuChip popover with the two dates. The
// popover is portaled outside the toolbar's GET form, so its inputs and its button join that form through the form
// attribute. Radix unmounts the closed popover, so while it is closed the applied dates ride in hidden inputs: a search
// typed in the toolbar keeps them, and only one input per name is ever in the form.
export function RepairDateRangeChip({ formId, dateFrom, dateTo, labels, clearHref }: {
  formId: string
  dateFrom: string
  dateTo: string
  labels: RepairDateRangeChipLabels
  clearHref: string
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
