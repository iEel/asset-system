import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { readSourceFiles } from "./helpers/source-files.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const breadcrumbs = () => read("src/components/ui/breadcrumbs.tsx")
const commonMessages = (locale: "th" | "en") =>
  (JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { common: Record<string, string> }).common
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

test("breadcrumbs are a translated, server-rendered ordered list that marks the current page", () => {
  const source = breadcrumbs()
  assert.doesNotMatch(source, /"use client"/)
  assert.match(source, /const t = useTranslations\("common"\)/)
  assert.match(source, /<nav aria-label=\{t\("breadcrumb"\)\}/)
  assert.doesNotMatch(source, /"Breadcrumb"/)
  assert.match(source, /<ol className="flex flex-wrap items-center gap-1">/)
  assert.match(source, /<li key=\{`\$\{item\.label\}-\$\{index\}`\} className="flex min-w-0 items-center gap-1">/)
  assert.match(source, /<span aria-current="page"/)
  assert.doesNotMatch(source, /\btruncate\b/, "long labels wrap and codes are never cut")
})

test("breadcrumbs use the meta size, faint ink, the tag style for codes and a thin chevron", () => {
  const source = breadcrumbs()
  assert.match(source, /export type BreadcrumbItem = \{\n  label: string\n  href\?: string\n[^}]*  code\?: boolean\n\}/)
  assert.match(source, /export function Breadcrumbs\(\{ items, className \}: \{ items: BreadcrumbItem\[\]; className\?: string \}\)/)
  assert.match(source, /className=\{cn\("min-w-0 text-meta text-faint-foreground", className\)\}/)
  assert.match(source, /<span aria-current="page" className=\{cn\("font-medium text-foreground", item\.code && "tag"\)\}>/)
  assert.match(source, /<Link href=\{item\.href\} className="hover:text-foreground hover:underline underline-offset-3">/)
  // Inside a link the tag sits on an inner span: the tag utility resets user-select only for a .tag inside <a>.
  assert.match(source, /\{item\.code \? <span className="tag">\{item\.label\}<\/span> : item\.label\}/)
  assert.match(source, /<ChevronRight className="size-3 shrink-0 text-input" strokeWidth=\{3\} \/>/)
  assert.doesNotMatch(source, /\btext-sm\b|text-muted-foreground|hover:text-primary|h-3\.5/)
})

test("every record page ends its breadcrumb trail on a code; the create and list pages do not", () => {
  // A trail is a <Breadcrumbs /> element or the breadcrumbs={[…]} prop of PageHeader, which renders the one
  // <Breadcrumbs /> inside src/components/ui/page-header.tsx (spec 2B R-i). Both forms end in "]}".
  const sites = readSourceFiles("src")
    .filter((file) => file.path !== "src/components/ui/page-header.tsx")
    .flatMap((file) =>
      [...file.source.matchAll(/<Breadcrumbs\b[\s\S]*?\/>|\bbreadcrumbs=\{\[[\s\S]*?\]\}/g)].map((match) => ({ path: file.path, element: match[0].replace(/\s+/g, " ") })),
    )
  assert.equal(sites.length, 11, "Breadcrumbs call sites")
  assert.equal(sites.filter((site) => /code: true/.test(site.element)).length, 8, "call sites that mark a code")

  const base = "src/app/[locale]/(dashboard)/"
  const lastCode: Record<string, string> = {
    "assets/[id]/page.tsx": "asset.assetTag",
    "audit/rounds/[id]/page.tsx": "round.auditNo",
    "disposal/[id]/page.tsx": "disposalRequest.disposalNo",
    "disposal/batches/[id]/page.tsx": "batch.batchNo",
    "maintenance/[id]/page.tsx": "ticket.repairNo",
    "maintenance/pm/[id]/edit/page.tsx": "plan.planNo",
    "master-data/employees/[id]/page.tsx": "employee.code",
    "master-data/suppliers/[id]/page.tsx": "supplier.code",
  }
  for (const [file, expression] of Object.entries(lastCode)) {
    const site = sites.find((candidate) => candidate.path === base + file)
    assert.ok(site, `no Breadcrumbs in ${file}`)
    assert.match(site.element, new RegExp(`\\{ label: ${escapeRegExp(expression)}, code: true \\},? ?\\]\\}`), file)
    assert.equal(site.element.match(/code: true/g)?.length, 1, `${file}: only the last item is a code`)
  }
  for (const file of ["maintenance/new/page.tsx", "maintenance/pm/new/page.tsx", "maintenance/pm/page.tsx"]) {
    const site = sites.find((candidate) => candidate.path === base + file)
    assert.ok(site, `no Breadcrumbs in ${file}`)
    assert.doesNotMatch(site.element, /code:/, `${file} ends on a page title, not a code`)
  }
})

test("breadcrumb, empty-value and baht words exist in Thai and English", () => {
  const th = commonMessages("th")
  const en = commonMessages("en")
  assert.equal(th.breadcrumb, "เส้นทางหน้า")
  assert.equal(en.breadcrumb, "Breadcrumb")
  assert.equal(th.noValue, "ไม่มีข้อมูล")
  assert.equal(en.noValue, "None")
  assert.equal(th.baht, "บาท")
  assert.equal(en.baht, "THB")
  assert.notEqual(th.noValue, th.noData, "noValue (nothing recorded) and noData (nothing found) stay separate")
})
