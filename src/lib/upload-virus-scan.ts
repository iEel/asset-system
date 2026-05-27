import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export type UploadVirusScanResult = {
  skipped: boolean
}

export function resolveUploadScanArgs(filePath: string, argsTemplate = process.env.UPLOAD_SCAN_ARGS) {
  const template = argsTemplate?.trim()
  if (!template) return [filePath]

  return template
    .split(/\s+/)
    .filter(Boolean)
    .map((arg) => arg.replaceAll("{file}", filePath))
}

export async function scanUploadedFile(filePath: string): Promise<UploadVirusScanResult> {
  const command = process.env.UPLOAD_SCAN_COMMAND?.trim()
  if (!command) return { skipped: true }

  const timeout = Number(process.env.UPLOAD_SCAN_TIMEOUT_MS ?? "30000")
  const { stdout, stderr } = await execFileAsync(command, resolveUploadScanArgs(filePath), {
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 30000,
  })
  if (/FOUND/i.test(`${stdout}\n${stderr}`)) {
    throw new Error("Uploaded file failed malware scan")
  }
  return { skipped: false }
}
