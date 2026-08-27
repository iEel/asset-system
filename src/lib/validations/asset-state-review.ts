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
