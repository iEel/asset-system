import { unlink } from "node:fs/promises"
import { scanUploadedFile } from "@/lib/upload-virus-scan"

export async function scanWrittenUploadFile(filePath: string) {
  try {
    await scanUploadedFile(filePath)
  } catch (error) {
    await unlink(filePath).catch(() => undefined)
    throw error
  }
}
