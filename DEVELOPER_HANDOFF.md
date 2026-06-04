# Developer Handoff

> Last updated: 2026-06-04
> Scope: Developer onboarding, production readiness, and operational handoff for the Asset Management System.

## Start Here

Read these documents in order:

1. `README.md`
2. `docs/01_OVERVIEW.md`
3. `docs/02_ARCHITECTURE.md`
4. `docs/03_DATABASE.md`
5. `docs/04_AUTH_RBAC.md`
6. `docs/05_ASSET_LIFECYCLE.md`
7. `docs/06_WORKFLOWS.md`
8. `docs/07_UAT_CHECKLIST.md`
9. `docs/08_PRODUCTION_READINESS.md`
10. `docs/09_BACKUP_RESTORE_RUNBOOK.md`
11. `docs/10_SECURITY_REVIEW.md`
12. `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`

Long-form development history is preserved in `docs/99_CHANGELOG.md`.

## Current Production Readiness Status

- Sensitive values must stay out of committed docs and source files. Use placeholders such as `<DB_SERVER>`, `<DB_INSTANCE>`, `<DB_USER>`, `<DB_NAME>`, `<DB_PASSWORD>`, `<DB_TLS_SERVER_NAME>`, and `<CHANGE_ME>`.
- Real environment files must stay outside Git. The repository ignores `.env*`; production uses an environment file managed on the server.
- The system has production-oriented modules for RBAC, audit trail, readiness checks, backup status signals, scheduler heartbeat, LDAP sync safety threshold, PM ticket generation, storage governance, and guarded test-data cleanup.
- QR label printing now uses configurable 12/18/24/custom tape profiles, warns before printing if the QR target is localhost/private/relative, and the `/q/a/{assetId}` resolver redirects through Public QR Base URL or forwarded proxy headers to avoid localhost redirects behind Nginx/Cloudflare.
- Mobile QR/barcode scanner controls now prefer the rear camera through the browser `environment` camera constraint, include a "Back camera (recommended)" option, and can switch cameras while scanning on asset scanner inputs and the audit scan form. The dedicated `/th/asset-management/scan` page is QR-first for printed Asset Labels, reads `/q/a/{assetId}` resolver URLs directly, auto-opens the asset detail page from the scanner success callback after stopping the camera, and uses a square mobile camera surface with a custom square QR overlay while hiding the default `html5-qrcode` rectangular shaded region; Serial Number inputs still support QR and common barcode formats with the wider preview.
- Audit scan keeps the audit workflow on `/th/audit/rounds/{id}/scan`: matched QR scans populate the main input with a readable Asset Tag/label instead of the raw QR URL, while the latest raw QR value remains visible in the camera status panel for traceability.
- Audit result Excel export guards worksheet date formatting by existing column keys only, preventing ExcelJS `Out of bounds. Excel supports columns from 1 to 16384` errors on result sheets that do not contain every audit/finding date column.
- Asset create/edit and batch create ownership fields now explicitly represent the asset owner/tag scope. The company and branch drive generated asset tags and reporting scope, while the custodian can be selected from a different company by enabling the cross-company custodian option. The custodian dropdown is scoped by selected company, branch, and department by default, still tolerates legacy employee rows whose `branchId` points to a stale/duplicate branch record when company and branch code match, warns when the selected custodian belongs to a different company, and writes `custodianScope` audit metadata for single and batch asset creation.
- Master Data usability now presents the Brand / Model page as a compact left-side brand navigator plus a right-side model workspace. Create Model is the primary header action, Create Brand remains available, duplicate review is compacted, the brand navigator uses a narrower desktop column so the model table has more usable width, and brand navigator counts are derived from active `AssetModel`/`Asset` group counts so soft-deleted models do not make the sidebar disagree with the visible model table. Supplier master data labels the existing `Supplier.code` field as `Tax ID / Supplier Code` (`เลขประจำตัวผู้เสียภาษี / รหัสผู้ขาย`) for Thai vendor workflows while keeping legacy/internal vendor code compatibility and the existing 20-character unique column.
- Asset create and batch create now auto-select an asset model when the selected category and brand uniquely match one active model, so model-level photos can appear in the asset list/detail even when the user does not manually pick the model. Category master data respects SQL Server unique category codes with soft delete: recreating a deleted category reactivates the inactive row, delete/deactivation is blocked when assets or models still reference the category, and active category custom-field templates can still be edited without deleting the category.
- Accounting depreciation policy is edited through a structured Settings UI instead of raw JSON as the primary workflow. The builder manages default useful life, default residual value, category-specific policy groups, a purchase-date-based calculation preview, and an advanced JSON fallback while preserving the existing `accounting_depreciation_policy` setting shape. Depreciation still starts from `Asset.purchaseDate` in this phase.
- System Settings > Asset Numbering now manages Asset Tag Prefix by prefix group instead of one row per category. Operators enter a prefix, move categories from available to selected lists with search, see existing-prefix badges when a category is assigned elsewhere, and save back to the existing `asset_tag_category_prefixes` JSON shape (`categoryId -> prefix`) so asset tag generation behavior and database schema stay unchanged. The grouping UI filters stale/inactive category ids out of the visible assigned/unassigned counts, while editing or removing a prefix group cleans up stale rows for that prefix.
- Storage Governance includes an archive action column for orphan-file dry-run actions. `storagePage.action` is now covered in Thai/English messages, and `tests/storage-archive-ui.test.ts` checks every `storagePage` key used by the page and archive button to prevent missing-message regressions.
- Asset lifecycle hardening now blocks checkout for Disposed, Retired, Pending Disposal, Under Maintenance, Lost, and Missing assets, blocks normal transfer for Disposed, Retired, and Pending Disposal assets, limits maintenance close to Ready/Pending Disposal, limits disposal execution to Disposed/Retired, and lets protected lifecycle status corrections restore accidental Pending Disposal/Disposed/Retired/Lost/Missing/Under Maintenance/Pending Repair statuses back to Ready with a required reason and audit trail.
- Production readiness now tracks PM, LDAP sync, Notification Digest scheduler run status, and upload scanner configuration separately. Upload hardening now includes content signature validation, an optional server-side scanner hook, central browser security headers, and no-sniff/private attachment responses in addition to size, MIME, and extension checks.
- LDAP/AD login auto-provision now links the app user to an active Employee matched by LDAP email or `employeeID` before creating the user record. This avoids SQL Server's unique `users.employeeId` behavior with duplicate `NULL` values and keeps AD users tied to employee master data. `LDAP_DEFAULT_ROLE` must still point to an existing active role such as `employee`.
- Dashboard RBAC UX now filters sidebar navigation from the signed-in user's permissions before rendering, keeps `system_admin` unrestricted, and sends direct unauthorized page hits to `/{locale}/access-denied` instead of a generic 404. The topbar avatar/name also uses the current session user instead of hard-coded Admin text. System Settings > AD/LDAP Login loads active roles from the database for the default role searchable selector, so operators do not need to memorize role keys.
- Employee self-service asset visibility is available at `/{locale}/my-assets`. The page is scoped by the signed-in user's linked `employeeId`, does not require broad `asset:view`, shows only active assets where the employee is the current custodian, and allows thumbnails only for those owned asset attachments. Linked employee users without overview-module permissions now land on My Assets after login, and direct `/dashboard` hits redirect there before dashboard-wide KPI queries run.
- Dashboard shell scroll ownership is now explicit: `src/app/[locale]/(dashboard)/layout.tsx` is fixed to the viewport with `fixed inset-0`, while the `<main>` content area owns vertical scrolling. This prevents the browser document scrollbar and the in-app content scrollbar from appearing side by side on dashboard pages.
- Mobile Responsive QA completed across five phases. Phase 1 completed the responsive foundation for shared panels, action rows, dashboard shell, topbar/sidebar touch targets, global search containment, and mobile-safe topbar popovers. Phase 2 improved field workflows for QR/barcode scanner input, searchable selects, asset scan/search, single and batch asset create, checkout/checkin/transfer forms, audit scan camera/manual fallback, and asset-detail quick actions. Phase 3 improved data-heavy pages: Asset Register now uses mobile cards below `md`, audit rounds/detail/findings stack actions and cards, maintenance/disposal list and detail workflows use mobile cards and touch-safe action modals, reports/work center contain table scroll and action rows, and admin settings/readiness controls wrap safely. Phase 4 made `/th/asset-management/labels` and label print routes mobile-safe by stacking toolbar actions, containing preview overflow, and scaling screen preview separately from the configured Brother tape print size. Phase 5 polished touch targets and focus-visible behavior for shared controls, scanner input, asset forms, audit scan evidence removal, maintenance/disposal modals, and audit finding dialogs. Baseline and after screenshots were captured for dashboard at `375/390/414/768px`; unauthenticated protected routes were checked for redirect overflow at `375px`. Authenticated field-workflow, data-heavy, and label print routes should still be tested on a real mobile device for camera permission, file upload/capture, signature pad, long Thai content, scan timing, and the Brother print dialog.
- Before production release, complete the UAT checklist by role, production readiness checklist, security review, backup/restore test, and deployment verification.
- Run `npm run verify` and `npm run build` before release or handoff.

## Key Documents

| Document | Purpose |
|---|---|
| `docs/01_OVERVIEW.md` | Product purpose, users, and modules |
| `docs/02_ARCHITECTURE.md` | System architecture, route structure, background jobs, storage boundaries |
| `docs/03_DATABASE.md` | Prisma/SQL Server schema overview and migration policy |
| `docs/04_AUTH_RBAC.md` | Authentication, LDAP/AD, roles, permissions, and API protection |
| `docs/05_ASSET_LIFECYCLE.md` | Asset status lifecycle and transition rules |
| `docs/06_WORKFLOWS.md` | Main business workflows already implemented |
| `docs/07_UAT_CHECKLIST.md` | Role-based UAT scenarios |
| `docs/08_PRODUCTION_READINESS.md` | Go-live readiness checklist |
| `docs/09_BACKUP_RESTORE_RUNBOOK.md` | Backup, restore, restore-test, and audit evidence runbook |
| `docs/10_SECURITY_REVIEW.md` | Security review findings and recommendations |
| `docs/99_CHANGELOG.md` | Historical implementation notes and feature chronology |
| `docs/superpowers/plans/2026-05-27-mobile-responsive-qa.md` | Mobile responsive QA implementation plan and phase-by-phase commit/push protocol |

## Core Verification Commands

```powershell
npm install
npx prisma generate
npm run verify
npm run build
```

## Production Safety Rules

- Do not commit real credentials, production connection strings, internal hostnames, or server IP addresses.
- Do not document real production admin credentials. Initial admin accounts are for local seed/testing only and must be changed before shared or production use.
- Do not hard-delete production data except through explicitly guarded cleanup tooling that requires scope, apply flag, confirmation flag, and environment confirmation.
- Do not change core workflow behavior during handoff cleanup unless the change is separately reviewed and tested.
- Treat `npx prisma db push` as Dev/Test-only unless a production change record, backup, and rollback/restore plan are approved.

## Operational Notes

- Before printing production Asset Labels, set `Public QR Base URL` in `Admin > Settings > Label / QR` to the permanent HTTPS domain, for example `https://asset.company.com`; the print page should show a full `/q/a/{assetId}` URL and no localhost/private warning.
- For Brother PT-E550W with Laminated Tape 18mm, the app label profile is `18mm / 0.70"`. The Windows/Brother Printer Properties must also be set to Tape Size `18mm / 0.70"` before printing.
- Label text is optimized for thermal tape output with black, high-weight typography. If print quality is still faint, check Brother driver density/quality settings before changing app layout.
- For mobile camera scanning, test `/th/asset-management/scan`, Serial Number scanner inputs, and `/th/audit/rounds/{id}/scan` on the target phone browser. Some browsers hide camera labels until permission is granted, so the app exposes a generic rear-camera option plus any named device list returned by the browser. `/th/asset-management/scan` intentionally scans Asset Label QR codes only, should show a square QR preview with a square white frame rather than the library's wide rectangular box, and should navigate to the asset detail automatically immediately after a recognized QR scan; `/th/audit/rounds/{id}/scan` should stay on the audit workflow, select the scanned asset, display a readable Asset Tag/label in the scan input, and keep the raw QR URL only as the latest QR reference. Use the Serial Number fields when collecting manufacturer barcodes.

## Current High-Level Modules

- Dashboard and Work Center
- Asset Register and Asset Detail
- Asset Batch Create, Import/Export, and Data Quality tools
- Scan/Search Asset and QR Label printing
- Check-out, Check-in, Transfer, and custody timeline
- Audit rounds, scan workflow, findings review, and close-round controls
- Maintenance tickets and Preventive Maintenance plans
- Disposal request, approval, evidence, and execution lifecycle
- Reports, accounting/depreciation views, and exports
- Master Data for organization, locations, categories, brands/models, employees, suppliers
- Admin settings, RBAC, system logs, readiness, storage governance, scheduler settings, LDAP/AD

## Open Go-Live Decisions

- Confirm production database user and least-privilege permissions.
- Confirm migration process for SQL Server before schema changes in production.
- Confirm backup owner, restore approver, RTO, and RPO.
- Confirm Public QR Base URL and Brother printer driver tape size before printing physical labels in volume.
- Confirm LDAP/AD auto-provision default role and Employee matching rules with a real AD login account.
- Confirm LDAP/AD scheduled sync safety threshold before enabling automatic deactivation.
- Confirm notification delivery channels beyond in-app notifications.
