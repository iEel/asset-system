import { NextResponse } from "next/server"
import { AssetTransactionCancellationServiceError } from "./asset-transaction-cancellation-service.ts"

export function assetTransactionCancellationErrorResponse(error: unknown) {
  if (!(error instanceof AssetTransactionCancellationServiceError)) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cancellation failed" }, { status: 400 })
  }

  const status = error.code === "TRANSACTION_NOT_FOUND" ? 404 : error.code === "TRANSACTION_STALE" ? 409 : 400
  return NextResponse.json({ code: error.code, error: error.code }, { status })
}
