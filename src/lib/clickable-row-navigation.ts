export const CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT = "clickable-row-before-navigate"

export function shouldCancelClickableRowNavigation(result: boolean | void) {
  return result === false
}
