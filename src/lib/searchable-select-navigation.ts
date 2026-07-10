type SearchableSelectNavigationOption = {
  disabled?: boolean
}

export function getFirstEnabledOptionIndex(options: SearchableSelectNavigationOption[]) {
  return options.findIndex((option) => !option.disabled)
}

export function getLastEnabledOptionIndex(options: SearchableSelectNavigationOption[]) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index].disabled) return index
  }
  return -1
}

export function getNextEnabledOptionIndex(
  options: SearchableSelectNavigationOption[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) return -1
  if (currentIndex < 0 || currentIndex >= options.length) {
    return direction === 1 ? getFirstEnabledOptionIndex(options) : getLastEnabledOptionIndex(options)
  }

  for (let offset = 1; offset <= options.length; offset += 1) {
    const nextIndex = (currentIndex + direction * offset + options.length) % options.length
    if (!options[nextIndex].disabled) return nextIndex
  }

  return -1
}
