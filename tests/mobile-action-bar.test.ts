import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  const source = readFileSync("src/components/ui/mobile-action-bar.tsx", "utf8")

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
  assert.match(source, /role="group"\n\s+aria-label=\{label\}\n\s+data-slot="action-bar"\n\s+className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] pt-3 md:hidden"/)
  assert.match(source, /<div className="mx-auto grid min-w-0 max-w-lg gap-2">\n\s+\{primaryAction \? <div className="min-w-0 \[&>button\]:w-full">\{primaryAction\}<\/div> : null\}/)
  assert.match(source, /const visibleActions = actions\.slice\(0, primaryAction \? 3 : 4\)/)
  assert.match(source, /const className = cn\(buttonVariants\(\{ variant: action\.primary \? "default" : "outline", size: "sm" \}\), "min-w-0 px-2"\)/)
  assert.match(source, /<a key=\{action\.label\} role="link" aria-disabled="true" className=\{className\}>/)
  assert.match(source, /<Link key=\{action\.label\} href=\{action\.href\} className=\{className\}>/)
  assert.equal(source.match(/<span className="min-w-0 truncate">\{action\.label\}<\/span>/g)?.length, 2)
  assert.doesNotMatch(source, /<a\b[^>]*\bhref=|<span[^>]*aria-disabled|leading-tight|text-xs|bg-muted|text-white|shadow-|backdrop-blur/)
})
