"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { FieldError, FieldHint, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { AssetOperationMode } from "@/lib/asset-operation-eligibility"
import {
  assetOperationNoHolderGroupKey,
  assetOperationPickerDebounceMs,
  buildAssetOperationSearchUrl,
  buildAssetOperationSections,
  getAssetOperationCountLine,
  getAssetOperationPickerState,
  getAssetOperationRowDetail,
  getAssetOperationRowView,
  moveAssetOperationActive,
  resolveAssetOperationActive,
  type AssetOperationPickerContext,
  type AssetOperationPickerResult,
} from "@/lib/asset-operation-picker-rules"
import {
  assetOperationSearchMaxChars,
  type AssetOperationSearchAnswer,
  type AssetOperationSearchRow,
} from "@/lib/asset-operation-search-rules"
import { formatCount } from "@/lib/display-format"
import { splitSearchHighlight } from "@/lib/search-highlight"
import { cn, formatDate } from "@/lib/utils"

type AssetOperationPickerBaseProps = {
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
}

export type AssetOperationPickerProps =
  | (AssetOperationPickerBaseProps & { multiple?: false; value: AssetOperationSearchRow | null; onChange: (row: AssetOperationSearchRow | null) => void })
  | (AssetOperationPickerBaseProps & { multiple: true; values: AssetOperationSearchRow[]; onChange: (rows: AssetOperationSearchRow[]) => void })

const noRows: AssetOperationSearchRow[] = []
const noIds: ReadonlySet<string> = new Set()

// The asset field of the transaction pages (server search spec 6.1). It asks the bounded server search and never holds
// a list of the register. The list sits inline under the field and closes through the root's onBlur.
export function AssetOperationPicker(props: AssetOperationPickerProps) {
  const { id, label, mode, context, hint, error, required, initialQuery } = props
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
  const [announcement, setAnnouncement] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const focusRequest = useRef<"search" | "change" | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  // Set by the arrow keys only, so a hover never scrolls the list (final review I-1).
  const keyboardMove = useRef(false)

  const value = props.multiple ? null : props.value
  const values = props.multiple ? props.values : noRows
  const showSearch = props.multiple || !value

  const requestUrl = buildAssetOperationSearchUrl({ mode, q: query, context })
  const state = getAssetOperationPickerState({ query, requestKey: requestUrl, result })
  const answer: AssetOperationSearchAnswer | null = state === "results" && result ? result.answer : null
  const sections = answer ? buildAssetOperationSections(answer) : []
  const flatRows = sections.flatMap((section) => section.rows)
  const chosenIds = props.multiple ? new Set(values.map((row) => row.id)) : noIds
  const selectableRows = flatRows.map((row) => ({ id: row.id, selectable: getAssetOperationRowView(row, chosenIds).selectable }))
  const activeIndex = resolveAssetOperationActive(selectableRows, activeId)
  const listOpen = open && state === "results"
  const countLine = getAssetOperationCountLine(answer ?? { total: 0, rows: noRows })
  const countText = countLine.more
    ? t("resultCountMore", { count: formatCount(countLine.count), shown: formatCount(countLine.shown) })
    : tCommon("searchSelectResultCount", { count: formatCount(countLine.count) })
  const chosenBlockedReason = value && !value.eligible ? value.reasonKey : null
  const shownError = error ?? (chosenBlockedReason ? tAll(chosenBlockedReason) : null)
  const errorId = shownError ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(" ")
  const stateText =
    state === "loading" ? t("searching") : state === "empty" ? t("notFound") : state === "error" ? t("failed") : countText
  const liveText = state === "hint" ? announcement : open ? stateText : ""

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
  }, [value, values])

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
    if (!getAssetOperationRowView(row, chosenIds).selectable) return
    if (props.multiple) {
      props.onChange([...values, row])
      setQuery("")
      setActiveId(null)
      setAnnouncement(t("selectedTitle", { count: values.length + 1 }))
      return
    }
    props.onChange(row)
    setOpen(false)
    focusRequest.current = "change"
  }

  function change() {
    if (props.multiple) return
    props.onChange(null)
    setQuery("")
    setActiveId(null)
    focusRequest.current = "search"
  }

  function remove(row: AssetOperationSearchRow) {
    if (!props.multiple) return
    props.onChange(values.filter((item) => item.id !== row.id))
    setAnnouncement(t("selectedTitle", { count: values.length - 1 }))
    searchRef.current?.focus()
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    setOpen(true)
    setActiveId(null)
    setAnnouncement("")
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

  const term = query.trim()

  function renderRow(row: AssetOperationSearchRow) {
    const index = flatRows.indexOf(row)
    const view = getAssetOperationRowView(row, chosenIds)
    const note = view.note
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
          "flex min-h-11 min-w-0 flex-col justify-center gap-0.5 border-b border-border-soft px-3 py-2 text-left text-sm last:border-b-0",
          view.selectable ? "cursor-pointer text-foreground" : "cursor-default text-faint-foreground",
          index === activeIndex && "bg-primary-soft",
        )}
      >
        <span className="min-w-0 break-words">
          <span className="tag font-medium">
            <TagHighlight value={row.assetTag} term={term} />
          </span>
          {" · "}
          {row.name}
        </span>
        <span className={cn("block min-w-0 break-words text-meta", view.selectable && "text-muted-foreground")}>
          <RowDetail row={row} />
        </span>
        {note ? (
          <span data-asset-option-reason className={cn("text-meta", note.kind === "chosen" ? "text-muted-foreground" : "text-warning")}>
            {note.kind === "chosen" ? t("chosen") : tAll(note.key)}
          </span>
        ) : null}
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
      <FieldHint id={hintId}>{hint ?? t(mode === "checkin" ? "hintCheckin" : "hint")}</FieldHint>
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
                            <TagHighlight value={section.group.label} term={term} />
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
              <p data-asset-search-count className="border-t border-border-soft px-3 py-2 text-meta text-primary">
                {countText}
              </p>
            </>
          )}
        </div>
      ) : null}
      {props.multiple && values.length > 0 ? (
        <div className="mt-1.5 grid min-w-0 gap-1.5">
          <p className="text-sm font-medium text-foreground">{t("selectedTitle", { count: values.length })}</p>
          <ul className="max-h-56 divide-y divide-border-soft overflow-y-auto rounded-md border border-border bg-surface">
            {values.map((row) => (
              <li key={row.id} data-asset-picked={row.id} className="flex min-h-11 min-w-0 items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 break-words">
                  <span className="tag font-medium">{row.assetTag}</span>
                  {" · "}
                  {row.name}
                </span>
                <Button variant="outline" size="icon-sm" onClick={() => remove(row)} aria-label={t("removeNamed", { tag: row.assetTag })}>
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">{liveText}</span>
    </div>
  )
}

// A row's second line, and the chosen box's: the handover document, ข้อมูลเก่า, or the status and the place.
function RowDetail({ row }: { row: AssetOperationSearchRow }) {
  const t = useTranslations("assetOperation")
  const detail = getAssetOperationRowDetail(row)
  if (detail.kind === "handover") return <>{t("handoverLine", { documentNo: detail.documentNo, date: formatDate(detail.checkoutDate) })}</>
  if (detail.kind === "legacy") return <>{t("legacyLine")}</>
  return <>{[detail.statusLabel, detail.placeLabel].join(" · ")}</>
}

// The typed part in a <mark>, as GlobalSearch shows it.
function TagHighlight({ value, term }: { value: string; term: string }) {
  const parts = splitSearchHighlight(value, term)
  if (!parts) return <>{value}</>
  return (
    <>
      {parts[0]}
      <mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">{parts[1]}</mark>
      {parts[2]}
    </>
  )
}
