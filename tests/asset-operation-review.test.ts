import assert from "node:assert/strict"
import test from "node:test"

import { buildOperationReviewSummary } from "../src/lib/asset-operation-review.ts"

test("builds a concise operation review without empty values", () => {
  const summary = buildOperationReviewSummary({
    assetLabel: "IT-001 - Notebook",
    sourceLabel: "Somchai",
    destinationLabels: ["สำนักงานใหญ่", "IT"],
    nextStatusLabel: "พร้อมใช้งาน",
    details: [{ label: "กำหนดคืน", value: "2026-07-31" }],
    evidenceLabel: "รูป 2 ไฟล์",
    labels: {
      asset: "ทรัพย์สิน",
      source: "จาก",
      destination: "ปลายทาง",
      nextStatus: "สถานะถัดไป",
      evidence: "หลักฐาน",
    },
  })

  assert.deepEqual(summary, [
    { label: "ทรัพย์สิน", value: "IT-001 - Notebook" },
    { label: "จาก", value: "Somchai" },
    { label: "ปลายทาง", value: "สำนักงานใหญ่ · IT" },
    { label: "สถานะถัดไป", value: "พร้อมใช้งาน" },
    { label: "กำหนดคืน", value: "2026-07-31" },
    { label: "หลักฐาน", value: "รูป 2 ไฟล์" },
  ])
})

test("omits optional review rows that do not have a meaningful value", () => {
  const summary = buildOperationReviewSummary({
    assetLabel: "IT-002 - Monitor",
    destinationLabels: ["", "คลัง IT"],
    labels: {
      asset: "Asset",
      source: "From",
      destination: "Destination",
      nextStatus: "Next status",
      evidence: "Evidence",
    },
  })

  assert.deepEqual(summary, [
    { label: "Asset", value: "IT-002 - Monitor" },
    { label: "Destination", value: "คลัง IT" },
  ])
})
