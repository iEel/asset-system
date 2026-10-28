// A download's Content-Disposition (group 2 plan 4 P4-R9). A header holds bytes only: a Thai name, for example a round
// export filtered by a room search, threw "Cannot convert argument to a ByteString" and the export answered 500. The
// quoted filename keeps the printable ASCII (each run of other characters, a quote, a backslash or a semicolon becomes
// one "-"); filename* carries the whole name in UTF-8 (RFC 6266, RFC 5987), which browsers prefer. Pure, no imports.
export function attachmentContentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]+/g, "-").replace(/["\\;]/g, "-").replace(/-{2,}/g, "-")
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}
