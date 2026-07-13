type DisposalEvidenceUploadResult = {
  fileName: string
  ok: boolean
}

export function summarizeDisposalEvidenceUploads(requestId: string, results: DisposalEvidenceUploadResult[]) {
  const failedFileNames = results.filter((result) => !result.ok).map((result) => result.fileName)

  return {
    requestId,
    uploadedCount: results.length - failedFileNames.length,
    failedFileNames,
    status: failedFileNames.length > 0 ? "created_with_upload_errors" as const : "created" as const,
  }
}

