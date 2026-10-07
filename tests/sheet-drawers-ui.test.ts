import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("sheet close button is labelled and touch sized", () => {
  const source = read("src/components/ui/sheet.tsx")
  assert.match(source, /closeLabel = "Close"/)
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /min-h-11 min-w-11/)
  assert.doesNotMatch(source, /dark:/)
})

test("activity and evidence drawers are Radix sheets that can be opened from outside", () => {
  for (const path of ["src/components/ui/activity-drawer.tsx", "src/components/assets/asset-evidence-drawer.tsx"]) {
    const source = read(path)
    assert.match(source, /<SheetContent[\s\S]*?side="right"/, path)
    assert.match(source, /controlledOpen \?\? uncontrolledOpen/, path)
    assert.match(source, /hideTrigger/, path)
    assert.match(source, /returnFocusRef\?\.current/, path)
    assert.doesNotMatch(source, /fixed inset-0|aria-label="Close"/, path)
  }
})

test("evidence drawer keeps its wide panel", () => {
  assert.match(read("src/components/assets/asset-evidence-drawer.tsx"), /sm:max-w-2xl/)
})

test("mobile navigation drawer is a left sheet; desktop sidebar stays static", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(sidebar, /<SheetContent[\s\S]*?side="left"[\s\S]*?id="mobile-primary-navigation-drawer"/)
  assert.match(sidebar, /<SheetTitle className="sr-only">/)
  assert.match(sidebar, /hidden[^"]*lg:flex/)
  assert.doesNotMatch(shell, /fixed inset-0 z-30 bg-black\/50|addEventListener\("keydown"/)
})

test("mobile navigation sheet returns focus to whatever opened it", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  assert.match(sidebar, /onOpenAutoFocus=\{\(\) => \{\s*mobileRestoreFocusRef\.current = document\.activeElement instanceof HTMLElement \? document\.activeElement : null/)
  assert.match(sidebar, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?isConnected[\s\S]*?event\.preventDefault\(\)[\s\S]*?\.focus\(\)/)
})
