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
  // Tags compare without case, as SQL Server's unique index does (plan 5 final review: a typed "ast-it-00012").
  const prefix = sequencePrefix.toUpperCase()
  const suffix = sequenceSuffix.toUpperCase()
  const maxRunning = existingAssetTags.reduce((max, existingTag) => {
    const assetTag = existingTag.toUpperCase()
    if (!assetTag.startsWith(prefix) || !assetTag.endsWith(suffix)) return max

    const runningText = assetTag.slice(
      prefix.length,
      suffix ? -suffix.length : undefined
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
  const known = new Set(knownAssetTags.map((assetTag) => assetTag.toUpperCase()))
  let nextRunning = getNextAssetTagRunningNumber({
    existingAssetTags: knownAssetTags,
    sequencePrefix,
    sequenceSuffix,
    runningDigits,
  })

  while (reserved.length < count) {
    const running = String(nextRunning).padStart(runningDigits, "0")
    const assetTag = `${sequencePrefix}${running}${sequenceSuffix}`
    if (!known.has(assetTag.toUpperCase())) {
      reserved.push(running)
      known.add(assetTag.toUpperCase())
    }
    nextRunning += 1
  }

  return reserved
}
