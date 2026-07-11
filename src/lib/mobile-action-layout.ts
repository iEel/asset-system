const mobileActionGridClasses = [
  "grid-cols-1",
  "grid-cols-1",
  "grid-cols-2",
  "grid-cols-3",
  "grid-cols-4",
] as const

export function getMobileActionGridClass(actionCount: number) {
  const boundedCount = Math.max(0, Math.min(Math.trunc(actionCount), 4))
  return mobileActionGridClasses[boundedCount]
}
