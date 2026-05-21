import assert from "node:assert/strict"
import test from "node:test"

import {
  EVIDENCE_IMAGE_OPTIMIZATION_POLICY,
  buildOptimizedEvidenceImageName,
  getEvidenceImageOptimizationPlan,
} from "../src/lib/evidence-image-optimization.ts"

test("plans large evidence photos with a readability guard", () => {
  const plan = getEvidenceImageOptimizationPlan(
    { name: "asset-label.png", type: "image/png", size: 6 * 1024 * 1024 },
    { width: 4032, height: 3024 },
  )

  assert.equal(plan.action, "optimize")
  assert.equal(plan.targetLongEdgePx, EVIDENCE_IMAGE_OPTIMIZATION_POLICY.targetLongEdgePx)
  assert.ok(plan.jpegQuality >= 0.9)
  assert.ok(plan.minReadableLongEdgePx >= 1800)
})

test("does not upscale small evidence images while preserving readability", () => {
  const plan = getEvidenceImageOptimizationPlan(
    { name: "serial.jpg", type: "image/jpeg", size: 4 * 1024 * 1024 },
    { width: 1200, height: 900 },
  )

  assert.equal(plan.action, "optimize")
  assert.equal(plan.targetLongEdgePx, 1200)
})

test("keeps small, unsupported, and non-image files unchanged", () => {
  assert.equal(
    getEvidenceImageOptimizationPlan({ name: "small.jpg", type: "image/jpeg", size: 512 * 1024 }).action,
    "keep_original",
  )
  assert.equal(
    getEvidenceImageOptimizationPlan({ name: "animated.gif", type: "image/gif", size: 6 * 1024 * 1024 }).action,
    "keep_original_format",
  )
  assert.equal(
    getEvidenceImageOptimizationPlan({ name: "invoice.pdf", type: "application/pdf", size: 6 * 1024 * 1024 }).action,
    "skip_non_image",
  )
})

test("renames optimized output to a browser-friendly jpeg without losing the base label", () => {
  assert.equal(buildOptimizedEvidenceImageName("ด้านหน้าเครื่อง.png"), "ด้านหน้าเครื่อง.jpg")
  assert.equal(buildOptimizedEvidenceImageName("asset-photo"), "asset-photo.jpg")
})
