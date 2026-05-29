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
