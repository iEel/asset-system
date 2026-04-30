import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { companySchema } from "@/lib/validations/company"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "view")

    const search = request.nextUrl.searchParams.get("search")?.trim()
    const companies = await prisma.company.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { code: { contains: search } },
                { nameTh: { contains: search } },
                { nameEn: { contains: search } },
                { taxId: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(companies)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "create")

    const input = companySchema.parse(await request.json())
    const company = await prisma.company.create({
      data: {
        ...input,
        createdBy: user.id,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "company",
      recordId: company.id,
      newValue: input,
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    const status = message === "Unauthorized" ? 401 : message.startsWith("Forbidden") ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
