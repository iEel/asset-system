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

## Secret Rules

- `AUTH_SECRET` and `NEXTAUTH_SECRET` must be strong production values.
- Do not commit real secrets or session keys.
- Do not document real production admin credentials.

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
- Read-only external integration endpoints live under `/api/integrations/v1` and must use `requireIntegrationClient()` or `requireIntegrationScope()`. Integration clients authenticate with `Authorization: Bearer <token>` where the server stores only SHA-256 token hashes in `INTEGRATION_API_CLIENTS`. Supported scopes start with `asset:read`, `reference:read`, and `integration:read`; do not reuse normal user sessions or scheduler tokens for partner/system API access.

Example `INTEGRATION_API_CLIENTS` shape:

```json
[
  {
    "clientId": "erp-readonly",
    "name": "ERP Read-only",
    "tokenHash": "sha256-hex-placeholder",
    "scopes": ["asset:read", "reference:read", "integration:read"],
    "enabled": true
  }
]
```

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

Use `npm run integration:token -- --client-id <id> --scopes asset:read,reference:read,integration:read` to generate a plain token for the calling system and a SHA-256 hash for `INTEGRATION_API_CLIENTS`. The script prints secrets to the terminal only and does not write them to disk.

## Regression Coverage

The RBAC route matrix lives in `src/lib/rbac-route-matrix.ts` and should be kept in sync when API routes are added. Run:

```powershell
npm run verify
```

## LDAP / AD Sync Safety

- Start LDAP sync in preview mode.
- Review missing-from-AD users before applying deactivation.
- Set a scheduled deactivation threshold before enabling automatic sync.
- Assets assigned to users missing from AD should be returned, transferred, or reviewed before the linked employee/app user is deactivated.
