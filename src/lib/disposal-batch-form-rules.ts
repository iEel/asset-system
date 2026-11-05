// The disposal batch form's pure rules (request batches spec §4, Task 2). Client-safe and server-safe.
//
// - Send rules: at least 2 machines; the lot photo (a lost batch: one file of any kind); the method; the reason as the
//   single form (required, 12 characters after trim, at most 4000); the requester. A machine's own photo is never
//   required, so no rule here reads a row's files.
// - After the create: the lot files go to the batch, then each row's files to its own request, found by assetId in the
//   create result (the server's order need not be the rows').
// - The upload summary lists only the machines with a failed file, in job order, and counts the lot's failures.

import { getApiErrorKey } from "./api-error-catalog.ts"
import { isDisposalPhotoFile } from "./disposal-photo.ts"
import { getDisposalPhotoRequirementError } from "./disposal-request-form-rules.ts"
import { getDisposalRequestReasonError } from "./disposal-type-policy.ts"
import { maxLength, required } from "./validation-rules.ts"

export const DISPOSAL_BATCH_MIN_ASSETS = 2
export const DISPOSAL_BATCH_MAX_ASSETS = 100
export const DISPOSAL_BATCH_REASON_MIN = 12
export const DISPOSAL_BATCH_REASON_MAX = 4000

export type DisposalBatchFormField = "assets" | "lotFiles" | "disposalType" | "reason" | "requestedById"

export function validateDisposalBatchForm(input: {
  assetCount: number
  lotFiles: readonly { type: string; name: string }[]
  disposalType: string
  reason: string
  requestedById: string
}): Partial<Record<DisposalBatchFormField, string>> {
  const errors: Partial<Record<DisposalBatchFormField, string>> = {}
  const check = (key: DisposalBatchFormField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("assets", input.assetCount < DISPOSAL_BATCH_MIN_ASSETS ? "batchMinAssets" : null)
  check("lotFiles", getDisposalPhotoRequirementError(input.lotFiles, input.disposalType))
  check("disposalType", required(input.disposalType))
  // The server's own 12-character rule; its code is the message's catalog key (disposalReasonTooShort).
  const reasonTooShort = getDisposalRequestReasonError(input.reason)
  check("reason", required(input.reason) ?? (reasonTooShort && getApiErrorKey(reasonTooShort)) ?? maxLength(input.reason, DISPOSAL_BATCH_REASON_MAX))
  check("requestedById", required(input.requestedById))
  return errors
}

// A machine has its own photo only with an image among its files: a PDF never becomes the machine's photo.
export function disposalBatchPhotoCount(rows: readonly { files: readonly { type: string }[] }[]): { machines: number; withOwnPhoto: number } {
  return { machines: rows.length, withOwnPhoto: rows.filter((row) => row.files.some((file) => isDisposalPhotoFile(file.type))).length }
}

export type DisposalBatchUploadJob =
  | { kind: "machine"; requestId: string; disposalNo: string; assetTag: string; file: File }
  | { kind: "lot"; batchId: string; file: File }

export function planDisposalBatchUploads(
  created: { batch: { id: string }; requests: { id: string; assetId: string; disposalNo: string }[] },
  rows: readonly { assetId: string; assetTag: string; files: readonly File[] }[],
  lotFiles: readonly File[],
): DisposalBatchUploadJob[] {
  const requestByAsset = new Map(created.requests.map((request) => [request.assetId, request]))
  const jobs: DisposalBatchUploadJob[] = lotFiles.map((file) => ({ kind: "lot", batchId: created.batch.id, file }))
  for (const row of rows) {
    const request = requestByAsset.get(row.assetId)
    if (!request) continue
    for (const file of row.files) {
      jobs.push({ kind: "machine", requestId: request.id, disposalNo: request.disposalNo, assetTag: row.assetTag, file })
    }
  }
  return jobs
}

export function summarizeDisposalBatchUploads(results: readonly { job: DisposalBatchUploadJob; ok: boolean }[]): {
  lotFailed: number
  machines: Array<{ requestId: string; disposalNo: string; assetTag: string; failed: number }>
} {
  let lotFailed = 0
  const machines = new Map<string, { requestId: string; disposalNo: string; assetTag: string; failed: number }>()
  for (const { job, ok } of results) {
    if (ok) continue
    if (job.kind === "lot") {
      lotFailed += 1
      continue
    }
    const machine = machines.get(job.requestId) ?? { requestId: job.requestId, disposalNo: job.disposalNo, assetTag: job.assetTag, failed: 0 }
    machine.failed += 1
    machines.set(job.requestId, machine)
  }
  return { lotFailed, machines: [...machines.values()] }
}

/** Runs each task with at most `limit` in flight (PB-R4: the batch's uploads run 4 at a time); results keep task order. */
export async function runWithLimit<T>(tasks: ReadonlyArray<() => Promise<T>>, limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length)
  let next = 0
  async function worker() {
    while (next < tasks.length) {
      const index = next++
      results[index] = await tasks[index]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return results
}
