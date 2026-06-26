import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit not-found action uses an in-app dialog instead of browser prompt", () => {
  const source = readFileSync("src/components/audit/audit-mark-not-found-button.tsx", "utf8")

  assert.doesNotMatch(source, /window\.prompt/)
  assert.match(source, /const \[dialogOpen, setDialogOpen\] = useState\(false\)/)
  assert.match(source, /const \[remark, setRemark\] = useState\(""\)/)
  assert.match(source, /const \[evidenceFile, setEvidenceFile\] = useState<File \| null>\(null\)/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /<textarea/)
  assert.match(source, /FileDropzone/)
  assert.match(source, /onSubmit=\{handleSubmit\}/)
  assert.match(source, /t\("notFoundDialogTitle"\)/)
  assert.match(source, /t\("notFoundRemarkOptional"\)/)
})

test("audit not-found dialog submits optional remark and evidence as form data", () => {
  const source = readFileSync("src/components/audit/audit-mark-not-found-button.tsx", "utf8")

  assert.match(source, /const body = new FormData\(\)/)
  assert.match(source, /body\.append\("remark", remark\.trim\(\)\)/)
  assert.match(source, /if \(evidenceFile\) body\.append\("evidence", evidenceFile\)/)
  assert.match(source, /method: "POST"/)
  assert.doesNotMatch(source, /headers: \{ "Content-Type": "application\/json" \}/)
  assert.match(source, /setDialogOpen\(false\)/)
  assert.match(source, /setRemark\(""\)/)
  assert.match(source, /setEvidenceFile\(null\)/)
})

test("mark-not-found route accepts multipart evidence while preserving json clients", () => {
  const route = readFileSync("src/app/api/audit-items/[id]/mark-not-found/route.ts", "utf8")

  assert.match(route, /request\.headers\.get\("content-type"\)/)
  assert.match(route, /multipart\/form-data/)
  assert.match(route, /await request\.formData\(\)/)
  assert.match(route, /auditMarkNotFoundSchema\.parse\(\{ remark:/)
  assert.match(route, /auditMarkNotFoundSchema\.parse\(await request\.json\(\)\)/)
  assert.match(route, /validateUploadFile\(evidenceFile\)/)
  assert.match(route, /await validateUploadFileContent\(evidenceFile\)/)
  assert.match(route, /scanWrittenUploadFile\(filePath\)/)
  assert.match(route, /module: "audit_finding"/)
  assert.match(route, /referenceId: findingId/)
})

test("audit pending not-found dialog copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditPending.notFoundDialogTitle, "string")
    assert.equal(typeof messages.auditPending.notFoundDialogDescription, "string")
    assert.equal(typeof messages.auditPending.notFoundRemarkOptional, "string")
    assert.equal(typeof messages.auditPending.notFoundRemarkPlaceholder, "string")
    assert.equal(typeof messages.auditPending.notFoundEvidenceTitle, "string")
    assert.equal(typeof messages.auditPending.notFoundEvidenceBrowse, "string")
    assert.equal(typeof messages.auditPending.notFoundEvidenceSelected, "string")
    assert.equal(typeof messages.auditPending.notFoundConfirm, "string")
  }
})
