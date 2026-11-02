import { assetLabelTapeSizes, type AssetLabelTapeSize } from "./asset-label-template.ts"

// Tape and note travel to the print route in the URL's hash (group 4 plan 6, P6-R9): `#tape=<12|18|24|custom>&note=<…>`.
// The hash never reaches the server, does not count toward Nginx's request line and stays out of its logs; the ids stay
// in the query because the server reads them. The print route only fills its fields from it: it never prints or records
// by itself, so a reload records nothing.

// The note is the print record's reason: the server takes at most 500 (src/app/api/assets/label-prints/route.ts).
export const LABEL_PRINT_NOTE_MAX = 500

export type AssetLabelPrintHash = { tapeSize: AssetLabelTapeSize; note: string }

export function buildAssetLabelPrintHash({ tapeSize, note }: AssetLabelPrintHash) {
  return `#tape=${tapeSize}&note=${encodeURIComponent(note)}`
}

// Unknown or missing values fall back to the defaults: the tape to the settings' default tape, the note to empty.
export function parseAssetLabelPrintHash(hash: string, defaultTapeSize: AssetLabelTapeSize): AssetLabelPrintHash {
  const values = new Map<string, string>()
  for (const part of hash.replace(/^#/, "").split("&")) {
    const at = part.indexOf("=")
    if (at <= 0) continue
    values.set(part.slice(0, at), part.slice(at + 1))
  }

  const tape = values.get("tape")
  const tapeSize = assetLabelTapeSizes.find((size) => size === tape) ?? defaultTapeSize
  return { tapeSize, note: decodeNote(values.get("note")) }
}

function decodeNote(value: string | undefined) {
  if (!value) return ""
  try {
    return decodeURIComponent(value).slice(0, LABEL_PRINT_NOTE_MAX)
  } catch {
    return ""
  }
}
