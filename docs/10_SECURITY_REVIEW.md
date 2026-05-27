# Security Review

Last reviewed: 2026-05-26

## Scope

- API route authentication and RBAC coverage
- Public route exceptions
- File upload validation and attachment access
- Path traversal protection for attachment download/preview
- Secrets, connection strings, and default credentials in committed docs
- Database user privilege recommendations
- Audit log coverage for sensitive actions
- Soft delete vs hard delete usage

## Verification Performed

- Reviewed API route inventory under `src/app/api`.
- Reviewed auth helper usage: `requireAuth`, `requirePermission`, `hasPermission`, scheduler token authorization, and attachment permission checks.
- Reviewed upload helper `src/lib/uploads.ts`.
- Reviewed attachment download route `src/app/api/attachments/[id]/route.ts`.
- Ran focused RBAC route matrix test:

```powershell
node --test tests\rbac-route-matrix.test.ts
```

Result: 3 tests passed.

## Risk Summary

| Risk | Area | Finding | Recommendation | Status |
|---|---|---|---|---|
| High | Documentation | Production-like infrastructure values and default admin password references were present in tracked documentation before this readiness pass. | Keep placeholders only and never commit real `.env` values or production admin credentials. | Fixed in documentation cleanup |
| Medium | Database | Setup docs still need a controlled production migration policy because `prisma db push` is used for Dev/Test flows. | Use backup, change approval, rollback/restore plan, and versioned schema-change record before Production schema changes. | Documented |
| Medium | Asset lifecycle | Check-out now blocks Disposed, Retired, Pending Disposal, Under Maintenance, Lost, and Missing assets; normal transfer blocks Disposed, Retired, and Pending Disposal assets. | Keep future status changes behind tested lifecycle policy helpers. | Implemented |
| Low | Uploads | Upload helper validates file size, MIME type, and allowed file extension; upload routes reviewed use shared validation or image-specific validation. | Keep all new upload routes on `validateUploadFile` or a stricter module-specific validator. | Hardened |
| Low | Attachments | Attachment download/preview checks auth, module permission, active record, and safe upload path. | Keep attachment access through the central route rather than direct public file serving. | Accepted |
| Low | Hard delete | Guarded test-data cleanup exists and requires explicit apply/confirmation/environment controls. | Keep hard delete limited to guarded cleanup tooling. | Accepted |

## Authentication And Authorization

- Auth.js callback/session endpoints are intentionally public entrypoints before app RBAC is available.
- Application API routes are classified through `src/lib/rbac-route-matrix.ts`.
- Critical routes are checked for expected `requireAuth` and permission snippets.
- Search and notification routes use authenticated user context and permission-aware filtering.
- Scheduler endpoints support bearer-token authorization for systemd-triggered work and require interactive admin permission otherwise.

## File Upload And Attachment Access

- `src/lib/uploads.ts` defines a 10 MB upload limit and allowed MIME types.
- Upload routes should call `validateUploadFile(file)` before reading/writing bytes.
- File names are sanitized with `sanitizeFileName`.
- Upload paths are rooted under `UPLOAD_DIR`.
- Attachment download/preview calls `assertSafeUploadPath` before serving bytes.
- Attachment download/preview checks module-level permission before returning content.

## Secrets And Credentials

- `.env*` files are ignored by Git.
- Committed docs must use placeholders such as `<DB_SERVER>`, `<DB_USER>`, `<DB_PASSWORD>`, and `<CHANGE_ME>`.
- Real production secrets must be stored in the server environment file or the organization's secret-management system.
- Do not document real production admin credentials in the repository.

## Database Privilege

Production should not use a broad SQL Server admin user. Use a dedicated application database user with least practical privileges for runtime operations. Schema-change operations should be separated from normal runtime credentials where organizational policy allows it.

## Audit Log Coverage

Sensitive data-changing workflows reviewed during previous implementation passes include audit logging for major actions such as asset operations, disposal, maintenance, admin settings, and readable system-log presentation. New routes that mutate business records should add audit logging as part of their acceptance criteria.

## Follow-Up Recommendations

- Keep asset lifecycle policy tests aligned with any new operational status or privileged exception workflow.
- Keep upload-route regression tests covering oversize, disallowed MIME, and spoofed-extension files.
- Add a scheduled security review checklist before major releases.
- Keep the RBAC route matrix test in `npm run verify`.
