import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export type UploadVirusScanResult = {
  skipped: boolean
}

export type UploadScanReadinessInput = {
  command?: string | null
  args?: string | null
  timeoutMs?: string | null
}

export type UploadScanReadiness = {
  status: "pass" | "warning" | "fail"
  value: string
}

export function resolveUploadScanArgs(filePath: string, argsTemplate = process.env.UPLOAD_SCAN_ARGS) {
  const template = argsTemplate?.trim()
  if (!template) return [filePath]

  return template
    .split(/\s+/)
    .filter(Boolean)
    .map((arg) => arg.replaceAll("{file}", filePath))
}

export function getUploadScanReadiness(input: UploadScanReadinessInput): UploadScanReadiness {
  const command = input.command?.trim() ?? ""
  if (!command) return { status: "warning", value: "disabled" }

  const timeoutMs = input.timeoutMs?.trim() || "30000"
  const timeout = Number(timeoutMs)
  if (!Number.isFinite(timeout) || timeout <= 0) {
    return { status: "fail", value: "invalid timeout" }
  }

  const args = input.args?.trim() ?? ""
  if (args && !args.includes("{file}")) {
    return { status: "warning", value: "args missing {file}" }
  }

  return { status: "pass", value: `enabled: ${command} (${timeout} ms)` }
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
