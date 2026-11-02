import { buildAssetLabelPrintHash, LABEL_PRINT_NOTE_MAX } from "./asset-label-print-hash.ts"
import { normalizeLabelPrintAssetIds } from "./asset-label-print-tracking.ts"
import { assetLabelPresets, type AssetLabelTapeSize } from "./asset-label-template.ts"
import type { LabelQueueRow } from "./asset-label-queue.ts"

// The labels page's print list (group 4 plan 6 Task 5, spec §11, board AR-Labels): its order, the print URL (P6-R9), the
// test print (P6-R8) and the rows refreshed after a print in the other tab (P6-R13). The preview's label data comes from
// the mapper the print routes use (asset-label-data.ts). Pure, so node --test runs them.

export const labelPrintOrders = ["selected", "assetTag", "location", "category"] as const
export type LabelPrintOrder = (typeof labelPrintOrders)[number]

type CodeName = { code: string; name: string }
const codeName = (value: CodeName | null) => (value ? `${value.code} - ${value.name}` : "")

/** The print order: as added, or by tag, room or category ("code - name"), each ending on the tag. */
export function sortLabelPrintList<T extends Pick<LabelQueueRow, "assetTag" | "location" | "category">>(rows: readonly T[], order: LabelPrintOrder): T[] {
  if (order === "selected") return [...rows]
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
  const valueOf = (row: T) => (order === "assetTag" ? row.assetTag : order === "location" ? codeName(row.location) : codeName(row.category))
  return [...rows].sort((left, right) => collator.compare(valueOf(left), valueOf(right)) || collator.compare(left.assetTag, right.assetTag))
}

/**
 * The print route's URL: the ids in the query (the server reads them; in order, once each, at most 100, P6-R2), tape
 * and note in the hash (P6-R9), which never reaches the server or Nginx's request line. The note is the record's
 * reason: at most 500, without the spaces around it.
 */
export function buildLabelPrintUrl({ locale, ids, tapeSize, note }: { locale: string; ids: readonly string[]; tapeSize: AssetLabelTapeSize; note: string }) {
  const params = new URLSearchParams()
  for (const id of normalizeLabelPrintAssetIds([...ids])) params.append("id", id)
  return `/${locale}/assets/labels?${params.toString()}${buildAssetLabelPrintHash({ tapeSize, note: note.trim().slice(0, LABEL_PRINT_NOTE_MAX) })}`
}

/** The label the preview shows: the index kept inside the list (a removed row moves it back to the last label). */
export function labelPreviewIndex(index: number, size: number) {
  if (size === 0) return 0
  return Math.min(Math.max(index, 0), size - 1)
}

/**
 * P6-R8: the test print prints the label shown in the preview, as a batch of 1. With no note typed it sends the test
 * note ("พิมพ์ทดสอบ"), so the print history tells it apart.
 */
export function labelTestPrint<T extends { id: string }>(rows: readonly T[], index: number, note: string, testNote: string) {
  const shown = rows[labelPreviewIndex(index, rows.length)]
  if (!shown) return null
  return { ids: [shown.id], note: note.trim() || testNote }
}

/** The tape as the page shows it: "18 mm", or the custom tape's word. */
export function labelTapeText(size: AssetLabelTapeSize, customText: string) {
  return size === "custom" ? customText : assetLabelPresets[size].label
}

/** P6-R13: each listed row becomes today's from the lookup, in the list's order; a row it did not return stays. */
export function refreshLabelRows<T extends { id: string }>(current: readonly T[], fresh: readonly T[]): T[] {
  const byId = new Map(fresh.map((row) => [row.id, row]))
  return current.map((row) => byId.get(row.id) ?? row)
}
