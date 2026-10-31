// A component link that did not come back on a return (group 3 spec §8.5): still linked to its parent, not installed.
// Every installed-only read keeps pairing `status: "installed"` with `removedAt: null`, so an outstanding link drops
// out of them. Spread a where into a query; never mutate it.

export const COMPONENT_LINK_OUTSTANDING = "outstanding"

export const outstandingLinkWhere: { status: string; removedAt: null } = {
  status: COMPONENT_LINK_OUTSTANDING,
  removedAt: null,
}

export const installedOrOutstandingLinkWhere: { status: { in: string[] }; removedAt: null } = {
  status: { in: ["installed", COMPONENT_LINK_OUTSTANDING] },
  removedAt: null,
}

export function isOutstandingLink(link: { status: string; removedAt?: Date | string | null }): boolean {
  return link.status === COMPONENT_LINK_OUTSTANDING && !link.removedAt
}

// The line an outstanding link reads on every page (group 3 spec §8.5): the asset pages and the component manager. The
// words come from the caller (asset.componentOutstanding, componentOutstandingWith), so this module keeps no import.
export function formatOutstandingComponentLine(
  input: { holder: { code: string; fullNameTh: string } | null; documentNo: string | null },
  words: { outstanding: string; withHolder: (holder: string) => string },
): string {
  const holder = input.holder ? `${input.holder.code} - ${input.holder.fullNameTh}` : null
  return [words.outstanding, holder ? words.withHolder(holder) : null, input.documentNo].filter((part): part is string => Boolean(part)).join(" · ")
}
