"use client"

import { useRef, type ReactNode, type RefObject } from "react"
import { Camera } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  getAuditItemBadge,
  splitSearchHighlight,
  type AuditScanItemRow,
  type AuditScanRoom,
  type AuditSearchMatch,
} from "@/lib/audit-scan-session"
import { getPanelClasses } from "@/lib/design-system"
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
      {/* The shared search box with its own clear button and the camera as its one trailing button (spec 2D D2, M29). */}
      <SearchField
        ref={inputRef}
        type="text"
        fieldSize="xl"
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
        onClear={onClear}
        clearLabel={t("searchClear")}
        trailing={
          <Button
            variant={cameraOpen ? "default" : "ghost"}
            size="icon"
            aria-label={cameraOpen ? t("stopCamera") : t("openCamera")}
            aria-pressed={cameraOpen}
            onClick={onToggleCamera}
          >
            <Camera className="size-5" aria-hidden="true" />
          </Button>
        }
      />
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
          <p className="px-1 pb-1 text-meta text-muted-foreground">{t("searchResultCount", { count: matches.length })}</p>
          <ul className={cn(getPanelClasses(), "divide-y divide-border overflow-hidden")}>
            {matches.map((match) => {
              const line = detail(match)
              const badge = queuedAssetIds.has(match.item.assetId) ? "queued" : getAuditItemBadge(match.item)
              const elsewhere = room.locationId && match.item.expectedLocationId !== room.locationId
              const place = locationLabels.get(match.item.expectedLocationId) ?? match.item.expectedLocationId
              return (
                <li key={match.item.itemId}>
                  {/* A raw button on purpose: the whole result row opens the check sheet (2D-5 lists it). */}
                  <button
                    type="button"
                    onClick={() => onOpen(match.item)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">
                        <span className="tag font-medium">{match.field === "assetTag" ? highlight(match.item.assetTag) : match.item.assetTag}</span>
                      </span>
                      <span className="block truncate text-meta text-muted-foreground">
                        {line.prefix}
                        {match.field === "assetTag" ? line.value : highlight(line.value)}
                      </span>
                      {place ? <span data-audit-scan-result-room className={cn("block break-words text-meta", elsewhere ? "font-medium text-warning" : "text-muted-foreground")}>{elsewhere ? t("inLocation", { location: place }) : place}</span> : null}
                    </span>
                    {badge === "queued" ? (
                      <StatusBadge label={t("badgeQueued")} tone="muted" className="shrink-0" />
                    ) : badge ? (
                      <StatusBadge label={t(badge === "found" ? "badgeFound" : badge === "mismatch" ? "badgeMismatch" : badge === "not_found" ? "badgeNotFound" : "badgeOutOfScope")} tone={badge === "found" ? "success" : badge === "mismatch" ? "warning" : badge === "not_found" ? "danger" : "info"} className="shrink-0" />
                    ) : (
                      <StatusBadge label={t("badgePending")} tone="muted" className="shrink-0" />
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
