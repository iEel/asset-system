import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import {
  ManualMigrationUnsupportedBatchError,
  ManualMigrationUsageError,
  classifyManualMigration,
  decideManualMigrationApply,
  parseManualMigrationArgs,
  resolveManualMigrationFile,
  runManualMigrationCommand,
  sanitizeManualMigrationError,
  type ManualMigrationAttempt,
  type ManualMigrationOutput,
  type ManualMigrationStore,
  type ManualMigrationHistoryRow,
} from "../src/lib/manual-migration-ledger.ts"

test("parses an approved single-file apply command", () => {
  assert.deepEqual(
    parseManualMigrationArgs([
      "apply",
      "2026-08-27-example.sql",
      "--backup-confirmed",
      "--reason",
      "approved change window",
      "--by",
      "operator-a",
    ], "fallback-user"),
    {
      action: "apply",
      filename: "2026-08-27-example.sql",
      backupConfirmed: true,
      baselineConfirmed: false,
      reason: "approved change window",
      appliedBy: "operator-a",
    },
  )
})

test("uses the operating-system user when --by is omitted", () => {
  assert.deepEqual(parseManualMigrationArgs(["status"], "fallback-user"), {
    action: "status",
    appliedBy: "fallback-user",
  })
})

test("rejects incomplete or unknown migration commands", () => {
  const invalid = [
    ["unknown"],
    ["status", "--reason", "not allowed here"],
    ["apply", "example.sql", "--backup-confirmed", "--reason", "short"],
    ["apply", "example.sql", "--reason", "approved change window"],
    ["apply", "--backup-confirmed", "--reason", "approved change window"],
    ["init", "--reason", "approved change window"],
    ["baseline", "example.sql", "--reason", "verified existing schema"],
    ["baseline", "example.sql", "--confirm-baseline", "--reason", "short"],
    ["status", "--unexpected"],
  ]

  for (const argv of invalid) {
    assert.throws(() => parseManualMigrationArgs(argv, "operator"), ManualMigrationUsageError, argv.join(" "))
  }
})

test("resolves an exact contained SQL file and hashes its exact bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "manual-migration-ledger-"))
  const bytes = Buffer.from("SELECT 1;\r\n", "utf8")
  await writeFile(path.join(root, "2026-08-27-example.sql"), bytes)

  const file = await resolveManualMigrationFile(root, "2026-08-27-example.sql")

  assert.equal(file.name, "2026-08-27-example.sql")
  assert.equal(file.sql, bytes.toString("utf8"))
  assert.equal(file.checksumSha256, createHash("sha256").update(bytes).digest("hex"))
})

test("rejects traversal, nested, absolute, missing, and non-SQL filenames", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "manual-migration-ledger-"))
  await mkdir(path.join(root, "nested"))
  await writeFile(path.join(root, "example.txt"), "SELECT 1;")

  for (const filename of [
    "../example.sql",
    "nested/example.sql",
    "nested\\example.sql",
    path.resolve(root, "absolute.sql"),
    "missing.sql",
    "example.txt",
  ]) {
    await assert.rejects(resolveManualMigrationFile(root, filename), ManualMigrationUsageError, filename)
  }
})

test("rejects a symlink that resolves outside the migration directory when supported", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "manual-migration-ledger-"))
  const outside = path.join(await mkdtemp(path.join(tmpdir(), "manual-migration-outside-")), "outside.sql")
  const link = path.join(root, "linked.sql")
  await writeFile(outside, "SELECT 1;")
  try {
    await symlink(outside, link, "file")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") {
      context.skip("Windows symlink privilege is unavailable")
      return
    }
    throw error
  }

  await assert.rejects(resolveManualMigrationFile(root, "linked.sql"), ManualMigrationUsageError)
})

test("rejects standalone GO client batch separators", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "manual-migration-ledger-"))
  await writeFile(path.join(root, "go.sql"), "SELECT 1;\nGO\nSELECT 2;\n")

  await assert.rejects(resolveManualMigrationFile(root, "go.sql"), ManualMigrationUnsupportedBatchError)
})

test("classifies accepted, failed, pending, and changed migration checksums", () => {
  const file = migrationFile("same")
  const successSameChecksum = history({ status: "success", checksumSha256: "same" })
  const baselineSameChecksum = history({ status: "baselined", checksumSha256: "same" })
  const successDifferentChecksum = history({ status: "success", checksumSha256: "different" })
  const failedSameChecksum = history({ status: "failed", checksumSha256: "same" })

  assert.equal(classifyManualMigration(file, []), "pending")
  assert.equal(classifyManualMigration(file, [successSameChecksum]), "applied")
  assert.equal(classifyManualMigration(file, [baselineSameChecksum]), "applied")
  assert.equal(classifyManualMigration(file, [successDifferentChecksum]), "checksum_mismatch")
  assert.equal(classifyManualMigration(file, [failedSameChecksum]), "failed")
  assert.equal(decideManualMigrationApply(file, []), "execute")
  assert.equal(decideManualMigrationApply(file, [failedSameChecksum]), "execute")
  assert.equal(decideManualMigrationApply(file, [successSameChecksum]), "skip")
  assert.equal(decideManualMigrationApply(file, [successDifferentChecksum]), "checksum_mismatch")
})

test("sanitizes configured secrets case-insensitively and bounds stored errors", () => {
  const sanitized = sanitizeManualMigrationError(
    `Login failed at DB-SERVER for db-user password SecretPass ${"x".repeat(3000)}`,
    ["db-server", "DB-USER", "secretpass"],
  )

  assert.doesNotMatch(sanitized, /db-server|db-user|secretpass/i)
  assert.match(sanitized, /\[REDACTED\]/)
  assert.equal(sanitized.length, 2000)
})

test("status is read-only and reports an uninitialized ledger", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore({ ledgerExists: false })
  const output = new OutputCollector()

  const exitCode = await runManualMigrationCommand(
    { action: "status", appliedBy: "operator" },
    { migrationRoot: root, store, output },
  )

  assert.equal(exitCode, 2)
  assert.match(output.text(), /NOT_INITIALIZED/)
  assert.match(output.text(), /2026-08-27-add-manual-migration-history\.sql\s+untracked/)
  assert.match(output.text(), /2026-08-27-example\.sql\s+untracked/)
  assert.deepEqual(store.calls, ["ledgerExists", "databaseName"])
})

test("status reports checksum mismatch as exit 2 without mutating the store", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore({
    history: [history({ migrationName: "2026-08-27-example.sql", status: "success", checksumSha256: "changed" })],
  })
  const output = new OutputCollector()

  const exitCode = await runManualMigrationCommand(
    { action: "status", appliedBy: "operator" },
    { migrationRoot: root, store, output },
  )

  assert.equal(exitCode, 2)
  assert.match(output.text(), /2026-08-27-example\.sql\s+checksum_mismatch/)
  assert.doesNotMatch(store.calls.join(","), /acquireLock|executeBatch|recordAttempt/)
})

test("init creates and records the ledger under a migration-specific lock", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore({ ledgerExists: false })
  const output = new OutputCollector()

  const exitCode = await runManualMigrationCommand(
    {
      action: "init",
      backupConfirmed: true,
      baselineConfirmed: false,
      reason: "verified fresh backup",
      appliedBy: "operator",
    },
    { migrationRoot: root, store, output, now: () => new Date("2026-08-27T01:00:00.000Z"), clockMs: sequenceClock(100, 145) },
  )

  assert.equal(exitCode, 0)
  assert.match(store.calls.join(","), /acquireLock,executeBatch,validateLedgerColumns,recordAttempt,releaseLock/)
  assert.equal(store.attempts[0]?.status, "success")
  assert.equal(store.attempts[0]?.executionMs, 45)
  assert.equal(store.attempts[0]?.migrationName, "2026-08-27-add-manual-migration-history.sql")
})

test("init baselines a complete pre-existing ledger without executing SQL", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore({ ledgerExists: true })

  const exitCode = await runManualMigrationCommand(
    {
      action: "init",
      backupConfirmed: true,
      baselineConfirmed: false,
      reason: "verified existing ledger",
      appliedBy: "operator",
    },
    { migrationRoot: root, store, output: new OutputCollector() },
  )

  assert.equal(exitCode, 0)
  assert.equal(store.attempts[0]?.status, "baselined")
  assert.doesNotMatch(store.calls.join(","), /executeBatch/)
})

test("init rejects an incomplete pre-existing ledger", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore({ missingColumns: ["checksumSha256"] })
  const output = new OutputCollector()

  const exitCode = await runManualMigrationCommand(
    {
      action: "init",
      backupConfirmed: true,
      baselineConfirmed: false,
      reason: "verified existing ledger",
      appliedBy: "operator",
    },
    { migrationRoot: root, store, output },
  )

  assert.equal(exitCode, 1)
  assert.match(output.text(), /checksumSha256/)
  assert.equal(store.attempts.length, 0)
})

test("apply skips accepted checksum and rejects changed checksum before execution", async () => {
  const root = await createMigrationRoot()
  const resolved = await resolveManualMigrationFile(root, "2026-08-27-example.sql")

  for (const [checksum, expectedCode, message] of [
    [resolved.checksumSha256, 0, "already applied"],
    ["different", 1, "checksum mismatch"],
  ] as const) {
    const store = new FakeStore({ history: [history({ status: "success", checksumSha256: checksum })] })
    const output = new OutputCollector()
    const exitCode = await runManualMigrationCommand(applyCommand(), { migrationRoot: root, store, output })
    assert.equal(exitCode, expectedCode)
    assert.match(output.text(), new RegExp(message, "i"))
    assert.doesNotMatch(store.calls.join(","), /acquireLock|executeBatch|recordAttempt/)
  }
})

test("apply rechecks under lock, executes exact SQL, and records success", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore()

  const exitCode = await runManualMigrationCommand(applyCommand(), {
    migrationRoot: root,
    store,
    output: new OutputCollector(),
    clockMs: sequenceClock(10, 37),
  })

  assert.equal(exitCode, 0)
  assert.equal(store.executedSql[0], "SELECT 1;\n")
  assert.equal(store.attempts[0]?.status, "success")
  assert.equal(store.attempts[0]?.executionMs, 27)
  assert.match(store.calls.join(","), /acquireLock,listHistory,executeBatch,recordAttempt,releaseLock/)
})

test("apply records sanitized failure and attempts rollback", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore({ executeError: new Error("DB-SERVER login DB-USER SecretPass") })
  const output = new OutputCollector()

  const exitCode = await runManualMigrationCommand(applyCommand(), {
    migrationRoot: root,
    store,
    output,
    secrets: ["DB-SERVER", "DB-USER", "SecretPass"],
  })

  assert.equal(exitCode, 1)
  assert.match(store.calls.join(","), /executeBatch,rollbackOpenTransaction,recordAttempt,releaseLock/)
  assert.equal(store.attempts[0]?.status, "failed")
  assert.doesNotMatch(store.attempts[0]?.errorMessage ?? "", /DB-SERVER|DB-USER|SecretPass/i)
  assert.doesNotMatch(output.text(), /DB-SERVER|DB-USER|SecretPass/i)
})

test("baseline records history without executing migration SQL", async () => {
  const root = await createMigrationRoot()
  const store = new FakeStore()
  const output = new OutputCollector()

  const exitCode = await runManualMigrationCommand(
    {
      action: "baseline",
      filename: "2026-08-27-example.sql",
      backupConfirmed: false,
      baselineConfirmed: true,
      reason: "verified existing schema",
      appliedBy: "operator",
    },
    { migrationRoot: root, store, output },
  )

  assert.equal(exitCode, 0)
  assert.equal(store.executedSql.length, 0)
  assert.equal(store.attempts[0]?.status, "baselined")
  assert.match(output.text(), /asset_management/)
  assert.match(output.text(), /[a-f0-9]{64}/)
})

test("migration lock resource stays within SQL Server's 255-character limit", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "manual-migration-ledger-"))
  const filename = `${"a".repeat(190)}.sql`
  await writeFile(path.join(root, filename), "SELECT 1;\n")
  const store = new FakeStore({ databaseName: "d".repeat(255) })

  const exitCode = await runManualMigrationCommand(
    { ...applyCommand(), filename },
    { migrationRoot: root, store, output: new OutputCollector() },
  )

  assert.equal(exitCode, 0)
  assert.ok((store.lockResources[0]?.length ?? 256) <= 255)
})

function migrationFile(checksumSha256: string) {
  return {
    name: "2026-08-27-example.sql",
    absolutePath: "D:/repo/prisma/manual-migrations/2026-08-27-example.sql",
    checksumSha256,
    sql: "SELECT 1;",
  }
}

function history(overrides: Partial<ManualMigrationHistoryRow>): ManualMigrationHistoryRow {
  return {
    migrationName: "2026-08-27-example.sql",
    checksumSha256: "same",
    databaseName: "asset_management",
    status: "failed",
    appliedAt: new Date("2026-08-27T00:00:00.000Z"),
    appliedBy: "operator",
    reason: "approved migration attempt",
    executionMs: 12,
    errorMessage: null,
    ...overrides,
  }
}

async function createMigrationRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "manual-migration-ledger-"))
  await writeFile(path.join(root, "2026-08-27-add-manual-migration-history.sql"), "CREATE TABLE example (id int);\n")
  await writeFile(path.join(root, "2026-08-27-example.sql"), "SELECT 1;\n")
  return root
}

function applyCommand() {
  return {
    action: "apply" as const,
    filename: "2026-08-27-example.sql",
    backupConfirmed: true as const,
    baselineConfirmed: false as const,
    reason: "approved change window",
    appliedBy: "operator",
  }
}

class OutputCollector implements ManualMigrationOutput {
  readonly lines: string[] = []
  log(message: string) { this.lines.push(message) }
  error(message: string) { this.lines.push(message) }
  text() { return this.lines.join("\n") }
}

class FakeStore implements ManualMigrationStore {
  readonly calls: string[] = []
  readonly attempts: ManualMigrationAttempt[] = []
  readonly executedSql: string[] = []
  readonly lockResources: string[] = []
  private exists: boolean
  private databaseName: string
  private historyRows: ManualMigrationHistoryRow[]
  private missingColumns: string[]
  private executeError?: Error

  constructor(options: {
    ledgerExists?: boolean
    history?: ManualMigrationHistoryRow[]
    missingColumns?: string[]
    executeError?: Error
    databaseName?: string
  } = {}) {
    this.exists = options.ledgerExists ?? true
    this.historyRows = options.history ?? []
    this.missingColumns = options.missingColumns ?? []
    this.executeError = options.executeError
    this.databaseName = options.databaseName ?? "asset_management"
  }

  async getDatabaseName() { this.calls.push("databaseName"); return this.databaseName }
  async ledgerExists() { this.calls.push("ledgerExists"); return this.exists }
  async validateLedgerColumns() { this.calls.push("validateLedgerColumns"); return this.missingColumns }
  async listHistory() { this.calls.push("listHistory"); return [...this.historyRows] }
  async acquireLock(resource: string) { this.calls.push("acquireLock"); this.lockResources.push(resource); return true }
  async releaseLock() { this.calls.push("releaseLock") }
  async executeBatch(sql: string) {
    this.calls.push("executeBatch")
    this.executedSql.push(sql)
    if (this.executeError) throw this.executeError
    this.exists = true
  }
  async rollbackOpenTransaction() { this.calls.push("rollbackOpenTransaction") }
  async recordAttempt(attempt: ManualMigrationAttempt) {
    this.calls.push("recordAttempt")
    this.attempts.push(attempt)
    this.historyRows.push({ ...attempt })
  }
  async close() { this.calls.push("close") }
}

function sequenceClock(...values: number[]) {
  let index = 0
  return () => values[Math.min(index++, values.length - 1)]
}
