import { z } from "zod"
import {
  assetStateReviewIssueTypes,
  assetStateReviewSeverities,
  assetStateReviewStatuses,
} from "../asset-state-review-types.ts"

export const assetStateReviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  reviewStatus: z.enum(assetStateReviewStatuses).default("pending"),
  severity: z.enum(assetStateReviewSeverities).optional(),
  issueType: z.enum(assetStateReviewIssueTypes).optional(),
  statusId: z.string().trim().min(1).optional(),
  conditionId: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional(),
  branchId: z.string().trim().min(1).optional(),
}).strict()

export const assetStateReviewResolutionSchema = z.object({
  statusId: z.string().trim().min(1).optional(),
  conditionId: z.string().trim().min(1).optional(),
  reason: z.string().trim().min(10).max(2000),
}).strict().refine((value) => Boolean(value.statusId || value.conditionId), {
  message: "A status or condition target is required",
})

export const assetStateReviewDismissSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
}).strict()
