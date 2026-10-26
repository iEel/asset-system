import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  assetDetailViews,
  buildAssetDetailSectionHref,
  buildAssetDetailViewHref,
  getAssetDetailViewSectionIds,
  isAssetDetailSectionVisible,
  resolveAssetDetailView,
} from "../src/lib/asset-detail-view.ts"

// Group 1 asset detail task 7 (spec 2026-10-25 §7.3): five tabs as TabNav links that keep ?view=, the old names
// still open their new tab (audit with the ตรวจนับ chip), and a section link opens the tab that shows it. Until Tasks
// 8-12 the page shows today's sections under the new tabs. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const overview = { view: "overview", historyType: null }

test("the five tabs in order, and a ?view= value opens its tab: the new names, the three old ones, else the overview", () => {
  assert.deepEqual([...assetDetailViews], ["overview", "history", "components", "files", "maintenance"])
  for (const view of assetDetailViews) assert.deepEqual(resolveAssetDetailView(view), { view, historyType: null })
  assert.deepEqual(resolveAssetDetailView("custody"), { view: "components", historyType: null })
  assert.deepEqual(resolveAssetDetailView("operations"), { view: "history", historyType: null })
  assert.deepEqual(resolveAssetDetailView("audit"), { view: "history", historyType: "audit" })
  assert.deepEqual(resolveAssetDetailView(["audit", "overview"]), { view: "history", historyType: "audit" }, "the first value counts")
  for (const raw of [undefined, "", [], "unknown", "History", "photos", "constructor", "toString", "__proto__"]) {
    assert.deepEqual(resolveAssetDetailView(raw as string | string[] | undefined), overview, String(raw))
  }
})

test("a tab link keeps returnTo and carries no anchor, so the header, the tabs and the facts stay in view", () => {
  assert.equal(
    buildAssetDetailViewHref("th", "asset id/1", "history", "/th/assets?status=ready"),
    "/th/assets/asset%20id%2F1?view=history&returnTo=%2Fth%2Fassets%3Fstatus%3Dready",
  )
  assert.equal(buildAssetDetailViewHref("th", "a1", "overview"), "/th/assets/a1?view=overview")
  assert.equal(buildAssetDetailViewHref("en", "a1", "files", "  "), "/en/assets/a1?view=files")
})

test("each section belongs to exactly one tab: ข้อมูลทรัพย์สิน keeps the overview and purchase anchors, the files tab holds the interim purchase documents (group 1 asset detail task 8)", () => {
  assert.deepEqual(getAssetDetailViewSectionIds("overview"), ["overview", "purchase"])
  assert.deepEqual(getAssetDetailViewSectionIds("history"), [])
  assert.deepEqual(getAssetDetailViewSectionIds("components"), ["components"])
  assert.deepEqual(getAssetDetailViewSectionIds("files"), ["photos", "purchase-documents"])
  assert.deepEqual(getAssetDetailViewSectionIds("maintenance"), ["maintenance"])
  const all = assetDetailViews.flatMap((view) => getAssetDetailViewSectionIds(view))
  assert.deepEqual([...all].sort(), ["components", "maintenance", "overview", "photos", "purchase", "purchase-documents"])
  assert.equal(isAssetDetailSectionVisible("components", "components"), true)
  assert.equal(isAssetDetailSectionVisible("overview", "photos"), false)
})

// Wiki open question 43 (plan 2D-4), on the new tabs: "#id" in the tab that renders the section, else that tab's URL
// with the same returnTo and the section as the anchor. A link from another page (currentView null) always opens the tab.
test("a section link stays in place on its tab and otherwise opens the tab that shows it (spec §7.3: #photos → files, #purchase → overview)", () => {
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "purchase", "/th/assets"), "#purchase")
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "components", "components", "/th/assets"), "#components")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "files", "photos"), "#photos")
  assert.equal(buildAssetDetailSectionHref("th", "asset id/1", "overview", "components", "/th/assets?status=ready"), "/th/assets/asset%20id%2F1?view=components&returnTo=%2Fth%2Fassets%3Fstatus%3Dready#components")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "files", "purchase-documents"), "#purchase-documents")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "purchase-documents", "/th/assets"), "/th/assets/a1?view=files&returnTo=%2Fth%2Fassets#purchase-documents")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "maintenance", ""), "/th/assets/a1?view=maintenance#maintenance")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "overview", "photos", "/th/assets"), "/th/assets/a1?view=files&returnTo=%2Fth%2Fassets#photos")
  assert.equal(buildAssetDetailSectionHref("th", "a1", "history", "purchase", "/th/assets"), "/th/assets/a1?view=overview&returnTo=%2Fth%2Fassets#purchase")
  assert.equal(buildAssetDetailSectionHref("th", "a1", null, "photos"), "/th/assets/a1?view=files#photos")
  assert.equal(buildAssetDetailSectionHref("th", "a1", null, "purchase"), "/th/assets/a1?view=overview#purchase")
})

test("the reports' photo and warranty issues open the files tab and the purchase rows (spec §7.3)", () => {
  const reports = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  assert.match(reports, /^import \{ buildAssetDetailSectionHref \} from "@\/lib\/asset-detail-view"$/m)
  assert.match(reports, /issues\.push\(\{ label: t\("missingPhoto"\), href: buildAssetDetailSectionHref\(locale, asset\.id, null, "photos"\) \}\)/)
  assert.match(reports, /issues\.push\(\{ label: t\("warrantyExpiring"\), href: buildAssetDetailSectionHref\(locale, asset\.id, null, "purchase"\) \}\)/)
  assert.doesNotMatch(reports, /\bdetailHref\b|"#photos"|"#purchase"/)
})

test("the asset page resolves its tab, counts its tabs in the first round of reads, and links photos to the files tab", () => {
  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /^import \{ buildAssetDetailSectionHref, buildAssetDetailViewHref, isAssetDetailSectionVisible, resolveAssetDetailView, type AssetDetailSectionId \} from "@\/lib\/asset-detail-view"$/m)
  assert.match(page, /^import \{ getAssetDetailCounts \} from "@\/lib\/asset-detail-counts"$/m)
  assert.match(page, /const \{ view: assetDetailView, historyType \} = resolveAssetDetailView\(rawSearchParams\.view\)/)
  assert.match(page, /const \[rawAsset, readyStatus, detailCounts\] = await withPerformanceTiming\(\n\s+"asset-detail\.initial-data",/)
  assert.match(page, /\n\s+getAssetDetailCounts\(id\),\n\s+\]\),\n\s+\{ route: "\/assets\/\[id\]", locale \}/)
  assert.match(page, /labels=\{\{\n\s+overview: t\("detailViews\.overview"\),\n\s+history: t\("detailViews\.history"\),\n\s+components: t\("detailViews\.components"\),\n\s+files: t\("detailViews\.files"\),\n\s+maintenance: t\("detailViews\.maintenance"\),\n\s+\}\}/)
  assert.match(page, /const componentsManagerHref = appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{asset\.id\}\/components`, buildAssetDetailViewHref\(locale, asset\.id, "components", returnToHref\)\)/)
  assert.match(page, /const photosHref = sectionHref\("photos"\)/)
  assert.match(page, /uploadHref: photosHref,/)
  assert.doesNotMatch(page, /SidebarPhotoCard|galleryHref/)
  assert.doesNotMatch(page, /parseAssetDetailView|\?view=(?:custody|operations|audit)\b|["`]#photos["`]|detailViews\.(?:custody|operations|audit)\b/)
  const skeleton = read("src/components/ui/page-skeleton.tsx")
  const detail = skeleton.slice(skeleton.indexOf("export function AssetDetailPageSkeleton()"), skeleton.indexOf("export function ReportsPageSkeleton()"))
  assert.match(detail, /<TabNavSkeleton count=\{5\} \/>/, "the skeleton's tab row follows the page (DESIGN.md: same commit)")
  const design = read("DESIGN.md")
  assert.ok(design.includes("The asset page's five tabs (ภาพรวม, ประวัติ, ส่วนควบ, ไฟล์, ซ่อม / PM; `?view=overview|history|components|files|maintenance`"), "DESIGN.md Detail pages")
})
