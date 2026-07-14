import { NextRequest, NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { prisma } from "@/lib/db"
import {
  maintenanceOptionTypes,
  searchMaintenanceOptions,
  type MaintenanceOptionDb,
  type MaintenanceOptionType,
} from "@/lib/maintenance-options"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "maintenance", "view")
    const type = request.nextUrl.searchParams.get("type")
    if (!maintenanceOptionTypes.includes(type as MaintenanceOptionType)) {
      return NextResponse.json({ error: "Invalid maintenance option type" }, { status: 400 })
    }
    const data = await searchMaintenanceOptions(prisma as unknown as MaintenanceOptionDb, {
      type: type as MaintenanceOptionType,
      q: request.nextUrl.searchParams.get("q") ?? "",
      id: request.nextUrl.searchParams.get("id") ?? "",
    })
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
