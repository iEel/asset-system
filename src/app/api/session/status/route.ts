import { NextResponse } from "next/server"
import { requireSessionClock } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import type { SessionStatusResponse } from "@/lib/session-deadline"

// The session's deadlines for the shell (menu B shell §6.8). auth() runs the jwt callback without a trigger, so a
// status read never moves activeAt: background polls never extend a session.
export async function GET() {
  try {
    const clock = await requireSessionClock()
    const body: SessionStatusResponse = { ...clock, serverNow: new Date().toISOString() }
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return errorResponse(error)
  }
}
