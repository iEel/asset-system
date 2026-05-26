# Backup / Restore Runbook

Use this runbook for production backup planning, restore testing, and audit evidence collection.

## Scope

Back up and restore these parts together:

- SQL Server database
- Uploaded files, evidence, attachments, photos, and generated operational evidence under `UPLOAD_DIR`
- Environment file and deployment configuration
- Nginx, systemd, and Cloudflare Tunnel configuration
- Release commit SHA and deployment notes

## RTO / RPO

- RTO: `<DEFINE_RTO>`
- RPO: `<DEFINE_RPO>`

## Responsibility

- Backup owner: `<BACKUP_OWNER>`
- Restore approver: `<RESTORE_APPROVER>`
- Audit evidence reviewer: `<AUDIT_REVIEWER>`

## SQL Server Backup

Use the organization's SQL Server backup standard, such as SQL Server Management Studio, maintenance plan, `sqlcmd`, or a managed backup job.

Minimum evidence to keep:

- Backup job name
- Database name
- Backup start/end time
- Backup file or storage location
- Operator or service account
- Result status
- Checksum or integrity result if available

## Upload Directory Backup

Back up the configured `UPLOAD_DIR`, for example:

```bash
sudo tar -czf /var/backups/asset-system/uploads-$(date +%F).tar.gz /var/www/asset-system/uploads
```

Adjust the path to match production. Store backups in a location protected from accidental app deletion.

## Environment And Deployment Config Backup

Back up these securely:

- `/var/www/asset-system/env/asset-system.env`
- Nginx site config
- systemd service/timer files
- Cloudflare Tunnel config
- Current Git commit SHA

Do not store unencrypted secrets in a shared ticket or public repository.

## Restore Procedure

1. Confirm restore approval and target environment.
2. Stop the app and scheduler services.
3. Restore SQL Server database.
4. Restore upload directory.
5. Restore environment and deployment config.
6. Confirm file ownership and permissions.
7. Start the app service.
8. Start scheduler services/timers if enabled.
9. Run post-restore checks.

## Post-Restore Checklist

- [ ] Login works.
- [ ] Asset search works.
- [ ] Asset detail opens.
- [ ] Attachment preview/download works.
- [ ] QR scan opens the expected asset.
- [ ] Report export works.
- [ ] Audit round list opens.
- [ ] Maintenance list opens.
- [ ] Disposal list opens.
- [ ] System logs open.
- [ ] Scheduler health and last-run status are reviewed.

## Monthly Restore Test

- [ ] Restore latest backup to a test environment.
- [ ] Confirm database schema and app version match the release notes.
- [ ] Run smoke tests from the post-restore checklist.
- [ ] Record test date, operator, result, and evidence.
- [ ] Record corrective actions if restore fails or evidence is incomplete.

## Audit Evidence To Keep

- Backup logs
- Restore test logs
- Screenshots or exported evidence from post-restore checks
- Approval record for restore test or production restore
- Release commit SHA
- Exception notes and follow-up issue links
