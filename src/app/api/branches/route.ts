import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { branchSchema } from "@/lib/validations/branch"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "branch", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const branches = await prisma.branch.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { name: { contains: search } },
                { contactPerson: { contains: search } },
                { company: { nameTh: { contains: search } } },
                { company: { code: { contains: search } } },
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
      orderBy: [{ company: { code: "asc" } }, { code: "asc" }],
    })

    return NextResponse.json(branches)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "branch", "create")

    const input = branchSchema.parse(await request.json())
    const existingCode = await prisma.branch.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        isActive: true,
      },
      include: { company: { select: { code: true, nameTh: true } } },
    })

    if (existingCode) {
      return NextResponse.json(
        {
          error: `รหัสสาขา ${input.code} มีอยู่แล้วในบริษัท ${existingCode.company.code} - ${existingCode.company.nameTh}`,
        },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "branch",
      recordId: branch.id,
      newValue: input,
    })

    return NextResponse.json(branch, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
