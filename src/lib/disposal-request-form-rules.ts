// The disposal request form's pure rules (group 6 spec §8, plan 3 Task 1). Client-safe and server-safe: no runtime
// import beyond the photo rule's constants.
//
// - Photo: a request needs one image (JPG, PNG or WEBP) before it is sent; a lost request needs one file of any accepted
//   type. The rule is a client gate; the server POST is unchanged.
// - A queued HEIC/HEIF (or any image outside the three) is refused at once, by its type, or by its extension when the
//   browser gives no type.
// - The requester starts as the signed-in user's employee, when that employee is in the list.
// - The summary returns message keys and raw values; the form translates them.

import { disposalPhotoMimeTypes } from "./disposal-photo.ts"

export type DisposalPhotoRequirementError = "photoRequired" | "fileRequired"

type ReadinessInput = { eligible: boolean; blockers: readonly string[] }

function isAcceptedPhotoType(type: string) {
  return (disposalPhotoMimeTypes as readonly string[]).includes(type.toLowerCase())
}

export function getDisposalPhotoRequirementError(
  files: ReadonlyArray<{ type: string }>,
  disposalType: string | "",
): DisposalPhotoRequirementError | null {
  if (disposalType === "lost") return files.length > 0 ? null : "fileRequired"
  return files.some((file) => isAcceptedPhotoType(file.type)) ? null : "photoRequired"
}

const refusedImageExtension = /\.(heic|heif)$/i

export function getDisposalQueuedFileError(file: { type: string; name: string }): "DISPOSAL_PHOTO_TYPE" | null {
  const type = file.type.toLowerCase()
  if (type.startsWith("image/")) return isAcceptedPhotoType(type) ? null : "DISPOSAL_PHOTO_TYPE"
  if (!type && refusedImageExtension.test(file.name)) return "DISPOSAL_PHOTO_TYPE"
  return null
}

/** "ready" shows the form's "ไม่มีงานค้าง: …" line; anything else shows the blockers instead. */
export function disposalReadinessLine(asset: ReadinessInput): "ready" | "blocked" {
  return asset.eligible && asset.blockers.length === 0 ? "ready" : "blocked"
}

/** The ?assetId= prefill: a ready asset is preselected, a blocked one is named with its reason, a missing one is ignored. */
export function initialDisposalAsset(asset: ReadinessInput | null): "use" | "blocked" | "none" {
  if (!asset) return "none"
  return disposalReadinessLine(asset) === "ready" ? "use" : "blocked"
}

export function defaultDisposalRequester(
  user: { employeeId: string | null },
  employees: ReadonlyArray<{ id: string }>,
): { requestedById: string; needsChoice: boolean } {
  const listed = user.employeeId !== null && employees.some((employee) => employee.id === user.employeeId)
  return listed ? { requestedById: user.employeeId as string, needsChoice: false } : { requestedById: "", needsChoice: true }
}

export type DisposalRequestSummaryRow = { key: "assetStatus" | "request" | "approver"; now: string | null; next: string }
export type DisposalRequestSummaryCheck = { key: "asset" | "method" | "requesterReason" | "photo"; done: boolean }

/**
 * Rows (spec §8.5):
 * - assetStatus: now = the asset's status name (raw), next = the key "pendingDisposal";
 * - request: now = null (ยังไม่มี), next = the key "pending";
 * - approver: now = null, next = the chosen approver's label (raw) or the key "anyApprover" when none is chosen.
 * Checks: asset chosen, method chosen, requester and reason, and the photo rule (any file for lost).
 */
export function buildDisposalRequestSummary(input: {
  assetStatusName: string | null
  disposalType: string | ""
  approverLabel: string | null
  photoCount: number
  fileCount: number
  requesterChosen: boolean
  reasonOk: boolean
}): { rows: DisposalRequestSummaryRow[]; checks: DisposalRequestSummaryCheck[] } {
  const photoDone = input.disposalType === "lost" ? input.fileCount > 0 : input.photoCount > 0
  return {
    rows: [
      { key: "assetStatus", now: input.assetStatusName, next: "pendingDisposal" },
      { key: "request", now: null, next: "pending" },
      { key: "approver", now: null, next: input.approverLabel ?? "anyApprover" },
    ],
    checks: [
      { key: "asset", done: input.assetStatusName !== null },
      { key: "method", done: input.disposalType !== "" },
      { key: "requesterReason", done: input.requesterChosen && input.reasonOk },
      { key: "photo", done: photoDone },
    ],
  }
}
