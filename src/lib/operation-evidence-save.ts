// Saving a return's evidence files, shared by the single return (src/app/api/assets/[id]/checkin/route.ts) and the
// multi-return (src/app/api/asset-checkins/batch/route.ts). Every save that finished is tracked before the first failure
// is thrown, so a sibling's failed save does not leave the other files behind (group 3 follow-up C).
import { saveOperationEvidenceFile, type SavedOperationEvidence } from "@/lib/asset-operation-evidence"
import type { UploadCleanup } from "@/lib/upload-server"

// One saved file (or null) per given file (or null), in the given order.
export async function saveTrackedEvidenceFiles(
  files: ReadonlyArray<File | null>,
  operation: "checkout" | "checkin",
  uploads: UploadCleanup,
): Promise<Array<SavedOperationEvidence | null>> {
  const settled = await Promise.allSettled(files.map((file) => file ? saveOperationEvidenceFile(file, operation) : Promise.resolve(null)))
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) uploads.track(result.value.filePath)
  }
  const failed = settled.find((result) => result.status === "rejected")
  if (failed) throw failed.reason
  return settled.map((result) => (result.status === "fulfilled" ? result.value : null))
}

// The non-empty files sent under one multipart name.
export function optionalFormFiles(formData: FormData, name: string): File[] {
  return formData.getAll(name).filter((value): value is File => {
    return value instanceof File && value.size > 0 && value.name.trim().length > 0
  })
}
