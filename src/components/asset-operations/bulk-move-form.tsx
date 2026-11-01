"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { BULK_MOVE_SELECT_PAGE_ID, BulkMoveTable } from "@/components/asset-operations/bulk-move-table"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { DesktopSelectionBar } from "@/components/ui/desktop-selection-bar"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError } from "@/components/ui/field"
import { FilterSelect } from "@/components/ui/filter-select"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { OperationReviewDialog } from "@/components/ui/operation-review-dialog"
import { PageHeader } from "@/components/ui/page-header"
import { SearchField } from "@/components/ui/search-field"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { useMediaQuery } from "@/components/ui/use-media-query"
import { assetOperationSearchMaxChars, isAssetOperationSearchReady } from "@/lib/asset-operation-search-rules"
import { bulkMoveBlockedList, bulkMoveBlockedReasonKey, readBulkMoveBlocked, type BulkMoveBlockedAsset } from "@/lib/bulk-move-blocked"
import {
  getBulkMoveResultParts,
  getBulkMoveReviewCounts,
  readBulkMoveSaveAnswer,
  refreshBulkMoveSelection,
  removeBulkMoveIds,
  setBulkMovePage,
  toggleBulkMoveRow,
  type BulkMoveSelection,
} from "@/lib/bulk-move-form-rules"
import {
  bulkMoveMaxAssets,
  buildBulkMoveListHref,
  type BulkMoveCategoryOption,
  type BulkMoveListInput,
  type BulkMoveListPage,
  type BulkMoveListRow,
  type BulkMoveRoomOption,
} from "@/lib/bulk-move-list-rules"
import { formatCount } from "@/lib/display-format"
import { waitForDialogToClose } from "@/lib/field-focus"
import { maxLength, required } from "@/lib/validation-rules"

// The query the page read on the server (P4-R12): the client starts from it and asks nothing until it changes.
const FIRST_QUERY: BulkMoveListInput = { q: "", locationId: null, categoryId: null, page: 1 }
const bulkMoveSearchDebounceMs = 300

type BulkMoveFormValues = { assetIds: readonly string[]; toLocationId: string; reason: string; remark: string }

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1). The route's
// 400 past 100 ids says fieldErrors.assetIds, so the selection's place under the table is keyed assetIds (Z18); focus
// goes to its first control, the remove button.
const FIELD_IDS = {
  assetIds: "bulk-move-selection",
  toLocationId: "bulk-move-to-location",
  reason: "bulk-move-reason",
} as const
type BulkMoveField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as BulkMoveField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).
function validate(values: BulkMoveFormValues): Partial<Record<BulkMoveField, string>> {
  const errors: Partial<Record<BulkMoveField, string>> = {}
  const check = (key: BulkMoveField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assetIds", required(values.assetIds))
  check("toLocationId", required(values.toLocationId))
  check("reason", required(values.reason) ?? maxLength(values.reason, 500))
  return errors
}

type BulkMoveResult = { room: string; moved: number; components: number; unchanged: number }
// Where focus goes when the bar unmounts with focus inside it (plan 4 final review ui-1): the result line after a save,
// the table's header box after the selection empties.
type BulkMoveFocusRequest = "result" | "selectPage"

export function BulkMoveForm({ rooms, categories, initialPage }: { rooms: BulkMoveRoomOption[]; categories: BulkMoveCategoryOption[]; initialPage: BulkMoveListPage }) {
  // ย้ายที่ตั้งหลายรายการ (group 3 spec §10): a server-paged table whose ticks survive pages and filters (row snapshots,
  // Task 5), a bar with the room and the reason, a review that says what moves, and the page stays after the save. Below
  // md only a notice (§10.4).
  const locale = useLocale()
  const apiError = useApiError()
  const t = useTranslations("bulkMove")
  const tCommon = useTranslations("common")
  const tAll = useTranslations()
  const fieldErrors = useFieldErrors<BulkMoveField>()
  const isDesktop = useMediaQuery("(min-width: 48rem)")
  const initialHref = buildBulkMoveListHref(FIRST_QUERY)
  const [selection, setSelection] = useState<BulkMoveSelection>(() => new Map())
  const [values, setValues] = useState({ toLocationId: "", reason: "", remark: "" })
  const [searchText, setSearchText] = useState("")
  const [query, setQuery] = useState<BulkMoveListInput>(FIRST_QUERY)
  const [list, setList] = useState<{ href: string; page: BulkMoveListPage }>({ href: initialHref, page: initialPage })
  const [failedHref, setFailedHref] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [blocked, setBlocked] = useState<BulkMoveBlockedAsset[]>([])
  const [result, setResult] = useState<BulkMoveResult | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [focusRequest, setFocusRequest] = useState<BulkMoveFocusRequest | null>(null)
  const resultRef = useRef<HTMLDivElement | null>(null)
  const serverPage = useRef(true)
  const href = buildBulkMoveListHref(query)
  const listFailed = failedHref === href
  const listLoading = isDesktop && list.href !== href && !listFailed

  // The text asks 300 ms after the last keystroke; a 1-character text changes nothing, so the last answer stays (P4-R11).
  useEffect(() => {
    const text = searchText.trim()
    if (text !== "" && !isAssetOperationSearchReady(text)) return
    const timer = setTimeout(() => setQuery((current) => (current.q === text ? current : { ...current, q: text, page: 1 })), bulkMoveSearchDebounceMs)
    return () => clearTimeout(timer)
  }, [searchText])

  useEffect(() => {
    if (!isDesktop) return
    // The server rendered the first page (P4-R12): the first run on it asks nothing.
    if (serverPage.current) {
      serverPage.current = false
      if (href === initialHref) return
    }
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch(href, { signal: controller.signal })
        const payload = response.ok ? await response.json().catch(() => null) : null
        if (controller.signal.aborted) return
        const answer = (payload?.data ?? null) as BulkMoveListPage | null
        if (!answer) return setFailedHref(href)
        setFailedHref(null)
        setList({ href, page: answer })
        setSelection((current) => refreshBulkMoveSelection(current, answer.rows))
      } catch {
        if (!controller.signal.aborted) setFailedHref(href)
      }
    })()
    // A newer query or a refresh drops this answer (Review Focus 5).
    return () => controller.abort()
  }, [href, attempt, isDesktop, initialHref])

  // The bar that held focus has unmounted, so focus moves on purpose, never to <body> (plan 4 final review ui-1). It
  // waits for the review to finish closing: the dialog's own hand-back finds its opener gone and moves nothing, so the
  // two never fight. A disabled header box (every row on the page locked) hands over to the search field.
  useEffect(() => {
    if (!focusRequest) return
    let cancelled = false
    void (async () => {
      await waitForDialogToClose()
      if (cancelled) return
      const box = document.getElementById(BULK_MOVE_SELECT_PAGE_ID) as HTMLInputElement | null
      const target = focusRequest === "result" ? resultRef.current : box && !box.disabled ? box : document.getElementById("bulk-move-search")
      target?.focus()
      setFocusRequest(null)
    })()
    return () => {
      cancelled = true
    }
  }, [focusRequest])

  // Every tick goes through here: the result line, the refused list and its error belong to the selection they answered.
  function changeSelection(next: BulkMoveSelection) {
    setSelection(next)
    setResult(null)
    setBlocked([])
    fieldErrors.clear("assetIds")
  }

  function toggleRow(row: BulkMoveListRow, checked: boolean) {
    changeSelection(toggleBulkMoveRow(selection, row, checked).selection)
  }

  function togglePage(checked: boolean) {
    changeSelection(setBulkMovePage(selection, list.page.rows, checked).selection)
  }

  function clearSelection() {
    changeSelection(new Map())
    setFocusRequest("selectPage")
  }

  // นำรายการที่ย้ายไม่ได้ออก: unticks every refused asset, wherever its row is (P4-R8).
  function removeBlocked() {
    const next = removeBulkMoveIds(selection, blocked.map((asset) => asset.assetId))
    changeSelection(next)
    if (next.size === 0) setFocusRequest("selectPage")
  }

  // A filter change goes back to page 1 (P4-R13).
  function changeFilter(patch: Partial<Pick<BulkMoveListInput, "locationId" | "categoryId">>) {
    setQuery((current) => ({ ...current, ...patch, page: 1 }))
  }

  function setField(field: "toLocationId" | "reason" | "remark", value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as BulkMoveField)
  }

  // Each refusal reads in the row's words; any other code keeps the catalog's (P4-R6).
  function blockedReason(code: string) {
    const key = bulkMoveBlockedReasonKey(code)
    return key ? tAll(key) : apiError.describe(code).message
  }

  // The selection's one error, under the table: the refused assets by tag and reason, none ticked, or a server field error.
  const selectionError =
    fieldErrors.errors.assetIds === "blocked"
      ? t("blockedAssets", { count: formatCount(blocked.length), list: bulkMoveBlockedList(blocked, blockedReason) })
      : fieldErrors.errors.assetIds === "required"
        ? t("nothingSelected")
        : fieldErrors.message("assetIds")

  const room = rooms.find((option) => option.id === values.toLocationId) ?? null
  const counts = room ? getBulkMoveReviewCounts(selection, room) : null
  const reviewItems =
    room && counts
      ? [
          { label: t("reviewAssets"), value: t("reviewAssetsValue", { count: formatCount(counts.assets), tags: counts.tags.join(", ") }) },
          { label: t("toLocation"), value: room.label },
          { label: t("reason"), value: values.reason },
        ]
      : []
  // The lines that apply, then what stays; only ticked rows that move are counted (P4-R15, Z11).
  const reviewLines = counts
    ? [
        counts.componentsFollow > 0 ? t("reviewComponents", { count: formatCount(counts.componentsFollow) }) : null,
        counts.alreadyThere > 0 ? t("reviewAlreadyThere", { count: formatCount(counts.alreadyThere) }) : null,
        counts.otherBranch > 0 ? t("reviewOtherBranch", { count: formatCount(counts.otherBranch) }) : null,
        counts.componentsAlone > 0 ? t("reviewComponentsAlone", { count: formatCount(counts.componentsAlone) }) : null,
        t("reviewKept"),
      ].filter((line): line is string => line !== null)
    : []
  const resultText = result
    ? [
        t("resultMoved", { count: formatCount(result.moved), room: result.room }),
        result.components > 0 ? t("resultComponents", { count: formatCount(result.components) }) : null,
        result.unchanged > 0 ? t("resultUnchanged", { count: formatCount(result.unchanged) }) : null,
      ].filter(Boolean).join(" · ")
    : null

  // A refusal from the review closes it, and the field takes focus once the dialog has gone (spec §4.2, O-R1).
  async function leaveReview() {
    const closed = waitForDialogToClose()
    setReviewOpen(false)
    await closed
  }
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key], reveal: leaveReview })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate({ ...values, assetIds: [...selection.keys()] }))
    if (focusFirstError()) return
    setReviewOpen(true)
  }

  async function submitMove() {
    if (!room) return
    setSaving(true)
    try {
      const response = await fetch("/api/assets/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: [...selection.keys()], toLocationId: values.toLocationId, reason: values.reason, remark: values.remark }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        // A refusal that names assets closes the review and names each under the table in the row's words (P4-R4, Z20).
        // The page on screen is read again, so a refused row shows its reason and its box locks once it is unticked
        // (P4-R9; plan 4 final review journeys-2, ui-2, tests-1).
        const refused = readBulkMoveBlocked(payload)
        if (refused.length > 0) {
          setBlocked(refused)
          fieldErrors.setErrors({ assetIds: "blocked" })
          setAttempt((count) => count + 1)
          focusFirstError()
          return
        }
        if (fieldErrors.applyServer(payload) && focusFirstError()) return
        // An asset changed under the page: the review closes and the page is read again, then the toast says why (P4-R18).
        if (payload?.code === "ASSET_CHANGED_DURING_OPERATION") {
          setReviewOpen(false)
          setAttempt((count) => count + 1)
        }
        throw new Error(payload?.code ?? payload?.error ?? tCommon("error"))
      }
      // The page stays (P4-R18): everything clears, the page is read again, and one line says what moved.
      const answer = readBulkMoveSaveAnswer(payload)
      setReviewOpen(false)
      setSelection(new Map())
      setBlocked([])
      setValues({ toLocationId: "", reason: "", remark: "" })
      fieldErrors.setErrors({})
      setResult(answer ? { room: room.label, ...getBulkMoveResultParts(answer) } : null)
      setAttempt((count) => count + 1)
      setFocusRequest("result")
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title={t("title")} meta={t("subtitle")} />
      <Notice tone="info" title={t("desktopOnlyTitle")} data-bulk-move-desktop-only className="md:hidden" action={<Link href={`/${locale}/assets`} className={buttonVariants({ variant: "outline", size: "md" })}>{t("backToRegister")}</Link>}>
        {t("desktopOnlyBody")}
      </Notice>
      <div data-bulk-move-desktop className="grid min-w-0 gap-4 max-md:hidden">
        <div role="search" aria-label={t("searchLabel")} data-bulk-move-filters className="grid min-w-0 gap-3">
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <Field label={t("searchLabel")} id="bulk-move-search">
              <SearchField value={searchText} placeholder={t("searchPlaceholder")} loading={listLoading} onChange={(event) => setSearchText(event.target.value)} maxLength={assetOperationSearchMaxChars} />
            </Field>
            <SearchableSelect id="bulk-move-filter-location" label={t("filterLocation")} value={query.locationId ?? ""} options={rooms} placeholder={t("filterAll")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => changeFilter({ locationId: value || null })} />
            <FilterSelect id="bulk-move-filter-category" label={t("filterCategory")} allLabel={t("filterAll")} options={categories.map((category) => ({ value: category.id, label: category.label }))} value={query.categoryId ?? ""} onChange={(event) => changeFilter({ categoryId: event.target.value || null })} />
          </div>
          <p data-bulk-move-count aria-live="polite" className="text-meta text-muted-foreground num">{t("foundCount", { count: formatCount(list.page.total) })}</p>
        </div>
        <div ref={resultRef} role="status" tabIndex={-1} data-bulk-move-result className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {resultText ? <Notice tone="success">{resultText}</Notice> : null}
        </div>
        {listFailed ? (
          <Notice tone="warning" role="alert" data-bulk-move-list-failed action={<Button variant="outline" size="sm" onClick={() => { setFailedHref(null); setAttempt((count) => count + 1) }}>{tCommon("tryAgain")}</Button>}>
            {t("listFailed")}
          </Notice>
        ) : null}
        <form onSubmit={handleSubmit} noValidate className="grid min-w-0 gap-4">
          <BulkMoveTable listPage={list.page} selection={selection} disabled={saving} loading={listLoading} onToggleRow={toggleRow} onTogglePage={togglePage} onPage={(page) => setQuery((current) => ({ ...current, page }))} />
          {selection.size > 0 ? (
            <DesktopSelectionBar
              label={t("title")}
              countLabel={t("selectedCount", { count: formatCount(selection.size) })}
              clearLabel={t("clear")}
              onClear={clearSelection}
              clearDisabled={saving}
              className="-bottom-6"
              status={selection.size >= bulkMoveMaxAssets ? t("capReached", { max: formatCount(bulkMoveMaxAssets) }) : null}
              actions={
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-72">
                    <SearchableSelect id="bulk-move-to-location" label={t("toLocation")} value={values.toLocationId} required options={rooms} placeholder={t("selectLocation")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} error={fieldErrors.message("toLocationId")} onChange={(value) => setField("toLocationId", value)} />
                  </div>
                  <Field label={t("reason")} id="bulk-move-reason" required error={fieldErrors.message("reason")} className="w-80">
                    <Input value={values.reason} onChange={(event) => setField("reason", event.target.value)} required maxLength={500} />
                  </Field>
                  <Button type="submit" size="md" busy={saving}>
                    {t("reviewAndMove", { count: formatCount(selection.size) })}
                  </Button>
                </div>
              }
            >
              {selectionError ? (
                <div id="bulk-move-selection" className="grid justify-items-start gap-2">
                  <FieldError id="bulk-move-selection-error">{selectionError}</FieldError>
                  {blocked.length > 0 ? (
                    <Button variant="outline" size="md" aria-describedby="bulk-move-selection-error" onClick={removeBlocked}>
                      {t("removeBlocked")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </DesktopSelectionBar>
          ) : (
            <EmptyNote data-bulk-move-nothing-selected>{t("nothingSelected")}</EmptyNote>
          )}
        </form>
      </div>
      <OperationReviewDialog
        open={reviewOpen}
        title={t("reviewTitle")}
        description={null}
        items={reviewItems}
        confirmLabel={t("reviewConfirm")}
        cancelLabel={tCommon("cancel")}
        busy={saving}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void submitMove()}
      >
        <div className="grid gap-3">
          <ul data-bulk-move-review-lines className="grid gap-1.5 text-sm text-foreground">
            {reviewLines.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <Field label={t("remark")} id="bulk-move-remark">
            <Textarea value={values.remark} onChange={(event) => setField("remark", event.target.value)} rows={3} />
          </Field>
        </div>
      </OperationReviewDialog>
    </div>
  )
}
