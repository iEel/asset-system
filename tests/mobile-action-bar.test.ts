import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { getMobileActionGridClass } from "../src/lib/mobile-action-layout.ts"

test("mobile action grid expands one to four visible actions across the available width", () => {
  assert.equal(getMobileActionGridClass(0), "grid-cols-1")
  assert.equal(getMobileActionGridClass(1), "grid-cols-1")
  assert.equal(getMobileActionGridClass(2), "grid-cols-2")
  assert.equal(getMobileActionGridClass(3), "grid-cols-3")
  assert.equal(getMobileActionGridClass(4), "grid-cols-4")
  assert.equal(getMobileActionGridClass(8), "grid-cols-4")
})

test("mobile action bar derives its grid from visible actions", () => {
  const source = readFileSync("src/components/ui/action-bar.tsx", "utf8")

  assert.match(source, /getMobileActionGridClass\(visibleActions\.length\)/)
  assert.doesNotMatch(source, /className="grid min-w-0 grid-cols-4 gap-2"/)
})

// Phase 2C batch 5 (spec 2C §3.15, §6.10, I23, K23): one ActionBar for the four detail pages. No directive and no hook
// (the pages are server components); a named group; links with the shared button look at size sm (44px below md and
// 13/20 text, instead of text-xs leading-tight); a disabled item that still reads as a link; and the page padding that
// goes with the bar, the home indicator included. Read with \r stripped: the worktree is CRLF.
test("ActionBar is one server-safe bar of shared button links, with the page padding it needs (K23)", () => {
  const source = readFileSync("src/components/ui/action-bar.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Context|Ref)\b/)
  assert.match(source, /export type ActionBarLink = \{\n  label: string\n  href: string\n  icon\?: React\.ReactNode\n  primary\?: boolean\n  disabled\?: boolean\n\}/)
  assert.match(source, /export const actionBarPagePadding = \{\n  single: "pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\] md:pb-0",\n  withPrimary: "pb-\[calc\(9rem\+env\(safe-area-inset-bottom\)\)\] md:pb-0",\n\} as const/)
  assert.match(source, /role="group"\n\s+aria-label=\{label\}\n\s+data-slot="action-bar"\n\s+className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] pt-3 md:hidden /)
  assert.match(source, /<div className=\{cn\("mx-auto grid min-w-0 max-w-lg gap-2", primaryAction && "[^"]+"\)\}>\n\s+\{primaryAction \? <div className="min-w-0 \[&>button\]:w-full">\{primaryAction\}<\/div> : null\}/)
  assert.match(source, /const visibleActions = actions\.slice\(0, \(primaryAction \? 3 : 4\) - \(moreSlot \? 1 : 0\)\)/)
  assert.match(source, /const className = cn\(buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\), "min-w-0 px-2", moreSlot && \(action\.primary \? "flex-2" : "flex-1"\)\)/)
  assert.match(source, /<a key=\{action\.label\} role="link" aria-disabled="true" className=\{className\}>/)
  assert.match(source, /<Link key=\{action\.label\} href=\{action\.href\} className=\{className\}>/)
  assert.equal(source.match(/<span className="min-w-0 truncate">\{action\.label\}<\/span>/g)?.length, 2)
  assert.doesNotMatch(source, /<a\b[^>]*\bhref=|<span[^>]*aria-disabled|leading-tight|text-xs|bg-muted|text-white|shadow-|backdrop-blur/)
})

// Group 1 asset detail task 6 (spec 2026-10-25 §7.8): ActionBar's more slot, which DESIGN.md left to phase 3. With a
// group that holds an item, the row is one line: the links, a primary one twice as wide as an outline one, then the ⋯ of
// RowActions as an outline button named by more.label, which always opens RowActions' bottom sheet (the record's code
// as its title), where an unavailable item reads its reason. ⋯ takes one link's place, and stands alone when there is no
// link (a viewer's bar). The bar stays server-safe: it renders the client RowActions and holds no hook of its own.
test("ActionBar: an optional more slot, the last button of its row, opens RowActions' bottom sheet (spec §7.8)", () => {
  const source = readFileSync("src/components/ui/action-bar.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^import \{ RowActions, type RowActionGroup \} from "@\/components\/ui\/row-actions"$/m)
  assert.match(source, /export type ActionBarMore = \{\n  label: string\n  code: string\n  name\?: string\n  groups: readonly RowActionGroup\[\]\n  openerRef\?: React\.RefObject<HTMLElement \| null>\n\}/)
  assert.match(source, /\n  primaryAction\?: React\.ReactNode\n  more\?: ActionBarMore\n\}\) \{/)
  assert.match(source, /const moreSlot = more\?\.groups\.some\(\(group\) => group\.items\.length > 0\) \? more : null/)
  assert.match(source, /<div className=\{moreSlot \? "flex min-w-0 justify-end gap-2" : cn\("grid min-w-0 gap-2", getMobileActionGridClass\(visibleActions\.length\)\)\}>/)
  assert.match(
    source,
    /\{moreSlot \? (?:\(\n\s+)?<RowActions code=\{moreSlot\.code\} name=\{moreSlot\.name\} menuLabel=\{moreSlot\.label\} groups=\{moreSlot\.groups\} openerRef=\{moreSlot\.openerRef\} menu="sheet" triggerVariant="outline" className="shrink-0" \/>(?:\n\s+\))? : null\}/,
  )
  assert.ok(source.indexOf("<RowActions ") > source.indexOf("visibleActions.map("), "⋯ is the last control of the row")
  assert.equal(source.match(/<RowActions /g)?.length, 1)
  assert.doesNotMatch(source, /\breturn null\b/, "no early return: a bar of ⋯ alone (the viewer's) still draws")
})

test("DESIGN.md, docs/14 and design.json describe ActionBar's more slot and the outline ⋯ (group 1 asset detail task 6)", () => {
  const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
  const design = read("DESIGN.md")
  const bar = design.slice(design.indexOf("\n- **`ActionBar`**"), design.indexOf("\n- **Bottom space:**"))
  assert.ok(!bar.includes("waits for phase 3"), "the ⋯ no longer waits for phase 3")
  for (const phrase of [
    "A bar may end in ⋯ through `more`",
    "an `outline` `icon-sm` button (44px) named by `more.label`",
    "always opens the `RowActions` bottom sheet",
    "each unavailable one with its reason",
    "`more.openerRef`",
    "at most three links and ⋯ (two links under a `primaryAction`)",
    "twice the width of an outline one",
    "A bar may hold ⋯ alone",
  ]) assert.ok(bar.includes(phrase), phrase)
  assert.ok(design.includes("⋯ is a `ghost` `icon-sm` button (`triggerVariant=\"outline\"` for the ⋯ of an `ActionBar`, beside the bar's outline links) named"), "RowActions")
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = (start: string) => index.slice(index.indexOf(start), index.indexOf("\n", index.indexOf(start) + 1))
  assert.ok(row("\n| A phone action bar on a detail page | `ActionBar`").includes("`more` ends the row with ⋯"))
  assert.ok(row("\n| A next step and more actions in a table row | `RowActions`").includes("`triggerVariant=\"outline\"` only for the ⋯ of an `ActionBar`'s `more`"))
  const json = JSON.parse(read(".impeccable/design.json")) as { components: Array<{ name: string; description: string }> }
  assert.match(json.components.find((entry) => entry.name === "Row Actions")?.description ?? "", /In a phone ActionBar the same ⋯ is an outline icon button that always opens the bottom sheet\.$/)
})

// Phase 2C batch 5 (spec 2C §6.10, §6.11 table B, O11, K23): the four detail pages render ActionBar, named by
// tCommon("actions") ("การดำเนินการ"), and pad their root with actionBarPagePadding, so the bar and its room change in
// one place. The disposal request's first link is the primary button only when no next-step button sits above it.
// The repair page's bar drops its back item, because the header's PageBackLink shows at every width; the audit round
// keeps it, because its header has no back link (2B spec §4.6.4). The two old bars are gone. The asset page's bar lives
// in its client part, asset-detail-actions.tsx, beside "อื่น ๆ" and the dialogs it opens (group 1 asset detail task 8).
test("the four detail pages use ActionBar with its page padding, and the two old bars are gone (K23, O11)", () => {
  assert.equal(existsSync("src/components/ui/mobile-action-bar.tsx"), false)
  assert.equal(existsSync("src/components/disposal/disposal-mobile-action-bar.tsx"), false)
  const page = (route: string) => readFileSync(`src/app/[locale]/(dashboard)/${route}/page.tsx`, "utf8").replace(/\r\n/g, "\n")
  const pages: Record<string, [string, RegExp]> = {
    "assets/[id]": [page("assets/[id]"), /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/],
    "maintenance/[id]": [page("maintenance/[id]"), /<div className=\{`space-y-6 \$\{actionBarPagePadding\.single\}`\}>/],
    "disposal/[id]": [page("disposal/[id]"), /<div className=\{`space-y-6 \$\{actionBarPagePadding\.withPrimary\}`\}>/],
    "audit/rounds/[id]": [page("audit/rounds/[id]"), /<div className=\{actionBarPagePadding\.single\}>/],
  }
  for (const [route, [source, root]] of Object.entries(pages)) {
    assert.match(source, root, route)
    if (route === "assets/[id]") continue
    assert.match(source, /^import \{ ActionBar, actionBarPagePadding \} from "@\/components\/ui\/action-bar"$/m, route)
    assert.match(source, /<ActionBar\s+label=\{tCommon\("actions"\)\}/, route)
    assert.doesNotMatch(source, /MobileActionBar|\bpb-(?:24|36)\b/, route)
  }
  const asset = pages["assets/[id]"][0]
  assert.match(asset, /^import \{ actionBarPagePadding \} from "@\/components\/ui\/action-bar"$/m)
  const assetActions = readFileSync("src/components/assets/detail/asset-detail-actions.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(assetActions, /^import \{ ActionBar, type ActionBarLink \} from "@\/components\/ui\/action-bar"$/m)
  assert.match(assetActions, /<ActionBar\s+label=\{tCommon\("actions"\)\}/)
  assert.doesNotMatch(asset + assetActions, /MobileActionBar|\bpb-(?:24|36)\b/)
  const [disposal] = pages["disposal/[id]"]
  assert.match(disposal, /<ActionBar\n\s+label=\{tCommon\("actions"\)\}\n\s+primaryAction=\{nextActionControl\}\n/)
  assert.match(disposal, /label: t\("openAsset"\), icon: <FileText className="h-4 w-4" \/>, primary: !nextActionControl \}/)
  assert.doesNotMatch(pages["maintenance/[id]"][0], /label: tCommon\("back"\)|ArrowLeft/, "the repair header's PageBackLink is its one back control")
  assert.match(pages["audit/rounds/[id]"][0], /\{ href: returnToHref, label: tCommon\("back"\), icon: <ArrowLeft className="h-4 w-4" \/> \}/, "the audit round header has no back link, so its bar keeps one")
})
