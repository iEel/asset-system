"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Loader2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FilterMenuChip, type FilterMenuChipOption } from "@/components/ui/filter-menu-chip"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { Notice } from "@/components/ui/notice"
import { SearchField } from "@/components/ui/search-field"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge } from "@/components/ui/status-badge"
import { LABEL_PRINT_BATCH_MAX, type LabelPrintQueueMode, type LabelPrintQueueSort } from "@/lib/asset-label-print-tracking"
import { LABEL_REPRINT_CANDIDATE_CAP, type LabelQueueAnswer, type LabelQueueLocale, type LabelQueueRow } from "@/lib/asset-label-queue"
import {
  LABEL_QUEUE_FIRST_PAGE,
  LABEL_QUEUE_MORE_STEP,
  addAllCounts,
  addAllNoteKey,
  appendQueueRows,
  buildLabelLookupSearch,
  buildLabelQueueSearch,
  defaultLabelQueueFilters,
  labelButtonKey,
  labelDuplicateNames,
  labelQueueOldTag,
  labelQueueRowHolder,
  labelRowNameKey,
  lookupMissingCount,
  queueRefreshPageSize,
  type LabelQueueFilters,
} from "@/lib/asset-label-queue-rules"
import { cn, formatDate } from "@/lib/utils"

// The labels page's left column (group 4 plan 6 Task 4, spec §11, board AR-Labels): the search and the label queue.
// Every row is a LabelQueueRow (P6-R11), so a search result shows its real print state too. Adds go to the page's print
// list through onAdd, which refuses past 100 (P6-R2).

export type LabelFilterOption = {
  id: string
  // "code - name" (spec §5): the menu's option text.
  label: string
  // The name alone: the closed chip and the scope line.
  name: string
  companyId?: string
  branchId?: string
  branchName?: string
  branchLabel?: string
  shortLabel?: string
}

export type LabelFilterOptions = {
  companies: LabelFilterOption[]
  branches: LabelFilterOption[]
  categories: LabelFilterOption[]
  locations: LabelFilterOption[]
}

type AddRows = (rows: LabelQueueRow[]) => void

const queueModes: readonly LabelPrintQueueMode[] = ["unprinted", "printed", "recent", "reprint"]
const queueSorts: readonly { value: LabelPrintQueueSort; key: string }[] = [
  { value: "created_desc", key: "sort.newest" },
  { value: "asset_tag", key: "sort.assetTag" },
  { value: "location", key: "sort.location" },
  { value: "category", key: "sort.category" },
]

type QueueState = { rows: LabelQueueRow[]; total: number; ids: string[]; reprintCapped: boolean }
const emptyQueue: QueueState = { rows: [], total: 0, ids: [], reprintCapped: false }

const labelPrintsApi = "/api/assets/label-prints"

/** Queue-shaped rows for given ids (the lookup, P6-R11), in their order. The print list refreshes through it too. */
export async function fetchLabelRows(ids: readonly string[], locale: LabelQueueLocale, signal?: AbortSignal): Promise<LabelQueueRow[]> {
  if (ids.length === 0) return []
  const response = await fetch(`${labelPrintsApi}?${buildLabelLookupSearch(ids, locale)}`, { signal })
  const payload = (await response.json().catch(() => null)) as { rows?: LabelQueueRow[] } | null
  if (!response.ok) throw new Error("Label lookup failed")
  return payload?.rows ?? []
}

async function fetchQueuePage(search: string, signal?: AbortSignal): Promise<QueueState> {
  const response = await fetch(`${labelPrintsApi}?${search}`, { signal })
  const payload = (await response.json().catch(() => null)) as LabelQueueAnswer | null
  if (!response.ok || !payload) throw new Error("Queue failed")
  return { rows: payload.rows, total: payload.total, ids: payload.ids, reprintCapped: payload.reprintCapped === true }
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      {label}
    </div>
  )
}

export function AssetLabelSearchCard({ locale, selectedIds, onAdd }: { locale: LabelQueueLocale; selectedIds: ReadonlySet<string>; onAdd: AddRows }) {
  const t = useTranslations("assetTools.labelsPage")
  const tTools = useTranslations("assetTools")
  const tSearch = useTranslations("globalSearch")
  const tCommon = useTranslations("common")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LabelQueueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  // "ลองอีกครั้ง" runs the same search again.
  const [searchAttempt, setSearchAttempt] = useState(0)
  const trimmedQuery = query.trim()
  const visibleResults = useMemo(() => (trimmedQuery.length < 2 ? [] : results), [results, trimmedQuery])
  const duplicateNames = useMemo(() => labelDuplicateNames(visibleResults), [visibleResults])

  useEffect(() => {
    if (trimmedQuery.length < 2) return

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setSearchError(false)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&locale=${locale}&scope=asset`, {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => null)) as { results?: { id: string }[] } | null
        if (!response.ok) throw new Error("Search failed")
        // The search finds the assets; the lookup gives them the queue's row, with their real print state (P6-R11).
        setResults(await fetchLabelRows((payload?.results ?? []).map((result) => result.id), locale, controller.signal))
      } catch (error) {
        if (isAbort(error)) return
        setResults([])
        setSearchError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [locale, trimmedQuery, searchAttempt])

  function retrySearch() {
    setSearchAttempt((attempt) => attempt + 1)
  }

  return (
    <ContentPanel>
      <Field label={t("searchLabel")} hint={t("searchHint")}>
        <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tTools("labelSearchPlaceholder")} />
      </Field>

      {trimmedQuery.length >= 2 ? (
        <div className="mt-3 overflow-hidden rounded-md border border-border">
          {loading ? (
            <LoadingLine label={tSearch("loading")} />
          ) : searchError ? (
            // A failed search or lookup says so under the search, never "ไม่พบผลลัพธ์".
            <Notice
              tone="danger"
              role="alert"
              className="rounded-none border-0"
              action={<Button variant="outline" size="md" onClick={retrySearch}>{tCommon("tryAgain")}</Button>}
            >
              {tSearch("failed")}
            </Notice>
          ) : visibleResults.length === 0 ? (
            <EmptyNote padded>{tSearch("noResults")}</EmptyNote>
          ) : (
            <ul aria-label={t("searchLabel")} className="divide-y divide-border-soft">
              {visibleResults.map((row) => (
                <li key={row.id}>
                  <LabelQueueRowButton row={row} source="search" listed={selectedIds.has(row.id)} duplicateNames={duplicateNames} onAdd={onAdd} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </ContentPanel>
  )
}

export function AssetLabelQueueCard({
  locale,
  filterOptions,
  selectedIds,
  room,
  onAdd,
}: {
  locale: LabelQueueLocale
  filterOptions: LabelFilterOptions
  selectedIds: ReadonlySet<string>
  // How many more labels the print list takes (P6-R2).
  room: number
  onAdd: AddRows
}) {
  const t = useTranslations("assetTools.labelsPage")
  const tCommon = useTranslations("common")
  const [queueFilters, setQueueFilters] = useState<LabelQueueFilters>(defaultLabelQueueFilters)
  const [queue, setQueue] = useState<QueueState>(emptyQueue)
  const [queueLoading, setQueueLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [addAllBusy, setAddAllBusy] = useState(false)
  // Each request that can fail says so beside its control, with "ลองอีกครั้ง" (Task 4 review).
  const [queueError, setQueueError] = useState(false)
  const [queueReload, setQueueReload] = useState(0)
  const [moreError, setMoreError] = useState(false)
  const [addAllError, setAddAllError] = useState(false)
  // Assets add-all could not add: the lookup no longer returns them (deactivated since the queue loaded).
  const [addAllSkipped, setAddAllSkipped] = useState(0)
  const [createdOpen, setCreatedOpen] = useState(false)
  const firstPageSearch = useMemo(
    () => buildLabelQueueSearch(queueFilters, { pageSize: LABEL_QUEUE_FIRST_PAGE, skip: 0, locale }),
    [locale, queueFilters]
  )
  // The filters a "แสดงอีก 10 รายการ" answer belongs to; an answer for older filters is dropped.
  const currentSearch = useRef(firstPageSearch)
  const filteredBranchOptions = useMemo(
    () => queueFilters.companyId === "all"
      ? filterOptions.branches
      : filterOptions.branches.filter((branch) => branch.companyId === queueFilters.companyId),
    [filterOptions.branches, queueFilters.companyId]
  )
  const filteredLocationOptions = useMemo(
    () => filterOptions.locations
      .filter((location) => {
        if (queueFilters.branchId !== "all") return location.branchId === queueFilters.branchId
        if (queueFilters.companyId !== "all") return location.companyId === queueFilters.companyId
        return true
      })
      .map((location) => ({
        ...location,
        label: getLocationOptionLabel(location, queueFilters.companyId, queueFilters.branchId),
      })),
    [filterOptions.locations, queueFilters.branchId, queueFilters.companyId]
  )
  const queueScopeSummary = getQueueScopeSummary(queueFilters, filterOptions, t)
  const duplicateNames = useMemo(() => labelDuplicateNames(queue.rows), [queue.rows])
  // P6-R3: the number on the button is what will be added.
  const addAll = addAllCounts({ total: queue.total, matchIds: queue.ids, selectedIds, room })
  const addAllButtonKey = labelButtonKey(addAll)
  const addAllNote = addAllNoteKey(addAll, room)
  const addAllWaits = queueLoading || queueError || addAll.c === 0

  useEffect(() => {
    const controller = new AbortController()
    currentSearch.current = firstPageSearch

    async function loadQueue() {
      setQueueLoading(true)
      setQueueError(false)
      setMoreError(false)
      setAddAllError(false)
      setAddAllSkipped(0)
      try {
        setQueue(await fetchQueuePage(firstPageSearch, controller.signal))
      } catch (error) {
        if (isAbort(error)) return
        setQueue(emptyQueue)
        setQueueError(true)
      } finally {
        if (!controller.signal.aborted) setQueueLoading(false)
      }
    }

    void loadQueue()

    return () => {
      controller.abort()
    }
  }, [firstPageSearch, queueReload])

  // P6-R13: the print route records in another tab. When this tab is visible again, the queue asks again for the rows it
  // shows (the same filters, from the top, as many as are on screen), so their print states are today's.
  const shownRows = queue.rows.length
  useEffect(() => {
    async function refreshQueue() {
      if (document.visibilityState !== "visible") return
      const search = firstPageSearch
      try {
        const page = await fetchQueuePage(buildLabelQueueSearch(queueFilters, { pageSize: queueRefreshPageSize(shownRows), skip: 0, locale }))
        if (currentSearch.current !== search) return
        setQueue(page)
        setQueueError(false)
      } catch {
        if (currentSearch.current === search) setQueueError(true)
      }
    }

    document.addEventListener("visibilitychange", refreshQueue)
    return () => document.removeEventListener("visibilitychange", refreshQueue)
  }, [firstPageSearch, locale, queueFilters, shownRows])

  function retryQueue() {
    setQueueReload((attempt) => attempt + 1)
  }

  function updateQueueFilter<Key extends keyof LabelQueueFilters>(key: Key, value: LabelQueueFilters[Key]) {
    setQueueFilters((current) => ({ ...current, [key]: value }))
  }

  function changeCompanyFilter(companyId: string) {
    const branchOutOfScope = queueFilters.branchId !== "all" &&
      companyId !== "all" &&
      !filterOptions.branches.some((branch) => branch.id === queueFilters.branchId && branch.companyId === companyId)
    const nextBranchId = branchOutOfScope ? "all" : queueFilters.branchId
    updateQueueFilter("companyId", companyId)
    if (branchOutOfScope) updateQueueFilter("branchId", "all")
    if (!isLocationInScope(filterOptions.locations, queueFilters.locationId, companyId, nextBranchId)) {
      updateQueueFilter("locationId", "all")
    }
  }

  function changeBranchFilter(branchId: string) {
    updateQueueFilter("branchId", branchId)
    if (!isLocationInScope(filterOptions.locations, queueFilters.locationId, queueFilters.companyId, branchId)) {
      updateQueueFilter("locationId", "all")
    }
  }

  // "ล้างตัวกรอง" clears the chips; the queue status is not a filter and stays.
  function resetQueueFilters() {
    setQueueFilters((current) => ({ ...defaultLabelQueueFilters, mode: current.mode }))
  }

  async function showMoreQueue() {
    if (moreLoading) return
    const search = firstPageSearch
    setMoreLoading(true)
    setMoreError(false)
    try {
      const page = await fetchQueuePage(buildLabelQueueSearch(queueFilters, { pageSize: LABEL_QUEUE_MORE_STEP, skip: queue.rows.length, locale }))
      if (currentSearch.current !== search) return
      setQueue((current) => ({ ...page, rows: appendQueueRows(current.rows, page.rows) }))
    } catch {
      if (currentSearch.current === search) setMoreError(true)
    } finally {
      setMoreLoading(false)
    }
  }

  async function addAllMatching() {
    // Nothing to add is a reason beside the button, not a field: the button waits and the line says why (spec §4.4).
    if (addAllWaits || addAllBusy) return
    setAddAllBusy(true)
    setAddAllError(false)
    setAddAllSkipped(0)
    try {
      const rows = await fetchLabelRows(addAll.addIds, locale)
      onAdd(rows)
      setAddAllSkipped(lookupMissingCount(addAll.addIds, rows))
    } catch {
      setAddAllError(true)
    } finally {
      setAddAllBusy(false)
    }
  }

  const allOption = { value: "all", label: t("filterAll"), name: t("filterAll") }
  const toChipOptions = (options: LabelFilterOption[]): FilterMenuChipOption[] => [
    allOption,
    ...options.map((option) => ({ value: option.id, label: option.label, name: option.name })),
  ]
  const createdText = queueFilters.createdFrom && queueFilters.createdTo
    ? t("created.range", { from: formatDate(queueFilters.createdFrom), to: formatDate(queueFilters.createdTo) })
    : queueFilters.createdFrom
      ? t("created.fromOnly", { from: formatDate(queueFilters.createdFrom) })
      : queueFilters.createdTo
        ? t("created.toOnly", { to: formatDate(queueFilters.createdTo) })
        : t("created.any")
  const addAllButtonText = addAllButtonKey === "addFirst100" ? t("addFirst100") : t(addAllButtonKey, { count: addAll.c })
  const addAllNoteText = addAllNote === "addAllRoom"
    ? t("addAllRoom", { room, max: LABEL_PRINT_BATCH_MAX })
    : addAllNote === "listFull"
      ? t("listFull", { max: LABEL_PRINT_BATCH_MAX })
      : addAllNote
        ? t(addAllNote)
        : null
  const addAllReason = queueLoading ? t("queueLoading") : queueError ? t("queueLoadFailed") : addAllNoteText

  return (
    <ContentPanel
      divided
      flush
      title={t("queueTitle")}
      description={t(`queueHelp.${queueFilters.mode}`)}
      actions={(
        <Button variant="ghost" size="sm" onClick={resetQueueFilters}>
          {t("clearFilters")}
        </Button>
      )}
    >
      <div className="space-y-3 px-4 py-4 md:px-5">
        {/* P6-R5: four options fit from md; below md they are a select (343 px holds no four Thai options). */}
        <div className="hidden items-center gap-3 md:flex">
          <span id="asset-label-queue-mode" className="text-meta font-semibold text-foreground">{t("queueModeLabel")}</span>
          <Segmented
            labelledBy="asset-label-queue-mode"
            value={queueFilters.mode}
            onValueChange={(mode) => updateQueueFilter("mode", mode)}
            options={queueModes.map((mode) => ({ value: mode, label: <span data-label-mode={mode}>{t(`mode.${mode}`)}</span> }))}
          />
        </div>
        <Field label={t("queueModeLabel")} className="md:hidden">
          <NativeSelect value={queueFilters.mode} onChange={(event) => updateQueueFilter("mode", event.target.value as LabelPrintQueueMode)}>
            {queueModes.map((mode) => (
              <option key={mode} value={mode} data-label-mode={mode}>
                {t(`mode.${mode}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        {/* P6-R4: one chip per filter, each with its menu; they wrap. */}
        <div role="group" aria-label={t("filtersLabel")} className="flex flex-wrap gap-1.5">
          <FilterMenuChip
            label={t("filter.company")}
            options={toChipOptions(filterOptions.companies)}
            value={queueFilters.companyId}
            onValueChange={changeCompanyFilter}
            active={queueFilters.companyId !== "all"}
          />
          <FilterMenuChip
            label={t("filter.branch")}
            options={toChipOptions(filteredBranchOptions)}
            value={queueFilters.branchId}
            onValueChange={changeBranchFilter}
            active={queueFilters.branchId !== "all"}
          />
          <FilterMenuChip
            label={t("filter.location")}
            searchable
            options={toChipOptions(filteredLocationOptions)}
            value={queueFilters.locationId}
            onValueChange={(value) => updateQueueFilter("locationId", value)}
            searchPlaceholder={t("locationSearchPlaceholder")}
            emptyLabel={t("locationEmpty")}
            active={queueFilters.locationId !== "all"}
          />
          <FilterMenuChip
            label={t("filter.category")}
            options={toChipOptions(filterOptions.categories)}
            value={queueFilters.categoryId}
            onValueChange={(value) => updateQueueFilter("categoryId", value)}
            active={queueFilters.categoryId !== "all"}
          />
          <FilterMenuChip
            label={t("filter.created")}
            valueText={createdText}
            active={Boolean(queueFilters.createdFrom || queueFilters.createdTo)}
            open={createdOpen}
            onOpenChange={setCreatedOpen}
          >
            {/* A filter, not a form: the end cannot be picked before the start (spec U4, §7.4), like the disposal list. */}
            <div className="grid gap-3">
              <Field label={t("created.fromLabel")}>
                <Input
                  type="date"
                  value={queueFilters.createdFrom}
                  max={queueFilters.createdTo || undefined}
                  onChange={(event) => updateQueueFilter("createdFrom", event.target.value)}
                />
              </Field>
              <Field label={t("created.toLabel")}>
                <Input
                  type="date"
                  value={queueFilters.createdTo}
                  min={queueFilters.createdFrom || undefined}
                  onChange={(event) => updateQueueFilter("createdTo", event.target.value)}
                />
              </Field>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQueueFilters((current) => ({ ...current, createdFrom: "", createdTo: "" }))}
                className="justify-self-start"
              >
                {t("created.clear")}
              </Button>
            </div>
          </FilterMenuChip>
          <FilterMenuChip
            label={t("filter.sort")}
            options={queueSorts.map((sort) => ({ value: sort.value, label: t(sort.key) }))}
            value={queueFilters.sort}
            onValueChange={(value) => updateQueueFilter("sort", value as LabelPrintQueueSort)}
            active={false}
          />
        </div>

        {/* P6-R3: what matches, what is listed, and what the button adds; the button's number is the last. */}
        <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 text-meta">
            <div className="flex flex-wrap items-center gap-2">
              <Chip>{queueScopeSummary.label}</Chip>
              {queueScopeSummary.detail ? <span className="min-w-0 break-words font-semibold text-foreground">{queueScopeSummary.detail}</span> : null}
            </div>
            {/* While the queue loads or failed, its numbers are not known: the status line says which. */}
            {queueLoading || queueError ? null : (
              <>
                <p className="mt-1 text-muted-foreground tabular-nums">
                  {t("addAllSummary", { matched: addAll.a, listed: addAll.b, added: addAll.c })}
                </p>
                {addAll.left > 0 ? <p className="mt-1 text-muted-foreground tabular-nums">{t("addRemaining", { count: addAll.left })}</p> : null}
              </>
            )}
            {addAllSkipped > 0 ? <p role="status" className="mt-1 text-muted-foreground">{t("addAllSkipped", { count: addAllSkipped })}</p> : null}
            <p id="asset-label-add-all-reason" role="status" className="mt-1 text-muted-foreground empty:hidden">
              {addAllReason}
            </p>
          </div>
          <Button
            aria-disabled={addAllWaits || undefined}
            aria-describedby={addAllReason ? "asset-label-add-all-reason" : undefined}
            busy={addAllBusy}
            onClick={addAllMatching}
            className="w-full shrink-0 sm:w-auto"
          >
            <Plus aria-hidden="true" />
            {addAllButtonText}
          </Button>
        </div>

        {addAllError ? (
          <Notice
            tone="danger"
            role="alert"
            action={<Button variant="outline" size="md" onClick={addAllMatching}>{tCommon("tryAgain")}</Button>}
          >
            {t("addAllFailed")}
          </Notice>
        ) : null}

        {queueFilters.mode === "reprint" && queue.reprintCapped ? (
          <Notice tone="warning">{t("reprintCap", { max: LABEL_REPRINT_CANDIDATE_CAP })}</Notice>
        ) : null}
      </div>

      {/* P6-R7: the queue scrolls with the page; "แสดงอีก 10 รายการ" appends. */}
      <div className="border-t border-border">
        {queueLoading ? (
          <LoadingLine label={t("queueLoading")} />
        ) : queueError ? (
          <div className="px-4 py-4 md:px-5">
            <Notice
              tone="danger"
              role="alert"
              action={<Button variant="outline" size="md" onClick={retryQueue}>{tCommon("tryAgain")}</Button>}
            >
              {t("queueLoadFailed")}
            </Notice>
          </div>
        ) : queue.rows.length === 0 ? (
          <EmptyNote padded>{t("queueEmpty")}</EmptyNote>
        ) : (
          <ul aria-label={t("queueListLabel", { count: queue.total })} className="divide-y divide-border-soft">
            {queue.rows.map((row) => (
              <li key={row.id}>
                <LabelQueueRowButton row={row} source="queue" listed={selectedIds.has(row.id)} duplicateNames={duplicateNames} onAdd={onAdd} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {!queueLoading && queue.rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2.5 md:px-5">
          <span className="text-meta text-muted-foreground tabular-nums">{t("shownOf", { shown: queue.rows.length, total: queue.total })}</span>
          {queue.rows.length < queue.total ? (
            <Button variant="outline" size="sm" busy={moreLoading} onClick={showMoreQueue} className="ml-auto">
              {t("showMore")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!queueLoading && moreError ? (
        <div className="border-t border-border px-4 py-3 md:px-5">
          <Notice
            tone="danger"
            role="alert"
            action={<Button variant="outline" size="md" onClick={showMoreQueue}>{tCommon("tryAgain")}</Button>}
          >
            {t("showMoreFailed")}
          </Notice>
        </div>
      ) : null}
    </ContentPanel>
  )
}

// One row of the search or the queue (board): the name, then "tag · holder or ส่วนกลาง · room", the print state, and
// + or ✓. It stays one list button (plan 2D-3 R5): the whole row adds the asset to the print list. Its name is the
// board's; the second line and the state describe it. A listed row keeps the shared disabled look with a check.
function LabelQueueRowButton({
  row,
  source,
  listed,
  duplicateNames,
  onAdd,
}: {
  row: LabelQueueRow
  source: "search" | "queue"
  listed: boolean
  duplicateNames: ReadonlySet<string>
  onAdd: AddRows
}) {
  const t = useTranslations("assetTools.labelsPage")
  const name = labelRowNameKey(row, { listed, duplicateNames })
  const holder = labelQueueRowHolder(row, t("sharedOwner"))
  const oldTag = labelQueueOldTag(row)
  const metaId = `asset-label-${source}-${row.id}-meta`
  const stateId = `asset-label-${source}-${row.id}-state`
  const hook = source === "queue" ? { "data-label-queue-row": row.id } : { "data-label-search-row": row.id }

  return (
    <button
      type="button"
      {...hook}
      disabled={listed}
      aria-label={t(name.key, name.values)}
      aria-describedby={`${metaId} ${stateId}`}
      onClick={() => onAdd([row])}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:cursor-not-allowed disabled:bg-background md:px-5"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border",
          listed ? "border-success-border bg-success-soft text-success" : "border-control-border bg-surface text-primary"
        )}
      >
        {listed ? <Check className="size-4" /> : <Plus className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-medium text-foreground">{row.name}</span>
        <span id={metaId} className="block break-words text-meta text-muted-foreground">
          <span className="tag">{row.assetTag}</span>
          {holder ? ` · ${holder}` : null}
          {row.location ? ` · ${row.location.name}` : null}
        </span>
      </span>
      <span id={stateId} className="shrink-0">
        {listed ? (
          <span className="text-meta font-medium text-success">{t("badgeListed")}</span>
        ) : oldTag ? (
          <StatusBadge label={t("oldTag", { tag: oldTag })} tone="warning" />
        ) : (
          <StatusBadge label={row.lastPrint ? t("badgePrinted") : t("badgeUnprinted")} tone={row.lastPrint ? "success" : "muted"} />
        )}
      </span>
    </button>
  )
}

// The scope line of the add-all box (board): the widest filter that is set, by name, no codes.
function getQueueScopeSummary(
  filters: LabelQueueFilters,
  options: LabelFilterOptions,
  t: (key: string) => string
): { label: string; detail: string | null } {
  if (filters.locationId !== "all") {
    const location = options.locations.find((item) => item.id === filters.locationId)
    const detail = location ? [location.branchName, location.name].filter(Boolean).join(" / ") : null
    return { label: t("scope.location"), detail }
  }
  if (filters.branchId !== "all") {
    return { label: t("scope.branch"), detail: options.branches.find((item) => item.id === filters.branchId)?.name ?? null }
  }
  if (filters.companyId !== "all") {
    return { label: t("scope.company"), detail: options.companies.find((item) => item.id === filters.companyId)?.name ?? null }
  }
  return { label: t("scope.all"), detail: null }
}

function getLocationOptionLabel(location: LabelFilterOption, companyId: string, branchId: string) {
  const shortLabel = location.shortLabel ?? location.label
  if (branchId !== "all") return shortLabel
  if (companyId !== "all") {
    return location.branchLabel ? `${location.branchLabel} / ${shortLabel}` : shortLabel
  }
  return location.label
}

function isLocationInScope(locations: LabelFilterOption[], locationId: string, companyId: string, branchId: string) {
  if (locationId === "all") return true
  const location = locations.find((item) => item.id === locationId)
  if (!location) return false
  if (branchId !== "all") return location.branchId === branchId
  if (companyId !== "all") return location.companyId === companyId
  return true
}
