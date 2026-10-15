import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-2 (spec 2D D7, M22): the shared chip names a role, a scope, a person or a module. It is neutral (muted fill,
// neutral-ink text), the 22px box of StatusBadge, server-safe, and has no marker, tone, link or button of its own.
test("Chip is the neutral 22px name chip, with no tone, marker or control (spec 2D D7)", () => {
  const source = readFileSync("src/components/ui/chip.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /^export function Chip\(\{ className, children, \.\.\.props \}: React\.ComponentProps<"span">\) \{$/m)
  assert.match(source, /data-slot="chip"/)
  assert.match(source, /"inline-flex h-5\.5 max-w-full min-w-0 items-center rounded-control border border-transparent bg-muted px-2 text-meta font-medium whitespace-nowrap text-neutral-ink"/)
  assert.match(source, /<span className="truncate">\{children\}<\/span>/)
  assert.doesNotMatch(source, /"use client"|useState|tone=|statusMarkerVariants|<button|<Link|onClick|-soft\b/)
})
