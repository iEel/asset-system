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
- [ ] LDAP sync starts in preview/manual mode.
- [ ] LDAP scheduled sync safety threshold is configured before automatic deactivation is enabled.

## Database

- [ ] Database user is not `sa`.
- [ ] Database user uses least practical privileges.
- [ ] Production database backup completed before release.
- [ ] Restore test completed.
- [ ] Prisma schema and migration approach are documented.
- [ ] Production schema changes have an approved rollback or restore plan.

## Uploads And Evidence

- [ ] Upload directory exists.
- [ ] Upload directory is writable by the app service account.
- [ ] Upload directory is included in backup.
- [ ] Upload malware scanner is either intentionally disabled or configured with a working command, `{file}` argument template, and positive timeout.
- [ ] `/admin/readiness` scanner status is reviewed after changing `UPLOAD_SCAN_COMMAND`, `UPLOAD_SCAN_ARGS`, or `UPLOAD_SCAN_TIMEOUT_MS`.
- [ ] Attachment preview/download works after restore.
- [ ] Storage governance check has been reviewed for missing/orphan files.

## Application

- [ ] `npm run verify` passes.
- [ ] `npm run build` passes.
- [ ] Browser security headers are present for app routes and `/sw.js`.
- [ ] Public QR Base URL is configured before printing labels.
- [ ] RBAC route matrix test passes.
- [ ] UAT checklist is completed by role.
- [ ] PDF export with Thai fonts is verified on the production-like host.

## Workflows

- [ ] Asset create, batch create, import, export, and QR label print are tested.
- [ ] Check-out, check-in, and transfer are tested with evidence.
- [ ] Audit round create, scan, findings review, and close-round flow are tested.
- [ ] Maintenance ticket and PM plan workflows are tested.
- [ ] Disposal approval and execution workflows are tested.
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
