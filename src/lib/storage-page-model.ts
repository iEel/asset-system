import { archiveDestinationPreview, type StorageGovernanceDryRunAction } from "./storage-governance.ts"

// Page group 12 plan 3 task 3 (spec §8, §15 item 10): the storage page's dry-run list. Pure: the page data resolves
// each missing file's asset (Attachment.assetId, else the checkout or checkin record's assetId through referenceId)
// and each disposal_batch file's batch, and passes them in by file path.

export type StorageFilter = "all" | "missing" | "orphan"

const STORAGE_FILTERS: readonly StorageFilter[] = ["all", "missing", "orphan"]

export function parseStorageFilter(value: string | string[] | undefined): StorageFilter {
  const raw = Array.isArray(value) ? value[0] : value
  return STORAGE_FILTERS.find((filter) => filter === raw) ?? "all"
}

export const STORAGE_ROWS_PREVIEW = 8

export type AssetRef = { id: string; name: string; assetTag: string }

export type StorageRow =
  | {
      kind: "missing"
      filePath: string
      module: string
      expectedSizeBytes: number
      asset: AssetRef | null
      batch: { id: string; number: string } | null
    }
  | { kind: "orphan"; relativePath: string; sizeBytes: number; destination: string }

export type StorageRefs = {
  assetByPath: Map<string, AssetRef | null>
  batchByPath: Map<string, { id: string; number: string }>
}

const DISPOSAL_BATCH_MODULE = "disposal_batch"

function comparePaths(left: string, right: string) {
  return left.localeCompare(right)
}

// Missing files first, then orphan files, each sorted by path. A disposal_batch file names its batch, never an asset.
export function buildStorageRows(actions: StorageGovernanceDryRunAction[], refs: StorageRefs, now: Date): StorageRow[] {
  const missingRows: StorageRow[] = []
  const orphanRows: StorageRow[] = []

  for (const action of actions) {
    if (action.action === "review_missing_db_file") {
      const isBatch = action.module === DISPOSAL_BATCH_MODULE
      missingRows.push({
        kind: "missing",
        filePath: action.filePath,
        module: action.module,
        expectedSizeBytes: action.expectedSizeBytes,
        asset: isBatch ? null : (refs.assetByPath.get(action.filePath) ?? null),
        batch: isBatch ? (refs.batchByPath.get(action.filePath) ?? null) : null,
      })
    } else {
      orphanRows.push({
        kind: "orphan",
        relativePath: action.relativePath,
        sizeBytes: action.sizeBytes,
        destination: safeDestination(action.relativePath, now),
      })
    }
  }

  missingRows.sort((left, right) => comparePaths(rowPath(left), rowPath(right)))
  orphanRows.sort((left, right) => comparePaths(rowPath(left), rowPath(right)))
  return [...missingRows, ...orphanRows]
}

function rowPath(row: StorageRow) {
  return row.kind === "missing" ? row.filePath : row.relativePath
}

// A scanned path the archive would refuse has no destination to show (the server refuses it too).
function safeDestination(relativePath: string, now: Date) {
  try {
    return archiveDestinationPreview(relativePath, now)
  } catch {
    return ""
  }
}

// The first STORAGE_ROWS_PREVIEW rows of the chosen kind, or all of them with show-all. `hidden` counts the rest.
export function filterStorageRows(
  rows: StorageRow[],
  filter: StorageFilter,
  showAll: boolean
): { rows: StorageRow[]; total: number; hidden: number } {
  const matching = filter === "all" ? rows : rows.filter((row) => row.kind === filter)
  const shown = showAll ? matching : matching.slice(0, STORAGE_ROWS_PREVIEW)
  return { rows: shown, total: matching.length, hidden: matching.length - shown.length }
}

// Every attachment module the app writes, with its label under storagePage.*.
const STORAGE_MODULE_LABEL_KEYS: Readonly<Record<string, string>> = {
  asset: "moduleAsset",
  maintenance: "moduleMaintenance",
  audit_finding: "moduleAuditFinding",
  disposal: "moduleDisposal",
  disposal_batch: "moduleDisposalBatch",
  asset_model: "moduleAssetModel",
  purchase_document: "modulePurchaseDocument",
  asset_purchase: "moduleAssetPurchase",
  checkout_photo_before: "moduleCheckoutPhotoBefore",
  checkout_receiver_signature: "moduleCheckoutReceiverSignature",
  checkin_photo_after: "moduleCheckinPhotoAfter",
  checkin_return_signature: "moduleCheckinReturnSignature",
  checkin_receive_signature: "moduleCheckinReceiveSignature",
  asset_component_install: "moduleComponentInstall",
  asset_component_remove: "moduleComponentRemove",
}

export const STORAGE_MODULE_KEYS: readonly string[] = Object.keys(STORAGE_MODULE_LABEL_KEYS)

// The message key under storagePage.* for a module; null means show the raw module code.
export function storageModuleLabelKey(module: string): string | null {
  return Object.prototype.hasOwnProperty.call(STORAGE_MODULE_LABEL_KEYS, module) ? STORAGE_MODULE_LABEL_KEYS[module] : null
}
