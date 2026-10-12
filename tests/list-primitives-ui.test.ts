import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

// Phase 2B list primitives (spec 2B §3, §10.2). Each later 2B-1 primitive task appends its own block below, with its
// own server-safe and class checks. Sources are read with \r stripped, so a regex here may hold \n.
const UI = "src/components/ui/"
const read = (path: string) => (existsSync(path) ? readFileSync(path, "utf8").replace(/\r\n/g, "\n") : "")

// Server-safe primitives (spec 2B §3.2): no client directive, no state, no effect, no context.
const SERVER_SAFE = ["page-header.tsx"]
// Every 2B primitive, client ones included, keeps to the shared class rules (spec 2B §3.2, §3.21 table C).
const PRIMITIVES = [...SERVER_SAFE]

test("the 2B list primitives render on the server", () => {
  for (const name of SERVER_SAFE) {
    assert.ok(existsSync(UI + name), `${UI}${name} is missing`)
    assert.doesNotMatch(read(UI + name), /"use client"|\buseState\b|\buseEffect\b|\bcreateContext\b|\buseContext\b/, name)
  }
})

test("the 2B list primitives keep to the shared class rules", () => {
  for (const name of PRIMITIVES) {
    assert.ok(existsSync(UI + name), `${UI}${name} is missing`)
    assert.doesNotMatch(
      read(UI + name),
      /\bshadow-(?:sm|md|lg|xl|2xl)\b|\bopacity-|\bleading-tight\b|\bleading-4\b|rounded-\[|\bflex-col-reverse\b|\buppercase\b|\bbg-muted\//,
      name,
    )
  }
})

test("PageHeader: one h1 at 600, breadcrumbs 4px above it, a meta row, and buttons that share the title row from md (I1)", () => {
  const source = read(`${UI}page-header.tsx`)
  assert.match(source, /export function PageHeader\(\{ title, meta, actions, back, breadcrumbs, compactOnMobile = false, className \}: PageHeaderProps\)/)
  for (const prop of ["title: ReactNode", "meta\\?: ReactNode", "actions\\?: ReactNode", "back\\?: ReactNode", "breadcrumbs\\?: BreadcrumbItem\\[\\]", "compactOnMobile\\?: boolean", "className\\?: string"]) {
    assert.match(source, new RegExp(`\\n  ${prop}\\n`), prop)
  }
  assert.match(source, /<header data-slot="page-header" className=\{cn\("min-w-0", className\)\}>/)
  assert.doesNotMatch(source.match(/<header\b[^>]*>/)?.[0] ?? "", /\bm[tb]-/, "the header has no outer margin")
  assert.equal(source.match(/<Breadcrumbs\b/g)?.length, 1)
  assert.match(source, /\{breadcrumbs \? <Breadcrumbs items=\{breadcrumbs\} className="mb-1" \/> : null\}/)
  assert.match(
    source,
    /compactOnMobile \? "flex items-center justify-between gap-3 md:items-start md:gap-x-6" : "flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6"/,
  )
  assert.match(source, /<h1 className=\{cn\("text-2xl font-semibold text-balance break-words text-foreground", compactOnMobile && "max-md:text-xl"\)\}>\{title\}<\/h1>/)
  assert.equal(source.match(/<h1\b/g)?.length, 1)
  assert.match(source, /data-slot="page-header-meta" className=\{cn\("mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground", compactOnMobile && "max-md:hidden"\)\}/)
  assert.match(source, /data-slot="page-header-actions" className=\{cn\("flex flex-wrap items-center gap-2 md:justify-end", compactOnMobile && "shrink-0"\)\}>\n\s+\{back\}\n\s+\{actions\}\n/)
  assert.doesNotMatch(source, /\bfont-bold\b|\buseTranslations\b|\bdescription\b|\bflex-1\b/)
})

test("PageBackLink: outline md with a left arrow, a 44px icon button below md whose name is the visible words (I1, B2)", () => {
  const source = read(`${UI}page-header.tsx`)
  assert.match(source, /export type PageBackLinkProps = \{\n(?:  \/\/[^\n]*\n)?  href: string\n(?:  \/\/[^\n]*\n)?  label: string\n(?:  \/\/[^\n]*\n)?  onClick\?: MouseEventHandler<HTMLAnchorElement>\n(?:  \/\/[^\n]*\n)?  className\?: string\n\}/)
  assert.match(
    source,
    /<Link href=\{href\} onClick=\{onClick\} data-slot="page-back-link" className=\{cn\(buttonVariants\(\{ variant: "outline", size: "md" \}\), "min-w-11 max-md:px-0", className\)\}>\n\s+<ArrowLeft aria-hidden="true" \/>\n\s+<span className="max-md:sr-only">\{label\}<\/span>\n\s+<\/Link>/,
  )
  assert.doesNotMatch(source, /aria-label=/)
})

test("MasterDataHeader is a thin wrapper of PageHeader until its last callers move (I2)", () => {
  const layout = read("src/components/master-data/master-data-layout.tsx")
  assert.match(layout, /import \{ buttonVariants \} from "@\/components\/ui\/button"/)
  assert.match(layout, /import \{ PageHeader \} from "@\/components\/ui\/page-header"/)
  assert.match(layout, /<PageHeader\n\s+title=\{title\}\n\s+meta=\{subtitle\}\n\s+compactOnMobile=\{compactOnMobile\}\n/)
  assert.match(layout, /<Link href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<Plus aria-hidden="true" \/>\n\s+\{createLabel\}\n\s+<\/Link>/)
  assert.doesNotMatch(layout, /<h1\b|\bfont-bold\b/)
})
