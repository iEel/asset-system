# Manual Migration Ledger Design

## Goal

Add a database-backed ledger and safe command-line workflow for SQL files in `prisma/manual-migrations/`, so operators can determine which scripts ran against a database, detect changed files, apply one approved script at a time, and explicitly baseline scripts that predate the ledger.

## Scope

This phase provides a local CLI and SQL Server ledger. It does not add an Admin web page, automatically apply every pending migration, infer whether historical scripts ran, take database backups, or convert the repository to Prisma Migrate.

The supported commands are:

```text
npm run migration:init -- --backup-confirmed --reason "..."
npm run migration:status
npm run migration:apply -- <filename.sql> --backup-confirmed --reason "..."
npm run migration:baseline -- <filename.sql> --confirm-baseline --reason "..."
```

`init`, `apply`, and `baseline` accept an optional `--by <operator>` value. When omitted, the CLI uses the current operating-system username. The recorded database name comes from the configured SQL Server connection, not from user input.

## Architecture

The feature has four focused units:

1. `src/lib/manual-migration-ledger.ts` contains deterministic, database-independent behavior: exact filename validation, migration discovery, SHA-256 calculation, argument parsing, and status classification.
2. `scripts/manual-migration.mjs` is the CLI orchestrator. It loads `.env` and delegates orchestration to the library without containing policy decisions.
3. `src/lib/manual-migration-sql-server.ts` owns one `tedious` SQL Server session for ledger queries, application locking, SQL batch execution, and result recording. Queries that contain operator/file values use typed parameters; only the validated migration file is submitted as a SQL batch.
4. `prisma/manual-migrations/2026-08-27-add-manual-migration-history.sql` creates the ledger table and indexes idempotently. `prisma/schema.prisma` maps the table for schema visibility and Prisma Client generation.

The runner executes exactly one named `.sql` file per `apply` or `baseline` command. It never accepts an arbitrary path and never scans outside `prisma/manual-migrations/`.

## Ledger Schema

Table: `manual_migration_history`

| Column | Type | Meaning |
|---|---|---|
| `id` | `NVARCHAR(1000)` | UUID primary key |
| `migrationName` | `NVARCHAR(255)` | Exact SQL filename |
| `checksumSha256` | `CHAR(64)` | Lowercase SHA-256 of the exact file bytes |
| `databaseName` | `NVARCHAR(255)` | SQL Server database that received the operation |
| `status` | `NVARCHAR(20)` | `success`, `failed`, or `baselined` |
| `appliedAt` | `DATETIME2` | UTC completion timestamp |
| `appliedBy` | `NVARCHAR(255)` | Operator supplied by `--by` or OS username |
| `reason` | `NVARCHAR(500)` | Required change/backup/baseline explanation |
| `executionMs` | `INT` | Elapsed execution time; zero for baseline |
| `errorMessage` | `NVARCHAR(2000)` | Sanitized bounded failure text, otherwise null |
| `createdAt` | `DATETIME2` | UTC row creation timestamp |

A filtered unique index on `(databaseName, migrationName)` applies to `success` and `baselined` rows so a migration has at most one accepted checksum in one database. Failed attempts remain append-only and may have multiple rows.

The CLI never stores connection strings, usernames from database credentials, passwords, or raw process environment data.

## Command Behavior

### `migration:init`

`init` is the only command allowed to create the ledger. It requires `--backup-confirmed` and a nonblank `--reason` of at least 10 characters. It executes the bootstrap SQL as a batch on the dedicated SQL Server session, then records that SQL file as `success` using its computed checksum.

If the table already exists and contains a matching accepted bootstrap row, `init` exits successfully without executing it again. If the table exists without the bootstrap row, `init` records the current bootstrap file as `baselined` after verifying the expected columns exist. If the table shape is incomplete, it stops and reports the missing ledger columns.

If bootstrap execution fails before the table exists, no failure row can be stored; the CLI reports a sanitized error and a nonzero exit code. This is the only unavoidable untracked failure because the ledger does not yet exist.

### `migration:status`

`status` is read-only. If the ledger table does not exist, it prints `NOT_INITIALIZED`, lists repository files as `untracked`, and exits nonzero without creating anything.

For each SQL file, status is classified as:

- `applied`: an accepted `success` or `baselined` row has the same checksum.
- `checksum_mismatch`: an accepted row exists but its checksum differs from the current file.
- `failed`: no accepted row exists and the latest recorded attempt failed with the current checksum.
- `pending`: the ledger exists but the current checksum has no accepted or failed row.

Output includes filename, state, accepted/applied timestamp, operator, and short checksum prefix. It prints the database name but never prints the server, credentials, or connection string. Any checksum mismatch causes a nonzero exit code. Pending files are informational and do not by themselves make `status` fail.

### `migration:apply`

`apply` requires an exact repository filename, `--backup-confirmed`, and a reason of at least 10 characters. It requires the ledger to be initialized.

Before execution it:

1. Rejects absolute paths, directory separators, `..`, non-`.sql` names, missing files, and symlinks that resolve outside the manual-migrations directory.
2. Computes SHA-256 from the exact file bytes.
3. Stops if an accepted row exists with a different checksum.
4. Exits successfully without executing if an accepted row exists with the same checksum.

It then submits that single file as a SQL batch on the locked SQL Server session and measures elapsed time. On success it inserts a `success` row. On failure it performs a best-effort rollback when `XACT_STATE()` indicates an open transaction, inserts a `failed` row with a bounded sanitized error when the session remains usable, and exits nonzero. If the connection itself is lost, the CLI reports that the failed attempt could not be persisted and requires the operator to inspect the database before retrying.

Existing manual scripts are expected to remain idempotent because SQL Server DDL may partially commit before a later statement fails. The ledger records the attempt but does not claim to provide automatic rollback.

The first implementation rejects a migration containing a standalone `GO` batch separator because `GO` is a client directive rather than SQL Server syntax. Current repository migrations do not contain `GO`; a future script that needs multiple batches must be expressed without `GO` or the runner must gain tested batch-splitting support first.

### `migration:baseline`

`baseline` is for scripts applied before the ledger existed. It requires an exact repository filename and a reason of at least 10 characters. It never executes the SQL file.

The command prints the database, filename, and full checksum, requires an explicit `--confirm-baseline` flag, then inserts a `baselined` row. It stops on an existing accepted checksum mismatch. Documentation instructs operators to verify the target schema/data effect before baseline; the tool does not infer historical application from table names or columns.

## Existing Migration Adoption

After initializing the ledger, every existing SQL file initially appears as `pending`. Operators review evidence for one migration at a time and use `baseline` only when its database effects are verified. Recently executed files are not automatically trusted merely because the current development session ran them.

For the current database, adoption should start with:

1. Verify `2026-08-27-add-asset-state-governance.sql` structures and master rows, then baseline it.
2. Verify `2026-08-27-keep-under-inspection-operational.sql` master status values, then baseline it.
3. Review older files against their documented tables, columns, and indexes before baselining them individually.

This preserves an honest distinction between “verified historical migration” and “file happens to exist in Git.”

## Error Handling And Exit Codes

- Exit `0`: requested operation completed, or `apply/init` found the same accepted checksum and safely skipped.
- Exit `1`: invalid arguments, missing file, execution failure, database failure, ledger not initialized for a mutating command, or incomplete ledger schema.
- Exit `2`: status detected `NOT_INITIALIZED` or at least one checksum mismatch.

Errors are sanitized by removing the configured password, connection URL, server name, and database credential username before truncation. Ledger reads/writes and lock calls use typed `tedious` parameters; migration SQL is executed only from a validated repository file as one SQL Server batch.

## Concurrency

The accepted-row filtered unique index is the final guard against two operators accepting the same migration concurrently. Immediately before executing, the runner acquires a SQL Server application lock scoped to the database and migration filename. The lock timeout is 15 seconds. Failure to acquire the lock stops before executing the migration.

After execution, the same SQL Server session records the result and releases the session lock. A second runner re-reads the accepted state after obtaining the lock and skips when the checksum has already succeeded.

## Testing

Unit tests use the Node built-in test runner and cover:

- exact filename and containment validation;
- deterministic SHA-256 calculation;
- CLI argument requirements for init/apply/baseline;
- status classification for pending, applied, failed, mismatch, and uninitialized states;
- same-checksum skip and changed-checksum rejection decisions;
- output sanitization;
- bootstrap SQL contains the required table, columns, constraints, and indexes;
- package scripts point to the CLI.

The CLI database layer is structured around injected query and command-runner interfaces so orchestration tests can use in-memory fakes without contacting production. Integration acceptance on a backed-up non-production SQL Server verifies init idempotence, a harmless idempotent test migration, repeated apply skip, failed-attempt recording, baseline behavior, and checksum mismatch detection.

Repository completion requires focused tests, the full `npm run verify` gate, `git diff --check`, and a scoped diff review before commit/push.

## Documentation And Operations

Update these documents:

- `docs/03_DATABASE.md`: command reference, states, and adoption procedure.
- `docs/08_PRODUCTION_READINESS.md`: require `migration:status` and prohibit deploy on checksum mismatch.
- `docs/09_BACKUP_RESTORE_RUNBOOK.md`: clarify that `--backup-confirmed` is an operator attestation, not an automated backup.
- `DEVELOPER_HANDOFF.md`: identify the ledger as the authoritative record for manual SQL after initialization.
- `docs/99_CHANGELOG.md`: record the new operational control.

No existing manual migration is edited merely to make its checksum match a ledger row. Once accepted, a script is immutable; corrections use a new migration file.

## Deployment Sequence

1. Take and verify a fresh SQL Server backup.
2. Deploy the CLI, schema mapping, and bootstrap SQL.
3. Run `migration:init` with backup confirmation and reason.
4. Run `migration:status` and review every existing file.
5. Baseline only files whose effects are verified in that database.
6. Use `migration:apply` for every new manual migration thereafter.
7. Store command output with the release/change record and run normal build/restart verification when the migration affects application schema.

The initial implementation does not automatically initialize or baseline the current database. Those database writes require the operator to confirm a fresh backup after the feature is available.
