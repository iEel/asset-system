export const assetLabelSettingKeys = [
  "asset_label_default_tape_size",
  "asset_label_12_width_mm",
  "asset_label_12_height_mm",
  "asset_label_12_qr_size",
  "asset_label_12_margin_mm",
  "asset_label_12_gap_mm",
  "asset_label_12_layout",
  "asset_label_12_primary_template",
  "asset_label_12_secondary_template",
  "asset_label_12_tertiary_template",
  "asset_label_18_width_mm",
  "asset_label_18_height_mm",
  "asset_label_18_qr_size",
  "asset_label_18_margin_mm",
  "asset_label_18_gap_mm",
  "asset_label_18_layout",
  "asset_label_18_primary_template",
  "asset_label_18_secondary_template",
  "asset_label_18_tertiary_template",
  "asset_label_24_width_mm",
  "asset_label_24_height_mm",
  "asset_label_24_qr_size",
  "asset_label_24_margin_mm",
  "asset_label_24_gap_mm",
  "asset_label_24_layout",
  "asset_label_24_primary_template",
  "asset_label_24_secondary_template",
  "asset_label_24_tertiary_template",
  "asset_label_custom_width_mm",
  "asset_label_custom_height_mm",
  "asset_label_custom_qr_size",
  "asset_label_custom_margin_mm",
  "asset_label_custom_gap_mm",
  "asset_label_custom_layout",
  "asset_label_custom_primary_template",
  "asset_label_custom_secondary_template",
  "asset_label_custom_tertiary_template",
] as const

export type AssetLabelTapeSize = "12" | "18" | "24" | "custom"
export type AssetLabelLayout = "qr-left" | "qr-top" | "text-only" | "qr-only"

export const assetLabelTapeSizes = ["12", "18", "24", "custom"] as const
export const assetLabelLayouts = ["qr-left", "qr-top", "text-only", "qr-only"] as const
const cssPxPerMm = 96 / 25.4

export const assetLabelTapePrinterSizes: Record<AssetLabelTapeSize, string> = {
  "12": '12mm / 0.47"',
  "18": '18mm / 0.70"',
  "24": '24mm / 0.94"',
  custom: "Custom",
}

export const assetLabelPresets: Record<
  AssetLabelTapeSize,
  {
    label: string
    widthMm: number
    heightMm: number
    qrSize: number
    marginMm: number
    gapMm: number
    layout: AssetLabelLayout
    lines: [string, string, string]
  }
> = {
  "12": {
    label: "12 mm",
    widthMm: 60,
    heightMm: 12,
    qrSize: 34,
    marginMm: 1.5,
    gapMm: 1.5,
    layout: "qr-left",
    lines: ["{assetTag}", "{scanHint}", ""],
  },
  "18": {
    label: "18 mm",
    widthMm: 70,
    heightMm: 18,
    qrSize: 44,
    marginMm: 1.5,
    gapMm: 1.5,
    layout: "qr-left",
    lines: ["{assetTag}", "{assetName}", "{serialNumber}"],
  },
  "24": {
    label: "24 mm",
    widthMm: 80,
    heightMm: 24,
    qrSize: 58,
    marginMm: 2,
    gapMm: 2,
    layout: "qr-left",
    lines: ["{assetTag}", "{assetName}", "{location}"],
  },
  custom: {
    label: "Custom",
    widthMm: 60,
    heightMm: 40,
    qrSize: 70,
    marginMm: 2,
    gapMm: 2,
    layout: "qr-left",
    lines: ["{assetTag}", "{assetName}", "{serialNumber}"],
  },
}

export type AssetLabelTemplates = {
  defaultTapeSize: AssetLabelTapeSize
  tapes: Record<
    AssetLabelTapeSize,
    {
      widthMm: number
      heightMm: number
      qrSize: number
      marginMm: number
      gapMm: number
      layout: AssetLabelLayout
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
    "12": presetToTemplate("12"),
    "18": presetToTemplate("18"),
    "24": presetToTemplate("24"),
    custom: presetToTemplate("custom"),
  },
}

export function parseAssetLabelTemplates(values: Record<string, string | undefined>): AssetLabelTemplates {
  const defaultTapeSize = assetLabelTapeSizes.includes(values.asset_label_default_tape_size as AssetLabelTapeSize)
    ? values.asset_label_default_tape_size as AssetLabelTapeSize
    : "18"

  return {
    defaultTapeSize,
    tapes: {
      "12": parseTape(values, "12"),
      "18": parseTape(values, "18"),
      "24": parseTape(values, "24"),
      custom: parseTape(values, "custom"),
    },
  }
}

export function renderAssetLabelTemplate(template: string, values: AssetLabelTokenValues) {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (_, token: keyof AssetLabelTokenValues) => values[token] ?? "")
}

export function getAssetLabelTapePrinterSize(size: AssetLabelTapeSize) {
  return assetLabelTapePrinterSizes[size]
}

export function formatAssetLabelPageSize(config: Pick<AssetLabelTemplates["tapes"][AssetLabelTapeSize], "widthMm" | "heightMm">) {
  return `${formatMm(config.widthMm)}mm ${formatMm(config.heightMm)}mm`
}

export function assetLabelQrSizeToMm(qrSizePx: number) {
  return Math.round((qrSizePx / cssPxPerMm) * 100) / 100
}

function numberOrDefault(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function formatMm(value: number) {
  return Number.isInteger(value) ? String(value) : String(value)
}

function presetToTemplate(size: AssetLabelTapeSize): AssetLabelTemplates["tapes"][AssetLabelTapeSize] {
  const preset = assetLabelPresets[size]
  return {
    widthMm: preset.widthMm,
    heightMm: preset.heightMm,
    qrSize: preset.qrSize,
    marginMm: preset.marginMm,
    gapMm: preset.gapMm,
    layout: preset.layout,
    lines: preset.lines,
  }
}

function parseTape(values: Record<string, string | undefined>, size: AssetLabelTapeSize) {
  const fallback = defaultAssetLabelTemplates.tapes[size]
  const prefix = `asset_label_${size}`
  const layout = assetLabelLayouts.includes(values[`${prefix}_layout`] as AssetLabelLayout)
    ? values[`${prefix}_layout`] as AssetLabelLayout
    : fallback.layout

  return {
    widthMm: numberOrDefault(values[`${prefix}_width_mm`], fallback.widthMm),
    heightMm: numberOrDefault(values[`${prefix}_height_mm`], fallback.heightMm),
    qrSize: numberOrDefault(values[`${prefix}_qr_size`], fallback.qrSize),
    marginMm: numberOrDefault(values[`${prefix}_margin_mm`], fallback.marginMm),
    gapMm: numberOrDefault(values[`${prefix}_gap_mm`], fallback.gapMm),
    layout,
    lines: [
      values[`${prefix}_primary_template`] ?? fallback.lines[0],
      values[`${prefix}_secondary_template`] ?? fallback.lines[1],
      values[`${prefix}_tertiary_template`] ?? fallback.lines[2],
    ] as [string, string, string],
  }
}
