// Rows written by features removed in 2026-10 (PM auto-generation and the maintenance close
// approval). Existing databases keep them; the settings screen hides them.
export const retiredSystemSettingKeys: ReadonlySet<string> = new Set([
  "pm_auto_generation_enabled",
  "pm_auto_generation_mode",
  "pm_auto_generation_schedule",
  "pm_auto_generation_last_run_at",
  "pm_auto_generation_last_status",
  "pm_auto_generation_last_error",
  "workflow_approval_maintenance_close_required",
])
