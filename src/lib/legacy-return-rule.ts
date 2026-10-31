import type { Prisma } from "@prisma/client"

import { outstandingLinkWhere } from "./asset-component-outstanding.ts"
import { openRepairRecordWhere } from "./repair-record-policy.ts"

// The legacy return rule (server search spec 6.3, group 3 spec §8.1, §8.5): who is offered ข้อมูลเก่า on รับคืน. It is
// pure, so the รับคืน page's count and the register's noHandover filter (Task 7) read one where. An outstanding
// component is returned late (§8.6), never backfilled.

/** The ownership types and statuses getCheckinVerdict takes on the legacy path (pinned against it, one rule). */
export const legacyReturnOwnershipTypes = ["personal", "shared", "stock"] as const
export const legacyReturnStatusNames = ["Ready", "In Use"] as const

/** ข้อมูลเก่า: a holder, no open handover, no open repair and no outstanding link. */
export const legacyReturnCountWhere: Prisma.AssetWhereInput = {
  isActive: true,
  custodianId: { not: null },
  ownershipType: { in: [...legacyReturnOwnershipTypes] },
  status: { name: { in: [...legacyReturnStatusNames] } },
  checkouts: { none: { isReturned: false, transactionStatus: "active" } },
  maintenanceTickets: { none: { ...openRepairRecordWhere } },
  installedInLinks: { none: outstandingLinkWhere },
}
