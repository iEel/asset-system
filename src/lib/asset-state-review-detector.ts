import {
  getAssetConditionCompatibilityIssue,
  getMaintenanceOperationalTarget,
  normalizeAssetStateName,
} from "./asset-lifecycle-policy.ts"
import type {
  AssetStateObservedSnapshot,
  AssetStateReviewCandidate,
  AssetStateReviewSeverity,
} from "./asset-state-review-types.ts"

const repairStatuses = new Set(["pending repair", "under maintenance"])
const controlledLegacyStatuses = new Set(["reserved", "in transit", "under inspection"])
const legacyConditions = new Map([
  ["excellent", "Good"],
  ["poor", "Damaged"],
])

export function detectAssetStateIssues(snapshot: AssetStateObservedSnapshot): AssetStateReviewCandidate[] {
  const issues: AssetStateReviewCandidate[] = []
  const status = normalizeAssetStateName(snapshot.statusName)
  const condition = normalizeAssetStateName(snapshot.conditionName)
  const operationalTarget = getMaintenanceOperationalTarget(snapshot)

  if (repairStatuses.has(status) && snapshot.activeCorrectiveTickets === 0) {
    issues.push(candidate("repair_status_without_active_ticket", "critical", {
      suggestedStatusName: operationalTarget,
      metadata: { statusName: snapshot.statusName, activeCorrectiveTickets: 0 },
    }))
  }

  if (snapshot.activeCorrectiveTickets > 0 && !repairStatuses.has(status)) {
    const workStarted = snapshot.activeCorrectiveStatusNames.some((name) =>
      ["in_progress", "waiting_parts", "waiting_vendor"].includes(normalizeAssetStateName(name))
    )
    issues.push(candidate("active_repair_ticket_status_mismatch", "critical", {
      suggestedStatusName: workStarted ? "Under Maintenance" : "Pending Repair",
      metadata: {
        statusName: snapshot.statusName,
        activeCorrectiveTickets: snapshot.activeCorrectiveTickets,
        activeCorrectiveStatusNames: snapshot.activeCorrectiveStatusNames.slice(0, 10),
      },
    }))
  }

  if (status === "checked out" && snapshot.openCheckouts === 0) {
    issues.push(candidate("checked_out_without_open_checkout", "critical", {
      suggestedStatusName: operationalTarget,
      metadata: { statusName: snapshot.statusName, openCheckouts: 0 },
    }))
  }

  if (snapshot.openCheckouts > 0 && status !== "checked out") {
    issues.push(candidate("open_checkout_status_mismatch", "critical", {
      suggestedStatusName: "Checked Out",
      metadata: { statusName: snapshot.statusName, openCheckouts: snapshot.openCheckouts },
    }))
  }

  if (normalizeAssetStateName(snapshot.ownershipType) === "personal" && status === "in use" && !snapshot.custodianId) {
    issues.push(candidate("personal_in_use_without_custodian", "warning", {
      suggestedStatusName: "Ready",
      metadata: { ownershipType: snapshot.ownershipType, custodianId: null },
    }))
  }

  if (normalizeAssetStateName(snapshot.ownershipType) === "personal" && status === "ready" && snapshot.custodianId) {
    issues.push(candidate("personal_ready_with_custodian", "warning", {
      suggestedStatusName: "In Use",
      metadata: { ownershipType: snapshot.ownershipType, custodianId: snapshot.custodianId },
    }))
  }

  const compatibilityIssue = getAssetConditionCompatibilityIssue(snapshot.statusName, snapshot.conditionName)
  if (compatibilityIssue) {
    issues.push(candidate("incompatible_status_condition", compatibilityIssue === "operational_asset_is_damaged" ? "critical" : "warning", {
      metadata: { statusName: snapshot.statusName, conditionName: snapshot.conditionName, compatibilityIssue },
    }))
  }

  const suggestedConditionName = legacyConditions.get(condition)
  if (suggestedConditionName) {
    issues.push(candidate("legacy_condition_value", "info", {
      suggestedConditionName,
      metadata: { conditionName: snapshot.conditionName },
    }))
  }

  if (controlledLegacyStatuses.has(status)) {
    issues.push(candidate("controlled_legacy_status", "warning", {
      suggestedStatusName: operationalTarget,
      metadata: { statusName: snapshot.statusName },
    }))
  }

  if (snapshot.openDisposalsMissingPreviousStatus > 0) {
    issues.push(candidate("legacy_disposal_missing_previous_status", "warning", {
      suggestedStatusName: operationalTarget,
      metadata: { openDisposalsMissingPreviousStatus: snapshot.openDisposalsMissingPreviousStatus },
    }))
  }

  return issues
}

function candidate(
  issueType: AssetStateReviewCandidate["issueType"],
  severity: AssetStateReviewSeverity,
  value: Omit<AssetStateReviewCandidate, "issueType" | "severity">,
): AssetStateReviewCandidate {
  return { issueType, severity, ...value }
}
