import { NextResponse } from "next/server"
import { hideUnexpectedError, isExposableError, validationFailedBody } from "./api-error-exposure.ts"
import { AssetTransactionCancellationServiceError } from "./asset-transaction-cancellation-service.ts"

export function assetTransactionCancellationErrorResponse(error: unknown) {
  if (!(error instanceof AssetTransactionCancellationServiceError)) {
    const validation = validationFailedBody(error)
    if (validation) return NextResponse.json(validation, { status: 400 })
    if (!isExposableError(error)) {
      return NextResponse.json({ error: hideUnexpectedError(error).text }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const status = error.code === "TRANSACTION_NOT_FOUND" ? 404 : error.code === "TRANSACTION_STALE" ? 409 : 400
  return NextResponse.json({ code: error.code, error: error.code }, { status })
}
