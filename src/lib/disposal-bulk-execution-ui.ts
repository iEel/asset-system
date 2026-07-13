import {
  MAX_DISPOSAL_BULK_EXECUTION_ITEMS,
  summarizeDisposalBulkExecution,
  type DisposalBulkExecutionItem,
  type DisposalBulkExecutionResponse,
} from "./disposal-bulk-execution.ts"

export type BulkExecutionSelectionItem = {
  requestId: string
  disposalType: string
  effectiveEvidenceCount: number
}

export type BulkExecutionSelectionState = {
  selectionMode: boolean
  selectedIds: string[]
}

export type BulkExecutionSelectionMessage = "mixed" | "limit" | null

export type BulkExecutionSharedValues = {
  executionDate: string
  executedById: string
  nextStatusId: string
  sharedRecipientName: string | null
  useHistoricalEvidenceException: boolean
  evidenceExceptionReason: string | null
  evidenceExceptionAcknowledged: boolean
}

type BulkExecutionSharedValuesInput = Omit<BulkExecutionSharedValues, "sharedRecipientName"> & {
  sharedRecipientName?: string | null
}

export type BulkExecutionPreviewPayload = BulkExecutionSharedValuesInput & {
  mode: "preview"
  requestIds: string[]
}

export type BulkExecutionCommitPayload = BulkExecutionSharedValuesInput & {
  mode: "commit"
  requestIds: string[]
}

type BulkExecutionRecipientReview = Pick<
  DisposalBulkExecutionItem,
  "recipientName" | "recipientSource"
>

export function resolveBulkExecutionRecipientReview(
  selectableRecipientName: string | null,
  responseItem?: BulkExecutionRecipientReview,
): BulkExecutionRecipientReview {
  if (responseItem !== undefined) {
    return {
      recipientName: responseItem.recipientName,
      recipientSource: responseItem.recipientSource,
    }
  }
  return { recipientName: selectableRecipientName, recipientSource: null }
}

export function setBulkExecutionSelectionMode(
  state: BulkExecutionSelectionState,
  selectionMode: boolean,
): BulkExecutionSelectionState {
  if (selectionMode) return { ...state, selectionMode: true }
  return { selectionMode: false, selectedIds: [] }
}

export function toggleBulkExecutionItem(
  items: BulkExecutionSelectionItem[],
  state: BulkExecutionSelectionState,
  requestId: string,
): { state: BulkExecutionSelectionState; message: BulkExecutionSelectionMessage } {
  if (!state.selectionMode) return { state, message: null }

  const item = items.find((candidate) => candidate.requestId === requestId)
  if (!item) return { state, message: null }

  if (state.selectedIds.includes(requestId)) {
    return {
      state: {
        ...state,
        selectedIds: state.selectedIds.filter((id) => id !== requestId),
      },
      message: null,
    }
  }

  const selectedType = getSelectedType(items, state.selectedIds)
  if (selectedType && selectedType !== item.disposalType) {
    return { state, message: "mixed" }
  }
  if (state.selectedIds.length >= MAX_DISPOSAL_BULK_EXECUTION_ITEMS) {
    return { state, message: "limit" }
  }

  return {
    state: { ...state, selectedIds: [...state.selectedIds, requestId] },
    message: null,
  }
}

export function toggleBulkExecutionPage(
  items: BulkExecutionSelectionItem[],
  state: BulkExecutionSelectionState,
): { state: BulkExecutionSelectionState; message: BulkExecutionSelectionMessage } {
  if (!state.selectionMode || items.length === 0) return { state, message: null }

  const selectedType = getSelectedType(items, state.selectedIds)
  const targetType = selectedType ?? items[0].disposalType
  const matchingItems = items.filter((item) => item.disposalType === targetType)
  const pageSelection = matchingItems.slice(0, MAX_DISPOSAL_BULK_EXECUTION_ITEMS)
  const pageIds = pageSelection.map((item) => item.requestId)
  const allSelected = pageIds.length > 0 && pageIds.every((id) => state.selectedIds.includes(id))

  if (allSelected) {
    return { state: { ...state, selectedIds: [] }, message: null }
  }

  const message = matchingItems.length > MAX_DISPOSAL_BULK_EXECUTION_ITEMS
    ? "limit"
    : items.some((item) => item.disposalType !== targetType)
      ? "mixed"
      : null

  return {
    state: { ...state, selectedIds: pageIds },
    message,
  }
}

export function isHistoricalExceptionAvailable(
  roles: string[],
  selectedIds: string[],
  items: BulkExecutionSelectionItem[],
) {
  if (!roles.includes("system_admin") || selectedIds.length === 0) return false
  const itemsById = new Map(items.map((item) => [item.requestId, item]))
  return selectedIds.every((id) => itemsById.get(id)?.effectiveEvidenceCount === 0)
}

export function validateHistoricalException(input: {
  enabled: boolean
  reason: string
  acknowledged: boolean
}): "reason" | "acknowledgement" | null {
  if (!input.enabled) return null
  const reasonLength = input.reason.trim().length
  if (reasonLength < 20 || reasonLength > 2000) return "reason"
  if (!input.acknowledged) return "acknowledgement"
  return null
}

export function buildBulkExecutionPayload(
  mode: "preview",
  requestIds: string[],
  values: BulkExecutionSharedValuesInput,
): BulkExecutionPreviewPayload
export function buildBulkExecutionPayload(
  mode: "commit",
  requestIds: string[],
  values: BulkExecutionSharedValuesInput,
): BulkExecutionCommitPayload
export function buildBulkExecutionPayload(
  mode: "preview" | "commit",
  requestIds: string[],
  values: BulkExecutionSharedValuesInput,
) {
  return { mode, requestIds: [...requestIds], ...values }
}

export function buildBulkExecutionCommitPayload(
  previewPayload: BulkExecutionPreviewPayload,
  requestIds: string[],
): BulkExecutionCommitPayload {
  return buildBulkExecutionPayload("commit", requestIds, {
    executionDate: previewPayload.executionDate,
    executedById: previewPayload.executedById,
    nextStatusId: previewPayload.nextStatusId,
    ...(previewPayload.sharedRecipientName === undefined
      ? {}
      : { sharedRecipientName: previewPayload.sharedRecipientName }),
    useHistoricalEvidenceException: previewPayload.useHistoricalEvidenceException,
    evidenceExceptionReason: previewPayload.evidenceExceptionReason,
    evidenceExceptionAcknowledged: previewPayload.evidenceExceptionAcknowledged,
  })
}

export function mergeBulkExecutionResults(
  preview: DisposalBulkExecutionResponse,
  commit: DisposalBulkExecutionResponse,
): DisposalBulkExecutionResponse {
  const commitById = new Map(commit.items.map((item) => [item.requestId, item]))
  const seen = new Set<string>()
  const items = preview.items.map((previewItem) => {
    seen.add(previewItem.requestId)
    if (previewItem.outcome === "blocked") return previewItem
    return commitById.get(previewItem.requestId) ?? previewItem
  })

  for (const commitItem of commit.items) {
    if (seen.has(commitItem.requestId)) continue
    seen.add(commitItem.requestId)
    items.push(commitItem)
  }

  const summary = summarizeDisposalBulkExecution(items)
  return {
    mode: "commit",
    selectedCount: summary.selected,
    eligibleCount: summary.eligible,
    blockedCount: summary.blocked,
    executedCount: summary.executed,
    failedCount: summary.failed,
    items,
  }
}

export function getBulkExecutionUnresolvedIds(response: DisposalBulkExecutionResponse) {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const item of response.items) {
    if (item.outcome !== "blocked" && item.outcome !== "failed") continue
    if (seen.has(item.requestId)) continue
    seen.add(item.requestId)
    ids.push(item.requestId)
  }
  return ids
}

export function getBangkokBusinessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function getSelectedType(items: BulkExecutionSelectionItem[], selectedIds: string[]) {
  const selectedIdsSet = new Set(selectedIds)
  return items.find((item) => selectedIdsSet.has(item.requestId))?.disposalType ?? null
}
