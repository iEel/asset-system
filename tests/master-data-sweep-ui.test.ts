import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Plan 2D-3 (spec 2D §3.3, D7, D9, M7, M21, M22, M25, M29, M32 a, M33): the master-data lists, detail pages and forms
// on the shared parts. The drill-down counts are text links with a 44px phone target, the active state is a
// StatusBadge (M7), panels are ContentPanel (or the panel classes where the element cannot be one). Each test pins one
// file (or one tight pair) and fails before that commit. Sources are read with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const D = "src/app/[locale]/(dashboard)/"
// The 2D-2 precedent (reports, work center): a stand-alone text link adds the 44px phone target at the call site.
const drilldownLink = /className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g

test("branches list: drill-down counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/branches/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("categories list: the model and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/categories/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("companies list: the branch and asset counts are text links with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/companies/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 2)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("departments list: the active state is a StatusBadge (spec 2D M7)", () => {
  const source = read(`${D}master-data/departments/page.tsx`)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("employees list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/employees/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("locations list: the asset count is a text link with a 44px phone target, and the active state is a StatusBadge (spec 2D M7, §3.3)", () => {
  const source = read(`${D}master-data/locations/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|\bh-8\b|className="px-2"/)
})

test("brands page: drill-down text links, the panel frame on the picker and the duplicates, the workspace a ContentPanel, an md create button (2D-1 R3) and a StatusBadge (spec 2D M7, D9)", () => {
  const source = read(`${D}master-data/brands/page.tsx`)
  assert.equal(source.match(drilldownLink)?.length, 1, "the model table's asset count")
  assert.equal(source.match(/className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}/g)?.length, 2, "the picker's model and asset counts (13px)")
  assert.match(source, /<aside className=\{cn\(getPanelClasses\(\), "overflow-hidden lg:sticky lg:top-4 lg:self-start"\)\}>/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("modelWorkspaceTitle"\)\}/)
  assert.match(source, /<details className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<Link href=\{createModelHref\} className=\{buttonVariants\(\{ variant: "outline", size: "md" \}\)\}>/)
  assert.match(source, /<StatusBadge label=\{tCommon\("active"\)\} tone="success" \/>/)
  assert.equal(source.match(/aria-current=\{/g)?.length, 2, "LN1 stays 2 (I11)")
  assert.doesNotMatch(source, /ActiveBadge|hover:bg-primary-soft|hover:bg-accent|\bh-[78]\b|className="px-2"|size: "lg"|bg-warning-soft|\btext-xs\b|text-lg|rounded-lg border/)
})

test("suppliers list: the asset count is a text link with a 44px phone target, frames are the panel classes and the phone cards quiet groupings with a KeyValueList (spec 2D D9, D19, §3.3)", () => {
  const page = read(`${D}master-data/suppliers/page.tsx`)
  const list = read("src/components/master-data/supplier-list-view.tsx")
  assert.match(page, /<details className=\{cn\(getPanelClasses\(\), "md:hidden"\)\} open=\{hasActiveFilters\}>/)
  assert.equal(list.match(drilldownLink)?.length, 1, "the desktop asset count")
  assert.match(list, /<ContentPanel>\n\s+<ActionEmptyState/)
  assert.match(list, /<div className=\{cn\(getPanelClasses\(\), "overflow-hidden"\)\}>/)
  assert.match(list, /<article key=\{supplier\.id\} className="min-w-0 rounded-md border border-border bg-background p-3">/)
  assert.equal(list.match(/<KeyValueList\b/g)?.length, 1, "the phone card's contact and phone")
  assert.doesNotMatch(page + list, /rounded-lg border|hover:bg-primary-soft|\btext-xs\b|className="px-2"|<dl\b/)
})

test("supplier page: sections are ContentPanels, follow-ups a warning Notice or a clear EmptyNote, rows quiet, and an empty purchase document total is Nil (spec 2D D7, D9, D19, M32 a)", () => {
  const page = read(`${D}master-data/suppliers/[id]/page.tsx`)
  const documents = read("src/components/master-data/supplier-purchase-documents.tsx")
  assert.equal(page.match(/<ContentPanel\b/g)?.length, 5, "profile, follow-up, assets, purchase documents, maintenance")
  assert.match(page, /<EmptyNote tone="clear">\{t\("noFollowUp"\)\}<\/EmptyNote>/)
  assert.match(page, /<Notice tone="warning">\n\s+<ul className="list-disc space-y-1 pl-5">/)
  assert.match(page, /<Link href=\{hrefs\.assets\} className=\{cn\(linkVariants\(\), "inline-flex min-h-11 items-center md:min-h-0"\)\}>/)
  assert.match(page, /totalAmount: document\.totalAmount == null \? null : Number\(document\.totalAmount\),/)
  assert.match(documents, /totalAmount: number \| null/)
  assert.match(documents, /<DataTable data-supplier-documents-desktop framed=\{false\} className="hidden md:block">/)
  assert.match(documents, /<article key=\{document\.id\} className="min-w-0 rounded-md border border-border bg-background p-3">/)
  assert.equal(documents.match(/<KeyValueList\b/g)?.length, 1)
  assert.doesNotMatch(page + documents, /function (?:SectionTitle|DocumentFact)\b|rounded-lg border|bg-(?:success|warning)-soft|hover:bg-accent|\btext-xs\b|document\.totalAmount \?\? 0/)
})

test("employee page: sections are ContentPanels, follow-ups warning Notices, empties EmptyNote, codes tag, table links text links and quiet row links (spec 2D D7, D9, M21, M33)", () => {
  const source = read(`${D}master-data/employees/[id]/page.tsx`)
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 8)
  assert.match(source, /<Notice key=\{item\} tone="warning" title=\{t\(`followUp\.\$\{item\}\.title`\)\}>/)
  assert.equal(source.match(/<EmptyNote>/g)?.length, 2, "no subordinates, and an empty mini list")
  assert.equal(source.match(/className=\{linkVariants\(\{ size: "inherit" \}\)\}/g)?.length, 4, "the four table links")
  assert.equal(source.match(/className=\{quietRowLinkClasses\}/g)?.length, 2, "the subordinate and mini list rows, on the shared row hover")
  assert.match(source, /<span className="tag">\{subordinate\.code\}<\/span>/)
  assert.doesNotMatch(source, /function SectionHeading\b|rounded-lg border|border-dashed|bg-warning-soft|hover:bg-primary-soft|hover:border-primary-border|hover:underline|\btext-xs\b|\btext-lg\b/)
})

test("asset model form: the form on the panel classes, the photo panel a ContentPanel, empties EmptyNote, the save-first note a neutral Notice, and no box around the dropzone (spec 2D D7, D9, M21)", () => {
  const source = read("src/components/master-data/asset-model-form.tsx")
  assert.match(source, /<form onSubmit=\{handleSubmit\} className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/)
  assert.match(source, /<ContentPanel title=\{t\("modelPhoto"\)\} description=\{t\("modelPhotoHelp"\)\}>/)
  assert.match(source, /<Notice tone="neutral" className="mb-4">\{t\("saveModelBeforePhoto"\)\}<\/Notice>/)
  assert.equal(source.match(/<EmptyNote\b/g)?.length, 2, "no spec rows, no model photo")
  assert.doesNotMatch(source, /rounded-lg border|border-dashed|\btext-xs\b|\btext-lg\b|rounded-md border border-border bg-background p-3/)
})

test("category form: three ContentPanels with the add buttons as panel actions, and EmptyNote for empty templates (spec 2D D9, M21)", () => {
  const source = read("src/components/master-data/category-form.tsx")
  assert.equal(source.match(/<ContentPanel\b/g)?.length, 3, "the fields, the custom field template, the photo checklist")
  assert.match(source, /<ContentPanel\n\s+title=\{t\("customFieldTemplate"\)\}\n\s+description=\{t\("customFieldTemplateHelp"\)\}\n\s+actions=\{/)
  assert.match(source, /<ContentPanel\n\s+title=\{t\("photoChecklistTemplate"\)\}\n\s+description=\{t\("photoChecklistTemplateHelp"\)\}\n\s+actions=\{/)
  assert.equal(source.match(/<EmptyNote>\{labels\.empty\}<\/EmptyNote>/g)?.length, 2)
  assert.doesNotMatch(source, /rounded-lg border|border-dashed|\btext-lg\b|<section\b/)
})

test("the seven simple master-data forms: a <form> cannot be ContentPanel, so it takes the panel classes and the one panel spacing (spec 2D D9, 2D-2 R4)", () => {
  for (const name of ["branch", "brand", "company", "department", "employee", "location", "supplier"]) {
    const source = read(`src/components/master-data/${name}-form.tsx`)
    // noValidate straight after onSubmit: the form validates itself (v-track plan 1, M1 to M4).
    assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate className=\{cn\(getPanelClasses\(\), "p-4 sm:p-5"\)\}>/, name)
    assert.doesNotMatch(source, /rounded-lg border/, name)
  }
})
