# Asset Management System - Feature List

Last updated: 2026-08-28

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
| Loading UX | Shared page skeletons in the shape of their pages, at full width (the header rows, one number strip, the white table header, underline tabs), plus App Router `loading.tsx` fallbacks for authenticated dashboard pages: route-specific skeletons for Dashboard, Asset Register, Asset Detail and Reports, and a header over a table for every other route |
| PWA | App manifest and install icons for mobile Add to Home Screen |

## Main Navigation And Pages

Current authenticated pages exist under `src/app/[locale]/(dashboard)`:

| Area | Pages / Capabilities |
|---|---|
| Dashboard | `/dashboard` KPI and overview page, including cross-scope asset counters and drilldowns |
| Work Center | `/work-center` actionable operations summary |
| My Assets | `/my-assets` employee self-service asset list, 25/50/100 per page with totals over every asset the person holds |
| Asset Register | `/assets`, `/assets/new`, `/assets/{id}`, `/assets/{id}/edit` |
| Asset Operations | `/asset-management/checkout`, `/checkin`, `/transfer`, `/bulk-move`, `/scan`, `/labels`, `/import-export` |
| Audit | `/audit/rounds`, `/audit/rounds/new`, `/audit/rounds/{id}`, `/pending`, `/scan`, `/audit/findings` |
| Maintenance | `/maintenance`, `/maintenance/new`, `/maintenance/{id}`, `/maintenance/pm`, `/maintenance/pm/new`, `/maintenance/pm/{id}/edit` |
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
- Operations: `AssetCheckout`, `AssetCheckin`, `AssetTransfer`, `AssetMovement`
- Audit: `AuditRound`, `AuditItem`, `AuditFinding`, `AuditScanHistory`
- Maintenance: `MaintenancePlan`, `MaintenanceTicket`
- Disposal: `DisposalRequest`
- Supplier: `Supplier`
- Files: `Attachment`
- Auth/RBAC: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`
- System and governance: `SystemLog`, `SystemSetting`, `Notification`, `NotificationUserState`, `IntegrationApiClient`, `ManualMigrationHistory`, `AssetStateReview`

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
| Asset import | The import and export page (`/asset-management/import-export`, `asset:create`; page group 4 plan 5): an import card open on arrival with five steps, the template link, a dropzone for one `.xlsx` (10 MB, 1,000 data rows), a check of every row with Thai problem lines that name the field, the value in the file and the asset that already holds a tag or Serial, a row filter (มีข้อผิดพลาด / พร้อมนำเข้า / ทั้งหมด), "อัปโหลดไฟล์ที่แก้แล้ว" and "ยืนยันนำเข้า N รายการ", which imports exactly the N ready rows in one transaction or refuses with 409 when the data changed since the check. Thai field names work as headers; blank tags are generated; a held บุคคล or Stock row takes its holder's department. The done state links to the imported assets. ประวัติรอบนำเข้า lists the last 10 batches by file name with นำเข้าครบ / นำเข้าบางส่วน and the skipped rows. The register's "ส่งออก / นำเข้า" menu holds the template and "นำเข้าจาก Excel" to this page |
| Asset export | Excel export of the filtered register from the register's "ส่งออก / นำเข้า" menu; on the import and export page "ส่งออกทั้งหมด (Excel)" with the count of active assets ("ไม่ใช้ตัวกรอง"; at most 5,000 rows, the newest) and a link to the register for a filtered export. A viewer sees the export and the import history |
| Master-data drilldowns | Category, brand, and model count links open the relevant Brand/Model workspace or Asset Register filters (`categoryId`, `brandId`, `modelId`) with removable active filter chips where applicable |
| Cross-scope visibility | Dashboard KPI/review panel, URL-backed quick filters, and exports for assets whose current custodian company, current custodian branch, or current location branch differs from the owner/tag scope |
| Duplicate handling | Duplicate checking for asset tag/serial and batch duplicate review |
| Asset tag generation | Configurable format, category prefix groups, company asset-tag code, branch/category/running tokens |
| Status/condition guidance | Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers expose help popovers explaining lifecycle status, physical condition, protected workflows, and normal next actions; every help button is 24px beside its label, and the register's filter sheet puts it in the `labelAction` of its `FilterSelect` |
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
| Label templates | Primary/secondary/tertiary text templates, QR size/layout settings, `{labelAssetName}` print-only compact asset-name token, and a Label / QR segmented control for `ย่ออัตโนมัติ` versus `ชื่อเต็ม` so operators can remove category prefixes from suggested names without changing master asset names |
| Public QR Base URL | Production QR links use public HTTPS base URL; print UI warns for localhost/private/relative targets |
| Single label print | Asset detail print route |
| Bulk label print | The labels page (`/asset-management/labels`, `asset:view`; page group 4 plan 6, board AR-Labels): a search whose results show their real print state; a label queue with four modes (ยังไม่เคยพิมพ์, เคยพิมพ์แล้ว, ทั้งหมดล่าสุด, ต้องพิมพ์ใหม่) and filter chips for company, branch, room (with a search box), category, created date and queue order; rows name first with "ป้ายเดิม <tag>" when the printed tag is not today's; 20 rows then "แสดงอีก 10 รายการ"; "เพิ่มทั้งหมด" with its counts ("ตรงตัวกรอง a · อยู่ในรายการพิมพ์แล้ว b · จะเพิ่มใหม่ c"); a numbered print list of at most 100 labels with its print order; tape, note (500 characters) and a label-by-label preview on the page; the print bar from `md` ("พิมพ์ทดสอบ 1 ดวง", "พิมพ์ป้าย N ดวง") and the same buttons inline on the phone. The register's "พิมพ์ป้าย N รายการ" opens the page with the ticked assets |
| Bulk print route | `/assets/labels?id=…`: at most 100 labels, tape and note filled from the URL's hash (`#tape=…&note=…`, never sent to the server); it records nothing on load or reload; its print button records the print, then opens the browser's print dialog. The page's preview and the print route draw one label part (`AssetLabelItem`) from one mapper (`toAssetLabelData`) |
| ต้องพิมพ์ใหม่ | Active assets whose tag changed (an `asset_tag_change` movement) after their latest label print, compared with case; at most 2,000, with a warning past that. Tag changes made before page group 4 plan 2 are not found |
| Print tracking | `POST /api/assets/label-prints` records one batch per press of the print route's print button (`asset_label_print_batches`, one `asset_label_prints` row per asset with the tag printed, a `print_label` system log); a test print is a batch of 1 with the note "พิมพ์ทดสอบ" when none is typed. The queue's modes read these records |
| Asset scan/search | QR-first scanner page for printed asset labels with auto-open detail routing, flashlight support where available, and 1x/2x/3x camera zoom controls for small QR labels |
| QR resolver | `/q/a/{assetId}` resolves printed QR labels to the correct localized asset detail |
| Serial/barcode scanning | Reusable scanner input supports manufacturer serial/barcode capture paths documented in handoff/workflows |
| Mobile camera guidance | Rear-camera preference, undistorted preview, scan guide overlays, native-resolution decode paths |

## Asset Custody And Movement

| Feature | Details |
|---|---|
| Check-out | Handover to employee, department, or location; the department follows the receiver for บุคคล and Stock assets |
| Check-out evidence | Before-handover photo, receiver signature pad, attachment evidence |
| Check-out validation | Blocks duplicate active checkout and protected lifecycle statuses |
| Check-in | Return workflow with a components checklist, return/receive parties (receiver defaults to you), condition chips, next status, searchable next location; the department goes to the return department (setting, default IT) |
| Legacy check-in backfill | Check-in page exposes searchable legacy/current-custodian candidates and creates an auditable backfilled checkout before the standard return workflow |
| Check-in evidence | After-return photos, return signature, receive signature |
| Check-in maintenance link | Return result "ส่งซ่อม" (`Under Maintenance`) opens an unfinished repair record, or joins the open one, in the same transaction, and the RT- links it; opening one needs `maintenance:create` |
| Outstanding components | A component not returned stays with the person returning, is listed on the RT-, and is refused elsewhere (handover, transfer, bulk move, disposal) until returned |
| Late component return | `component-return` brings it back later on the same RT-: re-attached to a parent in IT stock, or standing alone in the chosen room; a line on the RT- |
| Transfer | Move an asset's location, custodian and department in one controlled operation: destinations equal to the current value are ignored, the department follows the transfer rule (the holder's for บุคคล and Stock, free for ส่วนกลาง and ส่วนควบ), inactive destinations are refused, a broken asset is not given a new holder, and the TR- prints แผนกเดิม |
| Contextual transaction shortcuts | Asset Register and Asset Detail expose Handover, Return, and Transfer without requiring users to memorize the Asset Tag; unavailable actions remain visible in a faded state with a recovery-oriented reason |
| Reversible transactions | A user with `asset:edit` can cancel only the latest eligible Check-out, Check-in, or Transfer; the system restores the exact versioned asset/component snapshot and never asks the operator to guess a replacement status; cancelling a Check-in also restores the components it left out as installed |
| VOID documents | Cancelled operation documents remain readable and printable with cancellation user/time/reason and VOID presentation instead of being deleted |
| Cancellation safety review | Stale, downstream-dependent, non-latest, or legacy snapshot-less cancellation attempts do not mutate asset data and create/update `transaction_cancellation_blocked` in Asset State Review |
| Bulk move | Move up to 100 assets to one room from a server-paged table (desktop only): filter by words, current room and category, tick across pages and filters, review what moves with each asset (installed components follow; holder and department stay), and stay on the page with the result; refused assets are named with their reason |
| Bulk update | API support for selected asset location/custodian updates |
| Movement history | Every key operation creates `AssetMovement` records |
| Operation documents | Printable handover and return documents with readable configurable document numbers |
| Document numbering | Defaults to `HO-{yyyyMM}-{running}` and `RT-{yyyyMM}-{running}`, configurable in System Settings |

## Asset Lifecycle Controls

Implemented status lifecycle and enforcement from docs/code:

- Check-out sets status to `Checked Out`.
- Check-in can return only to `Ready`, `Under Maintenance` ("ส่งซ่อม", with a repair record), or `Pending Disposal`.
- Check-out accepts only assets in `Ready` and blocks assets with an active checkout.
- Personal transfer accepts only `Ready` or `In Use` and blocks assets with an active checkout; location-only or department-only movement preserves the current status. A destination equal to the current value is not a change, and a broken asset (เสียหาย, ใช้งานไม่ได้, ซาก) is not given a new holder.
- Repair records: an unfinished record moves the asset to `Under Maintenance`; finishing ("ซ่อมเสร็จ") or cancelling returns `In Use` when an active checkout or valid personal custody remains, otherwise `Ready`; outcome `beyond_repair` moves it to `Pending Disposal`. A record saved as already finished and usable leaves the status unchanged.
- Disposal execution only allows `Disposed` or `Retired`.
- Generic asset edit cannot directly assign protected lifecycle statuses, and the asset form blocks these changes before submit with workflow guidance.
- Status correction can restore protected lifecycle statuses to `Ready` with a required reason and audit trail.
- Status and condition are separate controls: status drives workflow availability, while condition records physical state and guides whether the next workflow should be Ready, repair, disposal, lost/missing follow-up, or correction.
- Help icons beside status and condition fields surface the same lifecycle guidance inline on Asset Create/Edit, Asset Detail, Asset Register filters, and Asset Register table headers.
- Default audit target selection excludes disposed/retired assets unless explicitly included.

## Audit

| Feature | Details |
|---|---|
| Audit rounds | Create rounds from scope conditions added as chips; a round opens at once (no draft step) |
| Audit rounds action hub | Round-wide next-action strip, status tabs (in progress / closed / cancelled / all) with counts that follow the search, work views as a removable chip, one computed status badge plus ready-to-close, a wrapping next-step column (scan for editors, the pending list for others); 25/50/100 rounds per page, cut in memory after the view filter so the tab counts still cover every round, and a page past the end shows the last page |
| Audit return navigation | Round detail, pending, and scan links preserve the originating rounds view/search through sanitized internal `returnTo` targets; scan/pending return to the round detail and round detail returns to the filtered rounds list; the rounds list's own `returnTo` also carries its page and page size, so the round detail and the scan screen bring a person back to the same page, and the pending list keeps the round's `returnTo` on its page links |
| Candidate preview | A live item count while the conditions change, with matched and sampled numbers, components, top categories, an overlap warning and an eight-row sample |
| Expected list | Audit items generated from scope and start as pending |
| Component asset audit | Audit round preview/create automatically includes active installed component assets for selected parents; Audit Scan shows component status under the parent and supports explicit confirmed-with-parent component verification |
| Audit detail | Progress metrics and expected item list |
| Audit scan | QR/manual scan, scan-first entry focus, manual partial suggestions in the scan panel, searchable manual item picker, system data comparison panel, sticky single-source progress header with photo-queue badge and collapsible pending queue shortcut, pending-list return-to-scan navigation, focused scan-result card, compact recent-scan panel, default fast/continuous walking behavior without extra mode switches, fast `บันทึกพบตรง` save path, detailed `บันทึกข้อมูลไม่ตรง / Finding` path, photo evidence, and mobile bottom action bar after scan selection |
| Continuous mobile scan | Uses asset QR decoder while keeping audit workflow on the audit scan page |
| Audit scan camera UX | Defaults to rear-camera walking mode, hides normal camera-ready status text and camera selector controls, shows camera utilities only while scanning, after a decoded QR reference exists, or when a camera issue needs attention; supported camera tracks expose a flashlight toggle for low-light scans and 1x/2x/3x zoom buttons for small QR labels, with 1x returning to the unzoomed preview |
| Recent audit scans | Shows the newest QR/manual scan outcomes in a separate compact panel with the latest three reads visible and older reads collapsible so auditors can verify walking-scan context without mixing it into the current result card |
| Found/mismatch/not found | Handles found, mismatch, out-of-scope, unknown asset, not-found, and found-later cases |
| Scan result semantics | Successful scan results do not show Not Found as a primary action; assets outside the round are Out-of-scope, unknown codes are Unknown Asset, and Found Later reuses the existing recovery logic |
| Audit scan lookup | `POST /api/audit-rounds/{id}/scan-lookup` resolves printed QR asset IDs, Asset Tags, Serial Numbers, and fixed asset codes under `audit:edit` before the UI decides whether a scanned value is in-round, out-of-scope, or unknown. An out-of-scope find already recorded in the round answers out-of-scope again, with its item. |
| Out-of-scope actual fields | Field auditors can record actual location, custodian, department, and condition for out-of-scope assets; changed values become reviewable field findings before master data updates. Scanning the find again edits that record and keeps it out of scope, against the first scan's snapshot. |
| Not-found workflow | Mark pending items as not found from the pending list without changing asset status to Lost automatically. The list pages on the server (25/50/100), titles itself with the round's pending count, and counts and searches by the item's expected room and custodian, with room chips ("ทุกห้อง", the six largest, "อื่น ๆ"). For `audit:edit` only, each row offers "สแกนรายการนี้" and "บันทึกไม่พบ"; the dialog names the asset. ตรวจล่าสุด shows the asset's latest audit result with its time, as the asset page does. Marking the last item of the last page lands on the new last page. |
| Pending audit queue shortcut | Audit Scan can open an inline preview of pending items from the current round with expected location/custodian/department context on each card, while the full pending list remains the not-found workflow surface |
| Evidence photos | Matched scans can save without photos; mismatched actual field data requires at least one free-form evidence photo, with multiple queued photos and optional grouping tags |
| Audit Findings workflow | `/audit/findings` (page group 2 plan 4): six tabs with counts (ต้องติดตาม with its sub-chips; old links land), the "รอบ:" / "เรื่อง:" filters and a Thai field-name search, a table with the เรื่อง chip and the component's parent, and a review panel by `?finding=` (full screen on the phone) that holds the four-field comparison and what approving changes; approve / reject at once with the next finding, and a required reject reason; the 409 second press; and the action plan and the close with evidence, the evidence list and the disposal link. It also has `DesktopSelectionBar` batches that report successes and failures, "ส่งออก ▾" Excel/PDF in the page's language, 25/50/100 per page, and the pager total equal to the tab's count. |
| Findings follow-up context | Disposal follow-up links from findings preserve the active findings queue/search as sanitized return context |
| Reconciliation | Approve/reject findings with movement/audit trail and segregation controls |
| Close-round controls | The round page's next-step card lists the close API's four conditions and holds "ปิดรอบตรวจ" at step 3; the opener is told they cannot close. |
| Audit round cancellation | Cancel incorrect/test audit rounds with a required reason; cancelled rounds become read-only historical records with time/user/reason metadata, preserve prior audit work without rollback, and are excluded from operational queues/current coverage |
| Exports | Audit result Excel/PDF, findings Excel/PDF, variance export, with statuses and results in words (`?locale=`), English headers |
| Labels | User-facing labels resolve expected/actual references instead of raw ids where supported |

## Maintenance And Preventive Maintenance

One-form repair log since 2026-10-07 (staff guide `docs/17_REPAIR_RECORD_GUIDE_TH.md`).

| Feature | Details |
|---|---|
| Repair record form | `RepairRecordForm` at `/maintenance/new` and from Asset Detail "บันทึกซ่อม" (group 5 plan 2, board MT-New): the operation frame with 3 numbered sections, the asset card with its eligibility line, date (Bangkok today, not after it), problem/work done, finished or not and the outcome with no pre-chosen answer (the PM path pre-chooses finished), the status line now → after and the early refusal on a held asset with รับคืน, vendor, cost, invoice no., files and remark always open, the summary "สรุปก่อนบันทึก" and the sticky footer "บันทึกซ่อม"; recorder from the signed-in employee |
| Record statuses | `in_progress` / `closed` / `cancelled`; legacy `open`/`reported`/`accepted`/`waiting_*`/`completed` rows read as `in_progress` (`openRepairRecordWhere`) |
| Asset status effect | Policy in `src/lib/repair-record-policy.ts`; conditional `statusId` claim in the transaction, `AssetMovement` and System Log for every change; one unfinished record per asset; written-off and on-loan guards with stable Thai/English error codes |
| Record detail | Group 5 plan 3 (boards MT-Detail, MT-Detail-Phone): header with the day count, "อื่น ๆ" (แก้ไขรายละเอียด, ยกเลิกบันทึก with confirmation), the next-step card predicting ซ่อมเสร็จ per outcome (held refusal with รับคืน; after ซ่อมไม่ได้ "ยื่นคำขอตัดจำหน่าย"), the "ซ่อมเสร็จ" dialog with no pre-chosen outcome, history oldest first with actors and attachment runs, asset panel, attachments typed by the record's state with thumbnails and the phone camera, phone bar "ซ่อมเสร็จ" + "เพิ่มเติม"; legacy fields read-only when present, print page |
| Repair list | Group 5 plan 5 (board MT-List): header with "จัดการแผน PM" and "บันทึกซ่อม"; the strip "ต้องจัดการ N เรื่อง" with its parts line "a + b + c + d" and four global link cells (ยังซ่อมไม่เสร็จ → `?status=in_progress`, ค้างสถานะซ่อมไม่มีบันทึก → `#stuck`, PM เกินกำหนด and PM ครบกำหนดใน 7 วัน → the PM page's `?due=overdue` / `?due=week`); two cards that always render: `#stuck` "ทรัพย์สินค้างสถานะซ่อมแต่ไม่มีบันทึก" (3 rows with บันทึกซ่อม, "ดูทั้งหมด N ชิ้น" / "แสดงน้อยลง" via `?stuck=all`) and `#pm-due` "บำรุงรักษาตามรอบ (PM) ครบกำหนดใน 7 วัน" (3 plans with บันทึกว่าทำแล้ว or the open-record link, the foot link to the PM page's overdue or 7-day list); the records "บันทึกการซ่อม" with status tabs and counts that follow the filters, search, the "ช่วงวันที่" chip, export, the removable "เฉพาะทรัพย์สินนี้" chip, six columns (the open day count, the outcome or the cancel reason under the badge; the vendor or ช่างภายใน with the recorder), the foot "ค่าใช้จ่ายรวม N รายการ" less cancelled records, 25/50/100 per page, and phone cards; detail/print keep the list context through sanitized `returnTo` |
| Check-in integration | Return result "ส่งซ่อม" opens an `in_progress` record from the damage note |
| Evidence | Photos/receipts attach on create or later; `maintenance:create` may attach to own records, `maintenance:edit` to any record |
| PM plans | Reminders only: create/edit, pause/resume/end, due within 7 days listed on Maintenance, Work Center, and notifications; "บันทึกว่าทำแล้ว" saves a repair record with `maintenancePlanId` and moves `nextDueDate` by one interval (month-end clamp); disposal execution ends the asset's plans |
| PM page | Group 5 plan 4 (board MT-PM): tabs ใช้งาน / พักแผน / จบแผน (`?state=`) with counts, one state per page (25/50/100) in its own order (next due date; ended newest first); search by plan title or number, asset name or tag that every count follows; on the active tab the due cells เกินกำหนด / ใกล้ถึงกำหนด (14 days) / รอบถัดไป that filter the list (`?due=`, keeping the search) and one sum line under them naming the plans of written-off assets left out; `?due=week` chip "ครบกำหนดใน 7 วัน"; rows with the due badge and day count; the next step "บันทึกว่าทำแล้ว", or the link "มีบันทึกซ่อมที่ยังไม่เสร็จ MT-…" when the asset has an unfinished record; ⋯ แก้ไข, พักแผน / เปิดใช้งานต่อ, จบแผน with confirms; links return to the same tab, search and page |
| PM form | Group 5 plan 4 (board MT-PM-Form): the operation frame with breadcrumbs and the sticky footer; the asset card (picker on create, locked on edit), title, vendor, notes, the frequency as buttons (custom 1–3,650 days), the next due date, the four-round preview with its steps, changed fields with "เดิม: …" and คืนค่าเดิม on edit, the summary ก่อนแก้ → หลังแก้ and the impact on the PM page's due cells and the 7-day box; a stale edit is refused (409 `MAINTENANCE_PLAN_CONFLICT`) and keeps the typed values |
| Maintenance options | Bounded server search for assets, employees, and vendors; list pages do not load complete master-data options |
| History | Repair history on Asset Detail, employee detail (records linked to that employee), and supplier detail (repairs by that vendor) |
| Removed | Status-step buttons, board view, assignee/due-date planning, SLA/overdue alerts, close checklist, maintenance close approval, automatic PM work orders and their scheduler job |

## Disposal

- Group 6 plan 3 (2026-11-04): the request form (board DP-New: asset card, method cards, required photo, no price, the summary) and the request page (DP-Request: the next-step card with approve / reject or the reason you cannot decide, all photos, the source link, the phone bar only with a next step).

| Feature | Details |
|---|---|
| Disposal request | Create and list disposal requests; the queue has stage tabs, one filter form, 25/50/100 pages and a row next step that opens the review or execution dialog |
| Disposal batches | `/disposal/batches` lists bulk batches 25/50/100 per page on the server (it showed only the newest 100 before); a batch page's Back returns to the batch list page it came from, otherwise to the queue |
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
| Reports workspace | Four URL-backed `overview`, `accounting`, `operations`, and `catalog` views with filter-preserving tabs, removable active-filter chips, two shared metrics, active-view-only data loading/timing, browser-local view/filter presets, permission-aware exports, exact data-quality/cross-scope/idle drilldowns, company-qualified branch labels, and semantic desktop tables paired with labelled mobile cards |
| Reports performance timing | Opt-in `reports.shared-data` plus exactly one active-view label from `reports.overview-data`, `reports.accounting-data`, `reports.operations-data`, or `reports.catalog-data` |
| Asset overview export | `reports/assets-overview/export` API with cross-scope summary metrics and a Cross Scope sheet |
| Asset register export | Current filter export through asset export API, including cross-scope filters and owner/custodian/home/current location branch columns |
| Audit exports | Audit round results Excel/PDF and the variance report (รายงานผลต่าง), each following the round page's filters (result, category, field, components, company, branch, search); findings Excel/PDF exports, with statuses and results in words (`?locale=`), English headers |
| Maintenance export | Repair record Excel export (date, asset, problem/work done, status, outcome, vendor, cost, invoice, recorder, PM plan) |
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
| Departments | CRUD, optional company relation, department code/name; the list pages on the server (25/50/100) and edit → back keeps the page |
| Employees | CRUD, company/branch/department, manager, employment status, linked user/self-service context |
| Locations | CRUD, branch relation, parent/child hierarchy, location type |
| Categories | CRUD, soft delete/reactivation by code, custom field templates, safe create/update template writes, photo checklist/prefix support, and count drilldowns to models/assets |
| Brands/Models | Compact brand navigator, model workspace, structured specs, model photos, active count summaries, and drilldowns to brand/model asset lists |
| Suppliers | Adaptive list/detail CRUD, tax ID/supplier code semantics, validated contact/address fields, relationship-aware deactivate/delete guards, linked asset/purchase/maintenance summaries, and mobile purchase-document cards |

## Admin, Settings, And Governance

| Feature | Details |
|---|---|
| User management | Create/edit users, active flag, employee link, role assignment |
| Role management | Role CRUD, permission matrix, export, system-role guardrails |
| RBAC navigation | Sidebar menu filtered by user permissions; system admin retains full access |
| Access denied page | Direct unauthorized page hits show localized access-denied page |
| System settings | Task-oriented settings UI for asset numbering, labels/QR, LDAP, notifications, approvals (no maintenance close approval or PM automation since 2026-10-07), retention, depreciation, data quality |
| LDAP/AD settings | DB-backed LDAP config, bind test, sync preview/apply, scheduled sync controls |
| LDAP auto-provision | Links user to active Employee by LDAP email or employeeID before creating app user |
| Approvals | Approval inbox (group 6 plan 2, board AP): the overdue / oldest / total strip, tabs, search, an overdue filter and paging over every pending disposal request, audit finding and round ready to close; a right panel with the request's photos and details, approve / reject and auto-advance; bulk approve across pages up to 200 with a not-opened warning; history for workflow-controlled operations; the history pages on the server (25/50/100; it showed the newest 150) and its module and decision counts cover every decision the user may see |
| Data quality | Configurable asset data quality rules and admin page |
| Storage governance | Missing/orphan file review and archive action for orphan files |
| Integration API client management | `Admin > Integration API` creates, edits display names/scopes, rotates, disables, and enables DB-backed read-only integration clients. Plain tokens are shown once on create/rotate; only token hashes and previews are stored. Scope expansion requires confirmation and is audited with safe old/new values. |
| Readiness | Production readiness page covering env, upload scanner, scheduler, backup-oriented checks |
| System logs | Readable system log presentation with record labels and before/after summaries; quick filters as tabs and 25/50/100 pages on the server (it showed the newest 100) |
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

- `npm run scheduler:heartbeat` (LDAP sync only; no PM job since 2026-10-07)
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

- `api/assets` for CRUD, batch, duplicate check, import/export, labels, bulk move/update, components, purchase docs, status correction, checkout/checkin/transfer, component-return.
- `api/asset-operations` for the transaction pages' asset search and the ย้ายที่ตั้งหลายรายการ list (`asset:edit`).
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

## Explicit asset custody modes

- Asset Handover distinguishes permanent employee assignment from temporary loan.
- Resulting lifecycle state is derived server-side (`In Use` / `Checked Out`).
- Asset Return validates the current custody mode/status pair and displays it read-only.
- Data Quality detects missing mode, conflicting modes, and mode/status mismatch without unsafe guessing.
- Due reminders apply only to temporary loans; detail, timeline, and printable documents present the mode consistently.
