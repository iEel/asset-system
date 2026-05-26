# Production Readiness Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Asset Management System repository for developer handoff and production readiness without rewriting existing workflows or changing business logic.

**Architecture:** This is a documentation, security review, and operational-readiness cleanup. The plan keeps `DEVELOPER_HANDOFF.md` as a short entry point, moves long-form details into `docs/`, sanitizes committed infrastructure values, and adds checklists/runbooks that production operators and new developers can follow.

**Tech Stack:** Next.js 16, TypeScript, Prisma with SQL Server, Auth.js, RBAC route matrix tests, systemd scheduler scripts, Ubuntu + Nginx + Cloudflare Tunnel deployment.

---

## File Structure

**Modify**
- `DEVELOPER_HANDOFF.md` - shorten to an entry-point handoff, remove sensitive infrastructure values, link to detailed docs.
- `README.md` - sanitize local setup examples, remove/default-protect admin password references, add production caution links.
- `DEPLOYMENT_UBUNTU_CLOUDFLARE.md` - sanitize internal server values, strengthen migration/backup/scheduler sections.

**Create**
- `docs/01_OVERVIEW.md` - product/system overview for new developers.
- `docs/02_ARCHITECTURE.md` - app architecture, route areas, background jobs, upload/storage boundaries.
- `docs/03_DATABASE.md` - Prisma/SQL Server schema overview, migration policy, data safety notes.
- `docs/04_AUTH_RBAC.md` - auth modes, roles, permission model, protected route strategy.
- `docs/05_ASSET_LIFECYCLE.md` - asset status lifecycle and transition rules.
- `docs/06_WORKFLOWS.md` - major business workflows already implemented.
- `docs/07_UAT_CHECKLIST.md` - role-based UAT scenarios.
- `docs/08_PRODUCTION_READINESS.md` - go-live readiness checklist.
- `docs/09_BACKUP_RESTORE_RUNBOOK.md` - backup/restore procedures and monthly restore test.
- `docs/10_SECURITY_REVIEW.md` - security review findings and recommendations.
- `docs/99_CHANGELOG.md` - moved development history from `DEVELOPER_HANDOFF.md`.

**Reference During Execution**
- `package.json`
- `prisma/schema.prisma`
- `src/lib/rbac-route-matrix.ts`
- `src/lib/asset-status-flow.ts`
- `src/app/api/**/route.ts`
- `scripts/cleanup-test-data.mjs`
- `tests/rbac-route-matrix.test.ts`

---

## Execution Order

### Task 1: Repository Safety Baseline And Sensitive Data Inventory

**Files:**
- Read: `DEVELOPER_HANDOFF.md`
- Read: `README.md`
- Read: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`
- Read: `.gitignore`
- Read: `package.json`

- [ ] **Step 1: Confirm working tree before edits**

Run:

```powershell
git status --short
```

Expected: understand any existing user changes before editing. Do not revert unrelated changes.

- [ ] **Step 2: Confirm `.env` is ignored and not tracked**

Run:

```powershell
git ls-files .env .env.local .env.production
```

Expected: no real `.env` files listed.

Run:

```powershell
Select-String -Path .gitignore -Pattern '^\.env\*'
```

Expected: `.env*` is ignored.

- [ ] **Step 3: Scan committed docs for sensitive values**

Run:

```powershell
rg -n "<DEFAULT_ADMIN_PASSWORD>|DB_SERVER|DB_INSTANCE|DB_USER|DB_PASSWORD|DATABASE_URL|AUTH_SECRET|NEXTAUTH_SECRET|SQL Server|sa|192\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|WIN-" DEVELOPER_HANDOFF.md README.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md
```

Expected: list of locations to sanitize. Do not copy passwords into notes, commit messages, or final summaries.

- [ ] **Step 4: Commit nothing yet**

No code/docs changes in this task. This task produces the edit list for Task 2.

---

### Task 2: Sanitize Tracked Documentation

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `README.md`
- Modify: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`

- [ ] **Step 1: Replace internal infrastructure values with placeholders**

Use these replacements consistently:

```text
<DB_SERVER>
<DB_INSTANCE>
<DB_PORT>
<DB_NAME>
<DB_USER>
<DB_PASSWORD>
<DB_TLS_SERVER_NAME>
<INTERNAL_HOSTNAME>
<PUBLIC_APP_URL>
<CHANGE_ME>
```

- [ ] **Step 2: Replace production-like env examples**

Use safe examples:

```env
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3000
WEB_PORT=3000
NEXT_PUBLIC_APP_NAME="Asset Management System"

AUTH_URL=https://<PUBLIC_APP_URL>
NEXTAUTH_URL=https://<PUBLIC_APP_URL>
AUTH_TRUST_HOST=true
AUTH_SECRET=<CHANGE_ME>
NEXTAUTH_SECRET=<CHANGE_ME>

UPLOAD_DIR=/var/www/asset-system/uploads

DB_SERVER=<DB_SERVER>
DB_INSTANCE=<DB_INSTANCE>
DB_PORT=1433
DB_TLS_SERVER_NAME=<DB_TLS_SERVER_NAME>
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DATABASE_URL="sqlserver://<DB_SERVER>;instanceName=<DB_INSTANCE>;port=1433;database=<DB_NAME>;user=<DB_USER>;password=<DB_PASSWORD>;encrypt=true;trustServerCertificate=true"
```

- [ ] **Step 3: Replace default admin password references**

Use this wording:

```markdown
For local seed/testing only, create an initial admin account and immediately change the password before any shared or production use. Do not document real production admin credentials in this repository.
```

- [ ] **Step 4: Re-scan after sanitizing**

Run:

```powershell
rg -n "<DEFAULT_ADMIN_PASSWORD>|DB_PASSWORD=.+[^<]|DATABASE_URL=.*password=[^<]|192\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|WIN-" DEVELOPER_HANDOFF.md README.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md
```

Expected: no real credentials or internal infrastructure values. Local loopback values like `127.0.0.1` are acceptable.

- [ ] **Step 5: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md README.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md
git commit -m "Sanitize production handoff documentation"
git push origin master
```

---

### Task 3: Split Developer Handoff Into Focused Docs

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Create: `docs/01_OVERVIEW.md`
- Create: `docs/02_ARCHITECTURE.md`
- Create: `docs/03_DATABASE.md`
- Create: `docs/04_AUTH_RBAC.md`
- Create: `docs/06_WORKFLOWS.md`
- Create: `docs/99_CHANGELOG.md`

- [ ] **Step 1: Make `DEVELOPER_HANDOFF.md` a short entry point**

Keep these sections only:

```markdown
# Developer Handoff

## Start Here
- Read `README.md`
- Read `docs/01_OVERVIEW.md`
- Read `docs/08_PRODUCTION_READINESS.md`
- Read `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`

## Current Production Readiness Status
- Sensitive values must stay out of committed docs.
- `.env` files are ignored and must be managed per environment.
- Run `npm run verify` and `npm run build` before release.

## Key Documents
- `docs/01_OVERVIEW.md`
- `docs/02_ARCHITECTURE.md`
- `docs/03_DATABASE.md`
- `docs/04_AUTH_RBAC.md`
- `docs/05_ASSET_LIFECYCLE.md`
- `docs/06_WORKFLOWS.md`
- `docs/07_UAT_CHECKLIST.md`
- `docs/08_PRODUCTION_READINESS.md`
- `docs/09_BACKUP_RESTORE_RUNBOOK.md`
- `docs/10_SECURITY_REVIEW.md`
- `docs/99_CHANGELOG.md`

## Verification Commands
```powershell
npm install
npx prisma generate
npm run verify
npm run build
```
```

- [ ] **Step 2: Move long historical entries**

Move development-history/changelog style sections from `DEVELOPER_HANDOFF.md` into:

```text
docs/99_CHANGELOG.md
```

Keep chronology but remove any credentials or internal infrastructure values.

- [ ] **Step 3: Create overview and architecture docs**

`docs/01_OVERVIEW.md` should cover:

```markdown
# Overview

## Purpose
Asset Management System for asset registration, ownership, movement, audit counting, maintenance, disposal, reporting, and administration.

## Primary Users
- system_admin
- asset_admin / IT staff
- auditor
- audit_reviewer
- accounting
- department_manager
- employee
- viewer

## Core Modules
- Dashboard
- Asset Register
- Scan / Search Asset
- Label Printing
- Check-out / Check-in / Transfer
- Audit Counting
- Maintenance / Preventive Maintenance
- Disposal
- Reports
- Master Data
- Admin Settings / Logs
```

`docs/02_ARCHITECTURE.md` should cover app structure, API route patterns, background scripts, uploads, and deployment boundaries.

- [ ] **Step 4: Create database/auth/workflow docs**

`docs/03_DATABASE.md` should summarize Prisma + SQL Server and migration policy.

`docs/04_AUTH_RBAC.md` should summarize Auth.js, local credentials, LDAP/AD, RBAC, and route matrix tests.

`docs/06_WORKFLOWS.md` should summarize the existing workflows without changing them.

- [ ] **Step 5: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md docs/01_OVERVIEW.md docs/02_ARCHITECTURE.md docs/03_DATABASE.md docs/04_AUTH_RBAC.md docs/06_WORKFLOWS.md docs/99_CHANGELOG.md
git commit -m "Restructure developer handoff documentation"
git push origin master
```

---

### Task 4: Production Readiness Checklist

**Files:**
- Create: `docs/08_PRODUCTION_READINESS.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Create checklist document**

Create `docs/08_PRODUCTION_READINESS.md` with this checklist:

```markdown
# Production Readiness Checklist

## Secrets And Environment
- [ ] `AUTH_SECRET` is set to a strong value.
- [ ] `NEXTAUTH_SECRET` is set to the same strong value or documented equivalent.
- [ ] No production `.env` file is committed.
- [ ] `.env.example` or deployment docs use placeholders only.
- [ ] Scheduler tokens are set if scheduler endpoints are enabled.

## Authentication And Users
- [ ] Initial admin password has been changed.
- [ ] Production admin accounts are named users, not shared credentials.
- [ ] LDAP/AD settings are verified if enabled.
- [ ] LDAP sync safety threshold is configured before scheduled sync.

## Database
- [ ] Database user is not `sa`.
- [ ] Database user has least practical privileges.
- [ ] Production database backup completed before release.
- [ ] Restore test completed.
- [ ] Prisma schema and migration approach are documented.

## Uploads And Evidence
- [ ] Upload directory exists.
- [ ] Upload directory is writable by the app service account.
- [ ] Upload directory is included in backup.
- [ ] Attachment preview/download works after restore.

## Application
- [ ] `npm run verify` passes.
- [ ] `npm run build` passes.
- [ ] Public QR Base URL is configured.
- [ ] RBAC route matrix test passes.
- [ ] UAT checklist is completed by role.

## Deployment
- [ ] Nginx reverse proxy is configured.
- [ ] Cloudflare Tunnel points to Nginx, not directly to Next.js unless intentionally documented.
- [ ] systemd service is enabled and running.
- [ ] scheduler service/timer is enabled if automatic PM/LDAP sync is used.
- [ ] Rollback plan is documented and tested.
```

- [ ] **Step 2: Link from handoff**

Add a link to `docs/08_PRODUCTION_READINESS.md` in `DEVELOPER_HANDOFF.md`.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md docs/08_PRODUCTION_READINESS.md
git commit -m "Add production readiness checklist"
git push origin master
```

---

### Task 5: Role-Based UAT Checklist

**Files:**
- Create: `docs/07_UAT_CHECKLIST.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Create UAT checklist by role**

Create `docs/07_UAT_CHECKLIST.md` with role sections:

```markdown
# UAT Checklist

## system_admin
- [ ] Login successfully.
- [ ] Open Admin Settings.
- [ ] Update safe non-secret settings.
- [ ] Review system logs.
- [ ] Confirm unauthorized role cannot access admin menus.

## asset_admin / IT staff
- [ ] Add a single asset.
- [ ] Add assets by batch.
- [ ] Import assets from Excel.
- [ ] Export asset register.
- [ ] Print QR label.
- [ ] Scan QR and open asset detail.
- [ ] Check-out asset.
- [ ] Check-in asset.
- [ ] Transfer asset.

## auditor
- [ ] Create or open assigned audit round.
- [ ] Scan asset in audit round.
- [ ] Record found / not found status.
- [ ] Attach evidence if required.

## audit_reviewer
- [ ] Review audit findings.
- [ ] Approve or resolve findings.
- [ ] Close audit round.

## accounting
- [ ] Review depreciation/accounting data.
- [ ] Export reports.
- [ ] Review disposal request details.

## department_manager
- [ ] View department assets.
- [ ] Review assets held by team members.
- [ ] Confirm restricted menus are hidden.

## employee
- [ ] View own assigned assets.
- [ ] Confirm no access to admin-only actions.

## viewer
- [ ] Search and view permitted asset data.
- [ ] Confirm write actions are not available.
```

- [ ] **Step 2: Add negative RBAC scenario**

Add:

```markdown
## RBAC Negative Tests
- [ ] A user without maintenance permission cannot create/close maintenance jobs.
- [ ] A user without disposal permission cannot approve disposal.
- [ ] A user without audit permission cannot close audit rounds.
- [ ] A user without admin permission cannot access system settings or logs.
- [ ] Direct API access returns unauthorized/forbidden for restricted actions.
```

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md docs/07_UAT_CHECKLIST.md
git commit -m "Add role based UAT checklist"
git push origin master
```

---

### Task 6: Asset Lifecycle Documentation

**Files:**
- Create: `docs/05_ASSET_LIFECYCLE.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Review current status helpers and API routes**

Run:

```powershell
rg -n "Pending Disposal|Disposed|Retired|Under Maintenance|Checked Out|Ready|checkin|checkout|transfer" src prisma tests
```

Expected: identify actual status names and route enforcement points.

- [ ] **Step 2: Create lifecycle matrix**

Create `docs/05_ASSET_LIFECYCLE.md` with:

```markdown
# Asset Lifecycle

## Main Statuses
- Draft
- Ready
- Checked Out / In Use
- Under Maintenance
- Pending Repair
- Pending Disposal
- Disposed
- Retired
- Lost / Not Found

## Allowed Transitions
| From | To | Trigger |
| --- | --- | --- |
| Draft | Ready | Asset registration completed |
| Ready | Checked Out / In Use | Check-out / handover |
| Checked Out / In Use | Ready | Check-in / return |
| Checked Out / In Use | Pending Repair | Return with repair needed |
| Checked Out / In Use | Pending Disposal | Return with disposal request |
| Ready | Under Maintenance | Maintenance job started |
| Under Maintenance | Ready | Maintenance job closed |
| Under Maintenance | Pending Disposal | Maintenance result requires disposal |
| Ready | Pending Disposal | Disposal request |
| Pending Disposal | Disposed | Disposal completed |
| Pending Disposal | Retired | Retirement completed |

## API Validation Rules
- Disposed assets must not be checked out.
- Retired assets must not be checked out.
- Pending Disposal assets must not be transferred without explicit privileged workflow.
- Under Maintenance assets must not be checked out.
- Already checked-out assets must not be checked out again.
- Closed audit/disposal statuses should be excluded from default audit target selection.
```

- [ ] **Step 3: Mark validation gaps as recommendations only**

If a rule is not enforced in code, document it under:

```markdown
## Validation Recommendations
```

Do not change API behavior in this task unless the change is very small and covered by tests.

- [ ] **Step 4: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md docs/05_ASSET_LIFECYCLE.md
git commit -m "Document asset lifecycle rules"
git push origin master
```

---

### Task 7: Database Migration Policy

**Files:**
- Modify: `docs/03_DATABASE.md`
- Modify: `README.md`
- Modify: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`

- [ ] **Step 1: Locate current Prisma commands**

Run:

```powershell
rg -n "prisma db push|prisma migrate|prisma generate" README.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md DEVELOPER_HANDOFF.md docs
```

- [ ] **Step 2: Add production warning**

Add this warning anywhere `prisma db push` is used for setup:

```markdown
> Production warning: `npx prisma db push` is suitable for local development and controlled test environments. For Production, use a reviewed migration process with a database backup, rollback plan, and versioned schema-change record. Do not change the Production schema without a verified backup and approval.
```

- [ ] **Step 3: Document current policy**

In `docs/03_DATABASE.md`, add:

```markdown
## Migration Policy
- Development/Test may use `npx prisma db push` when rebuilding or aligning a non-production database.
- Production schema changes require a backup before deployment.
- Production schema changes require an approved change record.
- Production schema changes require a rollback plan or a tested restore procedure.
- Do not assume Prisma migrate support until it is validated against this project's SQL Server setup.
```

- [ ] **Step 4: Commit and push**

Run:

```powershell
git add README.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md docs/03_DATABASE.md
git commit -m "Document production database migration policy"
git push origin master
```

---

### Task 8: Security Review Document

**Files:**
- Create: `docs/10_SECURITY_REVIEW.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Inventory API routes**

Run:

```powershell
rg --files src/app/api | Sort-Object
```

- [ ] **Step 2: Review auth and permission coverage**

Run:

```powershell
rg -n "requireAuth|requirePermission|hasPermission|isSchedulerAuthorized|requireAttachmentPermission" src/app/api src/lib
```

- [ ] **Step 3: Run RBAC route matrix test**

Run:

```powershell
npm run verify -- --run tests/rbac-route-matrix.test.ts
```

If the command format is not supported by the test runner, run:

```powershell
npm run verify
```

- [ ] **Step 4: Create security review**

Create `docs/10_SECURITY_REVIEW.md` with:

```markdown
# Security Review

## Scope
- API route authentication
- RBAC permission coverage
- Public route exceptions
- File upload and attachment access
- Path traversal protection
- Default credentials in documentation/seed data
- Secrets and connection strings in repository
- Database user privilege recommendations
- Audit log coverage for sensitive actions
- Soft delete vs hard delete usage

## Risk Levels
- Critical
- High
- Medium
- Low

## Findings
| Risk | Area | Finding | Recommendation | Status |
| --- | --- | --- | --- | --- |
| High | Documentation | Production-like infrastructure values were present in tracked docs before sanitization. | Keep placeholders only and never commit real `.env`. | Fixed / verify in Task 2 |
| Medium | Database | `prisma db push` appears in setup docs. | Document Dev/Test-only use and require backup/rollback for Production. | Fixed / verify in Task 7 |
| Medium | Uploads | Server-side file type/size validation should be verified route by route. | Confirm every upload API validates type, size, and path. | Recommendation |
| Low | Hard delete | Guarded cleanup script exists for test data cleanup. | Keep destructive cleanup guarded by explicit confirmation. | Accepted |

## Verification Commands
```powershell
npm run verify
npm run build
```
```

- [ ] **Step 5: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md docs/10_SECURITY_REVIEW.md
git commit -m "Add security review documentation"
git push origin master
```

---

### Task 9: Backup And Restore Runbook

**Files:**
- Create: `docs/09_BACKUP_RESTORE_RUNBOOK.md`
- Modify: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Create runbook**

Create `docs/09_BACKUP_RESTORE_RUNBOOK.md` with:

```markdown
# Backup / Restore Runbook

## Scope
- SQL Server database
- Uploaded files, evidence, attachments, QR/label assets if stored on disk
- Environment file and deployment config
- Nginx/systemd/cloudflared config

## RTO / RPO
- RTO: <DEFINE_RTO>
- RPO: <DEFINE_RPO>

## Responsibility
- Backup owner: <BACKUP_OWNER>
- Restore approver: <RESTORE_APPROVER>
- Audit evidence reviewer: <AUDIT_REVIEWER>

## Backup Checklist
- [ ] SQL Server database backup completed.
- [ ] Upload directory backup completed.
- [ ] `.env` and deployment config backup completed in secure storage.
- [ ] Backup logs captured.
- [ ] Backup checksum or integrity check completed.

## Restore Checklist
- [ ] Restore database to target environment.
- [ ] Restore upload directory.
- [ ] Restore secure environment config.
- [ ] Restart app service.
- [ ] Restart scheduler service/timer if enabled.
- [ ] Verify login.
- [ ] Verify asset search.
- [ ] Verify attachment preview/download.
- [ ] Verify report export.
- [ ] Verify QR scan opens correct asset.

## Monthly Restore Test
- [ ] Restore latest backup to a test environment.
- [ ] Run smoke tests.
- [ ] Record test date, operator, result, and evidence.
```

- [ ] **Step 2: Link from deployment guide**

Add a short section:

```markdown
## Backup / Restore
See `docs/09_BACKUP_RESTORE_RUNBOOK.md` for the operational runbook and monthly restore test checklist.
```

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add DEVELOPER_HANDOFF.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md docs/09_BACKUP_RESTORE_RUNBOOK.md
git commit -m "Add backup restore runbook"
git push origin master
```

---

### Task 10: Deployment Documentation Final Pass

**Files:**
- Modify: `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`
- Modify: `docs/08_PRODUCTION_READINESS.md`

- [ ] **Step 1: Check deployment guide coverage**

Confirm it covers:

```text
Node.js version
npm install / npm ci
npx prisma generate
environment variables
SQL Server connection
upload directory
Nginx / Cloudflare Tunnel
systemd app service
systemd scheduler service/timer
log locations
backup path
rollback steps
```

- [ ] **Step 2: Add missing sections only**

Do not rewrite the guide. Add missing headings and link to existing sections where possible.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add DEPLOYMENT_UBUNTU_CLOUDFLARE.md docs/08_PRODUCTION_READINESS.md
git commit -m "Complete deployment readiness documentation"
git push origin master
```

---

### Task 11: Final Verification And Summary

**Files:**
- Read: changed docs
- Read: `package.json`

- [ ] **Step 1: Run documentation-sensitive scans**

Run:

```powershell
rg -n "<DEFAULT_ADMIN_PASSWORD>|DB_PASSWORD=.+[^<]|DATABASE_URL=.*password=[^<]|192\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|WIN-" DEVELOPER_HANDOFF.md README.md DEPLOYMENT_UBUNTU_CLOUDFLARE.md docs
```

Expected: no real credentials or internal infrastructure values. Placeholder values are acceptable.

- [ ] **Step 2: Run project verification**

Run:

```powershell
npm run verify
npm run build
```

Expected: both pass.

- [ ] **Step 3: Final git status**

Run:

```powershell
git status --short
```

Expected: clean working tree after final commit/push.

- [ ] **Step 4: Final response in Thai**

Include:

```markdown
- ไฟล์ที่แก้ไข
- ไฟล์ที่สร้างใหม่
- Sensitive information ที่ถูกลบหรือแทนด้วย placeholder
- Security risks ที่พบ
- สิ่งที่แก้ไขแล้ว
- สิ่งที่ยังต้องให้คนตัดสินใจ
- คำสั่งตรวจสอบ: npm install, npx prisma generate, npm run verify, npm run build
```

---

## Recommended Commit Sequence

1. `Sanitize production handoff documentation`
2. `Restructure developer handoff documentation`
3. `Add production readiness checklist`
4. `Add role based UAT checklist`
5. `Document asset lifecycle rules`
6. `Document production database migration policy`
7. `Add security review documentation`
8. `Add backup restore runbook`
9. `Complete deployment readiness documentation`

---

## Self-Review

- Spec coverage: all requested areas are covered by Tasks 1-11.
- Sensitive data handling: Task 2 is first because it reduces repo risk before creating new docs.
- Business logic safety: no workflow rewrite is planned; API behavior changes are explicitly avoided unless low-risk and separately tested.
- Production readiness: checklist, UAT, backup/restore, migration policy, security review, and deployment documentation are separated for easy review.
- Commit strategy: each topic has its own commit/push boundary, matching the user's preferred workflow.
