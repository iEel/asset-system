import { NextResponse } from "next/server"
import { AssetStateReviewServiceError } from "./asset-state-review-service"

const errorMessages = {
  ASSET_STATE_REVIEW_NOT_FOUND: "ไม่พบรายการรอตรวจสอบ",
  ASSET_STATE_REVIEW_NOT_PENDING: "รายการนี้ไม่ได้อยู่ในสถานะรอตรวจสอบแล้ว",
  ASSET_STATE_REVIEW_STALE: "ข้อมูลทรัพย์สินเปลี่ยนแปลงแล้ว กรุณาสแกนและตรวจสอบอีกครั้ง",
  ASSET_STATE_REVIEW_REASON_REQUIRED: "กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร",
  ASSET_STATE_REVIEW_TARGET_NOT_ALLOWED: "สถานะหรือสภาพเป้าหมายไม่เหมาะกับรายการนี้",
  ASSET_STATE_REVIEW_MASTER_NOT_FOUND: "ไม่พบสถานะหรือสภาพที่ยังใช้งานอยู่",
} as const

export function getAssetStateReviewErrorResponse(error: unknown) {
  if (!(error instanceof AssetStateReviewServiceError)) return null
  const status = error.code === "ASSET_STATE_REVIEW_NOT_FOUND"
    ? 404
    : error.code === "ASSET_STATE_REVIEW_STALE" || error.code === "ASSET_STATE_REVIEW_NOT_PENDING"
      ? 409
      : 400
  return NextResponse.json({ error: errorMessages[error.code], code: error.code }, { status })
}
