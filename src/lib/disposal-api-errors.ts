import { NextResponse } from "next/server"
import type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"
import type { FieldErrors } from "./field-errors.ts"
import type { DisposalSodReason } from "./disposal-policy.ts"

export { disposalApiErrorCodes } from "./disposal-api-error-codes.ts"
export type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"

export function disposalApiError(
  code: DisposalApiErrorCode,
  error: string,
  status = 400,
  fieldErrors?: FieldErrors,
  extra?: { reason?: DisposalSodReason },
) {
  return NextResponse.json({
    code,
    error,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(extra?.reason ? { reason: extra.reason } : {}),
  }, { status })
}
