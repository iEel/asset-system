import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { findJsxElements, findJsxTags, findMatches, hasJsxAttr, jsxAttrValue, readSourceFiles, type SourceFile } from "./helpers/source-files.ts"

// Phase 2B (spec 2B §6.13 table B): how list pages use the shared filters. The strings of the filter primitives live
// in tests/list-primitives-ui.test.ts (I16); the "none left" guards live in tests/list-frame-guards.test.ts (I15, I34).
// Item 2 lands with FilterFormActions (2B-1 Task 6). Items 5 and 6 come with the first page that moves (Task 13).
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("FilterFormActions submits at 40px and offers clear filters as an outline link (2B §6.3.2, item 2)", () => {
  const panel = read("src/components/ui/filter-panel.tsx")
  assert.match(panel, /export function FilterFormActions\(\{ submitLabel, clear, className \}: FilterFormActionsProps\)/)
  assert.match(panel, /clear\?: \{ href: string; label: string \}/)
  assert.match(panel, /<div data-slot="filter-form-actions" className=\{cn\("flex items-end gap-2", className\)\}>/)
  assert.match(panel, /<Button type="submit" size="lg" className="flex-1 md:flex-none">\{submitLabel\}<\/Button>/)
  assert.match(panel, /\{clear \? \(\s*<Link href=\{clear\.href\} className=\{cn\(buttonVariants\(\{ variant: "outline", size: "lg" \}\), "flex-1 md:flex-none"\)\}>/)
  assert.doesNotMatch(panel, /"use client"|\bbusy\b/, "a GET form changes the page itself, so the panel stays server-safe and has no busy state")
  assert.match(panel, /export function FilterPanel\(\{ title, description, children, className \}: FilterPanelProps\)/, "FilterPanel keeps its API")
})

// Items 5 and 6 (spec 2B §6.13 table B, I34) over all of src since plan 2D-5 (spec 2D §3.5, M19). A filter form sends
// its fields to a URL (an action and no onSubmit; this app has no server-action form, which would need its own
// exception here) or holds FilterSelect or FilterFormActions, and it is a search landmark. A search form holds the
// shared fields only (Field + SearchField, FilterSelect) and hidden inputs. A raw field outside a search form is FMG
// GF2's; a local filter helper is LFG LF1's.
const sources = readSourceFiles("src")
const OLD_FILTER_LABEL = /space-y-1 text-sm font-medium text-foreground|mb-1\.5 block text-xs font-medium text-muted-foreground/g

function filterFormProblems(files: readonly SourceFile[]) {
  const problems: string[] = []
  let searchForms = 0
  for (const file of files) {
    for (const form of findJsxElements(file.source, "form")) {
      const where = `${file.path}:${form.line}`
      const search = jsxAttrValue(form.text, "role") === "search"
      if (!search) {
        const toUrl = hasJsxAttr(form.text, "action") && !hasJsxAttr(form.text, "onSubmit")
        const filterParts = findJsxTags(form.children ?? "", ["FilterSelect", "FilterFormActions"]).length > 0
        if (toUrl || filterParts) problems.push(`${where}: a filter form needs role="search"`)
        continue
      }
      searchForms++
      if (form.children === null) problems.push(`${where}: no closing </form>`)
      for (const tag of findJsxTags(form.children ?? "", ["input", "select", "textarea"])) {
        if (tag.name !== "input" || jsxAttrValue(tag.text, "type") !== "hidden") problems.push(`${where}: a raw <${tag.name}> (use Field + SearchField or FilterSelect; only hidden inputs stay raw)`)
      }
    }
  }
  return { problems, searchForms }
}

// Item 6: every FilterFormActions that offers clear filters offers it only while a filter is on.
function clearFilterProblems(files: readonly SourceFile[]) {
  const problems: string[] = []
  let clears = 0
  for (const file of files) {
    for (const tag of findJsxTags(file.source, ["FilterFormActions"])) {
      const clear = jsxAttrValue(tag.text, "clear")
      if (clear === null) continue
      clears++
      if (!/^hasActiveFilters \?/.test(clear.trim())) problems.push(`${file.path}:${tag.line}: clear={${clear}}`)
    }
  }
  return { problems, clears }
}

test("filter forms across src are search landmarks and hold Field, SearchField and FilterSelect only (item 5, I34)", () => {
  const fixture = (source: string): SourceFile => ({ path: "src/x.tsx", source })
  assert.equal(filterFormProblems([fixture('<form action={basePath}><SearchField name="q" /></form>')]).problems.length, 1, "a GET form without role=\"search\"")
  assert.equal(filterFormProblems([fixture('<form onSubmit={apply}><FilterSelect name="s" /></form>')]).problems.length, 1, "a client filter form without role=\"search\"")
  assert.equal(filterFormProblems([fixture('<form role="search" action={basePath}><input type="hidden" name="p" value="1" /><select name="s" /><input name="q" /></form>')]).problems.length, 2, "a raw select and a raw input in a search form")
  assert.deepEqual(filterFormProblems([fixture('<form onSubmit={save}><input name="q" /><SearchField /></form><form role="search" onSubmit={go}><SearchField /></form>')]).problems, [], "a data form with a search box is not a filter form, and SearchField is shared")
  const { problems, searchForms } = filterFormProblems(sources)
  assert.deepEqual(problems, [])
  assert.ok(searchForms > 10, `expected the list pages' search forms, found ${searchForms}`)
  assert.deepEqual(findMatches(sources, OLD_FILTER_LABEL), [], "an old filter label")
})

test("clear filters shows only while a filter is on, on every FilterFormActions in src (item 6)", () => {
  const fixture = (source: string): SourceFile => ({ path: "src/x.tsx", source })
  assert.equal(clearFilterProblems([fixture('<FilterFormActions submitLabel="a" clear={{ href: "/x", label: "b" }} /><FilterFormActions submitLabel="a" />')]).problems.length, 1)
  const { problems, clears } = clearFilterProblems(sources)
  assert.deepEqual(problems, [])
  assert.ok(clears > 5, `expected the list pages' clear links, found ${clears}`)
})

// Item 8 (spec 2B §6.13 table B, §5.10 #5): the disposal queue had two filter forms, one per screen size. One
// DisposalFilterForm now renders in both places, and the phone summary counts the filters that are on.
test("the disposal queue renders one DisposalFilterForm in two places and the page has no other form (item 8)", () => {
  const source = read("src/app/[locale]/(dashboard)/disposal/page.tsx")
  assert.equal(source.match(/<DisposalFilterForm locale=\{locale\} filters=\{filters\} hasActiveFilters=\{hasActiveFilters\} t=\{t\} tCommon=\{tCommon\} \/>/g)?.length, 2, "the phone <details> and the desktop FilterPanel")
  assert.match(source, /<FilterPanel className="hidden md:block">\n\s+<DisposalFilterForm /)
  assert.equal(source.match(/<form\b/g)?.length, 1, "one <form> in the file")
  assert.ok(source.indexOf("<form") > source.indexOf("function DisposalFilterForm("), "the one <form> is DisposalFilterForm's")
  assert.match(source, /\{hasActiveFilters \? <span className="text-meta font-normal text-muted-foreground num">\{t\("activeFilterCount", \{ count: activeFilterCount \}\)\}<\/span> : null\}/)
  assert.doesNotMatch(source, />\{t\("clearFilters"\)\}<\/span>/, "the summary label that read clear filters but only folded the panel is gone")
  for (const locale of ["th", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as { disposalPage: Record<string, unknown> }
    assert.equal(typeof messages.disposalPage.activeFilterCount, "string", `${locale}: disposalPage.activeFilterCount`)
  }
})

// Item 7 (spec 2B §6.13 table B, §6.5 "6-ญ", I24): the maintenance filter form keeps the page size, and the chip for
// the hidden asset filter removes only assetId (plan 2B-2 Task 12).
test("the maintenance filter keeps the page size, and its asset chip clears only the asset filter (item 7)", () => {
  const source = read("src/app/[locale]/(dashboard)/maintenance/page.tsx")
  const form = source.slice(source.indexOf('<form role="search"'), source.indexOf("</form>"))
  assert.match(form, /<input type="hidden" name="pageSize" value=\{filters\.pageSize\} \/>/)
  assert.match(form, /<FilterFormActions submitLabel=\{t\("filter"\)\} clear=\{hasActiveFilters \? \{ href: clearHref, label: t\("clearFilters"\) \} : undefined\} \/>/)
  assert.match(
    source,
    /<FilterChipList\n\s+className="mt-3"\n\s+label=\{t\("activeFilters"\)\}\n\s+removeLabel=\{t\("clearFilters"\)\}\n\s+chips=\{\[\{ key: "assetId", label: t\("assetFilter"\), href: `\/\$\{locale\}\/maintenance\?\$\{buildMaintenanceQueryString\(filters, \{ assetId: "", page: 1 \}\)\}` \}\]\}/,
  )
})

// Plan 2B-5 Task 9 (spec 2B §6.5 row 12, §6.2 6-จ, I6): the report filter panel keeps its FilterPanel, its grid, the
// hidden view and the URL-only scopes, and moves onto Field + SearchField, FilterSelect and FilterFormActions. The page
// tells it whether any filter is on, so "clear filters" shows only then. ActionButton was deleted in plan 2D-1.
test("the report filters are Field + SearchField, six FilterSelect and FilterFormActions (2B §6.5 row 12)", () => {
  const panel = read("src/components/reports/report-filter-panel.tsx")
  assert.match(panel, /<FilterPanel title=\{labels\.title\} description=\{labels\.help\} className="p-5">/)
  assert.match(panel, /<form role="search" action=\{`\/\$\{locale\}\/reports`\} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">/)
  assert.match(panel, /<Field label=\{labels\.search\}>\n\s+<SearchField name="search" defaultValue=\{filters\.search\} placeholder=\{labels\.searchPlaceholder\} \/>/)
  for (const [name, options] of [["companyId", "companies"], ["branchId", "branches"], ["categoryId", "categories"], ["statusId", "statuses"], ["conditionId", "conditions"], ["ownershipType", "ownershipTypes"]]) {
    assert.match(panel, new RegExp(`<FilterSelect label=\\{labels\\.\\w+\\} name="${name}" defaultValue=\\{filters\\.${name}\\} allLabel=\\{labels\\.all\\} options=\\{options\\.${options}\\} />`), name)
  }
  assert.match(panel, /<FilterFormActions\n\s+className="md:col-span-2 xl:col-span-3"\n\s+submitLabel=\{labels\.apply\}\n\s+clear=\{hasActiveFilters \? \{ href: buildReportHref\(locale, activeView, parseAssetListParams\(\{\}\)\), label: labels\.clear \} : undefined\}/)
  assert.doesNotMatch(panel, /ActionButton|getActionButtonClasses|getFieldControlClasses|<label\b|<select\b/)
  const page = read("src/app/[locale]/(dashboard)/reports/page.tsx")
  assert.match(page, /<ReportFilterPanel\n(?:\s+\w+=\{\w+\}\n)*\s+hasActiveFilters=\{hasActiveFilters\}\n/, "the page passes whether a filter is on")
})
