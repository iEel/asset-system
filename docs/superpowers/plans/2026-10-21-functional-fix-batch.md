# Functional Fix Batch (19 critique bugs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 19 bugs from the 2026-10-19/20 UI critiques where the app does or says the wrong thing (wrong counts, wrong links, wrong rules, wrong copy, unreachable records), before the E2E suite's full run (E2E plan Task 51).

**Architecture:** Each fix is the smallest change that removes the defect: a shared rule or helper where two places disagree, a real database count where a capped list was counted, and copy through the messages script. Layout and styling do not change; the 13 purely visual bugs from the same critiques wait for the design-canvas rebuild.

**Tech Stack:** Next.js 16.4 App Router, React 19, next-intl, Prisma 7 + SQL Server, node --test unit tests (TypeScript, source-reading tests strip `\r`), Playwright E2E.

**Spec:** the bug sections of `.impeccable/critique/2026-10-20-remaining-pages.md` and the P0/P1 findings of `.impeccable/critique/2026-10-19T15-18-57Z__src-app-locale-dashboard-dashboard-page-tsx.md`, plus the code reading of every bug in `.superpowers/sdd/2026-10-21-functional-fix-batch/recon/*.md` (one file per area: current lines, exact copy tables, the tests that pin today's code). The recon files are the binding source for line numbers and for the copy tables this plan names; where a recon file offers options, this plan's rulings below win.

## Global Constraints

- Branch `feat/e2e-suite` (HEAD `f93693ab` when this plan was written). Never push. Never touch `.env*`. Never write to any database; never run the E2E suite (the controller runs it in E2E Task 51).
- No layout or styling change: no new classes, no moved sections, except where a task names one.
- Thai copy follows `docs/19_THAI_GLOSSARY.md`; `tests/thai-glossary.test.ts` must stay green.
- `messages/th.json` and `messages/en.json` change only through `node scripts/messages-edit.mjs <changes.json>` run from the repo root, with the change file in the session scratchpad: `{ "set": { "th": { "ns.key": "…" }, "en": { "ns.key": "…" } }, "delete": ["ns.key"] }` (a delete applies to both locales and throws on a missing key). th and en always change together (`tests/messages-parity.test.ts`).
- Keep each file's line endings (the tree mixes CRLF and LF, `autocrlf=true`). Tests that read source strip `\r`.
- One commit per task unless the task says otherwise, message `fix(<area>): <what a person now sees> (critique 2026-10-20 <ids>)`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- After every task: `npm test` (0 fail), `npx tsc --noEmit -p .` (clean), `npm run lint` (0 errors; warnings stay about 146).

## Rulings (the recon's open choices, decided here)

1. A1: "ใช้งานอยู่" counts status In Use only (equal to the register's tab), not Ready, not Checked Out.
2. A2: a dashboard or work-center link opens the register exactly (no restore of the saved view, and it does not overwrite it); the sidebar's "ทะเบียนทรัพย์สิน" keeps restoring. The "assets created" trend links to the register sorted newest first.
3. A3: one shared rule decides "รับคืน" and "ส่งมอบ" on both the register and the asset page, and it follows what the server accepts (a permanent handover returns from In Use; a loan from Checked Out; a legacy return needs Ready or In Use, a custodian, no open checkout, no open repair). The checkout flag applies to every ownership branch of the asset page; check-in and transfer to the personal branch.
4. B1: copy only; the export's 5,000-row cap stays (noted in the report for the user).
5. B2: the labels search reuses `assetTools.scanPlaceholder`.
6. B3: the section heading is "ที่ตั้งและสถานะ".
7. C1: every count of the approval inbox is a database count; `/admin/approvals` may show a tab count larger than its capped list (a "showing N of M" line waits for the redesign).
8. C2: every link to the work center (my assets, access denied, dashboard, notifications, the bell) shows only with `dashboard:view`; access denied's main button goes to the person's home page.
9. C3: `notifications.approvalInboxDetail` takes the work center's wording.
10. D3: one set of disposal status names everywhere: รอพิจารณา · อนุมัติแล้ว รอตัดจำหน่าย · ตัดจำหน่ายแล้ว · ไม่อนุมัติ (en: Pending decision · Approved, awaiting disposal · Disposed · Not approved). The queue names follow in the same task (second commit). The status filter stays.
11. E1: "ไม่ใช้งาน" works as a recycle bin: a status filter (ใช้งาน default · ไม่ใช้งาน · ทั้งหมด) on all seven lists and the brand navigator, the badge reads the real value, inactive records open and save (ticking "ใช้งาน" brings them back), "ลบ" is hidden on inactive rows, and unticking "ใช้งาน" is refused (409) whenever "ลบ" would be.
12. E2: the location type labels are the recon's table (`recon/master-data.md`, "E2"), Area = บริเวณ.
13. F1: env-only checks show a fix line naming the variables and "ไฟล์ env ของเซิร์ฟเวอร์"; `schedulerRuns` links to the automation tab.
14. F2: a summary lists only the keys the new value carries; the larger "one plain sentence" rewrite waits for the redesign.

## Review Focus

1. An asset whose status name is missing from the database (renamed or not seeded): the dashboard must still render, its count 0 and its link still opening the register exactly. Test in Task 1.
2. A signed-out person opening a deep link with a query string and a `_rsc` request: the login keeps `path?query` and drops `_rsc`; a crafted header pointing off-site or to another locale yields the bare login. Test in Task 4.
3. A master-data record that is inactive AND referenced (e.g. a location holding assets) being ticked "ใช้งาน" again: the save must succeed (reactivation is never blocked); only deactivation is guarded. Test in Task 9.
4. An audit-log value that is a date-only ISO string versus a midnight UTC timestamp versus a real timestamp: date-only and midnight show as a date, a real time as date-time, and a plain text that merely starts with digits stays as typed. Test in Task 12.
5. More than 50 pending disposal requests: the work center's number equals the notifications' number. Test in Task 6 (pure count).

---

### Task 1: The dashboard counts statuses by exact name (A1)

**Files:**
- Modify: `src/lib/dashboard-action-cards.ts` (`buildDashboardAssetStatusMetrics`, about :59)
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx:89-108, 176-177, 313-314`
- Test: `tests/dashboard-asset-status.test.ts`

**Interfaces:**
- Produces: `export const dashboardAssetStatusNames = ["Ready", "In Use", "Pending Repair", "Under Maintenance"] as const`; `buildDashboardAssetStatusMetrics(locale, rows)` returns `{ ready, inUse, pendingRepair, underMaintenance }`, each `{ count: number; href: string }`, found by `row.name === <exact>`. Task 2 changes the hrefs.

- [ ] **Step 1: Write the failing tests** in `tests/dashboard-asset-status.test.ts`: "the dashboard In Use count is In Use only; Ready never leaks in" (`rows [{ id: "r", name: "Ready", count: 5 }, { id: "u", name: "In Use", count: 7 }]` → `inUse.count 7`, `ready.count 5`); "dashboard status names are the register's tab names" (each name is some `assetRegisterStatusTabs[].statusName`); "a missing status counts 0" (rows `[]` → every count 0); "the dashboard counts statuses by exact name, never contains" (page source does not match `/contains: "(In Use|Ready|ใช้งาน|พร้อม)"/`). Update the two existing `deepEqual`s (:13-16, :20-23) to the four keys.
- [ ] **Step 2: Run** `node --test tests/dashboard-asset-status.test.ts` — expect the new tests FAIL (`inUse` undefined / the `contains` match).
- [ ] **Step 3: Implement.** In the page, drop the two `prisma.asset.count` calls with `contains`; load the four statuses with `name: { in: [...dashboardAssetStatusNames] }`; take `inUse` and `ready` from the metrics.
- [ ] **Step 4: Run** the file, then `npm test`, `npx tsc --noEmit -p .` — PASS.
- [ ] **Step 5: Commit** `fix(dashboard): "ใช้งานอยู่" counts In Use only, not Ready as well (critique 2026-10-19 P0)`.

### Task 2: Dashboard and work-center links open the register exactly (A2)

**Files:**
- Modify: `src/lib/asset-register-view-memory.ts`, `src/components/assets/asset-register-view-memory.tsx:24-36`
- Modify: `src/lib/dashboard-action-cards.ts` (hrefs, incl. the missing-status fallback :70), `src/app/[locale]/(dashboard)/dashboard/page.tsx` (:175, :176, :177, :180, :271, :313-314, `buildDashboardCrossScopeHref` :501-503), `src/app/[locale]/(dashboard)/work-center/page.tsx:246, 254, 262`, `src/lib/notification-summary-items.ts:77`
- Test: `tests/asset-register-view-memory.test.ts`, `tests/asset-register-ux.test.ts`, `tests/dashboard-asset-status.test.ts`

**Interfaces:**
- Consumes: Task 1's metrics.
- Produces: `export const assetRegisterExactLinkParam = "exact"`; `export function isExactAssetRegisterLink(params: URLSearchParams): boolean` (`exact === "1"`); `export function buildExactAssetRegisterHref(locale: string, params?: Record<string, string>): string` (params first, then `exact=1`).

- [ ] **Step 1: Write the failing tests:** in `asset-register-view-memory.test.ts` "an exact link is recognised and built with the flag" with the recon's five assertions (`recon/dashboard-register-login.md`, A2 Tests), e.g. `buildExactAssetRegisterHref("th", { dataQuality: "warranty" }) === "/th/assets?dataQuality=warranty&exact=1"` and `getPersistedAssetRegisterView(new URLSearchParams("exact=1&search=a")).toString() === "search=a"`; in `asset-register-ux.test.ts` the component matches `/if \(isExactAssetRegisterLink\(current\)\) return[\s\S]*hasExplicitAssetRegisterView\(current\)/`; a source test that the dashboard page, the work-center page and `notification-summary-items.ts` contain no register href without `exact` (no match for ``/`\/\$\{locale\}\/assets`/`` nor `/assets?dataQuality=` built without the helper). Update the hrefs in `dashboard-asset-status.test.ts` (they gain `&exact=1`; the missing-status case is `/en/assets?exact=1`).
- [ ] **Step 2: Run** the three files — FAIL (helpers not exported).
- [ ] **Step 3: Implement.** The flag check is the first line of the component's first effect (no restore, no save). `getPersistedAssetRegisterView` drops `exact`. Every listed link uses `buildExactAssetRegisterHref`; the trend link is `buildExactAssetRegisterHref(locale, { sort: "createdAt", direction: "desc" })` (check the register's real sort param names in `src/lib/asset-list-query.ts` and use those); the warranty link `{ dataQuality: "warranty" }`. The sidebar link is unchanged.
- [ ] **Step 4: Run** the files, `npm test`, tsc — PASS.
- [ ] **Step 5: Commit** `fix(dashboard): a number's link opens the register showing that number, not the person's last saved search (critique 2026-10-19 P1)`.

### Task 3: One rule for "รับคืน" and "ส่งมอบ" on the register and the asset page (A3)

**Files:**
- Modify: `src/lib/asset-lifecycle-policy.ts` (`filterLegacyReturnEligibleAssets` :162-173), `src/lib/asset-operation-policy.ts:64-73` (`getAssetRegisterTransactionActions`)
- Modify: `src/app/[locale]/(dashboard)/assets/page.tsx:186-191, 206, 279`, `src/app/[locale]/(dashboard)/assets/[id]/page.tsx` (:701, :720, :774-776, `getOwnershipLifecycle` :1613, branches :1680-1750)
- Test: `tests/asset-register-transactions.test.ts`, a new source test in the same file

**Interfaces:**
- Produces: `export function isLegacyReturnEligible(input: { statusName?: string | null; custodianId?: string | null; hasOpenCheckout: boolean; hasActiveMaintenance: boolean }): boolean` (used by `filterLegacyReturnEligibleAssets`); `getAssetRegisterTransactionActions` gains the input `openCheckoutHandoverMode: string | null` and decides a return against an open checkout with `getCheckinHandoverStatusError(openCheckoutHandoverMode, statusName) === null`.

- [ ] **Step 1: Write the failing tests:** add `openCheckoutHandoverMode` to every existing call (the Checked Out case at :58-68 passes `"temporary_loan"`); add "In Use with a permanent handover offers รับคืน against it" (`{ statusName: "In Use", custodianId: "e1", openCheckoutId: "c1", openCheckoutHandoverMode: "permanent_assignment", hasActiveMaintenance: false, canEdit: true }` → `[1]` deep-equals `{ action: "checkin", enabled: true, mode: "open_checkout" }`; the same with `"temporary_loan"` → `enabled false`); "isLegacyReturnEligible agrees with the check-in picker" (for every candidate of `tests/asset-operation-options.test.ts:28-34`, the function equals membership in `filterLegacyReturnEligibleAssets`); "the asset page asks the register's rule" (detail source matches `/getAssetRegisterTransactionActions\(/`, does not match `/disabled: !activeCheckout/`).
- [ ] **Step 2: Run** `node --test tests/asset-register-transactions.test.ts` — FAIL.
- [ ] **Step 3: Implement.** The register selects `handoverMode` with the open checkout and passes it. The asset page computes the actions once from `asset.status.name`, `asset.custodianId`, the active checkout (id and handover mode), `openMaintenanceCount > 0` and `canEditAsset`; `checkinHref` is the legacy check-in URL (`/${locale}/asset-management/checkin?assetId=…`) for `mode "legacy_return"`, today's `?checkoutId=` URL for `"open_checkout"`, else the handover section; the checkout flag disables "ส่งมอบ" in every ownership branch, check-in and transfer in the personal branch.
- [ ] **Step 4: Run** the file, `tests/legacy-checkin-flow.test.ts`, `npm test`, tsc — PASS. `e2e/transactions/return.spec.ts:36-37` (permanent handover → "รับคืน" → `/checkin?checkoutId=`) must still hold by reading: say so in the report.
- [ ] **Step 5: Commit** `fix(assets): the register and the asset page offer the same return and handover, the ones the server accepts (critique 2026-10-19 P1)`.

### Task 4: Signing in returns to the page asked for (A4)

**Files:**
- Create: `src/lib/login-redirect.ts` (no `@/` imports: the proxy loads it)
- Modify: `src/proxy.ts`, `src/lib/page-auth.ts:13`, `src/app/[locale]/(dashboard)/layout.tsx:26`, `src/app/[locale]/(dashboard)/admin/approvals/page.tsx:35`, `src/app/[locale]/(dashboard)/admin/approvals/history/page.tsx:48`
- Test: `tests/login-redirect.test.ts`, new `tests/login-deep-link.test.ts`

**Interfaces:**
- Produces: `export const requestPathHeader = "x-asset-request-path"`; `export function buildRequestPath(url: URL): string` (pathname + search without `_rsc`); `export function buildLoginHref(locale: string, requestPath: string | null | undefined): string` (bare `/${locale}/login` when the normalized target is the locale root or the login page itself, else `?callbackUrl=`); in `page-auth.ts` `export async function redirectToLogin(locale: string): Promise<never>`.

- [ ] **Step 1: Write the failing tests:** append the recon's test "the login link keeps the page asked for, and only a safe one" (`recon/dashboard-register-login.md`, A4 Tests: `/th/assets/a1?view=custody` → `/th/login?callbackUrl=%2Fth%2Fassets%2Fa1%3Fview%3Dcustody`; `null`, `/th`, a login URL, `//evil.test/th/a`, `/en/assets` → `/th/login`; `_rsc` dropped); new `login-deep-link.test.ts`: the proxy sets the header with `buildRequestPath(request.nextUrl)` (overwriting any value the client sent), and none of the four redirect sites matches ``/redirect\(`\/\$\{locale\}\/login`\)/`` while each matches `/redirectToLogin\(locale\)/`.
- [ ] **Step 2: Run** both files — FAIL.
- [ ] **Step 3: Implement.** `buildLoginHref` uses the existing `normalizeLoginCallbackUrl` (find its module) for the safety check. The proxy wraps the next-intl middleware: copy the headers, set the header, hand a new `NextRequest` to the i18n handler; `config` unchanged. Leave `[locale]/page.tsx` as is.
- [ ] **Step 4: Run** the files, `npm test`, tsc — PASS. Then the controller's live check (not the implementer's): signed out, `/th/assets/<id>` lands on `/th/login?callbackUrl=%2Fth%2Fassets%2F<id>` and signing in returns there.
- [ ] **Step 5: Commit** `fix(auth): a signed-out deep link signs in and returns to the page asked for (critique 2026-10-19 P1)`.

### Task 5: Asset tools say what they do (B1, B2, B3)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx:59`, `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx:140`, `src/components/assets/asset-form.tsx:1235, 1522, 1524`, messages
- Test: `tests/assets-sweep-ui.test.ts`, `tests/asset-label-print-ui.test.ts`, `tests/asset-forms-ui.test.ts`, `tests/file-evidence-ui.test.ts:177`

- [ ] **Step 1: Write the failing tests** exactly as the recon gives them (`recon/asset-tools.md`): B1 "import-export: the unfiltered export is named export all…", B2 "the label search placeholder names only what the asset search finds…", B3 "asset form: the location section is named for what it holds…"; replace `file-evidence-ui.test.ts:177` with the recon's two assertions.
- [ ] **Step 2: Run** the four files — FAIL.
- [ ] **Step 3: Implement.** Messages (one change file): set `assetTools.exportAll` "ส่งออกทั้งหมด (Excel)" / "Export all (Excel)", `assetTools.exportWithFilters` "เลือกตัวกรองในทะเบียนแล้วส่งออก" / "Filter in the register, then export", `asset.locationStatus` "ที่ตั้งและสถานะ" / "Location & Status", `asset.assetPhotosEditHelp` (the recon's th/en text); delete `asset.locationCustodian`. Code: card 2 title `tTools("exportAll")`; labels `searchPlaceholder: t("scanPlaceholder")`; the form's location section `t("locationStatus")`, photo section `t(isEdit ? "assetPhotos" : "initialAssetPhotos")` and help `t(isEdit ? "assetPhotosEditHelp" : "initialAssetPhotosHelp")`. `asset.exportFiltered` stays (the register's export menu uses it correctly).
- [ ] **Step 4: Run** the files, `npm test`, tsc — PASS.
- [ ] **Step 5: Commit** `fix(asset-tools): the export, label search and asset form headings say what they do (critique 2026-10-20 B1, B2, B3)`.

### Task 6: The approval inbox counts every waiting item (C1)

**Files:**
- Modify: `src/lib/approval-inbox.ts:113-118`, `src/lib/approval-inbox-query.ts:33, 45, 78, 82-105`
- Test: `tests/approval-inbox.test.ts` (:4 import, :58)

**Interfaces:**
- Produces: `export type ApprovalInboxCountParts = { disposal: number; auditFindings: number; auditRoundsReady: number }`; `export function buildApprovalInboxCounts(parts: ApprovalInboxCountParts): { total: number; disposal: number; audit: number }` (audit = findings + rounds ready). `summarizeApprovalInbox` is deleted. In the query module, one private `countApprovalInbox(user, access, policy)` feeds both `getApprovalInboxCounts` and `getApprovalInboxSnapshot().summary`.

- [ ] **Step 1: Write the failing tests:** "approval inbox counts are the full counts, not the capped rows" (`{ disposal: 60, auditFindings: 12, auditRoundsReady: 1 }` → `{ total: 73, disposal: 60, audit: 13 }`; all zero → zeros); "the snapshot's summary and the counts share one database count" (query source has no `summarizeApprovalInbox` or `items.length`, two calls `countApprovalInbox(user, access, policy)`, and `return buildApprovalInboxCounts({ disposal, auditFindings, auditRoundsReady })`). Update :4 and drop :58.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** as the Interfaces say; the list queries keep their caps.
- [ ] **Step 4: Run** the file, `tests/audit-round-cancellation.test.ts`, `npm test`, tsc — PASS.
- [ ] **Step 5: Commit** `fix(work-center): "งานรออนุมัติ" counts every waiting item, the same number as the notifications (critique 2026-10-20 C1)`.

### Task 7: No link leads a person to a page they cannot open (C2, C3)

**Files:**
- Modify: `src/app/[locale]/(dashboard)/my-assets/page.tsx:134-138`, `src/app/[locale]/(dashboard)/access-denied/page.tsx:36-41`, `src/app/[locale]/(dashboard)/dashboard/page.tsx:335`, `src/app/[locale]/(dashboard)/notifications/page.tsx:59`, `src/components/layout/topbar.tsx:224`, messages
- Test: `tests/permission-aware-navigation.test.ts`, `tests/list-pages-ui.test.ts:783`, `tests/approval-inbox.test.ts`

- [ ] **Step 1: Write the failing tests:** in `permission-aware-navigation.test.ts` "every work-center link needs dashboard:view, and access denied goes home": the five sources guard the link (server pages with `hasPermission(user, "dashboard", "view")`, the topbar with `hasNavigationPermission` from `src/lib/navigation-permissions.ts`); access denied matches `/getDefaultHomeHref\(locale, user\)/` and `{t("backHome")}` on the `homeHref` link and no `backDashboard`; both locales have `accessDeniedPage.backHome` (th "กลับหน้าแรก", en "Back to Home") and no `backDashboard`; `getDefaultHomeHref("th", { roles: ["employee"], permissions: [], employeeId: "emp-1" }) === "/th/my-assets"`. In `approval-inbox.test.ts` the recon's C3 test (`notifications.approvalInboxDetail` equals `workCenter.approvalInboxDetail` in both locales and has no ซ่อม/maintenance). Replace `list-pages-ui.test.ts:783` with the `homeHref` form.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Messages: set `accessDeniedPage.backHome`, set `notifications.approvalInboxDetail` to th "คิวรวมจากตัดจำหน่ายและตรวจนับ" / en "Central queue across disposal and audit approvals", set `accessDeniedPage.openWorkCenter` to "เปิดศูนย์งานค้าง" / keep en; delete `accessDeniedPage.backDashboard`. Access denied reads the session user (`getSessionUser`); signed out it keeps `/${locale}/dashboard` as the home link.
- [ ] **Step 4: Run** the files, `npm test`, tsc — PASS. Note for the report: the E2E IT staff, IT head and viewer roles have no `dashboard:view`, so they no longer see "เปิดศูนย์งานค้าง" on the dashboard (no spec clicks it; checked with `grep -rn "work-center\|ศูนย์งาน" e2e`).
- [ ] **Step 5: Commit** `fix(navigation): the work center is offered only to people who can open it, and access denied leads home (critique 2026-10-20 C2, C3)`.

### Task 8: Maintenance and disposal say the right thing (D1, D2, D3, D4, D5)

**Files:**
- Modify: `src/components/maintenance/maintenance-plan-form.tsx:126`, `src/app/[locale]/(dashboard)/maintenance/page.tsx:79-91, 164, ~195`, `src/app/[locale]/(dashboard)/disposal/page.tsx:202-207`, `src/app/[locale]/(dashboard)/work-center/page.tsx:554`, `src/app/[locale]/(dashboard)/disposal/batches/page.tsx:99`, `src/components/disposal/disposal-batch-form.tsx:192, 205`, messages
- Modify (E2E): `e2e/disposal/single-request.spec.ts:61, 99`, `e2e/disposal/batch-bulk-approval.spec.ts:127, 144`, `e2e/disposal/open-audit-block.spec.ts:88`
- Test: `tests/pm-plans-ui.test.ts`, `tests/maintenance-sweep-ui.test.ts:59`, `tests/disposal-sweep-ui.test.ts`, `tests/disposal-forms-ux.test.ts:13`, `tests/v-track2-d.test.ts:188`, `tests/e2e-disposal.test.ts`

- [ ] **Step 1: Write the failing tests** as the recon gives them (`recon/maintenance-disposal.md`): D1 "an edited PM plan says it was saved, not created", D2 "PM due box counts every due plan and says how many more" (and `:59` becomes `formatCount\(dueTotal\)`), D3 "one set of disposal status names" (with `deepEqual(th.disposalPage.statuses, { pending: "รอพิจารณา", approved: "อนุมัติแล้ว รอตัดจำหน่าย", disposed: "ตัดจำหน่ายแล้ว", rejected: "ไม่อนุมัติ" })`, no `stages`, no `workCenter.disposalStatus_*`), D4 batch column `t("batchNo")` and th "เลขที่ชุด", D5 `formSteps.batchAssets` and `<Field label={t("disposalType")} required>` with a `required` NativeSelect (update `disposal-forms-ux.test.ts:13` and `v-track2-d.test.ts:188`). In `tests/e2e-disposal.test.ts` add a pin that the three specs read "รอพิจารณา" and "อนุมัติแล้ว รอตัดจำหน่าย" and none reads `getByText("รออนุมัติ")`.
- [ ] **Step 2: Run** the files — FAIL.
- [ ] **Step 3: Implement** the recon's fixes with its one change file (`recon/maintenance-disposal.md`, top), plus `disposalPage.subtitle` th "ติดตามคำขอที่รอพิจารณา รอตัดจำหน่าย และปิดงานตัดจำหน่าย" / en "Track disposal requests pending decision, awaiting disposal, and completed." Update the five E2E lines: "รออนุมัติ" → "รอพิจารณา", the two `getByText("อนุมัติแล้ว")` → `getByText("อนุมัติแล้ว รอตัดจำหน่าย")`.
- [ ] **Step 4: Run** the files, `npm test`, tsc, lint — PASS. **Commit 1** `fix(maintenance, disposal): an edited PM plan says saved, the PM due count is every due plan, and disposal speaks one set of status names (critique 2026-10-20 D1-D5)`.
- [ ] **Step 5: Queue names in the same wording.** Test first (append to `tests/disposal-sweep-ui.test.ts` "queue names use the disposal status words": `dashboard`/`notifications`/`workCenter` `pendingDisposals` contain "รอพิจารณา" and not "รออนุมัติ"; `approvedDisposals` equal "อนุมัติแล้ว รอตัดจำหน่าย"; `src/lib/notification-digest-format.ts` contains neither "รออนุมัติ" nor "รอดำเนินการ" for disposal), watch it fail, set the keys (th: pendingDisposals "ตัดจำหน่ายรอพิจารณา", approvedDisposals "อนุมัติแล้ว รอตัดจำหน่าย"; en: "Disposals pending decision", "Approved, awaiting disposal"; `workCenter.disposalSubtitle` to match), edit the two typed labels in `notification-digest-format.ts:37-38`, run `npm test`, **Commit 2** `fix(disposal): the queue names use the same status words (critique 2026-10-20 D3)`. Grep `e2e/` for the old queue names first and update any hit in the same commit.

### Task 9: Inactive master data can be found, opened and brought back (E1)

**Files:**
- Modify: `src/lib/master-data-query.ts` (helpers), `src/lib/organization-master-query.ts` (companies :205, branches :227, employees :250, suppliers :281), `src/lib/category-list-query.ts:98`, `src/lib/location-list-query.ts:77-79`, the brand/model list query (`brands/page.tsx:80-81, :113`), `departments/page.tsx:43-44`
- Modify: the seven list pages under `src/app/[locale]/(dashboard)/master-data/` (badges and filter panels, `deleteAction` conditional), `MasterDataSearch` (an optional `children` slot, for departments), `SupplierFilterForm`
- Modify: the edit/detail loaders and PUT lookups listed in `recon/master-data.md` (table "Where each list's query and badge are"), and the PUT routes of companies, branches, locations and employees (deactivation guard)
- Test: new `tests/master-data-record-status.test.ts`; appends to `tests/organization-master-query.test.ts`, `tests/category-list-query.test.ts`, `tests/location-list-query.test.ts`, `tests/brand-model-query.test.ts`; updates to `tests/master-data-sweep-ui.test.ts:17,24,31,37,44,51,63`, `tests/list-pages-ui.test.ts:46`, `tests/list-primitives-ui.test.ts:313`, `tests/v-track-s.test.ts:359`

**Interfaces:**
- Produces (in `src/lib/master-data-query.ts`, which has no imports): `export const recordStatusFilters = ["active", "inactive", "all"] as const`; `export type RecordStatusFilter`; `export function parseRecordStatus(value: string | string[] | number | null | undefined): RecordStatusFilter` (first value, default "active"); `export function recordStatusWhere(status: RecordStatusFilter): { isActive?: boolean }`; `export function setRecordStatusParam(params: URLSearchParams, status: RecordStatusFilter): URLSearchParams` (sets `status` only when not "active"); `export function isDeactivation(current: boolean, next: boolean): boolean`. Each list state gains `status: RecordStatusFilter`.

- [ ] **Step 1: Write the failing tests:** the helper tests (recon "Tests", first bullet); per query module, `build*Where(parse*({ status: "inactive" })).isActive === false`, the `"all"` where has no `isActive` key, and the query string carries `status=inactive` (the default stays out of the URL, so existing `deepEqual`s hold); a source test "inactive master data is reachable": the seven pages have no `<StatusBadge label={tCommon("active")} tone="success" />`, each has `name="status"` in its filter form, each loader and PUT in the recon table has no `where: { id, isActive: true }`, the four PUT routes contain `isDeactivation(`; and Review Focus 3: a PUT test (in the style of `tests/v-track-s.test.ts`'s stubs) where an inactive location with assets is saved with `isActive: true` and succeeds, while an active one with assets saved with `isActive: false` gets 409 with the DELETE route's block reason. Update the pinned tests listed under Files.
- [ ] **Step 2: Run** the new and appended files — FAIL.
- [ ] **Step 3: Implement.** The filter is a `FilterSelect` named `status` (labels `tCommon("status")`, options `tCommon("active")`/`tCommon("inactive")`/`tCommon("all")`) in each page's existing filter panel; `hasActiveFilters` also counts `status !== "active"`; the brand navigator and the model table both follow it. Badge: `label={x.isActive ? tCommon("active") : tCommon("inactive")} tone={x.isActive ? "success" : "muted"}` (as `admin/users/page.tsx:191`). `deleteAction` only on active rows. Pickers elsewhere keep `isActive: true` (do not touch them). The guard loads `_count` only inside the deactivation branch. Optional hint key `common.inactiveHint` (recon text) under each form's "ใช้งาน" checkbox, as a hint line only.
- [ ] **Step 4: Run** the files, `npm test`, tsc, lint — PASS.
- [ ] **Step 5: Commit** `fix(master-data): an inactive record shows as inactive, can be found with a status filter and brought back, and is guarded like a delete (critique 2026-10-20 E1)`.

### Task 10: Location types read in Thai (E2)

**Files:**
- Create: `src/lib/location-types.ts` (no imports)
- Modify: `src/lib/validations/location.ts:4-17` (re-export), `src/components/master-data/location-form.tsx:204-208` (path per repo), `src/app/[locale]/(dashboard)/master-data/locations/page.tsx:236, 330`, `src/app/api/search/route.ts:308`, messages
- Test: new `tests/location-type-labels.test.ts`

**Interfaces:**
- Produces: `export const locationTypes` (the 12 values, same order as today), `export type LocationType`, `export type LocationTypeLabelKey = \`type_${LocationType}\``, `export function getLocationTypeLabelKey(type: string | null | undefined): LocationTypeLabelKey | null`, `export function formatLocationType(type: string, t: (key: LocationTypeLabelKey) => string): string` (unknown values show as stored).

- [ ] **Step 1: Write the failing test** as the recon gives it (`recon/master-data.md`, E2 Tests), with the label table in `messages` checked for both locales, and the source checks (no raw `{type}` option text, no `label: type }`, no `{location.locationType}` cell; `formatLocationType(` in the form, the page and the search route).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Messages `location.type_<value>` from the recon's table (th/en). The integration API stays raw. Search by Thai type name is out of scope (report it).
- [ ] **Step 4: Run** the file, `npm test`, tsc — PASS.
- [ ] **Step 5: Commit** `fix(locations): location types read in Thai on the form, the list, its filter and search (critique 2026-10-20 E2)`.

### Task 11: Readiness cards say where to fix each item (F1)

**Files:**
- Modify: `src/lib/production-readiness.ts` (hrefs at :121, :133, :151-211; `href: string | null`), `src/app/[locale]/(dashboard)/admin/readiness/page.tsx:100-106, 145-156`, messages
- Test: `tests/production-readiness.test.ts`, `tests/admin-sweep-ui.test.ts`

- [ ] **Step 1: Write the failing tests** as the recon gives them (`recon/admin.md`, F1 Tests): the exact href map (env-only checks `null`, settings tabs via `buildSystemSettingsTabHref`), the th/en key rule (linked → `_action`, unlinked → `_fix` and no `_action`), and the page source checks. `tests/dead-code-cleanup.test.ts:21` must still pass: keep the `<Link>` block byte-identical inside the new conditional.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** with the recon's mapping and its nine `_fix` texts (th/en); delete the nine `_action` keys.
- [ ] **Step 4: Run** the files, `npm test`, tsc — PASS.
- [ ] **Step 5: Commit** `fix(admin): readiness cards link to the setting that fixes them, or say how to fix it on the server (critique 2026-10-20 F1)`.

### Task 12: System log and decision history read as plain sentences (F2)

**Files:**
- Modify: `src/lib/system-log-presenter.ts` (:228, :269-278, :337-353, :355-371, :374, :403), `src/lib/system-log-record-label-refs.ts:42-64`, messages (`systemLogPage`)
- Test: `tests/system-log-presenter.test.ts` (:68 changes), `tests/system-log-record-labels.test.ts`; keep `tests/list-frame-guards.test.ts:184` green (LV2 count 2 for this file: add no `?? "-"`, `|| "-"` or `: "-"`)

- [ ] **Step 1: Write the failing tests** as the recon gives them (`recon/admin.md`, F2 Tests: the seven presenter tests and the record-label refs test), plus Review Focus 4: `formatValue` of `"2026-10-19"` and `"2026-10-19T00:00:00.000Z"` equals `formatDate(...)`, of `"2026-10-19T03:15:00.000Z"` equals `formatDateTime(...)`, and of `"2026 budget"` stays `"2026 budget"`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the recon's six code points and its message keys (field labels, value labels copied from the existing namespaces with the words Task 8 set for disposal: requestStatus pending รอพิจารณา, approved อนุมัติแล้ว รอตัดจำหน่าย, rejected ไม่อนุมัติ, disposed ตัดจำหน่ายแล้ว), `summary_setTo`, `value_empty`.
- [ ] **Step 4: Run** the files, `npm test`, tsc, lint — PASS.
- [ ] **Step 5: Commit** `fix(admin): the system log and decision history summaries read as sentences with Thai field names, values and dates (critique 2026-10-20 F2)`.

### Task 13: Verify, record, hand over

**Files:** `docs/` per area (only where a doc describes the changed behaviour: grep `docs/` for the changed keys and rules), the AssetSystem wiki (`D:\Obsidian\Eltross\AssetSystem`, ams- pages + `ams-log.md`), the critique files are not edited.

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit -p .`, `npm run lint`, `node --test tests/thai-glossary.test.ts tests/messages-parity.test.ts`. Expected: 0 fail, clean, 0 errors.
- [ ] **Step 2 (controller):** `rm -rf .next/cache/turbopack`, `npm run build`, then the live checks of Task 4 and a look at the dashboard counts against the register tabs (read only: no form is saved).
- [ ] **Step 3:** a Thai summary for the user: what each of the 19 fixes changes for a person, the open points (export cap 5,000; Thai search for location types; AD employees re-activated by sync; `/admin/approvals` count above a capped list), and that the 13 visual bugs wait for the canvas rebuild.
- [ ] **Step 4:** update the repo docs found in Step 1's grep and the wiki, run the wiki lint, commit the vault `ingest: …`. Then E2E plan Task 51 (the full run) follows.
