# Production Readiness Checklist

Use this checklist before go-live, before a production schema change, and before handing the system to an operations team.

## Secrets And Environment

- [ ] `AUTH_SECRET` is set to a strong production value.
- [ ] `NEXTAUTH_SECRET` is set to the same strong value or a documented equivalent.
- [ ] Real `.env` files are not committed.
- [ ] Committed examples use placeholders only.
- [ ] Scheduler tokens are set if scheduler endpoints are enabled.
- [ ] `AUTH_URL` and `NEXTAUTH_URL` match the public application URL without an internal port.

## Authentication And Users

- [ ] Initial admin password has been changed.
- [ ] Production admin accounts are named users, not shared credentials.
- [ ] LDAP/AD settings are verified if enabled.
- [ ] LDAP/AD default auto-provision role is selected from an active role and not a stale role key.
- [ ] LDAP sync starts in preview/manual mode.
- [ ] LDAP scheduled sync safety threshold is configured before automatic deactivation is enabled.
- [ ] Restricted users do not see unauthorized sidebar menus, and direct restricted page URLs show the access denied page instead of a generic 404.
- [ ] Topbar avatar/name show the signed-in user identity for local and LDAP users.

## Database

- [ ] Database user is not `sa`.
- [ ] Database user uses least practical privileges.
- [ ] Production database backup completed before release.
- [ ] Restore test completed.
- [ ] Prisma schema and migration approach are documented.
- [ ] Production schema changes have an approved rollback or restore plan.
- [ ] `npm run migration:status` was run against the target database; deployment is blocked on `NOT_INITIALIZED` or any `checksum_mismatch` unless the approved change explicitly initializes the ledger first.
- [ ] The migration command output, operator, reason, target database, and release commit are attached to the change record. `--backup-confirmed` records operator attestation and does not take a backup automatically.
- [ ] Historical migration files were baselined only after their database effects were individually verified; no accepted migration file was edited to force its checksum to match.
- [ ] If the release includes `prisma/manual-migrations/*.sql`, each required script has been applied against Production after backup and approval through `npm run migration:apply -- <filename.sql> --backup-confirmed --reason "<approved change reason>"`. Historical scripts already present before ledger initialization are verified and baselined instead of re-executed.
- [x] For `asset_management`, `2026-07-13-add-disposal-evidence-exception.sql` is recorded as applied. For another target database, require a fresh verified backup and apply it through `migration:apply` instead of executing the SQL directly.
- [ ] Generate Prisma Client and manually verify one approved historical disposal request without attachments plus one normal approved request with evidence on the deployment target.
- [x] For `asset_management`, `2026-08-27-add-asset-state-governance.sql` and `2026-08-27-keep-under-inspection-operational.sql` are recorded as applied, and the production rescan did not rewrite asset status/condition/update snapshots.
- [ ] Generate Prisma Client and verify `asset_state_reviews`, `disposal_requests.previousAssetStatusId`, active `Not Assessed`, active operational `Under Inspection`, and the filtered pending-review unique index on the deployment target.
- [x] For `asset_management`, `2026-08-27-add-reversible-asset-transactions.sql` was applied on 2026-08-28 with checksum prefix `53f0d2d5bd11`; schema verification found all expected columns, `asset_transfers`, six indexes, its foreign key, and no duplicate active Check-in.
- [ ] Complete the reversible-transaction UAT cases after Prisma generation/deployment; migration application alone does not mark workflow acceptance as passed.

## Uploads And Evidence

- [ ] Upload directory exists.
- [ ] Upload directory is writable by the app service account.
- [ ] Upload directory is included in backup.
- [ ] Upload malware scanner is either intentionally disabled or configured with a working command, `{file}` argument template, and positive timeout.
- [ ] `/admin/readiness` scanner status is reviewed after changing `UPLOAD_SCAN_COMMAND`, `UPLOAD_SCAN_ARGS`, or `UPLOAD_SCAN_TIMEOUT_MS`.
- [ ] Attachment preview/download works after restore.
- [ ] Storage governance check has been reviewed for missing/orphan files.

### Storage Governance Archive

The Admin Storage Governance page can archive orphan files one at a time. Archive moves the file from `UPLOAD_DIR/<relativePath>` to `UPLOAD_DIR/.archive/YYYY-MM-DD/<relativePath>` and does not delete it. The API re-checks that no active `Attachment` row references the file before moving it, and writes a `storage_archive_orphan_file` audit log entry with the source and archive paths.

To restore a file, move it from `.archive/YYYY-MM-DD/<relativePath>` back to `UPLOAD_DIR/<relativePath>`, then refresh the Storage Governance page.

## Application

- [ ] `npm run verify` passes.
- [ ] `npm run build` passes.
- [ ] Dashboard pages show a single vertical scrollbar: content scrolls inside the app `<main>` area, and the browser document does not show a second page scrollbar.
- [ ] Slow authenticated pages show a meaningful skeleton fallback instead of a blank/stalled transition. Confirm `/dashboard`, `/assets`, `/assets/{id}`, and `/reports` render their route-specific `loading.tsx` skeletons during slow local testing, and reuse `src/components/ui/page-skeleton.tsx` for additional high-latency routes.
- [ ] If diagnosing slow menu/page navigation, enable `PERFORMANCE_TIMING=1` or `PERFORMANCE_LOGGING=1`, review `[performance]` server log lines for the slow route labels, then disable the flag after the investigation. Dashboard emits both the full `dashboard.initial-data` duration and subgroup labels (`dashboard.kpi-counts`, `dashboard.recent-activity`, `dashboard.urgent-work`, `dashboard.approval-inbox`, `dashboard.cross-scope`, `dashboard.monthly-trends`) so the slow Dashboard query group can be isolated before optimizing.
- [ ] Browser security headers are present for app routes and `/sw.js`.
- [ ] Public QR Base URL is configured before printing labels.
- [ ] RBAC route matrix test passes.
- [ ] UAT checklist is completed by role.
- [ ] PDF export with Thai fonts is verified on the production-like host.

## Workflows

- [ ] Asset create, batch create, import, export, and QR label print are tested.
- [ ] Check-out, check-in, and transfer are tested with evidence.
- [ ] Latest-transaction cancellation is tested for Check-out, Check-in, and Transfer with `asset:edit`, including exact snapshot restoration, component restoration, compensating Movement/System Log, VOID document metadata/watermark, and Check-in reopening its related Check-out.
- [ ] Cancellation blockers are tested for downstream work, stale state, non-latest transactions, and legacy snapshot-less documents; confirm master data is unchanged and `transaction_cancellation_blocked` appears in Asset State Review. Confirm an `asset:view` user can read/print VOID documents but cannot cancel.
- [ ] Asset State Review scan/list/resolve/dismiss is tested with `setting:view` and `setting:edit`, including stale-snapshot rejection, 10-character reasons, movement/audit history, and confirmation that scans/dismissals never change asset state.
- [ ] Audit round create, scan, findings review, and close-round flow are tested.
- [ ] Maintenance ticket and PM plan workflows are tested.
- [ ] Disposal queue/create/detail, approval, execution, rejection, evidence retry, and 2-100 item batch workflows are tested.
- [ ] Disposal asset search is server-bounded (minimum two characters, maximum 50 results), does not preload the Asset Register, and has been load-tested with production-like asset volume.
- [ ] Disposal policy uses `disposal:approve` for decisions and `disposal:edit` for execution; requester/creator self-approval and approver execution are blocked when SOD is enabled.
- [ ] Concurrent single/batch disposal creation has been tested to confirm conditional status claims prevent duplicate open requests and bounded unique-number retries do not leave partial records.
- [ ] `workflow_approval_min_approvers` is set to `1` for this release. The current disposal record stores one approval decision; do not configure multi-approver disposal until an approval-record model is implemented.
- [ ] Disposal type-specific evidence/document/value requirements and Pending Disposal/Disposed/Retired lifecycle targets are verified with production-like master data in both English and Thai.
- [ ] Historical disposal evidence exceptions are limited to `system_admin`; normal executors are blocked, item/shared-batch evidence rejects exception mode, reason plus acknowledgement are recorded, completed detail/print visibility is confirmed, and the disposal audit log has been inspected. Bulk exception mode is visible only when every selected approved request has zero effective evidence.
- [ ] Approved-queue bulk execution has passed desktop/mobile/keyboard UAT for the 20-item and same-type limits, locked preview snapshot, per-request values, SOD/RBAC/evidence revalidation, independent serializable commits, partial results, stable unresolved retry, navigation discard guard, and Bangkok execution date.
- [ ] Disposal readiness blockers have been UAT-tested for checkout, maintenance, audit/finding, component, and license relations; blocked assets remain visible with reasons and direct API submission is rejected.
- [ ] Disposal batch history/workspace, single shared evidence storage, independent child approval/execution, type-aware dialogs, and the 390px primary mobile workflow action have passed role-based UAT.
- [ ] Reports and exports are tested with realistic data.

## Deployment

- [ ] Nginx reverse proxy is configured.
- [ ] Cloudflare Tunnel points to Nginx, not directly to Next.js unless intentionally documented.
- [ ] systemd app service is enabled and running.
- [ ] scheduler service/timer is enabled if automatic PM/LDAP sync is used.
- [ ] Log locations are documented.
- [ ] Backup path is documented.
- [ ] Rollback plan is documented and tested.

## Deployment Documentation Coverage

- [ ] Node.js version is documented.
- [ ] Dependency installation command is documented.
- [ ] `npx prisma generate` is documented.
- [ ] Environment variables are documented with placeholders only.
- [ ] SQL Server connection guidance is documented.
- [ ] Upload directory setup and backup are documented.
- [ ] Nginx and Cloudflare Tunnel routing are documented.
- [ ] systemd app service is documented.
- [ ] scheduler service/timer is documented.
- [ ] Log inspection commands are documented.
- [ ] Backup/restore runbook is linked.
- [ ] Rollback/update steps are documented.

## Sign-Off

| Area | Owner | Date | Evidence / Notes |
|---|---|---|---|
| Application verification | `<OWNER>` |  |  |
| UAT | `<OWNER>` |  |  |
| Security review | `<OWNER>` |  |  |
| Backup / restore | `<OWNER>` |  |  |
| Deployment | `<OWNER>` |  |  |

## Pending Handover Migration Gate

- [ ] Run `npm run verify`, `npx tsc --noEmit`, and `git diff --check` on the release commit.
- [ ] Confirm `npm run migration:status` reports the prior 11 migrations applied, no checksum mismatch, and `2026-08-31-add-checkout-handover-mode.sql` pending (`37874f3a6a43`).
- [ ] Create and verify a fresh database backup with a documented restore path.
- [ ] Obtain explicit approval for the exact two-record backfill scope.
- [ ] Apply the migration, rerun status, verify both records/postconditions, then complete Handover Mode UAT. Until then, do not mark this gate complete.
