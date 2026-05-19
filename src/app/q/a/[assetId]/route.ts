import { NextRequest, NextResponse } from "next/server"
import { routing } from "@/i18n/routing"
import { prisma } from "@/lib/db"

type AssetQrResolverContext = {
  params: Promise<{ assetId: string }>
}

export async function GET(request: NextRequest, context: AssetQrResolverContext) {
  const { assetId } = await context.params
  const lookupValue = safeDecode(assetId).trim()
  if (!lookupValue) return new NextResponse("Asset not found", { status: 404 })

  const asset = await prisma.asset.findFirst({
    where: {
      isActive: true,
      OR: [{ id: lookupValue }, { assetTag: lookupValue }],
    },
    select: { id: true },
  })
  if (!asset) return new NextResponse("Asset not found", { status: 404 })

  const locale = getResolverLocale(request)
  return NextResponse.redirect(new URL(`/${locale}/assets/${asset.id}`, request.url))
}

function getResolverLocale(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale")
  if (requestedLocale && routing.locales.includes(requestedLocale as (typeof routing.locales)[number])) {
    return requestedLocale
  }
  return routing.defaultLocale
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
