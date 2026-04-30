import { NextResponse } from "next/server"

export function errorResponse(error: unknown, fallbackStatus = 500) {
  const message = error instanceof Error ? error.message : "Unexpected error"
  const status =
    message === "Unauthorized"
      ? 401
      : message.startsWith("Forbidden")
        ? 403
        : fallbackStatus

  return NextResponse.json({ error: message }, { status })
}
