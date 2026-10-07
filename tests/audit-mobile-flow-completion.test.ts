import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("audit component missing uses the shared in-app dialog instead of a browser prompt", () => {
  const dialog = readFileSync("src/components/audit/audit-scan-component-missing-dialog.tsx", "utf8")
  const workspace = readFileSync("src/components/audit/audit-scan-workspace.tsx", "utf8")

  for (const source of [dialog, workspace]) assert.doesNotMatch(source, /window\.prompt/)
  assert.match(dialog, /<AccessibleDialog/)
  assert.match(dialog, /<FileDropzone/)
  assert.match(dialog, /const \[remark, setRemark\] = useState\(""\)/)
  assert.match(dialog, /const \[evidence, setEvidence\] = useState<File \| null>\(null\)/)
  assert.match(dialog, /onSubmit\(remark\.trim\(\) \|\| t\("componentMissingDefaultRemark", \{ assetTag: parentAssetTag \}\), evidence\)/)
  assert.match(workspace, /const \[missingComponent, setMissingComponent\] = useState<AuditScanComponent \| null>\(null\)/)
  assert.match(workspace, /async function submitComponentMissing\(remark: string, evidence: File \| null\)/)
  assert.match(workspace, /const body = new FormData\(\)/)
  assert.match(workspace, /body\.append\("remark", remark\)/)
  assert.match(workspace, /if \(evidence\) body\.append\("evidence", evidence\)/)
  assert.match(workspace, /missingComponent && target\?\.kind === "item" \? \(\s*<AuditScanComponentMissingDialog/)
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
