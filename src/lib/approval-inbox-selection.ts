// The approvals page's selection (group 6 plan 2 Task 3, spec §7.4): one kind at a time (disposal requests or
// findings), up to 200, kept across pages in sessionStorage and reset when the tab, the search or the overdue filter
// changes. Pure and client-safe: no imports, so node --test loads it.

export const approvalInboxSelectionStorageKey = "approval-inbox-selection"
/** The items opened in the right panel this session: a JSON array of "<key>:<id>" (written by the panel, Task 4). */
export const approvalInboxSeenStorageKey = "approval-inbox-seen"
/** One bulk approve at a time: as many as a disposal round, and the bulk-decision schema's limit. */
export const APPROVAL_INBOX_SELECTION_MAX = 200

export type ApprovalInboxSelectionKind = "disposal" | "finding"

export type StoredSelection = { kind: ApprovalInboxSelectionKind; ids: string[]; scope: string }

export type ApprovalInboxTickableIds = { disposal: readonly string[]; finding: readonly string[] }

/** The tab, the search and the overdue filter joined: a selection belongs to one of these. */
export function approvalInboxSelectionScope(query: { tab: string; search: string; overdue: boolean }): string {
  return JSON.stringify([query.tab, query.search.trim(), query.overdue ? 1 : 0])
}

function isKind(value: unknown): value is ApprovalInboxSelectionKind {
  return value === "disposal" || value === "finding"
}

/** sessionStorage's text as a selection; anything malformed (or nothing) is no selection. */
export function parseStoredSelection(raw: string | null | undefined): StoredSelection | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null
    const { kind, ids, scope } = value as Record<string, unknown>
    if (!isKind(kind) || typeof scope !== "string" || !Array.isArray(ids)) return null
    if (!ids.every((id): id is string => typeof id === "string")) return null
    return { kind, ids, scope }
  } catch {
    return null
  }
}

/** The seen list from sessionStorage: the "<key>:<id>" strings of a JSON array; anything else is empty. */
export function parseApprovalInboxSeen(raw: string | null | undefined): Set<string> {
  if (!raw) return new Set()
  try {
    const value = JSON.parse(raw) as unknown
    return Array.isArray(value) ? new Set(value.filter((entry): entry is string => typeof entry === "string")) : new Set()
  } catch {
    return new Set()
  }
}

/** The seen list with one more "<key>:<id>", as the JSON array to store; an item already there is not added twice. */
export function addApprovalInboxSeen(raw: string | null | undefined, itemKey: string): string {
  const seen = parseApprovalInboxSeen(raw)
  seen.add(itemKey)
  return JSON.stringify([...seen])
}

/**
 * The stored selection for the list now shown: null when it belongs to another tab, search or overdue filter;
 * otherwise only the ids still tickable for its kind (decided elsewhere or now filtered out drop away), or null when
 * none is left.
 */
export function restoreSelection(stored: StoredSelection | null, scope: string, tickable: ApprovalInboxTickableIds): StoredSelection | null {
  if (!stored || stored.scope !== scope) return null
  const allowed = new Set(tickable[stored.kind])
  const ids = stored.ids.filter((id) => allowed.has(id))
  return ids.length > 0 ? { kind: stored.kind, ids, scope } : null
}

/**
 * One tick or untick. A tick of the other kind (or into a selection of another scope) starts over with this id
 * (`restarted` when another kind was held); a tick past `max` is refused and the selection stays; unticking the last
 * id leaves no selection.
 */
export function toggleSelection(
  current: StoredSelection | null,
  kind: ApprovalInboxSelectionKind,
  id: string,
  scope: string,
  max: number = APPROVAL_INBOX_SELECTION_MAX,
): { next: StoredSelection | null; refused: "limit" | null; restarted: boolean } {
  const held = current && current.scope === scope && current.ids.length > 0 ? current : null
  if (!held || held.kind !== kind) {
    return { next: { kind, ids: [id], scope }, refused: null, restarted: held !== null }
  }
  if (held.ids.includes(id)) {
    const ids = held.ids.filter((entry) => entry !== id)
    return { next: ids.length > 0 ? { kind, ids, scope } : null, refused: null, restarted: false }
  }
  if (held.ids.length >= max) return { next: held, refused: "limit", restarted: false }
  return { next: { kind, ids: [...held.ids, id], scope }, refused: null, restarted: false }
}

/** Every tickable id of the kind, in inbox order, up to `max`; `capped` when some were left out. */
export function selectAll(
  kind: ApprovalInboxSelectionKind,
  tickableIds: readonly string[],
  scope: string,
  max: number = APPROVAL_INBOX_SELECTION_MAX,
): { next: StoredSelection; capped: boolean } {
  return { next: { kind, ids: tickableIds.slice(0, max), scope }, capped: tickableIds.length > max }
}

/**
 * The kind "เลือกทั้งหมดที่อนุมัติได้" selects on a tab (review fix round 1): the disposal tab disposal, the audit tab
 * findings; the all tab the kind already ticked, else disposal, else findings. Only a kind with tickable rows; null when
 * there is none.
 */
export function selectAllKind(
  tab: "all" | "disposal" | "audit",
  current: StoredSelection | null,
  tickable: ApprovalInboxTickableIds,
): ApprovalInboxSelectionKind | null {
  const has = (kind: ApprovalInboxSelectionKind) => tickable[kind].length > 0
  if (tab === "disposal") return has("disposal") ? "disposal" : null
  if (tab === "audit") return has("finding") ? "finding" : null
  if (current && has(current.kind)) return current.kind
  return has("disposal") ? "disposal" : has("finding") ? "finding" : null
}

/** The ids not opened in the panel this session, in order; `seen` holds "<key>:<id>". */
export function unopened(ids: readonly string[], seen: ReadonlySet<string>, kind: ApprovalInboxSelectionKind): string[] {
  return ids.filter((id) => !seen.has(`${kind}:${id}`))
}
