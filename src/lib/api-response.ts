import { NextResponse } from "next/server"
import { hideUnexpectedError, isExposableError } from "@/lib/api-error-exposure"

export function errorResponse(error: unknown, fallbackStatus = 500) {
  if (!isExposableError(error)) {
    return NextResponse.json({ error: hideUnexpectedError(error).text }, { status: 500 })
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
