import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { locationSchema } from "@/lib/validations/location"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "location", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const locations = await prisma.location.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
                { locationType: { contains: search } },
                { branch: { code: { contains: search } } },
                { branch: { name: { contains: search } } },
                { branch: { company: { code: { contains: search } } } },
                { branch: { company: { nameTh: { contains: search } } } },
              ],
            }
          : {}),
      },
      include: {
        branch: {
          select: {
            code: true,
            name: true,
            company: {
              select: {
                code: true,
                nameTh: true,
              },
            },
          },
        },
        parent: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(locations)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "location", "create")

    const input = locationSchema.parse(await request.json())
    const location = await prisma.location.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "location",
      recordId: location.id,
      newValue: input,
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
