import { z } from "zod"
import { assetTagFormatTemplateKey } from "@/lib/system-setting-defaults"

const assetTagFormatTokens = new Set([
  "companyCode",
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
})

export type SystemSettingsUpdateInput = z.infer<typeof systemSettingsUpdateSchema>
