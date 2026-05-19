import { z } from "zod"
import { assetLabelLayouts, assetLabelSettingKeys, assetLabelTapeSizes, assetLabelTemplateTokens } from "@/lib/asset-label-template"
import { assetQrPublicBaseUrlKey, normalizePublicQrBaseUrl } from "@/lib/asset-qr"
import {
  checkinDocumentTemplateKey,
  checkoutDocumentTemplateKey,
  operationDocumentRunningDigitsKey,
  assetTagFormatTemplateKey,
  notificationRuleSettingKeys,
} from "@/lib/system-setting-defaults"
import { validateOperationDocumentTemplate } from "@/lib/operation-document-number"
import { workflowApprovalMinApproversKey, workflowApprovalSettingKeys } from "@/lib/workflow-approval"

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
const assetLabelWidthKeys = new Set<string>(assetLabelTapeSizes.map((size) => `asset_label_${size}_width_mm`))
const assetLabelHeightKeys = new Set<string>(assetLabelTapeSizes.map((size) => `asset_label_${size}_height_mm`))
const assetLabelQrSizeKeys = new Set<string>(assetLabelTapeSizes.map((size) => `asset_label_${size}_qr_size`))
const assetLabelSpacingKeys = new Set<string>([
  ...assetLabelTapeSizes.map((size) => `asset_label_${size}_margin_mm`),
  ...assetLabelTapeSizes.map((size) => `asset_label_${size}_gap_mm`),
])
const assetLabelLayoutKeys = new Set<string>(assetLabelTapeSizes.map((size) => `asset_label_${size}_layout`))
const operationDocumentTemplateKeys = new Set<string>([checkoutDocumentTemplateKey, checkinDocumentTemplateKey])
const notificationRuleKeys = new Set<string>(notificationRuleSettingKeys)
const workflowApprovalBooleanKeys = new Set<string>(
  workflowApprovalSettingKeys.filter((key) => key !== workflowApprovalMinApproversKey)
)

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
    if (setting.key === "asset_label_default_tape_size" && !assetLabelTapeSizes.includes(setting.value as (typeof assetLabelTapeSizes)[number])) {
      context.addIssue({
        code: "custom",
        message: "Default asset label tape size must be 12, 18, 24, or custom",
        path: ["settings", index, "value"],
      })
    }

    if (setting.key === assetQrPublicBaseUrlKey && setting.value && !normalizePublicQrBaseUrl(setting.value)) {
      context.addIssue({
        code: "custom",
        message: "Public QR base URL must be a valid http or https URL",
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

    if (assetLabelHeightKeys.has(setting.key)) {
      const height = Number(setting.value)
      if (!Number.isFinite(height) || height < 10 || height > 100) {
        context.addIssue({
          code: "custom",
          message: "Asset label height must be between 10 and 100 mm",
          path: ["settings", index, "value"],
        })
      }
    }

    if (assetLabelSpacingKeys.has(setting.key)) {
      const spacing = Number(setting.value)
      if (!Number.isFinite(spacing) || spacing < 0 || spacing > 10) {
        context.addIssue({
          code: "custom",
          message: "Asset label spacing must be between 0 and 10 mm",
          path: ["settings", index, "value"],
        })
      }
    }

    if (assetLabelLayoutKeys.has(setting.key) && !assetLabelLayouts.includes(setting.value as (typeof assetLabelLayouts)[number])) {
      context.addIssue({
        code: "custom",
        message: "Asset label layout is not supported",
        path: ["settings", index, "value"],
      })
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

    if (operationDocumentTemplateKeys.has(setting.key) && !validateOperationDocumentTemplate(setting.value)) {
      context.addIssue({
        code: "custom",
        message: "Operation document template must include {running} and only use supported tokens",
        path: ["settings", index, "value"],
      })
    }

    if (setting.key === operationDocumentRunningDigitsKey) {
      const digits = Number(setting.value)
      if (!Number.isFinite(digits) || digits < 1 || digits > 12) {
        context.addIssue({
          code: "custom",
          message: "Operation document running digits must be between 1 and 12",
          path: ["settings", index, "value"],
        })
      }
    }

    if (notificationRuleKeys.has(setting.key)) {
      const days = Number(setting.value)
      if (!Number.isInteger(days) || days < 0 || days > 365) {
        context.addIssue({
          code: "custom",
          message: "Notification rule days must be an integer between 0 and 365",
          path: ["settings", index, "value"],
        })
      }
    }

    if (workflowApprovalBooleanKeys.has(setting.key) && setting.value !== "true" && setting.value !== "false") {
      context.addIssue({
        code: "custom",
        message: "Workflow approval toggle values must be true or false",
        path: ["settings", index, "value"],
      })
    }

    if (setting.key === workflowApprovalMinApproversKey) {
      const approvers = Number(setting.value)
      if (!Number.isInteger(approvers) || approvers < 1 || approvers > 5) {
        context.addIssue({
          code: "custom",
          message: "Workflow approval minimum approvers must be an integer between 1 and 5",
          path: ["settings", index, "value"],
        })
      }
    }
  }
})

export type SystemSettingsUpdateInput = z.infer<typeof systemSettingsUpdateSchema>
