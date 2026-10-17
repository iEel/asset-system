import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-5 (spec 2D §1, §3.5): the fixes handed to the last plan of 2D, one test per commit, each failing before its
// commit: the asset state help's phone target, two-line StatStrip feet, the dashboard skeleton, the settings labels no
// one read, words instead of English codes on the settings screens, Thai loading and result lines, export links that
// download and the message keys no code reads. Sources are read with LF line endings, so the regexes may contain \n.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const C = "src/components/"
const D = "src/app/[locale]/(dashboard)/"

test("the asset state help trigger stays a 24px circle and gets a 44px hit area below md (the user, 2026-10-17)", () => {
  const source = read(`${C}assets/asset-state-help-popover.tsx`)
  const trigger = source.match(/<button\b[\s\S]*?className="([^"]+)"/)?.[1].split(/\s+/) ?? []
  // Below md: 10 + 24 + 10 = 44px wide and 16 + 24 + 4 = 44px tall. The box stops 4px under the circle, where the
  // field's own control starts (a 20px label row, the circle's -2px margins, the field's 6px gap). From md it is off.
  for (const token of ["inline-flex", "h-6", "w-6", "rounded-full", "relative", "after:absolute", "after:-inset-x-2.5", "after:-top-4", "after:-bottom-1", "md:after:hidden"]) {
    assert.ok(trigger.includes(token), `trigger class ${token}`)
  }
  assert.doesNotMatch(source, /\b(?:min-h-11|min-w-11|size-11|h-11|w-11)\b|-m-2\.5|-mx-2\.5|-my-2\.5/, "the circle itself does not grow or shift")
  assert.equal(source.match(/<button\b/g)?.length, 1, "still one raw button (plan 2D-3 R5)")
  // Every caller stays as it is: two field labels each in the asset form and the register filter sheet, the asset page
  // header and the register table head (shown from md only, where the hit area is off).
  const callers: Array<[string, number]> = [
    [`${C}assets/asset-form.tsx`, 2],
    [`${C}assets/asset-register-filter-sheet.tsx`, 2],
    [`${D}assets/[id]/page.tsx`, 2],
    [`${C}assets/asset-register-table.tsx`, 1],
  ]
  for (const [path, count] of callers) assert.equal(read(path).match(/<AssetStateHelpPopover \{\.\.\.\w+\} \/>/g)?.length, count, path)
})

test("a StatStrip foot wraps to two lines before its ellipsis, and the label, value and foot rows stay aligned (the user, 2026-10-17)", () => {
  const source = read(`${C}ui/stat-strip.tsx`)
  assert.match(source, /<span className="line-clamp-2 break-words" title=\{item\.footTitle\}>\{item\.foot\}<\/span>/)
  assert.doesNotMatch(source, /className="truncate"/, "no one-line cut")
  // The warning icon sits in a 20px box (the 13/20 line): centred on the first line however many lines follow.
  assert.match(source, /cn\("flex min-w-0 items-start gap-1 text-meta", item\.attention \? "text-warning" : "text-faint-foreground"\)/)
  assert.match(source, /<span className="flex h-5 shrink-0 items-center">\s*<AttentionIcon className="size-3\.5" aria-hidden="true" \/>\s*<\/span>/)
  // Unchanged: the subgrid of three rows per cell, so a two-line foot lowers the whole row of feet, never a value.
  assert.match(source, /const statClasses = "group relative row-span-3 grid grid-rows-subgrid /)
  assert.match(source, /lg:grid-rows-\[repeat\(3,auto\)\]/)
})

test("the dashboard skeleton has the page's shape: totals as 4 + 3, three panels of numbers, then status beside activity (plan 2D-2 R14)", () => {
  const source = read(`${C}ui/page-skeleton.tsx`)
  const dashboard = source.slice(source.indexOf("export function DashboardPageSkeleton()"), source.indexOf("export function AssetRegisterPageSkeleton()"))
  // In page order: the seven totals (4 + 3), the action counts with their foot lines (3 + 3), the four cross-scope
  // counts over their preview, the four monthly trends with their foot lines.
  const strips = [...dashboard.matchAll(/<MetricGridSkeleton count=\{(\d+)\}( foot)? \/>/g)].map((match) => `${match[1]}${match[2] ?? ""}`)
  assert.deepEqual(strips, ["4", "3", "3 foot", "3 foot", "4", "4 foot"])
  assert.equal(dashboard.match(/<PanelSkeleton description>/g)?.length, 3, "the action, cross-scope and trend panels have a description")
  assert.equal(dashboard.match(/<PanelSkeleton>/g)?.length, 2, "the status overview and the recent activity")
  assert.match(dashboard, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">/, "status beside activity from lg, as on the page")
  assert.match(source, /function PanelSkeleton\(\{ description = false, children \}: \{ description\?: boolean; children: ReactNode \}\)/)
  assert.match(source, /<div className="rounded-lg border border-border bg-surface p-4 sm:p-5">\s*<SkeletonBlock className="h-6 w-48 max-w-full" \/>/, "a ContentPanel frame and its title")
  assert.match(source, /\{foot \? <SkeletonBlock className="h-4 w-32 max-w-full" \/> : null\}/, "a StatStrip foot line")
  assert.doesNotMatch(dashboard, /count=\{5\}|md:grid-cols-4|p-5"/, "the old five-tile grid and its box of four cards are gone")
})

const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the settings page passes only labels its form reads: the four it never read and their messages are gone (plan 2D-2 R14)", () => {
  const page = read(`${D}admin/settings/page.tsx`)
  const form = read(`${C}admin/system-settings-form.tsx`)
  for (const name of ["generalSettings", "selectCategory", "accountingDepreciationPolicy", "ldapSyncSchedulePreset"]) {
    assert.doesNotMatch(page, new RegExp(`\\b${name}: t\\("${name}"\\)`), `page passes ${name}`)
    assert.doesNotMatch(form, new RegExp(`\\n\\s+${name}: string\\n`), `form labels type has ${name}`)
    assert.doesNotMatch(form, new RegExp(`labels\\.${name}\\b`), `form reads labels.${name}`)
    for (const locale of ["th", "en"] as const) assert.equal(messages(locale).systemSettingsPage[name], undefined, `${locale}: systemSettingsPage.${name}`)
  }
  // Their neighbours stay: the description the form does read, the schedule label and the advanced settings list.
  assert.match(page, /accountingDepreciationPolicyDescription: t\("accountingDepreciationPolicyDescription"\)/)
  assert.match(form, /\{labels\.accountingDepreciationPolicyDescription\}/)
  assert.match(page, /ldapSyncSchedule: t\("ldapSyncSchedule"\)/)
  assert.match(form, /const generalSettings = settings\.filter\(/)
})
