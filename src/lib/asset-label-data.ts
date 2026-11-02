import { buildAssetQrValue } from "./asset-qr.ts"

// The one mapper from an asset to the data a label draws (group 4 plan 6 Task 5 review): the print routes (from the
// Prisma asset) and the labels page's preview (from the queue row) both call it, so the preview shows the lines the
// label prints. Company and branch print as codes; category and room as "code - name"; the QR is /q/a/<id> on the
// base the server resolved (recon X11). Pure, so node --test runs it.

type CodeName = { code: string; name: string }

export type AssetLabelDataSource = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  category: CodeName
  company: { code: string }
  branch: { code: string }
  location: CodeName | null
}

export type AssetLabelData = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  category: string
  company: string
  branch: string
  location: string
  qrValue: string
}

const codeName = (value: CodeName | null) => (value ? `${value.code} - ${value.name}` : "")

export function toAssetLabelData(source: AssetLabelDataSource, qrBaseUrl: string): AssetLabelData {
  return {
    id: source.id,
    assetTag: source.assetTag,
    name: source.name,
    serialNumber: source.serialNumber,
    category: codeName(source.category),
    company: source.company.code,
    branch: source.branch.code,
    location: codeName(source.location),
    qrValue: buildAssetQrValue({ assetId: source.id, publicBaseUrl: qrBaseUrl }),
  }
}
