# Authentication And RBAC

## Authentication Modes

The system supports local credentials login and optional LDAP/AD login through the same login screen. Local login remains available as fallback when LDAP is disabled or unavailable.

## LDAP / AD Login

- LDAP login reads settings saved in `system_settings` first, then falls back to environment variables.
- Username lookup uses `sAMAccountName` through the configured LDAP user filter.
- When a service bind account is configured, the app searches the user entry first, then binds as that user's DN with the submitted password.
- When `ldap_auto_provision` is enabled, the app creates a local `User` only after matching an active `Employee` by LDAP email or `employeeID`. The created user is linked to that employee through `employeeId`.
- `ldap_default_role` must name an existing active role such as `employee`; otherwise LDAP-authenticated users without an existing app user are rejected.
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
