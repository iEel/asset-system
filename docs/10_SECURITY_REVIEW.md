# Security Review

Last reviewed: 2026-05-27

## Scope

- API route authentication and RBAC coverage
- Public route exceptions
- File upload validation and attachment access
- Path traversal protection for attachment download/preview
- Browser security headers and service worker headers
- Secrets, connection strings, and default credentials in committed docs
- Database user privilege recommendations
- Audit log coverage for sensitive actions
- Soft delete vs hard delete usage

## Verification Performed

- Reviewed API route inventory under `src/app/api`.
- Reviewed auth helper usage: `requireAuth`, `requirePermission`, `hasPermission`, scheduler token authorization, and attachment permission checks.
- Reviewed upload helper `src/lib/uploads.ts`.
- Reviewed attachment download route `src/app/api/attachments/[id]/route.ts`.
- Reviewed global security header policy in `next.config.ts` / `src/lib/security-headers.ts`.
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
| Medium | Asset lifecycle | Check-out now blocks Disposed, Retired, Pending Disposal, Under Maintenance, Lost, and Missing assets; normal transfer blocks Disposed, Retired, and Pending Disposal assets; maintenance close, disposal execution, generic asset edit, and status correction use tested lifecycle exception helpers. | Keep future status changes behind tested lifecycle policy helpers and preserve the controlled correction audit trail. | Implemented |
| Low | Uploads | Upload helper validates file size, MIME type, allowed file extension, and file content signature; saved uploads can optionally run through a server-side scanner hook. | Keep all new upload routes on `validateUploadFile`, `validateUploadFileContent`, and scanner cleanup where files are persisted. | Hardened |
| Low | Security headers | Global responses set MIME-sniffing, clickjacking, referrer, permissions-policy, and limited CSP headers; `/sw.js` has explicit JavaScript, no-store cache, and service-worker CSP headers. | Keep browser header policy centralized in `src/lib/security-headers.ts` and regression-tested before relaxing any directive. | Hardened |
| Low | Attachments | Attachment download/preview checks auth, module permission, active record, safe upload path, `X-Content-Type-Options: nosniff`, and private no-store caching. | Keep attachment access through the central route rather than direct public file serving. | Hardened |
| Low | Hard delete | Guarded test-data cleanup exists and requires explicit apply/confirmation/environment controls. | Keep hard delete limited to guarded cleanup tooling. | Accepted |

## Authentication And Authorization

- Auth.js callback/session endpoints are intentionally public entrypoints before app RBAC is available.
- Application API routes are classified through `src/lib/rbac-route-matrix.ts`.
- Critical routes are checked for expected `requireAuth` and permission snippets.
- Search and notification routes use authenticated user context and permission-aware filtering.
- Scheduler endpoints support bearer-token authorization for systemd-triggered work and require interactive admin permission otherwise.
- External system integration routes are isolated under `/api/integrations/v1` and use `requireIntegrationClient()` / `requireIntegrationScope()` instead of user sessions. Integration tokens are managed in `Admin > Integration API`, stored in `integration_api_clients` only as SHA-256 hashes plus non-secret previews, scoped to read-only capabilities, and logged through the audit trail with request IDs. Plain tokens are returned only in the one-time create/rotate response and must not appear in list/detail responses, audit logs, or committed files afterward. Client display-name/scope edits are audited with safe old/new values only, and adding scopes to an existing client requires confirmation because the existing token gains access immediately. Do not reuse scheduler tokens for this purpose.

## File Upload And Attachment Access

- `src/lib/uploads.ts` defines a 10 MB upload limit and allowed MIME types.
- Upload routes should call `validateUploadFile(file)` and `validateUploadFileContent(file)` before writing bytes.
- Saved upload routes should call `scanWrittenUploadFile(filePath)` after writing bytes so optional scanner failures remove the just-written file.
- `UPLOAD_SCAN_COMMAND` and optional `UPLOAD_SCAN_ARGS` can enable a ClamAV-compatible command-line scanner without changing application code.
- `/admin/readiness` reports whether the upload scanner is enabled, disabled, or misconfigured.
- File names are sanitized with `sanitizeFileName`.
- Upload paths are rooted under `UPLOAD_DIR`.
- Attachment download/preview calls `assertSafeUploadPath` before serving bytes.
- Attachment download/preview checks module-level permission before returning content.

## Browser Security Headers

- Global responses set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that keeps camera access available for same-origin scanner workflows while disabling microphone, geolocation, payment, USB, and browsing topics.
- Global CSP is intentionally limited to low-risk directives (`base-uri`, `form-action`, `frame-ancestors`, and `object-src`) so it hardens the app without breaking Next.js runtime scripts/styles.
- `/sw.js` receives explicit `Content-Type`, no-store cache control, and a strict service-worker CSP.

## Secrets And Credentials

- `.env*` files are ignored by Git.
- Committed docs must use placeholders such as `<DB_SERVER>`, `<DB_USER>`, `<DB_PASSWORD>`, and `<CHANGE_ME>`.
- Real production secrets must be stored in the server environment file or the organization's secret-management system.
- Do not document real production admin credentials in the repository.

## Database Privilege

Production should not use a broad SQL Server admin user. Use a dedicated application database user with least practical privileges for runtime operations. Schema-change operations should be separated from normal runtime credentials where organizational policy allows it.

## Audit Log Coverage

Sensitive data-changing workflows reviewed during previous implementation passes include audit logging for major actions such as asset operations, disposal, maintenance, admin settings, and readable system-log presentation. New routes that mutate business records should add audit logging as part of their acceptance criteria.

Read-only Integration API calls should also write summary audit records with client ID, route, status, request ID, query/target metadata, and bounded response counts. Never log Bearer tokens or large response payloads.

Integration asset DTOs should stay minimal. They may expose operational identifiers such as Asset Tag, Serial Number, status, condition, owner branch, current location, and current custodian code/name, but should not expose purchase price, supplier, PO, invoice, file attachments, photos, or accounting/depreciation details unless a future explicit scope and review are added.

Integration change-feed and reference endpoints are also read-only. Change-feed cursors should contain only sync position data (`updatedAt` and asset id), and reference endpoints should expose compact code/name metadata only. Keep incremental sync endpoints bounded by server-side `limit` caps and audit the request summary rather than payload contents.

The authenticated OpenAPI endpoint is intentionally behind `integration:read` instead of being public. Routine token lifecycle work uses the DB-backed admin UI for create, edit scopes, rotate, disable, and enable. Local token generation through `npm run integration:token` is recovery/troubleshooting tooling only: it prints a plain token, SHA-256 hash, token preview, and manual metadata, but must not write generated secrets into repository files.

Emergency Integration API access removal should disable the affected client in the UI or set `integration_api_clients.enabled = 0` through controlled SQL. If the deployed code is rolled back to a version that does not use this table, roll back the code before removing the table.

## Follow-Up Recommendations

- Keep asset lifecycle policy tests aligned with any new operational status, correction workflow, or privileged exception workflow.
- Keep upload-route regression tests covering oversize, disallowed MIME, spoofed-extension files, mismatched content signatures, and scanner hook wiring.
- Keep `tests/security-headers.test.ts` aligned with any future header policy changes.
- Add a scheduled security review checklist before major releases.
- Keep the RBAC route matrix test in `npm run verify`.
