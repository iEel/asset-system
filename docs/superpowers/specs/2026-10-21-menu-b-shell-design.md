# Menu B app shell: design

**Status:** draft for the user's approval (2026-10-21)
**Base:** `master` at `eb5c2b4e` (the E2E suite, the functional fix batch and the report decisions merged and pushed; nothing deployed). Branch `feat/shell-b`.
**Order of the remaining work:** this shell → the page groups of the canvas, one by one → E2E again → UAT → the one Production deploy (wiki `ams-open-questions` #27).
**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p (version 61): the boards under "เทียบสีเมนูหลัก", "แบบ ข · ข้อแนะนำ 1–5", "แบบ ข · (7)/(8)" and every desktop board after the rollout (navy menu, one top bar). Where this document and a board differ, this document wins.

## 1. Intent

The user asked for a more premium, more coherent app. The canvas round settled a new shell, "menu B": a navy menu beside light work areas, one top bar on every page, the person at the foot of the menu, a bell whose box says what waits on you, and a search that groups what it finds. The shell is what every page shares, so it is built first; the page groups come after it.

The shell also gains three things the app does not do today, which the user chose to include in this round:
1. **A session that follows real work.** Today a sign-in lasts a fixed 8 hours from the moment of sign-in, so a person filling a long form can be signed out in the middle of it, and nothing warns them. The user: "ถ้ายังทำงานอยู่ ก็ต้องให้ทำงานต่อ".
2. **An offline banner for the whole app.** Today only the audit scan page knows the network is gone.
3. **A bell that keeps itself current.** Today its count is fetched once, when the page opens.

## 2. Decisions the user made (2026-10-21)

| Topic | Decision |
|---|---|
| Menu colour | Navy menu (canvas "แบบ ข"). This **reverses** the 2026-10-10 "light menu" choice and DESIGN.md's rule "Don't bring back a dark navy sidebar in the light theme". Reason recorded for DESIGN.md: the old dark menu was Tailwind slate #0F172A and competed with the content; menu B is the icon's navy, with muted labels and teal only on the open page, while the top bar, panels and the phone stay light. |
| Person | Name, role and the account menu move to the foot of the menu (the top bar no longer shows them on desktop). |
| One count | The number lives on the bell only. The menu marks "ศูนย์งานค้าง" with an orange dot (and a screen-reader sentence), never a number. |
| Bell box | Two groups, "รอคุณตัดสิน" then "ควรติดตาม"; a "อ่านแล้วทั้งหมด" link; read rows stay listed, dimmed with an "อ่านแล้ว" pill; an empty state "ไม่มีงานค้าง". "อ่านแล้ว" clears the badge, not the work; a row returns as unread when its count rises (the app's existing rule). |
| Search | Results grouped by type, the matched text highlighted, `/` jumps to the search from any page, recent searches when the box is empty, a "not found" state that offers ways forward. |
| Phone | Keeps its **white** top bar and bottom menu (field use in bright light; the navy scan button must stand out). The open tab's icon sits on a soft navy tile. The bell joins the phone top bar on pages that show the bottom menu. Account, language, theme and sign-out move into the "เพิ่มเติม" sheet. |
| Company switcher | Stays on the dashboard only (used for the overview, not as a global filter). |
| Scope | Restyle, the small additions and the three new capabilities, all in this round. |
| Session | Idle sign-out after **60 minutes** without use; a ceiling of **12 hours** per sign-in. A person who is working is never signed out by the idle rule; activity extends the session silently. |

## 3. Goals

1. Every page under the dashboard layout shows the menu B shell in both themes, on desktop and phone, matching the canvas.
2. DESIGN.md, `.impeccable/design.json`, the tokens in `src/app/globals.css` and `tests/design-tokens-contrast.test.ts` change together and agree.
3. Keyboard and screen-reader use is at least as good as today: a skip link, a visible focus ring on navy, the bell's name says its count, new work is announced once, the collapsed menu names its icons on hover and focus.
4. Nobody who is working loses their session; an idle or ceiling sign-out is warned 5 minutes ahead and lands on a login page that says why and returns to the page.
5. The E2E suite (`npm run test:e2e`, four projects) passes on the new shell.

## 4. Non-goals and anti-goals

- **Non-goals:** the content of any page (the page groups come later); the bell's counting rules (which items exist and how they are counted stay as they are); the work center's own numbers; push, e-mail or LINE notifications; making pages work offline; a navy phone bar; a global company filter.
- **Anti-goals (a failure even if it works):** signing out a person who is typing; a second place that shows a number for the same work; any colour outside the token sets; a navy area whose focus ring or text fails contrast; a banner per page in a different style; breaking the E2E hazard guards (no LDAP sync, settings save, Excel import, failed sign-in or delete during a run).

## 5. What exists today (the code reading of 2026-10-21)

- **Menu** (`src/components/layout/sidebar.tsx`): three sections, groups that open themselves for the current page (`useState(containsActive)`), permission filtering (`src/lib/navigation-permissions.ts`), no count badges, no person. Collapse: a top-bar button (`topbar.tsx:148-157`, always the `PanelLeftClose` icon, no `aria-expanded`), state in `useState(false)` (`dashboard-shell.tsx:23`), lost on reload; collapsed rows hide their labels (`lg:sr-only`), no tooltip; groups still open as icon-only rows.
- **Top bar** (`topbar.tsx`): `h-16` (64px), `bg-sidebar`. Left: hamburger (phone task pages), collapse toggle, `GlobalSearch`. Right: scan link (desktop), bell, language menu, theme toggle, user menu (avatar, name; name, e-mail and sign-out inside).
- **Search** (`global-search.tsx`, `api/search/route.ts`, `lib/global-search.ts`): desktop only; nine types each gated by its view permission; minimum 2 characters; 220 ms debounce; a flat ranked list of up to 14; ↑↓/Enter/Esc as an ARIA combobox; no highlight, no `/`, no recent searches; "type at least 2 characters" can never show (`global-search.tsx:78, 91-93`).
- **Bell** (`topbar.tsx:175-238`, `lib/notification-summary*.ts`, `lib/notification-center.ts`, `api/notifications/route.ts`): the badge is the sum of the counts of the items that are neither read nor snoozed (99+ cap); fetched on mount and on the `asset-system:notification-summary-changed` event only; a left click on a row marks it read and removes it; read is per key with `lastCount` (a changed count makes it active again); `PATCH` takes one key (`read | unread | snooze | assign`); no batch, no live announcement; the button's name is "การแจ้งเตือน" without the count. Per-user `Notification` rows (the digest) never reach the bell.
- **Phone** (`mobile-field-navigation.tsx`, `lib/mobile-field-navigation.ts`): five tabs; hidden on focus task routes, with the keyboard up, and while the drawer is open; "เพิ่มเติม" opens the left drawer with the full menu; language, theme and the user menu stay in the phone top bar.
- **Session** (`src/lib/auth.ts`): JWT, `maxAge` 8 h, no idle rule; `refreshSessionToken` re-checks roles and the active flag (60 s cache) on each `jwt` callback; the client never learns the expiry; an expired page redirects to the login with `callbackUrl` but without `reason=session-expired`, so the login's "session expired" notice never shows; an API 401 shows a toast "กรุณาเข้าสู่ระบบใหม่" only.
- **Offline:** `public/sw.js` (production only) serves `offline.html` for a failed navigation; only the audit scan page detects offline and queues saves (`audit-offline-queue.ts`, `AuditScanOfflineBar`); no app-wide hook or banner.
- **Loading:** five `loading.tsx` files render skeletons from `src/components/ui/page-skeleton.tsx` (`SkeletonBlock`, `motion-safe:animate-pulse`, `aria-busy`).
- **Focus:** global `:focus-visible` outline on `--ring`; sidebar rows use `ring-ring` with an offset on `--sidebar`; no skip link; `<main data-dashboard-main>` has no id.
- **Preferences:** the `theme` cookie is the only one; other UI memory uses browser storage.

## 6. The design

### 6.1 Tokens and the two chromes

The menu and the top bar no longer share a colour. Keep the `--sidebar*` names for the navy menu; add `--chrome` and `--chrome-border` for the top bar and the phone bottom bar (they take today's light and dark `--sidebar` values). `THEME_COLORS` in `src/lib/theme.ts` follows `--chrome` (the phone browser's bar stays light in light), not the menu.

Menu tokens (6-digit hex, as every token):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--sidebar` | #082A54 | #0E2445 | menu background |
| `--sidebar-foreground` | #DCE6F2 | #DCE6F2 | row text |
| `--sidebar-muted` | #9FB3D1 | #9FB3D1 | section labels, icons, role line |
| `--sidebar-hover` | #1C3B62 | #213554 | hovered row (the canvas's white 8% veil, flattened) |
| `--sidebar-active` | #1E4F94 | #24508F | open page row |
| `--sidebar-active-foreground` | #FFFFFF | #FFFFFF | open page text |
| `--sidebar-active-icon` | #5FD6DD | #5FD6DD | open page icon |
| `--sidebar-active-bar` (new) | #18A0A8 | #3CC6CE | 3px bar on the open row's left edge |
| `--sidebar-border` | #213F65 | #263A58 | the line under the brand row and above the person |
| `--sidebar-ring` (new) | #5FD6DD | #5FD6DD | focus ring inside the menu |
| `--sidebar-dot` (new) | #F0A94D | #F0A94D | the "work waits" dot |

`tests/design-tokens-contrast.test.ts` gains the pairs: foreground, muted and active-foreground on their backgrounds at 4.5:1; active-icon, ring and dot on `--sidebar` at 3:1, in both themes. The bell's count keeps `bg-danger` with `text-danger-foreground` (its existing exception in The Token Contrast Rule).

DESIGN.md: §1 (the shell's history line), §2 Neutral (the chrome split), §2 Sidebar and Dark Theme (the values above), the "Brand navy is a fill only" rule (the open row is now primary on navy with a teal bar, in both themes), the Don't line (replaced by the reason in §2 of this document), a new §5 "App Shell" component section (6.2–6.9 below in short), and two named rules: **The One Count Rule** (a number for waiting work appears on the bell only) and **The One Banner Rule** (a shell message appears in one region under the top bar). `.impeccable/design.json` follows. `tests/dark-mode-docs.test.ts` and any DESIGN.md pin follow the new text.

### 6.2 The menu (desktop)

- Brand row 56px, aligned with the top bar, a `--sidebar-border` line under it.
- Rows: labels and icons in `--sidebar-foreground`/`--sidebar-muted`; hover `--sidebar-hover`; the open page `--sidebar-active` with `--sidebar-active-icon` and the `--sidebar-active-bar`; focus `--sidebar-ring` with an offset on `--sidebar`.
- Groups keep today's behaviour (the group of the open page opens itself, several may be open); an open group's pages sit indented on a thin guide line, the group title white and bold.
- The person at the foot, pinned (the menu scrolls between the brand row and the person when it is longer than the screen): an initial, the name, the role, a chevron; it opens the account menu (name, e-mail, sign-out). Language and theme stay in the top bar on desktop.
- "ศูนย์งานค้าง" shows the `--sidebar-dot` when the bell's "รอคุณตัดสิน" group has unread work, with a hidden sentence ("มีงานรอคุณ N รายการ"). No number anywhere in the menu.
- **Collapsed** (a 64px rail): icons only, the open page marked, the dot kept; each icon names itself in a tooltip on hover and on keyboard focus; the person becomes the initial. The toggle in the top bar has `aria-expanded`, switches its icon and label (ย่อเมนู / ขยายเมนู), and the choice is remembered per browser in a `sidebar` cookie read on the server (as `theme`), so the first paint is right.

### 6.3 The top bar (every page under the dashboard layout)

56px, `--chrome`, a `--chrome-border` line. Left: the menu toggle (desktop) or the hamburger (phone task pages), the search. Right: the scan button (desktop, icon), the bell, the language menu, the theme toggle (desktop). The user menu leaves the desktop top bar. Every sticky offset and `scroll-padding-top` follow the 56px (and the banner, 6.7).

### 6.4 The bell

- Button name: "การแจ้งเตือน N รายการ" (or "ไม่มีงานค้าง").
- Box: header "การแจ้งเตือน" with the update time under it and "อ่านแล้วทั้งหมด" on the right ("อ่านครบแล้ว" when nothing is unread); group **รอคุณตัดสิน**: `approvalInbox` only; group **ควรติดตาม**: every other item, in today's order. *Builder-check ruling (my call):* `pendingAuditFindings` and `pendingDisposals` go under ควรติดตาม, because `notification-summary.ts` shows them only when the person's approval inbox holds none of that kind, which is almost always a person who cannot decide them; so the menu dot (6.2) and its sentence follow `approvalInbox` alone. A row: a tone dot, the title, the detail line, the count; a read row dims and shows "อ่านแล้ว". Empty: a check, "ไม่มีงานค้าง" and one sentence. Foot: "เปิดศูนย์แจ้งเตือน" and, with `dashboard:view`, "เปิดศูนย์งานค้าง".
- "อ่านแล้วทั้งหมด": a new `PATCH /api/notifications` action `read_all`. The server reads the person's current summary itself (never counts sent by the client) and marks every listed item read at its current count. The badge clears; nothing is hidden from the box.
- **Read and snoozed rows return when their count rises, not when it drops** (*my call*; today any change un-reads, so finishing one of three approvals brings the badge back with 2). When a read or snoozed row's count drops, the server records the lower count as the row's `lastCount` (one write, only on a drop), so a later rise above it un-reads the row again. The notification center page and snooze follow the same rule.
- Freshness: the summary refetches every 2 minutes while the page is visible, at once when the tab becomes visible again, and on the existing change event. When the unread total rises, one polite `role="status"` sentence names what grew ("มีงานรออนุมัติเพิ่ม 1 รายการ"); never a bare number, never on the first load.

### 6.5 Search

- Desktop: the same box, now opening on `/` from any page unless focus is in a field. Results grouped by type in this order: ทรัพย์สิน, งานซ่อม, รอบตรวจนับ, ตัดจำหน่าย, พนักงาน, ที่ตั้ง, ผู้ขาย, บริษัท, สาขา; the matched text is highlighted (a `<mark>` with the warning-soft fill); the permission gates stay. *Builder-check ruling (my call):* only the asset group shows a real total: the API adds one count query for assets using the register's own search matching (cheap at about 3,500 assets, and the numbers then agree with the register), and the link reads "ดูทั้งหมดในทะเบียน (N)"; the other groups show what they list, with no total, and the per-type caps stay. No count runs for a query shorter than 2 characters, and the 220 ms debounce stays.
- Empty box: a one-line hint (what can be searched, and `/`) and up to 5 recent items (the results the person opened: title, type, href), per browser and locale, with "ล้าง".
- Not found: "ไม่พบ "…"", a hint, and up to three ways forward: scan, the register with filters, a new asset (only with `asset:create`).
- Fix: "พิมพ์อย่างน้อย 2 ตัวอักษร" shows when one character is typed.
- Phone: a search icon in the phone top bar opens the same search full width (today the phone has no search).

### 6.6 The phone

- Top bar stays white (`--chrome`); title, the search icon, and on pages that show the bottom menu the bell with its count. Focus task pages keep their task header.
- Bottom menu stays white; the open tab's icon on a soft navy tile (`primary-soft` fill, navy icon) on every page.
- "เพิ่มเติม" opens a **bottom sheet** instead of the left drawer: the person (initial, name, role, department) at the top, then the full permission-filtered menu (sections and groups as on desktop), then the language and theme switches, then "ออกจากระบบ" in the danger ink. A close button by the grabber; the scrim and a swipe down close it; it scrolls inside (`overscroll-behavior: contain`), traps focus, returns focus to the tab, and its motion stops under `prefers-reduced-motion`. The hamburger of focus task pages opens the same sheet.
- Language, theme and the avatar leave the phone top bar.

### 6.7 The banner region (The One Banner Rule)

One region under the top bar, full width, the warning-soft fill with the warning ink, `role="status"`. It shows at most one message, in this order of priority:
0. **Offline wins while offline** (*my call*): "อยู่ในระบบต่อ" cannot reach the server, so the session message waits until the connection is back.
1. **Session ending** (6.8): "จะออกจากระบบใน m:ss นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก" with "อยู่ในระบบต่อ"; or, near the 12-hour ceiling, "จะออกจากระบบเวลา HH:MM · ครบ 12 ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่" without an extend button.
2. **Offline:** "ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์", plus "การตรวจนับ N รายการรอส่ง จะส่งเองเมื่อออนไลน์" on the audit scan page (the page's own offline bar moves into this region). The banner never promises that data can be viewed offline.

The region adds its height to `scroll-padding-top`.

*Builder-check ruling (my call):* only the status line of the audit scan page's offline bar moves into the region. The queue tools stay on the scan page as page content, not as a banner: the "รอส่ง N รายการ" line with "ส่งตอนนี้" while online, and the list of failed saves with their errors and "ลบออกจากคิว". They are the scan tool's own controls, so The One Banner Rule does not apply to them; losing them would strand failed results.

### 6.8 The session

- **Idle rule:** a session ends 60 minutes after the person's last activity. Activity is any request the app makes for the person, and on the client any pointer, key or touch input (throttled; at most one keep-alive call per 5 minutes, and only while the tab is visible).
- **Ceiling:** a session ends 12 hours after its sign-in, whatever the activity.
- **The client knows its deadline:** a small endpoint returns the earlier of the idle deadline and the ceiling; a keep-alive call extends the idle deadline (never the ceiling). The shell schedules the banner 5 minutes before the deadline and the sign-out at it.
- **At the deadline:** the shell goes to `/{locale}/login?reason=session-expired&callbackUrl=<the page>`; the login shows its existing "session expired" notice. An API 401 anywhere in the app does the same instead of only a toast.
- The 60 s role and active-flag re-check stays.
- **Offline** (*builder-check ruling, my call*; the field audit works offline and an auditor may be out of signal for over an hour):
  - While the browser is offline, the shell never signs out and never redirects (offline, a navigation would only reach `offline.html` and the auditor would lose the scan page). The banner shows the offline line (6.7).
  - Time offline does not count as activity: the server cannot see it. When the connection returns, the shell asks the server for the deadline first. If the session is still valid, work goes on. If it lapsed, the shell goes to the login with `reason=session-expired` and the page as `callbackUrl`; the audit queue stays on the device (IndexedDB) and is sent after the same person signs in again.
  - The queue is tied to the person who scanned: each queued item records the user id, and a send under a different signed-in person does not happen (the item stays, the scan page says whose it is). A 401 from a queue send keeps the item queued instead of redirecting mid-send; the redirect happens once, after the queue stops.
- How the idle deadline is carried (a JWT claim refreshed by the `jwt` callback, `updateAge`, or a server table) is the builder's call; it must work with next-auth beta's JWT strategy, never store secrets on the client, and add no database write per request unless the builder shows it is needed.

### 6.9 Accessibility and states

- Skip link "ข้ามไปเนื้อหาหลัก" as the first focusable element, to `<main id="main" tabIndex={-1}>`.
- `scroll-padding-top` = top bar + banner; `scroll-padding-bottom` = the phone bottom menu where it shows.
- Loading: keep the five skeletons; they sit inside the new shell (menu and top bar present) and follow the new spacing.
- Reduced motion: the sheet, popovers and skeleton pulse stop under `prefers-reduced-motion`.

## 7. Constraints

- AGENTS.md: read the Next.js 16 docs in `node_modules/next/dist/docs/` before code; Thai copy per `docs/19_THAI_GLOSSARY.md`; `messages/*.json` only through `node scripts/messages-edit.mjs`; `tests/thai-glossary.test.ts` stays green.
- The theme rules of DESIGN.md hold: tokens only, no `dark:` class, no `.dark` block, 6-digit hex, both theme blocks identical in their names, the forced-light scope and print untouched.
- The guards in `tests/visual-foundation-guards.test.ts`, `tests/ui-overlay-guards.test.ts` and the 2D guards stay green; a new raw `<button>` goes only in a shared part that owns it.
- No database migration is expected; if the session design needs one, it is the user's call (Production writes need approval per AGENTS.md).
- `npm test`, `npx tsc --noEmit -p .`, `npm run lint` (0 errors) and `npm run build` pass; the E2E suite passes in its four projects (its specs follow the moved controls: sign-out, language and theme on the phone, the bell box).

## 8. Calls made in this document without the user (check these)

1. The bell's "รอคุณตัดสิน" group holds `approvalInbox` only (6.4).
2. Read and snoozed rows return when the count rises, not when it drops; the server records a drop (6.4).
3. Search shows a real total for assets only (6.5).
4. Offline wins the banner while offline; the audit queue tools stay on the scan page (6.7).
5. No sign-out while offline; after reconnecting, a lapsed session goes to the login and the queue waits for the same person (6.8).
6. The scan button stays in the desktop top bar as an icon (6.3); the phone gets a search icon (6.5).
7. "เพิ่มเติม" on the phone holds the full permission-filtered menu, not only four links (6.6), so every page stays reachable for an admin.
8. The token names `--chrome`, `--chrome-border`, `--sidebar-active-bar`, `--sidebar-ring`, `--sidebar-dot` and their values (6.1).

## 9. Left to the builder

The component split (a shell context sharing the notification summary between the bell and the menu dot is expected), the exact keep-alive endpoint and the session mechanism within 6.8, the tooltip and sheet primitives (Radix, as the app uses), the storage key for recent searches, the polling implementation, how the E2E specs reach the moved controls, the order of the tasks, and the tests that pin each part.
