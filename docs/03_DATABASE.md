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
- Asset register: `Asset`, `AssetComponent`, custom fields, label print tracking
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
- New Check-out, Check-in, and Transfer documents store versioned authoritative before/after snapshots for the asset and installed components. Cancellation metadata marks the source document `void` without deleting it; Check-in cancellation reopens its related Check-out, and a filtered unique index permits at most one active Check-in per Check-out.

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
