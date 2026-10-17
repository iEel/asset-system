// The one EXEMPT check of the three guard files (spec 2D §5.1, §5.2, D1, D13). A rule counts its matches per file over
// all of src. A file with a match is an owner (a shared part that writes the raw thing itself, §5.2) or an EXEMPT row
// with its exact count, why it stays, the ruling that keeps it and its kind: "permanent", or "phase 3" for a site that
// phase 3 takes. Every other file counts 0. exemptProblems returns every problem as one line, so a guard that asserts
// deepEqual(exemptProblems(…), []) with no message of its own prints them all.

export type ExemptKind = "permanent" | "phase 3"
export type ExemptEntry = { count: number; kind: ExemptKind; why: string; ruling: string }
export type ExemptList = Readonly<Record<string, ExemptEntry>>

const KINDS: readonly string[] = ["permanent", "phase 3"]

export function exemptProblems(
  rule: string,
  counts: Readonly<Record<string, number>>,
  exempt: ExemptList,
  owners: readonly string[] = [],
): string[] {
  const problems: string[] = []
  for (const [file, count] of Object.entries(counts)) {
    if (count > 0 && !owners.includes(file) && !Object.hasOwn(exempt, file)) {
      problems.push(`${rule}: ${file} has ${count}, and it is not in EXEMPT (use the shared part; a site that must stay needs a row with its count, kind, why and ruling)`)
    }
  }
  for (const [file, entry] of Object.entries(exempt)) {
    if (owners.includes(file)) {
      problems.push(`${rule}: ${file} is an owner, so it must not be in EXEMPT`)
      continue
    }
    if (!Number.isInteger(entry.count) || entry.count < 1) problems.push(`${rule}: ${file}: count must be a whole number above 0, not ${entry.count}`)
    if (!KINDS.includes(entry.kind)) problems.push(`${rule}: ${file}: kind must be "permanent" or "phase 3", not ${JSON.stringify(entry.kind)}`)
    if (typeof entry.why !== "string" || entry.why.trim() === "") problems.push(`${rule}: ${file}: why is empty`)
    if (typeof entry.ruling !== "string" || entry.ruling.trim() === "") problems.push(`${rule}: ${file}: ruling is empty`)
    const live = counts[file] ?? 0
    if (live > entry.count) problems.push(`${rule}: ${file} has ${live}, more than its EXEMPT count ${entry.count} (move the new site to the shared part)`)
    else if (live < entry.count) problems.push(`${rule}: ${file} has ${live}, fewer than its EXEMPT count ${entry.count} (${live === 0 ? "delete the row" : `lower the row to ${live}`})`)
  }
  return problems
}

// The "phase 3" rows of every list, rule by rule in the order given, so phase 3 knows how many sites it takes.
export function phase3Rows(lists: Readonly<Record<string, ExemptList>>): Array<{ rule: string; file: string; count: number; why: string; ruling: string }> {
  return Object.entries(lists).flatMap(([rule, list]) =>
    Object.entries(list)
      .filter(([, entry]) => entry.kind === "phase 3")
      .map(([file, entry]) => ({ rule, file, count: entry.count, why: entry.why, ruling: entry.ruling })),
  )
}
