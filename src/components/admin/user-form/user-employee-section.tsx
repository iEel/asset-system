"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { FormSection } from "@/components/ui/form-section"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { linkVariants } from "@/components/ui/button-variants"
import type { UserFormEmployee } from "@/lib/admin-user-form-data"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import { cn } from "@/lib/utils"

// พนักงานที่ผูก (spec §5.2). The picker offers only employees who still work here and have no account; the employee
// already linked is loaded even when they have left and shows as the card, with a "พนักงานลาออกแล้ว" badge. The card
// has เปลี่ยน (back to the picker) and เลิกผูก. A refusal under the field (employeeHasUser) opens the picker again.
// Choosing unmounts the picker and เลิกผูก unmounts the card, so focus moves to the card's เปลี่ยน or to the picker's
// trigger once it is there, never to the page body (final review, WCAG 2.4.3).
export function UserEmployeeSection({
  employees,
  value,
  error,
  canViewAssets,
  onChange,
}: {
  employees: UserFormEmployee[]
  value: string
  error: string | undefined
  canViewAssets: boolean
  onChange: (employee: UserFormEmployee | null) => void
}) {
  const locale = useLocale()
  const t = useTranslations("adminUsersPage")
  const tCommon = useTranslations("common")
  const [picking, setPicking] = useState(false)
  const [pendingFocus, setPendingFocus] = useState<"card" | "picker" | null>(null)
  const changeButtonRef = useRef<HTMLButtonElement>(null)
  const selected = employees.find((employee) => employee.id === value) ?? null
  const showPicker = !selected || picking || Boolean(error)
  const options = employees
    .filter((employee) => !employee.hasLeft)
    .map((employee) => ({
      id: employee.id,
      label: employee.fullNameTh,
      description: `${employee.code} · ${employee.departmentName} · ${employee.branchName}`,
      keywords: employee.code,
    }))

  // A frame after the render, so the popover has finished closing and the new control is mounted.
  useEffect(() => {
    if (!pendingFocus) return
    const frame = requestAnimationFrame(() => {
      if (pendingFocus === "card") changeButtonRef.current?.focus()
      else document.getElementById("admin-user-employee")?.focus()
      setPendingFocus(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [pendingFocus])

  function choose(id: string) {
    setPicking(false)
    onChange(employees.find((employee) => employee.id === id) ?? null)
    setPendingFocus("card")
  }

  function unlink() {
    onChange(null)
    setPendingFocus("picker")
  }

  return (
    <FormSection
      title={
        <span id="admin-user-employee-heading" className="flex flex-wrap items-baseline gap-x-2">
          {t("form.employeeSection")}
          <span className="text-meta font-normal text-muted-foreground">{t("form.optional")}</span>
        </span>
      }
    >
      <div className="grid gap-3">
        {selected ? (
          <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-start">
            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 break-words font-medium text-foreground">{selected.fullNameTh}</span>
                {selected.hasLeft ? <StatusBadge label={t("employeeLeft")} tone="warning" /> : null}
              </div>
              <span className="min-w-0 break-words text-meta text-muted-foreground">
                {selected.code} · {selected.departmentName} · {selected.branchName}
              </span>
              {selected.heldAssetCount > 0 ? (
                canViewAssets ? (
                  <Link
                    href={buildExactAssetRegisterHref(locale, { custodianId: selected.id })}
                    className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}
                  >
                    {t("form.heldAssets", { count: selected.heldAssetCount })}
                  </Link>
                ) : (
                  <span className="text-meta text-muted-foreground">{t("form.heldAssets", { count: selected.heldAssetCount })}</span>
                )
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button ref={changeButtonRef} variant="outline" size="sm" onClick={() => setPicking(true)}>
                {t("form.change")}
              </Button>
              <Button variant="ghost" size="sm" onClick={unlink}>
                {t("form.unlink")}
              </Button>
            </div>
          </div>
        ) : null}
        {showPicker ? (
          <SearchableSelect
            id="admin-user-employee"
            label={t("employee")}
            value={selected && !selected.hasLeft ? selected.id : ""}
            options={options}
            placeholder={t("form.employeeSearch")}
            searchPlaceholder={t("form.employeeSearch")}
            emptyLabel={tCommon("searchSelectNoResults")}
            hint={t("form.employeeHint")}
            error={error}
            onChange={choose}
          />
        ) : null}
      </div>
    </FormSection>
  )
}
