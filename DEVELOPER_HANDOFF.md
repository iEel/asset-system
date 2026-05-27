# Developer Handoff

> Last updated: 2026-05-27
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
- Mobile QR/barcode scanner controls now prefer the rear camera through the browser `environment` camera constraint, include a "Back camera (recommended)" option, and can switch cameras while scanning on asset scanner inputs and the audit scan form. The dedicated `/th/asset-management/scan` page is QR-first for printed Asset Labels, reads `/q/a/{assetId}` resolver URLs directly, auto-opens the asset detail page after a successful QR match, and uses a square mobile preview/scan box; Serial Number inputs still support QR and common barcode formats with the wider preview.
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
- For mobile camera scanning, test `/th/asset-management/scan`, Serial Number scanner inputs, and `/th/audit/rounds/{id}/scan` on the target phone browser. Some browsers hide camera labels until permission is granted, so the app exposes a generic rear-camera option plus any named device list returned by the browser. `/th/asset-management/scan` intentionally scans Asset Label QR codes only, should show a square QR preview, and should navigate to the asset detail automatically after a recognized QR scan; use the Serial Number fields when collecting manufacturer barcodes.

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
- Confirm LDAP/AD scheduled sync safety threshold before enabling automatic deactivation.
- Confirm notification delivery channels beyond in-app notifications.
