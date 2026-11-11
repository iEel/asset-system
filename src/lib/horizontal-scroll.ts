type HorizontalScrollMetrics = {
  scrollLeft: number
  clientWidth: number
  scrollWidth: number
}

export function hasRemainingHorizontalContent(
  { scrollLeft, clientWidth, scrollWidth }: HorizontalScrollMetrics,
  tolerance = 4,
) {
  return scrollLeft + clientWidth < scrollWidth - tolerance
}

// The mirror of hasRemainingHorizontalContent: part of the row is scrolled out of view on the left.
export function hasHiddenHorizontalContentBefore({ scrollLeft }: Pick<HorizontalScrollMetrics, "scrollLeft">, tolerance = 4) {
  return scrollLeft > tolerance
}
