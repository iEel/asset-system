import { NextResponse } from "next/server"
import { extendSession } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { isSameOriginRequest, type SessionStatusResponse } from "@/lib/session-deadline"

// The keep-alive (menu B shell §6.8): moves the session's activeAt to now through unstable_update and returns the new
// deadlines. A route handler, not a server action. Another site's page must not keep a session alive, so a foreign
// Origin is refused before the session is touched.
export async function POST(request: Request) {
  try {
    const sameOrigin = isSameOriginRequest({
      origin: request.headers.get("origin"),
      host: request.headers.get("host"),
      forwardedHost: request.headers.get("x-forwarded-host"),
      allowedOrigins: [process.env.AUTH_URL, process.env.NEXTAUTH_URL].filter((value): value is string => Boolean(value)),
    })
    if (!sameOrigin) throw new Error("Forbidden: cross-site request")

    const clock = await extendSession()
    const body: SessionStatusResponse = { ...clock, serverNow: new Date().toISOString() }
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return errorResponse(error)
  }
}
