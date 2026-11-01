import { unlink } from "node:fs/promises"
import path from "node:path"
import { assertSafeUploadPath, isMissingFileError } from "@/lib/uploads"
import { scanUploadedFile } from "@/lib/upload-virus-scan"

export async function scanWrittenUploadFile(filePath: string) {
  try {
    await scanUploadedFile(filePath)
  } catch (error) {
    await unlink(filePath).catch(() => undefined)
    throw error
  }
}

// Removes files a save wrote but did not keep (group 3 follow-up C). Only a path inside the upload root is deleted; a file
// already gone is fine; any other failure is logged with the file's name alone and never thrown, so the answer the route
// was giving stays the answer.
export async function discardUploadedFiles(filePaths: readonly string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await unlink(assertSafeUploadPath(filePath))
    } catch (error) {
      if (isMissingFileError(error)) continue
      console.warn("Could not discard an uploaded file", path.basename(filePath), error instanceof Error ? error.message : error)
    }
  }
}

// A route creates one, tracks each file it saves, commits on the line after its transaction (or its one attachment row)
// resolves, and discards in a finally: a file is discarded only when the handler leaves before the commit. A refusal or
// a rollback discards; a logAudit failure after the commit does not, since the committed row points at the file.
export function createUploadCleanup() {
  const filePaths: string[] = []
  let committed = false
  return {
    track(filePath: string) {
      filePaths.push(filePath)
    },
    commit() {
      committed = true
    },
    async discardIfUncommitted() {
      if (committed || filePaths.length === 0) return
      await discardUploadedFiles(filePaths.splice(0))
    },
  }
}

export type UploadCleanup = ReturnType<typeof createUploadCleanup>
