export type ComponentConfirmationMismatch = {
  type: string
  expectedValue: string | null
  actualValue: string | null
}

export type ComponentConfirmationPendingFinding = {
  id: string
  findingType: string
}

export type ComponentConfirmationFindingActions = {
  create: ComponentConfirmationMismatch[]
  update: Array<{ findingId: string; mismatch: ComponentConfirmationMismatch }>
  reject: Array<{ findingId: string; findingType: string }>
}

export function buildComponentConfirmationFindingActions(
  existingPendingFindings: ComponentConfirmationPendingFinding[],
  mismatches: ComponentConfirmationMismatch[]
): ComponentConfirmationFindingActions {
  const mismatchByType = new Map<string, ComponentConfirmationMismatch>()
  for (const mismatch of mismatches) {
    if (!mismatchByType.has(mismatch.type)) {
      mismatchByType.set(mismatch.type, mismatch)
    }
  }

  const reusableFindingByType = new Map<string, ComponentConfirmationPendingFinding>()
  const reject: ComponentConfirmationFindingActions["reject"] = []

  for (const finding of existingPendingFindings) {
    if (mismatchByType.has(finding.findingType) && !reusableFindingByType.has(finding.findingType)) {
      reusableFindingByType.set(finding.findingType, finding)
      continue
    }

    reject.push({ findingId: finding.id, findingType: finding.findingType })
  }

  const create: ComponentConfirmationFindingActions["create"] = []
  const update: ComponentConfirmationFindingActions["update"] = []

  for (const mismatch of mismatchByType.values()) {
    const existingFinding = reusableFindingByType.get(mismatch.type)
    if (existingFinding) {
      update.push({ findingId: existingFinding.id, mismatch })
    } else {
      create.push(mismatch)
    }
  }

  return { create, update, reject }
}

export function isRetryableComponentConfirmationTransactionError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const code = "code" in error ? String(error.code) : null
  if (code === "P2034") return true

  const message = "message" in error ? String(error.message).toLowerCase() : ""
  return (
    message.includes("write conflict") ||
    message.includes("deadlock") ||
    message.includes("serialization")
  )
}
