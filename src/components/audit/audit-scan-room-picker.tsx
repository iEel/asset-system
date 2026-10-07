"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useMediaQuery } from "@/components/ui/use-media-query"
import type { AuditRoomOption, AuditScanRoom } from "@/lib/audit-scan-session"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AuditScanRoomPicker({
  room,
  rooms,
  onRoomChange,
}: {
  room: AuditScanRoom
  rooms: AuditRoomOption[]
  onRoomChange: (room: AuditScanRoom) => void
}) {
  const t = useTranslations("auditScan")
  const tCommon = useTranslations("common")
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const listRef = useRef<HTMLUListElement | null>(null)
  const selected = rooms.find((option) => option.locationId === room.locationId)
  const selectedDepartment = selected?.departments.find((department) => department.departmentId === room.departmentId)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return needle ? rooms.filter((option) => option.label.toLocaleLowerCase().includes(needle)) : rooms
  }, [query, rooms])

  function choose(next: AuditScanRoom) {
    onRoomChange(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery("") }}>
      <SheetTrigger asChild>
        <button
          type="button"
          data-audit-scan-room
          className={cn(
            "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected ? "border-info-border bg-primary-soft text-primary" : "border-dashed border-border bg-surface text-muted-foreground hover:bg-accent",
          )}
        >
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {selected ? [selected.label, selectedDepartment?.label].filter(Boolean).join(" · ") : t("roomPick")}
          </span>
          {selected ? <span className="shrink-0 text-xs">{t("roomChange")}</span> : null}
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        closeLabel={tCommon("close")}
        className={isDesktop ? "w-full gap-0 sm:max-w-md" : "max-h-[85dvh] gap-0 rounded-t-xl"}
        onOpenAutoFocus={(event) => {
          // Radix would focus the search box first, which raises the phone keyboard over the list.
          event.preventDefault()
          const list = listRef.current
          ;(list?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? list?.querySelector<HTMLButtonElement>("button"))?.focus()
        }}
      >
        <SheetHeader className="border-b border-border pr-14">
          <SheetTitle>{t("roomSheetTitle")}</SheetTitle>
          <SheetDescription>{t("roomSheetHelp")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 border-b border-border p-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("roomSheetSearch")}
            aria-label={t("roomSheetSearch")}
            className={getFieldControlClasses()}
          />
          {selected && selected.departments.length > 0 ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("roomDepartment")}</span>
              <select
                value={room.departmentId}
                onChange={(event) => choose({ locationId: room.locationId, departmentId: event.target.value })}
                className={getFieldControlClasses()}
              >
                <option value="">{t("roomAllDepartments")}</option>
                {selected.departments.map((department) => (
                  <option key={department.departmentId} value={department.departmentId}>
                    {department.label} ({department.total})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.map((option) => {
            const active = option.locationId === room.locationId
            return (
              <li key={option.locationId}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose({ locationId: option.locationId, departmentId: "" })}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "bg-primary-soft text-primary",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t("roomPendingOfTotal", { pending: option.pending, total: option.total })}
                  </span>
                  {active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={() => choose({ locationId: "", departmentId: "" })}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("roomClear")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
