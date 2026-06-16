# Asset Management System - Feature List

Last updated: 2026-06-16

This feature list is based on the current repository documents and source code, not only on the original plan. It focuses on features that are represented by the current docs, routes, API endpoints, Prisma schema, and component/library structure.

## Sources Reviewed

| Source | Evidence Used |
|---|---|
| `README.md` | stack, scripts, key modules, deployment boundary |
| `DEVELOPER_HANDOFF.md` | current production readiness notes, latest high-level modules, go-live decisions |
| `docs/01_OVERVIEW.md` | product purpose, users, core modules |
| `docs/02_ARCHITECTURE.md` | runtime, route structure, scheduler/background jobs, storage boundary |
| `docs/03_DATABASE.md` | current Prisma model areas and ownership/custody semantics |
| `docs/04_AUTH_RBAC.md` | local auth, LDAP/AD, RBAC, employee self-service rules |
| `docs/05_ASSET_LIFECYCLE.md` | lifecycle statuses, allowed transitions, API enforcement |
| `docs/06_WORKFLOWS.md` | implemented business workflows |
| `docs/08_PRODUCTION_READINESS.md` | go-live checklist and operational controls |
| `docs/10_SECURITY_REVIEW.md` | security controls, upload hardening, RBAC route checks |
| `Implementation Plan.md` | original phase plan used as historical scope reference |
| `System Requirement (2).md` | original business requirements |
| `Enterprise Web UI UX Requirements.md` | UI/UX acceptance and enterprise design requirements |
| `prisma/schema.prisma` | current database models |
| `src/app/[locale]/(dashboard)/**` | actual authenticated pages |
| `src/app/api/**/route.ts` | actual API surface |
| `src/components/**` and `src/lib/**` | reusable UI/workflow modules and server helpers |

## Current System Summary

The system is an enterprise asset management web application for registering assets, controlling custody, printing QR labels, auditing, maintaining, disposing, reporting, and administering users/permissions/settings. It is designed for Thai operational workflows and supports multi-company, multi-branch, multi-department asset control.

## Platform And Runtime

| Feature | Current Implementation |
|---|---|
| Web framework | Next.js 16.2.4 App Router with standalone output |
| Language/UI | TypeScript 5, React 19, Tailwind CSS 4 |
| Database | SQL Server through Prisma 7, `@prisma/adapter-mssql`, `tedious` |
| Auth | Auth.js / NextAuth credentials flow with optional LDAP/AD |
| i18n | Thai and English locale routes through `next-intl` |
| Exports | Excel and PDF exports, including Thai font support |
| Scanning | QR and barcode scanning helpers for asset labels and serial numbers |
| Mobile support | Mobile responsive QA documented across core field workflows |
| Loading UX | Shared page skeletons plus App Router `loading.tsx` fallbacks for authenticated dashboard pages, with route-specific skeletons for Dashboard and Asset Register |
| PWA | App manifest and install icons for mobile Add to Home Screen |

## Main Navigation And Pages

Current authenticated pages exist under `src/app/[locale]/(dashboard)`:

| Area | Pages / Capabilities |
|---|---|
| Dashboard | `/dashboard` KPI and overview page, including cross-scope asset counters and drilldowns |
| Work Center | `/work-center` actionable operations summary |
| My Assets | `/my-assets` employee self-service asset list |
| Asset Register | `/assets`, `/assets/new`, `/assets/{id}`, `/assets/{id}/edit` |
| Asset Operations | `/asset-management/checkout`, `/checkin`, `/transfer`, `/bulk-move`, `/scan`, `/labels`, `/import-export` |
| Audit | `/audit/rounds`, `/audit/rounds/new`, `/audit/rounds/{id}`, `/pending`, `/scan`, `/audit/findings` |
| Maintenance | `/maintenance`, `/maintenance/{id}` |
| Disposal | `/disposal`, `/disposal/{id}` |
| Reports | `/reports` |
| Master Data | companies, branches, departments, employees, locations, categories, brands/models, suppliers |
| Admin | users, roles, approvals, data quality, storage, readiness, logs, settings, Integration API clients, access denied |
| Print Views | asset labels, bulk labels, handover forms, return forms, maintenance print, disposal print |
| Public QR Resolver | `/q/a/{assetId}` redirects printed QR codes to asset detail through the configured public base URL or proxy headers |

## Database And Data Model

The Prisma schema contains current models for:

- Organization: `Company`, `Branch`, `Department`, `Employee`
- Location: `Location`
- Classification: `AssetCategory`, `AssetBrand`, `AssetModel`
- Reference data: `AssetStatus`, `AssetCondition`
- Asset register: `Asset`, `AssetComponent`, `CustomFieldDefinition`, `CustomFieldValue`
- Label printing: `AssetLabelPrintBatch`, `AssetLabelPrint`
- Procurement: `PurchaseDocument`, `PurchaseDocumentAsset`
- Operations: `AssetCheckout`, `AssetCheckin`, `AssetMovement`
- Audit: `AuditRound`, `AuditItem`, `AuditFinding`, `AuditScanHistory`
- Maintenance: `MaintenancePlan`, `MaintenanceTicket`
- Disposal: `DisposalRequest`
- Supplier: `Supplier`
- Files: `Attachment`
- Auth/RBAC: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- System: `SystemLog`, `SystemSetting`, `Notification`, `NotificationUserState`, `IntegrationApiClient`

Important data semantics:

- `Asset.companyId` and `Asset.branchId` represent asset owner/tag/reporting scope.
- `Asset.custodianId` may point to an employee outside the asset owner company/branch for cross-company custody.
- `Asset.homeLocationId` and `Asset.currentLocationId` may point to locations outside the asset owner branch when the operator intentionally enables cross-branch location mode; owner/tag scope remains unchanged.
- Cross-scope reporting compares owner/tag scope against current custodian company/branch and current location branch, then exposes the result through Dashboard counters, Asset Register filters, report panels, and report exports without changing movement workflow rules.
- Asset ownership/tag scope changes should be intentional master-data edits; normal custody changes should use checkout, check-in, and transfer.
- Files are stored under `UPLOAD_DIR` and referenced through `Attachment`; file bytes are not stored in SQL Server.
- Production schema changes require backup, approved change record, and rollback/restore plan. `npx prisma db push` is Dev/Test-oriented.

## Asset Register

| Feature | Details |
|---|---|
| Asset list | Asset Register page with primary filters, grouped URL-backed operational quick filters, a consolidated active-filter summary with clear-all action, collapsible advanced filters, responsive table/card behavior, row navigation, search that includes the current custodian employee code, master-data drilldown filters, and return-to-list navigation that preserves page/filter/sort/search state |
| Asset detail | Unified page with overview, specs, QR, compact side-rail photo previews, register photos/files, an evidence drawer file index, components, purchase docs, movement, maintenance, audit, handover/return, notes, and an explicit Back action to the originating register view |
| Asset create/edit | Single asset form with owner/tag scope, category/brand/model, serial, custodian, location, purchase/warranty, custom fields, photos/files, and a fixed bottom Save/Cancel action bar for long forms; edit mode preserves saved cross-company custodians and cross-branch locations by opening the wider selector automatically |
| Asset clone | Asset Register and Asset Detail can open `/assets/new?cloneFrom={assetId}` to create a new asset from an existing record, preserving the originating register view when launched from the list. The clone draft copies shared master, ownership, location, purchase/warranty, custom-field, and linked purchase-document data while leaving Asset Tag, Serial Number, and FA/accounting code blank and showing a review banner. |
| Batch create | Batch creation from shared purchase/master data plus row-level serial/manual tag values by default. Optional row override columns can be enabled for custodian, department, current location, home location, and remark; blank row overrides fall back to shared values. Shared and row-level locations can opt into cross-branch/site selection without changing owner/tag scope. |
| Asset import | Excel import preview and confirm APIs for legacy asset onboarding; the register import helper appears after the table/card list, starts collapsed, and opens on demand; the Import/Export page shows recent import-batch history and rollback-plan preview assets with localized hidden-count formatting |
| Asset export | Excel export using current filters where supported |
| Master-data drilldowns | Category, brand, and model count links open the relevant Brand/Model workspace or Asset Register filters (`categoryId`, `brandId`, `modelId`) with removable active filter chips where applicable |
| Cross-scope visibility | Dashboard KPI/review panel, URL-backed quick filters, and exports for assets whose current custodian company, current custodian branch, or current location branch differs from the owner/tag scope |
| Duplicate handling | Duplicate checking for asset tag/serial and batch duplicate review |
| Asset tag generation | Configurable format, category prefix groups, company asset-tag code, branch/category/running tokens |
| Status/condition guidance | Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers expose help popovers explaining lifecycle status, physical condition, protected workflows, and normal next actions; register filter icons use a compact size so the filter rows stay visually aligned |
| Custom fields | Category-level custom field templates rendered automatically in asset forms |
| Model specs | Structured asset model specs with legacy text parsing and summary display |
| Asset/model photos | Asset photos and model photos stored as attachments; Asset Register thumbnails prefer model photos first, then fall back to asset photos, while Asset Detail keeps asset/model/checklist photos in the `รูปทรัพย์สิน` working area and opens cross-workflow evidence from a drawer so it does not duplicate the event timeline |
| Column presets | Asset Register table defaults to the Operations preset before stored browser preferences load, supports persisted All, Operations, Accounting, and Audit column presets per browser, keeps Asset Tag/name sticky on the left and actions sticky on the right, shows a horizontal-scroll hint for wide desktop tables, clamps long asset names to two readable lines, and keeps column/export/template controls desktop-only while mobile cards stay focused on lookup and row actions |
| Purchase documents | Shared PO/Invoice/delivery/warranty/contract documents can link to multiple assets |
| Components | Parent-child asset assembly with install/remove, role, slot, history, validation, movement logs, and a three-lane Asset Detail relationship map that keeps Asset Tags readable before names/badges |
| Status correction | Guarded correction workflow for protected lifecycle statuses with reason, movement, audit trail |

## Asset Labels, QR, And Scanning

| Feature | Details |
|---|---|
| Label profiles | Configurable 12mm, 18mm, 24mm, and custom tape profiles |
| Brother label support | Label text/QR optimized for Brother tape workflows; docs note PT-E550W 18mm driver setup |
| Label templates | Primary/secondary/tertiary text templates and QR size/layout settings |
| Public QR Base URL | Production QR links use public HTTPS base URL; print UI warns for localhost/private/relative targets |
| Single label print | Asset detail print route |
| Bulk label print | Label management page and bulk print route with queue filters for print status, company, branch, category, location, created date, and selected-label sort order |
| Label queue UX | Queue scope summary and "add by current filter" action support all/company/branch/location batches, branch and location filter options include hierarchy context, ad hoc search guidance is compact under the search input, and asset display names de-duplicate brand/model text already present in the asset name |
| Print tracking | Label print batch and print history models exist in schema; current behavior records the print batch when the print page executes |
| Asset scan/search | QR-first scanner page for printed asset labels |
| QR resolver | `/q/a/{assetId}` resolves printed QR labels to the correct localized asset detail |
| Serial/barcode scanning | Reusable scanner input supports manufacturer serial/barcode capture paths documented in handoff/workflows |
| Mobile camera guidance | Rear-camera preference, undistorted preview, scan guide overlays, native-resolution decode paths |

## Asset Custody And Movement

| Feature | Details |
|---|---|
| Check-out | Handover to employee, department, location, or another asset |
| Check-out evidence | Before-handover photo, receiver signature pad, attachment evidence |
| Check-out validation | Blocks duplicate active checkout and protected lifecycle statuses |
| Check-in | Return workflow with return/receive parties, condition after, next status, next location |
| Legacy check-in backfill | Check-in page exposes searchable legacy/current-custodian candidates and creates an auditable backfilled checkout before the standard return workflow |
| Check-in evidence | After-return photos, return signature, receive signature |
| Check-in maintenance link | Can create maintenance ticket only when next status is Pending Repair and permission allows |
| Transfer | Move asset location/custodian/department through controlled operation |
| Bulk move | Bulk location movement for multiple assets |
| Bulk update | API support for selected asset location/custodian updates |
| Movement history | Every key operation creates `AssetMovement` records |
| Operation documents | Printable handover and return documents with readable configurable document numbers |
| Document numbering | Defaults to `HO-{yyyyMM}-{running}` and `RT-{yyyyMM}-{running}`, configurable in System Settings |

## Asset Lifecycle Controls

Implemented status lifecycle and enforcement from docs/code:

- Check-out sets status to `Checked Out`.
- Check-in can return only to `Ready`, `Pending Repair`, or `Pending Disposal`.
- Check-out blocks `Disposed`, `Retired`, `Pending Disposal`, `Under Maintenance`, `Lost`, and `Missing`.
- Transfer blocks assets with an active checkout and blocks normal transfer for `Disposed`, `Retired`, and `Pending Disposal`.
- Maintenance close only allows `Ready` or `Pending Disposal`.
- Disposal execution only allows `Disposed` or `Retired`.
- Generic asset edit cannot directly assign protected lifecycle statuses, and the asset form blocks these changes before submit with workflow guidance.
- Status correction can restore protected lifecycle statuses to `Ready` with a required reason and audit trail.
- Status and condition are separate controls: status drives workflow availability, while condition records physical state and guides whether the next workflow should be Ready, repair, disposal, lost/missing follow-up, or correction.
- Help icons beside status and condition fields surface the same lifecycle guidance inline on Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers.
- Default audit target selection excludes disposed/retired assets unless explicitly included.

## Audit

| Feature | Details |
|---|---|
| Audit rounds | Create rounds from scoped asset filters |
| Audit rounds action hub | Action-first list with next-action cards, URL-backed quick filters, and ready-to-close/blocker badges for high-volume audit operations |
| Audit return navigation | Round detail, pending, and scan links preserve the originating rounds view/search through sanitized internal `returnTo` targets; scan/pending return to the round detail and round detail returns to the filtered rounds list |
| Candidate preview | Preview audit candidates before creating a round |
| Expected list | Audit items generated from scope and start as pending |
| Audit detail | Progress metrics and expected item list |
| Audit scan | QR/manual scan, scan-first entry focus, manual partial suggestions in the scan panel, searchable manual item picker, system data comparison panel, sticky single-source progress header with photo-queue badge and collapsible pending queue shortcut, pending-list return-to-scan navigation, focused scan-result card, compact recent-scan panel, default fast/continuous walking behavior without extra mode switches, fast `บันทึกพบตรง` save path, detailed `บันทึกข้อมูลไม่ตรง / Finding` path, photo evidence, and mobile bottom action bar after scan selection |
| Continuous mobile scan | Uses asset QR decoder while keeping audit workflow on the audit scan page |
| Audit scan camera UX | Defaults to rear-camera walking mode, hides normal camera-ready status text and camera selector controls, shows camera utilities only while scanning, after a decoded QR reference exists, or when a camera issue needs attention; supported camera tracks expose a flashlight toggle for low-light scans |
| Recent audit scans | Shows the newest QR/manual scan outcomes in a separate compact panel with the latest three reads visible and older reads collapsible so auditors can verify walking-scan context without mixing it into the current result card |
| Found/mismatch/not found | Handles found, mismatch, out-of-scope, unknown asset, not-found, and found-later cases |
| Scan result semantics | Successful scan results do not show Not Found as a primary action; assets outside the round are Out-of-scope, unknown codes are Unknown Asset, and Found Later reuses the existing recovery logic |
| Not-found workflow | Mark pending items as not found from the pending list/zone queue without changing asset status to Lost automatically |
| Pending audit queue shortcut | Audit Scan can open an inline preview of pending items from the current round with expected location/custodian/department context on each card, while the full pending list remains the not-found workflow surface |
| Evidence photos | Matched scans can save without photos; mismatched actual field data requires at least one free-form evidence photo, with multiple queued photos and optional grouping tags |
| Audit Findings workflow | `/audit/findings` summarizes pending review, open action, overdue, and closed queues; shows system-vs-found comparison, resolution-state badges, quiet loaded-at metadata with stale warning, approve/reject decision modal, master-data conflict guard before correction, review/action/closure controls, evidence attachments, batch actions, and filtered Excel/PDF exports |
| Findings follow-up context | Disposal follow-up links from findings preserve the active findings queue/search as sanitized return context |
| Reconciliation | Approve/reject findings with movement/audit trail and segregation controls |
| Close-round controls | Close-round workflow with protection documented in lifecycle/workflow docs |
| Exports | Audit result Excel/PDF, findings Excel/PDF, variance export |
| Labels | User-facing labels resolve expected/actual references instead of raw ids where supported |

## Maintenance And Preventive Maintenance

| Feature | Details |
|---|---|
| Maintenance tickets | Create, view, update, close, export maintenance tickets |
| Ticket detail | Attachments, previews, close/status actions, print page |
| Maintenance return navigation | Ticket detail, print, and Kanban/status drilldowns preserve the originating maintenance tab/status/search/asset filter through sanitized return context |
| Ticket creation validation | Opening a ticket moves the asset to Pending Repair when available and does not require `returnDate`; return date is required only when closing the ticket |
| Check-in integration | Optional ticket creation from check-in when returned asset needs repair |
| Maintenance status | Controlled close flow with post-repair asset status restrictions |
| Evidence | Drag/drop attachments and preview/download/delete controls |
| Costs/vendor/assignee | Ticket fields and options support internal/vendor repair workflows |
| PM plans | Preventive maintenance plan model, form, generate-due endpoint, generate-ticket endpoint |
| PM scheduling | Scheduler heartbeat and web-configured PM schedule settings |
| PM history | Related PM/maintenance history visible through asset detail flows per docs |

## Disposal

| Feature | Details |
|---|---|
| Disposal request | Create and list disposal requests |
| Detail | Request, asset, decision, execution/evidence, movement/history sections |
| Disposal return navigation | Request detail and print links preserve the originating disposal status/search filter through sanitized return context |
| Approval | Approve/reject flow with approval remark/value/status updates |
| Execution | Separate actual disposal execution with evidence, recipient/buyer/destination/document number/value/completion date |
| Duplicate guard | Duplicate open requests are guarded |
| Print | A4 disposal print route |
| Export | Disposal export API using current filters where supported |
| Lifecycle control | Final asset status limited to `Disposed` or `Retired` |

## Reports, Accounting, And Exports

| Feature | Details |
|---|---|
| Reports page | Central report entry point with shared filters, grouped breakdowns, and a cross-scope asset panel for custodian/location scope mismatches; branch breakdown labels include company code so repeated branch names across companies remain clear |
| Asset overview export | `reports/assets-overview/export` API with cross-scope summary metrics and a Cross Scope sheet |
| Asset register export | Current filter export through asset export API, including cross-scope filters and owner/custodian/home/current location branch columns |
| Audit exports | Audit round results, findings, variance Excel/PDF exports |
| Maintenance export | Maintenance ticket export |
| Disposal export | Disposal request export |
| Category/brand-model exports | Master-data export APIs |
| PDF print views | Asset labels, handover, return, maintenance, disposal |
| Thai fonts | Bundled Thai fonts for PDF output unless production overrides are configured |
| Depreciation policy | System Settings builder for straight-line depreciation defaults and category policies |

## Master Data

| Module | Features |
|---|---|
| Companies | CRUD, active flag, company code, Asset Tag Code, tax/address fields |
| Branches | CRUD, company relation, branch code/name/address/contact |
| Departments | CRUD, optional company relation, department code/name |
| Employees | CRUD, company/branch/department, manager, employment status, linked user/self-service context |
| Locations | CRUD, branch relation, parent/child hierarchy, location type |
| Categories | CRUD, soft delete/reactivation by code, custom field templates, safe create/update template writes, photo checklist/prefix support, and count drilldowns to models/assets |
| Brands/Models | Compact brand navigator, model workspace, structured specs, model photos, active count summaries, and drilldowns to brand/model asset lists |
| Suppliers | CRUD/detail, tax ID/supplier code semantics, contact/address fields |

## Admin, Settings, And Governance

| Feature | Details |
|---|---|
| User management | Create/edit users, active flag, employee link, role assignment |
| Role management | Role CRUD, permission matrix, export, system-role guardrails |
| RBAC navigation | Sidebar menu filtered by user permissions; system admin retains full access |
| Access denied page | Direct unauthorized page hits show localized access-denied page |
| System settings | Task-oriented settings UI for asset numbering, labels/QR, LDAP, PM, notifications, approvals, retention, depreciation, data quality |
| LDAP/AD settings | DB-backed LDAP config, bind test, sync preview/apply, scheduled sync controls |
| LDAP auto-provision | Links user to active Employee by LDAP email or employeeID before creating app user |
| Approvals | Approval inbox/history for workflow-controlled operations |
| Data quality | Configurable asset data quality rules and admin page |
| Storage governance | Missing/orphan file review and archive action for orphan files |
| Integration API client management | `Admin > Integration API` creates, edits display names/scopes, rotates, disables, and enables DB-backed read-only integration clients. Plain tokens are shown once on create/rotate; only token hashes and previews are stored. Scope expansion requires confirmation and is audited with safe old/new values. |
| Readiness | Production readiness page covering env, upload scanner, scheduler, backup-oriented checks |
| System logs | Readable system log presentation with record labels and before/after summaries |
| Notifications | Notification center, notification states, digest scheduler endpoint |
| Retention policy | Settings for attachment, audit log, and orphan file retention windows |

## Security And Production Controls

| Feature | Details |
|---|---|
| Authentication | Local credential login plus optional LDAP/AD |
| Authorization | `module:action` RBAC through page/API helpers |
| Route matrix | `src/lib/rbac-route-matrix.ts` tracks expected route permissions |
| Attachment access | Authenticated, module-permission-aware download/preview route |
| Upload hardening | Size, MIME, extension, content signature, optional scanner hook |
| Upload storage | Files stored under configured `UPLOAD_DIR`; attachments are private and no-store |
| Security headers | Centralized browser security headers and service-worker headers |
| Audit trail | Sensitive operations are expected to write system logs/audit records |
| Integration API foundation | Read-only `/api/integrations/v1` surface with DB-backed hashed Bearer token clients in `integration_api_clients`, `Admin > Integration API` token lifecycle/scope controls, request IDs, scopes, audit logging with query/target/response summaries, health check, asset lookup/list DTOs, incremental asset change feed, reference-code endpoints, authenticated OpenAPI JSON, and recovery token/hash generation tooling |
| Secret policy | `.env*` ignored; committed docs use placeholders only |
| Backup/restore | Runbook and production readiness checklist cover DB/file backup and restore tests |
| Guarded cleanup | Test-data cleanup script is dry-run/guarded by explicit flags |

## Background Jobs And Scheduler

Scripts in `package.json` and docs support:

- `npm run scheduler:heartbeat`
- `npm run pm:generate-due`
- `npm run pm:generate-due:scheduled`
- `npm run ldap:sync`
- `npm run ldap:sync:scheduled`
- `npm run notifications:digest`
- `npm run cleanup:test-data`

Schedulers are intended to run through systemd timers in production. Web-configured schedules are interpreted in `Asia/Bangkok`.

## Internationalization And UX

| Feature | Details |
|---|---|
| Thai primary UI | Thai messages and routes are first-class |
| English support | English message namespace exists for dual-language operation |
| Enterprise layout | Fixed dashboard shell, sidebar/topbar, content scroll ownership |
| Global search | Topbar/global search API searches across permitted modules |
| Searchable selects | High-volume dropdowns use searchable combobox patterns |
| Mobile cards | Data-heavy pages have mobile-responsive card/stacked patterns per handoff |
| Touch/focus polish | Mobile touch targets and focus-visible behavior documented in handoff |
| File dropzones | Reusable drag/drop and mobile camera capture flows |

## API Surface Highlights

Current API route groups include:

- `api/assets` for CRUD, batch, duplicate check, import/export, labels, bulk move/update, components, purchase docs, status correction, checkout/checkin/transfer.
- `api/audit-rounds`, `api/audit-items`, `api/audit-findings` for audit lifecycle, scan, exports, findings, review, attachments.
- `api/maintenance-tickets` and `api/maintenance-plans` for repair/PM workflows.
- `api/disposal-requests` for disposal request, attachments, decision/execution/export.
- `api/admin` for users, roles, settings, LDAP test/sync, storage governance, and Integration API client lifecycle/scope management.
- Master-data APIs for companies, branches, departments, employees, locations, categories, brands, models, suppliers.
- `api/attachments` for controlled file preview/download/delete.
- `api/search` for permission-aware global search.
- `api/notifications` and `api/notifications/digest`.
- `api/reports/assets-overview/export`.
- `api/integrations/v1` for read-only external-system integration. Current endpoints include `GET /api/integrations/v1/health`, `GET /api/integrations/v1/assets`, `GET /api/integrations/v1/assets/{assetTag}`, `GET /api/integrations/v1/assets/changes`, reference endpoints for statuses, companies, branches, and locations, and authenticated `GET /api/integrations/v1/openapi`. Asset DTOs are intentionally separate from UI/session APIs and omit sensitive purchase/accounting/supplier/evidence fields.

## Current Go-Live Decisions Still Open

From `DEVELOPER_HANDOFF.md`, the following decisions remain to be confirmed before production:

- Production database user and least-privilege permissions.
- SQL Server production migration process.
- Backup owner, restore approver, RTO, and RPO.
- Public QR Base URL and Brother printer driver tape size before high-volume label printing.
- LDAP/AD auto-provision default role and Employee matching rules with a real AD login account.
- LDAP/AD scheduled sync safety threshold before automatic deactivation.
- Notification delivery channels beyond in-app notifications.

## Recommended Verification Before Release

- Run `npm run verify`.
- Run `npm run build`.
- Complete role-based UAT using `docs/07_UAT_CHECKLIST.md`.
- Verify attachment backup/restore and storage governance.
- Verify QR label scanning on target phones.
- Verify Brother printer tape-size driver settings and app label profile.
- Verify LDAP login/sync in preview/manual mode before scheduled sync.
- Verify audit, maintenance, disposal, reports, and exports with realistic data.
