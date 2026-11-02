"use client"

import { useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { FieldLabel } from "@/components/ui/field"
import { SearchField } from "@/components/ui/search-field"
import { StatusBadge } from "@/components/ui/status-badge"
import { moveAssetOperationActive, resolveAssetOperationActive } from "@/lib/asset-operation-picker-rules"
import { assetOperationSearchMaxChars } from "@/lib/asset-operation-search-rules"
import { formatMoney } from "@/lib/display-format"
import {
  buildPurchaseDocumentPickerUrl,
  focusAfterChipRemoval,
  getPurchaseDocumentChipView,
  getPurchaseDocumentPickerView,
  getPurchaseDocumentResultView,
  purchaseDocumentPickerDebounceMs,
  type PurchaseDocumentPickerResult,
} from "@/lib/purchase-document-picker-rules"
import type { PurchaseDocumentSearchAnswer, PurchaseDocumentSearchRow } from "@/lib/purchase-document-search-rules"
import { cn, formatDate } from "@/lib/utils"

export type PurchaseDocumentPickerProps = {
  /** Names the root; the search field is <id>-search. */
  id: string
  /** The documents chosen for the asset, in the order shown as chips. */
  chosen: PurchaseDocumentSearchRow[]
  /** The empty-query list the page rendered (P3-R4): shown with no request until the person types. */
  recent: PurchaseDocumentSearchAnswer
  /** The form's supplier: a change after mount asks that supplier's newest list. */
  supplierId: string | null
  onChoose: (row: PurchaseDocumentSearchRow) => void
  onRemove: (id: string) => void
  /** Edit: chips marked for removal at บันทึกการแก้ไข (P3-R5); "เก็บไว้" chooses the document again. */
  removedIds?: Set<string>
  /** Edit: the stored links, whose × marks the chip for removal (it stays); a chip chosen in this visit goes away. */
  storedIds?: ReadonlySet<string>
  disabled?: boolean
}

const noRows: PurchaseDocumentSearchRow[] = []

// The purchase-document search of the asset form (group 4 plan 3, spec §9.1-§9.2): the chosen chips, the shared search
// field as a combobox over an inline list, and the footer line. It asks the bounded server search only when the person
// types 2 characters or the supplier changes (P3-R4); the list the page rendered shows until then. The active row and
// the arrows are the transaction picker's (asset-operation-picker-rules.ts).
export function PurchaseDocumentPicker(props: PurchaseDocumentPickerProps) {
  const { id, chosen, recent, supplierId, onChoose, onRemove, removedIds, storedIds, disabled } = props
  const t = useTranslations("asset")
  const tOperation = useTranslations("assetOperation")
  const tCommon = useTranslations("common")
  const searchId = `${id}-search`
  const listboxId = `${id}-listbox`
  const labelId = `${id}-label`

  const [initialSupplierId] = useState(supplierId)
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<PurchaseDocumentPickerResult | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const chipsRef = useRef<HTMLUListElement>(null)
  // Set by the arrow keys only, so a hover never scrolls the list.
  const keyboardMove = useRef(false)

  const requestUrl = buildPurchaseDocumentPickerUrl({ query, supplierId, initialSupplierId })
  const view = getPurchaseDocumentPickerView({ requestKey: requestUrl, result, recent })
  const rows = view.state === "rows" ? view.answer.rows : noRows
  const resultView = (row: PurchaseDocumentSearchRow) => getPurchaseDocumentResultView(row, chosen, removedIds)
  const selectableRows = rows.map((row) => ({ id: row.id, selectable: !disabled && resultView(row).selectable }))
  const activeIndex = resolveAssetOperationActive(selectableRows, activeId)
  const listShown = view.state === "rows" && rows.length > 0
  const footerText = view.state === "rows" ? t("purchaseDocumentSearchFooter", { count: view.answer.total, total: view.answer.activeTotal }) : ""
  const liveText = view.state === "loading" ? tOperation("searching") : view.state === "error" ? tOperation("failed") : footerText

  // An answer is kept under the URL it answers, so an older one never shows for a newer text. No URL, no request.
  useEffect(() => {
    if (requestUrl === null) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(requestUrl, { signal: controller.signal })
        const payload = response.ok ? await response.json().catch(() => null) : null
        if (response.ok && payload?.data) setResult({ key: requestUrl, answer: payload.data as PurchaseDocumentSearchAnswer })
        else setResult({ key: requestUrl, answer: null })
      } catch (failure) {
        if (!(failure instanceof DOMException && failure.name === "AbortError")) setResult({ key: requestUrl, answer: null })
      }
    }, purchaseDocumentPickerDebounceMs)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [requestUrl, attempt])

  // aria-activedescendant keeps focus in the field, so bring the row the arrows reach into view.
  useEffect(() => {
    if (!keyboardMove.current || activeId === null) return
    keyboardMove.current = false
    listRef.current?.querySelector(`[data-purchase-document-option="${activeId}"]`)?.scrollIntoView({ block: "nearest" })
  }, [activeId])

  function retry() {
    setResult(null)
    setAttempt((count) => count + 1)
    searchRef.current?.focus()
  }

  function choose(row: PurchaseDocumentSearchRow) {
    if (disabled || !resultView(row).selectable) return
    onChoose(row)
  }

  function remove(row: PurchaseDocumentSearchRow) {
    // A stored chip on edit stays with "เก็บไว้" and keeps focus; a chip that goes away hands focus to the next chip's
    // button, else to the search, so focus never drops to the page (final review).
    const target = focusAfterChipRemoval({ chipIds: chosen.map((document) => document.id), removedId: row.id, storedIds })
    onRemove(row.id)
    if (target.to === "chip") chipsRef.current?.querySelector<HTMLButtonElement>(`[data-purchase-document-chip="${target.id}"] button`)?.focus()
    else if (target.to === "search") searchRef.current?.focus()
  }

  function handleQueryChange(next: string) {
    setQuery(next)
    setActiveId(null)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && query !== "") {
      event.preventDefault()
      handleQueryChange("")
      return
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const next = moveAssetOperationActive(selectableRows, activeIndex, event.key === "ArrowDown" ? 1 : -1)
      if (next >= 0) {
        keyboardMove.current = true
        setActiveId(rows[next].id)
      }
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      if (activeIndex >= 0) choose(rows[activeIndex])
    }
  }

  function renderChip(row: PurchaseDocumentSearchRow) {
    const chip = getPurchaseDocumentChipView(row, removedIds)
    const text = [
      t(`purchaseDocumentTypes.${chip.typeKey}`),
      chip.documentNo,
      chip.supplierName,
      t("purchaseDocumentLinkedCount", { count: chip.linkedCount }),
    ]
      .filter(Boolean)
      .join(" · ")
    return (
      <li
        key={row.id}
        data-purchase-document-chip={row.id}
        data-removed={chip.removed ? true : undefined}
        className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md border border-primary-border bg-primary-soft py-1 pl-3 pr-1 text-sm"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("min-w-0 break-words", chip.removed ? "text-muted-foreground line-through" : "text-foreground")}>{text}</span>
          {chip.inactive ? <StatusBadge label={t("purchaseDocumentInactive")} tone="muted" /> : null}
          {chip.removed ? <StatusBadge label={t("purchaseDocumentRemoving")} tone="warning" /> : null}
        </span>
        {chip.removed ? (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChoose(row)}
            aria-label={t("purchaseDocumentKeepNamed", { number: chip.documentNo })}
          >
            {t("purchaseDocumentKeep")}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={() => remove(row)}
            aria-label={t("purchaseDocumentRemoveNamed", { number: chip.documentNo })}
          >
            <X aria-hidden="true" />
          </Button>
        )}
      </li>
    )
  }

  function renderRow(row: PurchaseDocumentSearchRow, index: number) {
    const view = resultView(row)
    const selectable = selectableRows[index].selectable
    const meta = [
      view.supplierName,
      view.documentDate ? formatDate(view.documentDate) : null,
      view.amount === null ? null : formatMoney(view.amount, { unit: tCommon("baht") }),
    ].filter(Boolean)
    return (
      <li
        key={row.id}
        id={`${id}-option-${row.id}`}
        role="option"
        data-purchase-document-option={row.id}
        aria-selected={index === activeIndex}
        aria-disabled={view.selectable ? undefined : true}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (selectable) setActiveId(row.id)
        }}
        onClick={() => choose(row)}
        className={cn(
          "flex min-h-11 min-w-0 flex-col justify-center gap-0.5 border-b border-border-soft px-3 py-2 text-left text-sm last:border-b-0",
          selectable ? "cursor-pointer text-foreground" : "cursor-default text-muted-foreground",
          index === activeIndex && "bg-primary-soft",
        )}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 break-words">
            {t(`purchaseDocumentTypes.${view.typeKey}`)}
            {" · "}
            <span className="tag font-medium">{view.documentNo}</span>
          </span>
          {view.chosen ? <StatusBadge label={t("purchaseDocumentChosen")} tone="primary" /> : null}
        </span>
        {meta.length > 0 ? <span className="min-w-0 break-words text-meta text-muted-foreground">{meta.join(" · ")}</span> : null}
        <span className="min-w-0 break-words text-meta text-muted-foreground">
          {view.linked.names
            ? t("purchaseDocumentLinkedNames", { count: view.linked.count, names: view.linked.names })
            : t("purchaseDocumentLinkedCount", { count: view.linked.count })}
        </span>
      </li>
    )
  }

  return (
    <div id={id} data-slot="purchase-document-picker" className="grid min-w-0 max-w-full content-start gap-1.5">
      {chosen.length > 0 ? (
        <ul ref={chipsRef} aria-label={t("purchaseDocumentChosenList")} className="mb-1.5 grid min-w-0 gap-2">
          {chosen.map(renderChip)}
        </ul>
      ) : null}
      <FieldLabel id={labelId} htmlFor={searchId}>
        {t("purchaseDocumentSearchLabel")}
      </FieldLabel>
      <SearchField
        ref={searchRef}
        id={searchId}
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onKeyDown={handleKeyDown}
        loading={view.state === "loading"}
        disabled={disabled}
        placeholder={tCommon("searchSelectPlaceholder")}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={listShown}
        aria-activedescendant={activeIndex >= 0 ? `${id}-option-${rows[activeIndex].id}` : undefined}
        autoComplete="off"
        maxLength={assetOperationSearchMaxChars}
      />
      <div className="min-w-0 overflow-hidden rounded-md border border-border bg-surface">
        {view.state === "loading" ? (
          <p className="px-3 py-2 text-meta text-muted-foreground">{tOperation("searching")}</p>
        ) : view.state === "error" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="text-meta text-danger">{tOperation("failed")}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              {tCommon("tryAgain")}
            </Button>
          </div>
        ) : (
          <>
            {rows.length === 0 ? (
              <EmptyNote className="px-3 py-3">{view.searched ? t("purchaseDocumentSearchEmpty") : t("noPurchaseDocuments")}</EmptyNote>
            ) : null}
            <ul role="listbox" ref={listRef} id={listboxId} aria-labelledby={labelId} className="max-h-80 overflow-y-auto">
              {rows.map(renderRow)}
            </ul>
            <p data-purchase-document-footer className="border-t border-border-soft px-3 py-2 text-meta text-muted-foreground">
              {footerText}
            </p>
          </>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{liveText}</span>
    </div>
  )
}
