import { z } from "zod"
import { assetLabelSettingKeys, assetLabelTemplateTokens } from "@/lib/asset-label-template"
import { assetTagFormatTemplateKey } from "@/lib/system-setting-defaults"

const assetTagFormatTokens = new Set([
  "companyCode",
  "assetCompanyCode",
  "branchCode",
  "categoryCode",
  "assetPrefix",
  "globalPrefix",
  "year",
  "year2",
  "month",
  "day",
  "running",
  "separator",
])
const assetLabelTokens = new Set<string>(assetLabelTemplateTokens)
const assetLabelTemplateKeySet = new Set<string>(
  assetLabelSettingKeys.filter((key) => key.endsWith("_template"))
)
const assetLabelWidthKeys = new Set<string>(["asset_label_12_width_mm", "asset_label_18_width_mm"])
const assetLabelQrSizeKeys = new Set<string>(["asset_label_12_qr_size", "asset_label_18_qr_size"])

export const systemSettingsUpdateSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(100),
        value: z.string().trim().max(5000),
      })
    )
    .min(1),
}).superRefine((input, context) => {
  for (const [index, setting] of input.settings.entries()) {
    if (setting.key !== assetTagFormatTemplateKey) continue

    const tokens = Array.from(setting.value.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
    const hasInvalidToken = tokens.some((token) => !assetTagFormatTokens.has(token))
    if (!setting.value.includes("{running}") || hasInvalidToken) {
      context.addIssue({
        code: "custom",
        message: "Asset tag format template must include {running} and only use supported tokens",
        path: ["settings", index, "value"],
      })
    }
  }

  for (const [index, setting] of input.settings.entries()) {
    if (setting.key === "asset_label_default_tape_size" && !["12", "18"].includes(setting.value)) {
      context.addIssue({
        code: "custom",
        message: "Default asset label tape size must be 12 or 18",
        path: ["settings", index, "value"],
      })
    }

    if (assetLabelWidthKeys.has(setting.key)) {
      const width = Number(setting.value)
      if (!Number.isFinite(width) || width < 30 || width > 120) {
        context.addIssue({
          code: "custom",
          message: "Asset label width must be between 30 and 120 mm",
          path: ["settings", index, "value"],
        })
      }
    }

    if (assetLabelQrSizeKeys.has(setting.key)) {
      const qrSize = Number(setting.value)
      if (!Number.isFinite(qrSize) || qrSize < 20 || qrSize > 90) {
        context.addIssue({
          code: "custom",
          message: "Asset label QR size must be between 20 and 90 px",
          path: ["settings", index, "value"],
        })
      }
    }

    if (assetLabelTemplateKeySet.has(setting.key)) {
      const tokens = Array.from(setting.value.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
      const hasInvalidToken = tokens.some((token) => !assetLabelTokens.has(token))
      if (hasInvalidToken) {
        context.addIssue({
          code: "custom",
          message: "Asset label template uses unsupported tokens",
          path: ["settings", index, "value"],
        })
      }
    }
  }
})

export type SystemSettingsUpdateInput = z.infer<typeof systemSettingsUpdateSchema>
