"use client"

import { useRef, type ReactNode, type RefObject } from "react"
import { Camera, Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  getAuditItemBadge,
  splitSearchHighlight,
  type AuditScanItemRow,
  type AuditScanRoom,
  type AuditSearchMatch,
} from "@/lib/audit-scan-session"
import { getFieldControlClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function AuditScanSearchField({
  value,
  cameraOpen,
  inputRef,
  onValueChange,
  onTermChange,
  onSubmit,
  onToggleCamera,
  onClear,
}: {
  value: string
  cameraOpen: boolean
  inputRef: RefObject<HTMLInputElement | null>
  onValueChange: (value: string) => void
  onTermChange: (term: string) => void
  onSubmit: () => void
  onToggleCamera: () => void
  onClear: () => void
}) {
  const t = useTranslations("auditScan")
  const composingRef = useRef(false)

  return (
    <form
      role="search"
      data-audit-scan-search
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="sticky -top-4 sm:-top-6 z-20 -mx-4 bg-canvas px-4 py-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label={t("searchItemsLabel")}
          placeholder={t("searchItemsPlaceholder")}
          value={value}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={(event) => {
            composingRef.current = false
            onTermChange(event.currentTarget.value)
          }}
          onChange={(event) => {
            onValueChange(event.target.value)
            if (composingRef.current || (event.nativeEvent as InputEvent).isComposing) return
            onTermChange(event.target.value)
          }}
          className={cn(getFieldControlClasses(), "h-12 pl-9 pr-24 text-base sm:h-12")}
        />
        <div className="absolute inset-y-0 right-0.5 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              aria-label={t("searchClear")}
              onClick={onClear}
              className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={cameraOpen ? t("stopCamera") : t("openCamera")}
            aria-pressed={cameraOpen}
            onClick={onToggleCamera}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              cameraOpen ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "text-foreground hover:bg-accent",
            )}
          >
            <Camera className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </form>
  )
}

export function AuditScanSearchResults({
  term,
  matches,
  room,
  locationLabels,
  queuedAssetIds,
  onOpen,
  lookup,
}: {
  term: string
  matches: AuditSearchMatch[]
  room: AuditScanRoom
  locationLabels: ReadonlyMap<string, string>
  queuedAssetIds: ReadonlySet<string>
  onOpen: (item: AuditScanItemRow) => void
  lookup: ReactNode
}) {
  const t = useTranslations("auditScan")

  function detail(match: AuditSearchMatch) {
    if (match.field === "serialNumber") return { prefix: t("matchedSerial", { value: "" }), value: match.value }
    if (match.field === "fixedAssetCode") return { prefix: t("matchedFixedAsset", { value: "" }), value: match.value }
    if (match.field === "custodian") return { prefix: t("matchedCustodian", { value: "" }), value: match.value }
    return { prefix: "", value: match.item.name }
  }

  function highlight(value: string) {
    const parts = splitSearchHighlight(value, term)
    if (!parts) return value
    return (
      <>
        {parts[0]}
        <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{parts[1]}</mark>
        {parts[2]}
      </>
    )
  }

  return (
    <section data-audit-scan-results>
      <p role="status" className="sr-only">{matches.length > 0 ? t("searchResultCount", { count: matches.length }) : t("searchNoResult")}</p>
      {matches.length === 0 ? lookup : (
        <>
          <p className="px-1 pb-1 text-xs text-muted-foreground">{t("searchResultCount", { count: matches.length })}</p>
          <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
            {matches.map((match) => {
              const line = detail(match)
              const badge = queuedAssetIds.has(match.item.assetId) ? "queued" : getAuditItemBadge(match.item)
              const elsewhere = room.locationId && match.item.expectedLocationId !== room.locationId
              return (
                <li key={match.item.itemId}>
                  <button
                    type="button"
                    onClick={() => onOpen(match.item)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {match.field === "assetTag" ? highlight(match.item.assetTag) : match.item.assetTag}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {line.prefix}
                        {match.field === "assetTag" ? line.value : highlight(line.value)}
                      </span>
                    </span>
                    {badge === "queued" ? (
                      <StatusBadge size="xs" label={t("badgeQueued")} tone="muted" className="shrink-0" />
                    ) : badge ? (
                      <StatusBadge size="xs" label={t(badge === "found" ? "badgeFound" : badge === "mismatch" ? "badgeMismatch" : badge === "not_found" ? "badgeNotFound" : "badgeOutOfScope")} tone={badge === "found" ? "success" : badge === "mismatch" ? "warning" : badge === "not_found" ? "danger" : "info"} className="shrink-0" />
                    ) : elsewhere ? (
                      <StatusBadge size="xs" label={t("inLocation", { location: locationLabels.get(match.item.expectedLocationId) ?? match.item.expectedLocationId })} tone="warning" className="max-w-40 shrink-0" />
                    ) : (
                      <StatusBadge size="xs" label={t("badgePending")} tone="muted" className="shrink-0" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
