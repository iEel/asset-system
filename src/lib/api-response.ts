import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { isExposableError, unexpectedErrorText } from "@/lib/api-error-exposure"

export function errorResponse(error: unknown, fallbackStatus = 500) {
  if (!isExposableError(error)) {
    const reference = randomUUID().replaceAll("-", "").slice(0, 8)
    console.error(`[api error] ref ${reference}`, error)
    return NextResponse.json({ error: unexpectedErrorText(reference) }, { status: 500 })
  }
  const message = error.message
  const status =
    message === "Unauthorized"
      ? 401
      : message.startsWith("Forbidden")
        ? 403
        : fallbackStatus

  return NextResponse.json({ error: message }, { status })
}
