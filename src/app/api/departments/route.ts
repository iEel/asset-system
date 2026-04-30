import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { departmentSchema } from "@/lib/validations/department"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "department", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
                { company: { code: { contains: search } } },
                { company: { nameTh: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        company: {
          select: {
            id: true,
            code: true,
            nameTh: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(departments)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "department", "create")

    const input = departmentSchema.parse(await request.json())
    const department = await prisma.department.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "department",
      recordId: department.id,
      newValue: input,
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
