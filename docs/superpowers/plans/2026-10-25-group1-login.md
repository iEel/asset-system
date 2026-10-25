# Page group 1: the login page (canvas B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/login` as canvas B (a navy page with the brand header, a hero on desktop and one card) without the IT Helpdesk block, plus Caps Lock, the destination line, the language links, the test-system marker and two fixes.

**Architecture:** Pure helpers in `src/lib/login-page.ts` (destination key, language link, test-system flag, company name rule, footer year) and one server read of `company_name` in `src/lib/login-company-name.ts`. The server page composes the frame and passes only strings and booleans to the client form. The backdrop, glow, line art and glass are token-based classes in `globals.css`, navy in both themes. The card follows the theme.

**Tech Stack:** Next.js 16.4 App Router (server page and client form), next-intl, next-auth 5, Tailwind 4 tokens, `node --test` source and behaviour tests, Playwright E2E.

**Spec:** `docs/superpowers/specs/2026-10-25-page-group-1-dashboard-detail-login-design.md` §8, with §5 (rules for all three pages), §10 (login E2E) and §11 (build order). This is the first of three plans; the dashboard and the asset detail follow.

**Branch:** `feat/group1-login` from `master` (`97699c61`, or the master the run starts from).

**Dry run:** not needed. The change touches two source files, two new helpers, one CSS block and their pinned tests. Nothing writes to the database. A slip shows up in `npm test` or in the four smoke projects.

## Global Constraints

- Thai copy exactly as written in this plan. Edit `messages/th.json` and `messages/en.json` together, only through `node scripts/messages-edit.mjs <changes.json>` (`{ "set": { "th": {…}, "en": {…} } }`). `tests/thai-glossary.test.ts` and `tests/messages-parity.test.ts` must pass.
- Before sign-in the page reads one setting, `company_name`, through `findUnique({ where: { key: "company_name" }, select: { value: true } })`. Never read the whole settings table (it holds `ldap_bind_password`) or any LDAP value. No `NEXT_PUBLIC_*`.
- Only a boolean reaches the page about the environment. Never render a database name, server, login or connection string.
- Every use of `callbackUrl` goes through `normalizeLoginCallbackUrl` first: the redirect, the destination label and the language links. The label comes from a fixed table, never from reflected text.
- These stay as they are:
  - `#login-username`, `#login-password` and their `autoComplete` values.
  - One button named exactly "เข้าสู่ระบบ" (th) / "Sign In" (en), with no other button of that name.
  - The auth error is the only `role="alert"` inside `<form>`.
  - The session-expired text "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" sits alone in its element.
  - `router.replace(callbackUrl)`.
  - The generic `loginFailed` / `loginRateLimited` messages, never per field.
- Theme follows the `theme` cookie or the OS. No `ThemeToggle` on the login, and the login page does not import `@/lib/theme`.
- Tokens only:
  - no hex, rgba or raw palette in `.tsx` classes or inline styles (guard N1);
  - no `dark:` class;
  - no `shadow-*` (guard R2);
  - no text under 12px (guard R3);
  - exactly one raw `<button>` in `login-form.tsx` (guard N3);
  - brand navy is never text.
- Modules that tests import use relative `.ts` imports, as `src/lib/login-redirect.ts` does. No `@/` alias in `src/lib/login-page.ts`.
- A source-pin test changes in the same commit as the code it pins, never deleted. An EXEMPT row that moves keeps its exact count and gets its new reason.
- E2E:
  - The login smoke never calls `.fill/.type/.pressSequentially/.click/.press` (`tests/e2e-review.test.ts:119`).
  - No E2E step ever submits a failed sign-in.
  - Only the smoke and `e2e/support/sign-in.ts` name `#login-password`.
- Every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A callback whose query holds slashes or encoded text, such as `/th/assets/x?returnTo=%2Fth%2Fassets`, through the language link.** Only the first path segment changes locale. The link stays a valid login URL, and the query survives byte for byte. *Pinned in Task 1.*
2. **A `DATABASE_URL` that spells the database `Database=ASSET_MANAGEMENT`, quotes the whole value, or is missing.** Production reads as Production, so no pill shows. A missing URL shows no pill. *Pinned in Task 1.*
3. **A `company_name` that is only spaces, or the seed default "บริษัท ตัวอย่าง จำกัด" with stray spaces.** The name is hidden, and the footer reads "© 2569" alone. *Pinned in Task 1.*
4. **A signed-in visitor who reaches `/th/login?reason=session-expired&callbackUrl=…`.** The client can end a session the server still accepts, as the session E2E's stand-in does. The login stays and shows its notice. No redirect loop. *Pinned in Task 3; the existing `e2e/shell/session.spec.ts` step covers it end to end.*
5. **The footer year near the Bangkok new year (2026-12-31T17:30Z is already 2027 in Bangkok).** The Thai year reads 2570 and the English year 2027. *Pinned in Task 1.*

---

### Task 1: Login helpers

**Files:**
- Create: `src/lib/login-page.ts`
- Create: `src/lib/seed-company-name.ts`
- Create: `src/lib/login-company-name.ts`
- Modify: `src/lib/system-setting-defaults.ts:116` (the `company_name` row takes its value from `seedCompanyName`)
- Test: `tests/login-page.test.ts`

**Interfaces:**
- Produces (for Task 3):
  - `getLoginDestinationKey(locale: string, callbackUrl: string): string | null`. Returns a full message key such as `"nav.dashboard"`, or `null` when the callback is the home `/${locale}`.
  - `buildLoginLocaleHref(from: string, to: string, callbackUrl: string, sessionExpired: boolean): string`.
  - `isTestSystem(databaseUrl?: string): boolean`, which defaults to `process.env.DATABASE_URL`.
  - `normalizeLoginCompanyName(value: string | null | undefined): string | null`.
  - `formatLoginYear(locale: string, date?: Date): string`.
  - `LOGIN_LANGUAGES: readonly { locale: "th" | "en"; label: string }[]` holds `[{ locale: "th", label: "ภาษาไทย" }, { locale: "en", label: "English" }]`. These are the shell's own words (`topbar.tsx:134-137`).
  - `getLoginCompanyName(): Promise<string | null>` in `login-company-name.ts`.
  - `seedCompanyName = "บริษัท ตัวอย่าง จำกัด"` in `seed-company-name.ts`.

- [ ] **Step 1: Write the failing tests** in `tests/login-page.test.ts`

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  buildLoginLocaleHref,
  formatLoginYear,
  getLoginDestinationKey,
  isTestSystem,
  LOGIN_LANGUAGES,
  normalizeLoginCompanyName,
} from "../src/lib/login-page.ts"

test("the destination names the page kind from the callback's path, never its text (spec §8)", () => {
  assert.equal(getLoginDestinationKey("th", "/th"), null)
  assert.equal(getLoginDestinationKey("th", "/th/dashboard"), "nav.dashboard")
  assert.equal(getLoginDestinationKey("th", "/th/assets?search=E2E"), "nav.assetRegister")
  assert.equal(getLoginDestinationKey("th", "/th/assets/new"), "nav.addAsset")
  assert.equal(getLoginDestinationKey("th", "/th/assets/0b6c2f7e-1111-4222-8333-944445555666"), "asset.detailTitle")
  assert.equal(getLoginDestinationKey("th", "/th/assets/0b6c2f7e-1111-4222-8333-944445555666/edit"), "asset.detailTitle")
  assert.equal(getLoginDestinationKey("th", "/th/asset-management/scan"), "nav.scanSearchAsset")
  assert.equal(getLoginDestinationKey("th", "/th/audit/rounds/abc"), "nav.auditRound")
  assert.equal(getLoginDestinationKey("th", "/th/admin/approvals"), "nav.approvalInbox")
  assert.equal(getLoginDestinationKey("th", "/th/admin/settings"), "nav.administration")
  assert.equal(getLoginDestinationKey("en", "/en/maintenance?status=in_progress"), "nav.maintenance")
  assert.equal(getLoginDestinationKey("th", "/th/assetsx"), "auth.destinationFallback")
  assert.equal(getLoginDestinationKey("th", "/th/something-new"), "auth.destinationFallback")
})

test("the language link keeps the callback in the new locale and the expiry reason (Review Focus 1)", () => {
  assert.equal(buildLoginLocaleHref("th", "en", "/th", false), "/en/login")
  assert.equal(
    buildLoginLocaleHref("th", "en", "/th/assets?search=E2E", true),
    "/en/login?reason=session-expired&callbackUrl=%2Fen%2Fassets%3Fsearch%3DE2E",
  )
  assert.equal(
    buildLoginLocaleHref("en", "th", "/en/assets/x?returnTo=%2Fen%2Fassets", false),
    "/th/login?callbackUrl=%2Fth%2Fassets%2Fx%3FreturnTo%3D%252Fen%252Fassets",
  )
  // A home callback with a query switches its locale too; only the path part goes through switchLocalePath.
  assert.equal(buildLoginLocaleHref("th", "en", "/th?x=1", false), "/en/login?callbackUrl=%2Fen%3Fx%3D1")
  assert.deepEqual(LOGIN_LANGUAGES.map((language) => language.label), ["ภาษาไทย", "English"])
})

test("the test-system pill shows for every database but asset_management (Review Focus 2)", () => {
  assert.equal(isTestSystem("sqlserver://db:1433;database=asset_management_dev;user=x"), true)
  assert.equal(isTestSystem("sqlserver://db:1433;database=asset_management;user=x"), false)
  assert.equal(isTestSystem("sqlserver://db:1433;Database=ASSET_MANAGEMENT;user=x"), false)
  assert.equal(isTestSystem('"sqlserver://db:1433;database=asset_management"'), false)
  assert.equal(isTestSystem(""), false)
  // No argument reads DATABASE_URL; unset it here so the shell running the test cannot decide the answer.
  const saved = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  try {
    assert.equal(isTestSystem(), false)
  } finally {
    if (saved !== undefined) process.env.DATABASE_URL = saved
  }
})

test("the company name hides when empty or still the seed default (Review Focus 3)", () => {
  assert.equal(normalizeLoginCompanyName("  บริษัท ทดสอบ หนึ่ง จำกัด  "), "บริษัท ทดสอบ หนึ่ง จำกัด")
  assert.equal(normalizeLoginCompanyName("   "), null)
  assert.equal(normalizeLoginCompanyName(null), null)
  assert.equal(normalizeLoginCompanyName(" บริษัท ตัวอย่าง จำกัด "), null)
})

test("the footer year is the Buddhist year in Thai and follows Bangkok's new year (Review Focus 5)", () => {
  assert.equal(formatLoginYear("th", new Date("2026-10-25T03:00:00Z")), "2569")
  assert.equal(formatLoginYear("en", new Date("2026-10-25T03:00:00Z")), "2026")
  assert.equal(formatLoginYear("th", new Date("2026-12-31T17:30:00Z")), "2570")
  assert.equal(formatLoginYear("en", new Date("2026-12-31T17:30:00Z")), "2027")
})

test("the login reads company_name alone and never the settings table (spec §8, Global Constraints)", () => {
  const source = readFileSync("src/lib/login-company-name.ts", "utf8")
  assert.match(source, /systemSetting\.findUnique\(\{\s*where: \{ key: "company_name" \},\s*select: \{ value: true \},?\s*\}\)/)
  assert.doesNotMatch(source, /findMany|findFirst|NEXT_PUBLIC_|ldap/i)
  assert.match(source, /\bcatch\b/)
  assert.match(source, /normalizeLoginCompanyName\(/)
  assert.match(readFileSync("src/lib/system-setting-defaults.ts", "utf8"), /key: "company_name", value: seedCompanyName/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/login-page.test.ts`
Expected: FAIL. The module `../src/lib/login-page.ts` is not found.

- [ ] **Step 3: Implement the helpers**

- **`getLoginDestinationKey`:**
  - Strip the query and hash.
  - Return `null` for exactly `/${locale}`.
  - Otherwise match the rest of the path segment by segment, with the longest prefix first:

  | Path after `/${locale}` | Key |
  |---|---|
  | `/dashboard` | `nav.dashboard` |
  | `/work-center` | `nav.workCenter` |
  | `/my-assets` | `nav.myAssets` |
  | `/assets` (exactly) | `nav.assetRegister` |
  | `/assets/new` | `nav.addAsset` |
  | `/assets/<id>` and below | `asset.detailTitle` |
  | `/asset-management/scan` | `nav.scanSearchAsset` |
  | `/asset-management/checkout` | `nav.checkout` |
  | `/asset-management/checkin` | `nav.checkin` |
  | `/asset-management/transfer` | `nav.transfer` |
  | `/asset-management/bulk-move` | `nav.bulkMove` |
  | `/asset-management/labels` | `nav.printLabels` |
  | `/asset-management/import-export` | `nav.importExport` |
  | `/maintenance` | `nav.maintenance` |
  | `/disposal` | `nav.disposal` |
  | `/audit/rounds` | `nav.auditRound` |
  | `/audit/findings` | `nav.auditFinding` |
  | `/reports` | `nav.reports` |
  | `/notifications` | `notifications.title` |
  | `/admin/approvals` | `nav.approvalInbox` |
  | `/admin` | `nav.administration` |
  | `/master-data` | `nav.masterData` |
  | anything else | `auth.destinationFallback` |

- **`buildLoginLocaleHref`:** split `callbackUrl` at its first `?` or `#`, run `switchLocalePath(path, from, to)` on the path part alone, append the rest unchanged, then return `buildLoginHref(to, switched, sessionExpired ? { reason: "session-expired" } : {})`. Import both helpers relatively: `./login-redirect.ts` and `./locale-path.ts`.
- **`isTestSystem`:**
  - Trim the value and strip surrounding quotes, as `src/lib/db-config.ts:3-10` does.
  - Read `database=` case-insensitively and run `decodeURIComponent` on it.
  - Compare it case-insensitively with `asset_management`.
  - A missing or empty URL, or one without `database=`, returns `false`.
- **`normalizeLoginCompanyName`:** trim the value. Return `null` when it is empty or equals `seedCompanyName`.
- **`formatLoginYear`:**
  - Take the year in `Asia/Bangkok` from `Intl.DateTimeFormat` `formatToParts`.
  - For `th`, use the `-u-ca-buddhist` calendar. Take the digits only, without "พ.ศ.".
  - For anything else, use the Gregorian year.
- **`getLoginCompanyName`:**
  - Exactly the `findUnique` call the test pins, through `prisma` from `@/lib/db`.
  - Wrap it in `try`/`catch`; a failed read returns `null`.
  - Return `normalizeLoginCompanyName(row?.value)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/login-page.test.ts tests/login-redirect.test.ts`
Expected: PASS, every test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/login-page.ts src/lib/seed-company-name.ts src/lib/login-company-name.ts src/lib/system-setting-defaults.ts tests/login-page.test.ts
git commit -m "feat(login): the destination, language link, test-system and company name helpers (group 1 login task 1)"
```

---

### Task 2: The login form

**Files:**
- Modify: `src/components/auth/login-form.tsx`
- Modify: `src/app/[locale]/(auth)/login/page.tsx` (only the session notice moves in, and the `LoginForm` call changes)
- Modify: `messages/th.json`, `messages/en.json` (through `scripts/messages-edit.mjs`)
- Test:
  - `tests/login-form-ui.test.ts`
  - `tests/guard-lock-sweep-ui.test.ts:29-37`
  - `tests/login-page-ui.test.ts:7-16`

**Interfaces:**
- Produces (for Task 3): `LoginForm({ callbackUrl }: { callbackUrl: string })`. The form no longer renders the session notice or the hint row. The page renders both above it.

- [ ] **Step 1: Add the form's messages**

Through `node scripts/messages-edit.mjs`, set in the `auth` namespace:

| Key | th | en |
|---|---|---|
| `capsLockOn` | Caps Lock เปิดอยู่ | Caps Lock is on |
| `showPasswordShort` | แสดง | Show |
| `hidePasswordShort` | ซ่อน | Hide |

- [ ] **Step 2: Rewrite the pinning tests so they fail**

In `tests/login-form-ui.test.ts`:
- `source()` returns the file with `\r\n` turned into `\n` (the working tree is CRLF, and several pins below span lines).
- Keep the first test, the third test and the translations test as they are.
- Replace the second test and the "2C batch 4" test with:

```ts
test("login form: the show-password toggle is a word with a full accessible name, and the submit is busy (spec §8)", () => {
  const content = source()
  assert.match(content, /aria-label=\{showPassword \? t\("hidePassword"\) : t\("showPassword"\)\}/)
  assert.match(content, /\{showPassword \? t\("hidePasswordShort"\) : t\("showPasswordShort"\)\}/)
  assert.doesNotMatch(content, /aria-pressed|\bEye\b|EyeOff|ShieldCheck/)
  assert.match(content, /<Button type="submit" busy=\{loading\} className="w-full">\n\s+\{t\("login"\)\}\n\s+<\/Button>/)
  assert.doesNotMatch(content, /aria-busy=|t\("loggingIn"\)/)
})

test("login form posts, so a submit before hydration never puts the password in the URL (spec §8)", () => {
  assert.match(source(), /<form method="post" onSubmit=\{handleSubmit\}/)
})

test("login form: the username field does not autocorrect, and Caps Lock shows under the password while it has focus (spec §8)", () => {
  const content = source().replace(/\r\n/g, "\n")
  assert.match(content, /id="login-username"[\s\S]*?autoCapitalize="none"[\s\S]*?spellCheck=\{false\}[\s\S]*?enterKeyHint="next"/)
  assert.match(content, /id="login-password"[\s\S]*?enterKeyHint="go"[\s\S]*?aria-describedby=\{capsLockOn \? "login-caps-lock" : undefined\}/)
  assert.match(content, /getModifierState\("CapsLock"\)/)
  assert.match(content, /onBlur=\{\(\) => setCapsLockOn\(false\)\}/)
  assert.match(content, /<p id="login-caps-lock" role="status"/)
  assert.match(content, /\{t\("capsLockOn"\)\}/)
  assert.equal(content.match(/role="alert"/g)?.length, 1, "the auth error is the form's only alert")
  assert.doesNotMatch(content, /sessionExpired|directoryLoginHint/)
})

test("login form keeps the shared label, inputs and the error notice (2C batch 4, spec §8)", () => {
  const content = source().replace(/\r\n/g, "\n")
  assert.match(content, /<FieldLabel htmlFor="login-username">\{t\("username"\)\}<\/FieldLabel>\n\s+<Input\n\s+id="login-username"/)
  assert.match(content, /<FieldLabel htmlFor="login-password">\{t\("password"\)\}<\/FieldLabel>\n\s+<div className="relative">\n\s+<Input\n\s+ref=\{passwordRef\}/)
  assert.equal(content.match(/^\s+required$/gm)?.length, 2, "both fields keep native required")
  assert.match(content, /<Notice tone="danger" role="alert" aria-live="polite">\n\s+\{error\}\n\s+<\/Notice>/)
  assert.doesNotMatch(content, /<input\b|<label\b|Loader2|bg-info-soft|bg-danger-soft|disabled=\{loading\}|mb-1\.5 block/)
})
```

In `tests/guard-lock-sweep-ui.test.ts`, the toggle's class pin becomes the string written in Step 4 below. It still asserts no `sm:` height and exactly one `<button`.

In `tests/login-page-ui.test.ts`, the first test's last pin becomes `/<LoginForm callbackUrl=\{callbackUrl\} \/>/`. Add `assert.match(source, /<Notice tone="info" role="status" aria-live="polite">\n\s+\{tAuth\("sessionExpired"\)\}\n\s+<\/Notice>/)` (read with `\r\n` turned into `\n`).

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/login-form-ui.test.ts tests/guard-lock-sweep-ui.test.ts tests/login-page-ui.test.ts`
Expected: FAIL on the new pins: `method="post"`, `capsLockOn`, the toggle's word, and the `LoginForm` call.

- [ ] **Step 4: Implement the form**

- **The form element:**
  - The props are `callbackUrl` only.
  - `<form method="post" onSubmit={handleSubmit} className="space-y-5">`. A POST to the login answers the page again (200, checked on the built app on 2026-10-25), so the browser's pre-hydration submit keeps the password in the body.
  - The session notice and the ShieldCheck hint row leave the form.
- **Username:** add `autoCapitalize="none"`, `spellCheck={false}` and `enterKeyHint="next"`.
- **Password:**
  - Add `enterKeyHint="go"` and `aria-describedby={capsLockOn ? "login-caps-lock" : undefined}`.
  - `onKeyDown` and `onKeyUp` set `capsLockOn` from `event.getModifierState("CapsLock")`.
  - `onBlur={() => setCapsLockOn(false)}`.
- **The Caps Lock line:**
  - Under the password's `relative` box: `<p id="login-caps-lock" role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm text-warning">`. `text-warning` is the warning ink the shared parts and pages use, and it is AA on the surface in both themes.
  - It holds a lucide `ArrowBigUp` (`aria-hidden`, `h-4 w-4`) and `{t("capsLockOn")}` only while `capsLockOn`. Otherwise it is empty.
  - The element stays in the DOM, so the first announcement is heard.
- **The toggle:**
  - The same raw `<button>`, keeping `type`, `aria-controls`, `onPointerDown` and `onClick`. `aria-label` stays the full name. There is no `aria-pressed`.
  - Its visible text is `{showPassword ? t("hidePasswordShort") : t("showPasswordShort")}`.
  - className: `"absolute inset-y-0 right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:min-h-10 md:min-w-10"`.
  - The input keeps `className="pr-12"`; widen it to `pr-16` only if "ซ่อน" overlaps the text. If you do, update the pin in the same commit.
- **The page, minimal change:** above `<LoginForm callbackUrl={callbackUrl} />`, render the hint `<p className="text-sm text-muted-foreground">{tAuth("directoryLoginHint")}</p>` and then the notice, written on three lines as the form has it today:

  ```tsx
  {sessionExpired ? (
    <Notice tone="info" role="status" aria-live="polite">
      {tAuth("sessionExpired")}
    </Notice>
  ) : null}
  ```

  Task 3 moves all three inside the new card.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/login-form-ui.test.ts tests/guard-lock-sweep-ui.test.ts tests/login-page-ui.test.ts tests/visual-foundation-guards.test.ts tests/form-migration-guards.test.ts tests/validation-guards.test.ts tests/permission-aware-navigation.test.ts tests/messages-parity.test.ts tests/thai-glossary.test.ts && npx tsc --noEmit`
Expected: PASS. N3 is still 1 for `login-form.tsx`, GF5 is still `[2, 0, 0]`, and tsc is clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth/login-form.tsx "src/app/[locale]/(auth)/login/page.tsx" messages/th.json messages/en.json tests/login-form-ui.test.ts tests/guard-lock-sweep-ui.test.ts tests/login-page-ui.test.ts
git commit -m "feat(login): the form posts, warns of Caps Lock and shows its password toggle as a word (group 1 login task 2)"
```

---

### Task 3: The login page frame

**Files:**
- Modify: `src/app/[locale]/(auth)/login/page.tsx`
- Modify: `src/app/globals.css` (login tokens in every block that declares `--image-stage`, five places, with the same values; plus the login classes)
- Modify: `messages/th.json`, `messages/en.json`
- Modify: `DESIGN.md` (:202, :312, the "Brand navy is a fill only" line :269 if its login wording changes, the Language menu rule :451, and a short "Login page" paragraph in §5)
- Modify: `docs/14_UI_UX_DESIGN_SYSTEM.md:119` (the Login row also names this spec and plan)
- Test:
  - `tests/login-page-ui.test.ts`
  - `tests/dark-mode-t.test.ts:53` (the `added` list of light tokens)
  - `tests/dark-mode-docs.test.ts` (no edit expected: it passes once DESIGN.md §2 lists the new tokens)
  - `tests/dark-mode-p.test.ts:174-180`
  - `tests/dark-mode-s.test.ts:138-143`
  - `tests/list-frame-guards.test.ts:140,235-244`
  - `tests/phase2d-docs.test.ts:30`
  - `tests/design-tokens-contrast.test.ts` (new pairs)

**Interfaces:**
- Consumes:
  - Task 1's helpers.
  - `getLoginCompanyName()`.
  - `LoginForm({ callbackUrl })` from Task 2.
  - `getSessionUser()` from `@/lib/auth-utils`.
  - `redirect` from `next/navigation`.

- [ ] **Step 1: Add the page's messages**

Through `node scripts/messages-edit.mjs`, in `auth`. `directoryLoginHint` is changed; every other key is new.

| Key | th | en |
|---|---|---|
| `directoryLoginHint` | ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่เข้าเครื่องคอมพิวเตอร์ของบริษัท | Use the same username and password you use to sign in to your company computer |
| `destination` | เข้าแล้วจะไปที่ `<strong>{page}</strong>` | After signing in you go to `<strong>{page}</strong>` |
| `destinationFallback` | หน้าที่เปิดไว้ก่อนหน้า | the page you opened |
| `testSystem` | ระบบทดสอบ | Test system |
| `testSystemNote` | ระบบทดสอบ ใช้สำหรับทดลองเท่านั้น | Test system, for trials only |
| `languageSwitch` | ภาษา | Language |
| `copyright` | © {year} | © {year} |
| `copyrightCompany` | © {year} {company} | © {year} {company} |
| `heroLabel` | เกี่ยวกับระบบ | About the system |
| `heroTaglineLead` | รู้ทุกทรัพย์สิน | Know every asset |
| `heroTaglineRest` | ว่าอยู่ที่ไหน อยู่กับใคร | where it is and who has it |
| `heroBody` | ทะเบียน ส่งมอบ ตรวจนับ ซ่อม และตัดจำหน่าย ครบในระบบเดียว เข้าใช้งานด้วยบัญชี Windows ของบริษัท | Register, hand over, count, repair and dispose in one system. Sign in with your company Windows account. |
| `heroHandoverTitle` | ส่งมอบแล้ว · ลงชื่อรับบนมือถือ | Handed over · signed on a phone |
| `heroHandoverDetail` | ใบส่งมอบออกให้ทันที | The handover form is ready at once |
| `heroAuditTitle` | ตรวจนับทุกสาขา | Count every branch |
| `heroAuditDetail` | เห็นรายการไม่ตรงระหว่างเดินตรวจ | See mismatches while you walk the count |
| `heroRegister` | ทะเบียนเดียว ครบทุกบริษัทและสาขา | One register for every company and branch |

- [ ] **Step 2: Rewrite the pinning tests so they fail**

`tests/login-page-ui.test.ts`: keep the Task 2 version of the first test. Replace the second test with:

```ts
test("login page: the navy frame comes from token classes, the card from the surface tokens, and the one h1 is the card title (spec §8)", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /login-backdrop/)
  assert.match(source, /login-glow/)
  assert.match(source, /login-pattern/)
  assert.match(source, /bg-surface/)
  assert.match(source, /border-border/)
  assert.doesNotMatch(source, /gradient|backdrop-blur|#[0-9a-f]{3,8}\b|rgba?\(|shadow-|dark:|ThemeToggle|@\/lib\/theme/i)
  assert.equal(source.match(/<h1\b/g)?.length, 1)
  assert.match(source, /<h1 className="[^"]*text-foreground[^"]*">\{tAuth\("login"\)\}<\/h1>/)
  assert.doesNotMatch(source, /<h2\b|Asset Management System|getFullYear|IT Helpdesk/)
})

test("login page: what it shows before sign-in comes only from the helpers and the one setting (spec §8)", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /getLoginCompanyName\(\)/)
  assert.match(source, /isTestSystem\(\)/)
  assert.match(source, /getLoginDestinationKey\(locale, callbackUrl\)/)
  assert.match(source, /buildLoginLocaleHref\(locale, language\.locale, callbackUrl, sessionExpired\)/)
  assert.match(source, /formatLoginYear\(locale\)/)
  assert.doesNotMatch(source, /prisma|systemSetting|process\.env\.DATABASE_URL|NEXT_PUBLIC_/)
})

test("login page: a signed-in visitor goes on to the callback, except after a session expiry (Review Focus 4)", () => {
  const source = readFileSync(pagePath, "utf8")
  assert.match(source, /if \(user && !sessionExpired\) redirect\(callbackUrl\)/)
})
```

- `tests/dark-mode-p.test.ts:174-176`: the login icon pin becomes the header tile's class string written in Step 4, still with `ring-1 ring-app-icon-frame`. `NOT_UPLOADS` stays at 1 and the total stays at 19.
- `tests/dark-mode-s.test.ts:138-143`: the two pins become `/<h1 className="[^"]*text-foreground[^"]*">\{tAuth\("login"\)\}<\/h1>/` and `doesNotMatch(login, /<h2\b/)`. The repo-wide "no `text-brand-navy`" line stays.
- `tests/list-frame-guards.test.ts:140`: the LH1 row becomes `{ count: 1, kind: "permanent", why: "the login page has no shell; its card title is the page's one h1", ruling: "group 1 login (spec 2026-10-25 §8)" }`. The phase 3 test at :237-243 expects `[]` and the sum `0`. Edit its comment at :235 so it no longer names the login.
- `tests/phase2d-docs.test.ts:30`: the pin becomes `/the register's bulk selection bar and the topbar search/`, with the message "the two phase 3 places left (D2; the login frame closed in group 1)".
- `tests/design-tokens-contrast.test.ts`: in both themes, add a test `` `${prefix}the login backdrop: its text AA, and the test-system dot and the focus ring at 3:1, on every backdrop token (group 1 login)` ``:
  - `assertAA` of `sidebar-foreground`, `sidebar-muted` and `sidebar-active-icon` on `login-backdrop-start`, `login-backdrop-mid`, `login-backdrop-end` and `login-glow`;
  - `assertContrast("sidebar-dot", fill, NON_TEXT, …)` and `assertContrast("sidebar-ring", fill, NON_TEXT, …)` on the same four. The base `--ring` falls below 3:1 on the mid stop and the glow in light, so every focusable thing on the backdrop takes `sidebar-ring` (Step 4).
- `tests/dark-mode-t.test.ts:53`: append `"login-backdrop-start", "login-backdrop-mid", "login-backdrop-end", "login-glow"` to `added`, with a comment naming group 1 login.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/login-page-ui.test.ts tests/dark-mode-p.test.ts tests/dark-mode-s.test.ts tests/list-frame-guards.test.ts tests/phase2d-docs.test.ts tests/design-tokens-contrast.test.ts`
Expected: FAIL on the new pins. The contrast test fails with "Token --login-backdrop-start is missing".

- [ ] **Step 4: Implement the frame**

- **Tokens (`globals.css`):**
  - `--login-backdrop-start` starts from #0B2E5C, `--login-backdrop-mid` from #083161 and `--login-backdrop-end` from #051A33. The mid stop is a token of its own: `--brand-navy` turns light blue in dark, and the backdrop stays navy in both themes.
  - `--login-glow` starts from #173B6E. It is the brightest point of the glow, and it must keep `sidebar-muted` at 4.5:1.
  - Each needs a `--color-*` alias. Declare every one in all five blocks that declare `--image-stage`, with the same value, right after `--app-icon-frame` and before the effects, in the same order in every block (`tests/dark-mode-t.test.ts` T3 compares the forced-light and print blocks with `:root` in order).
  - Adjust a value only if a pair fails, and say which in the report.
- **Classes (`globals.css`, a commented "Login page (group 1)" block):**
  - `.login-backdrop`: the 155° gradient from start through mid to end (the canvas's stops: 0%, 38%, 100%).
  - `.login-glow`: radial glows of `--login-glow` (top left) and `--brand-accent` (bottom right, low strength). The canvas's three radial gradients are the starting point.
  - `.login-pattern`: the canvas's 200px line-art data URI (stroke `%2318A0A8`, opacity .10), masked to fade to the right.
  - `.login-glass`: a 7% light layer and a 14% edge (`color-mix` with #FFFFFF), with `backdrop-filter: blur(10px)` and the `-webkit-` form. Text on glass is `text-sidebar-foreground` only: `sidebar-muted` falls to 4.27:1 on glass over the glow.
  - `.login-card-accent`: a 4px bar, a gradient from `--brand-accent` through `--primary` to `--login-backdrop-start`.
  - Nothing animates.
- **Page layout** (canvas `B-Login.dc.html` from `lg`; `B-Login-Phone.dc.html` below it):
  - `<div class="login-backdrop relative flex min-h-dvh flex-col overflow-hidden text-sidebar-foreground">` holds the glow and pattern layers (`aria-hidden`, `pointer-events-none absolute inset-0`), then the header, the main and the footer.
  - Pad the header with `env(safe-area-inset-top)`, because `viewportFit` is cover.
- **Header:** `<header className="relative z-10 flex min-h-16 items-center gap-3 px-4 pt-[env(safe-area-inset-top)] lg:min-h-[76px] lg:px-14">`. Do not start it with `flex h-16`: `tests/menu-b-shell-topbar.test.ts:53` bans `<header className="flex h-16` across `src`.
  - The icon tile: `next/image` `src="/icon.png"`, `alt=""`, `aria-hidden`, 38px from `lg` and 34px below. className: `"h-[34px] w-[34px] rounded-[10px] ring-1 ring-app-icon-frame lg:h-[38px] lg:w-[38px]"`. Use this exact string in the dark-mode-p pin.
  - The brand: `tNav("brandName")`, with the company name under it when `getLoginCompanyName()` returns one.
  - The test-system pill, from `lg` only (`hidden lg:inline-flex`): `testSystem && <span …>` with a `bg-sidebar-dot` dot, a `border-sidebar-dot` border and `tAuth("testSystem")`. Below `lg` the hero band carries the second copy (`lg:hidden`), so exactly one is visible at any width; the E2E counts the visible one.
  - The language switch, a `<nav aria-label={tAuth("languageSwitch")}>` holding `LOGIN_LANGUAGES`:
    - the current language is a `<span aria-current="true" lang=…>` on `bg-surface text-foreground`;
    - the other language is a `<Link href={buildLoginLocaleHref(locale, language.locale, callbackUrl, sessionExpired)} lang=… hrefLang=…>` (`next/link`, as everywhere in the app) inside `.login-glass`, with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring`, as the menu rows have;
    - both are at least 44px tall below `md`.
- **Hero** (`<section aria-label={tAuth("heroLabel")}>`):
  - Below `lg`: the test-system pill's second copy (`lg:hidden`) and the two-line tagline at 27px.
  - From `lg`, add:
    - the 44px tagline, its second line in `text-sidebar-active-icon`;
    - `heroBody`;
    - the three `.login-glass` cards in an `aria-hidden` block. They have no numbers and no codes, and their icons are lucide `Check`, a bar, and `Package` in `text-sidebar-active-icon`. No status colours.
- **Card** (`bg-surface border border-border text-foreground`, 18px corners on desktop; below `lg` a sheet with 22px top corners filling the rest of the screen):
  - `.login-card-accent` on top.
  - `<h1 className="text-2xl font-semibold text-foreground">{tAuth("login")}</h1>`.
  - The hint `tAuth("directoryLoginHint")` (`text-sm text-muted-foreground`).
  - The session notice (moved here from Task 2's place).
  - The destination line when `getLoginDestinationKey(locale, callbackUrl)` is not `null`. It reads `tAuth.rich("destination", { page: t(key), strong: (chunks) => <strong className="font-semibold">{chunks}</strong> })`, where `t` comes from `getTranslations()` with no namespace, and it sits on `bg-primary-soft` with a lucide `ArrowRight` (`aria-hidden`).
  - `<LoginForm callbackUrl={callbackUrl} />`.
- **Footer:**
  - `copyrightCompany` with `{ year: formatLoginYear(locale), company }`, or `copyright` without a company.
  - `testSystemNote` when `testSystem`.
  - `text-xs` (12px) with `text-sidebar-muted` on the backdrop. On the phone it sits inside the sheet in `text-muted-foreground`.
- **Signed-in visitor:** after normalising, `const user = await getSessionUser()`, then `if (user && !sessionExpired) redirect(callbackUrl)`.
- **Data reads:** run `getLoginCompanyName()` and the translations in the existing `Promise.all`. `isTestSystem()` is synchronous.
- **`DESIGN.md`:**
  - §2 "### Dark Theme": one bullet, "**Login backdrop (the same in both themes):** `--login-backdrop-start` #0B2E5C · `--login-backdrop-mid` #083161 · `--login-backdrop-end` #051A33 · `--login-glow` #173B6E", with the final values. `tests/dark-mode-docs.test.ts` D1 needs every hex token of the dark block there. If the frontmatter lists tokens, add them after `app-icon-frame`.
  - Never call a surface "white" in DESIGN.md ("white fill", "on white" and similar fail `tests/dark-mode-docs.test.ts:37`). Say "light layer" for the glass.
  - :202: the phase 3 places become "the register's bulk selection bar and the topbar search". Add one sentence that the login frame was redone in page group 1 (spec 2026-10-25).
  - :312: the four LH1 `h1` keep their count. The login's reason becomes "its card title; the page has no shell".
  - :451: add that on the login the language switch is two links (they work before hydration and keep `callbackUrl` and `reason`), not a radio group.
  - A short "Login page" paragraph in §5 (components). It covers:
    - the navy backdrop tokens and classes, in both themes;
    - the card on the surface tokens, flat, with the accent line;
    - the one `h1`;
    - the hint, the notice, the destination line and the Caps Lock line;
    - no data before sign-in except the company name;
    - the test-system pill.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: every unit test passes (the whole suite, since the guards read all of `src`), tsc is clean, and lint has no errors.

- [ ] **Step 6: Look at it**

Run `npm run build`. Then start `next start` on a free port with `AUTH_URL`/`NEXTAUTH_URL` set to it. Screenshot `/th/login`, `/th/login?reason=session-expired&callbackUrl=%2Fth%2Fassets` and `/en/login` at 1440×900 and 390×844, in light and dark (the `theme` cookie). Compare each with the B boards. Fix what differs in one batch. Delete the screenshots after the report; never commit them.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(auth)/login/page.tsx" src/app/globals.css messages/th.json messages/en.json DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md tests/login-page-ui.test.ts tests/dark-mode-t.test.ts tests/dark-mode-p.test.ts tests/dark-mode-s.test.ts tests/list-frame-guards.test.ts tests/phase2d-docs.test.ts tests/design-tokens-contrast.test.ts
git commit -m "feat(login): canvas B frame — navy page, brand header, hero, one card, destination line and language links (group 1 login task 3)"
```

---

### Task 4: E2E steps and the round's docs

**Files:**
- Modify: `e2e/smoke/login-page.spec.ts`
- Modify: `e2e/shell/session.spec.ts` (one new test)
- Modify: `docs/99_CHANGELOG.md`, `docs/07_UAT_CHECKLIST.md`, `DEVELOPER_HANDOFF.md`
- Modify: `tests/shell-docs.test.ts:22` (the shell entry is no longer the first under 2026-10-25)
- Test: `tests/e2e-suite.test.ts`, `tests/e2e-review.test.ts`, `tests/e2e-shell.test.ts`, `tests/e2e-docs.test.ts`, `tests/shell-docs.test.ts`, `tests/dark-mode-docs.test.ts`, `tests/v-track-docs.test.ts`, `tests/phase2d-docs.test.ts` (they read these files)

- [ ] **Step 1: Write the smoke steps**

`e2e/smoke/login-page.spec.ts` (still no fill, type, click or press):

```ts
test("the login page opens in the project's theme and passes the measurements", async ({ page, measure, e2eTheme }) => {
  const login = await measure.visit("/th/login", "login page")
  expect(login.loadMs, "the login page's load time is recorded").not.toBeNull()
  expect(login.axe, "axe ran on the login page").not.toBeNull()
  await expect(page.locator("html")).toHaveAttribute("data-theme", e2eTheme)
  await expect(page.getByRole("heading", { level: 1, name: "เข้าสู่ระบบ" })).toBeVisible()
  await expect(page.getByText("ใช้ชื่อผู้ใช้และรหัสผ่านเดียวกับที่เข้าเครื่องคอมพิวเตอร์ของบริษัท", { exact: true })).toBeVisible()
  await expect(page.getByText(/IT Helpdesk|อีเมล IT|ติดต่อ IT/)).toHaveCount(0)
  // The run's database is asset_management_dev, so the test-system pill shows (spec §8).
  await expect(page.getByText("ระบบทดสอบ", { exact: true }).filter({ visible: true })).toHaveCount(1)
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute("href", "/en/login")
  await expect(page.locator("#login-username")).toBeVisible()
  await expect(page.locator("#login-password")).toBeVisible()
})

test("the login names where it goes next, and its English page reads in English", async ({ page, measure }) => {
  const callback = "/th/assets/00000000-0000-4000-8000-000000000000"
  await measure.visit(`/th/login?callbackUrl=${encodeURIComponent(callback)}`, "login page with a destination")
  await expect(page.getByText(/เข้าแล้วจะไปที่\s*รายละเอียดทรัพย์สิน/)).toBeVisible()
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute("href", `/en/login?callbackUrl=${encodeURIComponent(callback.replace("/th/", "/en/"))}`)
  await measure.visit("/en/login", "login page in English")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
  await expect(page.getByRole("heading", { level: 1, name: "Sign In" })).toBeVisible()
  await expect(page.getByRole("link", { name: "ภาษาไทย" })).toHaveAttribute("href", "/th/login")
})
```

`e2e/shell/session.spec.ts`: add after the last test:

```ts
test("a signed-in visitor of the login goes on to the page it names (group 1 login, spec §8)", async ({ page, measure }) => {
  await page.goto("/th/login?callbackUrl=%2Fth%2Fassets")
  await page.waitForURL((url) => url.pathname === "/th/assets")
  await measure.recordPage("IT staff: the login sends a signed-in visitor on")
})
```

- [ ] **Step 2: Update the docs**

- `docs/99_CHANGELOG.md`: a `### หน้าเข้าสู่ระบบแบบ B (กลุ่มหน้าแรก งานที่ 1)` entry at the top, newest first: under a new `## <date of the commit>` heading (2026-10-26 or later), or, if that date is still 2026-10-25, as the first `###` under the existing heading. It lists:
  - what changed;
  - the two fixes (POST, signed-in redirect);
  - that nothing is deployed.
- `tests/shell-docs.test.ts:22`: the shell entry is no longer the first under the newest date. Change the pin to `assert.equal(changelog.lastIndexOf("\n## ", entry), changelog.indexOf("\n## 2026-10-25\n"), "the entry sits under 2026-10-25 (the group 1 login entry went above it later)")`, as `tests/e2e-docs.test.ts:24` already does for its own entry.
- `docs/07_UAT_CHECKLIST.md`:
  - **rewrite line 14** (it asks for a "Light Slate background, Navy headings, Surface White form", which the new page no longer has): navy backdrop in both themes, the card on the surface tokens with the accent line and no shadow, the real app icon, no horizontal overflow at 390px and on desktop;
  - add the login lines: the hint; Caps Lock (desktop); the destination after an expired session; the language links; the test-system pill on UAT/dev only, none on Production; no IT Helpdesk block.
- `DEVELOPER_HANDOFF.md`: one line under the current round.
- Leave no template placeholder (`<N>`, `<today>`, `<run id>`, `<commit>` and the like), and keep every existing section where it is: `tests/e2e-docs.test.ts` fails on either. The E2E run's result is not written in this commit.

- [ ] **Step 3: Run the source tests**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, the whole unit suite. If a pinned count of visits or tests in the E2E source tests changes, update that pin in this commit, with the reason in a comment.

- [ ] **Step 4: Commit**

```bash
git add e2e/smoke/login-page.spec.ts e2e/shell/session.spec.ts docs/99_CHANGELOG.md docs/07_UAT_CHECKLIST.md DEVELOPER_HANDOFF.md tests/shell-docs.test.ts
git commit -m "test(e2e): the login smoke reads canvas B's page, and a signed-in visitor of the login goes on (group 1 login task 4)"
```

- [ ] **Step 5 (the main session, not the implementer): run the affected E2E specs**

These need the VPN, `scratchpad/stay-awake.ps1` and a clean build. The main session probes the database first (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`), runs `rm -rf .next && npm run build`, then:

Run: `npx playwright test e2e/smoke e2e/shell`
Expected: every test passes in all four projects.
