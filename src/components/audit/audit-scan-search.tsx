"use client"

import { useId, useRef, type ReactNode, type RefObject } from "react"
import { Camera } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  getAuditItemBadge,
  splitSearchHighlight,
  type AuditScanItemRow,
  type AuditScanListScope,
  type AuditSearchMatch,
  type AuditSearchResult,
} from "@/lib/audit-scan-session"
import { getPanelClasses } from "@/lib/design-system"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

export function AuditScanSearchField({
  value,
  hint,
  cameraOpen,
  inputRef,
  onValueChange,
  onTermChange,
  onSubmit,
  onToggleCamera,
  onClear,
}: {
  value: string
  /** The out-of-scope box's hint (spec §11), tied to the box as its description; null when not asked for. */
  hint: string | null
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
  const hintId = useId()

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
        aria-describedby={hint ? hintId : undefined}
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
      {hint ? <p id={hintId} className="mt-1 px-1 text-meta text-muted-foreground">{hint}</p> : null}
    </form>
  )
}

export function AuditScanSearchResults({
  term,
  search,
  limit,
  scope,
  onShowMore,
  locationLabels,
  queuedAssetIds,
  onOpen,
  lookup,
  lookupAfterMatches,
}: {
  term: string
  /** Every own match, an exact code first, then the chosen room's, with the true total (bug 20, P3-R5, P3-R17). */
  search: AuditSearchResult
  /** How many rows show: auditScanSearchPageSize, plus as many again per "แสดงเพิ่ม". */
  limit: number
  scope: AuditScanListScope
  onShowMore: () => void
  locationLabels: ReadonlyMap<string, string>
  queuedAssetIds: ReadonlySet<string>
  onOpen: (item: AuditScanItemRow) => void
  lookup: ReactNode
  /** After the out-of-scope box the find is not among the matches, so the register lookup stays under them. */
  lookupAfterMatches: boolean
}) {
  const t = useTranslations("auditScan")
  const matches = search.matches
  const shown = matches.slice(0, limit)
  const resultLine = scope === "room"
    ? t("searchResultInRoom", { term: term.trim(), inRoom: formatCount(search.inRoom), otherRooms: formatCount(search.otherRooms) })
    : t("searchResultInRound", { term: term.trim(), count: formatCount(search.total) })

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
    <section data-audit-scan-results className="mt-2">
      <p role="status" className="sr-only">{matches.length > 0 ? resultLine : t("searchNoResult")}</p>
      {matches.length === 0 ? lookup : (
        <>
          <p className="px-1 pb-1 text-meta text-muted-foreground">{resultLine}</p>
          <ul className={cn(getPanelClasses(), "divide-y divide-border overflow-hidden")}>
            {shown.map((match) => {
              const line = detail(match)
              const badge = queuedAssetIds.has(match.item.assetId) ? "queued" : getAuditItemBadge(match.item)
              const elsewhere = match.elsewhere
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
          {matches.length > shown.length ? (
            <Button variant="outline" onClick={onShowMore} className="mt-2 w-full">
              {t("showMore")}
            </Button>
          ) : null}
          {lookupAfterMatches ? <div className="mt-2">{lookup}</div> : null}
        </>
      )}
    </section>
  )
}
