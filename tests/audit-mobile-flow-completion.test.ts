import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit component missing uses in-app dialog instead of browser prompt", () => {
  const form = readFileSync("src/components/audit/audit-scan-form.tsx", "utf8")

  assert.doesNotMatch(form, /window\.prompt/)
  assert.match(form, /const \[componentMissingDraft, setComponentMissingDraft\] = useState<AuditScanComponent \| null>\(null\)/)
  assert.match(form, /const \[componentMissingRemark, setComponentMissingRemark\] = useState\(""\)/)
  assert.match(form, /const \[componentMissingEvidenceFile, setComponentMissingEvidenceFile\] = useState<File \| null>\(null\)/)
  assert.match(form, /function openComponentMissingDialog\(component: AuditScanComponent\)/)
  assert.match(form, /async function submitComponentMissing\(event: FormEvent<HTMLFormElement>\)/)
  assert.match(form, /const body = new FormData\(\)/)
  assert.match(form, /body\.append\("remark", componentMissingRemark\.trim\(\) \|\| t\("componentMissingDefaultRemark"/)
  assert.match(form, /if \(componentMissingEvidenceFile\) body\.append\("evidence", componentMissingEvidenceFile\)/)
  assert.match(form, /role="dialog"/)
  assert.match(form, /FileDropzone/)
})

test("audit component missing dialog copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.componentMissingDialogTitle, "string")
    assert.equal(typeof messages.auditScan.componentMissingDialogDescription, "string")
    assert.equal(typeof messages.auditScan.componentMissingRemarkOptional, "string")
    assert.equal(typeof messages.auditScan.componentMissingRemarkPlaceholder, "string")
    assert.equal(typeof messages.auditScan.componentMissingEvidenceTitle, "string")
    assert.equal(typeof messages.auditScan.componentMissingEvidenceBrowse, "string")
    assert.equal(typeof messages.auditScan.componentMissingEvidenceSelected, "string")
    assert.equal(typeof messages.auditScan.componentMissingConfirm, "string")
  }
})

test("audit findings page loads and renders evidence attachments for review", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/audit/findings/page.tsx", "utf8")

  assert.match(page, /const attachmentsByFindingId = new Map<string, AuditFindingEvidenceAttachment\[\]>\(\)/)
  assert.match(page, /prisma\.attachment\.findMany\(\{[\s\S]*where: \{ module: "audit_finding"/)
  assert.match(page, /orderBy: \{ uploadedAt: "desc" \}/)
  assert.match(page, /function AuditFindingEvidenceList/)
  assert.match(page, /href=\{`\/api\/attachments\/\$\{attachment\.id\}\?inline=1`\}/)
  assert.match(page, /target="_blank"/)
  assert.match(page, /t\("evidenceAttachments"\)/)
  assert.match(page, /t\("evidenceAttachmentCount"/)
})

test("audit finding evidence copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditFinding.evidenceAttachments, "string")
    assert.equal(typeof messages.auditFinding.evidenceAttachmentCount, "string")
    assert.equal(typeof messages.auditFinding.openEvidenceAttachment, "string")
  }
})
