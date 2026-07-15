import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

function readSource(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : ""
}

const editableSections = [
  { section: "companies", singular: "company", form: "company-form.tsx", entity: "company", returnVar: "companyReturnHref" },
  { section: "branches", singular: "branch", form: "branch-form.tsx", entity: "branch", returnVar: "branchReturnHref" },
  { section: "categories", singular: "category", form: "category-form.tsx", entity: "category", returnVar: "categoryReturnHref" },
  { section: "departments", singular: "department", form: "department-form.tsx", entity: "department", returnVar: "departmentReturnHref" },
  { section: "locations", singular: "location", form: "location-form.tsx", entity: "location", returnVar: "locationReturnHref" },
  { section: "brands", singular: "brand", form: "brand-form.tsx", entity: "brand", returnVar: "brandReturnHref", editId: "selectedBrand\\.id" },
] as const

const detailSections = [
  { section: "employees", singular: "employee", form: "employee-form.tsx", entity: "employee", returnVar: "employeeReturnHref" },
  { section: "suppliers", singular: "supplier", form: "supplier-form.tsx", entity: "supplier", returnVar: "supplierReturnHref" },
] as const

test("master data return navigation helper only accepts internal master data targets", () => {
  const source = readSource("src/lib/master-data-return-navigation.ts")

  assert.match(source, /normalizeMasterDataReturnTo/)
  assert.match(source, /new URL\(raw, "http:\/\/asset\.local"\)/)
  assert.match(source, /url\.origin !== "http:\/\/asset\.local"/)
  assert.match(source, /url\.pathname !== fallback/)
  assert.match(source, /appendMasterDataReturnTo/)
})

test("master data list edit and create links carry the current list URL as returnTo", () => {
  for (const item of editableSections) {
    const source = readFileSync(`src/app/[locale]/(dashboard)/master-data/${item.section}/page.tsx`, "utf8")

    assert.match(source, new RegExp(`const ${item.returnVar} = `))
    assert.match(source, new RegExp(`appendMasterDataReturnTo\\(\`/\\$\\{locale\\}/master-data/${item.section}/new\`, ${item.returnVar}\\)`))
    const editId = "editId" in item ? item.editId : `${item.entity}\\.id`
    assert.match(source, new RegExp(`appendMasterDataReturnTo\\(\`/\\$\\{locale\\}/master-data/${item.section}/\\$\\{${editId}\\}/edit\`, ${item.returnVar}\\)`))
  }

  for (const item of detailSections) {
    const pageSource = readFileSync(`src/app/[locale]/(dashboard)/master-data/${item.section}/page.tsx`, "utf8")
    const extractedListSource = item.section === "suppliers"
      ? readFileSync("src/components/master-data/supplier-list-view.tsx", "utf8")
      : ""
    const source = `${pageSource}\n${extractedListSource}`

    assert.match(source, new RegExp(`const ${item.returnVar} = `))
    assert.match(source, new RegExp(`appendMasterDataReturnTo\\(\`/\\$\\{locale\\}/master-data/${item.section}/new\`, ${item.returnVar}\\)`))
    assert.match(source, new RegExp(`appendMasterDataReturnTo\\(\`/\\$\\{locale\\}/master-data/${item.section}/\\$\\{${item.entity}\\.id\\}\`, ${item.returnVar}\\)`))
    assert.match(source, new RegExp(`appendMasterDataReturnTo\\(\`/\\$\\{locale\\}/master-data/${item.section}/\\$\\{${item.entity}\\.id\\}/edit\`, ${item.returnVar}\\)`))
  }
})

test("master data new and edit pages pass sanitized return targets to forms", () => {
  for (const item of [...editableSections, ...detailSections]) {
    const newPageSource = readFileSync(`src/app/[locale]/(dashboard)/master-data/${item.section}/new/page.tsx`, "utf8")
    const editPageSource = readFileSync(`src/app/[locale]/(dashboard)/master-data/${item.section}/[id]/edit/page.tsx`, "utf8")
    const formSource = readFileSync(`src/components/master-data/${item.form}`, "utf8")

    assert.match(newPageSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
    assert.match(newPageSource, new RegExp(`normalizeMasterDataReturnTo\\(locale, "${item.section}", rawSearchParams\\.returnTo\\)`))
    assert.match(newPageSource, /backHref=\{returnToHref\}/)
    assert.match(editPageSource, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
    assert.match(editPageSource, new RegExp(`normalizeMasterDataReturnTo\\(locale, "${item.section}", rawSearchParams\\.returnTo\\)`))
    assert.match(editPageSource, /backHref=\{returnToHref\}/)
    assert.match(formSource, /backHref: providedBackHref/)
    assert.match(formSource, new RegExp(`const backHref = providedBackHref \\?\\? \`/\\$\\{locale\\}/master-data/${item.section}\``))
    assert.match(formSource, /router\.push\(backHref\)/)
  }
})

test("employee and supplier detail pages preserve returnTo for back and edit actions", () => {
  for (const item of detailSections) {
    const source = readFileSync(`src/app/[locale]/(dashboard)/master-data/${item.section}/[id]/page.tsx`, "utf8")

    assert.match(source, /searchParams: Promise<\{ returnTo\?: string \| string\[\] \}>/)
    assert.match(source, new RegExp(`normalizeMasterDataReturnTo\\(locale, "${item.section}", rawSearchParams\\.returnTo\\)`))
    assert.match(source, /href=\{returnToHref\}/)
    assert.match(source, new RegExp(`appendMasterDataReturnTo\\(hrefs\\.edit, returnToHref\\)`))
  }
})
