# Authentication And RBAC

## Authentication Modes

The system supports local credentials login and optional LDAP/AD login through the same login screen. Local login remains available as fallback when LDAP is disabled or unavailable.

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
