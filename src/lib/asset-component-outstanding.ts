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
