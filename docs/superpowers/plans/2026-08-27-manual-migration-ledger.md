# Manual Migration Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SQL Server-backed CLI ledger that safely reports, initializes, applies, and baselines repository manual migrations with immutable SHA-256 checksums.

**Architecture:** Keep filename/checksum/status/command policy and dependency-injected orchestration in `src/lib/manual-migration-ledger.ts`. Isolate SQL Server session, application-lock, batch-execution, and parameterized ledger persistence in `src/lib/manual-migration-sql-server.ts`; expose it through one thin script and four package commands. Bootstrap the ledger through one idempotent manual SQL file and map the table in Prisma for schema visibility.

**Tech Stack:** Node.js 24, TypeScript, Node built-in test runner, `tedious` 19, Prisma 7.8 schema generation, SQL Server

**Spec:** `docs/superpowers/specs/2026-08-27-manual-migration-ledger-design.md`

## Global Constraints

- `migration:status` must be read-only and must not initialize the database.
- Mutating commands accept only exact `.sql` filenames inside `prisma/manual-migrations/`.
- `init` and `apply` require `--backup-confirmed`; `baseline` requires `--confirm-baseline`.
- Every mutating command requires a reason of at least 10 trimmed characters.
- An accepted filename whose checksum changes must never execute or be re-baselined.
- Errors and output must never reveal the database password, connection URL, server name, or credential username.
- Existing migration files remain immutable; corrections use a new file.
- Do not initialize or baseline the current database until the user confirms a fresh verified backup after implementation.
- Preserve all unrelated `.agents`, `.codex`, `.impeccable`, `.superpowers`, and worktree changes.

---

### Task 1: Pure migration policy and status classification

**Files:**
- Create: `tests/manual-migration-ledger.test.ts`
- Create: `src/lib/manual-migration-ledger.ts`

**Interfaces:**
- Produces `parseManualMigrationArgs(argv: string[]): ManualMigrationCommand`.
- Produces `resolveManualMigrationFile(root: string, filename: string): Promise<ManualMigrationFile>`.
- Produces `classifyManualMigration(file, rows): ManualMigrationFileStatus`.
- Produces `decideManualMigrationApply(file, rows): "execute" | "skip" | "checksum_mismatch"`.
- Produces `sanitizeManualMigrationError(message, secrets): string`.

- [x] **Step 1: Write failing tests for command parsing**

Add tests that express the required API:

```ts
assert.deepEqual(
  parseManualMigrationArgs([
    "apply",
    "2026-08-27-example.sql",
    "--backup-confirmed",
    "--reason",
    "approved change window",
    "--by",
    "operator-a",
  ]),
  {
    action: "apply",
    filename: "2026-08-27-example.sql",
    backupConfirmed: true,
    baselineConfirmed: false,
    reason: "approved change window",
    appliedBy: "operator-a",
  },
)
```

Cover missing/short reason, missing filename, unknown action/flag, `apply` without backup confirmation, `init` without backup confirmation, and `baseline` without baseline confirmation. Each invalid case must throw `ManualMigrationUsageError` without reading the database.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/manual-migration-ledger.test.ts
```

Expected: module-not-found failure for `src/lib/manual-migration-ledger.ts`.

- [x] **Step 3: Implement command types and parsing**

Create discriminated command types for `init`, `status`, `apply`, and `baseline`. Parse only the exact flags in the spec. Default `appliedBy` to `os.userInfo().username`; normalize but do not log secrets or the full environment.

- [x] **Step 4: Write failing tests for file containment and checksum**

Use a temporary directory containing one real SQL file and assert:

```ts
const file = await resolveManualMigrationFile(root, "2026-08-27-example.sql")
assert.equal(file.name, "2026-08-27-example.sql")
assert.equal(file.checksumSha256, createHash("sha256").update(bytes).digest("hex"))
```

Reject `../example.sql`, `subdir/example.sql`, absolute Windows/Unix paths, non-SQL files, missing files, and a symlink whose real path leaves the root. Reject a standalone `GO` line with `ManualMigrationUnsupportedBatchError`.

- [x] **Step 5: Run the focused test and verify RED**

Expected: parsing tests pass and new file/checksum assertions fail because the functions are absent.

- [x] **Step 6: Implement contained file discovery and SHA-256**

Resolve the manual-migrations root and candidate with `realpath`, require `basename(filename) === filename`, require the candidate parent to equal the root, read exact bytes, calculate lowercase SHA-256, and retain UTF-8 SQL text only after containment succeeds.

- [x] **Step 7: Write failing tests for classification and sanitization**

Create accepted and failed history fixtures and assert:

```ts
assert.equal(classifyManualMigration(file, []), "pending")
assert.equal(classifyManualMigration(file, [successSameChecksum]), "applied")
assert.equal(classifyManualMigration(file, [successDifferentChecksum]), "checksum_mismatch")
assert.equal(classifyManualMigration(file, [failedSameChecksum]), "failed")
assert.equal(decideManualMigrationApply(file, [successSameChecksum]), "skip")
assert.equal(decideManualMigrationApply(file, [successDifferentChecksum]), "checksum_mismatch")
```

Assert sanitization replaces every supplied secret case-insensitively, bounds output to 2,000 characters, and preserves a useful non-secret error summary.

- [x] **Step 8: Implement classification, apply decision, and sanitization**

Accepted rows are `success` or `baselined`. The newest failed row matters only when no accepted row exists. Return deterministic statuses without consulting the database or clock.

- [x] **Step 9: Run Task 1 tests and verify GREEN**

Run the focused test and require zero failures.

### Task 2: Dependency-injected command orchestration

**Files:**
- Modify: `tests/manual-migration-ledger.test.ts`
- Modify: `src/lib/manual-migration-ledger.ts`

**Interfaces:**
- Produces `ManualMigrationStore`, `ManualMigrationOutput`, and `ManualMigrationDependencies` interfaces.
- Produces `runManualMigrationCommand(command, dependencies): Promise<number>` where the number is the documented exit code.
- Consumes Task 1 file/status functions.

- [x] **Step 1: Write a failing read-only status orchestration test**

Use an in-memory fake store and output collector. For a missing ledger assert `runManualMigrationCommand({ action: "status" }, deps)` returns `2`, prints `NOT_INITIALIZED`, lists every file as `untracked`, and calls neither `executeBatch`, `recordAttempt`, nor `acquireLock`.

- [x] **Step 2: Run the focused test and verify RED**

Expected: `runManualMigrationCommand` is not exported.

- [x] **Step 3: Implement status orchestration**

Discover and sort `.sql` files by exact filename. Query ledger existence once, load rows once when initialized, classify each file, print database name plus filename/state/checksum prefix/operator/time, and return `2` only for uninitialized or checksum mismatch; otherwise return `0`.

- [x] **Step 4: Write failing init orchestration tests**

Cover:

- missing ledger: acquire `manual-migration:<database>:<bootstrap filename>`, execute bootstrap SQL, validate required columns, record `success`, release lock;
- existing complete ledger without bootstrap row: validate shape and record `baselined` without executing SQL;
- matching accepted bootstrap: skip execution and record nothing;
- incomplete ledger: return `1` and list missing columns;
- bootstrap failure before table creation: return `1`, sanitize output, and do not attempt a history insert.

- [x] **Step 5: Implement init orchestration minimally**

Use the bootstrap filename constant `2026-08-27-add-manual-migration-history.sql`. Always release an acquired lock in `finally`. Record elapsed milliseconds and the user-supplied reason.

- [x] **Step 6: Write failing apply orchestration tests**

Cover same-checksum skip, mismatch rejection before lock/execution, lock timeout, successful execution/recording, SQL failure with rollback attempt and `failed` row, and connection-loss failure where recording is impossible. Assert the SQL text passed to the fake store is exactly the validated file content.

- [x] **Step 7: Implement apply orchestration minimally**

Require initialized/complete ledger, classify before locking, re-read history after obtaining the lock, execute only on `execute`, record one result row, and release the lock. Return `0` on success/skip and `1` on operational failure.

- [x] **Step 8: Write failing baseline orchestration tests**

Assert baseline never calls `executeBatch`, prints database/name/full checksum, records `baselined` only with confirmation, skips a matching accepted row, and rejects an accepted checksum mismatch.

- [x] **Step 9: Implement baseline orchestration minimally**

Acquire the same migration-specific lock, re-read accepted history, and insert `baselined` with `executionMs: 0` only when safe.

- [x] **Step 10: Run Task 1-2 tests and verify GREEN**

Run:

```powershell
node --test tests/manual-migration-ledger.test.ts
```

Require every orchestration and pure-policy test to pass.

### Task 3: SQL Server adapter, bootstrap schema, and CLI entrypoint

**Files:**
- Create: `tests/manual-migration-sql-server.test.ts`
- Create: `tests/manual-migration-schema.test.ts`
- Create: `src/lib/manual-migration-sql-server.ts`
- Create: `scripts/manual-migration.mjs`
- Create: `prisma/manual-migrations/2026-08-27-add-manual-migration-history.sql`
- Modify: `prisma/schema.prisma`
- Modify: `package.json`

**Interfaces:**
- Produces `createManualMigrationSqlServerStore(env): Promise<ManualMigrationStore>`.
- Consumes `runManualMigrationCommand` and `parseManualMigrationArgs` from Task 1-2.

- [x] **Step 1: Write failing schema-source tests**

Assert the bootstrap SQL contains an idempotent `manual_migration_history` table guard, every exact column/type from the spec, a status check constraint, an idempotently guarded filtered unique accepted index on database/name where status is not `failed`, and a history query index on database/name/appliedAt. Assert Prisma maps `ManualMigrationHistory` to the same table and lengths.

- [x] **Step 2: Run schema tests and verify RED**

Run:

```powershell
node --test tests/manual-migration-schema.test.ts
```

Expected: bootstrap SQL and Prisma model assertions fail because neither exists.

- [x] **Step 3: Add the idempotent SQL and Prisma model**

Create the table with UUID/default UTC timestamps and these constraints:

```sql
CHECK ([status] IN (N'success', N'failed', N'baselined'))
```

Create the unique accepted index with a SQL Server-supported simple filtered predicate:

```sql
WHERE [status] <> N'failed'
```

Map all columns in Prisma; map the non-filtered history index and document the filtered unique index in the SQL because Prisma cannot express it.

- [x] **Step 4: Run schema tests and Prisma validation**

Run the schema test and `npx prisma validate`; require both to pass.

- [x] **Step 5: Write failing adapter contract tests**

Test exported SQL builders and parameter descriptors without opening a network connection. Assert:

- ledger/table/column checks use constant SQL;
- history and insert operations bind filename/checksum/database/operator/reason/error as typed parameters;
- application lock uses `sp_getapplock`, `LockOwner = Session`, and 15,000 ms timeout;
- release uses `sp_releaseapplock`;
- migration SQL is the only unparameterized batch and originates from `ManualMigrationFile.sql`;
- rollback probe uses `XACT_STATE()`.

- [x] **Step 6: Implement the `tedious` adapter**

Reuse the same `DB_SERVER`, `DB_INSTANCE`, `DB_PORT`, `DB_TLS_SERVER_NAME`, `DB_USER`, `DB_PASSWORD`, and database parsed from `DATABASE_URL` rules as `src/lib/db-config.ts`. Connect once per command, implement requests as promises, collect bounded rows, and close in `finally`. Do not log connection configuration.

- [x] **Step 7: Write failing CLI/package contract tests**

Assert the script imports `dotenv/config`, parses `process.argv.slice(2)`, constructs the SQL store, invokes the command runner, closes the store, and sets `process.exitCode`. Assert package scripts are exactly:

```json
{
  "migration:init": "node scripts/manual-migration.mjs init",
  "migration:status": "node scripts/manual-migration.mjs status",
  "migration:apply": "node scripts/manual-migration.mjs apply",
  "migration:baseline": "node scripts/manual-migration.mjs baseline"
}
```

- [x] **Step 8: Implement the thin CLI and package scripts**

Handle `ManualMigrationUsageError` with usage text and exit `1`. Delegate all other decisions to `runManualMigrationCommand`; ensure the store closes even when the command throws.

- [x] **Step 9: Run all focused tests and type checks**

Run:

```powershell
node --test tests/manual-migration-ledger.test.ts tests/manual-migration-sql-server.test.ts tests/manual-migration-schema.test.ts
npx tsc --noEmit
```

Require zero failures/errors.

### Task 4: Operational documentation and handoff

**Files:**
- Modify: `docs/03_DATABASE.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`
- Modify: `docs/09_BACKUP_RESTORE_RUNBOOK.md`
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/99_CHANGELOG.md`
- Modify: `docs/superpowers/plans/2026-08-27-manual-migration-ledger.md`

**Interfaces:**
- Documents the commands and exact states implemented in Tasks 1-3.

- [x] **Step 1: Document the command workflow**

Add copy-paste PowerShell examples for init/status/apply/baseline, explain exit codes, require exact filename and reason, and state that backup confirmation is operator attestation rather than automated backup.

- [x] **Step 2: Document historical adoption**

State that all old files initially appear pending, must be verified and baselined individually, and must never be edited after acceptance. Include the first two verification targets from the spec without claiming older files are already applied.

- [x] **Step 3: Update production gates and handoff**

Require `migration:status` before deploy, block checksum mismatch, record command output with the change record, and add the feature summary to changelog/handoff.

- [x] **Step 4: Run documentation consistency checks**

Use `rg` to confirm old production instructions that directly invoke `npx prisma db execute` are either identified as pre-ledger historical instructions or updated to the new CLI where applicable. Run `git diff --check` on scoped files.

### Task 5: Verification, commit/push, and database initialization gate

**Files:**
- All scoped files from Tasks 1-4.

**Interfaces:**
- Produces the verified repository commit; database initialization remains approval-gated by fresh backup confirmation.

- [x] **Step 1: Run a read-only pre-initialization CLI check**

Run `npm run migration:status`. On the current database before initialization, expect `NOT_INITIALIZED`, every repository SQL file listed as `untracked`, exit code `2`, and no table creation.

- [x] **Step 2: Run the full verification gate**

Run:

```powershell
npm run verify
git diff --check
```

Require all tests, Prisma generation, TypeScript, and production build to pass. Existing unrelated `.agents` lint warnings may remain only when ESLint reports zero errors.

- [x] **Step 3: Review and stage only scoped files**

Inspect `git diff`, confirm no unrelated worktree files are staged, then stage the implementation, tests, migration, schema, package script changes, documentation, spec, and plan only.

- [x] **Step 4: Commit and push**

Commit with:

```powershell
git commit -m "feat: track manual migration history"
git push origin master
```

Verify local and remote `master` hashes match.

- [x] **Step 5: Stop at the database mutation gate**

Report that code is deployed but `manual_migration_history` is not initialized. Ask the user to confirm a fresh verified backup. Only after that explicit confirmation may a follow-up turn run `migration:init`, verify `migration:status`, and baseline individually verified historical files.
