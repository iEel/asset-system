export type PmAutomationUiMode = "off" | "manual" | "scheduled"

export function getPmAutomationUiMode({
  enabled,
  mode,
}: {
  enabled?: string | null
  mode?: string | null
}): PmAutomationUiMode {
  if (enabled !== "true") return "off"
  return mode === "scheduled" ? "scheduled" : "manual"
}

export function getPmAutomationSettingsForUiMode(mode: PmAutomationUiMode) {
  if (mode === "off") {
    return { enabled: "false", mode: "manual" }
  }

  return { enabled: "true", mode }
}

export function shouldShowPmAutomationSchedule(mode: PmAutomationUiMode) {
  return mode === "scheduled"
}
