// The TR- document's signature boxes: the person who hands the asset over and the approver, and between them the new
// custodian when the transfer gives the asset to someone else (user decision 2026-10-21, FX13). The new custodian signs
// on paper, so the box has no image.

type TransferSignatureLabels = {
  checkedOutBy: string
  receiver: string
  approver: string
  signatureDate: string
}

type TransferCustodians = {
  beforeCustodianId: string | null | undefined
  afterCustodianId: string | null | undefined
}

export function buildTransferSignatures({ beforeCustodianId, afterCustodianId }: TransferCustodians, labels: TransferSignatureLabels) {
  const changesCustodian = Boolean(afterCustodianId) && afterCustodianId !== beforeCustodianId
  return [
    { title: labels.checkedOutBy, helper: labels.signatureDate },
    ...(changesCustodian ? [{ title: labels.receiver, helper: labels.signatureDate }] : []),
    { title: labels.approver, helper: labels.signatureDate },
  ]
}
