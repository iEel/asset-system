import assert from "node:assert/strict"
import test from "node:test"
import { cn } from "../src/lib/utils.ts"

// tailwind-merge 3.5 reads unknown text-* names as colors and does not know rounded-control or the theme shadows.
// Every row below fails with a plain twMerge.
test("cn keeps the text color next to the new type sizes", () => {
  assert.equal(cn("text-muted-foreground", "text-meta"), "text-muted-foreground text-meta")
  assert.equal(cn("text-metric", "text-foreground"), "text-metric text-foreground")
  assert.equal(cn("text-meta text-faint-foreground"), "text-meta text-faint-foreground")
  assert.equal(cn("text-meta", "text-danger"), "text-meta text-danger")
})

test("cn lets a later type size replace an earlier one", () => {
  assert.equal(cn("text-sm", "text-meta"), "text-meta")
  assert.equal(cn("text-meta", "text-sm"), "text-sm")
})

test("cn treats rounded-control and the theme shadows like their Tailwind siblings", () => {
  assert.equal(cn("rounded-md", "rounded-control"), "rounded-control")
  assert.equal(cn("shadow-sm", "shadow-field-focus"), "shadow-field-focus")
  assert.equal(cn("shadow-sm", "shadow-overlay"), "shadow-overlay")
})
