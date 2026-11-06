import { z } from "zod"

// PATCH /api/{companies,branches,departments,categories,suppliers}/[id] (group 8 plan 1 final review): เปิดใช้งาน from the list sends only
// { isActive: true }, so nothing else of the record is written (no stale render-time snapshot goes back).
export const masterDataReactivateSchema = z.object({ isActive: z.literal(true) }).strict()
