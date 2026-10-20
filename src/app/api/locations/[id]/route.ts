import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { fieldErrorResponse, isPrismaUniqueConstraintError, uniqueConflictResponse } from "@/lib/field-error-response"
import { locationSchema } from "@/lib/validations/location"
import { getLocationDeleteBlockReason, wouldCreateLocationCycle } from "@/lib/location-list-query"
import { isDeactivation } from "@/lib/master-data-query"

type LocationRouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: LocationRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "location", "view")

    const { id } = await context.params
    const location = await prisma.location.findFirst({
      where: { id, isActive: true },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    })

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json(location)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PUT(request: NextRequest, context: LocationRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "location", "edit")

    const { id } = await context.params
    const input = locationSchema.parse(await request.json())

    if (input.parentId === id) {
      return fieldErrorResponse({ status: 400, error: "Location cannot be its own parent", fieldErrors: { parentId: "locationOwnParent" } })
    }

    // An inactive location opens and saves too: ticking "ใช้งาน" again brings it back (critique 2026-10-20 E1).
    const existing = await prisma.location.findFirst({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    // Unticking "ใช้งาน" removes the location from use the way "ลบ" does, so the same counts refuse it.
    if (isDeactivation(existing.isActive, input.isActive)) {
      const usage = await prisma.location.findFirst({
        where: { id },
        select: {
          _count: {
            select: {
              currentAssets: { where: { isActive: true } },
              homeAssets: { where: { isActive: true } },
              children: { where: { isActive: true } },
              auditRounds: true,
            },
          },
        },
      })
      const blockReason = usage ? getLocationDeleteBlockReason(usage._count) : null
      if (blockReason) {
        return NextResponse.json({ error: blockReason }, { status: 409 })
      }
    }

    if (input.parentId) {
      const locations = await prisma.location.findMany({
        where: { isActive: true },
        select: {
          id: true,
          parentId: true,
        },
      })

      if (wouldCreateLocationCycle({ locationId: id, nextParentId: input.parentId, locations })) {
        return fieldErrorResponse({ status: 400, error: "Location hierarchy cannot contain a cycle", fieldErrors: { parentId: "locationCycle" } })
      }
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "update",
      module: "location",
      recordId: location.id,
      oldValue: existing,
      newValue: input,
    })

    return NextResponse.json(location)
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return uniqueConflictResponse("code", "Location code already exists")
    return errorResponse(error, 400)
  }
}

export async function DELETE(_request: NextRequest, context: LocationRouteContext) {
  try {
    const user = await requireAuth()
    requirePermission(user, "location", "delete")

    const { id } = await context.params
    const existing = await prisma.location.findFirst({
      where: { id, isActive: true },
      include: {
        _count: {
          select: {
            currentAssets: { where: { isActive: true } },
            homeAssets: { where: { isActive: true } },
            children: { where: { isActive: true } },
            auditRounds: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    const blockReason = getLocationDeleteBlockReason(existing._count)
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 409 })
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: user.id,
      },
    })

    await logAudit({
      userId: user.id,
      action: "delete",
      module: "location",
      recordId: id,
      oldValue: existing,
      newValue: location,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
