import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const pagePaths = [
  "src/app/[locale]/(dashboard)/master-data/companies/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/branches/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/locations/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/employees/page.tsx",
  "src/app/[locale]/(dashboard)/master-data/suppliers/page.tsx",
]

test("master-data lists rely on the application navigation instead of a duplicate workspace strip", () => {
  for (const path of pagePaths) {
    const page = readFileSync(path, "utf8")
    assert.doesNotMatch(page, /workspace=\{\{/)
    assert.doesNotMatch(page, /getTranslations\("masterData"\)/)
  }

  const layout = readFileSync("src/components/master-data/master-data-layout.tsx", "utf8")
  assert.doesNotMatch(layout, /MasterDataWorkspaceNav/)
  assert.equal(existsSync("src/lib/master-data-workspace.ts"), false)
})
