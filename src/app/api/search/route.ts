import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"

type SearchResult = {
  id: string
  type: "asset"
  title: string
  subtitle: string
  href: string
  assetTag: string
  serialNumber: string | null
  status: {
    label: string
    colorCode: string | null
  }
  meta: {
    custodian: string | null
    location: string
    category: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "view")

    const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    if (query.length < 2) return NextResponse.json({ results: [] })

    const assets = await prisma.asset.findMany({
      where: {
        isActive: true,
        OR: [
          { assetTag: { contains: query } },
          { name: { contains: query } },
          { serialNumber: { contains: query } },
          { fixedAssetCode: { contains: query } },
          { category: { code: { contains: query } } },
          { category: { name: { contains: query } } },
          { brand: { name: { contains: query } } },
          { model: { name: { contains: query } } },
          { company: { code: { contains: query } } },
          { company: { nameTh: { contains: query } } },
          { company: { nameEn: { contains: query } } },
          { branch: { code: { contains: query } } },
          { branch: { name: { contains: query } } },
          { custodian: { code: { contains: query } } },
          { custodian: { fullNameTh: { contains: query } } },
          { custodian: { fullNameEn: { contains: query } } },
          { custodian: { email: { contains: query } } },
          { currentLocation: { code: { contains: query } } },
          { currentLocation: { name: { contains: query } } },
        ],
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        serialNumber: true,
        category: { select: { code: true, name: true } },
        custodian: { select: { code: true, fullNameTh: true } },
        currentLocation: { select: { code: true, name: true } },
        status: { select: { name: true, nameTh: true, colorCode: true } },
      },
      orderBy: [{ updatedAt: "desc" }, { assetTag: "asc" }],
      take: 12,
    })

    const results = assets
      .map<SearchResult>((asset) => ({
        id: asset.id,
        type: "asset",
        title: asset.assetTag,
        subtitle: asset.name,
        href: `/${locale}/assets/${asset.id}`,
        assetTag: asset.assetTag,
        serialNumber: asset.serialNumber,
        status: {
          label: locale === "th" ? asset.status.nameTh : asset.status.name,
          colorCode: asset.status.colorCode,
        },
        meta: {
          custodian: asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null,
          location: `${asset.currentLocation.code} - ${asset.currentLocation.name}`,
          category: `${asset.category.code} - ${asset.category.name}`,
        },
      }))
      .sort((a, b) => scoreResult(b, query) - scoreResult(a, query))
      .slice(0, 8)

    return NextResponse.json({ results })
  } catch (error) {
    return errorResponse(error)
  }
}

function scoreResult(result: SearchResult, query: string) {
  const normalizedQuery = query.toLowerCase()
  const searchable = [
    result.assetTag,
    result.serialNumber ?? "",
    result.subtitle,
    result.meta.custodian ?? "",
    result.meta.location,
  ].map((value) => value.toLowerCase())

  if (result.assetTag.toLowerCase() === normalizedQuery) return 100
  if (result.assetTag.toLowerCase().startsWith(normalizedQuery)) return 80
  if (result.serialNumber?.toLowerCase() === normalizedQuery) return 70
  if (searchable.some((value) => value.startsWith(normalizedQuery))) return 50
  return 10
}
