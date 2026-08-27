import { createHash } from "node:crypto"
import { readFile, readdir, realpath } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

export type ManualMigrationAction = "init" | "status" | "apply" | "baseline"
export type ManualMigrationHistoryStatus = "success" | "failed" | "baselined"
export type ManualMigrationFileStatus = "pending" | "applied" | "failed" | "checksum_mismatch"

export type ManualMigrationCommand =
  | { action: "status"; appliedBy: string }
  | {
      action: "init"
      backupConfirmed: true
      baselineConfirmed: false
      reason: string
      appliedBy: string
    }
  | {
      action: "apply"
      filename: string
      backupConfirmed: true
      baselineConfirmed: false
      reason: string
      appliedBy: string
    }
  | {
      action: "baseline"
      filename: string
      backupConfirmed: false
      baselineConfirmed: true
      reason: string
      appliedBy: string
    }

export type ManualMigrationFile = {
  name: string
  absolutePath: string
  checksumSha256: string
  sql: string
}

export type ManualMigrationHistoryRow = {
  migrationName: string
  checksumSha256: string
  databaseName: string
  status: ManualMigrationHistoryStatus
  appliedAt: Date
  appliedBy: string
  reason: string
  executionMs: number
  errorMessage: string | null
}

export type ManualMigrationAttempt = ManualMigrationHistoryRow

export type ManualMigrationOutput = {
  log(message: string): void
  error(message: string): void
}

export type ManualMigrationStore = {
  getDatabaseName(): Promise<string>
  ledgerExists(): Promise<boolean>
  validateLedgerColumns(): Promise<string[]>
  listHistory(): Promise<ManualMigrationHistoryRow[]>
  acquireLock(resource: string, timeoutMs: number): Promise<boolean>
  releaseLock(resource: string): Promise<void>
  executeBatch(sql: string): Promise<void>
  rollbackOpenTransaction(): Promise<void>
  recordAttempt(attempt: ManualMigrationAttempt): Promise<void>
  close(): Promise<void>
}

export type ManualMigrationDependencies = {
  migrationRoot: string
  store: ManualMigrationStore
  output: ManualMigrationOutput
  secrets?: readonly string[]
  now?: () => Date
  clockMs?: () => number
}

export const manualMigrationBootstrapFilename = "2026-08-27-add-manual-migration-history.sql"
export const requiredManualMigrationLedgerColumns = [
  "id",
  "migrationName",
  "checksumSha256",
  "databaseName",
  "status",
  "appliedAt",
  "appliedBy",
  "reason",
  "executionMs",
  "errorMessage",
  "createdAt",
] as const

export class ManualMigrationUsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ManualMigrationUsageError"
  }
}

export class ManualMigrationUnsupportedBatchError extends ManualMigrationUsageError {
  constructor() {
    super("Standalone GO batch separators are not supported")
    this.name = "ManualMigrationUnsupportedBatchError"
  }
}

export function parseManualMigrationArgs(
  argv: string[],
  fallbackUser = os.userInfo().username,
): ManualMigrationCommand {
  const [rawAction, ...args] = argv
  if (!isManualMigrationAction(rawAction)) throw new ManualMigrationUsageError("Unknown migration command")

  let filename: string | undefined
  let reason: string | undefined
  let appliedBy: string | undefined
  let backupConfirmed = false
  let baselineConfirmed = false

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (!value.startsWith("--")) {
      if (filename) throw new ManualMigrationUsageError("Only one migration filename is allowed")
      filename = value
      continue
    }

    const [flag, inlineValue] = value.split("=", 2)
    if (flag === "--backup-confirmed" && inlineValue === undefined) {
      backupConfirmed = true
      continue
    }
    if (flag === "--confirm-baseline" && inlineValue === undefined) {
      baselineConfirmed = true
      continue
    }
    if (flag === "--reason" || flag === "--by") {
      const nextValue = inlineValue ?? args[index + 1]
      if (!nextValue || (inlineValue === undefined && nextValue.startsWith("--"))) {
        throw new ManualMigrationUsageError(`${flag} requires a value`)
      }
      if (inlineValue === undefined) index += 1
      if (flag === "--reason") {
        if (reason !== undefined) throw new ManualMigrationUsageError("--reason may be provided only once")
        reason = nextValue.trim()
      } else {
        if (appliedBy !== undefined) throw new ManualMigrationUsageError("--by may be provided only once")
        appliedBy = nextValue.trim()
      }
      continue
    }
    throw new ManualMigrationUsageError(`Unknown migration option: ${flag}`)
  }

  const operator = (appliedBy ?? fallbackUser).trim()
  if (!operator || operator.length > 255) throw new ManualMigrationUsageError("Migration operator is required and must not exceed 255 characters")

  if (rawAction === "status") {
    if (filename || reason || appliedBy || backupConfirmed || baselineConfirmed) {
      throw new ManualMigrationUsageError("status does not accept migration options")
    }
    return { action: "status", appliedBy: operator }
  }

  if ((reason?.length ?? 0) < 10 || reason!.length > 500) {
    throw new ManualMigrationUsageError("Migration reason must contain 10 to 500 characters")
  }

  if (rawAction === "init") {
    if (filename || !backupConfirmed || baselineConfirmed) {
      throw new ManualMigrationUsageError("init requires --backup-confirmed and does not accept a filename")
    }
    return { action: "init", backupConfirmed: true, baselineConfirmed: false, reason: reason!, appliedBy: operator }
  }

  if (!filename) throw new ManualMigrationUsageError(`${rawAction} requires one migration filename`)
  if (rawAction === "apply") {
    if (!backupConfirmed || baselineConfirmed) {
      throw new ManualMigrationUsageError("apply requires --backup-confirmed")
    }
    return { action: "apply", filename, backupConfirmed: true, baselineConfirmed: false, reason: reason!, appliedBy: operator }
  }

  if (backupConfirmed || !baselineConfirmed) {
    throw new ManualMigrationUsageError("baseline requires --confirm-baseline")
  }
  return { action: "baseline", filename, backupConfirmed: false, baselineConfirmed: true, reason: reason!, appliedBy: operator }
}

export async function resolveManualMigrationFile(root: string, filename: string): Promise<ManualMigrationFile> {
  if (
    !filename
    || path.isAbsolute(filename)
    || path.basename(filename) !== filename
    || filename.includes("/")
    || filename.includes("\\")
    || path.extname(filename) !== ".sql"
  ) {
    throw new ManualMigrationUsageError("Migration filename must be an exact .sql filename")
  }

  try {
    const realRoot = await realpath(root)
    const candidate = path.join(realRoot, filename)
    const realCandidate = await realpath(candidate)
    if (path.dirname(realCandidate) !== realRoot) {
      throw new ManualMigrationUsageError("Migration file must remain inside prisma/manual-migrations")
    }
    const bytes = await readFile(realCandidate)
    const sql = bytes.toString("utf8")
    if (/^\s*GO\s*$/im.test(sql)) throw new ManualMigrationUnsupportedBatchError()
    return {
      name: filename,
      absolutePath: realCandidate,
      checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      sql,
    }
  } catch (error) {
    if (error instanceof ManualMigrationUsageError) throw error
    throw new ManualMigrationUsageError(`Migration file is unavailable: ${filename}`)
  }
}

export function classifyManualMigration(
  file: Pick<ManualMigrationFile, "name" | "checksumSha256">,
  rows: readonly ManualMigrationHistoryRow[],
): ManualMigrationFileStatus {
  const matchingRows = rows.filter((row) => row.migrationName === file.name)
  const accepted = matchingRows.filter((row) => row.status === "success" || row.status === "baselined")
  if (accepted.some((row) => row.checksumSha256 !== file.checksumSha256)) return "checksum_mismatch"
  if (accepted.some((row) => row.checksumSha256 === file.checksumSha256)) return "applied"
  if (matchingRows.some((row) => row.status === "failed" && row.checksumSha256 === file.checksumSha256)) return "failed"
  return "pending"
}

export function decideManualMigrationApply(
  file: Pick<ManualMigrationFile, "name" | "checksumSha256">,
  rows: readonly ManualMigrationHistoryRow[],
): "execute" | "skip" | "checksum_mismatch" {
  const status = classifyManualMigration(file, rows)
  if (status === "applied") return "skip"
  if (status === "checksum_mismatch") return "checksum_mismatch"
  return "execute"
}

export function sanitizeManualMigrationError(message: string, secrets: readonly string[]): string {
  let sanitized = message
  for (const secret of secrets) {
    if (!secret) continue
    sanitized = sanitized.replace(new RegExp(escapeRegExp(secret), "gi"), "[REDACTED]")
  }
  return sanitized.slice(0, 2000)
}

export async function runManualMigrationCommand(
  command: ManualMigrationCommand,
  dependencies: ManualMigrationDependencies,
): Promise<number> {
  const { store, output } = dependencies
  const files = await discoverManualMigrationFiles(dependencies.migrationRoot)
  const initialized = await store.ledgerExists()
  const databaseName = await store.getDatabaseName()

  if (command.action === "status") {
    if (!initialized) {
      output.error(`Database: ${databaseName}`)
      output.error("NOT_INITIALIZED")
      for (const file of files) output.log(`${file.name} untracked ${shortChecksum(file.checksumSha256)}`)
      return 2
    }

    const missingColumns = await store.validateLedgerColumns()
    if (missingColumns.length > 0) {
      output.error(`Ledger schema is incomplete: ${missingColumns.join(", ")}`)
      return 1
    }
    const historyRows = await store.listHistory()
    output.log(`Database: ${databaseName}`)
    let checksumMismatch = false
    for (const file of files) {
      const status = classifyManualMigration(file, historyRows)
      if (status === "checksum_mismatch") checksumMismatch = true
      const accepted = latestHistoryForFile(historyRows, file.name)
      const metadata = accepted ? ` ${accepted.appliedAt.toISOString()} ${accepted.appliedBy}` : ""
      output.log(`${file.name} ${status} ${shortChecksum(file.checksumSha256)}${metadata}`)
    }
    return checksumMismatch ? 2 : 0
  }

  if (command.action === "init") {
    const bootstrap = files.find((file) => file.name === manualMigrationBootstrapFilename)
    if (!bootstrap) {
      output.error(`Bootstrap migration is missing: ${manualMigrationBootstrapFilename}`)
      return 1
    }
    return runInitCommand(command, bootstrap, initialized, databaseName, dependencies)
  }

  if (!initialized) {
    output.error("Manual migration ledger is not initialized. Run migration:init first.")
    return 1
  }
  const missingColumns = await store.validateLedgerColumns()
  if (missingColumns.length > 0) {
    output.error(`Ledger schema is incomplete: ${missingColumns.join(", ")}`)
    return 1
  }
  const file = files.find((candidate) => candidate.name === command.filename)
  if (!file) {
    output.error(`Migration file is unavailable: ${command.filename}`)
    return 1
  }

  return command.action === "apply"
    ? runApplyCommand(command, file, databaseName, dependencies)
    : runBaselineCommand(command, file, databaseName, dependencies)
}

async function runInitCommand(
  command: Extract<ManualMigrationCommand, { action: "init" }>,
  bootstrap: ManualMigrationFile,
  initialized: boolean,
  databaseName: string,
  dependencies: ManualMigrationDependencies,
) {
  const { store, output } = dependencies
  const lockResource = migrationLockResource(databaseName, bootstrap.name)
  if (!await store.acquireLock(lockResource, 15_000)) {
    output.error(`Could not acquire migration lock: ${bootstrap.name}`)
    return 1
  }

  try {
    if (initialized) {
      const missingColumns = await store.validateLedgerColumns()
      if (missingColumns.length > 0) {
        output.error(`Ledger schema is incomplete: ${missingColumns.join(", ")}`)
        return 1
      }
      const historyRows = await store.listHistory()
      const decision = decideManualMigrationApply(bootstrap, historyRows)
      if (decision === "checksum_mismatch") {
        output.error(`Bootstrap checksum mismatch: ${bootstrap.name}`)
        return 1
      }
      if (decision === "skip") {
        output.log(`Bootstrap already applied: ${bootstrap.name}`)
        return 0
      }
      await store.recordAttempt(buildAttempt(command, bootstrap, databaseName, "baselined", 0, null, dependencies))
      output.log(`Baselined existing ledger: ${bootstrap.name}`)
      return 0
    }

    const start = getClock(dependencies)()
    try {
      await store.executeBatch(bootstrap.sql)
    } catch (error) {
      output.error(sanitizeError(error, dependencies))
      return 1
    }
    const executionMs = Math.max(0, Math.round(getClock(dependencies)() - start))
    const missingColumns = await store.validateLedgerColumns()
    if (missingColumns.length > 0) {
      output.error(`Ledger schema is incomplete after initialization: ${missingColumns.join(", ")}`)
      return 1
    }
    await store.recordAttempt(buildAttempt(command, bootstrap, databaseName, "success", executionMs, null, dependencies))
    output.log(`Initialized manual migration ledger: ${databaseName}`)
    return 0
  } finally {
    await store.releaseLock(lockResource)
  }
}

async function runApplyCommand(
  command: Extract<ManualMigrationCommand, { action: "apply" }>,
  file: ManualMigrationFile,
  databaseName: string,
  dependencies: ManualMigrationDependencies,
) {
  const { store, output } = dependencies
  const initialDecision = decideManualMigrationApply(file, await store.listHistory())
  if (initialDecision === "skip") {
    output.log(`Migration already applied: ${file.name}`)
    return 0
  }
  if (initialDecision === "checksum_mismatch") {
    output.error(`Migration checksum mismatch: ${file.name}`)
    return 1
  }

  const lockResource = migrationLockResource(databaseName, file.name)
  if (!await store.acquireLock(lockResource, 15_000)) {
    output.error(`Could not acquire migration lock: ${file.name}`)
    return 1
  }

  try {
    const lockedDecision = decideManualMigrationApply(file, await store.listHistory())
    if (lockedDecision === "skip") {
      output.log(`Migration already applied: ${file.name}`)
      return 0
    }
    if (lockedDecision === "checksum_mismatch") {
      output.error(`Migration checksum mismatch: ${file.name}`)
      return 1
    }

    const start = getClock(dependencies)()
    try {
      await store.executeBatch(file.sql)
      const executionMs = Math.max(0, Math.round(getClock(dependencies)() - start))
      await store.recordAttempt(buildAttempt(command, file, databaseName, "success", executionMs, null, dependencies))
      output.log(`Applied migration: ${file.name}`)
      return 0
    } catch (error) {
      const errorMessage = sanitizeError(error, dependencies)
      try {
        await store.rollbackOpenTransaction()
        const executionMs = Math.max(0, Math.round(getClock(dependencies)() - start))
        await store.recordAttempt(buildAttempt(command, file, databaseName, "failed", executionMs, errorMessage, dependencies))
      } catch {
        output.error("Migration failed and the failed attempt could not be persisted; inspect the database before retrying.")
      }
      output.error(errorMessage)
      return 1
    }
  } finally {
    await store.releaseLock(lockResource)
  }
}

async function runBaselineCommand(
  command: Extract<ManualMigrationCommand, { action: "baseline" }>,
  file: ManualMigrationFile,
  databaseName: string,
  dependencies: ManualMigrationDependencies,
) {
  const { store, output } = dependencies
  output.log(`Database: ${databaseName}`)
  output.log(`Migration: ${file.name}`)
  output.log(`SHA-256: ${file.checksumSha256}`)

  const initialDecision = decideManualMigrationApply(file, await store.listHistory())
  if (initialDecision === "skip") {
    output.log(`Migration already accepted: ${file.name}`)
    return 0
  }
  if (initialDecision === "checksum_mismatch") {
    output.error(`Migration checksum mismatch: ${file.name}`)
    return 1
  }

  const lockResource = migrationLockResource(databaseName, file.name)
  if (!await store.acquireLock(lockResource, 15_000)) {
    output.error(`Could not acquire migration lock: ${file.name}`)
    return 1
  }
  try {
    const lockedDecision = decideManualMigrationApply(file, await store.listHistory())
    if (lockedDecision === "skip") return 0
    if (lockedDecision === "checksum_mismatch") {
      output.error(`Migration checksum mismatch: ${file.name}`)
      return 1
    }
    await store.recordAttempt(buildAttempt(command, file, databaseName, "baselined", 0, null, dependencies))
    output.log(`Baselined migration: ${file.name}`)
    return 0
  } finally {
    await store.releaseLock(lockResource)
  }
}

async function discoverManualMigrationFiles(root: string) {
  let names: string[]
  try {
    names = (await readdir(root)).filter((name) => name.endsWith(".sql")).sort((left, right) => left.localeCompare(right))
  } catch {
    throw new ManualMigrationUsageError("Manual migration directory is unavailable")
  }
  return Promise.all(names.map((name) => resolveManualMigrationFile(root, name)))
}

function buildAttempt(
  command: Exclude<ManualMigrationCommand, { action: "status" }>,
  file: ManualMigrationFile,
  databaseName: string,
  status: ManualMigrationHistoryStatus,
  executionMs: number,
  errorMessage: string | null,
  dependencies: ManualMigrationDependencies,
): ManualMigrationAttempt {
  return {
    migrationName: file.name,
    checksumSha256: file.checksumSha256,
    databaseName,
    status,
    appliedAt: (dependencies.now ?? (() => new Date()))(),
    appliedBy: command.appliedBy,
    reason: command.reason,
    executionMs,
    errorMessage,
  }
}

function latestHistoryForFile(rows: readonly ManualMigrationHistoryRow[], filename: string) {
  return rows
    .filter((row) => row.migrationName === filename)
    .sort((left, right) => right.appliedAt.getTime() - left.appliedAt.getTime())[0]
}

function shortChecksum(checksum: string) {
  return checksum.slice(0, 12)
}

function migrationLockResource(databaseName: string, filename: string) {
  const identity = createHash("sha256").update(`${databaseName}\0${filename}`).digest("hex")
  return `manual-migration:${identity}`
}

function sanitizeError(error: unknown, dependencies: ManualMigrationDependencies) {
  return sanitizeManualMigrationError(error instanceof Error ? error.message : String(error), dependencies.secrets ?? [])
}

function getClock(dependencies: ManualMigrationDependencies) {
  return dependencies.clockMs ?? (() => Date.now())
}

function isManualMigrationAction(value: string | undefined): value is ManualMigrationAction {
  return value === "init" || value === "status" || value === "apply" || value === "baseline"
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
