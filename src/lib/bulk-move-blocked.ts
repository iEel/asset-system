// The assets a ย้ายที่ตั้งหลายรายการ refusal names (server search Task 7): the 409 of /api/assets/bulk-move carries
// `blocked: [{ assetId, assetTag, code }]` (a License, a Disposed or Retired asset), and the form shows them under the
// asset field by tag and reason instead of a toast.
export type BulkMoveBlockedAsset = { assetId: string; assetTag: string; code: string }

export function readBulkMoveBlocked(payload: unknown): BulkMoveBlockedAsset[] {
  if (!payload || typeof payload !== "object") return []
  const blocked = (payload as { blocked?: unknown }).blocked
  if (!Array.isArray(blocked)) return []
  const out: BulkMoveBlockedAsset[] = []
  for (const entry of blocked) {
    if (!entry || typeof entry !== "object") continue
    const { assetId, assetTag, code } = entry as Record<string, unknown>
    if (typeof assetId === "string" && typeof assetTag === "string" && typeof code === "string") out.push({ assetId, assetTag, code })
  }
  return out
}

// "NB-001, NB-002 (reason) · LIC-007 (reason)": the tags grouped by reason, in the order the server first named each.
export function bulkMoveBlockedList(blocked: readonly BulkMoveBlockedAsset[], reasonOf: (code: string) => string): string {
  const groups = new Map<string, string[]>()
  for (const asset of blocked) {
    const tags = groups.get(asset.code)
    if (tags) tags.push(asset.assetTag)
    else groups.set(asset.code, [asset.assetTag])
  }
  return [...groups].map(([code, tags]) => `${tags.join(", ")} (${reasonOf(code)})`).join(" · ")
}
