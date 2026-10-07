// Uploads one file at a time and returns how many failed, so a saved record is never lost
// because of a bad file and the user can attach the failed ones again.
export async function uploadRepairFiles(
  recordId: string,
  files: File[],
  imageType: "before_repair" | "after_repair",
) {
  let failed = 0
  for (const file of files) {
    const body = new FormData()
    body.append("file", file)
    body.append("attachmentType", file.type.startsWith("image/") ? imageType : "invoice")
    try {
      const response = await fetch(`/api/maintenance-tickets/${recordId}/attachments`, { method: "POST", body })
      if (!response.ok) failed += 1
    } catch {
      failed += 1
    }
  }
  return failed
}
