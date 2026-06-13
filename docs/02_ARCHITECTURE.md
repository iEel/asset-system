# Architecture

## Application Runtime

- Next.js 16.2.4 App Router with standalone output.
- React 19, TypeScript 5, Tailwind CSS 4.
- SQL Server through Prisma 7, `@prisma/adapter-mssql`, and `tedious`.
- Auth.js / NextAuth credentials flow with optional LDAP/AD support.
- Thai and English routes through `next-intl`.

## Route Structure

- `src/app/[locale]/(dashboard)` contains authenticated pages.
- `src/app/[locale]/(auth)/login` contains login UI.
- `src/app/api/**/route.ts` contains API endpoints.
- `src/middleware.ts` handles locale routing.

## Dashboard Layout And Scroll Ownership

- The authenticated dashboard layout in `src/app/[locale]/(dashboard)/layout.tsx` loads the current session user server-side, redirects unauthenticated users to login, and passes the user into `src/components/layout/dashboard-shell.tsx`.
- `DashboardShell` is the client shell for sidebar, topbar, and content state; it is fixed to the viewport with `fixed inset-0`.
- The dashboard `<main>` area is the vertical scroll owner through `overflow-y-auto`.
- The browser document should not become a second vertical scroll owner on dashboard pages.
- Hash-anchor navigation inside dashboard pages should scroll the `<main>` container, not the outer fixed shell. `DashboardShell` resets accidental outer-shell scroll and then scrolls the target section inside `<main>` so shortcuts such as Asset Detail `#notes` and `#audit` do not leave a blank tail area pinned in the viewport.
- Sidebar navigation may scroll inside its own nav container when the menu is taller than the viewport.
- Sidebar navigation is filtered with `src/lib/navigation-permissions.ts` before rendering so users do not see menu items they cannot open.

## Loading UI And Streaming

- Authenticated dashboard routes use Next.js App Router `loading.tsx` boundaries for page-level fallback UI while server data resolves.
- `src/app/[locale]/(dashboard)/loading.tsx` is the generic authenticated-shell fallback. Route-specific fallbacks currently exist for `src/app/[locale]/(dashboard)/dashboard/loading.tsx` and `src/app/[locale]/(dashboard)/assets/loading.tsx`.
- Shared loading shapes live in `src/components/ui/page-skeleton.tsx`. Reuse `PageSkeleton`, `DashboardPageSkeleton`, or `AssetRegisterPageSkeleton` before introducing new one-off loading UI.
- Loading UI should match the final page structure with muted cards, filters, and table/list rows. Keep spinner-only loading for small button/search/upload actions.
- `loading.tsx` is below the same route segment layout, so runtime data fetched inside a layout can still block before the fallback is visible. Keep heavy route-specific data fetching in pages or nested server components where the loading boundary can cover it.

## API Protection Pattern

API routes should use the established helpers from `src/lib/auth-utils.ts`:

- `requireAuth()` for authenticated access.
- `requirePermission(user, module, action)` for RBAC-protected actions.
- Custom helpers such as attachment permission and scheduler authorization where needed.

The route inventory and expected RBAC snippets are tracked in `src/lib/rbac-route-matrix.ts` and covered by tests.

## Background Jobs

Background work is driven by scripts and scheduler endpoints rather than embedded long-running web requests:

- `npm run scheduler:heartbeat` checks web-configured schedules for PM and LDAP sync.
- `npm run pm:generate-due` and `npm run pm:generate-due:scheduled` generate due PM tickets.
- `npm run ldap:sync` and `npm run ldap:sync:scheduled` run LDAP sync.
- `npm run notifications:digest` generates daily notification digests.

Production deployment should run these through systemd service/timer units documented in the deployment guide.
Cron schedules stored in app settings are interpreted in `Asia/Bangkok` time; the systemd timer only wakes the heartbeat.

## Storage Boundaries

- Source code lives in the app directory.
- Runtime env files live outside the repository path and are not committed.
- Uploaded files, evidence, photos, and attachments live under `UPLOAD_DIR`.
- `UPLOAD_DIR` must be writable by the app service account and included in backup.

## Deployment Boundary

The recommended production path is Ubuntu + Nginx + Cloudflare Tunnel:

- Cloudflare Tunnel publishes the public hostname.
- Nginx listens locally and forwards to Next.js standalone.
- Next.js listens on `127.0.0.1:3000`.
- Public app URL must not include the internal app port.
