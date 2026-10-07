# Authentication And RBAC

## Authentication Modes

The system supports local credentials login and optional LDAP/AD login through the same login screen. Local login remains available as fallback when LDAP is disabled or unavailable.

## LDAP / AD Login

- LDAP login reads settings saved in `system_settings` first, then falls back to environment variables.
- Username lookup uses `sAMAccountName` through the configured LDAP user filter.
- When a service bind account is configured, the app searches the user entry first, then binds as that user's DN with the submitted password.
- When `ldap_auto_provision` is enabled, the app creates a local `User` only after matching an active `Employee` by LDAP email or `employeeID`. The created user is linked to that employee through `employeeId`.
- `ldap_default_role` must name an existing active role such as `employee`; otherwise LDAP-authenticated users without an existing app user are rejected.
- In System Settings > AD/LDAP Login, the default role field is a searchable selector populated from active database roles. If the saved role key no longer exists, the UI keeps the saved value visible and warns the operator before saving.
- If LDAP authentication succeeds but auto-provision cannot find a matching active Employee, the login is rejected and the server logs the skipped provisioning reason. Keep Employee email and LDAP `employeeID` aligned with AD.

This employee link is required because SQL Server unique indexes do not allow multiple `NULL` values for `users.employeeId` in this schema. Creating unlinked LDAP users would collide with existing local users that have no employee link.

## Login Throttling And Session Refresh

- Failed logins are limited in memory (one production Node process): 5 failures per username (case-insensitive) or 20 failures per client IP within 15 minutes lock that key for 15 minutes. Locked attempts never reach the password check or the LDAP bind, so they cannot lock employees' AD accounts. The login form shows `auth.loginRateLimited` when Auth.js returns `code=rate_limited`. A successful login clears the username's counter. The client IP comes from `cf-connecting-ip`, then `x-real-ip`, then the first `x-forwarded-for` entry (`src/lib/login-rate-limit.ts`).
- JWT sessions last 8 hours, but the `jwt` callback re-reads the user's `isActive`, active roles and permissions at most every 60 seconds per user (`src/lib/session-access.ts`, `src/lib/session-access-cache.ts`). A deactivated or deleted user loses the session on the next refresh; role changes apply without logging out. Editing a user invalidates that user's cached access, editing a role invalidates everyone's. A transient database error keeps the current claims instead of logging everyone out.
- Roles with `isActive = false` grant no permissions, at login or on refresh.

## Secret Rules

- `AUTH_SECRET` and `NEXTAUTH_SECRET` must be strong production values, different per environment.
- Do not commit real secrets or session keys.
- Do not document real production admin credentials.
- Admin user APIs never load or return `passwordHash` (`src/lib/admin-user-response.ts`).
- `ldap_bind_password` is never sent to the browser: the settings API and page return `__STORED_SECRET__` when a value is stored. Saving that placeholder keeps the stored value; an empty value clears it. System Log snapshots of settings changes show `[REDACTED]` for secret keys (`src/lib/system-setting-secrets.ts`).

## Administrator Escalation Rules

Enforced server-side in `src/lib/admin-access-policy.ts` for `POST/PUT /api/admin/users` and `POST/PUT /api/admin/roles`:

- Only `system_admin` may grant the `system_admin` role.
- A non-`system_admin` actor cannot grant a role containing a permission they do not hold, cannot add such a permission to a role, and cannot edit or reset the password of a user whose access exceeds their own.
- The last active system administrator cannot be demoted or deactivated (`409`).
- Unknown or inactive roles are rejected (`400`).
- Only `system_admin` may change any `ldap_*` setting (scheduler status keys `ldap_sync_last_*` excepted), run `POST /api/admin/settings/ldap-test`, or apply an LDAP sync from the web. The LDAP test reuses the stored bind password only when the submitted URL and bind DN match the stored ones.

## Roles

Common production roles include:

- `system_admin`
- `asset_admin`
- `auditor`
- `audit_reviewer`
- `accounting`
- `department_manager`
- `employee`
- `viewer`

## Permission Model

Permissions follow the established `module:action` pattern, for example:

- `asset:view`
- `asset:create`
- `asset:edit`
- `asset:delete`
- `audit:approve`
- `maintenance:create`
- `disposal:approve`
- `setting:edit`

Transaction cancellation follows the existing permissions instead of adding a new permission key:

- `asset:edit` is required to cancel the latest eligible Check-out, Check-in, or Transfer.
- `asset:view` may read and print active or VOID operation documents but cannot cancel them.
- `setting:view` may view the Asset State Review/Data Quality queue; `setting:edit` is required to resolve or dismiss findings, including `transaction_cancellation_blocked` reviews.
- API authorization is enforced server-side even when the UI hides or disables an action.

## Dashboard Navigation And Unauthorized Pages

- Dashboard sidebar items declare required permissions and are filtered before rendering. Users should not see menu entries for modules they cannot access.
- The `system_admin` role bypasses sidebar filtering and keeps full navigation visibility.
- Page-level guards use `requirePagePermission()` and redirect unauthorized users to `/{locale}/access-denied?module=...&action=...`.
- The access denied page explains that the user has no permission and links back to Dashboard and Work Center. This is the fallback for direct URL entry or stale bookmarks.
- The topbar user menu reads the active session user for avatar initials, display name, and secondary email/username text.
- `/{locale}/my-assets` is an authenticated self-service page for linked employee users. It does not grant Asset Register access; it filters server-side to `assets.custodianId = session.user.employeeId` and attachment previews are limited to image evidence on those owned active assets.
- Default post-login routing is role-aware through `src/lib/default-home.ts`. Linked employee users with only self-service permissions land on `/{locale}/my-assets`; users with overview permissions such as asset, maintenance, audit, report, admin, or master-data view continue to land on `/{locale}/dashboard`. Direct `/dashboard` requests from self-service employee users redirect to My Assets before global dashboard metrics are queried.

## API Protection

Use these helpers consistently:

- `requireAuth()` for authenticated endpoints.
- `requirePermission(user, module, action)` for module/action authorization.
- `hasPermission(user, module, action)` when a route supports multiple permitted branches.
- Attachment download and preview must check the attachment module permission before serving content.
- Scheduler endpoints must use scheduler authorization tokens.
- Read-only external integration endpoints live under `/api/integrations/v1` and must use `requireIntegrationClient()` or `requireIntegrationScope()`. Integration clients authenticate with `Authorization: Bearer <token>` where the server stores only SHA-256 token hashes in `integration_api_clients`. Supported scopes start with `asset:read`, `reference:read`, and `integration:read`; do not reuse normal user sessions or scheduler tokens for partner/system API access.
- Integration API client lifecycle management lives in `Admin > Integration API` and `/api/admin/integration-clients`. Viewing clients requires `setting:view`; create, edit display name/scopes, rotate, disable, and enable require `setting:edit`. Plain tokens are returned once on create/rotate, while admin lists expose only `tokenPreview`. Scope expansion on an existing client requires confirmation because the current token can use the newly allowed endpoint immediately.

`GET /api/integrations/v1/health` verifies a token and returns the integration API version, authenticated `clientId`, scopes, and request ID.

Read-only Asset endpoints require `asset:read`:

- `GET /api/integrations/v1/assets`
- `GET /api/integrations/v1/assets/{assetTag}`
- `GET /api/integrations/v1/assets/changes?updatedSince=...`

The asset list supports bounded `limit`/`page` and filters such as `q`, `assetTag`, `serialNumber`, `employeeCode`, `companyCode`, `branchCode`, `locationCode`, `status`, and `condition`. The change feed requires `updatedSince`, orders by `updatedAt` and `id`, and returns a bounded `nextCursor` plus `highWaterMark` for incremental sync jobs. Responses use a stable DTO and intentionally omit purchase price, supplier, PO, invoice, attachments, photos, and other sensitive workflow evidence.

Read-only Reference endpoints require `reference:read`:

- `GET /api/integrations/v1/reference/statuses`
- `GET /api/integrations/v1/reference/companies`
- `GET /api/integrations/v1/reference/branches`
- `GET /api/integrations/v1/reference/locations`

Reference endpoints expose compact operational codes/names only. Branches can be filtered by `companyCode`; locations can be filtered by `companyCode` and `branchCode` to disambiguate repeated branch/location labels across companies.

Integration metadata endpoints require `integration:read`:

- `GET /api/integrations/v1/openapi`

Use `npm run integration:token -- --client-id <id> --scopes asset:read,reference:read,integration:read` only for controlled SQL recovery or troubleshooting. The normal workflow is `Admin > Integration API`; the script prints recovery data to the terminal only and does not write secrets to disk.

## Regression Coverage

The RBAC route matrix lives in `src/lib/rbac-route-matrix.ts` and should be kept in sync when API routes are added. Run:

```powershell
npm run verify
```

## LDAP / AD Sync Safety

- Start LDAP sync in preview mode. `npm run ldap:sync` previews by default; pass `-- --apply` to write changes.
- Review missing-from-AD users before applying deactivation.
- Set a scheduled deactivation threshold before enabling automatic sync.
- Assets assigned to users missing from AD should be returned, transferred, or reviewed before the linked employee/app user is deactivated.
