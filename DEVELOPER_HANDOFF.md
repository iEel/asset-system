# Developer Handoff

> Last updated: 2026-07-10
> Scope: Developer onboarding, operational constraints, and Go-live decisions for the Asset Management System.

## Purpose

Use this file to orient a developer quickly. It records the current operating model, production guardrails, and decisions still needed before Go-live. It is not a feature history.

Historical implementation notes belong in `docs/99_CHANGELOG.md`.

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
12. `docs/11_FEATURE_LIST.md`
13. `docs/13_INTEGRATION_API.md`
14. `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`

## Current System State

- The system covers the company asset lifecycle: register, QR labels, checkout/check-in, transfer, audit rounds, maintenance, disposal, reports, RBAC, audit trail, LDAP/AD, and operational readiness checks.
- Desktop is the management/review workspace. Mobile is an adaptive field-operation workspace for QR scan, audit, capture, and quick actions. Both use the same APIs, permissions, audit trails, and business workflows.
- Asset Register keeps URL-backed filters, sorting, pagination, bulk actions, and return navigation. It also remembers browser-local filter, sort, page-size, column, and detail-return scroll preferences without changing server data.
- Audit Scan remains inside the existing `auditRoundId` workflow. A successful scan supports matched, mismatch/Finding, out-of-scope, unknown asset, and found-later outcomes. `Mark Not Found` belongs to the pending queue, not the successful scan result.
- External Integration API routes are read-only and separated from session APIs. They use scoped Bearer tokens, audit summaries, request IDs, and compact DTOs. See `docs/13_INTEGRATION_API.md`.

## Production Safety Rules

- Never commit credentials, real connection strings, internal hostnames, server IPs, or production-like `.env` values.
- Do not use `sa` as the Production runtime account. Use a least-privilege application account and a separate migration account where policy permits.
- Do not hard-delete Production business data. Use the existing guarded test-data cleanup tool only for approved test data.
- Do not alter lifecycle, audit, RBAC, SOD, or attachment-access behavior without focused tests and workflow review.
- Treat `npx prisma db push` as Development/Test-only. Production schema changes require an approved change record, backup, rollback or tested restore procedure, and a versioned SQL script when deterministic migration is needed.
- Keep browser print layout separate from printer-driver configuration. Web printing cannot reliably change Brother driver tape width.

## Go-Live Gate

Every row must have an owner, evidence link, and `PASS` status before Production use.

| Gate | Required evidence | Owner | Status |
|---|---|---|---|
| Secrets and access | Auth secrets configured; default admin password changed; named admin accounts reviewed | `<OWNER>` | Open |
| RBAC and SOD | Role UAT completed; restricted routes and APIs verified | `<OWNER>` | Open |
| Database and migration | Runtime DB user is not `sa`; migration record and rollback/restore plan approved | `<OWNER>` | Open |
| Backup and recovery | Backup owner, restore approver, RTO, RPO, and monthly restore drill evidence recorded | `<OWNER>` | Open |
| Core workflow UAT | Role sign-off for asset, audit, maintenance, disposal, reports, and exports | `<OWNER>` | Open |
| Mobile field UAT | Android and iPhone evidence for camera, offline retry, keyboard, rotation, and safe area | `<OWNER>` | Open |
| QR and labels | Permanent HTTPS QR base URL; Brother 18mm print and scan acceptance checks completed | `<OWNER>` | Open |
| Deployment | Nginx/Cloudflare/systemd/scheduler logs and rollback procedure verified | `<OWNER>` | Open |
| Security review | Dependency findings triaged; current security review and remediation decisions recorded | `<OWNER>` | Open |

Record final ownership and evidence in `docs/08_PRODUCTION_READINESS.md` and `docs/07_UAT_CHECKLIST.md` rather than marking this table complete without evidence.

## Known Limitations And Required Manual Tests

- Browser-based printing can generate the correct physical label layout but cannot force Brother driver tape size. For PT-E550W with Laminated Tape 18mm, select `18mm / 0.70"` both in the application profile and Windows/Brother Printer Properties.
- Mobile scanner camera permissions, torch/zoom capability, photo retry, virtual keyboard, device rotation, safe-area clearance, and scan timing must be tested on real Android Chrome and iPhone Safari hardware.
- The browser controller is not evidence of a working camera stream or printer dialog.
- `npm run build` requires valid SQL Server environment settings during page-data collection. Run build and release verification in an environment with an approved non-production database configuration.
- The Integration API currently relies on reverse-proxy/firewall rate limiting and network allowlisting. Add application-level controls only through a separately reviewed security change.

## Operational Notes

- Set `Public QR Base URL` to the permanent HTTPS domain before printing labels at volume. Printed QR labels should resolve through `/q/a/{assetId}` and must not expose localhost or private URLs.
- For large label batches, filter by company/branch/location and sort by Asset Tag, location, or category to match the physical labeling route.
- Asset QR Scan is QR-first for printed labels. Serial Number entry supports QR and barcode capture. Audit Scan manual search supports Asset Tag, label, location, custodian, and department suggestions within the current round.
- Before enabling LDAP scheduled sync, confirm the default role, employee matching rules, and deactivation safety threshold with a real AD account.
- Scheduler jobs require their corresponding token only when that automation is enabled. Confirm PM, LDAP, and notification delivery policy before enabling timers.

## Verification Commands

```powershell
npm install
npx prisma generate
npm run lint
npm test
npm run build
npm run verify
```

Run `npm run verify` before a release. If build needs database access, use a controlled non-production database with the same SQL Server compatibility settings as the target environment.

## Documentation Maintenance

- Add concise operational facts and unresolved Go-live decisions here.
- Put detailed feature implementation, completed QA narration, and release chronology in `docs/99_CHANGELOG.md`.
- Update `docs/07_UAT_CHECKLIST.md`, `docs/08_PRODUCTION_READINESS.md`, and `docs/09_BACKUP_RESTORE_RUNBOOK.md` with named owners, dates, and evidence as work is completed.
- Refresh `docs/10_SECURITY_REVIEW.md` after a dependency or major API security review.
