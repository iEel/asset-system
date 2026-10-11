import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findMatches, readSourceFiles } from "./helpers/source-files.ts"

// node --test cannot load .tsx, so these tests read the sources (spec 2A section 7.7, I12).
const sources = readSourceFiles("src")
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const isClientModule = (source: string) => /^["']use client["']/.test(source.trimStart())

// The opening tag of every <Button …> in a source: from "<Button" to the first ">" outside braces and quotes,
// so arrow functions inside props (onClick={() => …}) do not end the tag early.
function buttonOpeningTags(source: string): string[] {
  const tags: string[] = []
  for (const match of source.matchAll(/<Button\b/g)) {
    let depth = 0
    let quote = ""
    for (let index = match.index + match[0].length; index < source.length; index += 1) {
      const char = source[index]
      if (quote) {
        if (char === quote) quote = ""
      } else if (char === '"' || char === "'" || char === "`") {
        quote = char
      } else if (char === "{") {
        depth += 1
      } else if (char === "}") {
        depth -= 1
      } else if (char === ">" && depth === 0) {
        tags.push(source.slice(match.index, index + 1))
        break
      }
    }
  }
  return tags
}

test("one quiet toaster: AppToaster replaces the richColors Toaster", () => {
  assert.deepEqual(findMatches(sources, /\brichColors\b/g), [], "richColors fails AA (3.08 to 4.35:1)")
  assert.deepEqual(findMatches(sources, /<Toaster\b/g).map((match) => match.split(": ")[0]), ["src/components/ui/app-toaster.tsx"])
  const layout = read("src/app/[locale]/layout.tsx")
  assert.match(layout, /import \{ AppToaster \} from "@\/components\/ui\/app-toaster"/)
  assert.match(layout, /\n      <AppToaster \/>\n/)
  assert.doesNotMatch(layout, /from "sonner"/)
})

test("AppToaster sits under the topbar, stays 6 seconds, can be closed and names itself in the page language", () => {
  const source = read("src/components/ui/app-toaster.tsx")
  assert.ok(isClientModule(source), "useTranslations needs a client component")
  assert.match(source, /position="top-right"/)
  assert.match(source, /offset=\{\{ top: 72, right: 16 \}\}/, "8px under the 64px topbar, right edge on the topbar's px-4")
  assert.match(source, /mobileOffset=\{\{ top: 72 \}\}/)
  assert.match(source, /duration=\{6000\}/)
  assert.match(source, /\scloseButton\s/, "the close button is the only way to dismiss a toast from the keyboard")
  assert.match(source, /containerAriaLabel=\{tNotifications\("title"\)\}/)
  assert.match(source, /toastOptions=\{\{ closeButtonAriaLabel: tCommon\("close"\) \}\}/)
  assert.match(source, /const toasterStyle = \{ "--width": "380px" \} as CSSProperties/, "sonner sets --width inline, so CSS cannot widen it")
  assert.match(source, /style=\{toasterStyle\}/)
  assert.match(source, /import \{ toneIcons \} from "@\/components\/ui\/tone-icons"/)
  for (const line of ["success: <SuccessIcon", "info: <InfoIcon", "warning: <WarningIcon", "error: <DangerIcon", "close: <X"]) {
    assert.ok(source.includes(`${line} className="size-4" />`), line)
  }
  assert.doesNotMatch(source, /richColors|theme=|visibleToasts|hotkey=/)
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    assert.equal(typeof messages.notifications?.title, "string", `${locale}: notifications.title`)
    assert.equal(typeof messages.common?.close, "string", `${locale}: common.close`)
  }
})

test("toast CSS: token colors, a soft fill only for warning and error, ratio line heights, a ring outline, hidden on paper", () => {
  const css = read("src/app/globals.css")
  // The phase 1 font rule stays its own block (visual-foundation-guards pins it as it is).
  assert.match(css, /:root \[data-sonner-toaster\] \{\s*font-family: var\(--font-sans\);\s*\}/)
  assert.match(css, /:root \[data-sonner-toaster\]\[data-sonner-theme="light"\] \{\s*--normal-bg: var\(--card\);\s*--normal-border: var\(--border\);\s*--normal-text: var\(--foreground\);\s*--border-radius: 12px;\s*\}/)
  assert.match(css, /:root \[data-sonner-toast\]\[data-styled="true"\] \{\s*padding: 12px 40px 12px 16px;\s*gap: 10px;\s*align-items: flex-start;\s*font-size: 14px;\s*line-height: calc\(22 \/ 14\);\s*box-shadow: var\(--shadow-overlay\);\s*\}/)
  assert.match(css, /:root \[data-sonner-toast\]\[data-styled="true"\] \[data-description\] \{\s*color: var\(--muted-foreground\);\s*font-size: 13px;\s*line-height: calc\(20 \/ 13\);\s*\}/)
  assert.match(css, /:root \[data-sonner-toast\]\[data-type="warning"\] \{\s*--normal-bg: var\(--warning-soft\);\s*--normal-border: var\(--warning-border\);\s*\}/)
  assert.match(css, /:root \[data-sonner-toast\]\[data-type="error"\] \{\s*--normal-bg: var\(--danger-soft\);\s*--normal-border: var\(--danger-border\);\s*\}/)
  assert.doesNotMatch(css, /\[data-type="(?:success|info)"\] \{[^}]*--normal-/, "success and info stay white: the tone lives in the icon")
  for (const [type, token] of [["success", "success"], ["info", "info"], ["warning", "warning"], ["error", "danger"]]) {
    assert.match(css, new RegExp(`:root \\[data-sonner-toast\\]\\[data-type="${type}"\\] \\[data-icon\\] \\{\\s*color: var\\(--${token}\\);\\s*\\}`), `${type} icon color`)
  }
  assert.match(css, /:root \[data-sonner-toast\]:focus-visible \{\s*outline: 2px solid var\(--ring\);\s*outline-offset: 2px;\s*\}/)
  assert.match(css, /:root \[data-sonner-toast\]\[data-styled="true"\] \[data-close-button\] \{[^}]*width: 24px;\s*height: 24px;[^}]*border-radius: 6px;[^}]*\}/)
  assert.match(css, /:root \[data-sonner-toast\]\[data-styled="true"\]:hover \[data-close-button\]:hover \{/, "0,6,0 beats sonner's 0,5,0 hover rule")
  assert.match(css, /:root \[data-sonner-toast\]\[data-styled="true"\] \[data-close-button\]:focus-visible \{\s*box-shadow: none;\s*outline: 2px solid var\(--ring\);\s*outline-offset: 1px;\s*\}/)
  assert.match(css, /@media print \{\s*:root \[data-sonner-toaster\] \{\s*display: none;\s*\}\s*\}/)

  const rules = css.match(/[^{}]*data-sonner[^{}]*\{[^{}]*\}/g) ?? []
  assert.ok(rules.length >= 15, `expected the toast rules, found ${rules.length}`)
  const text = rules.join("\n")
  assert.doesNotMatch(text, /!important/)
  assert.doesNotMatch(text, /line-height: \d+px/, "line heights are ratios")
  assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b|rgba?\(/i, "toast colors come from the :root tokens")
  for (const rule of rules) {
    const at = css.indexOf(rule)
    const layerOpen = css.lastIndexOf("@layer", at)
    assert.ok(layerOpen === -1 || css.indexOf("\n}", layerOpen) < at, `outside every @layer, or sonner's unlayered CSS wins: ${rule.slice(0, rule.indexOf("{")).trim().split("\n").pop()}`)
  }
})

test("ActionEmptyState sits in its panel with no frame, a tone icon and a Button-sized link", () => {
  const source = read("src/components/ui/action-empty-state.tsx")
  assert.ok(!isClientModule(source), "server pages render it")
  assert.doesNotMatch(source, /border-dashed|rounded-full|\bbg-/, "no dashed box, no icon circle and no fill")
  assert.match(source, /<div className="flex flex-col items-center px-4 py-10 text-center">/)
  assert.match(source, /<div aria-hidden="true" className=\{`mb-3 flex \[&>svg\]:size-6 \$\{toneStyles\[tone\]\.iconClassName\}`\}>/)
  assert.match(source, /empty: \{ icon: <Inbox \/>, iconClassName: "text-faint-foreground" \}/)
  assert.match(source, /error: \{ icon: <DangerIcon \/>, iconClassName: "text-danger" \}/)
  assert.match(source, /permission: \{ icon: <ShieldAlert \/>, iconClassName: "text-warning" \}/)
  assert.match(source, /const DangerIcon = toneIcons\.danger/)
  assert.match(source, /"text-base font-semibold text-foreground text-balance"/)
  assert.match(source, /"mt-1 max-w-md text-sm text-muted-foreground text-pretty"/)
  assert.match(source, /actionVariant\?: "primary" \| "secondary"/)
  assert.match(source, /buttonVariants\(\{ variant: actionVariant === "secondary" \? "outline" : "default", size: "md" \}\)/)
})

test("EmptyNote is one quiet line with no frame, no fill and no default live region", () => {
  const source = read("src/components/ui/empty-note.tsx")
  assert.ok(!isClientModule(source))
  assert.match(source, /"flex items-center gap-2 text-meta text-faint-foreground text-pretty \[&>svg\]:size-4 \[&>svg\]:shrink-0"/)
  assert.match(source, /padded && "px-5 py-4"/)
  assert.match(source, /tone === "clear" \? <Check aria-hidden="true" \/> : null/)
  assert.doesNotMatch(source, /\bborder|\bbg-|text-success|\brole=|aria-live/)
})

test("Notice: warning and danger are boxes, the rest sit inline; the tone lives in the icon and the role at the call site", () => {
  const source = read("src/components/ui/notice.tsx")
  assert.ok(!isClientModule(source))
  assert.match(source, /tone: NoticeTone\n/, "tone is required")
  assert.match(source, /warning: \{ fill: "border-warning-border bg-warning-soft", Icon: toneIcons\.warning, iconColor: "text-warning" \}/)
  assert.match(source, /danger: \{ fill: "border-danger-border bg-danger-soft", Icon: toneIcons\.danger, iconColor: "text-danger" \}/)
  assert.match(source, /info: \{ fill: null, Icon: toneIcons\.info, iconColor: "text-info" \}/)
  assert.match(source, /neutral: \{ fill: null, Icon: toneIcons\.info, iconColor: "text-muted-foreground" \}/)
  assert.match(source, /success: \{ fill: null, Icon: toneIcons\.success, iconColor: "text-success" \}/)
  assert.match(source, /"grid grid-cols-\[20px_minmax\(0,1fr\)\] gap-x-2\.5 rounded-md border px-4 py-3 text-sm text-foreground text-pretty"/)
  assert.match(source, /"flex items-start gap-2 text-sm text-pretty"/)
  assert.match(source, /<span aria-hidden="true" className=\{cn\("flex h-5\.5 shrink-0 items-center", iconColor\)\}>/)
  assert.match(source, /boxed \? \(title \? "text-meta text-muted-foreground" : "text-foreground"\) : "text-muted-foreground"/)
  assert.match(source, /\{\.\.\.props\}/, "role, aria-live, id and data-* pass through to the root")
  assert.doesNotMatch(source, /text-faint-foreground/, "faint text never sits on a status fill")
  assert.doesNotMatch(source, /(?:border|bg)-\w+\/\d+/, "no see-through tints")
  assert.doesNotMatch(source, /\brole=|aria-live/, "the role is written at the call site (9 test files read it there)")
})

test("one icon per tone, each a different shape", () => {
  const source = read("src/components/ui/tone-icons.ts")
  assert.ok(!isClientModule(source))
  assert.doesNotMatch(source, /</, "no JSX")
  assert.match(source, /warning: TriangleAlert,\s*danger: OctagonAlert,\s*info: Info,\s*success: CircleCheck,\s*\} as const/)
})

test("DataFreshnessBanner shows stale data as a warning Notice with a busy refresh Button", () => {
  const source = read("src/components/ui/data-freshness-banner.tsx")
  const stale = source.slice(source.lastIndexOf("  return ("))
  assert.match(source, /import \{ Notice \} from "@\/components\/ui\/notice"/)
  assert.match(stale, /<Notice\s+tone="warning"\s+title=\{labels\.staleTitle\}/)
  assert.match(stale, /<Button variant="outline" size="md" busy=\{refreshing\} onClick=\{refreshData\}>\s*<RefreshCw \/>/)
  assert.match(stale, /className="mb-3"\s*>\s*\{staleHelpText\}\s*<\/Notice>/)
  assert.doesNotMatch(stale, /disabled=|animate-spin|border-warning|<button/, "busy replaces disabled and the hand-written spinner")
  assert.doesNotMatch(source, /AlertTriangle/)
})

test("busy comes from client state, and a busy Button never also gets disabled", () => {
  const offenders: string[] = []
  let busyButtons = 0
  for (const file of sources.filter((entry) => entry.path.endsWith(".tsx"))) {
    for (const tag of buttonOpeningTags(file.source)) {
      if (!/\sbusy[=\s/>]/.test(tag)) continue
      busyButtons += 1
      if (!isClientModule(file.source)) offenders.push(`${file.path}: busy in a server file (its click guard cannot cross to the client)`)
      if (/\sdisabled[=\s/>]/.test(tag)) offenders.push(`${file.path}: busy with disabled drops keyboard focus`)
    }
  }
  assert.ok(busyButtons >= 1, "the guard must see at least one busy Button (DataFreshnessBanner)")
  assert.deepEqual(offenders, [])
})
