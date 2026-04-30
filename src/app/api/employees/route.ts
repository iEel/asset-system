import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { employeeSchema } from "@/lib/validations/employee"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "employee", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { fullNameTh: { contains: search } },
                { fullNameEn: { contains: search } },
                { email: { contains: search } },
                { position: { contains: search } },
                { company: { code: { contains: search } } },
                { branch: { code: { contains: search } } },
                { department: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        company: { select: { id: true, code: true, nameTh: true } },
        branch: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
        manager: { select: { id: true, code: true, fullNameTh: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(employees)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "employee", "create")

    const input = employeeSchema.parse(await request.json())
    const employee = await prisma.employee.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "employee",
      recordId: employee.id,
      newValue: input,
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
