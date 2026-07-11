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
