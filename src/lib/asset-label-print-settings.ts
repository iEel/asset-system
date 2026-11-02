import { prisma } from "@/lib/db"
import {
  assetLabelSettingKeys,
  parseAssetLabelTemplates,
  type AssetLabelTapeSize,
  type AssetLabelTemplates,
} from "./asset-label-template.ts"
import { assetQrPublicBaseUrlKey, normalizePublicQrBaseUrl } from "./asset-qr.ts"

// Server only (it reads the database and AUTH_URL). The label settings the print routes and the labels page need
// (group 4 plan 6 Task 2, recon X11): the tape templates, the default tape and the QR base, resolved here once, so a
// client builds each QR with the pure buildAssetQrValue({ assetId, publicBaseUrl: qrBaseUrl }). The base is the public
// QR setting, else AUTH_URL, else "" (a path-only QR, which the print route warns about).
export type AssetLabelPrintSettings = {
  templates: AssetLabelTemplates
  defaultTapeSize: AssetLabelTapeSize
  qrBaseUrl: string
}

export async function loadAssetLabelPrintSettings(): Promise<AssetLabelPrintSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...assetLabelSettingKeys, assetQrPublicBaseUrlKey] } },
    select: { key: true, value: true },
  })
  const values: Record<string, string | undefined> = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const templates = parseAssetLabelTemplates(values)

  return {
    templates,
    defaultTapeSize: templates.defaultTapeSize,
    qrBaseUrl: normalizePublicQrBaseUrl(values[assetQrPublicBaseUrlKey]) || normalizePublicQrBaseUrl(process.env.AUTH_URL),
  }
}
