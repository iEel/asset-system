// Disposal round numbers: DPR-yyyyMMdd-NNNN by the Bangkok day (group 6 spec §11.1).
// The caller passes the day key from getBangkokDateKey (src/lib/preventive-maintenance.ts), e.g. "2026-11-05",
// and runs the count and the create inside withPrismaUniqueRetry so two rounds saved at once get distinct numbers.

export type DisposalRoundCounter = {
  disposalRound: {
    count(args: { where: { roundNo: { startsWith: string } } }): Promise<number>
  }
}

function disposalRoundPrefix(bangkokDateKey: string) {
  return `DPR-${bangkokDateKey.replace(/-/g, "")}-`
}

export function formatDisposalRoundNumber(bangkokDateKey: string, sequence: number): string {
  return `${disposalRoundPrefix(bangkokDateKey)}${String(sequence).padStart(4, "0")}`
}

// That Bangkok day's rounds plus one.
export async function nextDisposalRoundSequence(db: DisposalRoundCounter, bangkokDateKey: string): Promise<number> {
  const count = await db.disposalRound.count({ where: { roundNo: { startsWith: disposalRoundPrefix(bangkokDateKey) } } })
  return count + 1
}
