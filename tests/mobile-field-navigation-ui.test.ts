import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const navigationSource = () => readFileSync("src/components/layout/mobile-field-navigation.tsx", "utf8")
const shellSource = () => readFileSync("src/components/layout/dashboard-shell.tsx", "utf8")
const topbarSource = () => readFileSync("src/components/layout/topbar.tsx", "utf8")

test("mobile field navigation exposes five labelled Lucide destinations", () => {
  const source = navigationSource()

  for (const icon of ["House", "Package", "ScanLine", "ClipboardCheck", "Ellipsis"]) {
    assert.match(source, new RegExp(`\\b${icon}\\b`))
  }
  assert.match(source, /<nav/)
  assert.match(source, /aria-label=\{t\("mobileNavigationLabel"\)\}/)
  assert.match(source, /aria-current=\{isActive \? "page" : undefined\}/)
  assert.match(source, /min-h-11/)
  assert.match(source, /env\(safe-area-inset-bottom\)/)
})

test("field navigation remains available through the shell tablet breakpoint", () => {
  const navigation = navigationSource()
  const shell = shellSource()

  assert.match(navigation, /lg:hidden/)
  assert.doesNotMatch(navigation, /md:hidden/)
  assert.match(shell, /lg:pb-0/)
  assert.doesNotMatch(shell, /sm:pb-0/)
})

test("mobile field destinations reuse RBAC and employee asset fallback", () => {
  const source = navigationSource()

  assert.match(source, /getMobileFieldDestinations\(locale, user\)/)
  assert.match(source, /onOpenMore/)
})

test("dashboard shell renders exactly one route-owned mobile bottom surface", () => {
  const source = shellSource()

  assert.match(source, /const isNavigationMode = getMobileShellMode\(pathname\) === "navigation"/)
  assert.match(source, /const mobileFieldNavigationVisible = isNavigationMode && !mobileKeyboardVisible && !mobileSidebarOpen/)
  assert.match(source, /mobileNavigationMode=\{isNavigationMode\}/)
  assert.match(source, /<MobileFieldNavigation/)
  assert.match(source, /pb-\[calc\(5\.25rem\+env\(safe-area-inset-bottom\)\)\]/)
  assert.match(source, /window\.visualViewport/)
  assert.match(source, /isMobileVirtualKeyboardVisible/)
})

test("topbar removes duplicate mobile menu and scan controls in navigation mode", () => {
  const source = topbarSource()

  assert.match(source, /mobileNavigationMode/)
  assert.match(source, /mobileNavigationMode && "hidden"/)
  assert.match(source, /hidden[^"\n]*lg:inline-flex/)
})

test("More exposes the existing sidebar state to assistive technology", () => {
  const navigation = navigationSource()
  const shell = shellSource()
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8")

  assert.match(navigation, /sidebarOpen: boolean/)
  assert.match(navigation, /aria-expanded=\{sidebarOpen\}/)
  assert.match(navigation, /aria-controls="mobile-primary-navigation-drawer"/)
  assert.match(shell, /sidebarOpen=\{mobileSidebarOpen\}/)
  assert.match(sidebar, /id="mobile-primary-navigation-drawer"/)
})

test("mobile field navigation labels exist in Thai and English", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    for (const key of [
      "mobileNavigationLabel",
      "mobileHome",
      "mobileAssets",
      "mobileScan",
      "mobileAudit",
      "mobileMore",
    ]) {
      assert.equal(typeof messages.nav[key], "string", key)
      assert.ok(messages.nav[key].length > 0, key)
    }
  }
})
