"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { AssetThumbnail } from "@/components/assets/asset-thumbnail"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AssetOperationMode } from "@/lib/asset-operation-eligibility"
import {
  assetOperationNoHolderGroupKey,
  assetOperationPickerDebounceMs,
  buildAssetOperationSearchUrl,
  buildAssetOperationSections,
  getAssetOperationCountLine,
  getAssetOperationPickerState,
  getAssetOperationRowBadge,
  getAssetOperationRowDetail,
  getAssetOperationRowView,
  moveAssetOperationActive,
  resolveAssetOperationActive,
  type AssetOperationPickerContext,
  type AssetOperationPickerResult,
  type AssetOperationRowBadgeView,
} from "@/lib/asset-operation-picker-rules"
import {
  assetOperationSearchMaxChars,
  splitAssetOperationSearchWords,
  type AssetOperationSearchAnswer,
  type AssetOperationSearchGroup,
  type AssetOperationSearchRow,
} from "@/lib/asset-operation-search-rules"
import { formatCount } from "@/lib/display-format"
import { splitSearchHighlightWords } from "@/lib/search-highlight"
import { cn, formatDate } from "@/lib/utils"

export type AssetOperationPickerProps = {
  /** Names the root, so a save's focusFirst reaches the search field (or "เปลี่ยน"). */
  id: string
  label: string
  mode: AssetOperationMode
  context?: AssetOperationPickerContext
  /** Default: what can be typed for the mode. */
  hint?: React.ReactNode
  error?: React.ReactNode
  required?: boolean
  /** รับคืน ?assetId=: the search starts filled and open (spec 6.4). */
  initialQuery?: string
  /** One asset: replaces the chosen box's text (ส่งมอบ's asset card, group 3 spec §7.1); data-asset-picked and เปลี่ยน stay. */
  pickedBody?: (row: AssetOperationSearchRow) => React.ReactNode
  value: AssetOperationSearchRow | null
  onChange: (row: AssetOperationSearchRow | null) => void
  /** A refused row this accepts can still be picked, so its reason reads under the field (group 3 spec §19.3, A1-R1). */
  pickBlocked?: (row: AssetOperationSearchRow) => boolean
  /** รับคืน's holder group: an action after the group's count (รับคืนทั้งหมดของ {holder}, group 7 plan 4); null for none. */
  groupAction?: (group: AssetOperationSearchGroup) => React.ReactNode
}

const noRows: AssetOperationSearchRow[] = []

// The asset field of the transaction pages (server search spec 6.1). It asks the bounded server search and never holds
// a list of the register. The list sits inline under the field and closes through the root's onBlur.
export function AssetOperationPicker(props: AssetOperationPickerProps) {
  const { id, label, mode, context, hint, error, required, initialQuery, pickedBody, value, onChange, pickBlocked } = props
  const t = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const searchId = `${id}-search`
  const listboxId = `${id}-listbox`
  const labelId = `${id}-label`
  const hintId = `${id}-hint`

  const [query, setQuery] = useState(initialQuery ?? "")
  const [open, setOpen] = useState(Boolean(initialQuery))
  const [result, setResult] = useState<AssetOperationPickerResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const focusRequest = useRef<"search" | "change" | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  // Set by the arrow keys only, so a hover never scrolls the list (final review I-1).
  const keyboardMove = useRef(false)

  const showSearch = !value

  const requestUrl = buildAssetOperationSearchUrl({ mode, q: query, context })
  const state = getAssetOperationPickerState({ query, requestKey: requestUrl, result })
  const answer: AssetOperationSearchAnswer | null = state === "results" && result ? result.answer : null
  const sections = answer ? buildAssetOperationSections(answer) : []
  const flatRows = sections.flatMap((section) => section.rows)
  // Whether a row can be taken, for the pointer, the arrows, Enter and the row's look alike (A1-R1).
  const rowView = (row: AssetOperationSearchRow) => getAssetOperationRowView(row, pickBlocked && (() => pickBlocked(row)))
  const selectableRows = flatRows.map((row) => ({ id: row.id, selectable: rowView(row).selectable }))
  const activeIndex = resolveAssetOperationActive(selectableRows, activeId)
  const listOpen = open && state === "results"
  const countLine = getAssetOperationCountLine(answer ?? { total: 0, rows: noRows })
  const countText = countLine.more
    ? t("resultCountMore", { count: formatCount(countLine.count), shown: formatCount(countLine.shown) })
    : tCommon("searchSelectResultCount", { count: countLine.count })
  const chosenBlockedReason = value && !value.eligible ? value.reasonKey : null
  const shownError = error ?? (chosenBlockedReason ? tAll(chosenBlockedReason) : null)
  const errorId = shownError ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ")
  const stateText =
    state === "loading" ? t("searching") : state === "empty" ? t("notFound") : state === "error" ? t("failed") : countText
  // The polite region reads the state and the count while the list is open (spec 6.1).
  const liveText = open && state !== "hint" ? stateText : ""

  // An answer is kept under the URL it answers, so an older one never shows for a newer text (Review Focus 3).
  useEffect(() => {
    if (requestUrl === null) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(requestUrl, { signal: controller.signal })
        const payload = response.ok ? await response.json().catch(() => null) : null
        if (response.ok && payload?.data) setResult({ key: requestUrl, answer: payload.data as AssetOperationSearchAnswer })
        else setResult({ key: requestUrl, answer: null })
      } catch (failure) {
        if (!(failure instanceof DOMException && failure.name === "AbortError")) setResult({ key: requestUrl, answer: null })
      }
    }, assetOperationPickerDebounceMs)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [requestUrl, attempt])

  // Focus moves after the page has taken the pick or the change, so refs are never read during render.
  useEffect(() => {
    const request = focusRequest.current
    if (!request) return
    focusRequest.current = null
    if (request === "change") changeRef.current?.focus()
    else searchRef.current?.focus()
  }, [value])

  // aria-activedescendant keeps focus in the input, so the browser never scrolls the list: bring the row the arrows reach
  // into view (final review I-1).
  useEffect(() => {
    if (!keyboardMove.current || activeId === null) return
    keyboardMove.current = false
    listRef.current?.querySelector(`[data-asset-option="${activeId}"]`)?.scrollIntoView({ block: "nearest" })
  }, [activeId])

  function retry() {
    setResult(null)
    setAttempt((count) => count + 1)
    searchRef.current?.focus()
  }

  function pick(row: AssetOperationSearchRow) {
    if (!rowView(row).selectable) return
    onChange(row)
    setOpen(false)
    focusRequest.current = "change"
  }

  function change() {
    onChange(null)
    setQuery("")
    setActiveId(null)
    focusRequest.current = "search"
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    setOpen(true)
    setActiveId(null)
    focusRequest.current = null
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false)
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!listOpen) {
        setOpen(true)
        return
      }
      const next = moveAssetOperationActive(selectableRows, activeIndex, event.key === "ArrowDown" ? 1 : -1)
      if (next >= 0) {
        keyboardMove.current = true
        setActiveId(flatRows[next].id)
      }
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      if (listOpen && activeIndex >= 0) pick(flatRows[activeIndex])
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }

  const words = splitAssetOperationSearchWords(query)

  function renderRow(row: AssetOperationSearchRow) {
    const index = flatRows.indexOf(row)
    const view = rowView(row)
    const note = view.note
    const badge = getAssetOperationRowBadge(row)
    return (
      <li
        key={row.id}
        id={`${id}-option-${row.id}`}
        role="option"
        data-asset-option={row.id}
        aria-selected={index === activeIndex}
        aria-disabled={view.selectable ? undefined : true}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (view.selectable) setActiveId(row.id)
        }}
        onClick={() => pick(row)}
        className={cn(
          "flex min-h-11 min-w-0 items-center gap-3 border-b border-border-soft px-3 py-2 text-left text-sm last:border-b-0",
          view.selectable ? "cursor-pointer text-foreground" : "cursor-default text-faint-foreground",
          index === activeIndex && "bg-primary-soft",
        )}
      >
        {/* The register's photo (group 3 spec §19.5); decorative, the row's text names the asset. */}
        <AssetThumbnail photo={row.photo} assetTag={row.assetTag} assetName={row.name} size={40} preview={false} />
        <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <span className="min-w-0 break-words">
            <span className="tag font-medium">
              <WordsHighlight value={row.assetTag} words={words} />
            </span>
            {" · "}
            <WordsHighlight value={row.name} words={words} />
          </span>
          {badge ? <RowBadge badge={badge} /> : null}
          <span className={cn("block min-w-0 break-words text-meta", view.selectable && "text-muted-foreground")}>
            <RowDetail row={row} />
          </span>
          {note ? (
            <span data-asset-option-reason className="text-meta text-warning">
              {tAll(note.key)}
            </span>
          ) : null}
        </span>
      </li>
    )
  }

  return (
    <div
      id={id}
      data-slot="asset-operation-picker"
      data-invalid={shownError ? true : undefined}
      className="grid min-w-0 max-w-full content-start gap-1.5"
      onBlur={handleBlur}
    >
      <FieldLabel id={labelId} htmlFor={showSearch ? searchId : undefined} required={required}>
        {label}
      </FieldLabel>
      {!showSearch && value ? (
        <div
          data-asset-picked={value.id}
          className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
        >
          {pickedBody ? pickedBody(value) : (
            <span className="grid min-w-0 gap-0.5">
              <span className="min-w-0 break-words">
                <span className="tag font-medium">{value.assetTag}</span>
                {" · "}
                {value.name}
              </span>
              <span className="min-w-0 break-words text-meta text-muted-foreground">
                <RowDetail row={value} />
              </span>
            </span>
          )}
          <Button
            ref={changeRef}
            variant="outline"
            size="sm"
            onClick={change}
            aria-label={t("changeNamed", { label, tag: value.assetTag })}
            aria-describedby={errorId}
          >
            {t("change")}
          </Button>
        </div>
      ) : (
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint-foreground" aria-hidden="true" />
          <Input
            ref={searchRef}
            id={searchId}
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={tCommon("searchSelectPlaceholder")}
            role="combobox"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={listOpen}
            aria-activedescendant={listOpen && activeIndex >= 0 ? `${id}-option-${flatRows[activeIndex].id}` : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            aria-invalid={shownError ? true : undefined}
            autoComplete="off"
            maxLength={assetOperationSearchMaxChars}
            className="pl-9"
          />
        </div>
      )}
      {/* The hint tells people to type, so it shows only with the search field the combobox names it from (look step). */}
      {showSearch ? <FieldHint id={hintId}>{hint ?? t(mode === "checkin" ? "hintCheckin" : "hint")}</FieldHint> : null}
      {shownError ? <FieldError id={errorId}>{shownError}</FieldError> : null}
      {showSearch && open && state !== "hint" ? (
        <div className="min-w-0 overflow-hidden rounded-md border border-border bg-surface" onMouseDown={(event) => event.preventDefault()}>
          {state === "loading" ? (
            <p className="px-3 py-2 text-meta text-muted-foreground">{t("searching")}</p>
          ) : state === "empty" ? (
            <EmptyNote className="px-3 py-3">{t("notFound")}</EmptyNote>
          ) : state === "error" ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-meta text-danger">{t("failed")}</span>
              <Button variant="outline" size="sm" onClick={retry}>
                {tCommon("tryAgain")}
              </Button>
            </div>
          ) : (
            <>
              <ul role="listbox" ref={listRef} id={listboxId} aria-labelledby={labelId} className="max-h-80 overflow-y-auto">
                {sections.map((section, sectionIndex) =>
                  section.group ? (
                    <li key={section.group.key} role="presentation" data-asset-option-group={section.group.key}>
                      <div
                        id={`${id}-group-${sectionIndex}`}
                        className="border-b border-border-soft bg-background px-3 py-1.5 text-meta text-muted-foreground"
                      >
                        {section.group.key === assetOperationNoHolderGroupKey || section.group.label === null ? (
                          t("noHolderGroup")
                        ) : (
                          <>
                            <WordsHighlight value={section.group.label} words={words} />
                            {" · "}
                            {t("groupCount", { count: section.group.count })}
                          </>
                        )}
                      </div>
                      <ul role="group" aria-labelledby={`${id}-group-${sectionIndex}`}>
                        {section.rows.map(renderRow)}
                      </ul>
                    </li>
                  ) : (
                    section.rows.map(renderRow)
                  ),
                )}
              </ul>
              {/* A group's action (รับคืน's "รับคืนทั้งหมดของ {holder}") is a link, which a listbox may not hold (axe
                  aria-required-children), so each one stands under the list, outside it. */}
              {sections.map((section) => {
                const action = section.group ? props.groupAction?.(section.group) : null
                return action ? (
                  <p key={`action:${section.group?.key}`} data-asset-option-group-action={section.group?.key} className="min-w-0 break-words border-t border-border-soft px-3 py-2 text-meta">
                    {action}
                  </p>
                ) : null
              })}
              <p data-asset-search-count className="border-t border-border-soft px-3 py-2 text-meta text-primary">
                {countText}
              </p>
            </>
          )}
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">{liveText}</span>
    </div>
  )
}

// A row's second line, and the chosen box's: an outstanding component's parent and RT-, the handover document,
// ข้อมูลเก่า and its room, or the status and the place.
function RowDetail({ row }: { row: AssetOperationSearchRow }) {
  const t = useTranslations("assetOperation")
  const detail = getAssetOperationRowDetail(row)
  if (detail.kind === "outstanding") return <>{[t("outstandingLine", { parentTag: detail.parentTag }), detail.documentNo].filter(Boolean).join(" · ")}</>
  if (detail.kind === "handover") return <>{t("handoverLine", { documentNo: detail.documentNo, date: formatDate(detail.checkoutDate) })}</>
  if (detail.kind === "legacy") return <>{t("legacyLineAt", { location: detail.locationLabel })}</>
  return <>{[detail.statusLabel, detail.placeLabel].join(" · ")}</>
}

// รับคืน's badge (group 3 spec §8.2, P2-R17): มีใบส่งมอบ HO-…, ข้อมูลเก่า ไม่มีใบส่งมอบ or ส่วนควบค้างคืน, above the row's line.
function RowBadge({ badge }: { badge: AssetOperationRowBadgeView }) {
  const t = useTranslations("assetOperation")
  if (badge.kind === "handover") return <StatusBadge label={t("badgeHandover", { documentNo: badge.documentNo })} tone="info" className="self-start" />
  if (badge.kind === "legacy") return <StatusBadge label={t("badgeLegacy")} tone="warning" className="self-start" />
  return <StatusBadge label={t("badgeOutstanding")} tone="warning" className="self-start" />
}

// Each typed word in a <mark>, as GlobalSearch shows its term.
function WordsHighlight({ value, words }: { value: string; words: readonly string[] }) {
  return (
    <>
      {splitSearchHighlightWords(value, words).map((part, index) => (
        <Fragment key={index}>
          {part.marked ? <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{part.text}</mark> : part.text}
        </Fragment>
      ))}
    </>
  )
}
