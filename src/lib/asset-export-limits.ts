// The most rows one asset export writes. The export route caps its query with it, and the import-export page says it
// on the export-all card, so the two cannot drift apart (user decision 2026-10-21 Y1).
export const ASSET_EXPORT_MAX_ROWS = 5000
