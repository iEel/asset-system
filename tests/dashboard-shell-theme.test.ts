import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const sidebar = () => readFileSync("src/components/layout/sidebar.tsx", "utf8")
const topbar = () => readFileSync("src/components/layout/topbar.tsx", "utf8")

test("sidebar uses the committed dark navigation tokens", () => {
  const source = sidebar()
  assert.match(source, /bg-sidebar/)
  assert.match(source, /text-sidebar-foreground/)
  assert.match(source, /bg-sidebar-active/)
  assert.match(source, /hover:bg-sidebar-hover/)
  assert.doesNotMatch(source, /border-r-2 border-primary/)
})

test("topbar stays a light operational surface", () => {
  const source = topbar()
  assert.match(source, /bg-surface/)
  assert.match(source, /border-border/)
})
