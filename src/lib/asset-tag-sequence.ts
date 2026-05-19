export function getNextAssetTagRunningNumber({
  existingAssetTags,
  sequencePrefix,
  sequenceSuffix = "",
  runningDigits,
}: {
  existingAssetTags: string[]
  sequencePrefix: string
  sequenceSuffix?: string
  runningDigits: number
}) {
  const maxRunning = existingAssetTags.reduce((max, assetTag) => {
    if (!assetTag.startsWith(sequencePrefix) || !assetTag.endsWith(sequenceSuffix)) return max

    const runningText = assetTag.slice(
      sequencePrefix.length,
      sequenceSuffix ? -sequenceSuffix.length : undefined
    )
    if (!new RegExp(`^\\d{${runningDigits}}$`).test(runningText)) return max

    const running = Number(runningText)
    return Number.isFinite(running) ? Math.max(max, running) : max
  }, 0)

  return maxRunning + 1
}
