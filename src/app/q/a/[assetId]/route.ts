import { NextRequest, NextResponse } from "next/server"
import { routing } from "@/i18n/routing"
import { prisma } from "@/lib/db"
import { assetQrPublicBaseUrlKey, buildAssetQrRedirectUrl } from "@/lib/asset-qr"

type AssetQrResolverContext = {
  params: Promise<{ assetId: string }>
}

export async function GET(request: NextRequest, context: AssetQrResolverContext) {
  const { assetId } = await context.params
  const lookupValue = safeDecode(assetId).trim()
  if (!lookupValue) return new NextResponse("Asset not found", { status: 404 })

  const [asset, publicBaseUrlSetting] = await Promise.all([
    prisma.asset.findFirst({
      where: {
        isActive: true,
        OR: [{ id: lookupValue }, { assetTag: lookupValue }],
      },
      select: { id: true },
    }),
    prisma.systemSetting.findUnique({
      where: { key: assetQrPublicBaseUrlKey },
      select: { value: true },
    }),
  ])
  if (!asset) return new NextResponse("Asset not found", { status: 404 })

  const locale = getResolverLocale(request)
  return NextResponse.redirect(
    buildAssetQrRedirectUrl({
      targetPath: `/${locale}/assets/${asset.id}`,
      publicBaseUrl: publicBaseUrlSetting?.value,
      requestUrl: request.url,
      forwardedHost: request.headers.get("x-forwarded-host"),
      forwardedProto: request.headers.get("x-forwarded-proto"),
      host: request.headers.get("host"),
      fallbackBaseUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL,
    })
  )
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
