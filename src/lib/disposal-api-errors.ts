import { NextResponse } from "next/server"
import type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"

export { disposalApiErrorCodes } from "./disposal-api-error-codes.ts"
export type { DisposalApiErrorCode } from "./disposal-api-error-codes.ts"

export function disposalApiError(code: DisposalApiErrorCode, error: string, status = 400) {
  return NextResponse.json({ code, error }, { status })
}
