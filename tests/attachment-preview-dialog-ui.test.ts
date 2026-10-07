import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("attachment preview is a Radix dialog with image and pdf modes", () => {
  const source = read("src/components/ui/attachment-preview-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/dialog"/)
  assert.match(source, /kind === "image"/)
  assert.match(source, /<iframe/)
  assert.match(source, /downloadHref/)
  assert.match(source, /\{src \? \(\s*kind === "image" \? \(/)
})

test("both lightboxes use the shared preview dialog", () => {
  for (const path of ["src/components/assets/asset-attachments.tsx", "src/components/maintenance/maintenance-attachments.tsx"]) {
    const source = read(path)
    assert.match(source, /<AttachmentPreviewDialog/, path)
    assert.doesNotMatch(source, /fixed inset-0|function PhotoLightbox|addEventListener\("keydown"/, path)
  }
})

test("admin and asset dialogs use the shared accessible dialog", () => {
  for (const path of [
    "src/components/admin/IntegrationClientManager.tsx",
    "src/components/admin/system-settings-form.tsx",
    "src/components/assets/asset-component-manager.tsx",
    "src/components/assets/asset-register-table.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /<AccessibleDialog/, path)
    assert.doesNotMatch(source, /fixed inset-0|role="dialog"|aria-modal/, path)
  }
})
