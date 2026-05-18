import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { getNotificationSummary } from "@/lib/notification-summary"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    const summary = await getNotificationSummary(user, locale)
    return NextResponse.json(summary)
  } catch (error) {
    return errorResponse(error)
  }
}
