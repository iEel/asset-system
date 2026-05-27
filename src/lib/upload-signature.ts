export type UploadFileSignature =
  | "avif"
  | "gif"
  | "heic"
  | "jpeg"
  | "ole"
  | "pdf"
  | "png"
  | "text"
  | "webp"
  | "zip"
  | "unknown"

type UploadSignatureInput = {
  mimeType: string
  extension: string
  bytes: Uint8Array
}

const zipOfficeExtensions = new Set([".docx", ".xlsx"])
const oleOfficeExtensions = new Set([".doc", ".xls"])

export function detectUploadFileSignature(bytes: Uint8Array): UploadFileSignature {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png"
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg"
  if (startsWithText(bytes, "GIF87a") || startsWithText(bytes, "GIF89a")) return "gif"
  if (bytes.length >= 12 && startsWithText(bytes, "RIFF") && textAt(bytes, 8, 12) === "WEBP") return "webp"
  if (bytes.length >= 12 && textAt(bytes, 4, 8) === "ftyp") {
    const brand = textAt(bytes, 8, 12)
    if (brand === "avif" || brand === "avis") return "avif"
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) return "heic"
  }
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ole"
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])) return "zip"
  if (looksLikeText(bytes)) return "text"
  return "unknown"
}

export function isUploadSignatureAllowed({ mimeType, extension, bytes }: UploadSignatureInput) {
  const signature = detectUploadFileSignature(bytes)
  const normalizedMimeType = mimeType.toLowerCase()
  const normalizedExtension = extension.toLowerCase()

  if (signature === "unknown") return false
  if (!normalizedMimeType || normalizedMimeType === "application/octet-stream") {
    return isSignatureAllowedForExtension(normalizedExtension, signature)
  }

  if (normalizedMimeType === "application/pdf") return normalizedExtension === ".pdf" && signature === "pdf"
  if (normalizedMimeType === "image/png") return normalizedExtension === ".png" && signature === "png"
  if (normalizedMimeType === "image/jpeg") return [".jpg", ".jpeg"].includes(normalizedExtension) && signature === "jpeg"
  if (normalizedMimeType === "image/gif") return normalizedExtension === ".gif" && signature === "gif"
  if (normalizedMimeType === "image/webp") return normalizedExtension === ".webp" && signature === "webp"
  if (normalizedMimeType === "image/avif") return normalizedExtension === ".avif" && signature === "avif"
  if (normalizedMimeType === "image/heic" || normalizedMimeType === "image/heif") {
    return [".heic", ".heif"].includes(normalizedExtension) && signature === "heic"
  }
  if (normalizedMimeType === "application/msword" || normalizedMimeType === "application/vnd.ms-excel") {
    return oleOfficeExtensions.has(normalizedExtension) && signature === "ole"
  }
  if (
    normalizedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return zipOfficeExtensions.has(normalizedExtension) && signature === "zip"
  }
  if (normalizedMimeType === "text/plain") return normalizedExtension === ".txt" && signature === "text"

  return false
}

function isSignatureAllowedForExtension(extension: string, signature: UploadFileSignature) {
  if (extension === ".pdf") return signature === "pdf"
  if (extension === ".png") return signature === "png"
  if (extension === ".jpg" || extension === ".jpeg") return signature === "jpeg"
  if (extension === ".gif") return signature === "gif"
  if (extension === ".webp") return signature === "webp"
  if (extension === ".avif") return signature === "avif"
  if (extension === ".heic" || extension === ".heif") return signature === "heic"
  if (zipOfficeExtensions.has(extension)) return signature === "zip"
  if (oleOfficeExtensions.has(extension)) return signature === "ole"
  if (extension === ".txt") return signature === "text"
  return false
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

function startsWithText(bytes: Uint8Array, text: string) {
  if (bytes.length < text.length) return false
  for (let index = 0; index < text.length; index += 1) {
    if (bytes[index] !== text.charCodeAt(index)) return false
  }
  return true
}

function textAt(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end))
}

function looksLikeText(bytes: Uint8Array) {
  if (bytes.length === 0) return false
  const sample = bytes.slice(0, 4096)
  if (sample.includes(0)) return false

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(sample)
    return [...text].every((char) => {
      const code = char.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || code >= 32
    })
  } catch {
    return false
  }
}
