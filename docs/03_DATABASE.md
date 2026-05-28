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
- Transactions: `AssetCheckout`, `AssetCheckin`, `AssetMovement`
- Audit: `AuditRound`, `AuditItem`, `AuditFinding`, `AuditScanHistory`
- Maintenance: `MaintenancePlan`, `MaintenanceTicket`
- Disposal: `DisposalRequest`
- Admin/RBAC: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- System: `SystemLog`, `SystemSetting`, `Notification`, `NotificationUserState`

## Asset Organization And Custody Semantics

- `Asset.companyId` and `Asset.branchId` represent the asset owner/tag/reporting scope, not necessarily the current human holder's organization.
- Asset tag generation uses the selected asset owner company and branch. `Company.assetTagCode` overrides the company code in generated tags when configured.
- `Asset.custodianId` points to `Employee` and may intentionally reference an employee from another company or branch for cross-company custody cases.
- Single and batch asset creation write `SystemLog.newValue.custodianScope` metadata when a custodian is present, including whether the custodian is outside the asset owner company or branch scope.
- Post-registration custody movement should normally be represented by checkout, check-in, and transfer records. Edit asset master organization fields only when the asset ownership/tag/reporting scope itself changes.

## Environment Rules

Use placeholders in committed documentation and keep real values in environment files only:

- `DB_SERVER=<DB_SERVER>`
- `DB_INSTANCE=<DB_INSTANCE>`
- `DB_PORT=1433`
- `DB_TLS_SERVER_NAME=<DB_TLS_SERVER_NAME>`
- `DB_USER=<DB_USER>`
- `DB_PASSWORD=<DB_PASSWORD>`
- `DATABASE_URL="sqlserver://<DB_SERVER>;instanceName=<DB_INSTANCE>;port=1433;database=<DB_NAME>;user=<DB_USER>;password=<DB_PASSWORD>;encrypt=true;trustServerCertificate=true"`

## Migration Policy

- Development/Test may use `npx prisma db push` when rebuilding or aligning a non-production database.
- Production schema changes require a database backup before deployment.
- Production schema changes require an approved change record.
- Production schema changes require a rollback plan or a tested restore procedure.
- Do not assume Prisma migrate support until it is validated against this project's SQL Server setup.

## Operational Notes

- Foreign-key relations are designed for SQL Server and avoid unsafe cascade assumptions.
- Upload files are not stored in the database; they are referenced by attachment records and must be backed up separately.
- Guarded test-data cleanup exists for trial data and run-number reset, but it requires explicit flags and environment confirmation.
