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

export function reserveAssetTagRunningNumbers({
  existingAssetTags,
  reservedAssetTags = [],
  sequencePrefix,
  sequenceSuffix = "",
  runningDigits,
  count,
}: {
  existingAssetTags: string[]
  reservedAssetTags?: string[]
  sequencePrefix: string
  sequenceSuffix?: string
  runningDigits: number
  count: number
}) {
  const reserved: string[] = []
  const knownAssetTags = [...existingAssetTags, ...reservedAssetTags]
  const known = new Set(knownAssetTags)
  let nextRunning = getNextAssetTagRunningNumber({
    existingAssetTags: knownAssetTags,
    sequencePrefix,
    sequenceSuffix,
    runningDigits,
  })

  while (reserved.length < count) {
    const running = String(nextRunning).padStart(runningDigits, "0")
    const assetTag = `${sequencePrefix}${running}${sequenceSuffix}`
    if (!known.has(assetTag)) {
      reserved.push(running)
      known.add(assetTag)
    }
    nextRunning += 1
  }

  return reserved
}
