import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const footer = () => readFileSync("src/components/ui/sticky-form-footer.tsx", "utf8").replace(/\r\n/g, "\n")

test("StickyFormFooter is a server-safe save bar that sticks to the bottom of the scroll area (K14, I22)", () => {
  const source = footer()
  assert.doesNotMatch(source, /"use client"|\buse(?:State|Effect|LayoutEffect|Ref|Context|Id)\b|createContext/, "no directive and no hook: server pages may render it")
  assert.match(source, /type StickyFormFooterProps = React\.ComponentProps<"div"> & \{\s*\/\*\*[^*]*\*\/\s*status\?: React\.ReactNode\s*\}/)
  assert.match(source, /export function StickyFormFooter\(\{ status, className, children, \.\.\.props \}: StickyFormFooterProps\)/)
  assert.match(source, /data-slot="sticky-form-footer"/)
  // -bottom-4 sm:-bottom-6 and -mx-4 sm:-mx-6 cancel the padding of main (layout/dashboard-shell.tsx), as the audit scan search does with -top-4 sm:-top-6.
  assert.match(
    source,
    /cn\(\s*"sticky -bottom-4 z-10 -mx-4 border-t border-border bg-canvas px-4 pt-3 pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\] sm:-bottom-6 sm:-mx-6 sm:px-6",\s*className,\s*\)/,
  )
  assert.match(source, /\{\.\.\.props\}/)
  assert.match(source, /<div className="flex flex-col gap-3 sm:flex-row sm:items-center">/)
  assert.match(source, /\{status \? <div className="min-w-0 flex-1 text-meta text-muted-foreground">\{status\}<\/div> : null\}/)
  assert.match(source, /<div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">\{children\}<\/div>/)
})

test("StickyFormFooter is flat, keeps the DOM button order and blends into the canvas", () => {
  const source = footer()
  // Full-bleed sticky bars use the canvas fill (DESIGN.md §2, visual-foundation-guards "full-bleed bars blend into the canvas").
  assert.doesNotMatch(source, /\bbg-surface\b|\bshadow-|\bfixed\b|backdrop-blur|\brounded-|flex-col-reverse/)
})
