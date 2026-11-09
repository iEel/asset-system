# Database

## Stack

- SQL Server
- Prisma 7
- `@prisma/adapter-mssql`
- `tedious` driver

## Main Model Areas

- Organization: `Company`, `Branch`, `Department`, `Employee`
- Location: `Location`
- Classification: `AssetCategory`, `AssetBrand`, `AssetModel`
- Reference data: `AssetStatus`, `AssetCondition`
- Asset register: `Asset`, `AssetComponent` (its free-text `status` gains `outstanding`, a component left out of a return and still linked; no schema change), custom fields, label print tracking
- Procurement documents: `PurchaseDocument`, `PurchaseDocumentAsset`
- Transactions: `AssetCheckout`, `AssetCheckin`, `AssetTransfer`, `AssetMovement`
- Audit: `AuditRound`, `AuditItem`, `AuditFinding`, `AuditScanHistory`
- Maintenance: `MaintenancePlan`, `MaintenanceTicket`
- Disposal: `DisposalRequest`
- Admin/RBAC: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- System and governance: `SystemLog`, `SystemSetting`, `Notification`, `NotificationUserState`, `IntegrationApiClient`, `ManualMigrationHistory`, `AssetStateReview`

- Audit rounds treat installed component assets as first-class `AuditItem` rows. `AssetComponent` remains the relationship source; no audit-specific component relationship table is added.
- Parent-to-component master-data sync updates only supported ownership/location fields and records `AssetMovement` rows on each component asset.
- `DisposalRequest` stores `evidenceExceptionReason`, `evidenceExceptionGrantedBy`, and `evidenceExceptionGrantedAt` only when the controlled historical-evidence exception is used. The normal execution evidence policy remains authoritative for ordinary disposal work.
- New Check-out, Check-in, and Transfer documents store versioned authoritative before/after snapshots for the asset and installed components. Cancellation metadata marks the source document `void` without deleting it; Check-in cancellation reopens its related Check-out, and a filtered unique index permits at most one active Check-in per Check-out. An RT-'s after snapshot may carry `repair: { id, repairNo, joined }`, and an outstanding component's before-snapshot entry carries `relationshipReferenceType` / `relationshipReferenceId` for the cancel.

## Asset Organization And Custody Semantics

- `Asset.companyId` and `Asset.branchId` represent the asset owner/tag/reporting scope, not necessarily the current human holder's organization.
- Asset tag generation uses the selected asset owner company and branch. `Company.assetTagCode` overrides the company code in generated tags when configured.
- `Asset.custodianId` points to `Employee` and may intentionally reference an employee from another company or branch for cross-company custody cases.
- Single and batch asset creation write `SystemLog.newValue.custodianScope` metadata when a custodian is present, including whether the custodian is outside the asset owner company or branch scope.
- Post-registration custody movement should normally be represented by checkout, check-in, and transfer records. Edit asset master organization fields only when the asset ownership/tag/reporting scope itself changes.

## Supplier Identifier Semantics

- `Supplier.code` is the unique supplier identifier stored in the existing `suppliers.code` column (`NVARCHAR(20)`).
- The UI labels this field as `Tax ID / Supplier Code` to support Thai supplier tax IDs while preserving legacy or internal supplier codes.
- The field is not currently validated as a strict 13-digit Thai tax ID because suppliers may include foreign vendors or existing internal vendor codes.

## Classification Master Data Semantics

- `AssetCategory.code` remains unique across active and inactive rows because the SQL Server unique constraint does not ignore soft-deleted records.
- Category deletion is a soft delete. Creating a category with the same code as an inactive row reactivates and updates that row instead of inserting a duplicate.
- Categories referenced by assets or models cannot be deleted or deactivated. Editing custom-field templates on an active category remains allowed even when models or assets reference it.
- Asset create and batch create store `Asset.modelId` when a category and brand uniquely identify one active model, preserving model-specific reporting and enabling Asset Register thumbnails to prefer `asset_model` photos before falling back to asset-specific photos.

## Environment Rules

Use placeholders in committed documentation and keep real values in environment files only:

- `DB_SERVER=<DB_SERVER>`
- `DB_INSTANCE=<DB_INSTANCE>`
- `DB_PORT=1433`
- `DB_TLS_SERVER_NAME=<DB_TLS_SERVER_NAME>`
- `DB_USER=<DB_USER>`
- `DB_PASSWORD=<DB_PASSWORD>`
- `DATABASE_URL="sqlserver://<DB_SERVER>;instanceName=<DB_INSTANCE>;port=1433;database=<DB_NAME>;user=<DB_USER>;password=<DB_PASSWORD>;encrypt=true;trustServerCertificate=true"`

These `.env` database connection settings are unchanged by Integration API token management. Normal Integration API client create, rotate, disable, and enable operations are stored in `integration_api_clients` through `Admin > Integration API`; no token lifecycle update belongs in `.env`.

## Migration Policy

- Development/Test may use `npx prisma db push` when rebuilding or aligning a non-production database.
- Production schema changes require a database backup before deployment.
- Production schema changes require an approved change record.
- Production schema changes require a rollback plan or a tested restore procedure.
- Production schema changes that need deterministic SQL should be stored under `prisma/manual-migrations/`. After the migration ledger is initialized, execute them only through `npm run migration:apply`; direct `npx prisma db execute --file ...` commands below are preserved as pre-ledger historical instructions.
- `prisma/manual-migrations/2026-06-12-add-performance-indexes.sql` is the current production performance-index script. Its index names match the `@@index(..., map: "...")` names in `prisma/schema.prisma`, so rerunning the script is safe and future schema checks do not create differently named duplicate indexes.
- `prisma/manual-migrations/2026-06-14-add-integration-api-clients.sql` adds the `integration_api_clients` table for DB-backed Integration API token clients. It is already recorded as applied for `asset_management`; a different target database must apply it after backup/approval before deploying or using the admin token manager.
- `prisma/manual-migrations/2026-07-13-add-disposal-evidence-exception.sql` adds the disposal-request historical-evidence exception reason, granting user ID, and grant timestamp. It is already recorded as applied for `asset_management`; a different target database must apply it only after a fresh verified backup.
- `prisma/manual-migrations/2026-08-27-add-reversible-asset-transactions.sql` adds transaction snapshots, cancellation metadata, `asset_transfers`, supporting indexes, and the active Check-in uniqueness guard. It was applied to `asset_management` on 2026-08-28 with accepted checksum prefix `53f0d2d5bd11`.
- `prisma/manual-migrations/2026-10-07-add-maintenance-outcome.sql` adds `maintenance_tickets.outcome NVARCHAR(20) NULL` (repair outcome `usable` / `beyond_repair`; idempotent via `COL_LENGTH`, no backfill) for the one-form repair records. It is applied to `asset_management_dev` only; Production must apply it through `npm run migration:apply` after a verified backup and explicit approval, before deploying `feat/simple-repair-records`. Old maintenance columns (`assignedToId`, `dueDate`, `laborCost`, `partsCost`, `quotationNo`, `warrantyClaim`, `rootCause`, `inspectedById`, plan `assignedToId`/`lastGeneratedAt`) and retired `system_settings` rows are kept, not dropped.
- `prisma/manual-migrations/2026-10-20-users-employee-filtered-unique.sql` replaces the plain unique constraint `users_employeeId_key` (SQL Server lets it hold one NULL, so a second user with no employee link failed with 500) with a unique index of the same name `WHERE [employeeId] IS NOT NULL`: one employee still links to one account, and any number of accounts can stay unlinked. `prisma/schema.prisma` keeps `@unique`; the manual migration owns the filter. It is applied to `asset_management_dev` only (2026-10-20, checksum prefix `c73890e82373`); Production must apply it through `npm run migration:apply` after a verified backup and explicit approval, before the deploy that carries the E2E suite's decision DX1.
- `prisma/manual-migrations/2026-11-05-add-disposal-rounds.sql` adds the `disposal_rounds` table (one actual disposal of up to 200 approved requests: `roundNo` `DPR-yyyyMMdd-NNNN` by the Bangkok day, one `disposalType`, `executionDate`, `executedById` → `employees`, `recipientName`, required `documentNo`, the lump `saleValue`, `remark`) with `PK_disposal_rounds`, `UX_disposal_rounds_roundNo`, `IX_disposal_rounds_isActive_executionDate`, `IX_disposal_rounds_executedById`, `FK_disposal_rounds_executedById`, and the nullable `disposal_requests.roundId` with `FK_disposal_requests_roundId` and `IX_disposal_requests_roundId` (idempotent via `sys.*` and `COL_LENGTH` guards; no backfill, the rollback is a comment in the file). It is for `asset_management_dev` first (group 6 plan 4). Production must apply it through `npm run migration:apply` with `--db-env .env.prod-admin`, after a verified backup and explicit approval of the full SQL, **before** deploying group 6 plan 4: once `roundId` is in the Prisma client, every `DisposalRequest` read fails on a database without the column. It is applied to `asset_management_dev` (2026-11-05, checksum prefix `4d072a8fed67`, computed on the checkout's CRLF bytes).
- `prisma/manual-migrations/2026-11-07-add-notification-daily-counts.sql` adds the `notification_daily_counts` table (one row per user, Bangkok `day` (`DATE`) and notification `key`: that day's `count` and the nullable `digestCount` the daily digest sent) with `PK_notification_daily_counts`, `UX_notification_daily_counts_user_day_key` (`userId`, `day`, `key`), `IX_notification_daily_counts_user_day`, `IX_notification_daily_counts_day`, and the nullable `notification_user_states.readAt` (`DATETIME2`, set when a row is marked read, including by read-all; cleared by unread and snooze) (idempotent via `sys.*` and `COL_LENGTH` guards; no backfill, the rollback is a comment in the file). It is for `asset_management_dev` first (group 9 plan 1). Production must apply it through `npm run migration:apply` with `--db-env .env.prod-admin`, after a verified backup and explicit approval of the full SQL, **before** deploying group 9: once `readAt` is in the Prisma client, every `NotificationUserState` read fails on a database without the column. It is applied to `asset_management_dev` (2026-11-07, checksum prefix `6313c4d065f8`, computed on the checkout's CRLF bytes).
- `prisma/manual-migrations/2026-11-10-add-consumables.sql` adds the consumables (ของใช้สิ้นเปลือง) tables: `consumable_items` (one row per kind: `name` NVARCHAR(100), `unit` default `ชิ้น`, `minQuantity`, `onHand`, `isActive`, `createdBy`/`updatedBy`, timestamps) with `PK_consumable_items` and the filtered unique index `UX_consumable_items_name_active` on `name` `WHERE [isActive] = 1` (the migration owns the filter; `prisma/schema.prisma` keeps a plain `@@index` of the same name), and the append-only `consumable_movements` (`itemId` → `consumable_items`, `type` `receive`/`issue`/`adjust`, signed `quantityChange`, `onHandAfter`, nullable `assetId` → `assets`, `receivedDate` `DATE`, `reason`, `note`, `performedBy`, `performedAt`) with `PK_consumable_movements`, `FK_consumable_movements_itemId`, `FK_consumable_movements_assetId`, `IX_consumable_movements_item_performedAt` and `IX_consumable_movements_asset_performedAt`. It also inserts the `permissions` rows for module `consumable` (the seed's six actions) where missing and grants them to the role `system_admin` only (user, 2026-11-09, option ก; the admin ticks them for other roles on the roles page). Idempotent via `sys.*` guards and `NOT EXISTS` inserts; the rollback is a comment in the file. It is for `asset_management_dev` first (consumables plan 1); Production must apply it through `npm run migration:apply` with `--db-env .env.prod-admin`, after a verified backup and explicit approval of the full SQL, **before** deploying the consumables feature. It is applied to `asset_management_dev` (2026-11-09, checksum prefix `8e570369564a`); Production must apply it through `npm run migration:apply -- 2026-11-10-add-consumables.sql --db-env .env.prod-admin --backup-confirmed --reason …` after a verified backup and approval of the full SQL, before deploying consumables.
- **Deploy-day order for Production** (each step after a verified backup and the user's approval of the full SQL; `npm run migration:apply -- <file> --db-env .env.prod-admin --backup-confirmed --reason …`): 1) `2026-10-07-add-maintenance-outcome.sql`, 2) `2026-10-20-users-employee-filtered-unique.sql`, 3) `2026-11-05-add-disposal-rounds.sql`, 4) `2026-11-07-add-notification-daily-counts.sql`, 5) `2026-11-10-add-consumables.sql`, then `npm run migration:status -- --db-env .env.prod-admin` shows all five `applied`, **then** deploy the build. Line endings: the ledger checksums the file's raw bytes, so apply from a checkout with the same line endings as the one that applied to dev (this Windows checkout is CRLF); on dev `2026-10-20-users-employee-filtered-unique.sql` already reads `checksum_mismatch` (most likely applied from a copy with other line endings) — that is a dev-ledger note, not a reason to edit the file.
- Do not assume Prisma migrate support until it is validated against this project's SQL Server setup.

### Manual Migration Ledger

The ledger records manual SQL execution per database with the exact filename, SHA-256 checksum, operator, reason, completion time, duration, and `success`, `failed`, or `baselined` result. It never stores connection strings or credentials.

Initialize it once, only after a fresh verified backup:

```powershell
npm run migration:init -- --backup-confirmed --reason "Verified backup before initializing migration ledger"
```

Check the target database without changing it:

```powershell
npm run migration:status
```

Apply exactly one new repository migration:

```powershell
npm run migration:apply -- 2026-08-27-example.sql --backup-confirmed --reason "Approved production change record CHG-0001"
```

Target another database without touching `.env` (which stays on the dev database): add `--db-env <file>` to any migration command. All connection settings (`DB_SERVER`, `DB_INSTANCE`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, `DB_TLS_SERVER_NAME`) then come only from that file; nothing is inherited from `.env`, and the command refuses a file without `DB_SERVER`, `DB_USER`, `DB_PASSWORD` and `DATABASE_URL`. The Production login lives in `.env.prod-admin` (git-ignored, created by the operator). Production writes still need a verified backup and approval of the full SQL.

```powershell
npm run migration:status -- --db-env .env.prod-admin
npm run migration:apply -- 2026-08-27-example.sql --db-env .env.prod-admin --backup-confirmed --reason "Approved production change record CHG-0001"
```

The flag is not called `--env-file` on purpose: Node 24 inspects `--env-file` even after the script name and exits when the path is missing.

Record a migration that was applied before the ledger existed, after verifying its database effect:

```powershell
npm run migration:baseline -- 2026-08-27-example.sql --confirm-baseline --reason "Verified existing table and indexes against CHG-0001"
```

Status meanings:

- `pending`: no accepted record exists for the current file checksum.
- `applied`: a successful or baselined record matches the current checksum.
- `failed`: the latest current-checksum attempt failed and no accepted record exists.
- `checksum_mismatch`: an accepted filename exists with different file bytes; stop deployment and create a new migration instead of editing the accepted file.
- `untracked`: the ledger has not been initialized, so status is read-only and cannot determine history.

Exit code `0` means the status/operation is acceptable, `1` means usage or execution failure, and `2` means the ledger is not initialized or a checksum mismatch exists. Pending files are informational and do not make an initialized `migration:status` fail.

Historical migrations must be baselined individually. Do not infer application merely because a SQL file exists in Git. Verify each migration against its documented table, column, or index effects before baselining it.

### Current `asset_management` Ledger Snapshot

As verified on 2026-08-31, all 12 SQL files under `prisma/manual-migrations/` are recorded as `applied` with no checksum mismatch. `2026-08-31-add-checkout-handover-mode.sql` was applied with checksum prefix `9063246fff57` after a verified rollback-only rehearsal. This is a dated snapshot for this database only; always run `npm run migration:status` against the actual deployment target.

### Checkout handover mode

`AssetCheckout.handoverMode` is nullable `NVARCHAR(30)` so completed legacy history remains readable. New application writes allow only `permanent_assignment` and `temporary_loan`; the applied SQL adds the matching trusted database constraint. Its data backfill aborts unless the candidate set is exactly the two approved Asset Tag/document pairs, preserves the old Checkout after-snapshot in System Log evidence, updates valid snapshots, and records Asset Movement/System Log rows.

## Operational Notes

- Foreign-key relations are designed for SQL Server and avoid unsafe cascade assumptions.
- Upload files are not stored in the database; they are referenced by attachment records and must be backed up separately.
- Guarded test-data cleanup exists for trial data and run-number reset, but it requires explicit flags and environment confirmation.
- Phase 2B (UI round 4) added no index, table or column. Its server pagination only reads: each paged list runs its `count` (the approval history also a `groupBy`) in the same `Promise.all` as its `findMany`. `system_logs` grows with every action, so the unfiltered count of `/admin/logs` reads a whole index (`IX_system_logs_createdAt` serves the order, `IX_system_logs_module_action_createdAt` the module and action filters and the decisions of the approval history). Measured on `asset_management_dev`: with `PERFORMANCE_TIMING=1` and only reads, `admin-logs.list-data` (the page of system logs and their `count`; 219 pages of 25 rows) took a median of 97 ms (88–214 ms over five loads, the first one cold) and `approval-history.list-data` (the page, the `count` and the `groupBy`) a median of 87 ms (78–91 ms). The two pages log their query time as `admin-logs.list-data` and `approval-history.list-data` when `PERFORMANCE_TIMING=1`; if they slow down on Production, record it and add an index only through a reviewed manual migration, not in a UI plan.
