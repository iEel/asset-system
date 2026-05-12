export const assetLabelSettingKeys = [
  "asset_label_default_tape_size",
  "asset_label_12_width_mm",
  "asset_label_12_qr_size",
  "asset_label_12_primary_template",
  "asset_label_12_secondary_template",
  "asset_label_12_tertiary_template",
  "asset_label_18_width_mm",
  "asset_label_18_qr_size",
  "asset_label_18_primary_template",
  "asset_label_18_secondary_template",
  "asset_label_18_tertiary_template",
] as const

export type AssetLabelTapeSize = "12" | "18"

export type AssetLabelTemplates = {
  defaultTapeSize: AssetLabelTapeSize
  tapes: Record<
    AssetLabelTapeSize,
    {
      widthMm: number
      qrSize: number
      lines: [string, string, string]
    }
  >
}

export type AssetLabelTokenValues = {
  assetTag: string
  assetName: string
  serialNumber: string
  category: string
  company: string
  branch: string
  location: string
  scanHint: string
}

export const assetLabelTemplateTokens = [
  "assetTag",
  "assetName",
  "serialNumber",
  "category",
  "company",
  "branch",
  "location",
  "scanHint",
] as const

export const defaultAssetLabelTemplates: AssetLabelTemplates = {
  defaultTapeSize: "18",
  tapes: {
    "12": {
      widthMm: 60,
      qrSize: 34,
      lines: ["{assetTag}", "{scanHint}", ""],
    },
    "18": {
      widthMm: 70,
      qrSize: 48,
      lines: ["{assetTag}", "{assetName}", "{serialNumber}"],
    },
  },
}

export function parseAssetLabelTemplates(values: Record<string, string | undefined>): AssetLabelTemplates {
  return {
    defaultTapeSize: values.asset_label_default_tape_size === "12" ? "12" : "18",
    tapes: {
      "12": {
        widthMm: numberOrDefault(values.asset_label_12_width_mm, defaultAssetLabelTemplates.tapes["12"].widthMm),
        qrSize: numberOrDefault(values.asset_label_12_qr_size, defaultAssetLabelTemplates.tapes["12"].qrSize),
        lines: [
          values.asset_label_12_primary_template ?? defaultAssetLabelTemplates.tapes["12"].lines[0],
          values.asset_label_12_secondary_template ?? defaultAssetLabelTemplates.tapes["12"].lines[1],
          values.asset_label_12_tertiary_template ?? defaultAssetLabelTemplates.tapes["12"].lines[2],
        ],
      },
      "18": {
        widthMm: numberOrDefault(values.asset_label_18_width_mm, defaultAssetLabelTemplates.tapes["18"].widthMm),
        qrSize: numberOrDefault(values.asset_label_18_qr_size, defaultAssetLabelTemplates.tapes["18"].qrSize),
        lines: [
          values.asset_label_18_primary_template ?? defaultAssetLabelTemplates.tapes["18"].lines[0],
          values.asset_label_18_secondary_template ?? defaultAssetLabelTemplates.tapes["18"].lines[1],
          values.asset_label_18_tertiary_template ?? defaultAssetLabelTemplates.tapes["18"].lines[2],
        ],
      },
    },
  }
}

export function renderAssetLabelTemplate(template: string, values: AssetLabelTokenValues) {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (_, token: keyof AssetLabelTokenValues) => values[token] ?? "")
}

function numberOrDefault(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
