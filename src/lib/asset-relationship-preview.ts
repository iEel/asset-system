export function splitRelationshipPreview<T>(items: readonly T[], visibleCount = 5) {
  const boundedCount = Math.max(0, Math.trunc(visibleCount))
  return {
    visible: items.slice(0, boundedCount),
    remaining: items.slice(boundedCount),
  }
}
