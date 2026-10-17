import { NextResponse } from "next/server"
import type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"
import type { FieldErrors } from "./field-errors.ts"

export { disposalApiErrorCodes } from "./disposal-api-error-codes.ts"
export type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"

export function disposalApiError(code: DisposalApiErrorCode, error: string, status = 400, fieldErrors?: FieldErrors) {
  return NextResponse.json(fieldErrors ? { code, error, fieldErrors } : { code, error }, { status })
}
