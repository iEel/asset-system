// Page group 12 plan 2 task 3 (spec §4, §15 item 6; board AD-Logs): what one /admin/logs row shows. Pure, so tests
// and the page both load it.

const INTEGRATION_MODULE = "integration_api"

type LogUserRow = {
  module: string
  recordId: string | null
  user: { displayName: string | null; username: string } | null
}

/** The integration clients named on a page: integration_api rows with no user, whose recordId is the client id. */
export function systemLogIntegrationClientIds(logs: readonly LogUserRow[]): string[] {
  const ids = new Set<string>()
  for (const log of logs) {
    if (!log.user && log.module === INTEGRATION_MODULE && log.recordId) ids.add(log.recordId)
  }
  return [...ids]
}

/**
 * The ผู้ใช้ cell: the user's name; an integration_api row with no user reads "Integration API · {client}", with the
 * client's display name or, when the client is gone, its raw id; any other row with no user is a scheduled job.
 */
export function systemLogUserLabel(
  log: LogUserRow,
  clientNames: ReadonlyMap<string, string>,
  labels: { system: string; integration: (client: string) => string },
): string {
  if (log.user) return log.user.displayName || log.user.username
  if (log.module === INTEGRATION_MODULE) {
    // A client id that names no client (removed since) shows as itself.
    const clientId = log.recordId ?? ""
    return labels.integration(clientNames.get(clientId) ?? clientId)
  }
  return labels.system
}

/** An asset's record label is "{tag} - {name}"; the event sentence shows the name before the tag. */
export function splitAssetRecordLabel(label: string): { tag: string; name: string } | null {
  const index = label.indexOf(" - ")
  if (index <= 0) return null
  return { tag: label.slice(0, index), name: label.slice(index + 3) }
}

/**
 * The part of the presenter's summary after the record: the event already shows the action and the record, so
 * "แก้ไข {record}: ราคา …" reads "ราคา …". A summary that does not name the record (the notification digest) stays whole.
 */
export function systemLogEventDetail(summary: string, recordLabel: string): string {
  if (!recordLabel || recordLabel === "-") return summary
  const index = summary.indexOf(recordLabel)
  if (index < 0) return summary
  return summary.slice(index + recordLabel.length).replace(/^\s*:?\s*/, "")
}
