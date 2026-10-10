import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const sidebar = () => readFileSync("src/components/layout/sidebar.tsx", "utf8")
const topbar = () => readFileSync("src/components/layout/topbar.tsx", "utf8")

test("sidebar uses the light navigation tokens and marks the current page", () => {
  const source = sidebar()
  assert.match(source, /bg-sidebar\b/)
  assert.match(source, /text-sidebar-foreground/)
  assert.match(source, /bg-sidebar-active/)
  assert.match(source, /text-sidebar-active-foreground/)
  assert.match(source, /text-sidebar-active-icon/)
  assert.match(source, /border-sidebar-border/)
  assert.match(source, /hover:bg-sidebar-hover/)
  assert.match(source, /focus-visible:ring-offset-sidebar/)
  assert.match(source, /aria-current=\{isActive \? "page" : undefined\}/)
  assert.match(source, /getActiveNavigationHref\(/)
  assert.match(source, /filterNavigationSectionsByPermission\(menuSections, user\)/)
  assert.match(source, /t\("brandName"\)/)
  assert.match(source, /src="\/icons\/icon-192\.png"/)
  for (const key of ["sectionDaily", "sectionAssets", "sectionSystem"]) {
    assert.match(source, new RegExp(`labelKey: "${key}"`))
  }
  assert.doesNotMatch(source, /border-white\/|text-white|text-brand-accent|ring-brand-accent|focus-visible:ring-inset/)
  assert.doesNotMatch(source, /border-r-2 border-primary/)
})

test("topbar stays a light operational surface", () => {
  const source = topbar()
  assert.match(source, /bg-surface/)
  assert.match(source, /border-border/)
})
